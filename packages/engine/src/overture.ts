import { OVERTURE, OVERTURE_DEFS, OVERTURE_WORDS, type OvertureKind } from './content/overture'
import { PLAYER } from './holding'
import { crownWarlust } from './lordlife'
import { asksFactor, crownGame, seenStrength, strengthOf, toneToward } from './mind'
import type { GameState } from './state'
import { allied, atWar, warsOf } from './war'
import type { World } from './world/types'

/**
 * Дипломатия, которую ведут короны (этап 91).
 *
 * Послы ездили в одну сторону: игрок слал, мир отвечал. Оттого мир казался
 * вежливым и безразличным — у него не было своих просьб. Здесь короны говорят
 * первыми: предлагают союз и родство, требуют дань и проход, грозят — иногда
 * пустым, — торгуются и возвращаются. И у каждой есть слово, которое видно
 * всем: кто его держал, а кто нет.
 */

export interface Overture {
  readonly id: string
  readonly fromKingdom: string
  readonly kind: OvertureKind
  /** Против кого, если предложение о ком-то третьем. */
  readonly aboutId: string | null
  /** Сколько за это дают серебром — или сколько требуют. */
  readonly silver: number
  readonly sinceDay: number
  readonly untilDay: number
  /** Стоят ли за словами силы. */
  readonly backed: boolean
  readonly says: string
}

/** Обещание короны: то, что можно нарушить. */
export interface Pledge {
  readonly kingdomId: string
  readonly kind: OvertureKind
  readonly sinceDay: number
  readonly untilDay: number
  readonly kept: boolean | null
}

export function overtureDef(kind: OvertureKind) {
  return OVERTURE_DEFS[kind]
}

export function overturesOf(state: Pick<GameState, 'overtures'>): readonly Overture[] {
  return state.overtures ?? []
}

export function pledgesOf(state: Pick<GameState, 'pledges'>): readonly Pledge[] {
  return state.pledges ?? []
}

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

// --- слово короны (Ди4) -----------------------------------------------------

/**
 * Чего стоит слово этой короны (Ди4).
 *
 * Сто — слово держат всегда, ноль — не держат никогда. Считается по тому, что
 * было: нарушенное обещание бьёт по имени, год без обмана его лечит. Нрав даёт
 * исходную точку: у воинственной короны слово дешевле.
 */
export function wordOf(state: GameState, kingdomId: string, day: number): number {
  const base = 70 - (crownWarlust(kingdomId) - 1) * 40
  let word = base
  for (const pledge of pledgesOf(state)) {
    if (pledge.kingdomId !== kingdomId) continue
    if (pledge.kept === false) word -= OVERTURE.wordBite
    if (pledge.kept === true) word += OVERTURE.wordHeal
    const years = Math.max(0, (day - pledge.sinceDay) / 365)
    if (pledge.kept === false) word += Math.min(OVERTURE.wordBite * 0.6, years * OVERTURE.wordHeal)
  }
  return Math.max(0, Math.min(100, Math.round(word)))
}

/** Держат ли эту корону за обманщицу. */
export function isLiar(state: GameState, kingdomId: string, day: number): boolean {
  return wordOf(state, kingdomId, day) < 40
}

export function wordWords(state: GameState, kingdomId: string, day: number): string {
  return isLiar(state, kingdomId, day) ? OVERTURE_WORDS.liar : OVERTURE_WORDS.trusted
}

// --- предложения (Ди1, Ди3) -------------------------------------------------

/**
 * С чем корона приедет к тебе (Ди1).
 *
 * Выводится из её партии (этап 89) и того, каким она видит тебя: сильному
 * предлагают союз и родство, слабому — дань и проход, а тому, кто мешает
 * партии, — угрозу. Обещание бывает пустым (Ди3): за угрозой не всегда стоят
 * силы, и это можно проверить.
 */
export function overtureFrom(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): Overture | null {
  if (kingdomId === PLAYER) return null
  const season = Math.floor(day / Math.round(365 / OVERTURE.perYear))
  const seed = hashOf(`overture:${kingdomId}:${season}`)
  // Не каждый срок кто-то приезжает: посольство — событие.
  if (seed % 3 !== 0) return null
  const gambit = crownGame(state, world, kingdomId, day)
  const tone = toneToward(state, world, kingdomId, PLAYER, day)
  const mine = strengthOf(state, world, PLAYER, day).score
  const theirs = strengthOf(state, world, kingdomId, day).score
  const seen = seenStrength(state, world, kingdomId, PLAYER, day).score
  const warring = warsOf(state.politics, kingdomId).length > 0

  let kind: OvertureKind
  let aboutId: string | null = null
  if (atWar(state.politics, PLAYER, kingdomId)) return null
  if (gambit.targetId === PLAYER && gambit.aim === 'grow') {
    kind = 'threat'
  } else if (warring && tone.tone !== 'demand') {
    kind = 'join'
    aboutId = gambit.targetId
  } else if (tone.tone === 'demand') {
    kind = seed % 2 === 0 ? 'tribute' : 'passage'
  } else if (tone.tone === 'defer') {
    kind = seed % 2 === 0 ? 'marriage' : 'alliance'
  } else {
    kind = allied(state.politics, PLAYER, kingdomId) ? 'marriage' : 'alliance'
  }

  const def = OVERTURE_DEFS[kind]
  const asks = asksFactor(tone.tone)
  const silver = Math.round((60 + seen * 0.2) * def.weight * asks)
  // За угрозой стоят силы не всегда: корона может блефовать, и это видно тому,
  // кто умеет считать (Ди3).
  const backed = theirs > mine * OVERTURE.threatBacking
  return {
    id: `overture:${kingdomId}:${season}`,
    fromKingdom: kingdomId,
    kind,
    aboutId,
    silver,
    sinceDay: day,
    untilDay: day + OVERTURE.standDays,
    backed,
    says: `${kingdomId}: ${def.label}. ${def.about} Даёт: ${def.gives}. Стоит: ${def.costs}. Говорят ${tone.tone === 'demand' ? 'свысока' : tone.tone === 'defer' ? 'уступчиво' : 'на равных'}${kind === 'threat' ? ` — ${backed ? OVERTURE_WORDS.backed : OVERTURE_WORDS.hollow}` : ''}.`,
  }
}

