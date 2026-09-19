import type { GoodId } from './content/goods'
import { GOODS } from './content/goods'
import type { MerchantTemper, RowDef } from './content/merchants'
import {
  MERCHANT_BYNAMES,
  MERCHANT_NAMES,
  MERCHANT_TEMPERS,
  MERCHANT_TEMPER_IDS,
  ORDER_LINES,
  ROWS,
} from './content/merchants'
import type { Settlement } from './economy'
import { buyPrice, priceOf, sellPrice } from './economy'
import type { GameState } from './state'
import { neighbourSettlements } from './world/queries'
import type { World } from './world/types'

/**
 * Купцы (этап 49).
 *
 * Рынок 0.5 был таблицей: место, товар, цена. Цена бралась из запаса места, и
 * торговать можно было с воздухом. Теперь за прилавком стоит человек: у него
 * имя, ряд, нрав, своя надбавка и своя память о тебе.
 *
 * Купцы, как школы (этап 40) и ярмарки (этап 39), не лежат в состоянии: они
 * выводятся из места и недели. В сейв идёт только то, что и должно меняться, —
 * память купца о том, как с тобой торговалось (`GameState.dealings`).
 */
export interface Merchant {
  readonly id: string
  readonly name: string
  readonly locationId: string
  readonly temper: MerchantTemper
  readonly rowId: string
  /** Чем торгует: товары своего ряда, какие есть в этом месте. */
  readonly goods: readonly GoodId[]
  /** Своя надбавка к цене места: у одного дороже, у другого дешевле. */
  readonly markup: number
}

/** Память купца о тебе. Всё, что от рынка уходит в сейв. */
export interface Dealing {
  /** Как он к тебе относится, −100..100: торговали честно — выше, обманул — ниже. */
  readonly standing: number
  /** Сколько раз с ним торговали. */
  readonly deals: number
  /** В какой день с ним в последний раз торговались словом: торг раз в день. */
  readonly haggledDay?: number
  /** Уступка, вытороженная сегодня: долей цены, до конца дня. */
  readonly cut?: number
}

export const NO_DEALING: Dealing = { standing: 0, deals: 0 }

/** С какого населения на рынке стоят купцы, а не просто «место торгует». */
export const MERCHANT_POPULATION = 900

/** Насколько купец помнит: за сколько дней его память об обиде стирается наполовину. */
export const MEMORY_DAYS = 180

/** Сколько купцов на рынке: от двух в городке до пяти в столице. */
function merchantCount(population: number): number {
  if (population >= 12000) return 5
  if (population >= 5000) return 4
  if (population >= 2000) return 3
  return 2
}

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * Ряды этого места: что здесь вообще есть.
 *
 * В деревне торгуют с воза, в городке есть хлебный и суконный ряд, в столице —
 * все пять. Ряд — не украшение: купец стоит в своём ряду и торгует тем, чем
 * ряд торгует (этап 49, Р5).
 */
export function rowsAt(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  locationId: string,
): readonly RowDef[] {
  const place = world.locations[locationId]
  if (!place) return []
  const population = settlements[locationId]?.population ?? place.population
  if (population < MERCHANT_POPULATION) return []
  return ROWS.filter((row) => population >= row.minPopulation)
}

/**
 * Кто сегодня за прилавком.
 *
 * Купцы меняются не каждый день: торговый человек сидит в своём ряду годами.
 * Поэтому набор выводится из места, а не из дня; меняет его только то, что
 * меняет само место, — люди и ряды.
 */
export function merchantsAt(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  locationId: string,
): readonly Merchant[] {
  const rows = rowsAt(world, settlements, locationId)
  if (rows.length === 0) return []
  const population = settlements[locationId]?.population ?? 0
  const count = Math.min(merchantCount(population), rows.length + 1)
  const base = hashOf(locationId)
  const out: Merchant[] = []
  for (let index = 0; index < count; index += 1) {
    const hash = hashOf(`${locationId}|${index}`)
    // Первые купцы разбирают ряды по одному, лишний встаёт во второй ряд:
    // в хлебном ряду тесно всегда.
    const row = rows[index % rows.length] as RowDef
    const name = MERCHANT_NAMES[(hash >>> 3) % MERCHANT_NAMES.length] ?? 'Купец'
    // Прозвище считается своим хешем: от сдвигов одного и того же числа на
    // рынке выходило четверо Рыжих подряд.
    const byname =
      MERCHANT_BYNAMES[hashOf(`${locationId}|${index}|прозвище`) % MERCHANT_BYNAMES.length] ?? ''
    const temper =
      MERCHANT_TEMPER_IDS[(base + hash) % MERCHANT_TEMPER_IDS.length] ?? ('shrewd' as const)
    const goods = row.goods.filter((good) => GOODS[good] !== undefined)
    out.push({
      id: `merchant:${locationId}:${index}`,
      name: `${name} ${byname}`.trim(),
      locationId,
      temper,
      rowId: row.id,
      goods,
      // Своя надбавка: нрав плюс небольшой разброс, чтобы два прижимистых на
      // одном рынке не стояли с одной ценой.
      markup:
        Math.round((MERCHANT_TEMPERS[temper].markup + (((hash >>> 17) % 9) - 4) / 100) * 100) / 100,
    })
  }
  return out
}

