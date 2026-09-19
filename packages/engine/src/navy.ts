import { type Band, bandSize } from './band'
import {
  NAVY,
  NAVY_WORDS,
  type SeaEnd,
  WARSHIP_DEFS,
  WIND_DEFS,
  type WarshipKind,
  type WindId,
} from './content/navy'
import { PLAYER } from './holding'
import type { GameState } from './state'
import { seasonOf } from './time'
import { isHarbour, lanesFrom } from './world/lanes'
import type { World } from './world/types'

/**
 * Флот и десант (этап 87).
 *
 * Море было дорогой: судно возило людей и товар, шторм трепал корпус, гавань
 * пускала всех. Войны на воде не было — а значит, не было и того, что война на
 * воде делает с сушей: запертой гавани, берега, взятого с моря, и торговли,
 * которую можно душить, не переходя границы.
 *
 * Флот — данные в состоянии, суда — содержимое. Всё, что можно вывести — где
 * блокада кусает, чем кормится десант, кто кого догонит, — выводится.
 */

export interface Warship {
  readonly id: string
  readonly kind: WarshipKind
  readonly name: string
  /** Целость, 0..1. */
  readonly condition: number
  /** Сколько рук на борту. */
  readonly crew: number
  /** В какой гавани стоит. */
  readonly portId: string
  /** С какого дня на плаву; пока не настал — судно на стапеле. */
  readonly readyDay: number
}

/** Блокада чужой гавани. */
export interface Blockade {
  readonly locationId: string
  readonly sinceDay: number
  /** Сколько судов держат запор. */
  readonly ships: number
}

/** Корсарская грамота: разбой на воде, разрешённый короной. */
export interface Letter {
  readonly fromKingdom: string
  readonly against: string
  readonly untilDay: number
}

export function warshipDef(kind: WarshipKind) {
  return WARSHIP_DEFS[kind]
}

export function navyOf(state: Pick<GameState, 'navy'>): readonly Warship[] {
  return state.navy ?? []
}

/** Суда, которые уже сошли со стапеля. */
export function afloat(state: Pick<GameState, 'navy'>, day: number): readonly Warship[] {
  return navyOf(state).filter((one) => one.readyDay <= day)
}

export function blockadesOf(state: Pick<GameState, 'blockades'>): readonly Blockade[] {
  return state.blockades ?? []
}

// --- сила флота (Ф1, Ф2) ----------------------------------------------------

/** Чего стоит судно в бою: железо, руки и целость вместе. */
export function shipForce(ship: Warship): number {
  const def = WARSHIP_DEFS[ship.kind]
  const hands = Math.min(1, ship.crew / def.crew)
  return Math.round(def.fight * hands * ship.condition * 10) / 10
}

export function fleetForce(ships: readonly Warship[]): number {
  return Math.round(ships.reduce((sum, one) => sum + shipForce(one), 0) * 10) / 10
}

/** Сколько людей флот поднимет разом. */
export function fleetCarries(ships: readonly Warship[]): number {
  return ships.reduce((sum, one) => sum + WARSHIP_DEFS[one.kind].carries, 0)
}

export function fleetUpkeep(ships: readonly Warship[]): number {
  return ships.reduce((sum, one) => sum + WARSHIP_DEFS[one.kind].upkeep, 0)
}

/**
 * Каким ветром встретились (Ф2).
 *
 * Ветер не бросают кубиком: он выводится из дня и места, как погода на суше
 * (этап 37). Из одного сейва один и тот же бой.
 */
