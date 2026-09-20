import { bandSize } from './band'
import { BLIND, BLIND_WORDS, DEFECTOR_DEFS, type DefectorKind } from './content/blind'
import { storeDays } from './fort'
import { PLAYER } from './holding'
import { garrisonSize } from './holding'
import { type Known, knownTo } from './known'
import type { Siege } from './siege'
import type { GameState } from './state'
import { atWar } from './war'
import { neighbourSettlements } from './world/queries'
import type { World } from './world/types'

/**
 * Осада вслепую (этап 113).
 *
 * Осада 0.7 шла при открытых картах: осаждающий читал чужой запас числом, а
 * осаждённый знал, идёт ли к нему выручка. От этого осада была задачей на счёт.
 *
 * Здесь обе стороны гадают — и обе могут этим воспользоваться. Догадка не
 * заводит нового состояния: она считается тем же слоем знания (этап 99), только
 * с поправками, которые даёт само стояние под стенами.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

/**
 * Что знает осаждающий о запасе за стенами (Ос1).
 *
 * Долгое стояние само по себе — разведка: видно, чем топят, как часто выходят
 * и сколько выходит. Оттого вилка сужается со временем, а не открывается разом.
 */
export function storesGuess(
  state: GameState,
  world: World,
  siege: Siege,
  day: number,
): Known & { readonly truth: number } {
  const place = state.settlements[siege.locationId]
  const truth = place ? storeDays(place) : 0
  const known = knownTo(state, world, PLAYER, { kind: 'stores', about: siege.locationId }, day)
  // Каждые десять суток под стенами сужают догадку; вылазки — ещё сильнее.
  // Когда не известно ничего, догадка начинается с широкой: осаждающий всё
  // равно что-то думает про чужой хлеб, и думает он наугад.
  const base = known.value === null ? BLIND.blindSpread : known.spread
  const narrows = (siege.days / 10) * BLIND.narrowsPerTenDays
  const spread = Math.max(0.04, Math.round((base - narrows) * 100) / 100)
  const value = known.value ?? Math.round(truth * (1 + spread))
  return {
    ...known,
    truth,
    spread,
    value,
    says:
      siege.days < 10
        ? `${BLIND_WORDS.guessing} По виду — суток на ${value}, но вилка ${Math.round(spread * 100)} из ста.`
        : `${BLIND_WORDS.narrow} Суток на ${value}, вилка ${Math.round(spread * 100)} из ста.`,
  }
}

/** Что знает осаждающий о гарнизоне: вылазки показывают больше, чем стены. */
export function garrisonGuess(
  state: GameState,
  world: World,
  siege: Siege,
  day: number,
): Known & { readonly truth: number } {
  const place = state.settlements[siege.locationId]
  const truth = place ? garrisonSize(place) : 0
  const known = knownTo(state, world, PLAYER, { kind: 'garrison', about: siege.locationId }, day)
  const shown = siege.days > 0 ? BLIND.sallyShows : 0
  const base = known.value === null ? BLIND.blindSpread : known.spread
  const spread = Math.max(0.05, Math.round((base - shown) * 100) / 100)
  return { ...known, truth, spread, value: known.value ?? Math.round(truth * (1 + spread)) }
}

/**
 * Что знает осаждённый: идёт ли выручка (Ос2).
 *
 * За стенами не видно дальше стен. Выручка известна, только если весть о ней
 * успела дойти до того, как город заперли, — и она тоже стареет.
 */
export function reliefKnown(
  state: GameState,
  world: World,
  locationId: string,
  day: number,
): {
  readonly coming: boolean
  readonly known: boolean
  readonly daysAway: number | null
  readonly says: string
} {
  const place = state.settlements[locationId]
  const owner = place?.owner ?? null
  const side = owner?.startsWith('crown:') ? owner.slice(6) : owner
  const near = neighbourSettlements(world, locationId, 6)
  const reach = new Map(near.map((one) => [one.id, one.hops]))
  let best: { hops: number; men: number } | null = null
  for (const band of state.bands) {
    const friendly = band.kingdomId === side || band.lordId === owner
    if (!friendly || bandSize(band) <= 0) continue
    const hops = band.locationId === locationId ? 0 : reach.get(band.locationId)
    if (hops === undefined) continue
    if (!best || hops < best.hops) best = { hops, men: bandSize(band) }
  }
  if (!best) {
    return { coming: false, known: false, daysAway: null, says: BLIND_WORDS.noRelief }
  }
  // Весть о выручке идёт своим ходом: чем она дальше, тем позже о ней узнают.
  const days = Math.max(1, Math.round(best.hops * 1.2))
  const heard = days <= BLIND.reliefWordDays
  return {
    coming: true,
    known: heard,
    daysAway: days,
    says: heard
      ? `За стенами знают: помощь в ${days} сутках, ${best.men} человек. Они будут тянуть.`
      : `Помощь идёт (${days} сут.), но за стенами об этом не знают: ${BLIND_WORDS.noRelief}`,
  }
}

/**
 * Переговоры вслепую (Ос3).
 *
 * Обе стороны торгуются по догадкам, и потому блефовать может каждая. Блеф —
 * это не бросок: он держится ровно настолько, насколько чужая догадка о тебе
 * шире правды.
 */
