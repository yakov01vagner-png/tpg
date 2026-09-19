import type { Band } from './band'
import type { GoodId } from './content/goods'
import {
  CACHE_RETURNS,
  DENIZEN_DEFS,
  type Denizen,
  HERMIT_GIFTS,
  HERMIT_GIFT_DEFS,
  HERMIT_NAMES,
  HERMIT_RETURNS,
  HUNTS,
  HUNT_CLIMATE,
  HUNT_HURT,
  HUNT_SEASON,
  type HermitGift,
  LAIR_RETURNS,
  LAIR_STRENGTH,
  type TrackKind,
  WILD_ERA,
} from './content/wild'
import type { GameState } from './state'
import { type Season, seasonOf } from './time'
import { climateAt } from './world/climate'
import type { SiteKind, Terrain } from './world/types'
import { isSite } from './world/types'
import type { World } from './world/types'

/**
 * Глушь изнутри (этап 63).
 *
 * Кто здесь живёт — выводится из места и времени, как купцы из рынка (этап 49):
 * в состоянии лежит только память о том, что ты с этим сделал. Оттого глушь и
 * меняется: логово, которое вывели, заводится снова через полтора года, схрон
 * наполняют заново, а на пустое место однажды приходит новый отшельник.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Что помнит игра о твоих делах в этой глуши. */
export interface WildMemory {
  readonly clearedDay?: number
  readonly lootedDay?: number
  readonly metDay?: number
}

export function wildAt(state: Pick<GameState, 'wilds'>, locationId: string): WildMemory {
  return state.wilds?.[locationId] ?? {}
}

/**
 * Кто в этой глуши сейчас.
 *
 * Век глуши — восемь месяцев: столько держится одно и то же. Выведенное логово
 * пусто до срока, обобранный схрон пуст до срока, ушедший отшельник не
 * возвращается вовсе — приходит другой.
 */
export function denizenOf(
  world: World,
  state: Pick<GameState, 'wilds'>,
  locationId: string,
  day: number,
): Denizen {
  const place = world.locations[locationId]
  if (!place || !isSite(place.archetype)) return 'none'
  const era = Math.floor(day / WILD_ERA)
  const hash = hashOf(`${locationId}|${era}`)
  const roll = hash % 100
  // Что бывает в глуши: чаще всего ничего, потом логово, реже схрон и совсем
  // редко — человек, который ушёл от людей.
  const base: Denizen = roll < 38 ? 'none' : roll < 68 ? 'lair' : roll < 88 ? 'cache' : 'hermit'
  const memory = wildAt(state, locationId)
  if (base === 'lair' && memory.clearedDay !== undefined) {
    return day - memory.clearedDay < LAIR_RETURNS ? 'none' : 'lair'
  }
  if (base === 'cache' && memory.lootedDay !== undefined) {
    return day - memory.lootedDay < CACHE_RETURNS ? 'none' : 'cache'
  }
  if (base === 'hermit' && memory.metDay !== undefined) {
    // Отшельник не возвращается: тот, кого ты видел, уходит дальше в глушь, и
    // на его место через два года садится другой.
    return day - memory.metDay < HERMIT_RETURNS ? 'none' : 'hermit'
  }
  return base
}

export function denizenDef(denizen: Denizen) {
  return DENIZEN_DEFS[denizen]
}

/** Сила зверя в логове: от земли, а не от случая. */
export function lairStrength(world: World, locationId: string): number {
  const terrain = world.locations[locationId]?.terrain
  return terrain ? (LAIR_STRENGTH[terrain] ?? 8) : 8
}

export interface Hermit {
  readonly id: string
  readonly name: string
  readonly gift: HermitGift
}

/** Кто здесь сидит: имя и то, чем он полезен. */
export function hermitOf(locationId: string, day: number): Hermit {
  const era = Math.floor(day / WILD_ERA)
  const hash = hashOf(`hermit|${locationId}|${era}`)
  return {
    id: `hermit:${locationId}`,
    name: HERMIT_NAMES[hash % HERMIT_NAMES.length] ?? 'старик',
    gift: HERMIT_GIFTS[(hash >>> 6) % HERMIT_GIFTS.length] ?? 'lore',
  }
}

export function hermitGiftDef(gift: HermitGift) {
  return HERMIT_GIFT_DEFS[gift]
}

// --- охота (Ш2) -------------------------------------------------------------

export function huntDef(terrain: Terrain) {
  return HUNTS[terrain] ?? null
}

/**
 * Насколько здесь есть на кого охотиться.
 *
 * Земля, время года и климат вместе: зимой на севере голодно, осенью в лесу
 * сытно. Ниже нуля не бывает — бывает «почти ничего».
 */
export function gameHere(world: World, locationId: string, day: number): number {
  const place = world.locations[locationId]
  if (!place) return 0
  const def = huntDef(place.terrain)
  if (!def) return 0
  const season = seasonOf(day) as Season
  const climate = climateAt({ x: place.x, y: place.y })
  return def.game * (HUNT_SEASON[season] ?? 1) * HUNT_CLIMATE[climate]
}

/** Удача охоты при таком выживании. */
export function huntChance(game: number, survival: number): number {
  return Math.max(0.05, Math.min(0.92, game * (0.35 + survival * 0.035)))
}

/** Сколько принесёт удачная охота. */
export function huntYield(game: number, survival: number): number {
  return Math.max(1, Math.round(game * (2 + survival * 0.25)))
}

/** Что именно приносят из этой земли. */
export function huntSpoils(world: World, locationId: string): readonly GoodId[] {
  const terrain = world.locations[locationId]?.terrain
  return terrain ? (huntDef(terrain)?.spoils ?? []) : []
}

export function huntHurtChance(survival: number): number {
  return Math.max(0.02, HUNT_HURT - survival * 0.004)
}

// --- следы (Ш5) -------------------------------------------------------------

/**
 * Что видно на дороге.
 *
 * Следы не выдумываются: их оставляют те, кто и правда ходил рядом. Дружина в
 * дне пути — колея и кострища; обоз — навоз и рогожа; голодная округа —
 * босые следы. Пусто — тоже ответ, и он тоже что-то значит.
 */
export function tracksAt(
  world: World,
  bands: readonly Band[],
  state: Pick<GameState, 'settlements'>,
  locationId: string,
  day: number,
): TrackKind {
  const place = world.locations[locationId]
  if (!place) return 'none'
  const near = bands.filter((band) => {
    const at = world.locations[band.locationId]
    if (!at) return false
    return Math.hypot(at.x - place.x, at.y - place.y) < 90
  })
  if (near.length > 0) return 'host'
  // Голодная округа гонит людей по дорогам.
  const hungry = Object.values(state.settlements).some((one) => {
    const at = world.locations[one.locationId]
    if (!at || one.population <= 0) return false
    if (Math.hypot(at.x - place.x, at.y - place.y) > 120) return false
    return one.stock.grain < one.population * 0.4
  })
  if (hungry) return 'refugees'
  const hash = hashOf(`${locationId}|${day}`)
  const roll = hash % 100
  if (roll < 40) return 'wagons'
  if (roll < 55) return 'beast'
  return 'none'
}

export const WILD_SITE_KINDS: readonly SiteKind[] = [
  'barrow',
  'ruins',
  'wilds',
  'grove',
  'lodge',
  'oasis',
  'quarry',
  'shrine',
  'spring',
]
