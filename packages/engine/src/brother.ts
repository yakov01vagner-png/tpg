import {
  BROTHER_NAMES,
  BROTHER_ROLES,
  BROTHER_ROLE_LABELS,
  type BrotherRole,
  CLASH_BANDITRY,
  CLASH_CHANCE,
  CLASH_SWAY,
  SWAY_FLOOR,
  SWAY_GROWTH,
  SWAY_MAX,
  SWAY_REACH,
  SWAY_START,
} from './content/brothers'
import type { OrderDef } from './content/orders'
import { ORDERS } from './content/orders'
import type { Settlement } from './economy'
import { ordersAt } from './order'
import type { Rng } from './rng'
import { nextFloat, rollChance } from './rng'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Братья по ордену (этап 59, О5).
 *
 * Как купцы (этап 49) и двор лорда (этап 52), братья выводятся из места и
 * ордена, а не хранятся: в состоянии — только то, что о них помнят. Магистр
 * сидит там, где орден главный; казначей и брат-рыцарь — в любом его доме.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export interface Brother {
  readonly id: string
  readonly name: string
  readonly role: BrotherRole
  readonly orderId: string
  /** Как он сам к тебе: по положению в ордене и своему нраву. */
  readonly mood: number
}

/**
 * Кто из братьев сидит в этом доме ордена.
 *
 * Магистр — только в главном доме (там, где орден стоит первым в списке своих
 * мест этого королевства); прочие — где угодно, но не все сразу.
 */
export function brothersAt(
  state: GameState,
  order: OrderDef,
  locationId: string = state.locationId,
): readonly Brother[] {
  if (!ordersAt(state.world, locationId).some((one) => one.id === order.id)) return []
  const base = hashOf(`${order.id}|${locationId}`)
  const roles: BrotherRole[] = []
  if (isSeat(state.world, order, locationId)) roles.push('master')
  roles.push('treasurer')
  if (base % 3 !== 0) roles.push('knight')
  if ((base >>> 4) % 4 === 0) roles.push('scribe')
  const standing = state.guild?.orderId === order.id ? state.guild.standing : -10
  return roles.map((role) => {
    const hash = hashOf(`${order.id}|${locationId}|${role}`)
    const own = ((hash >>> 6) % 17) - 8
    return {
      id: `brother:${order.id}:${locationId}:${role}`,
      name: BROTHER_NAMES[hash % BROTHER_NAMES.length] ?? 'брат',
      role,
      orderId: order.id,
      // Свой — свой: брат смотрит на тебя по твоему положению в ордене, а
      // чужому кивает вежливо и не более.
      mood: Math.max(-100, Math.min(100, Math.round(standing * 0.6 + own))),
    }
  })
}

/**
 * Где у ордена дома и где из них главный.
 *
 * Считается один раз на мир: это свойство скелета, а спрашивают его каждый
 * раз, когда кто-то заходит в дом ордена или когда мир живёт сутки.
 */
interface OrderMap {
  readonly houses: Readonly<Record<string, readonly string[]>>
  readonly seats: Readonly<Record<string, string>>
  readonly feuds: readonly ClashEvent[]
}

const maps = new WeakMap<World, OrderMap>()

function mapOf(world: World): OrderMap {
  const known = maps.get(world)
  if (known) return known
  const houses: Record<string, string[]> = {}
  const feuds: ClashEvent[] = []
  for (const place of Object.values(world.locations)) {
    const here = ordersAt(world, place.id)
    for (const order of here) {
      const list = houses[order.id] ?? []
      list.push(place.id)
      houses[order.id] = list
    }
    for (const order of here) {
      for (const other of here) {
        if (order.id >= other.id) continue
        if (order.feud.orders.includes(other.id) || other.feud.orders.includes(order.id)) {
          feuds.push({ locationId: place.id, a: order.id, b: other.id })
        }
      }
    }
  }
  const seats: Record<string, string> = {}
  for (const [orderId, list] of Object.entries(houses)) {
    const biggest = [...list].sort(
      (a, b) => (world.locations[b]?.population ?? 0) - (world.locations[a]?.population ?? 0),
    )[0]
    if (biggest) seats[orderId] = biggest
  }
  const built: OrderMap = { houses, seats, feuds }
  maps.set(world, built)
  return built
}

/** Главный дом ордена: самое крупное из мест, где он стоит. */
export function isSeat(world: World, order: OrderDef, locationId: string): boolean {
  return mapOf(world).seats[order.id] === locationId
}

/** Все места, где орден стоит. */
export function housesOf(world: World, orderId: string): readonly string[] {
  return mapOf(world).houses[orderId] ?? []
}

