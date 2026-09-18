import type { BuildingId } from './content/buildings'
import type { GoodId } from './content/goods'
import {
  ARCHETYPE_SUPPLY,
  DEMAND_PER_CAPITA,
  GOODS,
  GOOD_IDS,
  TERRAIN_SUPPLY,
} from './content/goods'
import type { TroopId } from './content/troops'
import type { World } from './world/types'

/**
 * Экономика места: сколько товара тут держат и почём он идёт.
 *
 * Цена берётся не из таблицы, а из соотношения «сколько есть» к «сколько нужно».
 * Поэтому зерно дёшево в равнинной деревне и кусается в руднике, а если скупить
 * весь запас, цена вырастет прямо под руками — на этом и держится ограничение
 * на бесконечную наживу.
 */

/** Живое состояние поселения: то, что меняется по ходу игры. */
export interface Settlement {
  readonly locationId: string
  /** Сколько народу живёт здесь сейчас. Скелет мира хранит лишь начальное число. */
  readonly population: number
  readonly stock: Readonly<Record<GoodId, number>>
  /** Сколько людей готово пойти в чужой отряд. Кончается и восстанавливается. */
  readonly recruits: number
  /** Разбой в округе, 0..1. Растёт от голода и разорения, душит подвоз. */
  readonly banditry: number
  /** Кто держит место: корона, лорд или сам игрок. */
  readonly owner: string | null
  /** Что здесь построено. */
  readonly buildings: readonly BuildingId[]
  /** Что строится сейчас и когда будет готово. */
  readonly building: { readonly id: BuildingId; readonly daysLeft: number } | null
  /** Кто стоит гарнизоном. */
  readonly garrison: Readonly<Partial<Record<TroopId, number>>>
  /**
   * Усталость земли, 0..1.
   *
   * Поле, с которого снимают каждый год без отдыха, родит всё хуже; брошенное
   * — отходит. Из-за этого предел населения перестаёт быть константой: мир,
   * упёршийся в потолок, сам себе его опускает, а потом земля отдыхает и
   * потолок возвращается. Без этого сто лет подряд население стояло прямой
   * линией между 214 и 248 тысячами.
   */
  readonly strain: number
  /**
   * Ворота закрыты: мор внутри не выходит наружу, торговля стоит. Снимается
   * сам, когда мор отступил. Единственное, что игрок может противопоставить
   * мору кроме лекаря, — и то лишь на своей земле.
   */
  readonly quarantined: boolean
}

/** Какая доля населения вообще способна взять оружие и уйти с чужаком. */
export const RECRUIT_SHARE = 0.02
/** Какую долю от предела рекруты восполняют за сутки. */
export const RECRUIT_RECOVERY = 0.02

export function recruitPool(population: number): number {
  return Math.floor(population * RECRUIT_SHARE)
}

/** Во сколько раз место обеспечено товаром сверх собственной нужды. */
export function supplyRatio(world: World, locationId: string, good: GoodId): number {
  const location = world.locations[locationId]
  if (!location) return 1
  const byArchetype = ARCHETYPE_SUPPLY[location.archetype][good] ?? 1
  const byTerrain = TERRAIN_SUPPLY[location.terrain][good] ?? 1
  const fertility = world.provinces[location.provinceId]?.fertility ?? 0.5
  // Плодородие провинции влияет только на то, что растёт из земли.
  const byFertility = GOODS[good].food ? 0.5 + fertility : 1
  return byArchetype * byTerrain * byFertility
}

/**
 * Сколько товара месту нужно для собственной жизни.
 * Это и есть спрос: от него считается цена.
 */
export function localNeed(good: GoodId, population: number): number {
  return Math.max(1, Math.round(DEMAND_PER_CAPITA[good] * population))
}

/**
 * Сколько товара место держит, когда всё спокойно.
 *
 * У производителя запас в разы больше собственной нужды — отсюда низкая цена;
 * у потребителя своего почти нет, и всё привозное стоит дорого.
 */
export function targetStock(
  world: World,
  locationId: string,
  good: GoodId,
  population: number,
): number {
  return Math.max(1, Math.round(localNeed(good, population) * supplyRatio(world, locationId, good)))
}

/** Запасы новорождённого поселения: ровно столько, сколько ему положено. */
export function initialStock(
  world: World,
  locationId: string,
  population: number,
): Record<GoodId, number> {
  const stock = {} as Record<GoodId, number>
  for (const good of GOOD_IDS) stock[good] = targetStock(world, locationId, good, population)
  return stock
}

export function createSettlement(world: World, locationId: string): Settlement {
  const population = world.locations[locationId]?.population ?? 0
  return {
    locationId,
    population,
    stock: initialStock(world, locationId, population),
    recruits: recruitPool(population),
    banditry: 0,
    owner: null,
    buildings: [],
    building: null,
    garrison: {},
    strain: 0,
    quarantined: false,
  }
}

