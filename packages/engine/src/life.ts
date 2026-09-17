import type { GoodId } from './content/goods'
import { GOOD_IDS } from './content/goods'
import type { Settlement } from './economy'
import { targetStock } from './economy'
import type { LocationArchetype, Terrain, World } from './world/types'

/**
 * Жизнь поселений: еда, голод, рост и вымирание (DESIGN.md, п.7).
 *
 * Считается сутками и только числами: сколько земля дала, сколько людей съело,
 * сколько осталось. Голод здесь не надпись, а следствие — сперва пустеют
 * амбары, потом растут цены, потом умирают и уходят люди, и только после этого
 * деревня исчезает с карты.
 */

export interface LifeConfig {
  /** Сколько еды съедает один человек за сутки. */
  readonly foodPerPerson: number
  /** Сколько еды даёт земля средней провинции за сутки. */
  readonly landFood: number
  /** На сколько суток поселение старается держать запас еды. */
  readonly daysOfStock: number
  /**
   * Какую долю излишка отдают нуждающимся за сутки — на четырёх кругах.
   * Чем дальше везти, тем меньше доходит: соседняя деревня делится охотно,
   * другое королевство — по чуть-чуть и за деньги.
   */
  readonly provinceTransfer: number
  readonly regionTransfer: number
  readonly kingdomTransfer: number
  readonly worldTransfer: number
  /** Доля населения, умирающая за сутки полного голода. */
  readonly starvationDeaths: number
  /** Доля населения, уходящая за сутки полного голода. */
  readonly starvationMigration: number
  /** Суточный прирост сытого поселения. */
  readonly growth: number
  /** Ниже этого числа жителей место считается брошенным. */
  readonly abandonAt: number
  /** Скорость возврата прочих товаров к норме. */
  readonly goodsRecovery: number
}

export const LIFE: LifeConfig = {
  foodPerPerson: 0.05,
  landFood: 30,
  daysOfStock: 10,
  provinceTransfer: 0.3,
  regionTransfer: 0.15,
  kingdomTransfer: 0.08,
  worldTransfer: 0.03,
  starvationDeaths: 0.008,
  starvationMigration: 0.015,
  growth: 0.0002,
  abandonAt: 15,
  goodsRecovery: 0.08,
}

/**
 * Сколько людей кормит земля, принадлежащая месту.
 *
 * Земля считается не «полем под стеной», а всей округой, которая на это место
 * работает: у деревни это её поля, у столицы — округа на день пути. Крупное
 * место потому и выросло, что под ним больше земли, — но выросло оно всё равно
 * сильнее, чем земля может прокормить, и разницу довозят соседи. В этом и
 * состоит хрупкость городов: перекрой подвоз, и начнётся голод.
 */
export const LAND_CAPACITY: Record<LocationArchetype, number> = {
  village: 700,
  town: 3500,
  city: 9000,
  capital: 22000,
  port: 7000,
  mine: 250,
  fortress: 300,
  monastery: 200,
}

/** Что земля родит: на равнине много, в горах почти ничего. */
export const TERRAIN_FOOD: Record<Terrain, number> = {
  plains: 1.2,
  forest: 0.9,
  hills: 0.85,
  mountains: 0.5,
  marsh: 0.7,
  coast: 1.1,
  steppe: 0.9,
}

/**
 * Сколько человек эта земля способна прокормить.
 * Город всегда больше своего предела — он живёт привозом, и в этом его слабость.
 */
export function landCapacityOf(
  archetype: LocationArchetype,
  terrain: Terrain,
  fertility: number,
): number {
  return Math.round(LAND_CAPACITY[archetype] * (0.6 + fertility * 0.8) * TERRAIN_FOOD[terrain])
}

export function carryingCapacity(
  world: World,
  locationId: string,
  _config: LifeConfig = LIFE,
): number {
  const location = world.locations[locationId]
  if (!location) return 0
  const fertility = world.provinces[location.provinceId]?.fertility ?? 0.5
  return landCapacityOf(location.archetype, location.terrain, fertility)
}

/** Сколько еды место производит за сутки. */
export function foodCapacity(world: World, locationId: string, config: LifeConfig = LIFE): number {
  return carryingCapacity(world, locationId, config) * config.foodPerPerson
}

export function foodStock(settlement: Settlement): number {
  return settlement.stock.grain + settlement.stock.fish
}

