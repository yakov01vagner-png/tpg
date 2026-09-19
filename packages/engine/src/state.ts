import type { Band } from './band'
import { musterBands } from './band'
import type { Battle } from './battle'
import { startSway } from './brother'
import type { OrderSway } from './brother'
import type { Brotherhood } from './brotherhood'
import type { Captive } from './captive'
import type { ChainProgress } from './chain'
import type { Character } from './character'
import type { Companion } from './companion'
import type { BuildingId } from './content/buildings'
import { PLAIN_LAW } from './content/estate'
import type { Ailment } from './content/heal'
import type { LordDeedId } from './content/lords'
import type { QuarterId } from './content/quarters'
import type { CechMembership } from './craft'
import type { Settlement } from './economy'
import { createSettlements } from './economy'
import type { Enterprise } from './enterprise'
import type { Law } from './estate'
import type { GameEvent, LogKind } from './events'
import { describeEvent, kindOf } from './events'
import type { Home } from './home'
import type { Journey } from './journey'
import type { Knowledge } from './knowledge'
import { startKnowledge } from './knowledge'
import type { Artifact, Spellcraft, Weather } from './lore'
import { EMPTY_PRICE_LOG, type PriceLog } from './market'
import type { Dealing } from './merchant'
import type { Interdict, Membership } from './order'
import type { Party } from './party'
import { EMPTY_PARTY } from './party'
import type { Plague } from './plague'
import { arrivalQuarter } from './quarter'
import type { Quest } from './quest'
import type { Reputation } from './reputation'
import { NO_REPUTATION } from './reputation'
import type { Rng } from './rng'
import { createRng } from './rng'
import type { Ship } from './ship'
import type { Siege } from './siege'
import type { GameTime } from './time'
import { WORLD_START } from './time'
import type { Politics } from './war'
import { createPolitics } from './war'
import type { WildMemory } from './wild'
import { generateWorld, startLocationFor } from './world/generate'
import type { World } from './world/types'

/** Версия схемы сейва. Растёт при любом несовместимом изменении GameState. */
export const SCHEMA_VERSION = 21

/** Сколько строк лога держим в состоянии. Остальное — история, она не нужна. */
export const LOG_LIMIT = 200

