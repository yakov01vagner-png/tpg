import { skillLevel } from './character'
import {
  LEARN_ROADS,
  LEARN_ROAD_DEFS,
  LETTERS,
  LETTER_DEFS,
  type LearnRoadId,
  type LetterId,
  TEACHING,
  TEACHING_WORDS,
} from './content/teaching'
import { skillCeiling } from './growth'
import { SKILLS, type SkillId } from './skills'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Учение (этап 188).
 *
 * Учиться можно с 0.2: наставники, книги, курсы, ордена, испытания. Все они
 * дают одно и то же — очки в навык, — и потому выбор между ними не выбор.
 *
 * Здесь дороги учения расходятся: каждая идёт со своей скоростью и доводит до
 * своего предела, а выше предела сам не вырастешь — нужен тот, кто выше.
 */

/** Чем дороги учения отличаются (Уч1, Уч2). */
export function roadsFor(
  state: GameState,
  skill: SkillId,
): readonly { readonly road: LearnRoadId; readonly upTo: number; readonly says: string }[] {
  const ceiling = skillCeiling(state.character, skill)
  return LEARN_ROADS.map((road) => {
    const def = LEARN_ROAD_DEFS[road]
    const upTo = Math.round(ceiling.cap * def.upTo)
    return {
      road,
      upTo,
      says: `${def.label}: ${def.about} Идёт ×${def.pace}, доводит до ${upTo}. Стоит: ${def.costs}.`,
    }
  })
}

/** Предел без учителя (Уч3). */
export function ceilingSays(state: GameState, skill: SkillId): string {
  const ceiling = skillCeiling(state.character, skill)
  const level = skillLevel(state.character, skill)
  const bySelf = Math.round(ceiling.cap * LEARN_ROAD_DEFS.doing.upTo)
  return `${SKILLS[skill].label}: ${level} из ${ceiling.cap}. Сам дойдёшь до ${bySelf}. ${TEACHING_WORDS.ceiling}`
}

/** Знание, которое открывает разговоры (Уч4). */
export function lettersOf(
  state: GameState,
): readonly { readonly id: LetterId; readonly has: boolean; readonly says: string }[] {
  const learning = skillLevel(state.character, 'scholarship')
  return LETTERS.map((id) => {
    const def = LETTER_DEFS[id]
    const has = learning >= def.needs
    return {
      id,
      has,
      says: `${def.label}: ${def.opens} ${has ? 'Есть.' : `Нужна учёность ${def.needs}, у тебя ${learning}.`}`,
    }
  })
}

/** Что умеешь и чего не умеешь — одним взглядом (Уч5). */
export function learningSays(state: GameState, world: World, day: number): string {
  const rows = (Object.keys(SKILLS) as SkillId[])
    .map((id) => ({ id, level: skillLevel(state.character, id) }))
    .sort((a, b) => b.level - a.level)
  const top = rows.slice(0, 3)
  const none = rows.filter((one) => one.level === 0).length
  const letters = lettersOf(state).filter((one) => one.has).length
  return `Лучше всего: ${top.map((one) => `${SKILLS[one.id].label} ${one.level}`).join(', ')}. Не тронуто ${none} умений, знаний ${letters} из ${LETTERS.length}. ${TEACHING_WORDS.roads}`
}

/** Сколько лет до мастерства разными дорогами (Уч6). */
export function yearsToMastery(
  state: GameState,
  skill: SkillId,
): readonly { readonly road: LearnRoadId; readonly years: number; readonly says: string }[] {
  const ceiling = skillCeiling(state.character, skill)
  const level = skillLevel(state.character, skill)
  return LEARN_ROADS.map((road) => {
    const def = LEARN_ROAD_DEFS[road]
    const target = Math.round(ceiling.cap * def.upTo)
    const left = Math.max(0, target - level)
    const years = Math.round((left / (TEACHING.perDay * def.pace) / 365) * 10) / 10
    return {
      road,
      years,
      says: `${def.label}: до ${target} — ${years} г. учения.`,
    }
  })
}
