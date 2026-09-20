import { memoryOf } from './annals'
import type { Character } from './character'
import { ENDING_DEFS, type EndingId } from './content/ending'
import { endingOf } from './ending'
import { PLAYER } from './holding'
import { createGame } from './state'
import type { GameState } from './state'
import { dayOf } from './time'
import { traceOf } from './trace'
import type { World } from './world/types'

/**
 * Новая игра в старом мире (этап 157).
 *
 * Мир не сбрасывается: границы, дома, кривые, эпохи и летопись — те, к которым
 * он пришёл. Меняется только человек, и прежний становится частью чужой
 * памяти, как всякий, о ком помнят.
 */

export interface Legend {
  readonly name: string
  readonly fromDay: number
  readonly toDay: number
  readonly ending: string
  readonly says: string
}

export function legendsOf(state: Pick<GameState, 'legends'>): readonly Legend[] {
  return state.legends ?? []
}

/** Чем запомнят того, кто только что кончил (Нг3). */
export function legendFrom(state: GameState, world: World, day: number): Legend {
  const end = endingOf(state, world, day)
  const memory = memoryOf(state, day)
  const trace = traceOf(state, world, day)
  return {
    name: state.character.name,
    fromDay: 1,
    toDay: day,
    ending: end.id ?? 'none',
    says: `${state.character.name}${state.realm ? ` (${state.realm.name})` : ''}: ${end.id ? ENDING_DEFS[end.id as EndingId].label : 'без имени'}. Доброго ${memory.good}, худого ${memory.bad}; ${trace.says}`,
  }
}

/**
 * Начать новую жизнь в том же мире (Нг1, Нг2 и Нг4).
 *
 * Берётся всё, что принадлежит миру, а не человеку: земля с её хозяевами,
 * политика, кривые, эпохи, летопись и предания. Человеческое — дом, отряд,
 * казна, пути — начинается заново.
 */
export function newLifeIn(state: GameState, character: Character, day: number): GameState {
  const fresh = createGame(character, 1, state.world)
  const legend = legendFrom(state, state.world, day)
  // Земля прежнего героя остаётся в мире, но уже не его: её держат те, кто
  // держал, а игрокова доля выходит из-под руки.
  const settlements = Object.fromEntries(
    Object.entries(state.settlements).map(([id, one]) => [
      id,
      one.owner === PLAYER ? { ...one, owner: null } : one,
    ]),
  )
  return {
    ...fresh,
    // Мир и его история.
    settlements,
    politics: state.politics,
    bands: state.bands,
    time: state.time,
    curves: state.curves ?? {},
    era: state.era ?? null,
    eraLog: state.eraLog ?? [],
    crownWays: state.crownWays ?? {},
    raceLog: state.raceLog ?? { steps: 0, done: [], shares: {} },
    reigns: state.reigns ?? {},
    heirLog: state.heirLog ?? { kept: 0, changed: 0 },
    balanceLog: state.balanceLog ?? { betrayals: 0, wars: 0 },
    theirEnd: state.theirEnd ?? null,
    hands: state.hands ?? [],
    guarantees: (state.guarantees ?? []).filter((one) => one.by !== PLAYER && one.of !== PLAYER),
    // Летопись мира и предания о прежних.
    log: state.log.filter((one) => one.kind === 'world' || one.kind === 'war'),
    legends: [...legendsOf(state), legend],
  }
}

/** Что мир помнит о прежних (Нг2 и Нг3). */
export function legendsSay(state: GameState, world: World, day: number): string {
  const rows = legendsOf(state)
  if (rows.length === 0) return 'Прежних в этом мире не было: ты первый.'
  return `Прежних ${rows.length}: ${rows.map((one) => one.says).join(' | ')}`
}
