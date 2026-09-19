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
import type { LocationArchetype, World } from './world/types'
import { isSettlement } from './world/types'

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
   * Каков вышел год, 0..1.2: доля от обычного урожая.
   *
   * Год на год не приходится, и это единственное, что в сытом мире способно
   * довести до голода. Пока урожай был всегда одинаков, мир с запасом еды не
   * знал голода вовсе: за век — ни одного голодного случая, а с ним ни разбоя,
   * ни запустевших мест. Катится год раз в году и на всю провинцию сразу:
   * недород — беда области, а не отдельной деревни, и отвечает на неё вся
   * округа своим подвозом.
   */
  readonly harvest: number
  /**
   * Ворота закрыты: мор внутри не выходит наружу, торговля стоит. Снимается
   * сам, когда мор отступил. Единственное, что игрок может противопоставить
   * мору кроме лекаря, — и то лишь на своей земле.
   */
  readonly quarantined: boolean
  /**
   * На сколько суток place держит хлеб (этап 37).
   *
   * Не у всех амбар одинаков. Хлебная деревня хранит от жатвы до жатвы — иначе
   * зимой ей нечего есть. Рудник не хранит: у него нет ни амбара, ни своего
   * хлеба, есть телега раз в неделю, и потому подвоз для него — вопрос жизни, а
   * разбой на дороге — смерть. Пока норма была общей, разбой перестал что-либо
   * значить: рудник сидел на стодневном запасе и не замечал ни войны, ни зимы.
   */
  readonly storeDays?: number
}

/** Какая доля населения вообще способна взять оружие и уйти с чужаком. */
export const RECRUIT_SHARE = 0.02
/** Какую долю от предела рекруты восполняют за сутки. */
export const RECRUIT_RECOVERY = 0.02

export function recruitPool(population: number): number {
  return Math.floor(population * RECRUIT_SHARE)
}

/**
 * Что даёт само море.
 *
 * Множитель работает в обе стороны: на берегу этого вдвое больше обычного, а
 * дальше от воды — вдвое меньше. Оттого рыба у моря дёшева, а в горах дорога, и
 * возить её есть смысл.
 */
const SEA_SUPPLY: Partial<Record<GoodId, number>> = { fish: 2, salt: 1.5 }

/** Во сколько раз место обеспечено товаром сверх собственной нужды. */
export function supplyRatio(world: World, locationId: string, good: GoodId): number {
  return supplyRatiosOf(world, locationId)[good]
}

/**
 * Множители по всем товарам разом (этап 48): считаются один раз на мир и
 * место — они свойство скелета, — а спрашивают их каждые сутки по каждому
 * месту и товару. Одно обращение на место, а не тринадцать.
 */
export function supplyRatiosOf(world: World, locationId: string): Readonly<Record<GoodId, number>> {
  let memo = supplies.get(world)
  if (!memo) {
    memo = new Map()
    supplies.set(world, memo)
  }
  const known = memo.get(locationId)
  if (known) return known
  const ratios = {} as Record<GoodId, number>
  for (const good of GOOD_IDS) ratios[good] = rawSupplyRatio(world, locationId, good)
  memo.set(locationId, ratios)
  return ratios
}

const supplies = new WeakMap<World, Map<string, Readonly<Record<GoodId, number>>>>()

function rawSupplyRatio(world: World, locationId: string, good: GoodId): number {
  const location = world.locations[locationId]
  // У места без жителей нет ни своего производства, ни своей нужды: там просто
  // земля. Цены в нём никто не спрашивает, но вызвать эту функцию могут.
  if (!location || !isSettlement(location.archetype)) return 1
  const byArchetype = ARCHETYPE_SUPPLY[location.archetype][good] ?? 1
  const byTerrain = TERRAIN_SUPPLY[location.terrain][good] ?? 1
  const fertility = world.provinces[location.provinceId]?.fertility ?? 0.5
  // Плодородие провинции влияет только на то, что растёт из земли.
  const byFertility = GOODS[good].food ? 0.5 + fertility : 1
  // И море — на то, что берут из воды (этап 36). Не по названию местности, а по
  // тому, есть ли вода в получасе ходьбы: рыба на берегу своя, а в двух днях от
  // него — привозная и солёная.
  const bySea = SEA_SUPPLY[good] ? (location.shore ? SEA_SUPPLY[good] : 1 / SEA_SUPPLY[good]) : 1
  return byArchetype * byTerrain * byFertility * bySea
}

