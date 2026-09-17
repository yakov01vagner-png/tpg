import type { Character } from './character'
import type { GameEvent } from './events'
import { describeEvent } from './events'
import type { Rng } from './rng'
import { createRng } from './rng'
import type { GameTime } from './time'
import { WORLD_START } from './time'

/** Версия схемы сейва. Растёт при любом несовместимом изменении GameState. */
export const SCHEMA_VERSION = 1

/** Сколько строк лога держим в состоянии. Остальное — история, она не нужна. */
export const LOG_LIMIT = 200

export interface LogEntry {
  readonly time: GameTime
  readonly text: string
}

/**
 * Полное состояние игры: сериализуемые данные и ничего больше.
 * Никаких функций, классов, ссылок на UI — иначе сейв и будущий сервер отпадут.
 */
export interface GameState {
  readonly schemaVersion: number
  readonly time: GameTime
  readonly rng: Rng
  readonly character: Character
  readonly log: readonly LogEntry[]
}

export function createGame(character: Character, seed = 1): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    time: WORLD_START,
    rng: createRng(seed),
    character,
    log: [{ time: WORLD_START, text: `${character.name} начинает свой путь.` }],
  }
}

/** Дописать в лог строки, которые породили события. */
export function appendLog(
  log: readonly LogEntry[],
  time: GameTime,
  events: readonly GameEvent[],
): readonly LogEntry[] {
  const entries: LogEntry[] = []
  for (const event of events) {
    const text = describeEvent(event)
    if (text !== null) entries.push({ time, text })
  }
  if (entries.length === 0) return log
  return [...log, ...entries].slice(-LOG_LIMIT)
}
