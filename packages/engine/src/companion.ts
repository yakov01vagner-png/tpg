import type { CompanionDef, DeedId, TemperId } from './content/companions'
import { COMPANIONS, TEMPERS } from './content/companions'
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
}

/** Ниже этого спутник уходит. */
export const LEAVING_MOOD = 15
export const START_MOOD = 55

export function companionDef(id: string): CompanionDef | null {
  return COMPANIONS[id] ?? null
}

export function hireCompanion(def: CompanionDef): Companion {
  return {
    id: def.id,
    name: def.name,
    temper: def.temper,
    skills: def.skills,
    mood: START_MOOD,
    role: { type: 'party' },
    captive: false,
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
