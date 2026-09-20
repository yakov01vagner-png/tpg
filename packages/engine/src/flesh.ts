import { AGE_DEFS, type AgeId, FLESH, FLESH_WORDS } from './content/flesh'
import { ailmentDef } from './heal'
import type { GameState } from './state'

/**
 * Тело (этап 186).
 *
 * Считалось оно по частям: усталость отдельно, рана отдельно, болезнь отдельно,
 * годы отдельно, — и нигде не сходилось. Оттого «здоровье» было полоской, а не
 * состоянием человека: нельзя было сказать, чего это тело сегодня стоит.
 *
 * Здесь всё сводится в одно число и в одни слова. Ни одной новой величины:
 * рана, хворь, усталость, увечья и годы уже есть — их только складывают.
 */

export interface Body {
  /** Чего стоит тело сегодня, 0..1. */
  readonly vigour: number
  readonly age: AgeId
  readonly wound: boolean
  readonly sick: boolean
  readonly maims: number
  /** Годен ли для боя. */
  readonly fit: boolean
  readonly says: string
}

/** Каков возраст на деле (Тл4). */
export function ageKind(age: number): AgeId {
  if (age <= FLESH.youngTo) return 'young'
  if (age < FLESH.fadesFrom) return 'prime'
  if (age < 60) return 'grey'
  return 'old'
}

/** Всё тело одним счётом (Тл1, Тл2, Тл5). */
export function bodyOf(state: GameState, day: number): Body {
  const character = state.character
  const wound = character.wound
  const ailment = state.ailment ?? null
  const maims = (state.maims ?? []).length
  const years = character.age
  let vigour = 1
  if (wound) vigour -= wound.severity * FLESH.woundTakes
  if (ailment) vigour -= FLESH.ailmentTakes
  vigour -= (character.fatigue / 100) * FLESH.fatigueTakes
  vigour -= maims * FLESH.maimTakes
  if (years > FLESH.fadesFrom) vigour -= (years - FLESH.fadesFrom) * FLESH.fadesPerYear
  if (years <= FLESH.youngTo) vigour += FLESH.youngAdds
  const kept = Math.max(0, Math.min(1, Math.round(vigour * 100) / 100))
  const age = ageKind(years)
  const parts = [
    wound ? FLESH_WORDS.hurt : null,
    ailment ? `${FLESH_WORDS.sick} ${ailmentDef(ailment.kind).label}.` : null,
    character.fatigue > 70 ? FLESH_WORDS.tired : null,
    maims > 0 ? `${FLESH_WORDS.maimed} Увечий ${maims}.` : null,
    kept < FLESH.brokenAt ? FLESH_WORDS.broken : null,
  ].filter((one): one is string => one !== null)
  return {
    vigour: kept,
    age,
    wound: wound !== null,
    sick: ailment !== null,
    maims,
    fit: kept >= FLESH.brokenAt,
    says: `${AGE_DEFS[age].label}, ${years} лет: тело на ${Math.round(kept * 100)} из ста. ${
      parts.length > 0 ? parts.join(' ') : FLESH_WORDS.whole
    }`,
  }
}

/** Что возраст открывает и что закрывает (Тл4). */
export function ageSaysNow(state: GameState, day: number): string {
  const age = ageKind(state.character.age)
  return `${AGE_DEFS[age].label}: ${AGE_DEFS[age].opens} ${AGE_DEFS[age].shuts}`
}

/** Сколько ещё лежать (Тл3): болезнь и рана — срок, а не бросок. */
export function healingLeft(
  state: GameState,
  day: number,
): { readonly days: number; readonly says: string } {
  const wound = state.character.wound
  const ailment = state.ailment ?? null
  const days = Math.max(wound?.daysLeft ?? 0, ailment ? Math.max(0, 30 - (day - ailment.since)) : 0)
  return {
    days,
    says:
      days === 0
        ? 'Лежать не от чего.'
        : `Лежать ещё ${days} сут.${wound?.festering ? ' Рана загноилась: срок вырос.' : ''}`,
  }
}

/** Тело в числах (Тл6). */
export function fleshRoll(
  state: GameState,
  day: number,
): { readonly vigour: number; readonly maims: number; readonly age: AgeId; readonly says: string } {
  const body = bodyOf(state, day)
  return {
    vigour: body.vigour,
    maims: body.maims,
    age: body.age,
    says: `${body.says} ${body.fit ? 'В бою годен.' : 'В бою не годен.'}`,
  }
}
