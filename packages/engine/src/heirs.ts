import { HEIRS, HEIRS_WORDS } from './content/heirs'
import type { WayId } from './content/way'
import { sideName } from './dread'
import { PLAYER } from './holding'
import { crownOf } from './lordlife'
import { reignOf } from './royal'
import type { GameState } from './state'
import type { GameState as State } from './state'
import { TEMPER_WAY, crownWay, flavourWay } from './theirway'
import type { World } from './world/types'

/**
 * Наследники чужих путей (этап 144).
 *
 * Государи не вечны, и путь — тоже: со сменой государя он либо переходит, либо
 * переменяется. Нрав нового выводится из короны и колена (`reignOf`), а не
 * хранится: одно и то же колено всегда даёт одного и того же человека.
 */

/** Нрав того, кто правит этой короной в этот день. */
export function crownTemperNow(id: string, day: number): string {
  const reign = reignOf(id, day)
  if (reign === 0) return crownOf(id).temper
  // Тот же приём, что у имён корон: перемешать прежде, чем брать остаток.
  let hash = 2166136261
  for (const ch of `${id}|${reign}`) {
    hash ^= ch.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  const mixed = (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
  const tempers = Object.keys(TEMPER_WAY)
  return tempers[mixed % tempers.length] ?? crownOf(id).temper
}

/** Каким путём пошёл бы нынешний государь этой короны (Нс1 и Нс2). */
export function heirWay(state: GameState, world: World, id: string, day: number): WayId {
  // Уклад переживает государя: лига торгует и при новом бургомистре. Нрав
  // решает только там, где уклад молчит.
  const kept = flavourWay(world, id)
  if (kept) return kept
  return (TEMPER_WAY[crownTemperNow(id, day)] ?? crownWay(state, world, id, day)) as WayId
}

/** Сменился ли государь с прошлого такта (Нс1). */
export function reignChanged(state: GameState, id: string, day: number): boolean {
  const was = state.reigns?.[id]
  return was !== undefined && was !== reignOf(id, day)
}

/** Смута: свои спорят, и путь стоит (Нс4). */
export function troubled(
  state: GameState,
  world: World,
  id: string,
  day: number,
): { readonly troubled: boolean; readonly loyalty: number; readonly says: string } {
  const lords = state.politics.lords.filter((one) => one.kingdomId === id)
  if (lords.length === 0)
    return { troubled: false, loyalty: 0, says: `${sideName(world, id)}: своих нет.` }
  const loyalty = Math.round(lords.reduce((sum, one) => sum + one.loyalty, 0) / lords.length)
  const is = loyalty < HEIRS.troubledAt
  return {
    troubled: is,
    loyalty,
    says: is
      ? `${HEIRS_WORDS.troubled} ${sideName(world, id)}: верность своих ${loyalty} из ${HEIRS.troubledAt}, шаг ×${HEIRS.troubledSpeed}.`
      : `${sideName(world, id)}: свои держатся, верность ${loyalty}.`,
  }
}

/** Наследство путей в числах (Нс6). */
export function heirsLedger(
  state: State,
  world: World,
  day: number,
): { readonly kept: number; readonly changed: number; readonly says: string } {
  const log = state.heirLog ?? { kept: 0, changed: 0 }
  const troubledNow = Object.keys(world.kingdoms).filter(
    (id) => troubled(state, world, id, day).troubled,
  )
  return {
    kept: log.kept,
    changed: log.changed,
    says: `Путей пережило своего государя ${log.kept}, переменилось ${log.changed}. В смуте сейчас ${troubledNow.length}${troubledNow.length > 0 ? `: ${troubledNow.map((id) => sideName(world, id)).join(', ')}` : ''}.`,
  }
}

export { HEIRS, HEIRS_WORDS }
