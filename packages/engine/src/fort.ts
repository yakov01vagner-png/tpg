import { bandSize } from './band'
import {
  ENGINE_DEFS,
  type EngineId,
  SIEGE,
  SIEGE_WORDS,
  TERM_DEFS,
  type TermId,
  WATER_DEFS,
  type WaterId,
} from './content/siege'
import type { Settlement } from './economy'
import { PLAYER, garrisonSize, hasBuilding } from './holding'
import { siegeHolds, wallsBetter } from './sheet'
import type { GameState } from './state'
import { neighbourSettlements } from './world/queries'
import type { Location, World } from './world/types'

/**
 * Крепость как вещь (этап 85, О1).
 *
 * Стены до сих пор были числом: 2.1 с постройкой, 1.35 без. Крепость же — это
 * вода, запас, башни и донжон, и каждая из этих вещей решает своё: вода —
 * сколько крепость выдержит, запас — сколько выдержит после воды, башни —
 * сколько стоит приступ, донжон — считается ли взятой стена.
 *
 * Ничего из этого не хранится: всё выводится из места, построек и зерна хэша,
 * как купцы (этап 49) и королевские дома (этап 81). Одна и та же крепость в
 * одном и том же мире всегда одна и та же.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mix(hash: number): number {
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

export interface Fort {
  readonly locationId: string
  readonly name: string
  /** Настоящая ли это крепость: у открытого места стен нет, а есть только люди. */
  readonly walled: boolean
  /** Во сколько раз стены помогают обороне. */
  readonly walls: number
  /** Башни: с них бьют идущих на приступ. */
  readonly towers: number
  readonly water: WaterId
  /** Сколько суток в крепости есть вода. */
  readonly waterDays: number
  /** Сколько суток в крепости есть хлеб. */
  readonly storeDays: number
  readonly garrison: number
  /** Донжон: взяв стены, берут ещё не всё. */
  readonly keep: boolean
  readonly says: string
}

/**
 * Сколько ртов кормится за стенами.
 *
 * Осада кормит не гарнизон, а город: за воротами сидят все, кто в них успел, и
 * едят они прежде стрелков. Поэтому запас крепости — это запас места, делённый
 * на его жителей, а не на десяток копейщиков.
 */
export function mouthsOf(settlement: Settlement): number {
  const garrison = Math.max(4, garrisonSize(settlement))
  return Math.round(settlement.population + garrison * SIEGE.mouths)
}

/** На сколько суток хватит хлеба, если в ворота больше ничего не везут. */
export function storeDays(settlement: Settlement): number {
  const eats = mouthsOf(settlement) * SIEGE.perMan
  if (eats <= 0) return 0
  return Math.floor((settlement.stock.grain ?? 0) / eats)
}

export function fortOf(state: GameState, world: World, locationId: string): Fort | null {
  const settlement = state.settlements[locationId]
  const here = world.locations[locationId]
  if (!settlement || !here) return null
  const fort = fortFrom(settlement, here)
  // Инженерия — дело хозяина (этап 123, Н5): своя крепость у знающего человека
  // стоит крепче той же крепости у незнающего, а стойкость держит измор дольше.
  if (settlement.owner !== PLAYER) return fort
  return {
    ...fort,
    walls: Math.round(fort.walls * wallsBetter(state.character) * 100) / 100,
    storeDays: Math.round(fort.storeDays * siegeHolds(state.character)),
  }
}

/**
 * То же самое от места и построек.
 *
 * Дружинам (этап 29) состояние игрока недоступно: они ходят по своему срезу
 * мира. Крепость считается из того, что у них есть, — и выходит той же самой.
 */
