import type { GoodId } from './content/goods'
import { GOOD_IDS } from './content/goods'
import {
  BERTH_PER_HOUR,
  BOUNTY_PER_STRENGTH,
  CARAVAN_NAMES,
  CARAVAN_SKIM,
  CARAVAN_TEMPERS,
  CARAVAN_TEMPER_DEFS,
  type CaravanTemper,
  GUARDS_PER_HUNDRED,
  GUARD_WAGE,
  INN_PER_TRAVELLER,
  MUTINY_MOOD,
  PATROL_BANDITRY,
  PATROL_COST_PER_HEAD,
  PIRATE_BYNAMES,
  PIRATE_NAMES,
  PORT_SHIPS,
  PORT_SHIP_NAMES,
  SAILOR_WAGE,
  SHORT_CREW_PACE,
  SKIPPER_NAMES,
  SKIPPER_TEMPERS,
  SKIPPER_TEMPER_DEFS,
  type SkipperTemper,
  TRAVELLERS_PER_ROAD,
  WAGONS_PER_HUNDRED,
} from './content/road'
import type { Settlement } from './economy'
import type { Enterprise } from './enterprise'
import { PLAYER } from './holding'
import type { Ship } from './ship'
import { shipDef } from './ship'
import type { GameState } from './state'
import { lanesFrom } from './world/lanes'
import { roadsFrom } from './world/queries'
import type { World } from './world/types'

/**
 * Дела и дороги (этап 62).
 *
 * Дорога перестаёт быть расстоянием, а море — расходом. У обоза есть
 * караванщик и охрана, у своего судна — шкипер и команда, у пристани — суда, а
 * у пиратов — имена и гавани. Люди, как и везде в 0.6, выводятся из того, к чему
 * они приставлены; в состоянии живёт только то, что надо помнить: охрана,
 * команда, настроение палубы.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

// --- караван как люди (К1) --------------------------------------------------

export interface CaravanMaster {
  readonly id: string
  readonly name: string
  readonly temper: CaravanTemper
}

/** Кто ведёт обоз: один человек на всю жизнь этого дела. */
export function caravanMaster(enterpriseId: string): CaravanMaster {
  const hash = hashOf(`caravan|${enterpriseId}`)
  return {
    id: `master:${enterpriseId}`,
    name: CARAVAN_NAMES[hash % CARAVAN_NAMES.length] ?? 'караванщик',
    temper: CARAVAN_TEMPERS[(hash >>> 5) % CARAVAN_TEMPERS.length] ?? 'steady',
  }
}

export function caravanTemperDef(temper: CaravanTemper) {
  return CARAVAN_TEMPER_DEFS[temper]
}

/** Сколько повозок в обозе: по вложенному. */
export function wagonsOf(enterprise: Enterprise): number {
  return Math.max(1, Math.round((enterprise.invested / 100) * WAGONS_PER_HUNDRED))
}

/** Скольких охранников такой обоз вообще может взять. */
export function guardLimit(enterprise: Enterprise): number {
  return Math.max(2, Math.round((enterprise.invested / 100) * GUARDS_PER_HUNDRED) + 2)
}

export function guardsOf(enterprise: Enterprise): number {
  return Math.max(0, Math.min(guardLimit(enterprise), enterprise.guards ?? 0))
}

/** Жалованье охране в сутки. */
export function guardWages(enterprise: Enterprise): number {
  return guardsOf(enterprise) * GUARD_WAGE
}

/**
 * Насколько обоз рискует на этом плече.
 *
 * Риск — от разбоя на дороге, от смелости караванщика и от того, сколько при
 * обозе людей. Охрана не отменяет разбой, но делает нападение невыгодным.
 */
export function raidRisk(enterprise: Enterprise, banditry: number): number {
  const master = caravanMaster(enterprise.id)
  const daring = caravanTemperDef(master.temper).daring
  const guards = guardsOf(enterprise)
  const cover = 1 / (1 + guards * 0.35)
  return Math.max(0, Math.min(0.9, banditry * daring * cover))
}

/** Что караванщик берёт себе с выручки. */
export function masterSkim(enterprise: Enterprise): number {
  return caravanMaster(enterprise.id).temper === 'greedy' ? CARAVAN_SKIM : 0
}

/** Во сколько раз он выторговывает лучше или хуже обычного. */
export function masterTrade(enterprise: Enterprise): number {
  return caravanTemperDef(caravanMaster(enterprise.id).temper).trade
}

