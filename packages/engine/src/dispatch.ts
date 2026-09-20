import { type Band, bandSize } from './band'
import type { HostOrder } from './content/campaign'
import {
  CAPTAIN_DEFS,
  type CaptainTemper,
  DISPATCH,
  DISPATCH_WORDS,
  INTENT_DEFS,
  type IntentId,
} from './content/dispatch'
import { SENESCHAL_NAMES } from './content/estate'
import { hasBuilding } from './holding'
import { PLAYER } from './holding'
import type { GameState } from './state'
import { neighbourSettlements } from './world/queries'
import type { World } from './world/types'

/**
 * Донесение с поля (этап 111).
 *
 * Приказ этапа 108 шёл в своё место, где его ждали, и обстановка там не
 * менялась. На войне всё иначе: пока гонец едет, война двигается, и приказ
 * приходит к другому дню. Тогда решает тот, кто его получил.
 *
 * Отсюда берётся то, ради чего всё это: приказывать местом («иди туда») на
 * войне хуже, чем приказывать замыслом («держи этот край»). Первое стареет в
 * седле, второе — нет.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

/** Тот, кто водит часть. Выводится из неё, а не хранится (По2). */
export interface Captain {
  readonly hostId: string
  readonly name: string
  readonly temper: CaptainTemper
  /** Умение: 1..10. Чем выше, тем вернее донесение и решение. */
  readonly worth: number
  readonly says: string
}

export function captainOf(host: Band): Captain {
  const seed = hashOf(`captain:${host.id}:${host.lordId}`)
  const tempers = Object.keys(CAPTAIN_DEFS) as CaptainTemper[]
  const temper = tempers[seed % tempers.length] ?? 'dutiful'
  const name = SENESCHAL_NAMES[(seed >>> 5) % SENESCHAL_NAMES.length] ?? 'Воевода'
  const worth = 3 + ((seed >>> 11) % 8)
  const def = CAPTAIN_DEFS[temper]
  return {
    hostId: host.id,
    name,
    temper,
    worth,
    says: `${name}, ${def.label}: ${def.about} Умение ${worth} из десяти.`,
  }
}

/** Приказ, который ещё едет к части (По1). */
export interface FieldOrder {
  readonly id: string
  readonly hostId: string
  readonly order: HostOrder
  readonly targetId: string
  readonly sentDay: number
  readonly arrivesDay: number
  /** Где стояла часть, когда приказ писали: с этим сличают обстановку. */
  readonly wasAt: string
  /** Сколько чужих было рядом, когда приказ писали. */
  readonly wasFoes: number
}

export function fieldOrdersOf(state: Pick<GameState, 'fieldOrders'>): readonly FieldOrder[] {
  return state.fieldOrders ?? []
}

/**
 * Связь (По5).
 *
 * Гонец едет своим ходом; по своей земле быстрее, потому что есть где менять
 * лошадей; там, где по дороге стоят сторожевые башни, весть идёт огнём — за
 * день, а не за неделю. Связь — это то, что строят заранее.
 */
export function linkTo(
  state: GameState,
  world: World,
  from: string,
  to: string,
): { readonly days: number; readonly how: 'rider' | 'ownRoad' | 'fire'; readonly says: string } {
  if (from === to) return { days: 0, how: 'rider', says: 'Часть при тебе: говорить можно словами.' }
  const near = neighbourSettlements(world, to, 9)
  const hops = near.find((one) => one.id === from)?.hops ?? 7
  const between = near.filter((one) => one.hops <= hops)
  const mine = between.filter((one) => state.settlements[one.id]?.owner === PLAYER)
  // Считается не «по самой дороге», а «в этой округе»: гонец едет не по нитке,
  // и важно, есть ли между вами свои дворы, а не лежат ли они строго на пути.
  const towers = mine.filter((one) => {
    const place = state.settlements[one.id]
    return place ? hasBuilding(place, 'watchtower') : false
  })
  const chain = towers.length >= 2
  const own = mine.length >= Math.max(1, Math.floor(hops / 3))
  const speed = chain ? DISPATCH.towerSpeeds : own ? DISPATCH.ownRoadSpeeds : 1
  const days = Math.max(1, Math.round(hops * DISPATCH.daysPerHop * speed))
  return {
    days,
    how: chain ? 'fire' : own ? 'ownRoad' : 'rider',
    says: chain
      ? `${DISPATCH_WORDS.fire} ${towers.length} башен по дороге: ${days} сут.`
      : own
        ? `Своя земля кругом (${mine.length} мест): есть где менять лошадей, ${days} сут.`
        : `Чужой дорогой, ${hops} переходов: ${days} сут.`,
  }
}