/** Насколько место обеспечено едой: 1 — полный амбар, 0 — пусто. */
export function foodSecurity(settlement: Settlement, config: LifeConfig = LIFE): number {
  const wanted = settlement.population * config.foodPerPerson * config.daysOfStock
  if (wanted <= 0) return 1
  return Math.min(1, foodStock(settlement) / wanted)
}

export type LifeEvent =
  | { readonly type: 'famine'; readonly locationId: string; readonly deaths: number }
  | { readonly type: 'abandoned'; readonly locationId: string }

export interface LifeResult {
  readonly settlements: Readonly<Record<string, Settlement>>
  readonly events: readonly LifeEvent[]
}

/** Сутки мира: производство, еда, обмен с соседями, голод и рост. */
export function tickDays(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  days: number,
  config: LifeConfig = LIFE,
): LifeResult {
  if (days <= 0) return { settlements, events: [] }
  const byProvince = groupByProvince(world, settlements)
  const byRegion = groupByRegion(world, settlements)
  const byKingdom = groupByKingdom(world, settlements)
  const everywhere = [Object.keys(settlements)]

  let current: Record<string, Settlement> = { ...settlements }
  const events: LifeEvent[] = []

  for (let day = 0; day < days; day += 1) {
    current = produceAndEat(world, current, config, events)
    current = share(world, current, byProvince, config.provinceTransfer, config)
    current = share(world, current, byRegion, config.regionTransfer, config)
    current = share(world, current, byKingdom, config.kingdomTransfer, config)
    // Дальняя хлебная торговля: горное королевство кормится равнинным.
    current = share(world, current, everywhere, config.worldTransfer, config)
  }
  return { settlements: current, events: mergeEvents(events) }
}

// --- сутки ------------------------------------------------------------------

function produceAndEat(
  world: World,
  settlements: Record<string, Settlement>,
  config: LifeConfig,
  events: LifeEvent[],
): Record<string, Settlement> {
  const next: Record<string, Settlement> = {}
  const arrivals: Record<string, number> = {}

  for (const [id, settlement] of Object.entries(settlements)) {
    if (settlement.population <= 0) {
      next[id] = settlement
      continue
    }

    const stock = { ...settlement.stock }
    // Что даёт земля.
    const produced = foodCapacity(world, id, config)
    const location = world.locations[id]
    const seaside = location?.terrain === 'coast' || location?.terrain === 'marsh'
    if (seaside) {
      stock.fish += produced * 0.6
      stock.grain += produced * 0.4
    } else {
      stock.grain += produced
    }

    // Что съедают люди: сперва рыбу, она не ждёт.
    const needed = settlement.population * config.foodPerPerson
    const fromFish = Math.min(stock.fish, needed)
    stock.fish -= fromFish
    const fromGrain = Math.min(stock.grain, needed - fromFish)
    stock.grain -= fromGrain
    const shortfall = needed - fromFish - fromGrain
    const hunger = needed > 0 ? shortfall / needed : 0

    // Прочие товары потихоньку возвращаются к обычному для места уровню.
    for (const good of GOOD_IDS) {
      if (good === 'grain' || good === 'fish') continue
      const target = targetStock(world, id, good, settlement.population)
      stock[good] = stock[good] + (target - stock[good]) * config.goodsRecovery
    }

    let population = settlement.population
    if (hunger > 0) {
      const deaths = Math.round(population * config.starvationDeaths * hunger)
      const leaving = Math.round(population * config.starvationMigration * hunger)
      population = Math.max(0, population - deaths - leaving)
      if (deaths > 0) events.push({ type: 'famine', locationId: id, deaths })
      if (leaving > 0) {
        const refuge = bestFedNeighbour(world, settlements, id, config)
        if (refuge) arrivals[refuge] = (arrivals[refuge] ?? 0) + leaving
      }
    } else if (population < carryingCapacity(world, id, config)) {
      population += Math.max(1, Math.round(population * config.growth))
    }

    if (population > 0 && population < config.abandonAt) {
      events.push({ type: 'abandoned', locationId: id })
      population = 0
    }

    next[id] = { ...settlement, population, stock: clampStock(stock) }
  }

  // Беженцы приходят туда, где есть что есть.
  for (const [id, count] of Object.entries(arrivals)) {
    const settlement = next[id]
    if (!settlement) continue
    next[id] = { ...settlement, population: settlement.population + count }
  }
  return next
}

/**
 * Обмен с соседями: у кого излишек, тот делится с теми, кто в нужде.
 *
 * Это и есть «живой мир без игрока» из п.7: пока в провинции есть хлебная
 * деревня, её город переживёт неурожай. Когда деревни не станет — не переживёт.
 */