export function fortFrom(settlement: Settlement, here: Location): Fort {
  const locationId = settlement.locationId
  const seed = mix(hashOf(`fort:${locationId}`))
  const kind = here.archetype
  // Стены — свойство места, а не постройки: крепость, столица и город стоят за
  // ними с первого дня мира, деревня не стоит за ними никогда.
  const stone = kind === 'fortress' || kind === 'capital' || kind === 'city' || kind === 'town'
  const walled = stone || hasBuilding(settlement, 'walls')
  const hilly = here.terrain === 'hills' || here.terrain === 'mountains'
  const height =
    kind === 'fortress'
      ? 2.4
      : kind === 'capital'
        ? 2.3
        : kind === 'city'
          ? 2.15
          : kind === 'town'
            ? 1.95
            : kind === 'monastery'
              ? 1.6
              : 1.35
  const walls =
    height +
    (hasBuilding(settlement, 'walls') && !stone ? 0.55 : 0) +
    (hilly ? 0.2 : 0) +
    ((seed >>> 3) % 3) * 0.05
  const towers = walled ? 2 + Math.min(4, Math.floor(settlement.population / 900)) : 0
  const water: WaterId = walled
    ? here.shore || here.terrain === 'marsh'
      ? 'river'
      : (seed >>> 7) % 3 === 0
        ? 'well'
        : 'cistern'
    : here.shore
      ? 'river'
      : 'none'
  const keep = walled && (seed >>> 11) % 2 === 0
  const days = storeDays(settlement)
  const waterDays = WATER_DEFS[water].days
  return {
    locationId,
    name: here.name,
    walled,
    walls: Math.round(walls * 100) / 100,
    towers,
    water,
    waterDays,
    storeDays: days,
    garrison: Math.max(0, garrisonSize(settlement)),
    keep,
    says:
      waterDays < 14 && days < 14
        ? SIEGE_WORDS.doomed
        : waterDays < days
          ? SIEGE_WORDS.thirst
          : days < 40
            ? SIEGE_WORDS.hunger
            : SIEGE_WORDS.holds,
  }
}

/**
 * Сколько суток крепость продержится: вода, хлеб и донжон вместе.
 *
 * Открытое место не держит осады вовсе: у него нет ни ворот, чтобы их запереть,
 * ни запаса под замком. Такое берут не измором, а тем, что под стенами больше
 * людей, — и берут быстро.
 */
export function holdOut(fort: Fort): number {
  if (!fort.walled) return Math.max(1, Math.min(SIEGE.openDays, fort.storeDays))
  const bare = Math.min(fort.waterDays, Math.max(1, fort.storeDays))
  return bare + (fort.keep ? SIEGE.keepDays : 0)
}

// --- инженеры (О2) ----------------------------------------------------------

export function engineDef(engine: EngineId) {
  return ENGINE_DEFS[engine]
}

/** Сколько суток строить машину такими руками. */
export function engineDays(engine: EngineId, men: number, craft: number): number {
  const def = ENGINE_DEFS[engine]
  if (men < def.men) return 0
  // Лишние руки ускоряют работу, но не отменяют её: вдвое быстрее — предел.
  const hands = Math.min(2, Math.sqrt(men / def.men))
  const skill = 1 + Math.min(0.5, craft / 200)
  return Math.max(1, Math.round(def.days / (hands * skill)))
}

export function enginePrice(engine: EngineId): number {
  return ENGINE_DEFS[engine].silver
}

/** Какие машины ещё можно построить под этими стенами. */
export function enginesLeft(built: readonly EngineId[], fort: Fort): readonly EngineId[] {
  const out: EngineId[] = []
  for (const engine of Object.keys(ENGINE_DEFS) as EngineId[]) {
    if (built.includes(engine)) continue
    // Башню не подводят к крепости на круче: её некуда катить.
    if (engine === 'tower' && fort.walls >= 2.5) continue
    out.push(engine)
  }
  return out
}

/** Во сколько раз стены помогают обороне с учётом машин и пролома. */
export function wallsAfterWorks(fort: Fort, built: readonly EngineId[], breached: boolean): number {
  let relief = breached ? 0.7 : 0
  for (const engine of built) relief = Math.min(0.92, relief + ENGINE_DEFS[engine].relief)
  return Math.max(1, fort.walls - (fort.walls - 1) * relief)
}

// --- голод, жажда и переговоры (О3) ----------------------------------------

