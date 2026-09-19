import { BUILDINGS, type BuildingId } from './content/buildings'
import {
  DEBT_PATIENCE,
  EMPTY_PURSE,
  LENDERS,
  LENDER_DEFS,
  LEND_STANDING,
  type LenderId,
  RAISE_DEFS,
  type RaiseWay,
  WORKS_OVERHEAD,
} from './content/treasury'
import { vassalsOf } from './court'
import type { Settlement } from './economy'
import { arrearsFactor, lawOf } from './estate'
import { fameOf } from './fame'
import { PLAYER, dailyTax, dailyTolls, garrisonWages, holdingsOf } from './holding'
import { foodSecurity } from './life'
import { courtWages } from './office'
import { takeAt } from './realm'
import type { GameState } from './state'
import { pietyOf } from './temple'
import { oathOf, shareOf } from './vassal'
import type { World } from './world/types'

/**
 * Казна державы (этап 77).
 *
 * Кошелёк героя был одним числом: подати прибавляют, жалованье отнимает. У
 * державы должен быть счёт — откуда пришло и куда ушло, до монеты, — потому что
 * решения принимаются не по остатку, а по тому, что этот остаток означает.
 *
 * Счёт ничего не хранит: он считается из мира в тот день, когда его спросили.
 * В состоянии лежат только долги и очередь строек — то, что ты кому-то должен и
 * что кому-то обещал.
 */

export interface Ledger {
  /** Подать со своих мест — с поправкой на закон, грамоты и недоимки. */
  readonly tax: number
  /** Мыто на своих дорогах. */
  readonly tolls: number
  /** Доля вассалов по присяге. */
  readonly vassals: number
  /** Дань, которую платят тебе. */
  readonly tribute: number
  /** Гарнизоны. */
  readonly garrison: number
  /** Двор. */
  readonly court: number
  /** Рост долгов. */
  readonly interest: number
  readonly income: number
  readonly spent: number
  readonly net: number
}

/** Счёт державы за сутки: всё, что приходит и уходит каждый день. */
export function ledger(state: GameState, world: World, day: number): Ledger {
  const mine = holdingsOf(state.settlements, PLAYER)
  let tax = 0
  let garrison = 0
  for (const settlement of mine) {
    tax +=
      dailyTax(settlement, foodSecurity(settlement)) *
      takeAt(state, settlement.locationId, day) *
      arrearsFactor(state, settlement.locationId, day)
    garrison += garrisonWages(settlement)
  }
  const tolls = dailyTolls(world, state.settlements, PLAYER)
  let vassals = 0
  for (const lord of vassalsOf(state)) {
    const share = shareOf(oathOf(state, lord.id))
    if (share <= 0) continue
    for (const held of holdingsOf(state.settlements, lord.id)) {
      vassals += dailyTax(held, foodSecurity(held)) * share
    }
  }
  const tribute = state.politics.tributes
    .filter((one) => one.to === PLAYER && one.untilDay > day)
    .reduce((sum, one) => sum + one.perDay, 0)
  const court = courtWages(state)
  const interest = debtsOf(state).reduce(
    (sum, debt) => sum + debt.owed * LENDER_DEFS[debt.lender].rate,
    0,
  )
  const income = tax + tolls + vassals + tribute
  const spent = garrison + court + interest
  return {
    tax: Math.round(tax),
    tolls: Math.round(tolls),
    vassals: Math.round(vassals),
    tribute: Math.round(tribute),
    garrison: Math.round(garrison),
    court: Math.round(court),
    interest: Math.round(interest),
    income: Math.round(income),
    spent: Math.round(spent),
    net: Math.round(income - spent),
  }
}

/** На сколько суток хватит казны при нынешнем счёте. */
export function daysOfPurse(state: GameState, sheet: Ledger): number {
  if (sheet.net >= 0) return Number.POSITIVE_INFINITY
  return Math.floor(state.character.money / Math.abs(sheet.net))
}

// --- долг (К4) --------------------------------------------------------------