// --- постоялый двор (К2) ----------------------------------------------------

/**
 * Сколько проезжих в сутки проходит через это место.
 *
 * Дороги от места и покой на них: на большой дороге двор кормит, на глухой
 * стоит пустым. В разбойной округе не ездят вовсе.
 */
export function travellersAt(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  locationId: string,
): number {
  const roads = roadsFrom(world, locationId).length
  const lanes = lanesFrom(world, locationId).length
  const here = settlements[locationId]
  const peace = 1 - (here?.banditry ?? 0)
  const people = Math.min(2, (here?.population ?? 0) / 2000)
  return Math.max(0, (roads + lanes * 1.5) * TRAVELLERS_PER_ROAD * peace * (0.5 + people))
}

/** Что двор берёт с проезжих за сутки. */
export function innIncome(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  locationId: string,
): number {
  return Math.round(travellersAt(world, settlements, locationId) * INN_PER_TRAVELLER)
}

// --- дорога с хозяином (К3) -------------------------------------------------

export interface OwnRoad {
  readonly fromId: string
  readonly toId: string
  readonly hours: number
  /** Средний разбой на концах: по нему и судят о дороге. */
  readonly banditry: number
}

/**
 * Дороги между своими местами.
 *
 * Дорога считается твоей, когда твои оба её конца: держать чужую дорогу нельзя,
 * а свою — можно и нужно, иначе по ней перестанут ездить.
 */
export function ownRoads(state: GameState): readonly OwnRoad[] {
  const out: OwnRoad[] = []
  const seen = new Set<string>()
  for (const [id, settlement] of Object.entries(state.settlements)) {
    if (settlement.owner !== PLAYER) continue
    for (const road of roadsFrom(state.world, id)) {
      if (state.settlements[road.to]?.owner !== PLAYER) continue
      const key = [id, road.to].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      const a = state.settlements[id]?.banditry ?? 0
      const b = state.settlements[road.to]?.banditry ?? 0
      out.push({ fromId: id, toId: road.to, hours: road.hours, banditry: (a + b) / 2 })
    }
  }
  return out
}

/** Во что встаёт разъезд по дороге: по людям, которых на неё ставят. */
export function patrolCost(road: OwnRoad, riders: number): number {
  return Math.round(Math.max(2, riders) * PATROL_COST_PER_HEAD * Math.max(1, road.hours / 6))
}

/** Насколько разъезд сбивает разбой на концах дороги. */
export function patrolEffect(riders: number): number {
  return Math.min(0.4, PATROL_BANDITRY * (1 + riders / 12))
}

// --- команда и шкипер (К4) --------------------------------------------------

export interface Skipper {
  readonly id: string
  readonly name: string
  readonly temper: SkipperTemper
}

/** Кто ведёт твоё судно. Один на судно, пока судно твоё. */
export function skipperOf(ship: Ship): Skipper {
  const hash = hashOf(`skipper|${ship.name}|${ship.kind}`)
  return {
    id: `skipper:${ship.name}`,
    name: SKIPPER_NAMES[hash % SKIPPER_NAMES.length] ?? 'шкипер',
    temper: SKIPPER_TEMPERS[(hash >>> 6) % SKIPPER_TEMPERS.length] ?? 'sober',
  }
}

export function skipperDef(temper: SkipperTemper) {
  return SKIPPER_TEMPER_DEFS[temper]
}

/** Сколько рук нужно такому судну. */
export function crewNeeded(ship: Ship): number {
  return Math.max(3, Math.round(shipDef(ship).carries * 0.35))
}

export function crewOf(ship: Ship): number {
  return Math.max(0, ship.crew ?? 0)
}

export function crewMood(ship: Ship): number {
  return Math.max(0, Math.min(100, ship.mood ?? 60))
}

/** Жалованье команде в сутки. */
export function crewWages(ship: Ship | null): number {
  return ship ? crewOf(ship) * SAILOR_WAGE : 0
}

/** Хватает ли рук: недобор замедляет ход. */
export function crewPace(ship: Ship): number {
  const need = crewNeeded(ship)
  const have = crewOf(ship)
  if (have >= need) return skipperDef(skipperOf(ship).temper).pace
  const short = (need - have) / need
  return skipperDef(skipperOf(ship).temper).pace * (1 + short * (SHORT_CREW_PACE - 1))
}

/** Пора ли ждать бунта. */
export function mutinous(ship: Ship): boolean {
  return crewOf(ship) > 0 && crewMood(ship) < MUTINY_MOOD
}

