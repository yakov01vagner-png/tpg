import type { ShipKind } from './content/ships'
import { SHIPS } from './content/ships'
import type { Party } from './party'
import { partySize } from './party'

/**
 * Своё судно.
 *
 * До 0.5 море было фоном: порт отличался от городка строчкой в описании. С
 * кораблём у моря появляется цена и владелец — и первое настоящее имущество,
 * которое можно потерять целиком. Судно лежит в состоянии, а не в мире: оно
 * твоё, а не чьё-то место на карте.
 */
export interface Ship {
  readonly kind: ShipKind
  readonly name: string
  /** Целость судна, 0..1. Шторм её ест, починка возвращает. */
  readonly condition: number
  /**
   * Команда (этап 62, К4): сколько рук на борту и как они настроены.
   *
   * До 0.6 судно ходило само: целость корпуса решала всё. Но корабль — это
   * прежде всего люди, которым платят: недобор рук замедляет ход, а неплатёж
   * кончается бунтом. Необязательно — сейвы до 0.6 команды не знают.
   */
  readonly crew?: number
  readonly mood?: number
}

/** Как отплывают: своим судном, нанятым или попутным. */
export type Passage = 'own' | 'hire' | 'aboard'

export const PASSAGE_LABELS: Record<Passage, string> = {
  own: 'своим судном',
  hire: 'нанять судно',
  aboard: 'попутным',
}

export function shipDef(ship: Ship) {
  return SHIPS[ship.kind]
}

/** Сколько человек влезет на борт. Ветхое судно берёт меньше. */
export function shipCarries(ship: Ship): number {
  return Math.max(2, Math.round(shipDef(ship).carries * (0.6 + ship.condition * 0.4)))
}

/**
 * Скольких берёт попутное судно.
 *
 * Попутный шкипер везёт человека, а не войско: дружину на чужую палубу никто
 * не пустит — её незачем кормить и не с руки высаживать.
 */
export const ABOARD_MAX = 6

/** А нанятое — сколько поместится, но не всякую рать. */
export const HIRE_MAX = 40

/**
 * Во сколько обходится час пути.
 *
 * Нанять судно — это нанять и команду, поэтому платят за час хода и за каждую
 * голову на борту. Попутное дешевле втрое: шкипер идёт туда и так, ему важно
 * только не остаться внакладе.
 */
export const HIRE_PER_HOUR = 9
export const HIRE_PER_HEAD = 1.6
export const ABOARD_PER_HOUR = 2
export const ABOARD_PER_HEAD = 1.1

export function passageCost(manner: Passage, hours: number, people: number): number {
  if (manner === 'own') return 0
  const heads = Math.max(1, people)
  return manner === 'hire'
    ? Math.round(hours * (HIRE_PER_HOUR + HIRE_PER_HEAD * heads))
    : Math.round(hours * (ABOARD_PER_HOUR + ABOARD_PER_HEAD * heads))
}

/**
 * Часы пути под парусом.
 *
 * Своё судно идёт так, как оно ходит; нанятое — как обычное купеческое; а
 * попутное ещё и заходит по своим делам, поэтому выходит дольше всех. Ветхое
 * судно тоже медленнее: течь вычерпывают вместо того, чтобы грести.
 */
export function seaHours(laneHours: number, manner: Passage, ship: Ship | null): number {
  if (manner === 'own' && ship) {
    const leak = 1 + (1 - ship.condition) * 0.4
    return Math.max(2, Math.round(laneHours * shipDef(ship).pace * leak))
  }
  return Math.max(2, Math.round(laneHours * (manner === 'hire' ? 1 : 1.3)))
}

/** Сколько ждать отплытия: своё судно уходит когда хочешь, чужое — когда оно. */
export function waitHours(manner: Passage): number {
  return manner === 'own' ? 0 : manner === 'hire' ? 3 : 8
}

/** Помещается ли отряд. */
export function fits(manner: Passage, party: Party, ship: Ship | null): boolean {
  const people = partySize(party) + 1
  if (manner === 'own') return ship !== null && people <= shipCarries(ship)
  return people <= (manner === 'hire' ? HIRE_MAX : ABOARD_MAX)
}

/** Во сколько обойдётся починка до целого. */
export function repairPrice(ship: Ship): number {
  return Math.round(shipDef(ship).price * (1 - ship.condition) * 0.55)
}

/** За сколько продадут: судно теряет в цене и от лет, и от течи. */
export function resalePrice(ship: Ship): number {
  return Math.round(shipDef(ship).price * 0.55 * ship.condition)
}

/** Сколько стоит день на плаву. */
export function shipUpkeep(ship: Ship | null): number {
  return ship ? shipDef(ship).upkeep : 0
}

/** Что делает с судном шторм. */
export function battered(ship: Ship, force: number): Ship {
  const harm = Math.max(0.02, force / Math.max(0.4, shipDef(ship).sturdy))
  return { ...ship, condition: Math.max(0, Math.round((ship.condition - harm) * 100) / 100) }
}
