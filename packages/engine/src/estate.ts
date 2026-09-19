import type { BuildingId } from './content/buildings'
import {
  ARREARS_MAX,
  BUILDING_WORK,
  JUSTICE_DEFS,
  type JusticeLevel,
  LEVY_DEFS,
  type LevyLevel,
  PLAIN_LAW,
  PLEAS,
  PLEAS_BY_ID,
  type PleaDef,
  type PleaId,
  SENESCHAL_NAMES,
  SENESCHAL_TEMPERS,
  SENESCHAL_TEMPER_DEFS,
  type SeneschalTemper,
  TAX_DEFS,
  TOLL_DEFS,
  type TaxLevel,
  type TollLevel,
  VISIT_FRESH,
  VISIT_STALE,
} from './content/estate'
import type { Settlement } from './economy'
import { PLAYER, hasBuilding, holdingsOf } from './holding'
import { foodSecurity } from './life'
import type { GameState } from './state'

/**
 * Своя земля изнутри (этап 61).
 *
 * Управляющий, просьбы жителей, закон и хозяйство, которое ломается. Как и всё
 * в 0.6, люди здесь выводятся из места, а в состоянии живёт только память:
 * когда просили, что ответили, когда хозяин был здесь последний раз.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

// --- управляющий (В1) -------------------------------------------------------

export interface Seneschal {
  readonly id: string
  readonly name: string
  readonly temper: SeneschalTemper
  readonly locationId: string
}

/**
 * Кто держит место за тебя.
 *
 * Выводится из места: у каждого владения свой человек, и он один на всю жизнь
 * этого владения. Вора не подменишь, не сняв его.
 */
export function seneschalOf(locationId: string): Seneschal {
  const hash = hashOf(`seneschal|${locationId}`)
  const temper = SENESCHAL_TEMPERS[hash % SENESCHAL_TEMPERS.length] ?? 'honest'
  return {
    id: `seneschal:${locationId}`,
    name: SENESCHAL_NAMES[(hash >>> 5) % SENESCHAL_NAMES.length] ?? 'слуга',
    temper,
    locationId,
  }
}

export function seneschalDef(temper: SeneschalTemper) {
  return SENESCHAL_TEMPER_DEFS[temper]
}

/**
 * Сколько он берёт себе.
 *
 * При хозяине не берёт никто: считать при живом счёте неудобно. Чем дольше
 * хозяина не было, тем смелее рука — до полной своей доли.
 */
export function skimOf(state: GameState, locationId: string, day: number): number {
  const seneschal = seneschalOf(locationId)
  const def = seneschalDef(seneschal.temper)
  if (def.skim <= 0) return 0
  const away = daysAway(state, locationId, day)
  const boldness = Math.min(1, away / VISIT_STALE)
  return def.skim * boldness
}

/**
 * Сколько суток хозяина здесь не было.
 *
 * Пока он стоит во дворе — нисколько: при живом счёте не крадут и не забывают.
 */
export function daysAway(state: GameState, locationId: string, day: number): number {
  if (state.locationId === locationId) return 0
  return sinceSeen(state, locationId, day)
}

/**
 * Сколько суток прошло с последнего счёта.
 *
 * В отличие от `daysAway`, присутствие тут не считается: можно просидеть в своём
 * доме год и ни разу не заглянуть в книги. Отсюда берётся недоимка, которую
 * заносят на объезде.
 */
export function sinceSeen(state: GameState, locationId: string, day: number): number {
  const seen = state.visits?.[locationId]
  if (seen === undefined) return VISIT_STALE
  return Math.max(0, day - seen)
}

/**
 * Недоимка (В5).
 *
 * Там, где хозяина давно не видели, платят хуже: не бунтуют, просто забывают.
 * Возвращается доля подати, которая до казны доходит.
 */
export function arrearsFactor(state: GameState, locationId: string, day: number): number {
  const away = daysAway(state, locationId, day)
  if (away <= VISIT_FRESH) return 1
  const slip = Math.min(1, (away - VISIT_FRESH) / (VISIT_STALE - VISIT_FRESH))
  return 1 - ARREARS_MAX * slip
}

// --- закон (В3) -------------------------------------------------------------

export interface Law {
  readonly tax: TaxLevel
  readonly toll: TollLevel
  readonly levy: LevyLevel
  readonly justice: JusticeLevel
}

export function lawOf(state: Pick<GameState, 'law'>): Law {
  return state.law ?? PLAIN_LAW
}

export function taxTake(law: Law): number {
  return TAX_DEFS[law.tax].take
}

export function tollTake(law: Law): number {
  return TOLL_DEFS[law.toll].take
}

export function levyRate(law: Law): number {
  return LEVY_DEFS[law.levy].recruits
}

