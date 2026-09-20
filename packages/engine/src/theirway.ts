import { FLAVOUR_WAY, TEMPER_WAY, THEIRWAY, THEIRWAY_WORDS } from './content/theirway'
import type { WayId } from './content/way'
import { sideName } from './dread'
import { crownOf } from './lordlife'
import type { GameState } from './state'
import { type WayState, wayOf } from './way'
import type { World } from './world/types'

/**
 * У короны есть путь (этап 140).
 *
 * Путь выводится из короны: из нрава её государя и из уклада, записанного в
 * мире. Считается он тем же `wayOf`, что путь игрока, — отдельного счёта для
 * корон нет и не будет, иначе мир начнёт врать.
 */

/** Каким путём идёт эта корона (Кп1). */
export function crownWay(state: GameState, world: World, id: string, day: number): WayId {
  const chosen = state.crownWays?.[id]?.way
  if (chosen) return chosen as WayId
  const flavour = (world.kingdoms[id]?.flavor ?? '').toLowerCase()
  const name = (world.kingdoms[id]?.name ?? '').toLowerCase()
  for (const one of FLAVOUR_WAY) {
    if (flavour.includes(one.word) || name.includes(one.word)) return one.way
  }
  return TEMPER_WAY[crownOf(id).temper] ?? 'crown'
}

/** Где она на своём пути — той же меркой, что игрок (Кп2). */
export function theirWay(state: GameState, world: World, id: string, day: number): WayState {
  return wayOf(state, world, id, crownWay(state, world, id, day), day)
}

/** Путь короны словами (Кп4). */
export function theirWaySays(state: GameState, world: World, id: string, day: number): string {
  const way = theirWay(state, world, id, day)
  const left =
    way.left.length === 0 ? 'дошёл' : `осталось ${way.left.length}: ${way.left.join('; ')}`
  return `${sideName(world, id)} идёт ${way.way}: пройдено ${Math.round(way.share * 100)} из ста, ${left}.`
}

/** Сменила ли корона путь и почему (Кп3). */
export function wouldChange(
  state: GameState,
  world: World,
  id: string,
  day: number,
): { readonly changes: boolean; readonly to: WayId; readonly says: string } {
  const now = crownWay(state, world, id, day)
  const lost = state.crownWays?.[id]?.places ?? 0
  const places = theirWay(state, world, id, day).steps.find(
    (one) => one.step.measure === 'places',
  )?.have
  const shrank = lost > 0 && places !== undefined && lost - places >= THEIRWAY.losesPlaces
  // Проигравший войну идёт не тем же путём: короной не вышло — пойдёт домом.
  const to: WayId = now === 'crown' ? 'house' : now === 'faith' ? 'trade' : 'crown'
  return {
    changes: shrank,
    to,
    says: shrank
      ? `${THEIRWAY_WORDS.changed} ${sideName(world, id)}: ${now} → ${to}, потеряно мест ${lost - (places ?? 0)}.`
      : `${sideName(world, id)} идёт своим путём (${now}) и менять его не думает.`,
  }
}

/** Пути мира в числах (Кп6). */
export function worldWays(
  state: GameState,
  world: World,
  day: number,
): { readonly rows: readonly string[]; readonly says: string } {
  const rows = Object.keys(world.kingdoms).map((id) => {
    const way = theirWay(state, world, id, day)
    return `${sideName(world, id)} — ${way.way} ${Math.round(way.share * 100)}`
  })
  return {
    rows,
    says: `${THEIRWAY_WORDS.own} ${THEIRWAY_WORDS.same} ${rows.join('; ')}.`,
  }
}

export { THEIRWAY, THEIRWAY_WORDS, TEMPER_WAY, FLAVOUR_WAY }
