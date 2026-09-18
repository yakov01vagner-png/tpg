import type { Band } from './band'
import { musterBands } from './band'
import type { Battle } from './battle'
import type { Character } from './character'
import type { Companion } from './companion'
import type { Settlement } from './economy'
import { createSettlements } from './economy'
import type { Enterprise } from './enterprise'
import type { GameEvent } from './events'
import { describeEvent } from './events'
import type { Party } from './party'
import { EMPTY_PARTY } from './party'
import type { Quest } from './quest'
import type { Reputation } from './reputation'
import { NO_REPUTATION } from './reputation'
import type { Rng } from './rng'
import { createRng } from './rng'
import type { GameTime } from './time'
import { WORLD_START } from './time'
import type { Politics } from './war'
import { createPolitics } from './war'
import { defaultStartLocationId, generateWorld } from './world/generate'
import type { World } from './world/types'

/** Версия схемы сейва. Растёт при любом несовместимом изменении GameState. */
export const SCHEMA_VERSION = 8

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
  /**
   * Живая часть поселений: население и запасы товаров. Скелет мира неизменен,
   * а вот это меняется каждый игровой день.
   */
  readonly settlements: Readonly<Record<string, Settlement>>
  /** Где сейчас находится игрок. */
  readonly locationId: string
  /** Люди под началом игрока. */
  readonly party: Party
  /** Идущий бой. Пока он есть, мир стоит: время боя своё (DESIGN.md, п.2). */
  readonly battle: Battle | null
  /** Кто с кем воюет. */
  readonly politics: Politics
  /**
   * Дружины лордов на карте. Войну ведут они: пока никто не дошёл до места,
   * объявленная война остаётся бумагой (band.ts).
   */
  readonly bands: readonly Band[]
  /** Королевство, которому игрок служит за жалованье. */
  readonly service: string | null
  /** Идущая осада: место и сколько суток войско стоит под стенами. */
  readonly siege: { readonly locationId: string; readonly days: number } | null
  /** Слава: победы, за которые корона может пожаловать землю. */
  readonly renown: number
  /** Что о тебе помнят места и лорды. */
  readonly reputation: Reputation
  /** Своё владение, если провозглашено. */
  readonly realm: { readonly name: string } | null
  /** Взятые поручения. */
  readonly quests: readonly Quest[]
  /** Именные люди при герое: с ними идут, им поручают, их теряют. */
  readonly companions: readonly Companion[]
  /** Караваны и мастерские: доход, который идёт без игрока. */
  readonly enterprises: readonly Enterprise[]
  /** Игра кончена: герой погиб. Пермадэт редкий, но настоящий. */
  readonly over: boolean
  readonly log: readonly LogEntry[]
}

export function createGame(character: Character, seed = 1, prebuilt?: World): GameState {
  // Мир можно передать готовым: тестам и прогонам баланса незачем каждый раз
  // собирать семьдесят локаций заново.
  const world = prebuilt ?? generateWorld(seed)
  const locationId = defaultStartLocationId(world)
  const home = world.locations[locationId]
  // Землю раздаём сразу: у каждого места есть держатель, иначе отнимать не у кого.
  const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(seed))
  const [bands] = musterBands(politics, settlements, createRng(seed + 7))
  return {
    schemaVersion: SCHEMA_VERSION,
    time: WORLD_START,
    rng: createRng(seed),
    character,
    world,
    settlements,
    locationId,
    party: EMPTY_PARTY,
    battle: null,
    politics,
    bands,
    service: null,
    siege: null,
    renown: 0,
    reputation: NO_REPUTATION,
    realm: null,
    quests: [],
    companions: [],
    enterprises: [],
    over: false,
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
