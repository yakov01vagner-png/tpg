import { nextHop } from './band'
import type { GoodId } from './content/goods'
import { GOODS } from './content/goods'
import type { ShipKind } from './content/ships'
import { SITES } from './content/sites'
import type { Settlement } from './economy'
import { priceOf } from './economy'
import { WAGON_PACE, legHoursFor } from './journey'
import { foodSecurity } from './life'
import { type Rng, rollChance } from './rng'
import { seasonOf } from './time'
import { lanesFrom } from './world/lanes'
import { roadsFrom } from './world/queries'
import type { World } from './world/types'
import { isSite } from './world/types'

/**
 * Дело, которое кормит.
 *
 * Караван — тот же отряд, только с грузом: он идёт дорогами, торгует сам и его
 * можно потерять. Мастерская стоит на месте и живёт местными ценами. И то и
 * другое — доход, который идёт без игрока, и потому требует человека: без
 * управляющего дело ведут вполсилы.
 */
export type EnterpriseKind = 'caravan' | 'workshop' | 'shipping'

export interface Enterprise {
  readonly id: string
  readonly kind: EnterpriseKind
  /** Где стоит мастерская либо где сейчас караван. */
  readonly locationId: string
  /** Караван ходит между двумя местами и обратно. */
  readonly homeId: string | null
  readonly awayId: string | null
  /** Куда идёт прямо сейчас (соседнее место), и куда в итоге. */
  readonly travel: { readonly toLocationId: string; readonly hoursLeft: number } | null
  /** Конец нынешнего плеча: он же решает, где торговать. */
  readonly travelTarget: string | null
  /** Вложено денег: от этого и оборот, и потери при разграблении. */
  readonly invested: number
  /** Спутник во главе дела. */
  readonly managerId: string | null
  readonly cargo: Readonly<Partial<Record<GoodId, number>>>
  /** Сколько принесло всего — чтобы игрок видел, окупилось ли. */
  readonly earned: number
  /**
   * Какое судно ходит этим делом (этап 36).
   *
   * Только у морского торга: его основывают, отдав в дело собственный корабль,
   * и вместе с делом его можно потерять насовсем.
   */
  readonly ship?: ShipKind
}

/** Во что обходится завести дело. */
export const CARAVAN_COST = 400
export const WORKSHOP_COST = 700
/**
 * Морской торг заводят не деньгами, а судном: деньги идут только на товар.
 * Поэтому он дешевле каравана в деньгах и дороже всего остального по существу —
 * корабль стоит как три каравана, и он уходит в дело целиком.
 */
export const SHIPPING_COST = 500

// --- жизнь дела -------------------------------------------------------------

/**
 * Сутки дел.
 *
 * Караван ходит между двумя местами и торгует разницей цен, которую этап 3
 * уже считает: зерно в деревне и зерно на руднике — разные деньги. Мастерская
 * стоит на месте и живёт тем, что вокруг. И то и другое можно потерять: обоз
 * грабят, город осаждают, округа голодает.
 */
export interface EnterpriseResult {
  readonly enterprises: readonly Enterprise[]
  readonly income: number
  readonly rng: Rng
  readonly events: readonly EnterpriseEvent[]
}

export type EnterpriseEvent =
  | {
      readonly type: 'caravanSold'
      readonly id: string
      readonly locationId: string
      readonly gain: number
    }
  | {
      readonly type: 'caravanRobbed'
      readonly id: string
      readonly locationId: string
      readonly lost: number
    }
  | { readonly type: 'workshopIdle'; readonly id: string; readonly locationId: string }
  | {
      readonly type: 'shipRaided'
      readonly id: string
      readonly locationId: string
      readonly lost: number
    }
  | { readonly type: 'shipSunk'; readonly id: string; readonly locationId: string }

/** Сколько вложенного оборачивается за один заход. */
const TURNOVER = 0.5
/** Доход мастерской за сутки, долей от вложенного. */
const WORKSHOP_RATE = 0.004
/** Без управляющего дело ведут спустя рукава. */
const NO_MANAGER = 0.55

/**
 * Чем рискует судно за один переход.
 *
 * Чужой парус отнимает треть вложенного, шторм — всё сразу вместе с судном.
 * Поодиночке это редкость, но морской торг приносит вдвое против сухопутного —
 * и платит за это тем, что однажды не возвращается.
 */
