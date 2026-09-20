import { PLAYER, holdingsOf } from './holding'
import { type Word, bring, knownTo } from './known'
import type { GameState } from './state'
import { neighbourSettlements } from './world/queries'
import type { World } from './world/types'

/**
 * Свои глаза (этап 102).
 *
 * Из трёх источников знания свои глаза — единственный точный: у них нет вилки и
 * нет чужого интереса. И единственный, который нельзя раздать: государь может
 * послать сто человек, но посмотреть сам — только в одном месте.
 *
 * Отсюда и цена. Объезд державы стоит суток — тех самых, которых не хватает на
 * всё прочее (этап 107), — но возвращает точное знание и память мест о том, что
 * их хозяин приезжал. Поручить посмотреть дешевле временем и дороже точностью:
 * вернётся не «видел сам», а «донесли свои».
 */

export const SIGHT = {
  /** Сколько суток уходит на переход при объезде. */
  daysPerHop: 1.5,
  /** Сколько мест можно объехать за раз. */
  placesAtOnce: 5,
  /** Насколько визит хозяина греет память места. */
  visitMood: 6,
  /** Сколько стоит послать человека посмотреть. */
  lookSilver: 260,
  /** Сколько суток он идёт за каждый переход. */
  lookDaysPerHop: 1.2,
  /** Старше скольких суток знание о своём месте считается несвежим. */
  staleDays: 60,
} as const

export const SIGHT_WORDS = {
  rode: 'Объезд: ты видел это сам.',
  sent: 'Человек послан смотреть.',
  came: 'Посланный вернулся.',
  stale: 'Об этом месте давно ничего не слышно.',
  fresh: 'Об этом месте знаешь свежо.',
} as const

/** Посланный смотреть: ещё не вернулся. */
export interface Look {
  readonly locationId: string
  readonly sentDay: number
  readonly comesDay: number
}

export function looksOf(state: Pick<GameState, 'looks'>): readonly Look[] {
  return state.looks ?? []
}

function hopsBetween(world: World, from: string, to: string): number {
  if (from === to) return 0
  const near = neighbourSettlements(world, from, 9)
  return near.find((one) => one.id === to)?.hops ?? 9
}

export interface TourStop {
  readonly locationId: string
  readonly name: string
  readonly hops: number
  /** Сколько суток твоему знанию об этом месте сейчас. */
  readonly age: number
}

export interface Tour {
  readonly stops: readonly TourStop[]
  readonly days: number
  readonly says: string
}

/**
 * Объезд державы (Г1).
 *
 * Едут туда, где давно не были: список складывается сам — по свежести знания и
 * близости. Столько суток, сколько дорог.
 */
export function tourPlan(state: GameState, world: World, day: number): Tour {
  const mine = holdingsOf(state.settlements, PLAYER).filter(
    (one) => one.locationId !== state.locationId,
  )
  const stops = mine
    .map((one) => {
      const known = knownTo(state, world, PLAYER, { kind: 'stores', about: one.locationId }, day)
      const age = known.value === null ? 999 : known.age
      return {
        locationId: one.locationId,
        name: world.locations[one.locationId]?.name ?? one.locationId,
        hops: hopsBetween(world, state.locationId, one.locationId),
        age,
      }
    })
    .sort((a, b) => b.age - a.age || a.hops - b.hops)
    .slice(0, SIGHT.placesAtOnce)
  const days = Math.max(
    1,
    Math.round(stops.reduce((sum, one) => sum + one.hops * SIGHT.daysPerHop, 0)),
  )
  return {
    stops,
    days,
    says:
      stops.length === 0
        ? 'Объезжать нечего: вся твоя земля здесь.'
        : `Объезд ${stops.length} мест: ${stops.map((one) => `${one.name} (${one.age >= 999 ? 'не знаешь ничего' : `вести ${one.age} сут.`})`).join(', ')}. Уйдёт ${days} сут.`,
  }
}

/** Увиденное самому: точная весть без вилки (Г2). */
export function sawWord(
  locationId: string,
  kind: Word['kind'],
  value: number | string,
  day: number,
): Word {
  return {
    id: `word:saw:${kind}:${locationId}`,
    to: PLAYER,
    kind,
    about: locationId,
    value,
    source: 'eyes',
    from: null,
    day,
  }
}

export function seeAt(
  words: readonly Word[],
  locationId: string,
  stores: number,
  garrison: number,
  day: number,
): readonly Word[] {
  let next = bring(words, sawWord(locationId, 'stores', stores, day))
  next = bring(next, sawWord(locationId, 'garrison', garrison, day))
  return next
}

/** Сколько стоит послать человека и когда он вернётся (Г4). */
export function lookCost(
  world: World,
  from: string,
  to: string,
): { readonly silver: number; readonly days: number } {
  const hops = hopsBetween(world, from, to)
  return {
    silver: SIGHT.lookSilver,
    days: Math.max(1, Math.round(hops * SIGHT.lookDaysPerHop * 2)),
  }
}

export interface MapRow {
  readonly locationId: string
  readonly name: string
  readonly age: number
  readonly source: string
  readonly fresh: boolean
}

/**
 * Карта знания (Г5).
 *
 * Видно не что происходит, а насколько свежо ты об этом знаешь. Это и есть
 * главный экран версии: он показывает не мир, а твою осведомлённость о нём.
 */
export function knowMap(state: GameState, world: World, day: number): readonly MapRow[] {
  return holdingsOf(state.settlements, PLAYER)
    .map((one) => {
      const known = knownTo(state, world, PLAYER, { kind: 'stores', about: one.locationId }, day)
      const age = known.value === null ? 999 : known.age
      return {
        locationId: one.locationId,
        name: world.locations[one.locationId]?.name ?? one.locationId,
        age,
        source: known.source ?? 'нет вестей',
        fresh: age <= SIGHT.staleDays,
      }
    })
    .sort((a, b) => b.age - a.age)
}

/** Сколько твоей земли ты знаешь несвежо (Г6). */
export function blindShare(state: GameState, world: World, day: number): number {
  const rows = knowMap(state, world, day)
  if (rows.length === 0) return 0
  return Math.round((rows.filter((one) => !one.fresh).length / rows.length) * 100) / 100
}