export function merchantById(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  locationId: string,
  merchantId: string,
): Merchant | null {
  return merchantsAt(world, settlements, locationId).find((one) => one.id === merchantId) ?? null
}

/** Кто здесь торгует этим товаром. */
export function merchantFor(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  locationId: string,
  good: GoodId,
): Merchant | null {
  return merchantsAt(world, settlements, locationId).find((one) => one.goods.includes(good)) ?? null
}

/** Что купец о тебе помнит. */
export function dealingWith(state: Pick<GameState, 'dealings'>, merchantId: string): Dealing {
  return state.dealings?.[merchantId] ?? NO_DEALING
}

/**
 * Насколько расположение купца двигает цену.
 *
 * Своему уступают, обманщику мстят ценой. Десять процентов в обе стороны — это
 * заметно в кошельке и не ломает торговлю: обманувший всех не разорится, но
 * будет покупать дороже всех.
 */
export function standingFactor(standing: number, temper: MerchantTemper): number {
  const memory = MERCHANT_TEMPERS[temper].memory
  return 1 - (standing / 100) * 0.1 * memory
}

/** Почём этот купец продаёт: цена места, его надбавка и его память о тебе. */
export function merchantBuyPrice(
  world: World,
  settlement: Settlement,
  merchant: Merchant,
  good: GoodId,
  tradeSkill: number,
  standing: number,
  cut = 0,
): number {
  const base = buyPrice(world, settlement, good, tradeSkill)
  const price = base * merchant.markup * standingFactor(standing, merchant.temper) * (1 - cut)
  return Math.max(1, Math.round(price))
}

/** И почём берёт. Уступка на торге работает и здесь: она про разговор, а не про сторону. */
export function merchantSellPrice(
  world: World,
  settlement: Settlement,
  merchant: Merchant,
  good: GoodId,
  tradeSkill: number,
  standing: number,
  cut = 0,
): number {
  const base = sellPrice(world, settlement, good, tradeSkill)
  const price =
    (base / merchant.markup) * (2 - standingFactor(standing, merchant.temper)) * (1 + cut)
  return Math.max(1, Math.round(price))
}

/**
 * Торг словом (этап 49, Р2).
 *
 * Не бросок кубика, а разговор: против тебя нрав купца и его память, за тебя —
 * умение торговать и то, сколько вы уже наторговали. Уступит — цена ниже до
 * конца дня; упрётся — останется своя; перегнёшь — обидится, и это он
 * запомнит.
 */
export type HaggleOutcome = 'cut' | 'hold' | 'offend'

export interface HaggleResult {
  readonly outcome: HaggleOutcome
  /** На сколько уступил, долей цены. */
  readonly cut: number
  /** Как это сказалось на его памяти. */
  readonly standing: number
  readonly says: string
}

/**
 * Насколько нагло торгуются: мягко, обычно, нахально. Чем наглее, тем больше
 * уступка и тем вернее обида.
 */
export type HagglePush = 'soft' | 'firm' | 'bold'

const PUSH: Record<HagglePush, { readonly want: number; readonly risk: number }> = {
  soft: { want: 0.05, risk: 0 },
  firm: { want: 0.12, risk: 0.12 },
  bold: { want: 0.22, risk: 0.35 },
}

export function haggle(
  merchant: Merchant,
  tradeSkill: number,
  standing: number,
  push: HagglePush,
  roll: number,
): HaggleResult {
  const temper = MERCHANT_TEMPERS[merchant.temper]
  const want = PUSH[push].want
  // Умение торговать — половина дела, расположение — четверть, нрав — остальное.
  // Новичок сбивает цену у покладистого купца примерно в трети заходов, у
  // упрямого — в пятой части; мастер торга — чаще, чем нет.
  const chance =
    0.4 + Math.min(0.4, tradeSkill * 0.012) + (standing / 100) * 0.25 - temper.hold * 0.25
  const offendChance = PUSH[push].risk * temper.hold * (1 - Math.max(0, standing) / 150)
  if (roll > 1 - offendChance) {
    return {
      outcome: 'offend',
      cut: 0,
      standing: -8 * temper.memory,
      says: pick(temper.offended, roll),
    }
  }
  if (roll < chance) {
    return {
      outcome: 'cut',
      // Уступают не всё, что просишь: сколько просил, помноженное на удачу.
      cut: Math.round(want * (0.6 + roll) * 100) / 100,
      standing: 1,
      says: pick(temper.yields, roll),
    }
  }
  return { outcome: 'hold', cut: 0, standing: 0, says: pick(temper.holds, roll) }
}

