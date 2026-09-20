import { memoryOf } from './annals'
import { chaptersOf, houseOf } from './chronicle'
import { ERA_DEFS, type EraId } from './content/era'
import { curveOf } from './curve'
import { sideName, wayTruth } from './dread'
import { eraNow } from './era'
import { PLAYER, holdingsOf } from './holding'
import type { GameState } from './state'
import { crownWay, theirWay } from './theirway'
import { traceOf } from './trace'
import type { Walker } from './way'
import type { World } from './world/types'

/**
 * Сводка века (этап 149).
 *
 * Ничего не хранится: сводка целиком выводится из летописи, путей и кривых.
 * И ничего не хвалит — только числа с причинами: где кто был, куда шёл и что
 * от этого осталось.
 */

export interface CenturyRow {
  readonly who: Walker
  readonly way: string
  readonly share: number
  readonly trend: string
  readonly says: string
}

export interface Century {
  readonly years: number
  readonly rows: readonly CenturyRow[]
  readonly eras: readonly string[]
  readonly wars: number
  readonly houses: number
  readonly yours: string
  readonly says: string
}

/** Век одним счётом (Св1–Св5). */
export function centuryOf(state: GameState, world: World, day: number): Century {
  const years = Math.round(day / 365)
  const rows: CenturyRow[] = [
    {
      who: PLAYER,
      way: 'свой',
      share: wayTruth(state, world, PLAYER, day),
      trend: curveOf(state, world, PLAYER, day).trend,
      says: `${sideName(world, PLAYER)}: ${wayTruth(state, world, PLAYER, day)} из ста, ${curveOf(state, world, PLAYER, day).trend}`,
    },
    ...Object.keys(world.kingdoms).map((id) => {
      const way = theirWay(state, world, id, day)
      const curve = curveOf(state, world, id, day)
      return {
        who: id as Walker,
        way: crownWay(state, world, id, day) as string,
        share: Math.round(way.share * 100),
        trend: curve.trend,
        says: `${sideName(world, id)}: ${crownWay(state, world, id, day)} ${Math.round(way.share * 100)} из ста, ${curve.trend}`,
      }
    }),
  ].sort((a, b) => b.share - a.share)
  const past = (state.eraLog ?? []).map(
    (one) =>
      `${ERA_DEFS[one.id as EraId].label} (${Math.round(one.from / 365)}–${Math.round(one.to / 365)})`,
  )
  const now = eraNow(state, world, day)
  const eras = now.id ? [...past, `${ERA_DEFS[now.id].label} (идёт)`] : past
  const wars = state.log.filter((one) => one.kind === 'war').length
  const trace = traceOf(state, world, day)
  const memory = memoryOf(state, day)
  const first = rows[0]
  const mine = rows.findIndex((one) => one.who === PLAYER) + 1
  return {
    years,
    rows,
    eras,
    wars,
    houses: houseOf(state).length,
    yours: `Ты ${mine}-й из ${rows.length}: мест ${holdingsOf(state.settlements, PLAYER).length}, колен ${trace.generations}, помнят доброго ${memory.good} и худого ${memory.bad}.`,
    says: [
      `Век ${years}: глав в летописи ${chaptersOf(state).length}, войн в ней ${wars}.`,
      `Ведёт ${first ? first.says : 'никто'}.`,
      eras.length > 0 ? `Эпохи: ${eras.join(', ')}.` : 'Эпох не случилось.',
      `Ты ${mine}-й из ${rows.length}. ${trace.says}`,
    ].join(' '),
  }
}

/** Кто вёл и кто отстал — одной строкой чисел (Св2). */
export function raceOfCentury(state: GameState, world: World, day: number): string {
  return centuryOf(state, world, day)
    .rows.map((one) => `${sideName(world, one.who)} ${one.share}`)
    .join(' | ')
}