export interface LogEntry {
  readonly time: GameTime
  readonly text: string
  readonly kind: LogKind
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
  /**
   * Где сейчас находится игрок. Пока идёт путь (`journey`) — место, откуда он
   * вышел: герой числится в дороге от него, а не в пустоте.
   */
  readonly locationId: string
  /**
   * Путь между местами, если герой в дороге.
   *
   * До 0.4 перемещение было мгновенным, и «где ты» всегда было точкой. Теперь
   * между точками можно находиться, и почти всё, что спрашивает место, в пути
   * отвечает отказом: работать, торговать и говорить с людьми под открытым
   * небом не с кем (`ROAD_COMMANDS`).
   */
  readonly journey: Journey | null
  /** Люди под началом игрока. */
  readonly party: Party
  /**
   * Своё судно, если куплено (этап 35).
   *
   * Лежит в состоянии, а не в мире: корабль — имущество героя, как деньги и
   * снаряжение. Пустое почти всю игру: своё судно стоит как три каравана.
   */
  readonly ship: Ship | null
  /**
   * Орден или гильдия, в которой состоит герой (этап 42). Ордена ревнивы:
   * состоять можно в одном. Пусто — сам по себе.
   */
  readonly guild: Membership | null
  /** Когда в последний раз держали двор (этап 43). Необязательно: сейвы до 0.5 двора не знают. */
  readonly courtDay?: number
  /**
   * Где в городе стоит герой (этап 45): квартал большого места. Пусто — место
   * без кварталов или сейв до 0.5. Сам список кварталов не хранится: он
   * выводится из места (`quarter.ts`).
   */
  readonly quarter?: QuarterId | null
  /**
   * Что герой знает о мире (этап 46): открытые провинции. Необязательно —
   * сейв до 0.5 знания не ведёт и знает всё.
   */
  readonly knowledge?: Knowledge
  /**
   * Память купцов о тебе (этап 49): кто как встречает и что помнит. Сами
   * купцы выводятся из места (`merchant.ts`) — в сейве только память.
   * Необязательно: сейвы до 0.6 купцов не знают.
   */
  readonly dealings?: Readonly<Record<string, Dealing>>
  /**
   * Выучка в ремёслах (этап 50): сколько смен отстоял на каждой работе. Из
   * этого числа выводится ступень — подёнщик, подмастерье, работник, мастер.
   */
  readonly craft?: Readonly<Record<string, number>>
  /** Членство в цехе города (этап 50): одно на героя, как и орден. */
  readonly cech?: CechMembership | null
  /**
   * Благочестие (этап 51): как на тебя смотрит церковь. Растёт от обрядов и
   * паломничества, падает от разорения и святотатства. Ниже −50 — отлучение.
   */
  readonly piety?: number
  /** Когда в последний раз ходил к святому месту: паломничество не еженедельно. */
  readonly pilgrimDay?: number
  /**
   * С кем сколько говорили нынче (этап 53): у всякого нрава своё терпение.
   * Обнуляется с новым днём — разговор помнится, но не копится.
   */
  readonly talked?: Readonly<Record<string, number>>
  /**
   * Павшие спутники (этап 54): имя, день и место. Их помнят и о них говорят;
   * встретить их снова нельзя.
   */
  /**
   * Книги на руках (этап 55): что куплено и найдено, и что уже прочитано.
   */
  readonly books?: Readonly<Record<string, { readonly read: boolean; readonly days: number }>>
  /** Свой ученик (этап 55, Н5): кто идёт следом и с какого дня. */
  /** Свой дом (этап 56): где он, какой и что в нём оставлено. */
  readonly home?: Home | null
  /** Что вложено в детей (этап 56): по имени ребёнка. */
  readonly upbringing?: Readonly<Record<string, number>>
  readonly student?: {
    readonly id: string
    readonly name: string
    readonly since: number
    readonly learned: number
  } | null
  readonly fallen?: readonly {
    readonly id: string
    readonly name: string
    readonly day: number
    readonly locationId: string
  }[]
  /**
   * Отведённый мор (этап 41): где и до какого дня чары держат смерть вполовину.
   * Необязательно — сейвы до 0.5 чар не знают.
   */
  readonly cleansed?: { readonly locationId: string; readonly untilDay: number } | null
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
  /**
   * Идущая осада: место, сутки под стенами, подкоп и пролом (этап 58).
   * Подкоп и пролом необязательны — сейвы до 0.6 осад без подкопа не знают.
   */
  readonly siege: Siege | null
  /**
   * Взятые в бою лорды (этап 58, Б6): за них платят, им навязывают присягу,
   * их отпускают или вешают. Необязательно — сейвы до 0.6 плена не знают.
   */
  readonly captives?: readonly Captive[]
  /** Слава: победы, за которые корона может пожаловать землю. */
  readonly renown: number
  /** Что о тебе помнят места и лорды. */
  readonly reputation: Reputation
  /**
   * Влияние орденов в мире (этап 59, О3): шесть чисел, которые живут без
   * игрока. Необязательно — сейвы до 0.6 орденской жизни не знают.
   */
  readonly orderSway?: OrderSway
  /** Наложенные запреты: где и до какого дня место живёт без ордена. */
  readonly interdicts?: readonly Interdict[]
  /** Своё братство, если основано (этап 59, О6). */
  readonly brotherhood?: Brotherhood | null
  /**
   * Заклинание как ремесло (этап 60, А5): сколько раз творили каждое и когда в
   * последний раз. Необязательно — сейвы до 0.6 мастерства не знают.
   */
  readonly spellcraft?: Spellcraft
  /** Позванная погода: где, какая и до какого дня (этап 60, А3). */
  readonly weather?: readonly Weather[]
  /** Вещи с чарами: найденные и сделанные (этап 60, А6). */
  readonly artifacts?: readonly Artifact[]
  /**
   * Своя земля изнутри (этап 61). Закон, который ты поставил; просьбы, о
   * которых помнят; постройки, которые встали; когда ты был в каждом своём
   * месте. Всё необязательно — сейвы до 0.6 своей земли изнутри не знают.
   */
  readonly law?: Law
  readonly pleas?: Readonly<Record<string, { readonly askId: string; readonly askedDay: number }>>
  readonly works?: Readonly<Record<string, readonly BuildingId[]>>
  readonly visits?: Readonly<Record<string, number>>
  /**
   * Что ты сделал с глушью (этап 63): какое логово вывел, какой схрон обобрал,
   * с каким отшельником говорил. Сама глушь выводится из места и времени — тут
   * лежит только память. Необязательно: сейвы до 0.6 её не знают.
   */
  readonly wilds?: Readonly<Record<string, WildMemory>>
  /**
   * Мор, раны и лекари (этап 64). Сваренные зелья, болезнь отряда и запертые
   * места. Всё необязательно — сейвы до 0.6 этого не знают.
   */
  readonly potions?: Readonly<Record<string, number>>
  readonly ailment?: { readonly kind: Ailment; readonly since: number } | null
  /** Увечья: что осталось от плохо заживших ран. */
  readonly maims?: readonly string[]
  /**
   * Лорды как люди (этап 66). Что лорды о тебе помнят и как к тебе придворные
   * партии. Необязательно — сейвы до 0.6 этого не знают.
   */
  readonly lordDeeds?: Readonly<Record<string, readonly LordDeedId[]>>
  readonly factions?: Readonly<Record<string, number>>
  /** Своё владение, если провозглашено. */
  /**
   * Своё имя на карте. С этапа 67 помнит и день, когда оно появилось: у имени
   * бывает годовщина. Необязательно — сейвы до 0.6 дня не знают.
   */
  readonly realm: { readonly name: string; readonly sinceDay?: number } | null
  /** Взятые поручения. */
  readonly quests: readonly Quest[]
  /** Именные люди при герое: с ними идут, им поручают, их теряют. */
  readonly companions: readonly Companion[]
  /** Караваны и мастерские: доход, который идёт без игрока. */
  readonly enterprises: readonly Enterprise[]
  /** Где идёт мор. Пусто почти всегда — и тем страшнее, когда не пусто. */
  readonly plagues: readonly Plague[]
  /** Записная книжка купца: цены там, где ты был или где стоял твой караван. */
  readonly priceLog: PriceLog
  /** Поручения руками: какие идут и какие уже сделаны. */
  readonly chains: readonly ChainProgress[]
  readonly doneChains: readonly string[]
  /** Сколько боёв выиграно: цепочки и лорды считают по этому. */
  readonly battlesWon: number
  /** Где уже искали. Находка одна на место: курган не станок для денег. */
  readonly searchedSites: readonly string[]
  /** Игра кончена: герой погиб. Пермадэт редкий, но настоящий. */
  readonly over: boolean
  readonly log: readonly LogEntry[]
}

