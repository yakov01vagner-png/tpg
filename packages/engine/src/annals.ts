import { ANNALS, ANNALS_WORDS, MARKS, MARK_DEFS, MARK_WORDS, type MarkId } from './content/annals'
import { sideName } from './dread'
import { PLAYER } from './holding'
import type { GameState } from './state'
import { DAYS_PER_YEAR, dayOf } from './time'
import { relationOf } from './war'
import type { World } from './world/types'

/**
 * Летопись, которая судит (этап 147).
 *
 * Счёт выводится из той же летописи, что и раньше (0.6): из строк журнала, по
 * словам, которыми они написаны. Ничего нового не хранится, кроме приписанного
 * своей рукой — и того немного, потому что летопись стоит не только серебра.
 */

export function markDef(id: MarkId) {
  return MARK_DEFS[id]
}

/** Каким делом эта строка запомнится, если запомнится (Лт1). */
export function markOf(text: string): MarkId | null {
  const lower = text.toLowerCase()
  for (const id of MARKS) {
    if (MARK_WORDS[id].some((word) => lower.includes(word))) return id
  }
  return null
}

/** Жива ли ещё память об этом деле (Лт3). */
export function stillRemembered(id: MarkId, years: number): boolean {
  const def = MARK_DEFS[id]
  return def.years === 0 || years <= def.years
}

/** Что мир помнит о тебе (Лт1 и Лт3). */
export function memoryOf(
  state: GameState,
  day: number,
): {
  readonly good: number
  readonly bad: number
  readonly score: number
  readonly marks: Readonly<Record<string, number>>
  readonly says: string
} {
  const marks: Record<string, number> = {}
  let good = 0
  let bad = 0
  for (const line of state.log) {
    const id = markOf(line.text)
    if (!id) continue
    const years = Math.max(0, (day - dayOf(line.time)) / DAYS_PER_YEAR)
    if (!stillRemembered(id, years)) continue
    const def = MARK_DEFS[id]
    marks[id] = (marks[id] ?? 0) + 1
    if (def.good) good += def.weight
    else bad += def.weight
  }
  const written = state.annals?.added ?? 0
  const добавлено = Math.min(written, Math.round(good * ANNALS.addsAtMost))
  return {
    good: good + добавлено,
    bad,
    score: good + добавлено - bad,
    marks,
    says: `${ANNALS_WORDS.counted} Доброго ${good + добавлено}, худого ${bad}${добавлено > 0 ? ` (из них приписано ${добавлено})` : ''}: ${
      MARKS.filter((id) => marks[id])
        .map((id) => `${MARK_DEFS[id].label} ${marks[id]}`)
        .join(', ') || 'мир о тебе не помнит ничего'
    }.`,
  }
}

/** Как эту же летопись читает чужая корона (Лт4). */
export function theirAnnals(
  state: GameState,
  world: World,
  id: string,
  day: number,
): { readonly good: number; readonly bad: number; readonly says: string } {
  const mine = memoryOf(state, day)
  const relation = relationOf(state.politics, PLAYER, id)
  // Враг помнит кровь, друг — славу: тот же счёт, прочитанный со своей стороны.
  const slant = Math.max(-1, Math.min(1, relation / 100))
  const good = Math.round(mine.good * (1 + slant * ANNALS.slant))
  const bad = Math.round(mine.bad * (1 - slant * ANNALS.slant))
  return {
    good,
    bad,
    says: `${ANNALS_WORDS.slanted} ${sideName(world, id)} помнит: доброго ${good}, худого ${bad} (на деле ${mine.good} и ${mine.bad}).`,
  }
}

/** Во что обойдётся своя летопись (Лт5). */
export function writeCost(
  state: GameState,
  day: number,
): { readonly cost: number; readonly can: number; readonly says: string } {
  const mine = memoryOf(state, day)
  const cap = Math.round(mine.good * ANNALS.addsAtMost)
  const written = state.annals?.added ?? 0
  const can = Math.max(0, cap - written)
  return {
    cost: ANNALS.perYear,
    can,
    says:
      can > 0
        ? `${ANNALS_WORDS.own} Приписать можно ещё ${can} из ${cap}; глава стоит ${ANNALS.perYear}.`
        : `${ANNALS_WORDS.own} Приписывать больше нечего: дел не хватает.`,
  }
}

/** Летопись в числах (Лт6). */
export function annalsLedger(
  state: GameState,
  world: World,
  day: number,
): { readonly good: number; readonly bad: number; readonly says: string } {
  const mine = memoryOf(state, day)
  const forever = mine.marks.word ?? 0
  return {
    good: mine.good,
    bad: mine.bad,
    says: `${mine.says} ${forever > 0 ? `${ANNALS_WORDS.forever} Таких дел ${forever}.` : 'Слова ты не нарушал.'}`,
  }
}

export { ANNALS, ANNALS_WORDS, MARKS, MARK_DEFS, type MarkId }