/** Ждать ли гарнизону выручки: свои недалеко и в силе. */
export function reliefHope(state: GameState, world: World, fort: Fort): number {
  const settlement = state.settlements[fort.locationId]
  const owner = settlement?.owner
  if (!owner) return 0
  const near = neighbourSettlements(world, fort.locationId, SIEGE.reliefReach)
  const ids = new Map(near.map((one) => [one.id, one.hops]))
  let best = 0
  for (const band of state.bands) {
    if (band.lordId === PLAYER) continue
    if (band.lordId !== owner && band.kingdomId !== sideOf(state, owner)) continue
    const hops = band.locationId === fort.locationId ? 0 : ids.get(band.locationId)
    if (hops === undefined) continue
    const size = Math.min(1, bandSize(band) / 60)
    best = Math.max(best, size * (1 - hops / (SIEGE.reliefReach + 1)))
  }
  return Math.round(best * 100) / 100
}

function sideOf(state: GameState, owner: string): string | null {
  if (owner.startsWith('crown:')) return owner.slice('crown:'.length)
  return state.politics.lords.find((lord) => lord.id === owner)?.kingdomId ?? null
}

/** Насколько гарнизону уже нечем держаться: 0 — держится, 1 — всё кончилось. */
export function distress(fort: Fort, days: number): number {
  const water = Math.min(1, days / Math.max(1, fort.waterDays))
  const bread = Math.min(1, days / Math.max(1, fort.storeDays))
  return Math.round(Math.max(water, bread) * 100) / 100
}

export interface Offer {
  readonly term: TermId
  readonly label: string
  /** Примут ли: 0..1. */
  readonly chance: number
  /** Серебро: положительное — тебе, отрицательное — с тебя. */
  readonly silver: number
  readonly says: string
}

/**
 * Что гарнизон готов слушать (О3).
 *
 * Переговоры под стенами — это та же дипломатия: считают не храбрость, а
 * положение. Жажда и голод толкают к воротам, надежда на выручку — обратно, и
 * условия разнятся ценой: свободный выход принимают охотно и дёшево, милость —
 * только когда терять уже нечего.
 */
export function offersFor(
  state: GameState,
  world: World,
  fort: Fort,
  days: number,
  breached: boolean,
): readonly Offer[] {
  const hurt = distress(fort, days)
  const hope = reliefHope(state, world, fort)
  const settlement = state.settlements[fort.locationId]
  const worth = Math.round((settlement?.population ?? 0) * 0.9 + fort.garrison * 40)
  const out: Offer[] = []
  for (const term of Object.keys(TERM_DEFS) as TermId[]) {
    const def = TERM_DEFS[term]
    const base = hurt * 0.85 + (breached ? 0.2 : 0) + def.ease - hope * 0.55
    const chance = Math.max(0, Math.min(0.95, base))
    const silver = term === 'ransom' ? -Math.round(worth * 0.35) : 0
    out.push({
      term,
      label: def.label,
      chance: Math.round(chance * 100) / 100,
      silver,
      says: hope > 0.3 ? SIEGE_WORDS.relief : SIEGE_WORDS.alone,
    })
  }
  return out.sort((a, b) => b.chance - a.chance)
}

// --- штурм (О4) -------------------------------------------------------------

export interface Storm {
  /** Настоящая ли это крепость: у открытого места стен нет, а есть только люди. */
  readonly walled: boolean
  /** Во сколько раз стены помогают обороне. */
  readonly walls: number
  /** Какую долю людей кладут на подходе, ещё до боя. */
  readonly losses: number
  readonly says: string
}

/**
 * Чего стоит приступ (О4).
 *
 * Считается прежде боя: на подходе стреляют с башен, и чем их больше, тем
 * дороже лестницы. Осадная башня и порок эту цену сбивают — за то их и строят.
 */
export function stormCost(fort: Fort, built: readonly EngineId[], breached: boolean): Storm {
  let cover = 0
  for (const engine of built) cover = Math.min(0.8, cover + ENGINE_DEFS[engine].cover)
  const shot = fort.towers * SIEGE.towerBite * (1 - cover)
  const losses =
    Math.round(Math.max(0, (SIEGE.stormLoss + shot) * (breached ? 0.6 : 1)) * 100) / 100
  return {
    walled: fort.walled,
    walls: wallsAfterWorks(fort, built, breached),
    losses,
    says:
      fort.towers === 0
        ? 'Башен нет: на стену идут без потерь на подходе.'
        : `С ${fort.towers} башен бьют по идущим: ${Math.round(losses * 100)} из ста не дойдут.`,
  }
}

export { type EngineId, type TermId, type WaterId, SIEGE, TERM_DEFS, WATER_DEFS }