export interface Debt {
  readonly lender: LenderId
  /** Сколько должен сейчас: растёт само. */
  readonly owed: number
  readonly sinceDay: number
  /** Когда платили в последний раз. */
  readonly paidDay: number
}

export function debtsOf(state: Pick<GameState, 'debts'>): readonly Debt[] {
  return state.debts ?? []
}

export function debtTo(state: Pick<GameState, 'debts'>, lender: LenderId): Debt | null {
  return debtsOf(state).find((one) => one.lender === lender) ?? null
}

export function lenderDef(lender: LenderId) {
  return LENDER_DEFS[lender]
}

/** Как этот заимодавец к тебе: у каждого своя мера. */
export function standingWith(state: GameState, lender: LenderId): number {
  if (lender === 'merchants') return fameOf(state, 'traders') + state.renown
  if (lender === 'temple') return pietyOf(state) + fameOf(state, 'church')
  return fameOf(state, 'folk') + state.renown
}

/** Сколько он даст: доля годового прихода державы, а не число из воздуха. */
export function creditLimit(state: GameState, world: World, lender: LenderId, day: number): number {
  const sheet = ledger(state, world, day)
  const yearly = Math.max(0, sheet.income * 365)
  const limit = Math.round(yearly * LENDER_DEFS[lender].share)
  const owed = debtTo(state, lender)?.owed ?? 0
  return Math.max(0, limit - owed)
}

export function lends(state: GameState, lender: LenderId): boolean {
  return standingWith(state, lender) > LEND_STANDING
}

/** Сердится ли он: платить надо хотя бы изредка. */
export function lenderAngry(debt: Debt, day: number): boolean {
  return day - debt.paidDay > DEBT_PATIENCE
}

// --- наборы (К3) ------------------------------------------------------------

export function raiseDef(way: RaiseWay) {
  return RAISE_DEFS[way]
}

/**
 * Сколько людей можно взять этим способом здесь и сейчас.
 *
 * Ополчение берётся из тех, кто есть в месте (`recruits`), и его столько,
 * сколько позволяет закон о повинности; набор и дружина упираются не в людей, а
 * в казну.
 */
export function canRaise(
  state: GameState,
  settlement: Settlement,
  way: RaiseWay,
  money: number,
): number {
  if (way === 'levy') {
    const law = lawOf(state)
    const allowed = law.levy === 'none' ? 0 : law.levy === 'full' ? 2 : 1
    return Math.floor(Math.min(settlement.recruits, settlement.recruits * allowed))
  }
  const def = RAISE_DEFS[way]
  return def.upfront > 0 ? Math.floor(money / def.upfront) : 0
}

/** Во что обойдётся поставить столько людей этим способом. */
export function raiseCost(way: RaiseWay, men: number): number {
  return Math.round(RAISE_DEFS[way].upfront * men)
}

/** И сколько они будут есть каждый день. */
export function raiseWages(way: RaiseWay, men: number): number {
  return RAISE_DEFS[way].wage * men
}

// --- стройка державы (К5) ---------------------------------------------------

export interface QueuedWork {
  readonly locationId: string
  readonly building: BuildingId
  /** Сколько уже уплачено: стройка идёт по мере денег. */
  readonly paid: number
}

export function queueOf(state: Pick<GameState, 'queue'>): readonly QueuedWork[] {
  return state.queue ?? []
}

/** Во что обходится стройка державы: цена постройки плюс обоз и надзор. */
export function worksPrice(building: BuildingId): number {
  return Math.round(BUILDINGS[building].cost * WORKS_OVERHEAD)
}

/** Сколько дней и денег до конца всей очереди при нынешнем остатке. */
export function queueAhead(state: GameState): { readonly works: number; readonly cost: number } {
  const queue = queueOf(state)
  const cost = queue.reduce((sum, work) => sum + worksPrice(work.building) - work.paid, 0)
  return { works: queue.length, cost }
}

export {
  DEBT_PATIENCE,
  EMPTY_PURSE,
  LENDERS,
  type LenderId,
  RAISE_DEFS,
  type RaiseWay,
  WORKS_OVERHEAD,
}
