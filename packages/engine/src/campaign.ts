import { type Band, bandSize } from './band'
import {
  AIM_DEFS,
  CAMPAIGN_WORDS,
  type CampaignAim,
  DISPATCH_DAYS,
  HOST_ORDER_DEFS,
  type HostOrder,
  SUPPLY,
} from './content/campaign'
import type { Settlement } from './economy'
import { PLAYER, holdingsOf } from './holding'
import type { GameState } from './state'
import { seasonOf } from './time'
import { atWar, enemyOf, warsOf } from './war'
import { neighbourSettlements } from './world/queries'
import type { World } from './world/types'

/**
 * Война как кампания (этап 84).
 *
 * Дружины ходят по карте с этапа 29, но война от этого не становится решением:
 * у неё нет цели, фронтов и обоза. Кампания — это то, что превращает движение
 * войск в замысел: зачем воюем, где именно, чем кормим людей и чем всё кончилось.
 *
 * Своё войско здесь — те же `Band`, что и у лордов (этап 29): оно стоит на карте,
 * идёт по дорогам, сходится в стычках и берёт места осадой. Разница одна: его
 * ведут приказы, а не замысел (этап 72).
 */

/** Кампания: зачем и против кого. */
export interface Campaign {
  readonly against: string
  readonly aim: CampaignAim
  readonly sinceDay: number
  /** Что взято и что потеряно — считается по ходу. */
  readonly taken: number
  readonly lost: number
}

/** Донесение, которое ещё идёт. */
export interface Dispatch {
  readonly day: number
  readonly text: string
}

export function aimDef(aim: CampaignAim) {
  return AIM_DEFS[aim]
}

export function orderDef(order: HostOrder) {
  return HOST_ORDER_DEFS[order]
}

export function campaignOf(state: Pick<GameState, 'campaign'>): Campaign | null {
  return state.campaign ?? null
}

/** Свои части на карте: войско, разделённое на то, чем можно распорядиться. */
export function hostsOf(state: Pick<GameState, 'bands'>): readonly Band[] {
  return state.bands.filter((one) => one.lordId === PLAYER)
}

export function hostById(state: Pick<GameState, 'bands'>, id: string): Band | null {
  return hostsOf(state).find((one) => one.id === id) ?? null
}

/**
 * Какая цель подходит этой войне (Ка1).
 *
 * Берётся из повода (этап 65): за землю воюют за землю, за набеги — за чужую
 * рать, за дань — за дань. Свой выбор это не отменяет, но по умолчанию цель уже
 * есть, и она не выдумана.
 */
export function aimFor(state: GameState, against: string): CampaignAim {
  const war = warsOf(state.politics, PLAYER).find((one) => enemyOf(one, PLAYER) === against)
  const kind = war?.casus?.kind
  if (kind === 'march' || kind === 'inherit' || kind === 'relic') return 'takeLand'
  if (kind === 'raids' || kind === 'feud') return 'breakHost'
  if (kind === 'tribute' || kind === 'famine' || kind === 'toll') return 'forceTribute'
  if (!war) return 'defend'
  return 'takeLand'
}

/**
 * Фронты (Ка2).
 *
 * Фронт — не линия на карте, а провинция, в которой стоят твои части: там и идёт
 * война. Считается из того, где они есть, поэтому фронты нельзя «назначить» — их
 * можно только создать, послав людей.
 */
export interface Front {
  readonly provinceId: string
  readonly name: string
  readonly men: number
  readonly hosts: number
  /** Сколько чужих мест в этой провинции. */
  readonly enemyPlaces: number
}

export function frontsOf(state: GameState, world: World): readonly Front[] {
  const fronts = new Map<string, { men: number; hosts: number }>()
  for (const host of hostsOf(state)) {
    const provinceId = world.locations[host.locationId]?.provinceId
    if (!provinceId) continue
    const row = fronts.get(provinceId) ?? { men: 0, hosts: 0 }
    row.men += bandSize(host)
    row.hosts += 1
    fronts.set(provinceId, row)
  }
  const out: Front[] = []
  for (const [provinceId, row] of fronts) {
    const province = world.provinces[provinceId]
    let enemyPlaces = 0
    for (const id of province?.locationIds ?? []) {
      const settlement = state.settlements[id]
      if (!settlement || settlement.population <= 0 || !settlement.owner) continue
      const owner = settlement.owner
      if (owner === PLAYER) continue
      const side = owner.startsWith('crown:')
        ? owner.slice('crown:'.length)
        : (state.politics.lords.find((lord) => lord.id === owner)?.kingdomId ?? null)
      if (side && atWar(state.politics, PLAYER, side)) enemyPlaces += 1
    }
    out.push({
      provinceId,
      name: province?.name ?? provinceId,
      men: row.men,
      hosts: row.hosts,
      enemyPlaces,
    })
  }
  return out.sort((a, b) => b.men - a.men)
}