const SEA_RAID = 0.05
const SEA_WRECK = 0.012

export function tickEnterprises(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  enterprises: readonly Enterprise[],
  managerSkill: (enterprise: Enterprise) => number,
  rng: Rng,
  day: number | null = null,
): EnterpriseResult {
  if (enterprises.length === 0) return { enterprises, income: 0, rng, events: [] }
  let generator = rng
  let income = 0
  const events: EnterpriseEvent[] = []
  const next: Enterprise[] = []

  for (const enterprise of enterprises) {
    const skill = managerSkill(enterprise)
    const hand = enterprise.managerId ? 1 + skill * 0.06 : NO_MANAGER

    if (enterprise.kind === 'workshop') {
      const place = settlements[enterprise.locationId]
      // Осаждённый или голодающий город не работает: мастерская стоит.
      if (!place || place.population <= 0 || foodSecurity(place) < 0.2) {
        events.push({ type: 'workshopIdle', id: enterprise.id, locationId: enterprise.locationId })
        next.push(enterprise)
        continue
      }
      // Чем дороже здесь готовое против сырья, тем выгоднее держать мастерскую.
      const margin = priceOf(world, place, 'tools') / Math.max(1, priceOf(world, place, 'iron'))
      const gain = Math.round(enterprise.invested * WORKSHOP_RATE * hand * Math.min(2.5, margin))
      income += gain
      next.push({ ...enterprise, earned: enterprise.earned + gain })
      continue
    }

    // Морской торг: тот же караван, только между гаванями и по воде. Своих
    // опасностей у него две, и обе не разбой: чужой парус отнимает товар, а
    // шторм — судно вместе с делом (этап 36).
    if (enterprise.kind === 'shipping') {
      if (enterprise.travel) {
        const hoursLeft = enterprise.travel.hoursLeft - 24
        if (hoursLeft > 0) {
          next.push({ ...enterprise, travel: { ...enterprise.travel, hoursLeft } })
          continue
        }
        const arrived = enterprise.travel.toLocationId
        const [raided, afterRaid] = rollChance(generator, SEA_RAID)
        generator = afterRaid
        if (raided) {
          const lost = Math.round(enterprise.invested * 0.35)
          events.push({ type: 'shipRaided', id: enterprise.id, locationId: arrived, lost })
          next.push({
            ...enterprise,
            locationId: arrived,
            travel: null,
            invested: Math.max(0, enterprise.invested - lost),
            cargo: {},
          })
          continue
        }
        const [sunk, afterSink] = rollChance(generator, SEA_WRECK)
        generator = afterSink
        if (sunk) {
          events.push({ type: 'shipSunk', id: enterprise.id, locationId: arrived })
          continue
        }
        const gain = tradeHere(world, settlements[arrived], enterprise, hand)
        if (gain !== 0) {
          income += gain
          events.push({ type: 'caravanSold', id: enterprise.id, locationId: arrived, gain })
        }
        next.push({
          ...enterprise,
          locationId: arrived,
          travel: null,
          earned: enterprise.earned + gain,
        })
        continue
      }

      // Стоит в гавани — пора обратно. Морской путь прямой: между гаванями
      // нет промежуточных мест, и плечо всегда одно.
      const target =
        enterprise.locationId === enterprise.homeId ? enterprise.awayId : enterprise.homeId
      const lane = target
        ? lanesFrom(world, enterprise.locationId).find((one) => one.to === target)
        : undefined
      if (!target || !lane) {
        next.push(enterprise)
        continue
      }
      next.push({
        ...enterprise,
        travelTarget: target,
        travel: { toLocationId: target, hoursLeft: lane.hours },
      })
      continue
    }

    // Караван в пути.
    if (enterprise.travel) {
      const hoursLeft = enterprise.travel.hoursLeft - 24
      if (hoursLeft > 0) {
        next.push({ ...enterprise, travel: { ...enterprise.travel, hoursLeft } })
        continue
      }
      const arrived = enterprise.travel.toLocationId
      const place = settlements[arrived]
      // Разбой на дорогах: обоз доходит не всегда. Опасность берётся у земли —
      // у всего отрезка, а не у его конца: обоз идёт по дороге целиком, и
      // грабят его там, где удобно грабить. В урочище грабят и там, где нет ни
      // души, иначе обоз, идущий через глушь, был бы неуязвим просто потому,
      // что в глуши некому держать разбой.
      const danger = Math.max(
        landDanger(world, settlements, arrived),
        landDanger(world, settlements, enterprise.locationId),
      )
      const [robbed, afterRoll] = rollChance(generator, danger)
      generator = afterRoll
      if (robbed) {
        const lost = Math.round(enterprise.invested * 0.3)
        events.push({ type: 'caravanRobbed', id: enterprise.id, locationId: arrived, lost })
        next.push({
          ...enterprise,
          locationId: arrived,
          travel: null,
          invested: Math.max(0, enterprise.invested - lost),
          cargo: {},
        })
        continue
      }
      // Торгуют в конце маршрута, а не на каждом привале. Пока это не
      // различалось, обоз продавал товар на каждом промежуточном месте и
      // окупался за семнадцать дней — одно дело кормило лучше, чем война.
      const endOfRoad = arrived === enterprise.homeId || arrived === enterprise.awayId
      const gain = endOfRoad ? tradeHere(world, place, enterprise, hand) : 0
      if (gain !== 0) {
        income += gain
        events.push({ type: 'caravanSold', id: enterprise.id, locationId: arrived, gain })
      }
      next.push({
        ...enterprise,
        locationId: arrived,
        travel: null,
        earned: enterprise.earned + gain,
      })
      continue
    }

    // Стоит на месте — пора дальше. Если это привал посреди пути, идём к той же
    // цели; если конец маршрута — разворачиваемся.
    const target =
      enterprise.locationId === enterprise.homeId
        ? enterprise.awayId
        : enterprise.locationId === enterprise.awayId
          ? enterprise.homeId
          : (enterprise.travelTarget ?? enterprise.awayId)
    if (!target) {
      next.push(enterprise)
      continue
    }
    // Обоз тоже стоит перед разлившейся рекой: возчик не полезет в воду.
    const step = nextHop(world, enterprise.locationId, target, day)
    if (!step) {
      next.push(enterprise)
      continue
    }
    const road = roadsFrom(world, enterprise.locationId).find((one) => one.to === step)
    next.push({
      ...enterprise,
      travelTarget: target,
      // Часы отрезка считает то же правило, что у героя и у дружины: обоз
      // просто медленнее (journey.ts).
      travel: {
        toLocationId: step,
        hoursLeft: legHoursFor(road?.hours ?? 12, WAGON_PACE, day === null ? null : seasonOf(day)),
      },
    })
  }

  return { enterprises: next, income, rng: generator, events }
}

