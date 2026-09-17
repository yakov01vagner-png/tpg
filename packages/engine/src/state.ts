import type { Character } from './character'
import type { GameEvent } from './events'
import { describeEvent } from './events'
import type { Rng } from './rng'
import { createRng } from './rng'
import type { GameTime } from './time'
import { WORLD_START } from './time'
import { defaultStartLocationId, generateWorld } from './world/generate'
import type { World } from './world/types'

/** Версия схемы сейва. Растёт при любом несовместимом изменении GameState. */
export const SCHEMA_VERSION = 2

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
  /**
   * Скелет мира. Генерируется один раз при создании игры и дальше не меняется
   * (DESIGN.md, п.3.1) — поэтому лежит прямо в состоянии и уходит в сейв.
   */
  readonly world: World
  /** Где сейчас находится игрок. */
  readonly locationId: string
  readonly log: readonly LogEntry[]
}

export function createGame(character: Character, seed = 1, prebuilt?: World): GameState {
  // Мир можно передать готовым: тестам и прогонам баланса незачем каждый раз
  // собирать семьдесят локаций заново.
  const world = prebuilt ?? generateWorld(seed)
  const locationId = defaultStartLocationId(world)
  const home = world.locations[locationId]
  return {
    schemaVersion: SCHEMA_VERSION,
    time: WORLD_START,
    rng: createRng(seed),
    character,
    world,
    locationId,
    log: [
      {
        time: WORLD_START,
        text: `${character.name} начинает свой путь${home ? ` в месте под названием ${home.name}` : ''}.`,
      },
    ],
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