export function moodWord(mood: number): string {
  if (mood < MUTINY_MOOD) return 'палуба ропщет'
  if (mood < 45) return 'молчат'
  if (mood < 70) return 'как обычно'
  return 'пойдут за тобой'
}

// --- порт как место (К5) ----------------------------------------------------

export interface PortShip {
  readonly id: string
  readonly name: string
  readonly skipper: string
  readonly temper: SkipperTemper
  /** Откуда пришёл: место, с которым есть морской путь. */
  readonly fromId: string
  /** Что привёз и чем торгует. */
  readonly cargo: GoodId
  /** За сколько возьмёт тебя до своей гавани. */
  readonly berth: number
}

/**
 * Кто стоит у пристани сегодня.
 *
 * Выводится из места и дня, как купцы на рынке: пристань живёт, но помнить о
 * ней нечего — завтра там будут другие.
 */
export function shipsAt(world: World, locationId: string, day: number): readonly PortShip[] {
  const lanes = lanesFrom(world, locationId)
  if (lanes.length === 0) return []
  const base = hashOf(`${locationId}|${day}`)
  const span = PORT_SHIPS.max - PORT_SHIPS.min + 1
  const count = PORT_SHIPS.min + (base % span)
  const out: PortShip[] = []
  for (let index = 0; index < count; index += 1) {
    const hash = hashOf(`${locationId}|${day}|${index}`)
    const lane = lanes[hash % lanes.length]
    if (!lane) continue
    out.push({
      id: `portship:${locationId}:${day}:${index}`,
      name: PORT_SHIP_NAMES[(hash >>> 3) % PORT_SHIP_NAMES.length] ?? 'судно',
      skipper: SKIPPER_NAMES[(hash >>> 7) % SKIPPER_NAMES.length] ?? 'шкипер',
      temper: SKIPPER_TEMPERS[(hash >>> 11) % SKIPPER_TEMPERS.length] ?? 'sober',
      fromId: lane.to,
      cargo: GOOD_IDS[(hash >>> 15) % GOOD_IDS.length] ?? 'fish',
      berth: Math.max(8, Math.round(lane.hours * BERTH_PER_HOUR)),
    })
  }
  return out
}

// --- пираты с лицом (К6) ----------------------------------------------------

export interface PirateLord {
  readonly id: string
  readonly name: string
  readonly byname: string
  /** Гавань: глухое место у воды, откуда он выходит. */
  readonly lairId: string
  /** Сила дружины: из неё собирается отряд в бою. */
  readonly strength: number
}

/**
 * Морские лорды этого мира.
 *
 * Выводятся из карты: у каждой короны с берегом есть своя беда, и сидит она в
 * глухом месте у воды. Их немного и они одни и те же — потому за их головы и
 * можно объявлять цену.
 */
export function pirateLords(world: World): readonly PirateLord[] {
  const lairs = Object.values(world.locations)
    .filter((place) => place.shore && lanesFrom(world, place.id).length === 0)
    .sort((a, b) => hashOf(a.id) - hashOf(b.id))
    .slice(0, PIRATE_NAMES.length)
  return lairs.map((lair, index) => {
    const hash = hashOf(`pirate|${lair.id}`)
    return {
      id: `pirate:${lair.id}`,
      name: PIRATE_NAMES[index % PIRATE_NAMES.length] ?? 'пират',
      byname: PIRATE_BYNAMES[(hash >>> 4) % PIRATE_BYNAMES.length] ?? '',
      lairId: lair.id,
      strength: 14 + (hash % 22),
    }
  })
}

export function pirateById(world: World, id: string): PirateLord | null {
  return pirateLords(world).find((one) => one.id === id) ?? null
}

/** Чей это берег: ближайший морской лорд к этой гавани. */
export function pirateNear(world: World, locationId: string): PirateLord | null {
  const place = world.locations[locationId]
  if (!place) return null
  const lords = pirateLords(world)
  let best: PirateLord | null = null
  let closest = Number.POSITIVE_INFINITY
  for (const lord of lords) {
    const lair = world.locations[lord.lairId]
    if (!lair) continue
    const distance = Math.hypot(lair.x - place.x, lair.y - place.y)
    if (distance < closest) {
      closest = distance
      best = lord
    }
  }
  return best
}

/** Цена за голову: её объявляет гавань, которой он надоел. */
export function bountyFor(lord: PirateLord): number {
  return lord.strength * BOUNTY_PER_STRENGTH
}