/** Насколько опасна земля места для обоза: разбой округи и слава самой глуши. */
function landDanger(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  locationId: string,
): number {
  const kind = world.locations[locationId]?.archetype
  const wild = kind && isSite(kind) ? SITES[kind].danger : 0
  return Math.max((settlements[locationId]?.banditry ?? 0) * 0.5, wild * 0.5)
}

/**
 * Что караван зарабатывает на одном заходе.
 *
 * Считается по тем же ценам, что и торг игрока: где товар нужен, там он дорог.
 * Поэтому выгодны дальние и разные места, а не два соседних села.
 */
function tradeHere(
  world: World,
  place: Settlement | undefined,
  enterprise: Enterprise,
  hand: number,
): number {
  if (!place || place.population <= 0) return 0
  const turnover = enterprise.invested * TURNOVER
  // Ищем товар, который здесь дороже всего против обычной цены.
  let best = 1
  for (const good of Object.keys(GOODS) as GoodId[]) {
    const ratio = priceOf(world, place, good) / Math.max(1, GOODS[good].basePrice)
    if (ratio > best) best = ratio
  }
  // Навар — доля оборота, а не вся разница: часть съедают дорога и пошлины.
  // Доля невелика: дело кормит, но не должно обесценивать поход и службу.
  // При 0.2 караван приносил вдвое больше, чем мастерская вчетверо дороже.
  const margin = Math.min(0.22, (best - 1) * 0.14)
  return Math.round(turnover * margin * hand)
}