export function brotherTitle(order: OrderDef, role: BrotherRole): string {
  return BROTHER_ROLE_LABELS[order.kind][role]
}

/** Что брат говорит тому, кто пришёл: по нраву дома и по твоему положению. */
export function brotherSays(brother: Brother, order: OrderDef): string {
  if (brother.mood < -15) {
    return `${order.name} помнит о тебе больше, чем тебе хотелось бы.`
  }
  if (brother.mood > 25) return 'Свои здесь всегда вовремя. Чем помочь?'
  return 'Мир тебе. Говори, если дело.'
}

// --- вражда орденов в мире --------------------------------------------------

/**
 * Влияние орденов (этап 59, О3).
 *
 * Шесть чисел на весь мир: сколько весит каждый орден. Растёт само — орден
 * работает и без игрока, — и падает, когда с ним сходится враг. Числа живут в
 * состоянии, потому что в них накапливается история.
 */
export type OrderSway = Readonly<Record<string, number>>

export function startSway(): OrderSway {
  const sway: Record<string, number> = {}
  for (const order of ORDERS) sway[order.id] = SWAY_START
  return sway
}

export function swayOf(sway: OrderSway | undefined, orderId: string): number {
  return sway?.[orderId] ?? SWAY_START
}

/**
 * Свой потолок у каждого ордена.
 *
 * Братство Пути стоит в каждой деревне и на каждом броде — и весит столько,
 * сколько весит дорога. Орден Светоча сидит в восьми домах, и его вес —
 * восьми домов, сколько бы святости в них ни было.
 */
export function ceilingOf(world: World, orderId: string): number {
  const houses = housesOf(world, orderId).length
  return SWAY_FLOOR + (SWAY_MAX - SWAY_FLOOR) * Math.min(1, houses / SWAY_REACH)
}

export interface ClashEvent {
  readonly locationId: string
  readonly a: string
  readonly b: string
}

/**
 * Сутки орденской жизни без игрока.
 *
 * Орден прибавляет вес за каждое своё место, а там, где стоят двое врагов,
 * иногда сходятся их люди — и тогда оба теряют вес, а место получает разбой.
 * Свара братьев людям дорога, и в отчёте века это видно числом.
 */
export function tickOrders(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  sway: OrderSway,
  rng: Rng,
): {
  readonly sway: OrderSway
  readonly clashes: readonly ClashEvent[]
  readonly settlements: Readonly<Record<string, Settlement>>
  readonly rng: Rng
} {
  const next: Record<string, number> = { ...sway }
  const clashes: ClashEvent[] = []
  let generator = rng
  let places = settlements

  const map = mapOf(world)
  for (const order of ORDERS) {
    const now = next[order.id] ?? SWAY_START
    const ceiling = ceilingOf(world, order.id)
    // К своему потолку орден идёт сам: он работает и без игрока. Потолок — от
    // того, во скольких местах он стоит.
    next[order.id] = Math.min(SWAY_MAX, now + (ceiling - now) * SWAY_GROWTH)
  }

  // Где стоят двое враждующих — там и сходятся. Кубик бросается один на все
  // пары разом, а не на каждую: пар в мире под три сотни, и триста бросков в
  // сутки — это треть суточного бюджета мира ради одного события в месяц.
  if (map.feuds.length > 0) {
    const anywhere = 1 - (1 - CLASH_CHANCE) ** map.feuds.length
    const [clash, afterRoll] = rollChance(generator, anywhere)
    generator = afterRoll
    if (clash) {
      const [roll, afterPick] = nextFloat(generator)
      generator = afterPick
      const feud = map.feuds[Math.min(map.feuds.length - 1, Math.floor(roll * map.feuds.length))]
      const current = feud ? places[feud.locationId] : undefined
      if (feud && current && current.population > 0) {
        next[feud.a] = Math.max(0, (next[feud.a] ?? SWAY_START) - CLASH_SWAY)
        next[feud.b] = Math.max(0, (next[feud.b] ?? SWAY_START) - CLASH_SWAY)
        places = {
          ...places,
          [feud.locationId]: {
            ...current,
            banditry: Math.min(1, current.banditry + CLASH_BANDITRY),
          },
        }
        clashes.push(feud)
      }
    }
  }

  return { sway: next, clashes, settlements: places, rng: generator }
}

/** Кто сейчас сильнее всех: по этому видно, чей век. */
export function strongestOrder(sway: OrderSway | undefined): OrderDef | null {
  let best: OrderDef | null = null
  let most = -1
  for (const order of ORDERS) {
    const weight = swayOf(sway, order.id)
    if (weight > most) {
      most = weight
      best = order
    }
  }
  return best
}

export const ALL_BROTHER_ROLES = BROTHER_ROLES
