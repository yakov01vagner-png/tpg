import { GOSSIP, GOSSIP_WORDS, TALK_WORDS, type TalkKind } from './content/gossip'
import { PLAYER } from './holding'
import { type Word, bring } from './known'
import type { GameState } from './state'
import { neighbourSettlements } from './world/queries'
import type { World } from './world/types'

/**
 * Молва (этап 101).
 *
 * Третий источник знания после своих глаз и своих людей — и самый странный из
 * них: он бесплатный, быстрый и почти всегда неточный, но иногда приносит то,
 * чего не принесёт никто. Молва ходит по местам, искажается на каждом переходе
 * и стихает сама, если её не подогревать.
 *
 * В состоянии лежит сама молва — где ходит, с какого дня и что говорит. Всё
 * остальное считается: до кого дошла, во что превратилось число, жива ли она
 * ещё. Дойдя до человека, молва становится обычной вестью (этап 99) с источником
 * «ходит молва» — и дальше стареет, как всякая весть.
 */

export interface Talk {
  readonly id: string
  readonly kind: TalkKind
  /** О ком или о чём говорят. */
  readonly about: string
  /** Что говорят: то, во что превратилась правда по дороге. */
  readonly value: number | string
  /** Есть ли в ней зерно. */
  readonly sooth: boolean
  readonly bornDay: number
  /** Где о ней говорят. */
  readonly places: readonly string[]
  /** Кто её пустил, если это сделали нарочно. */
  readonly by: string | null
  /** Уличена ли она. */
  readonly exposed?: boolean
}

export function gossipOf(state: Pick<GameState, 'gossip'>): readonly Talk[] {
  return state.gossip ?? []
}

export function talkWords(talk: Talk): string {
  return `${TALK_WORDS[talk.kind].says} ${talk.value}${talk.exposed ? ' (уличено во лжи)' : ''}`
}

/** Жива ли молва: без подогрева она стихает сама (М1). */
export function alive(talk: Talk, day: number): boolean {
  if (talk.exposed) return false
  return day - talk.bornDay <= GOSSIP.livesDays
}

/** Во что превращается число по дороге (М2). */
export function twisted(value: number | string, hops: number, seed: number): number | string {
  if (typeof value === 'string') return value
  const drift = ((seed % 200) / 100 - 1) * GOSSIP.twistPerHop * Math.max(1, hops)
  return Math.max(0, Math.round(value * (1 + drift)))
}

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

/**
 * Шаг молвы: куда она дошла за эту пятидневку (М1 и М2).
 *
 * Считается без броска: из мест, где о ней уже говорят, она переходит к
 * ближайшим соседям, и на каждом переходе число сдвигается. Из одного сейва —
 * одна и та же молва.
 */
export function stepped(talk: Talk, world: World, day: number): Talk {
  if (!alive(talk, day)) return talk
  const reached = new Set(talk.places)
  for (const from of talk.places) {
    // Соседей считаем по дорогам, а не по прямой: молва идёт с людьми, а люди
    // ходят там же, где обозы. Между поселениями лежат места без жителей,
    // поэтому ближайшие уши — в трёх переходах.
    const near = neighbourSettlements(world, from, GOSSIP.hops)
    for (const step of near.slice(0, GOSSIP.reach)) reached.add(step.id)
  }
  const hops = Math.max(1, Math.round((day - talk.bornDay) / GOSSIP.beat))
  return {
    ...talk,
    places: [...reached],
    value: twisted(talk.value, hops, hashOf(`${talk.id}:${hops}`)),
  }
}

/** Слышно ли эту молву там, где стоит человек. */
export function heardAt(talk: Talk, locationId: string, day: number): boolean {
  return alive(talk, day) && talk.places.includes(locationId)
}

/** Молва, дошедшая до этого места, — как весть (М1). */
export function asWord(talk: Talk, to: string, day: number): Word {
  return {
    id: `word:talk:${talk.id}`,
    to,
    kind: talk.kind,
    about: talk.about,
    value: talk.value,
    source: 'rumour',
    from: null,
    day,
  }
}

/** Принять молву как весть: так знание и пополняется на торгу. */
export function hear(words: readonly Word[], talk: Talk, to: string, day: number): readonly Word[] {
  return bring(words, asWord(talk, to, day))
}

/**
 * Пустить свою молву (М4).
 *
 * Пущенная молва становится обычной: она пойдёт дальше сама, исказится на
 * переходах и однажды вернётся к тебе не тем, чем была. Власти над ней нет ни у
 * кого — в этом её цена и её польза.
 */
export function start(
  id: string,
  kind: TalkKind,
  about: string,
  value: number | string,
  where: string,
  day: number,
  sooth: boolean,
): Talk {
  return { id, kind, about, value, sooth, bornDay: day, places: [where], by: PLAYER }
}

/** Проверить услышанное (М5): правду выясняют глазами или своими людьми. */
export function checkedWord(
  talk: Talk,
  truth: number | string | null,
  to: string,
  day: number,
): Word {
  return {
    id: `word:checked:${talk.id}`,
    to,
    kind: talk.kind,
    about: talk.about,
    value: truth ?? talk.value,
    source: 'own',
    from: null,
    day,
  }
}

export interface GossipLedger {
  readonly live: number
  readonly mine: number
  readonly sooth: number
  readonly exposed: number
  readonly says: string
}

/** Молва в числах (М6). */
export function gossipLedger(state: GameState, day: number): GossipLedger {
  const rows = gossipOf(state)
  const live = rows.filter((one) => alive(one, day))
  const sooth = live.filter((one) => one.sooth).length
  return {
    live: live.length,
    mine: rows.filter((one) => one.by === PLAYER).length,
    sooth,
    exposed: rows.filter((one) => one.exposed).length,
    says:
      rows.length === 0
        ? 'На торгу о мире не говорят ничего.'
        : `Молвы в ходу ${live.length}: с зерном правды ${sooth}, пущено тобой ${rows.filter((one) => one.by === PLAYER).length}, уличено ${rows.filter((one) => one.exposed).length}.`,
  }
}

export { GOSSIP, GOSSIP_WORDS, type TalkKind }