function pick(lines: readonly string[], roll: number): string {
  if (lines.length === 0) return ''
  return lines[Math.floor(roll * lines.length) % lines.length] as string
}

/**
 * Заказ купца (этап 49, Р3).
 *
 * Купец просит привезти то, чего ему не хватает, и платит задаток вперёд.
 * Заказ выводится из его ряда и из запаса места: просят то, чего мало. Как и
 * поручения (этап 6), заказ не хранится, пока не взят.
 */
export interface MerchantOrder {
  readonly merchantId: string
  readonly locationId: string
  readonly good: GoodId
  readonly amount: number
  /** Сколько заплатит по сдаче, сверх задатка. */
  readonly reward: number
  /** Сколько даёт вперёд. */
  readonly advance: number
  readonly days: number
  readonly says: string
}

/** Задаток — треть цены: купец рискует, но не разоряется. */
export const ADVANCE_SHARE = 1 / 3

export function orderFrom(
  world: World,
  settlement: Settlement,
  merchant: Merchant,
  day: number,
): MerchantOrder | null {
  // Просит то, чего у места меньше всего против нормы, — и только из своего ряда.
  let wanted: GoodId | null = null
  let worst = Number.POSITIVE_INFINITY
  for (const good of merchant.goods) {
    const share = settlement.stock[good] / Math.max(1, targetOf(world, settlement, good))
    if (share < worst) {
      worst = share
      wanted = good
    }
  }
  if (!wanted || worst > 0.85) return null
  const hash = hashOf(`${merchant.id}|${Math.floor(day / 30)}`)
  const amount = 10 + (hash % 20)
  const price = priceOf(world, settlement, wanted)
  // Платит выше рынка: за то и просит, что самому ехать некогда.
  const total = Math.round(amount * price * 1.6)
  return {
    merchantId: merchant.id,
    locationId: merchant.locationId,
    good: wanted,
    amount,
    advance: Math.round(total * ADVANCE_SHARE),
    reward: total - Math.round(total * ADVANCE_SHARE),
    days: 20 + (hash % 15),
    says: ORDER_SAYS[(hash >>> 7) % ORDER_SAYS.length] as string,
  }
}

const ORDER_SAYS = ORDER_LINES

/** Сколько этого товара месту положено держать: та же норма, что у хозяйства. */
function targetOf(world: World, settlement: Settlement, good: GoodId): number {
  const price = priceOf(world, settlement, good)
  const base = GOODS[good].basePrice
  // Обратно из цены: цена выше базовой — значит запаса меньше нормы.
  return Math.max(1, settlement.stock[good] * (price / base))
}

/**
 * Купеческая молва (этап 49, Р6).
 *
 * Купец знает, почём его товар в местах, с которыми торгует, — и говорит, если
 * с ним говорят по-хорошему. Это то же знание, что в записной книжке цен, но
 * добытое устами, а не ногами.
 */
export interface PriceTale {
  readonly locationId: string
  readonly good: GoodId
  readonly price: number
}

/** Докуда достаёт молва: соседи в нескольких переходах. */
export const TALE_HOPS = 6

export function talesOf(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  merchant: Merchant,
  limit = 4,
): readonly PriceTale[] {
  const out: PriceTale[] = []
  const near = neighbourSettlements(world, merchant.locationId, TALE_HOPS)
  for (const step of near) {
    const there = settlements[step.id]
    if (!there || there.population <= 0) continue
    for (const good of merchant.goods) {
      out.push({ locationId: step.id, good, price: priceOf(world, there, good) })
    }
    if (out.length >= limit * merchant.goods.length) break
  }
  return out.slice(0, limit * merchant.goods.length)
}

/** Как купец встречает: по памяти о тебе. */
export function merchantGreets(merchant: Merchant, standing: number): string {
  const temper = MERCHANT_TEMPERS[merchant.temper]
  if (standing <= -25) return temper.offended[0] ?? ''
  if (standing >= 25) return temper.greets[0] ?? ''
  return ''
}

/** Словами: как он к тебе относится. */
export function standingWord(standing: number): string {
  if (standing <= -40) return 'не подаёт руки'
  if (standing <= -15) return 'помнит дурное'
  if (standing < 15) return 'знает в лицо'
  if (standing < 40) return 'торгует охотно'
  return 'считает своим'
}
