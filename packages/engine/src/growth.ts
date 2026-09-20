import { ATTRIBUTE_LABELS } from './attributes'
import type { Character } from './character'
import { skillLevel } from './character'
import { GROWTH, GROWTH_WORDS } from './content/growth'
import { PATH_DEFS, type PathId } from './content/paths'
import { PRIME_AGE } from './dynasty'
import { PROGRESSION, skillXpToNext, softCap, softCapFactor } from './progression'
import { SKILLS, type SkillId } from './skills'

/**
 * Потолки, возраст и цена роста (этап 125).
 *
 * Мягкий потолок был всегда, но невидимый: игрок замечал, что растёт медленнее,
 * и не знал почему. Здесь стена названа числом, у возраста есть голос, а у
 * брошенного навыка — ржавчина. Ничего из этого не добавляет новых величин:
 * всё считается из тех же атрибутов, уровней и дней.
 */

export interface Ceiling {
  readonly skill: SkillId
  readonly level: number
  readonly cap: number
  readonly slowedTo: number
  readonly says: string
}

/** Где тебя держит атрибут и во что обходится идти дальше (Ц1). */
export function skillCeiling(character: Character, skill: SkillId): Ceiling {
  const attribute = character.attributes[SKILLS[skill].attribute]
  const level = skillLevel(character, skill)
  const cap = softCap(attribute)
  const slowed = Math.round(softCapFactor(level, attribute) * 100) / 100
  return {
    skill,
    level,
    cap,
    slowedTo: slowed,
    says:
      level < cap
        ? `${SKILLS[skill].label}: ${level} из ${cap}, которые тянет ${ATTRIBUTE_LABELS[SKILLS[skill].attribute].toLowerCase()} ${attribute}. Пока ничто не держит.`
        : `${SKILLS[skill].label}: ${level} при потолке ${cap}. ${GROWTH_WORDS.cap} Учение идёт в ${slowed} от обычного; поднять ${ATTRIBUTE_LABELS[SKILLS[skill].attribute].toLowerCase()} — значит поднять потолок на ${PROGRESSION.softCapPerAttributePoint}.`,
  }
}

/** Что с телом и головой в эти годы (Ц2). */
export function ageSays(age: number): string {
  if (age < GROWTH.bodyFrom) return `${age} лет: тело ещё берёт своё.`
  const decades = Math.round(((age - PRIME_AGE) / 10) * 10) / 10
  const hard = age >= GROWTH.bodyHard
  return `${age} лет: ${GROWTH_WORDS.body} За ${decades} десятилетий сверх расцвета сила −${Math.round(decades * 1.2)}, ловкость −${Math.round(decades * 1.1)}, выносливость −${Math.round(decades * 0.9)}${hard ? ' (и дальше быстрее)' : ''}. ${GROWTH_WORDS.head}`
}

/** Сколько часов в сутках у государя остаётся на учение (Ц3). */
export function hoursLeft(matters: number): {
  readonly hours: number
  readonly says: string
} {
  const spent = matters * 4
  const hours = Math.max(0, GROWTH.hoursForSelf - spent)
  return {
    hours,
    says: `${GROWTH_WORDS.hours} Разобрано дел ${matters} — на себя осталось ${hours} часов из ${GROWTH.hoursForSelf}.`,
  }
}

/** Сколько лет навык не трогали и что с ним стало (Ц4). */
export function rustOf(
  level: number,
  lastUsedDay: number,
  day: number,
): { readonly level: number; readonly lost: number; readonly says: string } {
  const years = Math.max(0, day - lastUsedDay) / 365
  if (years < GROWTH.rustsAfterYears || level <= 0) {
    return { level, lost: 0, says: 'Навык в руках.' }
  }
  const idle = years - GROWTH.rustsAfterYears
  const floor = Math.round(level * GROWTH.rustFloor)
  const now = Math.max(floor, Math.round(level - idle * GROWTH.rustPerYear))
  return {
    level: now,
    lost: level - now,
    says:
      level === now
        ? `${GROWTH_WORDS.rust} Ниже ${floor} он не осядет: руки помнят.`
        : `${GROWTH_WORDS.rust} Без дела ${Math.round(years)} лет: ${level} → ${now}.`,
  }
}

/** Во что обходится очко атрибута (Ц5). */
export function attributePointSays(level: number): string {
  const every = PROGRESSION.attributePointEveryLevels
  const next = every - (level % every)
  return `${GROWTH_WORDS.point} Одно очко за каждые ${every} уровня героя: ты на ${level}-м, следующее через ${next}. Очко поднимает потолок сразу ${PROGRESSION.softCapPerAttributePoint} уровней навыка.`
}

/** Сколько опыта нужно, чтобы довести навык с нуля до этого уровня (Ц6). */
export function xpToLevel(target: number, attribute = 5): number {
  let sum = 0
  for (let level = 0; level < target; level += 1) {
    sum +=
      skillXpToNext(level) / Math.max(PROGRESSION.softCapFloor, softCapFactor(level, attribute))
  }
  return Math.round(sum)
}

/** За сколько лет этот путь доводит навык до такого уровня (Ц6). */
export function yearsBy(path: PathId, target: number, attribute = 5): number {
  const need = xpToLevel(target, attribute)
  const def = PATH_DEFS[path]
  if (def.cap > 0 && target > def.cap) return Number.POSITIVE_INFINITY
  // Путь меряется не только тем, сколько даёт за раз, но и тем, как часто им
  // вообще можно воспользоваться: турниров в году меньше, чем дней работы.
  const times = need / Math.max(1, def.xp)
  return Math.round((times / def.perYear) * 10) / 10
}

export { GROWTH, GROWTH_WORDS }
