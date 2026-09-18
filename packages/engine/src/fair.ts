import { FAIR_NAMES, FEASTS } from './content/year'
import type { Feast } from './content/year'
import { DAYS_PER_YEAR, HARVEST_DAY, dayOfYear } from './time'
import { kingdomOf } from './world/queries'
import type { World } from './world/types'

/**
 * Ярмарки и праздники (этап 39).
 *
 * Год у земли уже есть (этап 37): она родит и не родит. Здесь появляется год у
 * людей — тот, по которому назначают срок. Ярмарка — это день, ради которого
 * едут: цены на ней сходятся, наёмники приходят сами, и поручение «к ярмарке»
 * впервые делает срок условием, а не подписью.
 *
 * Ни ярмарка, ни праздник не лежат в состоянии: они выводятся из места и дня —
 * значит, нечему рассинхронизироваться и незачем мигрировать сейв. Из одного
 * мира и одного дня всегда выходит одна и та же ярмарка.
 */
export interface Fair {
  readonly locationId: string
  readonly name: string
  /** День года, с которого она идёт. */
  readonly fromDay: number
  readonly days: number
}

/** Сколько дней стоит ярмарка. */
export const FAIR_DAYS = 8

/**
 * Насколько легче торговаться на ярмарке.
 *
 * Прибавка к навыку торговли, а не скидка к цене: на ярмарке продавцов много и
 * все на виду, поэтому разница между «купить» и «продать» сходится сама — ровно
 * так же, как она сходится у того, кого на рынке знают. Двадцать пять ступеней
 * — это две пятых разницы (`spreadFor`): при меньшем её съедало округление
 * дешёвых товаров, и ярмарка не отличалась от будня ни на монету.
 */
export const FAIR_TRADE_BONUS = 25

/** Где вообще бывают ярмарки: там, куда съезжаются. */
function fairsHere(world: World, locationId: string): boolean {
  const kind = world.locations[locationId]?.archetype
  return kind === 'capital' || kind === 'city' || kind === 'town' || kind === 'port'
}

/** Устойчивое число из имени: одно и то же место — одна и та же ярмарка. */
function hashOf(id: string): number {
  let hash = 2166136261
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * На какой день года приходится ярмарка этого места.
 *
 * После жатвы: торгуют тем, что сжали, и тем, на что его меняют. Оттого ярмарки
 * и сходятся в осень — до ледостава и до распутицы.
 */
export function fairDayOf(locationId: string): number {
  return (
    ((((HARVEST_DAY + (hashOf(locationId) % 70) - 1) % DAYS_PER_YEAR) + DAYS_PER_YEAR) %
      DAYS_PER_YEAR) +
    1
  )
}

export function fairNameOf(locationId: string): string {
  return FAIR_NAMES[hashOf(locationId) % FAIR_NAMES.length] ?? 'Ярмарка'
}

/** Ярмарка этого места, если она вообще у него есть. */
export function fairOf(world: World, locationId: string): Fair | null {
  if (!fairsHere(world, locationId)) return null
  return {
    locationId,
    name: fairNameOf(locationId),
    fromDay: fairDayOf(locationId),
    days: FAIR_DAYS,
  }
}

/** Идёт ли здесь ярмарка в этот день. */
export function fairAt(world: World, locationId: string, day: number): Fair | null {
  const fair = fairOf(world, locationId)
  if (!fair) return null
  const today = dayOfYear(day)
  for (let step = 0; step < fair.days; step += 1) {
    const at = ((fair.fromDay + step - 1) % DAYS_PER_YEAR) + 1
    if (at === today) return fair
  }
  return null
}

/** Сколько суток до ближайшей ярмарки здесь. Ноль — она идёт сейчас. */
export function daysToFair(world: World, locationId: string, day: number): number | null {
  const fair = fairOf(world, locationId)
  if (!fair) return null
  if (fairAt(world, locationId, day)) return 0
  const left = fair.fromDay - dayOfYear(day)
  return left > 0 ? left : left + DAYS_PER_YEAR
}

/** Праздник короны, если он сегодня и здесь. */
export function feastAt(world: World, locationId: string, day: number): Feast | null {
  const kingdom = kingdomOf(world, locationId)
  if (!kingdom) return null
  const today = dayOfYear(day)
  for (const feast of FEASTS) {
    if (feast.kingdomId !== kingdom.id) continue
    for (let step = 0; step < feast.days; step += 1) {
      const at = ((feast.day + step - 1) % DAYS_PER_YEAR) + 1
      if (at === today) return feast
    }
  }
  return null
}

/** Все праздники этой короны — для календаря в интерфейсе. */
export function feastsOf(kingdomId: string): readonly Feast[] {
  return FEASTS.filter((feast) => feast.kingdomId === kingdomId)
}
