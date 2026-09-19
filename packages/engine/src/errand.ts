import { housesOf } from './brother'
import { ERRANDS, type ErrandDef, type ErrandKind, MARKET_GOODS } from './content/brothers'
import type { GoodId } from './content/goods'
import type { OrderDef } from './content/orders'
import { ordersAt, rankOf } from './order'
import type { Quest } from './quest'
import type { GameState } from './state'
import { dayOf } from './time'
import { regionOf } from './world/queries'

/**
 * Дела ордена (этап 59, О1).
 *
 * Поручения, каких нет на рынке. Они не выдумываются: церковь посылает туда,
 * где о ней говорят плохо, гильдия — туда, где её товара не берут, орден — туда,
 * где стоит его враг. Как и все поручения (этап 6), они выводятся из мира и
 * живут в состоянии только после того, как взяты.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function errandDef(kind: ErrandKind): ErrandDef | null {
  return ERRANDS.find((one) => one.kind === kind) ?? null
}

/**
 * Что орден просит сделать сейчас.
 *
 * Дают в своём доме и только своим: чужому брат кивнёт и не более. Ступень
 * решает, какое дело доверят.
 */
export function errandsAt(
  state: GameState,
  locationId: string = state.locationId,
): readonly Quest[] {
  const membership = state.guild
  if (!membership) return []
  const order = ordersAt(state.world, locationId).find((one) => one.id === membership.orderId)
  if (!order) return []
  const rank = rankOf(order, membership.standing)
  const day = dayOf(state.time)
  const taken = new Set(state.quests.map((quest) => quest.id))
  const offers: Quest[] = []

  for (const errand of ERRANDS) {
    if (!errand.forKinds.includes(order.kind)) continue
    if (rank < errand.needsRank) continue
    const target = targetFor(state, order, errand.kind, locationId)
    if (!target) continue
    const id = `errand:${order.id}:${errand.kind}:${target}`
    if (taken.has(id)) continue
    const amount = amountFor(errand.kind, state, target)
    const quest: Quest = {
      id,
      type: questTypeOf(errand.kind),
      issuerLocationId: locationId,
      targetLocationId: target,
      amount,
      reward: errand.pay,
      deadlineDay: day + errand.days,
      progress: 0,
      ...(errand.kind === 'market' ? { good: goodFor(state, target) } : {}),
    }
    offers.push(quest)
  }
  return offers
}

export function questTypeOf(kind: ErrandKind): Quest['type'] {
  if (kind === 'heresy') return 'orderHeresy'
  if (kind === 'market') return 'orderMarket'
  return 'orderFoe'
}

export function errandKindOf(type: Quest['type']): ErrandKind | null {
  if (type === 'orderHeresy') return 'heresy'
  if (type === 'orderMarket') return 'market'
  if (type === 'orderFoe') return 'foe'
  return null
}

/** Куда посылают: у каждого уклада своё «туда». */
function targetFor(
  state: GameState,
  order: OrderDef,
  kind: ErrandKind,
  from: string,
): string | null {
  const nearby = neighbours(state, from)
  if (kind === 'heresy') {
    // Церковь посылает туда, где её слушают хуже всего: где место к ней
    // холоднее прочих и где нет её дома.
    let worst: string | null = null
    let least = Number.POSITIVE_INFINITY
    for (const id of nearby) {
      if (ordersAt(state.world, id).some((one) => one.id === order.id)) continue
      const rep = state.reputation.places[id] ?? 0
      if (rep < least) {
        least = rep
        worst = id
      }
    }
    return worst
  }
  if (kind === 'market') {
    // Гильдия хочет стоять там, где её ещё нет, — и чем крупнее место, тем лучше.
    let best: string | null = null
    let most = -1
    for (const id of nearby) {
      if (ordersAt(state.world, id).some((one) => one.id === order.id)) continue
      const people = state.settlements[id]?.population ?? 0
      if (people > most) {
        most = people
        best = id
      }
    }
    return best
  }
  // Орден посылает туда, где стоит его враг.
  for (const foeId of order.feud.orders) {
    const houses = housesOf(state.world, foeId)
    const near = houses.find((id) => nearby.includes(id))
    if (near) return near
  }
  return null
}

/** Места по соседству: та же округа, из которой растут прочие поручения. */
function neighbours(state: GameState, from: string): readonly string[] {
  const region = regionOf(state.world, from)
  if (!region) return []
  return region.provinceIds
    .flatMap((provinceId) => state.world.provinces[provinceId]?.locationIds ?? [])
    .filter((id) => id !== from)
}

function amountFor(kind: ErrandKind, state: GameState, target: string): number {
  if (kind === 'market') {
    const people = state.settlements[target]?.population ?? 500
    return Math.max(8, Math.min(40, Math.round(people / 300)))
  }
  return 1
}

function goodFor(state: GameState, target: string): GoodId {
  const index = hashOf(target) % MARKET_GOODS.length
  return MARKET_GOODS[index] ?? 'cloth'
}

/** Сделано ли дело ордена — решает мир, а не счётчик нажатий. */
export function errandComplete(state: GameState, quest: Quest): boolean {
  if (quest.type === 'orderHeresy') return quest.progress >= quest.amount
  if (quest.type === 'orderMarket') return quest.progress >= quest.amount
  if (quest.type === 'orderFoe') return quest.progress >= quest.amount
  return false
}

export function describeErrand(state: GameState, quest: Quest): string {
  const target = state.world.locations[quest.targetLocationId]?.name ?? 'где-то рядом'
  if (quest.type === 'orderHeresy') return `Дознание в ${target}`
  if (quest.type === 'orderMarket') return `Открыть рынок в ${target}: ${quest.amount} мер`
  return `Убрать чужих у ${target}`
}