function share(
  world: World,
  settlements: Record<string, Settlement>,
  groups: readonly (readonly string[])[],
  rate: number,
  config: LifeConfig,
): Record<string, Settlement> {
  const next = { ...settlements }

  for (const group of groups) {
    const donors: { id: string; surplus: number }[] = []
    const receivers: { id: string; deficit: number }[] = []

    for (const id of group) {
      const settlement = next[id]
      if (!settlement || settlement.population <= 0) continue
      const wanted = settlement.population * config.foodPerPerson * config.daysOfStock
      const have = foodStock(settlement)
      if (have > wanted * 1.2) donors.push({ id, surplus: (have - wanted * 1.2) * rate })
      else if (have < wanted) receivers.push({ id, deficit: wanted - have })
    }
    if (donors.length === 0 || receivers.length === 0) continue

    const offered = donors.reduce((sum, donor) => sum + donor.surplus, 0)
    const wanted = receivers.reduce((sum, receiver) => sum + receiver.deficit, 0)
    const moved = Math.min(offered, wanted)
    if (moved <= 0) continue

    for (const donor of donors) {
      const settlement = next[donor.id]
      if (!settlement) continue
      const give = moved * (donor.surplus / offered)
      next[donor.id] = takeFood(settlement, give)
    }
    for (const receiver of receivers) {
      const settlement = next[receiver.id]
      if (!settlement) continue
      const get = moved * (receiver.deficit / wanted)
      next[receiver.id] = {
        ...settlement,
        stock: { ...settlement.stock, grain: settlement.stock.grain + get },
      }
    }
  }
  return next
}

function takeFood(settlement: Settlement, amount: number): Settlement {
  const fromGrain = Math.min(settlement.stock.grain, amount)
  const fromFish = Math.min(settlement.stock.fish, amount - fromGrain)
  return {
    ...settlement,
    stock: {
      ...settlement.stock,
      grain: settlement.stock.grain - fromGrain,
      fish: settlement.stock.fish - fromFish,
    },
  }
}

function bestFedNeighbour(
  world: World,
  settlements: Record<string, Settlement>,
  fromId: string,
  config: LifeConfig,
): string | null {
  const location = world.locations[fromId]
  const province = location ? world.provinces[location.provinceId] : undefined
  const region = province ? world.regions[province.regionId] : undefined
  const candidates = region
    ? region.provinceIds.flatMap((id) => world.provinces[id]?.locationIds ?? [])
    : []

  let best: string | null = null
  let bestSecurity = 0
  for (const id of candidates) {
    if (id === fromId) continue
    const settlement = settlements[id]
    if (!settlement || settlement.population <= 0) continue
    const security = foodSecurity(settlement, config)
    if (security > bestSecurity) {
      best = id
      bestSecurity = security
    }
  }
  return best
}

function clampStock(stock: Record<GoodId, number>): Record<GoodId, number> {
  const clean = {} as Record<GoodId, number>
  for (const good of GOOD_IDS) clean[good] = Math.max(0, Math.round(stock[good] * 10) / 10)
  return clean
}

function groupByProvince(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
): readonly (readonly string[])[] {
  return Object.values(world.provinces).map((province) =>
    province.locationIds.filter((id) => id in settlements),
  )
}

function groupByKingdom(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
): readonly (readonly string[])[] {
  return Object.values(world.kingdoms).map((kingdom) =>
    kingdom.regionIds
      .flatMap((regionId) => world.regions[regionId]?.provinceIds ?? [])
      .flatMap((provinceId) => world.provinces[provinceId]?.locationIds ?? [])
      .filter((id) => id in settlements),
  )
}

function groupByRegion(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
): readonly (readonly string[])[] {
  return Object.values(world.regions).map((region) =>
    region.provinceIds
      .flatMap((id) => world.provinces[id]?.locationIds ?? [])
      .filter((id) => id in settlements),
  )
}

/** Слить повторы: за тридцать суток голода незачем тридцать одинаковых строк. */
function mergeEvents(events: readonly LifeEvent[]): readonly LifeEvent[] {
  const famine = new Map<string, number>()
  const merged: LifeEvent[] = []
  for (const event of events) {
    if (event.type === 'famine') {
      famine.set(event.locationId, (famine.get(event.locationId) ?? 0) + event.deaths)
      continue
    }
    if (
      !merged.some((other) => other.type === event.type && other.locationId === event.locationId)
    ) {
      merged.push(event)
    }
  }
  for (const [locationId, deaths] of famine) merged.push({ type: 'famine', locationId, deaths })
  return merged
}
