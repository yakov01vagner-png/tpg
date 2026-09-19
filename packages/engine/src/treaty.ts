import {
  GUARANTOR_FEE,
  GUARANTOR_HOLD,
  SECRET_DEFS,
  SECRET_LEAK,
  type SecretId,
  TREATY_DEFS,
  type TreatyDef,
  type TreatyKind,
} from './content/treaties'
import { PLAYER } from './holding'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Договоры (этап 80).
 *
 * Посольство кончалось согласием — и согласие тут же превращалось в строку
 * списка: союз здесь, дань там. Договор — бумага, у которой есть вид, срок,
 * цена, свидетель и то, о чём договорились не вслух.
 *
 * Сам по себе договор ничего не делает: он объясняет, почему в мире сделано
 * то, что сделано (союз в `politics.alliances`, дань в `politics.tributes`), и
 * хранит то, чего в мире не видно, — срок, гаранта и тайную статью.
 */

export interface TreatySecret {
  readonly id: SecretId
  /** Против кого это направлено, если против кого-то. */
  readonly against?: string
  /** Раскрыта ли она. */
  readonly known?: boolean
}

export interface Treaty {
  readonly id: string
  readonly a: string
  readonly b: string
  readonly kind: TreatyKind
  readonly sinceDay: number
  /** Ноль — бессрочно. */
  readonly untilDay: number
  /** Сколько платят в сутки, если платят. */
  readonly perDay?: number
  /** Кто свидетель. */
  readonly guarantor?: string
  readonly secret?: TreatySecret
  /** Порван ли он — и кем. */
  readonly brokenBy?: string
}

export function treatyDef(kind: TreatyKind): TreatyDef {
  return TREATY_DEFS[kind]
}

export function secretDef(id: SecretId) {
  return SECRET_DEFS[id]
}

export function treatiesOf(state: Pick<GameState, 'treaties'>): readonly Treaty[] {
  return state.treaties ?? []
}

/** Живые договоры: не порванные и не истёкшие. */
export function liveTreaties(state: Pick<GameState, 'treaties'>, day: number): readonly Treaty[] {
  return treatiesOf(state).filter(
    (one) => one.brokenBy === undefined && (one.untilDay === 0 || one.untilDay > day),
  )
}

export function treatyBetween(
  state: Pick<GameState, 'treaties'>,
  a: string,
  b: string,
  day: number,
  kind?: TreatyKind,
): Treaty | null {
  return (
    liveTreaties(state, day).find(
      (one) =>
        ((one.a === a && one.b === b) || (one.a === b && one.b === a)) &&
        (kind === undefined || one.kind === kind),
    ) ?? null
  )
}

/** Что тебе нельзя, пока бумага жива. */
export function forbids(
  state: Pick<GameState, 'treaties'>,
  against: string,
  day: number,
): readonly TreatyKind[] {
  return liveTreaties(state, day)
    .filter((one) => one.a === against || one.b === against)
    .filter((one) => one.kind === 'peace' || one.kind === 'alliance' || one.kind === 'neutrality')
    .map((one) => one.kind)
}

/** Во что обойдётся разрыв: другой стороне и всем прочим. */
export function breachCost(treaty: Treaty): { readonly other: number; readonly world: number } {
  const def = treatyDef(treaty.kind)
  const hold = treaty.guarantor ? GUARANTOR_HOLD : 1
  return {
    other: Math.round(def.breach * hold),
    world: Math.round(def.shame * hold),
  }
}

/** Сколько берёт гарант за свидетельство. */
export function guarantorFee(treaty: Pick<Treaty, 'perDay' | 'kind'>): number {
  const base = treaty.perDay ? treaty.perDay * 365 : 400
  return Math.round(base * GUARANTOR_FEE)
}

/**
 * Насколько вероятно, что тайное станет явным за сутки.
 *
 * Тайна живёт, пока о ней знают двое; чем дольше она живёт, тем больше людей
 * успело узнать. Поэтому шанс растёт со временем, а не стоит на месте.
 */
export function leakChance(treaty: Treaty, day: number): number {
  if (!treaty.secret || treaty.secret.known) return 0
  const age = Math.max(0, day - treaty.sinceDay)
  return SECRET_LEAK * (1 + age / 365)
}

/** Договор словами — строка для сводки (Г6). */
export function treatyWords(world: World, treaty: Treaty, day: number): string {
  const def = treatyDef(treaty.kind)
  const nameOf = (side: string) => (side === PLAYER ? 'ты' : (world.kingdoms[side]?.name ?? side))
  const term =
    treaty.untilDay === 0
      ? 'бессрочно'
      : treaty.untilDay <= day
        ? 'срок вышел'
        : `ещё ${Math.round((treaty.untilDay - day) / 365)} лет`
  const witness = treaty.guarantor ? `, свидетель — ${nameOf(treaty.guarantor)}` : ''
  const secret =
    treaty.secret && treaty.secret.known
      ? `; тайная статья раскрыта: ${secretDef(treaty.secret.id).label}`
      : ''
  return `${def.label}: ${nameOf(treaty.a)} и ${nameOf(treaty.b)}, ${term}${witness}${secret}`
}

export { GUARANTOR_FEE, SECRET_DEFS, type SecretId, TREATY_DEFS, type TreatyKind }
