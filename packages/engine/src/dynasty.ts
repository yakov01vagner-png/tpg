import type { Attributes } from './attributes'
import { clampAttribute } from './attributes'
import type { Character } from './character'
import { type Rng, nextInt, rollChance } from './rng'
import type { SkillId } from './skills'
import { DAYS_PER_YEAR, yearsBetween } from './time'

/**
 * Век человеческий.
 *
 * Шесть этапов у героя не было возраста: он не старел, не заводил семьи, и
 * оставить имя было некому. Песочница получала начало, но не форму. Здесь
 * появляется длина жизни — и то, что после неё.
 *
 * Стареет только тело: атрибуты к старости идут вниз, опыт и положение — нет.
 * Иначе вторую половину жизни играть было бы наказанием.
 */
export interface Child {
  readonly name: string
  /** День рождения: возраст считается от него, а не хранится числом. */
  readonly bornDay: number
  readonly heir: boolean
}

export interface Family {
  readonly spouse: {
    readonly name: string
    /** Из чьего дома взята жена или взят муж: отсюда и союз. */
    readonly lordId: string | null
    readonly kingdomId: string | null
    readonly sinceDay: number
  } | null
  readonly children: readonly Child[]
  /** Имя рода: его наследуют, даже когда не наследуют ничего другого. */
  readonly house: string
}

export const NO_FAMILY: Family = { spouse: null, children: [], house: '' }

/** С какого возраста тело начинает сдавать. */
export const PRIME_AGE = 42
/** После этого каждый год может стать последним. */
export const OLD_AGE = 62
/** Возраст, в котором начинают игру. */
export const START_AGE = 20

export function ageOf(bornDay: number, day: number): number {
  return Math.max(0, yearsBetween(bornDay, day))
}

/** День рождения героя, с которого начинается счёт. */
export function birthDayFor(startDay: number, age = START_AGE): number {
  return startDay - age * DAYS_PER_YEAR
}

/**
 * Что делает с телом прожитый год.
 *
 * Сила и ловкость уходят первыми, выносливость следом; разум, воля и обаяние
 * не страдают — старик слабее молодого, но не глупее.
 */
export function agedAttributes(attributes: Attributes, age: number): Attributes {
  if (age <= PRIME_AGE) return attributes
  const decades = (age - PRIME_AGE) / 10
  return {
    ...attributes,
    strength: clampAttribute(Math.round(attributes.strength - decades * 1.2)),
    agility: clampAttribute(Math.round(attributes.agility - decades * 1.1)),
    endurance: clampAttribute(Math.round(attributes.endurance - decades * 0.9)),
  }
}

/** Вероятность умереть за год в этом возрасте. */
export function deathChance(age: number): number {
  if (age < OLD_AGE) return 0
  return Math.min(0.5, 0.04 + (age - OLD_AGE) * 0.02)
}

const CHILD_NAMES = [
  'Ратмир',
  'Ждана',
  'Горислав',
  'Мирава',
  'Велимир',
  'Забава',
  'Святополк',
  'Любава',
  'Радomir',
  'Веселина',
]

export function childName(rng: Rng): [string, Rng] {
  const [index, next] = nextInt(rng, 0, CHILD_NAMES.length - 1)
  return [CHILD_NAMES[index] ?? 'Безымянный', next]
}

/** Шанс, что за год в семье родится ребёнок. */
export const BIRTH_CHANCE_PER_YEAR = 0.35

export function maybeBirth(family: Family, day: number, rng: Rng): [Family, Rng, boolean] {
  if (!family.spouse) return [family, rng, false]
  if (family.children.length >= 4) return [family, rng, false]
  const [born, next] = rollChance(rng, BIRTH_CHANCE_PER_YEAR)
  if (!born) return [family, next, false]
  const [name, afterName] = childName(next)
  const child: Child = { name, bornDay: day, heir: family.children.length === 0 }
  return [{ ...family, children: [...family.children, child] }, afterName, true]
}

/** Кто наследует: старший, если он уже не дитя. */
export function heirOf(family: Family, day: number): Child | null {
  const grown = family.children
    .filter((child) => ageOf(child.bornDay, day) >= 16)
    .sort((a, b) => a.bornDay - b.bornDay)
  return grown[0] ?? null
}

/**
 * Наследнику достаётся имя и земля — но не слава, не навыки и не чужая верность.
 *
 * Иначе смерть перестала бы что-либо значить: продолжать за сына было бы
 * бесплатно, а пермадэт превратился бы в смену заставки.
 */
export function heirCharacter(parent: Character, heir: Child, day: number): Character {
  const age = ageOf(heir.bornDay, day)
  const skills = {} as Record<SkillId, { level: number; xp: number }>
  for (const [id, progress] of Object.entries(parent.skills)) {
    // Чему успел научить отец: треть его умения, и то не всякого.
    skills[id as SkillId] = { level: Math.floor(progress.level / 3), xp: 0 }
  }
  return {
    ...parent,
    name: heir.name,
    age,
    bornDay: heir.bornDay,
    attributes: parent.attributes,
    skills,
    level: 1,
    xp: 0,
    unspentSkillPoints: 2,
    unspentAttributePoints: 1,
    fatigue: 0,
    magicRank: null,
    family: { ...parent.family, spouse: null, children: [] },
  }
}
