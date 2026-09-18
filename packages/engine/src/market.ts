import { GOOD_IDS, type GoodId } from './content/goods'
import type { Settlement } from './economy'
import { priceOf } from './economy'
import type { World } from './world/types'

/**
 * Память о ценах.
 *
 * Мир знает цены везде и всегда, игрок — только там, где был сам или где стоял
 * его караван. Поэтому история цен — это не срез мира, а записная книжка
 * купца: что было здесь, когда он здесь стоял. Из неё видно, куда что везти, и
 * что стоило вчера и год назад — без блокнота на коленке.
 */
export interface PriceSample {
  readonly day: number
  readonly price: number
}

/** Место → товар → записи, старые впереди. */
export type PriceLog = Readonly<
  Record<string, Readonly<Partial<Record<GoodId, readonly PriceSample[]>>>>
>

/** Чаще этого не записываем: цены за сутки не меняются настолько, чтобы помнить. */
export const SAMPLE_EVERY_DAYS = 5
/** Сколько записей держим на товар: с шагом в пять суток — примерно год. */
export const SAMPLES_KEPT = 72

export const EMPTY_PRICE_LOG: PriceLog = {}

/** Записать цены места, если с прошлой записи прошло достаточно суток. */
export function recordPrices(
  log: PriceLog,
  world: World,
  settlement: Settlement | undefined,
  day: number,
): PriceLog {
  if (!settlement || settlement.population <= 0) return log
  const known = log[settlement.locationId] ?? {}
  const last = known.grain?.[known.grain.length - 1]
  if (last && day - last.day < SAMPLE_EVERY_DAYS) return log
  const next: Partial<Record<GoodId, readonly PriceSample[]>> = {}
  for (const good of GOOD_IDS) {
    const samples = [...(known[good] ?? []), { day, price: priceOf(world, settlement, good) }]
    next[good] = samples.length > SAMPLES_KEPT ? samples.slice(-SAMPLES_KEPT) : samples
  }
  return { ...log, [settlement.locationId]: next }
}

export function priceHistory(
  log: PriceLog,
  locationId: string,
  good: GoodId,
): readonly PriceSample[] {
  return log[locationId]?.[good] ?? []
}

/** Цена примерно столько-то суток назад: ближайшая запись не позже этого дня. */
export function priceAgo(
  log: PriceLog,
  locationId: string,
  good: GoodId,
  day: number,
  daysAgo: number,
): number | null {
  const samples = priceHistory(log, locationId, good)
  const wanted = day - daysAgo
  let best: PriceSample | null = null
  for (const sample of samples) {
    if (sample.day <= wanted) best = sample
  }
  return best?.price ?? null
}

/** Где, по памяти, этот товар дороже всего: последняя известная цена по местам. */
export function knownMarkets(
  log: PriceLog,
  good: GoodId,
): readonly { locationId: string; price: number; day: number }[] {
  const out: { locationId: string; price: number; day: number }[] = []
  for (const [locationId, goods] of Object.entries(log)) {
    const samples = goods[good]
    const last = samples?.[samples.length - 1]
    if (last) out.push({ locationId, price: last.price, day: last.day })
  }
  return out.sort((a, b) => b.price - a.price)
}