/** Насколько обстановка разошлась с той, под которую писали приказ (По1). */
export function driftedFrom(
  state: GameState,
  order: FieldOrder,
  day: number,
): { readonly changed: boolean; readonly share: number; readonly says: string } {
  const host = state.bands.find((one) => one.id === order.hostId)
  if (!host) return { changed: true, share: 1, says: 'Части, которой писали, уже нет.' }
  const moved = host.locationId !== order.wasAt ? 0.5 : 0
  const nowFoes = foesNear(state, host.locationId)
  const was = Math.max(1, order.wasFoes)
  const shifted = Math.min(0.6, Math.abs(nowFoes - order.wasFoes) / was)
  const late = Math.min(0.4, Math.max(0, day - order.sentDay - DISPATCH.staleDays) * 0.05)
  const share = Math.round((moved + shifted + late) * 100) / 100
  return {
    changed: share >= DISPATCH.changed,
    share,
    says:
      share >= DISPATCH.changed
        ? `${DISPATCH_WORDS.late} Писали под ${order.wasFoes} чужих у ${order.wasAt}, застали ${nowFoes}.`
        : 'Обстановка та же, под какую писали.',
  }
}

/** Сколько чужих людей стоит рядом с этим местом. */
export function foesNear(state: GameState, locationId: string): number {
  let men = 0
  for (const band of state.bands) {
    if (band.lordId === PLAYER || band.kingdomId === PLAYER) continue
    if (band.locationId !== locationId) continue
    men += bandSize(band)
  }
  return men
}

/**
 * Что сделает полководец с устаревшим приказом (По2 и По3).
 *
 * Если обстановка та же — сделает велённое. Если разошлась, решает нрав: но
 * решает он не в пустоте, а под твой замысел, если ты его дал. В этом вся
 * разница между «иди туда» и «держи этот край».
 */
export function actsOn(
  state: GameState,
  order: FieldOrder,
  captain: Captain,
  intent: IntentId | null,
  day: number,
): {
  readonly order: HostOrder
  readonly targetId: string
  readonly obeyed: boolean
  readonly says: string
} {
  const drift = driftedFrom(state, order, day)
  if (!drift.changed) {
    return {
      order: order.order,
      targetId: order.targetId,
      obeyed: true,
      says: `${captain.name}: ${DISPATCH_WORDS.obeyed}`,
    }
  }
  const def = CAPTAIN_DEFS[captain.temper]
  // Умелый полководец чаще держится приказа: он понимает, зачем тот был дан.
  const keeps = 1 - def.ownWay + captain.worth / 40
  if (keeps >= 1) {
    return {
      order: order.order,
      targetId: order.targetId,
      obeyed: true,
      says: `${captain.name} (${def.label}): приказ устарел, но исполнил. ${drift.says}`,
    }
  }
  const falls = intent ? INTENT_DEFS[intent].falls : def.falls
  const chosen: HostOrder = falls === 'attack' ? 'advance' : falls === 'back' ? 'home' : 'hold'
  const host = state.bands.find((one) => one.id === order.hostId)
  const where = chosen === 'advance' ? order.targetId : (host?.locationId ?? order.wasAt)
  return {
    order: chosen,
    targetId: where,
    obeyed: false,
    says: intent
      ? `${captain.name} (${def.label}): ${DISPATCH_WORDS.intent} Замысел «${INTENT_DEFS[intent].label}» — ${INTENT_DEFS[intent].about}`
      : `${captain.name} (${def.label}): ${DISPATCH_WORDS.ownWay} ${drift.says}`,
  }
}

/**
 * Донесение с поля (По4).
 *
 * То, что тебе доложили, не всегда то, что там случилось: горячий прибавляет,
 * осторожный убавляет, расстояние портит и то, и другое. Число приходит с
 * поправкой, и поправку эту ты не видишь.
 */
export function fieldReport(
  state: GameState,
  world: World,
  host: Band,
  day: number,
): {
  readonly truth: number
  readonly told: number
  readonly off: number
  readonly says: string
} {
  const captain = captainOf(host)
  const def = CAPTAIN_DEFS[captain.temper]
  const truth = bandSize(host)
  const hops = linkTo(state, world, host.locationId, state.locationId).days
  // Умение сужает поправку: хороший полководец врёт меньше, даже когда врёт.
  const gild = def.gilds * (1 - captain.worth / 20)
  const wear = hops * DISPATCH.driftPerHop
  const raw = gild + (gild >= 0 ? wear : -wear)
  const off = Math.round(Math.max(-DISPATCH.maxOff, Math.min(DISPATCH.maxOff, raw)) * 100) / 100
  const told = Math.max(0, Math.round(truth * (1 + off)))
  return {
    truth,
    told,
    off,
    says: `${captain.name} доносит: у него ${told} человек${off === 0 ? '' : '.'}`,
  }
}

export interface OrderLedger {
  readonly sent: number
  readonly onTime: number
  readonly stale: number
  readonly ownWay: number
  readonly says: string
}

/** Приказы в числах (По6). */
export function orderLedger(state: Pick<GameState, 'orderLog'>): OrderLedger {
  const log = state.orderLog ?? { sent: 0, onTime: 0, stale: 0, ownWay: 0 }
  return {
    ...log,
    says:
      log.sent === 0
        ? 'Частям ты пока не приказывал.'
        : `Приказов в поле ${log.sent}: к той же обстановке ${log.onTime}, к другой ${log.stale}; по-своему сделано ${log.ownWay}.`,
  }
}

export { DISPATCH, DISPATCH_WORDS, CAPTAIN_DEFS, INTENT_DEFS, type CaptainTemper, type IntentId }