export function createGame(character: Character, seed = 1, prebuilt?: World): GameState {
  // Мир можно передать готовым: тестам и прогонам баланса незачем каждый раз
  // собирать семьдесят локаций заново.
  const world = prebuilt ?? generateWorld(seed)
  const locationId = startLocationFor(world, character.tags)
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
    journey: null,
    quarter: arrivalQuarter({ world, settlements }, locationId),
    knowledge: startKnowledge(world, locationId),
    dealings: {},
    craft: {},
    cech: null,
    piety: 0,
    talked: {},
    fallen: [],
    books: {},
    home: null,
    upbringing: {},
    student: null,
    party: EMPTY_PARTY,
    ship: null,
    guild: null,
    orderSway: startSway(),
    law: PLAIN_LAW,
    pleas: {},
    works: {},
    visits: {},
    wilds: {},
    potions: {},
    ailment: null,
    maims: [],
    lordDeeds: {},
    factions: {},
    spellcraft: {},
    weather: [],
    artifacts: [],
    interdicts: [],
    brotherhood: null,
    battle: null,
    politics,
    bands,
    service: null,
    siege: null,
    captives: [],
    renown: 0,
    reputation: NO_REPUTATION,
    realm: null,
    quests: [],
    companions: [],
    enterprises: [],
    plagues: [],
    priceLog: EMPTY_PRICE_LOG,
    chains: [],
    doneChains: [],
    battlesWon: 0,
    searchedSites: [],
    over: false,
    log: [
      {
        time: WORLD_START,
        text: `${character.name} начинает свой путь${home ? ` в месте под названием ${home.name}` : ''}.`,
        kind: 'notice',
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
    if (text !== null) entries.push({ time, text, kind: kindOf(event) })
  }
  if (entries.length === 0) return log
  return [...log, ...entries].slice(-LOG_LIMIT)
}
