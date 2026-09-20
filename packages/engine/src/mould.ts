import type { Character } from './character'
import { skillLevel } from './character'
import { MOULD, MOULDS, MOULD_DEFS, MOULD_WORDS, type MouldId } from './content/mould'
import { SKILLS, type SkillId } from './skills'

/**
 * Склад и выбор (этап 126).
 *
 * Классов нет: склад выводится из того, чем ты занимался. Оттого его нельзя
 * выбрать на старте и нельзя сменить кнопкой — но можно переучиться, заплатив
 * годами и серебром. И оттого же он честен: он говорит о тебе то, что о тебе
 * говорят твои же навыки.
 */

export interface Mould {
  readonly id: MouldId | null
  readonly score: number
  readonly second: MouldId | null
  readonly clear: boolean
  readonly says: string
}

function scoreOf(character: Character, id: MouldId): number {
  const def = MOULD_DEFS[id]
  const sum = def.skills.reduce((all, skill) => all + skillLevel(character, skill), 0)
  return Math.round(sum / def.skills.length)
}

/** Какой ты склад (Сл1). */
export function mouldOf(character: Character): Mould {
  const scored = MOULDS.map((id) => ({ id, score: scoreOf(character, id) })).sort(
    (a, b) => b.score - a.score,
  )
  const best = scored[0]
  const second = scored[1]
  if (!best || best.score < 10) {
    return { id: null, score: best?.score ?? 0, second: null, clear: false, says: MOULD_WORDS.none }
  }
  const clear = !second || best.score >= second.score * MOULD.clear
  const def = MOULD_DEFS[best.id]
  return {
    id: best.id,
    score: best.score,
    second: second?.id ?? null,
    clear,
    says: clear
      ? `${MOULD_WORDS.notClass} Ты — ${def.label}: ${def.about} Берёшь так: ${def.takes}.`
      : `Ты между складами: ${def.label} (${best.score}) и ${MOULD_DEFS[second.id].label} (${second.score}). Ни то ни другое вполне.`,
  }
}

/** Чем платишь за этот склад (Сл2). */
export function paysWith(
  character: Character,
  id: MouldId,
): {
  readonly lacks: readonly { readonly skill: SkillId; readonly level: number }[]
  readonly says: string
} {
  const def = MOULD_DEFS[id]
  const lacks = def.lacks.map((skill) => ({ skill, level: skillLevel(character, skill) }))
  return {
    lacks,
    says: `${MOULD_WORDS.pays} ${def.label}: ${lacks.map((one) => `${SKILLS[one.skill].label.toLowerCase()} ${one.level}`).join(', ')}. ${def.seen}`,
  }
}

/** Как мир видит этот склад (Сл3). */
export function seenAs(id: MouldId | null): string {
  if (!id) return MOULD_WORDS.none
  return `${MOULD_WORDS.seen} ${MOULD_DEFS[id].seen}`
}

/** Что этот склад берёт вместо силы (Сл5). */
export function takesBy(id: MouldId): string {
  return MOULD_DEFS[id].takes
}

/** Во что встанет переучивание (Сл4). */
export function retrainCost(
  character: Character,
  from: SkillId,
  to: SkillId,
): {
  readonly can: boolean
  readonly silver: number
  readonly days: number
  readonly says: string
} {
  const have = skillLevel(character, from)
  if (have < 10) {
    return {
      can: false,
      silver: 0,
      days: 0,
      says: `Переучиваться не с чего: ${SKILLS[from].label.toLowerCase()} ${have}.`,
    }
  }
  const moved = Math.round(have * MOULD.retrainLoses)
  const silver = moved * MOULD.retrainSilver
  const days = Math.round(moved * MOULD.retrainDays)
  return {
    can: true,
    silver,
    days,
    says: `${MOULD_WORDS.change} ${SKILLS[from].label} ${have} → ${have - moved}, ${SKILLS[to].label} +${moved}: ${silver} серебра и ${days} суток (${Math.round((days / 365) * 10) / 10} года).`,
  }
}

/** Все склады и чем каждый берёт — для проверки «игра проходима любым» (Сл5). */
export function everyMould(): readonly { readonly id: MouldId; readonly takes: string }[] {
  return MOULDS.map((id) => ({ id, takes: MOULD_DEFS[id].takes }))
}

export { MOULD, MOULD_DEFS, MOULD_WORDS, MOULDS, type MouldId }