/**
 * Сколько товара месту нужно для собственной жизни.
 * Это и есть спрос: от него считается цена.
 */
export function localNeed(good: GoodId, population: number): number {
  // Еду меряют не суточной нуждой, а тем запасом, которым живут: с версии 0.5
  // год делится на времена, хлеб берут от жатвы до жатвы, и «нужда» в зерне —
  // это годовой запас, а не дневная миска. Пока мерой оставалась миска, полный
  // амбар выглядел стократным избытком, и зерно во всём мире стоило по единице:
  // возить его было незачем, а половина торговли — это хлеб.
  if (GOODS[good].food) {
    return Math.max(1, Math.round(population * FOOD_PER_PERSON * FOOD_NORM_DAYS))
  }
  return Math.max(1, Math.round(DEMAND_PER_CAPITA[good] * population))
}

/**
 * Общая мера запаса еды: сколько суток держит место, живущее своим хлебом.
 *
 * Одна на весь мир нарочно — это линейка, по которой сравниваются места. То,
 * сколько держит именно это место, лежит в нём самом (`storeDays`), и разница
 * между линейкой и собственным амбаром и есть цена: у рудника хлеба на сорок
 * пять суток против сотни — он и стоит вдвое.
 */
export const FOOD_NORM_DAYS = 100

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
/**
 * Сколько еды съедает человек за сутки и на сколько суток её держат к началу
 * игры.
 *
 * Живут эти два числа здесь, а не в `life.ts`, только из-за направления
 * зависимостей: жизнь знает про хозяйство, хозяйство про жизнь — нет. Смысл у
 * них жизненный: паёк и то, с чем мир просыпается в первый день весны.
 *
 * Сто пятнадцать суток — не щедрость, а равновесие: с версии 0.5 год делится на
 * времена (этап 37), зимой земля не родит, и запас на первый день весны ровно
 * такой, каким он выходит у мира, прожившего год. Пока еды клали «сколько нужно
 * месту», мир начинал игру с шестнадцатью сутками хлеба и хоронил двадцать
 * четыре тысячи человек в первую же весну.
 */
export const FOOD_PER_PERSON = 0.05
export const START_FOOD_DAYS = 115

export function initialStock(
  world: World,
  locationId: string,
  population: number,
): Record<GoodId, number> {
  const stock = {} as Record<GoodId, number>
  for (const good of GOOD_IDS) stock[good] = targetStock(world, locationId, good, population)
  // Еды — на весну: столько, сколько держал бы тот, кто уже пережил зиму.
  const winter = population * FOOD_PER_PERSON * START_FOOD_DAYS
  const have = stock.grain + stock.fish
  if (have < winter) stock.grain = Math.round(stock.grain + (winter - have))
  return stock
}

/**
 * Сколько суток хлеба держит место такого рода.
 *
 * Деревня, городок, город и столица живут от жатвы до жатвы — у них поля и
 * амбары. Крепость запасает на осаду. Обитель живёт своим огородом и подаянием.
 * Порт кормится морем и привозом — ему незачем хранить год. А рудник не хранит
 * вовсе: он ест с телеги.
 */
export const STORE_DAYS: Record<LocationArchetype, number> = {
  village: 110,
  town: 110,
  // Житница (этап 57, Е2): город и столица держат запас на зиму и весну, а не
  // на три месяца. Своего поля у них нет, и запас — единственное, что стоит
  // между весной и голодом.
  city: 130,
  capital: 140,
  port: 80,
  fortress: 120,
  monastery: 90,
  mine: 45,
}

export function createSettlement(world: World, locationId: string): Settlement {
  const location = world.locations[locationId]
  const population = location?.population ?? 0
  return {
    locationId,
    population,
    ...(location && isSettlement(location.archetype)
      ? { storeDays: STORE_DAYS[location.archetype] }
      : {}),
    stock: initialStock(world, locationId, population),
    recruits: recruitPool(population),
    banditry: 0,
    owner: null,
    buildings: [],
    building: null,
    garrison: {},
    strain: 0,
    harvest: 1,
    quarantined: false,
  }
}

/** Все поселения мира на момент начала игры. */
export function createSettlements(world: World): Record<string, Settlement> {
  const settlements: Record<string, Settlement> = {}
  for (const [locationId, location] of Object.entries(world.locations)) {
    // Перевал — не поселение с нулём жителей, а место, где людей не бывает.
    // Поэтому у него нет ни запасов, ни хозяина, ни строки в `settlements`.
    if (!isSettlement(location.archetype)) continue
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
