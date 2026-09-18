import type { DeedId } from './content/companions'
import type { OrderDef } from './content/orders'
import { ORDERS, ORDERS_BY_ID } from './content/orders'
import type { GameState } from './state'
import { kingdomOf } from './world/queries'
import type { World } from './world/types'

/**
 * Ордена и гильдии (этап 42): членство, ступени, вражда.
 *
 * Орден стоит в местах — не в одном, а во всех, что подходят его уставу и
 * лежат на его земле. Где он стоит, там в него вступают, там он даёт своё и
 * там же спрашивает. Ордена ревнивы: состоять можно в одном.
 */
export interface Membership {
  readonly orderId: string
  /** Положение в ордене: растёт от службы и устава, падает от проступков и долгов. */
  readonly standing: number
  /** С какого дня. */
  readonly since: number
  /** До какого дня взнос уплачен. */
  readonly paidUntil: number
}

/** Ниже этого положения из ордена вылетают. */
export const EXPELLED = -20

/** Ордена, которые стоят в этом месте. */
export function ordersAt(world: World, locationId: string): readonly OrderDef[] {
  const place = world.locations[locationId]
  if (!place) return []
  const kingdom = kingdomOf(world, locationId)
  return ORDERS.filter(
    (order) =>
      order.seats.includes(place.archetype) &&
      (order.kingdomId === undefined || order.kingdomId === kingdom?.id),
  )
}

export function orderById(id: string): OrderDef | null {
  return ORDERS_BY_ID[id] ?? null
}

/** Свой орден, если есть, и то, стоит ли он здесь. */
export function ownOrder(state: GameState): OrderDef | null {
  return state.guild ? orderById(state.guild.orderId) : null
}

export function ownOrderHere(state: GameState, locationId = state.locationId): OrderDef | null {
  const order = ownOrder(state)
  if (!order) return null
  return ordersAt(state.world, locationId).some((one) => one.id === order.id) ? order : null
}

/** Ступень по положению: самая высокая из тех, до которых дорос. */
export function rankOf(order: OrderDef, standing: number): number {
  let rank = 0
  for (const [index, step] of order.ranks.entries()) {
    if (standing >= step.standing) rank = index
  }
  return rank
}

export function rankLabel(order: OrderDef, standing: number): string {
  return order.ranks[rankOf(order, standing)]?.label ?? order.ranks[0]?.label ?? ''
}

/**
 * Что орден думает о поступке — по уставу.
 *
 * Тот же список поступков, что замечают спутники (`DeedId`): один язык на всех,
 * кто о тебе судит. Орден без мнения о поступке молчит.
 */
export function charterFeels(order: OrderDef, deed: DeedId): number {
  return order.charter[deed] ?? 0
}

/**
 * Вражда.
 *
 * Орден в ссоре с короной — и корона это помнит о его людях: на её земле
 * тебя принимают холоднее (сдвиг к отношению места). С чужим орденом то же —
 * в его местах ты чужак.
 */
export const FEUD_CHILL = -15

export function feudWithKingdom(state: GameState, kingdomId: string | null | undefined): boolean {
  const order = ownOrder(state)
  return (
    order !== null &&
    kingdomId !== null &&
    kingdomId !== undefined &&
    order.feud.kingdoms.includes(kingdomId)
  )
}

export function feudWithOrder(state: GameState, otherId: string): boolean {
  const order = ownOrder(state)
  if (!order) return false
  const other = orderById(otherId)
  return order.feud.orders.includes(otherId) || (other?.feud.orders.includes(order.id) ?? false)
}

/** Насколько холоднее к тебе в этом месте из-за ордена. */
export function feudChill(state: GameState, locationId: string): number {
  if (!state.guild) return 0
  let chill = 0
  if (feudWithKingdom(state, kingdomOf(state.world, locationId)?.id)) chill += FEUD_CHILL
  if (ordersAt(state.world, locationId).some((order) => feudWithOrder(state, order.id))) {
    chill += FEUD_CHILL / 3
  }
  return chill
}

/** Взнос за месяц, тридцать суток. */
export const DUES_DAYS = 30
