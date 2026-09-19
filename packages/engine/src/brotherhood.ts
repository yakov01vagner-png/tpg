import { CHARTERS, type CharterId, FOUND_COST, FOUND_RENOWN } from './content/brothers'
import type { DeedId } from './content/companions'
import type { OrderKind } from './content/orders'
import { ownOrder, rankOf } from './order'
import type { GameState } from './state'

/**
 * Своё братство (этап 59, О6).
 *
 * Орден — сила, не привязанная к короне. Значит, её можно и завести: на высшей
 * ступени чужого ордена, когда тебе уже верят, — или вовсе вне орденов, когда
 * ты никому ничего не должен. Устав выбирается один раз и дальше судит тебя
 * так же, как чужие уставы судили раньше.
 */
export interface Brotherhood {
  readonly name: string
  readonly kind: OrderKind
  readonly charterId: CharterId
  /** С какого дня стоит. */
  readonly since: number
  /** Где его дома: места, в которых ты его объявил. */
  readonly seats: readonly string[]
  /** Сколько братьев набрано. */
  readonly brothers: number
}

export function charterById(id: CharterId) {
  return CHARTERS.find((one) => one.id === id) ?? CHARTERS[0]
}

/** Что своё братство думает о поступке — по своему уставу. */
export function ownCharterFeels(hood: Brotherhood, deed: DeedId): number {
  const charter = charterById(hood.charterId).charter as Readonly<Partial<Record<DeedId, number>>>
  return charter[deed] ?? 0
}

/**
 * Можно ли основать своё.
 *
 * Либо ты дорос до верха в чужом ордене — и тогда уходишь со своими, — либо
 * никогда ни в одном не состоял. Середины нет: брат средней руки, заводящий
 * своё братство, называется по-другому.
 */
export function canFound(state: GameState): { readonly can: boolean; readonly reason: string } {
  if (state.brotherhood) return { can: false, reason: 'У тебя уже есть своё братство.' }
  if (state.character.money < FOUND_COST) {
    return {
      can: false,
      reason: `На такое нужно ${FOUND_COST}, у тебя ${state.character.money}.`,
    }
  }
  const order = ownOrder(state)
  if (!order) return { can: true, reason: '' }
  const rank = rankOf(order, state.guild?.standing ?? 0)
  if (rank >= order.ranks.length - 1) return { can: true, reason: '' }
  return {
    can: false,
    reason: `Своё заводят с верха или с чистого места: дорасти в ${order.name} до высшей ступени или выйди из него.`,
  }
}

export const FOUND_PRICE = FOUND_COST
export const FOUND_GLORY = FOUND_RENOWN

/** Сколько братьев приходит само: по славе и по тому, где стоят дома. */
export function drawsBrothers(state: GameState): number {
  const hood = state.brotherhood
  if (!hood) return 0
  return Math.max(0, Math.round(state.renown / 3 + hood.seats.length))
}
