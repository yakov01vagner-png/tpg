import type { CompanionDef, DeedId, TemperId } from './content/companions'
import type { WishDef, WishId } from './content/companions'
import { COMPANIONS, TEMPERS, WISHES } from './content/companions'
import type { SkillId } from './skills'

/**
 * Спутник при герое.
 *
 * Отличие спутника от наёмника в том, что у него есть мнение. Он видит, что ты
 * делаешь, и запоминает: набожный не простит разорённого города, корыстный не
 * простит пустой казны. Когда терпение кончается — уходит, и это единственный
 * способ потерять его без боя.
 */
export type CompanionRole =
  /** Идёт с тобой. */
  | { readonly type: 'party' }
  /** Держит твой лен: пока ты в походе, кто-то должен сидеть дома. */
  | { readonly type: 'steward'; readonly locationId: string }
  /** Ведёт твоё дело. */
  | { readonly type: 'factor'; readonly enterpriseId: string }

export interface Companion {
  readonly id: string
  readonly name: string
  readonly temper: TemperId
  readonly skills: Readonly<Partial<Record<SkillId, number>>>
  /** Расположение к тебе, 0..100. */
  readonly mood: number
  readonly role: CompanionRole
  /** В плену: жив, но не с тобой. */
  readonly captive: boolean
  /** С какого дня идёт с тобой (этап 54). */
  readonly since?: number
  /** Сколько дел за ним: боёв, походов, зим. По этому он и растёт. */
  readonly deeds?: number
  /** Шрам: что осталось от боя, в котором он выжил. */
  readonly scar?: string
  /** Как идёт его собственное дело (этап 54). */
  readonly wish?: { readonly progress: number; readonly doneDay?: number }
}

/**
 * Своё дело спутника (этап 54, С2).
 *
 * У каждого есть, чего он хочет: выкупить долг, отомстить, вернуть дом, нажить
 * имя, доучиться, дожить спокойно. Пока дело не сделано, он идёт с тобой — и
 * смотрит, помогаешь ты ему или только пользуешься.
 */
export function wishOf(companion: Companion): WishDef | null {
  const def = companionDef(companion.id)
  return def?.wish ? WISHES[def.wish] : null
}

/** Сколько дела сделано, долей. */
export function wishShare(companion: Companion): number {
  const wish = wishOf(companion)
  if (!wish) return 0
  return Math.min(1, (companion.wish?.progress ?? 0) / wishNeeds(wish.id))
}

/** Сколько надо, чтобы дело было сделано. */
export function wishNeeds(id: WishId): number {
  switch (id) {
    case 'debt':
      return 1
    case 'revenge':
      return 10
    case 'home':
      return 1
    case 'name':
      return 12
    case 'lore':
      return 1
    case 'peace':
      return 365
  }
}

export function wishDone(companion: Companion): boolean {
  return companion.wish?.doneDay !== undefined
}

/**
 * Ссоры и дружбы (этап 54, С3).
 *
 * Спутники смотрят не только на тебя, но и друг на друга: честный не уживается
 * с корыстным, гордый с гордым, набожный с тем, кто смеётся над верой. А кто
 * сходится — тому в отряде легче.
 */
const FEELINGS: Readonly<Record<string, number>> = {
  'honest|greedy': -2,
  'greedy|honest': -2,
  'devout|greedy': -2,
  'greedy|devout': -2,
  'proud|proud': -2,
  'grim|merry': -1,
  'honest|loyal': 2,
  'loyal|honest': 2,
  'devout|honest': 1,
  'honest|devout': 1,
  'loyal|proud': 1,
  'proud|loyal': 1,
  'grim|grim': 1,
}

export function feelsAbout(one: Companion, other: Companion): number {
  return FEELINGS[`${one.temper}|${other.temper}`] ?? 0
}

/** Кто с кем не уживается: пары, которые тянут отряд вниз. */
export function quarrelsOf(
  companions: readonly Companion[],
): readonly { readonly a: Companion; readonly b: Companion; readonly feeling: number }[] {
  const out: { a: Companion; b: Companion; feeling: number }[] = []
  const party = following(companions)
  for (let i = 0; i < party.length; i += 1) {
    for (let j = i + 1; j < party.length; j += 1) {
      const a = party[i] as Companion
      const b = party[j] as Companion
      const feeling = feelsAbout(a, b) + feelsAbout(b, a)
      if (feeling !== 0) out.push({ a, b, feeling })
    }
  }
  return out
}

/** Сколько спутник растёт за дело: умение приходит с делами, а не с годами. */
export const DEED_SKILL = 0.35

/** Ниже этого спутник уходит. */
export const LEAVING_MOOD = 15
export const START_MOOD = 55

export function companionDef(id: string): CompanionDef | null {
  return COMPANIONS[id] ?? null
}

export function hireCompanion(def: CompanionDef, day = 1): Companion {
  return {
    id: def.id,
    name: def.name,
    temper: def.temper,
    skills: def.skills,
    mood: START_MOOD,
    role: { type: 'party' },
    captive: false,
    since: day,
    deeds: 0,
    ...(def.wish ? { wish: { progress: 0 } } : {}),
  }
}

/** Навык спутника: берём лучшего из тех, кто рядом. */
export function bestSkill(
  companions: readonly Companion[],
  skill: SkillId,
): { readonly level: number; readonly who: Companion | null } {
  let level = 0
  let who: Companion | null = null
  for (const companion of companions) {
    if (companion.captive || companion.role.type !== 'party') continue
    const value = companion.skills[skill] ?? 0
    if (value > level) {
      level = value
      who = companion
    }
  }
  return { level, who }
}

export interface DeedResult {
  readonly companions: readonly Companion[]
  /** Кто ушёл, не стерпев. */
  readonly left: readonly Companion[]
}

/**
 * Поступок на виду у спутников.
 *
 * Одно и то же дело одни одобрят, другие возненавидят — на этом весь смысл
 * нрава. Ушедших возвращает список, а не исключение: уход спутника — это
 * событие, о котором игроку надо сказать.
 */
export function witness(companions: readonly Companion[], deed: DeedId): DeedResult {
  const next: Companion[] = []
  const left: Companion[] = []
  for (const companion of companions) {
    const shift = TEMPERS[companion.temper]?.feels[deed] ?? 0
    const mood = Math.max(0, Math.min(100, companion.mood + shift))
    const updated = { ...companion, mood }
    // Пленный уйти не может: он и так не с тобой.
    if (mood < LEAVING_MOOD && !companion.captive) left.push(updated)
    else next.push(updated)
  }
  return { companions: next, left }
}

/** Спутники, которые прямо сейчас идут с героем. */
export function following(companions: readonly Companion[]): readonly Companion[] {
  return companions.filter((one) => !one.captive && one.role.type === 'party')
}