export function bluffWorth(
  state: GameState,
  world: World,
  siege: Siege,
  day: number,
): {
  readonly gain: number
  readonly holds: boolean
  readonly says: string
} {
  const stores = storesGuess(state, world, siege, day)
  const relief = reliefKnown(state, world, siege.locationId, day)
  // Блеф стоит тем больше, чем меньше у них знания и чем хуже они стоят.
  const theirBlindness = relief.known ? 0 : BLIND.bluffWorth
  const mine = Math.min(BLIND.bluffWorth, stores.spread)
  const gain = Math.round((theirBlindness + mine) * 100) / 100
  // Держится, если твоя уверенность не расходится с тем, что они видят сами.
  const roll = (hashOf(`bluff:${siege.locationId}:${Math.floor(day / 5)}`) % 1000) / 1000
  const holds = roll < 0.5 + gain
  return {
    gain,
    holds,
    says: holds
      ? `${BLIND_WORDS.bluffed} Условия сдвинулись на ${Math.round(gain * 100)} из ста.`
      : BLIND_WORDS.called,
  }
}

/** Тот, кто пришёл из-за стен (Ос4). Выводится из места и дня, а не хранится. */
export interface Defector {
  readonly kind: DefectorKind
  readonly name: string
  readonly saysStores: number
  readonly saysGarrison: number
  readonly truthful: boolean
  readonly says: string
}

export function defectorAt(
  state: GameState,
  siege: Siege,
  day: number,
  bought: boolean,
): Defector | null {
  const place = state.settlements[siege.locationId]
  if (!place) return null
  if (!bought && day % BLIND.defectorBeat !== 0) return null
  const seed = hashOf(`defect:${siege.locationId}:${Math.floor(day / BLIND.defectorBeat)}`)
  // Купленный приходит по заказу; остальные — кто когда.
  const kinds = Object.keys(DEFECTOR_DEFS) as DefectorKind[]
  const kind = bought ? 'bought' : (kinds[seed % kinds.length] ?? 'hungry')
  const def = DEFECTOR_DEFS[kind]
  const truth = storeDays(place)
  const guard = garrisonSize(place)
  // Врущий врёт в одну сторону: ему нужно, чтобы ты ушёл.
  const sign = def.true ? ((seed >>> 7) % 2 === 0 ? 1 : -1) : 1
  return {
    kind,
    name: `${def.label} человек`,
    saysStores: Math.max(0, Math.round(truth * (1 + sign * def.off))),
    saysGarrison: Math.max(0, Math.round(guard * (1 + sign * def.off))),
    truthful: def.true,
    says: `${BLIND_WORDS.came} ${def.about} Говорит: хлеба на ${Math.max(0, Math.round(truth * (1 + sign * def.off)))} суток, за стенами ${Math.max(0, Math.round(guard * (1 + sign * def.off)))} человек.`,
  }
}

/**
 * Ложная выручка (Ос5).
 *
 * Знамёна на холме снимают осады, потому что осаждающий боится оказаться между
 * войском и стенами. Верят тем больше, чем меньше у него глаз вокруг.
 */
export function bannersLift(
  state: GameState,
  world: World,
  locationId: string,
  who: string,
  day: number,
): { readonly lifts: boolean; readonly chance: number; readonly says: string } {
  const near = neighbourSettlements(world, locationId, BLIND.bannerHops)
  const reach = new Set([locationId, ...near.map((one) => one.id)])
  // Чем больше у осаждающего своих глаз кругом, тем меньше он верит холму.
  let eyes = 0
  for (const band of state.bands) {
    const theirs = who === PLAYER ? band.lordId === PLAYER : band.kingdomId === who
    if (theirs && reach.has(band.locationId)) eyes += 1
  }
  const chance = Math.round(Math.max(0.05, 0.7 - eyes * 0.2) * 100) / 100
  const roll = (hashOf(`banners:${locationId}:${who}:${day}`) % 1000) / 1000
  return {
    lifts: roll < chance,
    chance,
    says:
      roll < chance
        ? `${BLIND_WORDS.banners} ${BLIND_WORDS.lifted} (${Math.round(chance * 100)} из ста)`
        : `${BLIND_WORDS.banners} Не поверили: у них ${eyes} своих отрядов кругом.`,
  }
}

/** Кому вообще есть смысл поднимать знамёна: тем, кого осаждают. */
export function besiegedOf(state: GameState, locationId: string): readonly string[] {
  const sides = new Set<string>()
  for (const band of state.bands) {
    if (band.goal.type !== 'siege' || band.goal.targetId !== locationId) continue
    sides.add(band.kingdomId ?? band.lordId)
  }
  return [...sides]
}

export interface SiegeLedger {
  readonly byKnowing: number
  readonly byWalls: number
  readonly bluffs: number
  readonly defectors: number
  readonly says: string
}

/** Осады в числах (Ос6). */
export function siegeLedger(state: Pick<GameState, 'siegeLog'>): SiegeLedger {
  const log = state.siegeLog ?? { byKnowing: 0, byWalls: 0, bluffs: 0, defectors: 0 }
  const all = log.byKnowing + log.byWalls
  return {
    ...log,
    says:
      all === 0
        ? 'Осад ты пока не решал.'
        : `Осад решено ${all}: знанием ${log.byKnowing}, стенами и приступом ${log.byWalls}. Блефов ${log.bluffs}, перебежчиков ${log.defectors}.`,
  }
}

export { BLIND, BLIND_WORDS, DEFECTOR_DEFS, type DefectorKind }
