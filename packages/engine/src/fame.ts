import type { DeedId } from './content/companions'
import {
  BYNAMES,
  type BynameDef,
  CIRCLES,
  CIRCLE_DEFS,
  CIRCLE_FEELS,
  type Circle,
  SHAME_COVER,
  SHAME_DEFS,
  SINGER_NAMES,
  type ShameId,
  TALE_HOP,
  TALE_STEPS,
  TALE_STEP_DEFS,
  type TaleStep,
} from './content/fame'
import type { GameState } from './state'

/**
 * Слава и молва (этап 68).
 *
 * Слава была одним числом. Здесь их пять — по кругам, которые считают доброе и
 * дурное каждый по-своему, — и сверху лежит то, что из них получилось: прозвище,
 * рассказ, который портится по дороге, и позор, который надо перекрывать делом.
 */

export type Fame = Readonly<Record<string, number>>

export function fameOf(state: Pick<GameState, 'fame'>, circle: Circle): number {
  return state.fame?.[circle] ?? 0
}

export function circleDef(circle: Circle) {
  return CIRCLE_DEFS[circle]
}

/** Что этот круг думает о таком поступке. */
export function circleFeels(circle: Circle, deed: DeedId): number {
  return CIRCLE_FEELS[circle][deed] ?? 0
}

/** Слава после поступка: каждый круг считает по-своему. */
export function withDeed(fame: Fame | undefined, deed: DeedId): Fame {
  const next: Record<string, number> = { ...(fame ?? {}) }
  for (const circle of CIRCLES) {
    const felt = circleFeels(circle, deed)
    if (felt === 0) continue
    next[circle] = Math.max(-100, Math.min(100, (next[circle] ?? 0) + felt))
  }
  return next
}

/** Одним словом: как этот круг к тебе. */
export function fameWord(value: number): string {
  if (value <= -60) return 'ненавидят'
  if (value <= -25) return 'не любят'
  if (value < 10) return 'не знают'
  if (value < 40) return 'слышали'
  if (value < 70) return 'уважают'
  return 'славят'
}

// --- прозвище (Ф1) ----------------------------------------------------------

export function bynameDef(id: string): BynameDef | null {
  return BYNAMES.find((one) => one.id === id) ?? null
}

/**
 * Как тебя зовут за глаза.
 *
 * Мир смотрит, чего у тебя больше, и зовёт по этому: берётся самое крайнее из
 * заслуженного — то, что дальше всех от «не знают». Прозвище одно и меняется
 * вместе с делами; пока ничего крайнего нет, его и нет.
 */
export function bynameOf(state: Pick<GameState, 'fame'>): BynameDef | null {
  let best: BynameDef | null = null
  let strongest = 0
  for (const def of BYNAMES) {
    const value = fameOf(state, def.circle)
    const earned = def.needs >= 0 ? value >= def.needs : value <= def.needs
    if (!earned) continue
    const distance = Math.abs(value)
    if (distance > strongest) {
      strongest = distance
      best = def
    }
  }
  return best
}

/** Полное имя с прозвищем — то, как о тебе говорят. */
export function fullName(state: Pick<GameState, 'fame' | 'character'>): string {
  const byname = bynameOf(state)
  return byname ? `${state.character.name} ${byname.label}` : state.character.name
}

// --- молва (Ф2) -------------------------------------------------------------

/**
 * Насколько испортился рассказ, дошедший сюда.
 *
 * Считается по переходам от места, где это было: каждые два перехода — ступень
 * порчи. Потому в соседнем селе рассказывают почти как было, а за три области —
 * то, чего не было вовсе.
 */
export function taleStepFor(hops: number): TaleStep {
  const step = Math.min(TALE_STEPS.length - 1, Math.floor(hops / TALE_HOP))
  return TALE_STEPS[step] ?? 'true'
}

export function taleStepDef(step: TaleStep) {
  return TALE_STEP_DEFS[step]
}

/** Как рассказывают о твоём деле здесь. */
export function taleOf(deed: string, hops: number): string {
  const step = taleStepFor(hops)
  if (step === 'true') return deed
  if (step === 'grown') return `${deed} — и, говорят, там было вдвое больше`
  if (step === 'twisted') return `${deed}, только рассказывают наоборот`
  return `что-то про ${deed}, но имя называют чужое`
}

// --- позор (Ф6) -------------------------------------------------------------

export interface Shame {
  readonly id: ShameId
  /** С какого дня висит. */
  readonly since: number
  /** Сколько дел того же круга уже перекрыли. */
  readonly covered: number
}

export function shameDef(id: ShameId) {
  return SHAME_DEFS[id]
}

export function shamesOf(state: Pick<GameState, 'shames'>): readonly Shame[] {
  return state.shames ?? []
}

/** Висит ли на тебе позор перед этим кругом. */
export function shameBefore(state: Pick<GameState, 'shames'>, circle: Circle): Shame | null {
  return shamesOf(state).find((one) => shameDef(one.id).circle === circle) ?? null
}

/**
 * Перекрыть позор делом.
 *
 * Не откупиться и не забыть: сделать три дела того же круга, которым он
 * оплачивается. После третьего его перестают вспоминать.
 */
export function coverShames(
  shames: readonly Shame[],
  deed: DeedId,
): { readonly shames: readonly Shame[]; readonly covered: readonly ShameId[] } {
  const done: ShameId[] = []
  const next: Shame[] = []
  for (const shame of shames) {
    if (shameDef(shame.id).covers !== deed) {
      next.push(shame)
      continue
    }
    const covered = shame.covered + 1
    if (covered >= SHAME_COVER) {
      done.push(shame.id)
      continue
    }
    next.push({ ...shame, covered })
  }
  return { shames: next, covered: done }
}

// --- певец (Ф5) -------------------------------------------------------------

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Кто здесь поёт за деньги. */
export function singerAt(locationId: string, day: number): string {
  const hash = hashOf(`singer|${locationId}|${Math.floor(day / 30)}`)
  return SINGER_NAMES[hash % SINGER_NAMES.length] ?? 'певец'
}

export const ALL_CIRCLES = CIRCLES