/** Все поселения мира на момент начала игры. */
export function createSettlements(world: World): Record<string, Settlement> {
  const settlements: Record<string, Settlement> = {}
  for (const locationId of Object.keys(world.locations)) {
    settlements[locationId] = createSettlement(world, locationId)
  }
  return settlements
}

const PRICE_FLOOR = 0.35
const PRICE_CEILING = 3.5
/** Насколько резко цена отзывается на нехватку. Меньше — мягче. */
const PRICE_ELASTICITY = 0.55

/**
 * Цена товара в месте.
 *
 * Считается от нужды, а не от запаса: важно не «много ли лежит», а «много ли
 * лежит по сравнению с тем, сколько тут съедают». Поэтому в рудничном посёлке,
 * где зерна своего нет вовсе, оно дорого даже при полных амбарах, а в хлебной
 * деревне дёшево — и возить есть смысл.
 */
export function priceOf(world: World, settlement: Settlement, good: GoodId): number {
  const need = localNeed(good, settlement.population)
  const stock = Math.max(1, settlement.stock[good])
  const scarcity = (need / stock) ** PRICE_ELASTICITY
  const multiplier = Math.min(PRICE_CEILING, Math.max(PRICE_FLOOR, scarcity))
  return Math.max(1, Math.round(GOODS[good].basePrice * multiplier))
}

/**
 * Разница между «купить» и «продать» — заработок торговца, стоящего за прилавком.
 * Навык «Торговля» её сужает: с тобой начинают говорить как со своим.
 */
export function spreadFor(tradeSkill: number): number {
  return Math.max(0.05, 0.25 - tradeSkill * 0.004)
}

/** Почём место продаёт товар игроку. */
export function buyPrice(
  world: World,
  settlement: Settlement,
  good: GoodId,
  tradeSkill: number,
): number {
  return Math.max(1, Math.round(priceOf(world, settlement, good) * (1 + spreadFor(tradeSkill))))
}

/** Почём место покупает товар у игрока. */
export function sellPrice(
  world: World,
  settlement: Settlement,
  good: GoodId,
  tradeSkill: number,
): number {
  return Math.max(1, Math.round(priceOf(world, settlement, good) * (1 - spreadFor(tradeSkill))))
}

export function withStock(settlement: Settlement, good: GoodId, delta: number): Settlement {
  return {
    ...settlement,
    stock: { ...settlement.stock, [good]: Math.max(0, settlement.stock[good] + delta) },
  }
}

/** Доля разрыва между запасом и нормой, которую место закрывает за сутки. */
const DAILY_RECOVERY = 0.08

/**
 * Сутки жизни поселения.
 *
 * Пока это только возврат запасов к норме: место производит своё, довозит
 * чужое и постепенно приходит в равновесие. Настоящая цепочка «еда — население
 * — голод» встанет на это место в блоке L, но уже сейчас она даёт главное:
 * скупленный подчистую рынок восстанавливается не мгновенно.
 */
export function tickSettlement(world: World, settlement: Settlement, days: number): Settlement {
  if (days <= 0) return settlement
  const recovery = 1 - (1 - DAILY_RECOVERY) ** days
  const stock = { ...settlement.stock }
  for (const good of GOOD_IDS) {
    const target = targetStock(world, settlement.locationId, good, settlement.population)
    stock[good] = Math.round(stock[good] + (target - stock[good]) * recovery)
  }
  return { ...settlement, stock }
}

export interface Quote {
  /** Сколько единиц реально удалось бы взять или отдать. */
  readonly amount: number
  /** Итоговая сумма за всю партию. */
  readonly total: number
  /** Состояние рынка после сделки. */
  readonly settlement: Settlement
}

/**
 * Считаем сделку по единице за раз.
 *
 * Дорого по строчкам, зато честно: скупая рынок, ты сам поднимаешь себе цену, а
 * сбывая большую партию — сам её роняешь. Именно это не даёт возить один и тот
 * же мешок между двумя городами до бесконечности.
 */
export function quoteBuy(
  world: World,
  settlement: Settlement,
  good: GoodId,
  amount: number,
  tradeSkill: number,
): Quote {
  let market = settlement
  let total = 0
  let taken = 0
  for (let i = 0; i < amount; i += 1) {
    // Последнюю горсть место не отдаст: самим жить надо.
    if (market.stock[good] <= 1) break
    total += buyPrice(world, market, good, tradeSkill)
    market = withStock(market, good, -1)
    taken += 1
  }
  return { amount: taken, total, settlement: market }
}

export function quoteSell(
  world: World,
  settlement: Settlement,
  good: GoodId,
  amount: number,
  tradeSkill: number,
): Quote {
  let market = settlement
  let total = 0
  for (let i = 0; i < amount; i += 1) {
    total += sellPrice(world, market, good, tradeSkill)
    market = withStock(market, good, 1)
  }
  return { amount, total, settlement: market }
}