// --- снабжение (Ка3) --------------------------------------------------------

export type SupplyKind = 'depot' | 'forage' | 'none'

export interface Supply {
  readonly kind: SupplyKind
  /** Сколько хлеба нужно этой части в сутки. */
  readonly needs: number
  /** Откуда берут, если берут. */
  readonly fromId: string | null
  readonly says: string
}

/**
 * Чем кормится эта часть.
 *
 * Своя земля в двух переходах кормит из амбаров; дальше — только с округи, и
 * округа это помнит. Зимой всё дороже.
 */
export function supplyOf(state: GameState, world: World, host: Band, day: number): Supply {
  const men = bandSize(host)
  const winter = seasonOf(day) === 'winter' ? SUPPLY.winter : 1
  const needs = Math.round(men * SUPPLY.perMan * winter * 100) / 100
  const own = holdingsOf(state.settlements, PLAYER)
  const here = state.settlements[host.locationId]
  const depot =
    here && here.owner === PLAYER && here.stock.grain >= needs
      ? here
      : nearestDepot(world, own, host.locationId, needs)
  if (depot) {
    return {
      kind: 'depot',
      needs,
      fromId: depot.locationId,
      says: CAMPAIGN_WORDS.fed,
    }
  }
  if (here && here.population > 0 && here.stock.grain >= needs) {
    return { kind: 'forage', needs, fromId: here.locationId, says: CAMPAIGN_WORDS.forage }
  }
  return { kind: 'none', needs, fromId: null, says: CAMPAIGN_WORDS.hungry }
}

function nearestDepot(
  world: World,
  own: readonly Settlement[],
  from: string,
  needs: number,
): Settlement | null {
  if (own.length === 0) return null
  const near = neighbourSettlements(world, from, SUPPLY.reach)
  const ids = new Set(near.map((one) => one.id))
  return own.find((one) => ids.has(one.locationId) && one.stock.grain >= needs) ?? null
}

// --- донесения (Ка5) --------------------------------------------------------

export function dispatchesOf(state: Pick<GameState, 'dispatches'>): readonly Dispatch[] {
  return state.dispatches ?? []
}

/** Через сколько суток дойдёт весть отсюда. */
export function dispatchDelay(world: World, from: string, to: string): number {
  if (from === to) return 0
  const near = neighbourSettlements(world, to, 8)
  const hops = near.find((one) => one.id === from)?.hops ?? 6
  return Math.max(1, Math.round(hops * DISPATCH_DAYS))
}

// --- итог кампании (Ка6) ----------------------------------------------------

export interface CampaignReport {
  readonly aim: CampaignAim
  readonly against: string
  readonly days: number
  readonly taken: number
  readonly lost: number
  readonly says: string
}

export function campaignReport(state: GameState, campaign: Campaign, day: number): CampaignReport {
  const days = Math.max(0, day - campaign.sinceDay)
  const def = aimDef(campaign.aim)
  const won =
    campaign.aim === 'takeLand'
      ? campaign.taken > 0
      : campaign.aim === 'breakHost'
        ? campaign.taken > 0
        : campaign.aim === 'defend'
          ? campaign.lost === 0
          : false
  return {
    aim: campaign.aim,
    against: campaign.against,
    days,
    taken: campaign.taken,
    lost: campaign.lost,
    says: `${def.label}: ${won ? 'вышло' : 'не вышло'}; ${def.wins} — ${campaign.taken}, своих потеряно ${campaign.lost}, воевали ${Math.round(days / 30)} месяцев.`,
  }
}

export { SUPPLY, type CampaignAim, type HostOrder }
