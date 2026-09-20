import { BARGAIN, BARGAIN_WORDS } from './content/bargain'
import type { GoodId } from './content/goods'
import { GOODS } from './content/goods'
import type { Settlement } from './economy'
import { priceOf } from './economy'
import type { GameState } from './state'
import { atWar } from './war'
import { hopsBetween } from './world/queries'
import type { World } from './world/types'

/**
 * Торг, который живёт (этап 178).
 *
 * Цена считалась одним: насколько товара меньше, чем нужно. Считалось это
 * честно, и всё же рынок оставался таблицей — в ней не видно ни войны за
 * рекой, ни того, что сюда везут за шесть переходов, ни того, что год выдался
 * мокрый.
 *
 * Здесь цена объясняется и меняется от мира. Новых величин нет: война берётся
 * из политики, дорога — из карты, год — из урожая места, пошлина — из грамоты.
 */

export interface PriceWhy {
  readonly good: GoodId
  readonly base: number
  readonly now: number
  readonly parts: readonly { readonly what: string; readonly times: number }[]
  readonly says: string
}

/**
 * Во сколько раз мир меняет цену этого товара здесь (Тг1, Тг3).
 *
 * Складывается из четырёх вещей, и каждая объясняется словами: война рядом,
 * разорённая округа, расстояние до того места, где этот товар делают, и год.
 */
export function marketMood(
  state: GameState,
  world: World,
  settlement: Settlement,
  good: GoodId,
  day: number,
): PriceWhy {
  const base = priceOf(world, settlement, good)
  const parts: { what: string; times: number }[] = []
  const side = sideOf(settlement.owner)
  if (side && state.politics.wars.some((war) => war.a === side || war.b === side)) {
    parts.push({ what: BARGAIN_WORDS.war, times: BARGAIN.war })
  }
  if (settlement.banditry >= 0.25) {
    parts.push({ what: BARGAIN_WORDS.raided, times: BARGAIN.raided })
  }
  const source = sourceOf(world, state, good)
  if (source === settlement.locationId) {
    parts.push({ what: BARGAIN_WORDS.source, times: BARGAIN.atSource })
  } else if (source) {
    const hops = hopsBetween(world, source, settlement.locationId) ?? BARGAIN.farHops
    if (hops >= BARGAIN.farHops) {
      parts.push({ what: BARGAIN_WORDS.far, times: 1 + hops * BARGAIN.perHop })
    }
  }
  if (good === 'grain') {
    const year = settlement.harvest ?? 1
    if (year < 0.9) parts.push({ what: BARGAIN_WORDS.badYear, times: BARGAIN.badYear })
    else if (year > 1.1) parts.push({ what: BARGAIN_WORDS.goodYear, times: BARGAIN.goodYear })
  }
  if (state.charters?.[settlement.locationId]) {
    parts.push({ what: BARGAIN_WORDS.toll, times: 1 + BARGAIN.toll })
  }
  const times = parts.reduce((all, one) => all * one.times, 1)
  const now = Math.max(1, Math.round(base * times))
  return {
    good,
    base,
    now,
    parts,
    says:
      parts.length === 0
        ? `${GOODS[good].label}: ${now}. Цена только от нужды: чего мало, то и дорого.`
        : `${GOODS[good].label}: ${base} → ${now}. ${parts.map((one) => one.what).join(' ')}`,
  }
}

/** Где этот товар делают: из того, что в мире уже есть. */
export function sourceOf(world: World, state: GameState, good: GoodId): string | null {
  let best: { id: string; stock: number } | null = null
  for (const one of Object.values(state.settlements)) {
    if (one.population <= 0) continue
    const stock = one.stock[good] ?? 0
    if (!best || stock > best.stock) best = { id: one.locationId, stock }
  }
  return best?.id ?? null
}

/** Во что обходится везти товар отсюда туда (Тг3). */
export function carryCost(
  state: GameState,
  world: World,
  from: string,
  to: string,
): { readonly hops: number; readonly times: number; readonly says: string } {
  const hops = hopsBetween(world, from, to) ?? BARGAIN.farHops
  const danger =
    ((state.settlements[from]?.banditry ?? 0) + (state.settlements[to]?.banditry ?? 0)) / 2
  const times = Math.round((1 + hops * BARGAIN.perHop + danger * BARGAIN.banditry) * 100) / 100
  return {
    hops,
    times,
    says: `${hops} переходов, цена перевозки ×${times}.${danger >= 0.2 ? ` ${BARGAIN_WORDS.risk}` : ''}`,
  }
}

/** Что здесь выгодно взять и что продать (Тг1, Тг5). */
export function tradeAdvice(
  state: GameState,
  world: World,
  settlement: Settlement,
  day: number,
): {
  readonly buy: readonly PriceWhy[]
  readonly sell: readonly PriceWhy[]
  readonly says: string
} {
  const rows = (Object.keys(GOODS) as GoodId[]).map((good) =>
    marketMood(state, world, settlement, good, day),
  )
  const cheap = [...rows].sort((a, b) => a.now / a.base - b.now / b.base).slice(0, 3)
  const dear = [...rows].sort((a, b) => b.now / b.base - a.now / a.base).slice(0, 3)
  return {
    buy: cheap,
    sell: dear,
    says: `Брать: ${cheap.map((one) => GOODS[one.good].label).join(', ')}. Продавать: ${dear
      .map((one) => GOODS[one.good].label)
      .join(', ')}.`,
  }
}

/** Торг в числах (Тг6). */
export function bargainRoll(
  state: GameState,
  world: World,
  day: number,
  good: GoodId = 'grain',
): {
  readonly places: number
  readonly cheapest: number
  readonly dearest: number
  readonly spread: number
  readonly says: string
} {
  const rows: number[] = []
  for (const one of Object.values(state.settlements)) {
    if (one.population <= 0) continue
    rows.push(marketMood(state, world, one, good, day).now)
  }
  const cheapest = rows.length > 0 ? Math.min(...rows) : 0
  const dearest = rows.length > 0 ? Math.max(...rows) : 0
  return {
    places: rows.length,
    cheapest,
    dearest,
    spread: dearest - cheapest,
    says: `${GOODS[good].label} по миру: от ${cheapest} до ${dearest} (разброс ${dearest - cheapest}) на ${rows.length} местах.`,
  }
}

function sideOf(owner: string | null): string | null {
  if (!owner) return null
  if (owner.startsWith('crown:')) return owner.slice('crown:'.length)
  const parts = owner.split(':')
  return parts[0] === 'lord' ? (parts[1] ?? null) : null
}
