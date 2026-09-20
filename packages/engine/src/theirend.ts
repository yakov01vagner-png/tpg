import { STOPS, STOP_DEFS, type StopId, THEIREND, THEIREND_WORDS } from './content/theirend'
import { sideName } from './dread'
import { PLAYER } from './holding'
import type { GameState } from './state'
import { theirWay } from './theirway'
import type { Walker } from './way'
import type { World } from './world/types'

/**
 * Корона доходит до конца (этап 142).
 *
 * У корон появился путь (этап 140) и гонка (этап 141) — значит, появилась и
 * возможность дойти. Дошедший не кончает игру: он делает мир другим, и в этом
 * мире игроку остаются свои ходы, включая тот, чтобы принять исход.
 */

export function stopDef(id: StopId) {
  return STOP_DEFS[id]
}

/** Кто вот-вот дойдёт и чего ему осталось (Дх2). */
export function endNear(
  state: GameState,
  world: World,
  day: number,
): { readonly who: Walker | null; readonly left: readonly string[]; readonly says: string } {
  const rows = Object.keys(world.kingdoms)
    .map((id) => ({ id, way: theirWay(state, world, id, day) }))
    .sort((a, b) => b.way.share - a.way.share)
  const first = rows[0]
  if (!first || first.way.share < THEIREND.nearAt) {
    return { who: null, left: [], says: 'До конца никому пока не близко.' }
  }
  return {
    who: first.id,
    left: first.way.left,
    says: `${THEIREND_WORDS.near} ${sideName(world, first.id)}: ${Math.round(first.way.share * 100)} из ста, осталось ${first.way.left.length}${first.way.left.length > 0 ? ` — ${first.way.left.join('; ')}` : ''}.`,
  }
}

/** Чем ему можно помешать и чего это стоит (Дх3). */
export function waysToStop(
  state: GameState,
  world: World,
  who: Walker,
  day: number,
): readonly { readonly stop: StopId; readonly says: string }[] {
  return STOPS.map((stop) => ({
    stop,
    says: `${STOP_DEFS[stop].label}: ${STOP_DEFS[stop].about} Платится ${STOP_DEFS[stop].costs}.`,
  }))
}

/** Дошёл ли кто-нибудь и каков мир после этого (Дх1 и Дх4). */
export function theirEnd(
  state: GameState,
  world: World,
  day: number,
): {
  readonly who: Walker | null
  readonly sinceDay: number
  readonly served: boolean
  readonly says: string
} {
  const row = state.theirEnd ?? null
  if (!row) return { who: null, sinceDay: 0, served: false, says: 'Мир ещё ничей.' }
  const years = Math.round(((day - row.sinceDay) / 365) * 10) / 10
  return {
    who: row.who,
    sinceDay: row.sinceDay,
    served: (row.served ?? 0) > 0,
    says: `${THEIREND_WORDS.done} ${sideName(world, row.who)} — с ${row.sinceDay}-го дня, ${years} года назад. ${(row.served ?? 0) > 0 ? THEIREND_WORDS.serve : THEIREND_WORDS.after}`,
  }
}

/** Чужая победа в числах (Дх6). */
export function theirEndLedger(
  state: GameState,
  world: World,
  day: number,
): { readonly done: number; readonly years: number; readonly says: string } {
  const done = (state.raceLog?.done ?? []).length
  const row = state.theirEnd ?? null
  const years = row ? Math.round(((day - row.sinceDay) / 365) * 10) / 10 : 0
  const near = endNear(state, world, day)
  return {
    done,
    years,
    says: `Дошли до конца без тебя ${done}${row ? `; мир под ${sideName(world, row.who)} уже ${years} года` : ''}. ${near.says}`,
  }
}

export { THEIREND, THEIREND_WORDS, STOPS, STOP_DEFS, type StopId }