/** Все, кто сейчас хочет говорить. */
export function overturesToday(state: GameState, world: World, day: number): readonly Overture[] {
  const out: Overture[] = []
  for (const kingdomId of Object.keys(world.kingdoms)) {
    const one = overtureFrom(state, world, kingdomId, day)
    if (one) out.push(one)
  }
  return out
}

// --- торг (Ди2) -------------------------------------------------------------

/**
 * Примут ли встречное условие (Ди2).
 *
 * Уступают тем охотнее, чем меньше видят в тебе слабости и чем нужнее им
 * согласие. Обманщику уступают меньше: с ним и торгуются иначе (Ди4).
 */
export function counterWeight(
  state: GameState,
  world: World,
  overture: Overture,
  day: number,
): number {
  const tone = toneToward(state, world, overture.fromKingdom, PLAYER, day)
  const word = wordOf(state, overture.fromKingdom, day)
  const need = warsOf(state.politics, overture.fromKingdom).length > 0 ? 0.25 : 0
  const base = 0.35 + need + (tone.tone === 'defer' ? 0.25 : tone.tone === 'demand' ? -0.2 : 0)
  const honest = word / 200
  return Math.max(0.05, Math.min(0.9, Math.round((base + honest) * 100) / 100))
}

/** Когда эта корона вернётся с тем же разговором. */
export function returnsOn(overture: Overture): number {
  return overture.untilDay + OVERTURE.returnDays
}

// --- коалиции (Ди5) ---------------------------------------------------------

/**
 * Кто сошёлся против выросшего (Ди5).
 *
 * Сходятся не по съезду и не по дружбе, а по счёту: если одна сила больше
 * следующей за ней в полтора раза, остальные начинают считать её общей бедой.
 * Игрок здесь — такая же сила: вырос — и против тебя сойдутся тоже.
 */
export function coalitionAgainst(
  state: GameState,
  world: World,
  day: number,
): { readonly giant: string | null; readonly members: readonly string[]; readonly says: string } {
  const sides = [PLAYER, ...Object.keys(world.kingdoms)]
    .map((one) => ({ id: one, score: strengthOf(state, world, one, day).score }))
    .sort((a, b) => b.score - a.score)
  const first = sides[0]
  const second = sides[1]
  if (!first || !second || first.score < second.score * OVERTURE.giantLine) {
    return {
      giant: null,
      members: [],
      says: 'Никто не вырос настолько, чтобы против него сходились.',
    }
  }
  const members = sides
    .slice(1)
    .filter((one) => one.id !== PLAYER || first.id !== PLAYER)
    .filter((one) => one.id !== first.id)
    .filter((one) => !allied(state.politics, first.id, one.id))
    .map((one) => one.id)
  return {
    giant: first.id,
    members,
    says: `${first.id === PLAYER ? 'Ты' : first.id} вырос: сила ${first.score} против ${second.score} у следующего. Против сходятся ${members.length}: ${members.join(', ')}.`,
  }
}

// --- отчёт (Ди6) ------------------------------------------------------------

export interface OvertureLedger {
  readonly standing: number
  readonly pledges: number
  readonly broken: number
  readonly liars: number
  readonly says: string
}

export function overtureLedger(state: GameState, world: World, day: number): OvertureLedger {
  const standing = overturesOf(state).filter((one) => one.untilDay >= day).length
  const rows = pledgesOf(state)
  const broken = rows.filter((one) => one.kept === false).length
  const liars = Object.keys(world.kingdoms).filter((one) => isLiar(state, one, day)).length
  return {
    standing,
    pledges: rows.length,
    broken,
    liars,
    says:
      standing === 0 && rows.length === 0
        ? OVERTURE_WORDS.none
        : `Послов у дверей ${standing}; обещаний дано ${rows.length}, нарушено ${broken}; корон, которых держат за обманщиц, ${liars}.`,
  }
}

export { OVERTURE, OVERTURE_DEFS, OVERTURE_WORDS, type OvertureKind }