export function windAt(day: number, locationId: string): WindId {
  let hash = 2166136261
  const text = `wind:${locationId}:${Math.floor(day / 3)}`
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const mixed = ((hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0) % 10
  const winter = seasonOf(day) === 'winter'
  if (mixed < (winter ? 2 : 4)) return 'fair'
  if (mixed < (winter ? 6 : 8)) return 'cross'
  return 'foul'
}

export interface SeaFight {
  readonly end: SeaEnd
  readonly wind: WindId
  readonly ours: number
  readonly theirs: number
  /** Сколько своих судов ко дну. */
  readonly lostShips: number
  /** Сколько чужих. */
  readonly sunkShips: number
  readonly says: string
}

/**
 * Морское сражение (Ф2).
 *
 * Считается силой, ветром и разницей хода: ходкое судно уходит от тяжёлого,
 * тяжёлое ломает лёгкое. Бросок один — на то, насколько дело вышло за рамки
 * расчёта; из одного зерна выходит один и тот же бой.
 */
export function seaFight(
  ours: readonly Warship[],
  theirs: readonly Warship[],
  wind: WindId,
  roll: number,
): SeaFight {
  const our = fleetForce(ours) * WIND_DEFS[wind].edge
  const foe = fleetForce(theirs)
  const edge = foe > 0 ? our / foe : 9
  // Бросок гуляет на четверть в обе стороны: море не считается на глаз.
  const margin = edge * (0.75 + roll * 0.5)
  const ourPace = paceOf(ours)
  const foePace = paceOf(theirs)
  let end: SeaEnd
  if (margin >= 1.6) end = 'sunk'
  else if (margin >= 1.1) end = 'boarded'
  else if (foePace < ourPace) end = 'fled'
  else end = 'lost'
  const lostShips =
    end === 'lost'
      ? Math.max(1, Math.round(ours.length * 0.4))
      : end === 'fled'
        ? 0
        : Math.round(ours.length * (end === 'sunk' ? 0.05 : 0.15))
  const sunkShips =
    end === 'sunk'
      ? Math.max(1, Math.round(theirs.length * 0.6))
      : end === 'boarded'
        ? Math.max(1, Math.round(theirs.length * 0.35))
        : 0
  return {
    end,
    wind,
    ours: Math.round(our * 10) / 10,
    theirs: Math.round(foe * 10) / 10,
    lostShips,
    sunkShips,
    says: `${WIND_DEFS[wind].label}: ${Math.round(our)} против ${Math.round(foe)} — ${endWord(end)}; своих ко дну ${lostShips}, чужих ${sunkShips}.`,
  }
}

function endWord(end: SeaEnd): string {
  return end === 'sunk'
    ? 'чужие суда потоплены'
    : end === 'boarded'
      ? 'палубы взяты на абордаж'
      : end === 'fled'
        ? 'разошлись: чужие ушли'
        : 'свои разбиты'
}

function paceOf(ships: readonly Warship[]): number {
  if (ships.length === 0) return 1
  return Math.max(...ships.map((one) => WARSHIP_DEFS[one.kind].pace))
}

/**
 * Флот короны (Ф1, Ф2).
 *
 * Хранить чужие корабли незачем: флот выводится из гаваней короны, её войн и
 * зерна имени — как купцы (этап 49) и крепости (этап 85). Воюющая корона
 * держит на воде больше, чем мирная, а безгаванная — ничего.
 */
export function crownFleet(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): readonly Warship[] {
  const harbours: string[] = []
  const mine = new Set(
    state.politics.lords.filter((lord) => lord.kingdomId === kingdomId).map((lord) => lord.id),
  )
  for (const one of Object.values(state.settlements)) {
    if (!one.owner) continue
    if (one.owner !== `crown:${kingdomId}` && !mine.has(one.owner)) continue
    if (isHarbour(world, one.locationId)) harbours.push(one.locationId)
  }
  if (harbours.length === 0) return []
  const wars = state.politics.wars.filter(
    (war) => war.a === kingdomId || war.b === kingdomId,
  ).length
  const ships: Warship[] = []
  for (const [index, portId] of harbours.entries()) {
    const seed = shipSeed(`${kingdomId}:${portId}`)
    const many = 1 + (wars > 0 ? 1 : 0) + (seed % 2)
    for (let i = 0; i < many; i += 1) {
      const kind: WarshipKind =
        (seed + i) % 5 === 0 ? 'nasad' : (seed + i) % 2 === 0 ? 'battleLadya' : 'ushkuy'
      const def = WARSHIP_DEFS[kind]
      ships.push({
        id: `crown:${kingdomId}:${index}:${i}`,
        kind,
        name: `${kingdomId}-${index}-${i}`,
        condition: 0.75 + ((seed >>> (i + 3)) % 25) / 100,
        crew: Math.round(def.crew * (wars > 0 ? 1 : 0.8)),
        portId,
        readyDay: day - 1,
      })
    }
  }
  return ships
}

function shipSeed(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return ((hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0) % 997
}

// --- десант (Ф3) ------------------------------------------------------------

/** Куда можно высадиться из этой гавани: берега в одном морском переходе. */
export function landingSites(world: World, fromId: string): readonly string[] {
  if (!isHarbour(world, fromId)) return []
  return lanesFrom(world, fromId)
    .map((lane) => lane.to)
    .filter((id) => id !== fromId)
}

/**
 * Чем кормится десант (Ф3).
 *
 * Войско на чужом берегу живёт морем: пока своя гавань рядом и флот на плаву,
 * подвоз идёт. Потеряли флот или заперли гавань — десант отрезан, и это
 * считается прежде любого боя.
 */
export function seaSupplied(
  state: GameState,
  world: World,
  host: Band,
  day: number,
): { readonly fed: boolean; readonly says: string } {
  const ships = afloat(state, day)
  if (ships.length === 0) return { fed: false, says: NAVY_WORDS.cutOff }
  const shut = new Set(blockadesOf(state).map((one) => one.locationId))
  const near = new Set(landingSites(world, host.locationId))
  const port = ships.find(
    (one) => !shut.has(one.portId) && (one.portId === host.locationId || near.has(one.portId)),
  )
  if (!port) return { fed: false, says: NAVY_WORDS.cutOff }
  return { fed: true, says: NAVY_WORDS.supplied }
}

/** Сколько людей теряет десант на урезе воды. */
export function landingLoss(men: number, defended: boolean): number {
  return Math.round(men * NAVY.landingLoss * (defended ? 2.5 : 1))
}

// --- блокада (Ф4) -----------------------------------------------------------

/** Во что блокада обходится запертому месту за сутки. */
export function blockadeBite(
  state: GameState,
  locationId: string,
): { readonly trade: number; readonly mood: number; readonly toll: number } {
  const settlement = state.settlements[locationId]
  const size = settlement ? Math.min(3, 0.5 + settlement.population / 4000) : 1
  return {
    trade: NAVY.blockadeTrade,
    mood: NAVY.blockadeMood * size,
    toll: Math.round(NAVY.blockadeToll * size),
  }
}

// --- корсары (Ф5) -----------------------------------------------------------

export function letterOf(state: Pick<GameState, 'letter'>): Letter | null {
  return state.letter ?? null
}

/**
 * Что возьмёт корсар с чужой торговли (Ф5).
 *
 * Считается по гавани: у богатого порта и добыча богатая. Грамота не меняет
 * добычи — она меняет то, кем тебя считают.
 */
export function prizeAt(state: GameState, locationId: string): number {
  const settlement = state.settlements[locationId]
  if (!settlement) return 0
  const trade = Object.values(settlement.stock).reduce((sum, one) => sum + (one ?? 0), 0)
  return Math.round(trade * NAVY.prize * 0.1)
}

// --- море в отчёте (Ф6) -----------------------------------------------------

export interface SeaLedger {
  readonly ships: number
  readonly building: number
  readonly force: number
  readonly carries: number
  readonly upkeep: number
  readonly blockades: number
  readonly says: string
}

export function seaLedger(state: GameState, day: number): SeaLedger {
  const ships = afloat(state, day)
  const building = navyOf(state).length - ships.length
  const blockades = blockadesOf(state).length
  return {
    ships: ships.length,
    building,
    force: fleetForce(ships),
    carries: fleetCarries(ships),
    upkeep: fleetUpkeep(ships),
    blockades,
    says:
      ships.length === 0 && building === 0
        ? NAVY_WORDS.noFleet
        : `Судов на плаву ${ships.length}${building > 0 ? `, на стапеле ${building}` : ''}: сила ${fleetForce(ships)}, поднимет ${fleetCarries(ships)} человек, стоит ${fleetUpkeep(ships)} в сутки${blockades > 0 ? `; заперто гаваней ${blockades}` : ''}.`,
  }
}

/** Сколько своих людей сейчас на чужом берегу. */
export function landed(state: GameState): number {
  return state.bands
    .filter((one) => one.lordId === PLAYER && one.id.startsWith('landing:'))
    .reduce((sum, one) => sum + bandSize(one), 0)
}

export { NAVY, type WarshipKind, type WindId, type SeaEnd }