/** Как закон ложится на настроение людей: сумма всех четырёх решений. */
export function lawMood(law: Law): number {
  return (
    TAX_DEFS[law.tax].mood +
    LEVY_DEFS[law.levy].mood +
    JUSTICE_DEFS[law.justice].mood +
    (law.toll === 'greedy' ? -4 : law.toll === 'none' ? 3 : 0)
  )
}

/** Что закон делает с разбоем на своей земле в сутки. */
export function lawBanditry(law: Law): number {
  return JUSTICE_DEFS[law.justice].banditry
}

// --- просьбы (В2) -----------------------------------------------------------

export interface Plea {
  readonly def: PleaDef
  readonly locationId: string
  /** С какого дня просят. */
  readonly since: number
  /** Когда терпение выйдет. */
  readonly untilDay: number
}

export function pleaById(id: string): PleaDef | null {
  return PLEAS_BY_ID[id] ?? null
}

/**
 * Чего хочет это место.
 *
 * Читается из его состояния: голодному нужен амбар, разбойному — застава,
 * обобранному — снятая подать. Одна просьба на место за раз: люди не подают
 * список, они просят о том, что болит сильнее.
 */
export function pleaOf(state: GameState, settlement: Settlement, day: number): Plea | null {
  const id = wantOf(state, settlement)
  if (!id) return null
  const def = pleaById(id)
  if (!def) return null
  const asked = state.pleas?.[settlement.locationId]
  const since = asked?.askId === id ? asked.askedDay : day
  return { def, locationId: settlement.locationId, since, untilDay: since + def.patience }
}

/** О чём болит сильнее всего. */
function wantOf(state: GameState, settlement: Settlement): PleaId | null {
  const fed = foodSecurity(settlement)
  if (fed < 0.75 && !hasBuilding(settlement, 'granary')) return 'granary'
  if (settlement.banditry > 0.35 && !hasBuilding(settlement, 'watchtower')) return 'watchtower'
  if (lawOf(state).tax === 'heavy') return 'tax'
  if (!hasBuilding(settlement, 'mill')) return 'mill'
  if (settlement.population > 1500 && !hasBuilding(settlement, 'walls')) return 'walls'
  if (!hasBuilding(settlement, 'well')) return 'well'
  return 'court'
}

/** Все просьбы со всех своих мест. */
export function pleasOf(state: GameState, day: number): readonly Plea[] {
  const out: Plea[] = []
  for (const settlement of holdingsOf(state.settlements, PLAYER)) {
    if (settlement.population <= 0) continue
    const plea = pleaOf(state, settlement, day)
    if (plea) out.push(plea)
  }
  return out
}

// --- постройки с людьми (В4) ------------------------------------------------

export function workDef(building: BuildingId) {
  return BUILDING_WORK[building] ?? { wages: 1, breaks: 0.0005, repair: 50 }
}

/**
 * Жалованье работникам всех построек этого места в сутки.
 *
 * Встав, постройка уходит из списка места (её как будто нет), — потому здесь
 * считается только то, что работает. Второй довод чинить: неработающая
 * мельница не берёт жалованья, но и хлеба не даёт.
 */
export function worksWages(settlement: Settlement, broken: readonly BuildingId[]): number {
  let wages = 0
  for (const building of settlement.buildings) {
    if (broken.includes(building)) continue
    wages += workDef(building).wages
  }
  return wages
}

export function brokenAt(
  state: Pick<GameState, 'works'>,
  locationId: string,
): readonly BuildingId[] {
  return state.works?.[locationId] ?? []
}

export function isBroken(
  state: Pick<GameState, 'works'>,
  locationId: string,
  building: BuildingId,
): boolean {
  return brokenAt(state, locationId).includes(building)
}

/**
 * Работает ли постройка.
 *
 * Мельница, которая встала, не прибавляет ни хлеба, ни предела: пока её не
 * починят, её как будто нет — она и уходит из списка построек места. Это и есть
 * «постройки с людьми»: они не вечны.
 */
export function working(
  state: Pick<GameState, 'works'>,
  settlement: Settlement,
  building: BuildingId,
): boolean {
  return hasBuilding(settlement, building) && !isBroken(state, settlement.locationId, building)
}

/** Что у этого места стоит сломанным — с именами, для листа владения. */
export function brokenList(
  state: Pick<GameState, 'works'>,
  locationId: string,
): readonly BuildingId[] {
  return brokenAt(state, locationId)
}

/**
 * Во что встаёт починка.
 *
 * Имя нарочно своё: `repairCost` в equipment.ts чинит железо на плечах, а это
 * чинит мельницу. Одно слово на два разных дела путало бы обоих.
 */
export function worksRepairCost(building: BuildingId): number {
  return workDef(building).repair
}
