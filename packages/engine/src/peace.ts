import { bandSize } from './band'
import {
  ACCORD_DEFS,
  MEDIATOR_DEFS,
  type MediatorKind,
  PEACE,
  PEACE_WORDS,
  type PeaceTerm,
} from './content/peace'
import { PLAYER } from './holding'
import type { GameState } from './state'
import { type War, atWar, warsOf } from './war'
import type { World } from './world/types'

/**
 * Мир как торг (этап 88).
 *
 * Мир до 0.7 был броском: кубик решал, не пора ли, а условия выводились из
 * повода. Отсюда три беды — нельзя было мириться нарочно, нельзя было понять,
 * почему условия такие, и нельзя было помнить, чей это был мир. Здесь у мира
 * появляется счёт: во что война встала обеим сторонам, что за это просят, кто
 * мирит и во что обойдётся его услуга. И память: мир, подписанный под ножом,
 * сам становится поводом для следующей войны.
 */

/** Идущие переговоры. */
export interface Talks {
  readonly against: string
  readonly sinceDay: number
  /** Что просит другая сторона. */
  readonly asks: readonly PeaceTerm[]
  /** Кто мирит, если кто-то мирит. */
  readonly mediator: MediatorKind | null
  /** Сколько раз уже торговались: каждый отказ злит. */
  readonly rounds: number
}

/** Заключённый мир: для летописи (М6). */
export interface PeaceRecord {
  readonly against: string
  readonly day: number
  readonly terms: readonly PeaceTerm[]
  readonly mediator: MediatorKind | null
  /** Насколько тяжёлым он вышел для уступившего. */
  readonly harshness: number
  /** Кто уступил. */
  readonly yielded: string
  /** День, когда он был нарушен, если был. */
  readonly brokenDay?: number
}

/** Обида, которая зреет в повод (М5). */
export interface Grievance {
  readonly who: string
  readonly against: string
  readonly sinceDay: number
  readonly weight: number
}

export function termDef(term: PeaceTerm) {
  return ACCORD_DEFS[term]
}

export function mediatorDef(kind: MediatorKind) {
  return MEDIATOR_DEFS[kind]
}

export function talksOf(state: Pick<GameState, 'talks'>): Talks | null {
  return state.talks ?? null
}

export function peacesOf(state: Pick<GameState, 'peaces'>): readonly PeaceRecord[] {
  return state.peaces ?? []
}

export function grievancesOf(state: Pick<GameState, 'grievances'>): readonly Grievance[] {
  return state.grievances ?? []
}

// --- цена войны (М2) --------------------------------------------------------

export interface WarToll {
  readonly side: string
  /** Сколько мест держит сейчас. */
  readonly places: number
  /** Сколько людей в поле. */
  readonly men: number
  /** Сколько суток идёт война. */
  readonly days: number
  /** Разбой в своей земле, 0..1. */
  readonly unrest: number
  /** Общий счёт: во что война встала. */
  readonly cost: number
  readonly says: string
}

/**
 * Во что война встала этой стороне (М2).
 *
 * Считается по тому, что видно в мире: сколько земли осталось, сколько людей в
 * поле, сколько лет идёт война и насколько неспокойно дома. Одно и то же число
 * считают обе стороны — и потому оно годится для торга.
 */
export function warToll(
  state: GameState,
  world: World,
  side: string,
  war: War,
  day: number,
): WarToll {
  const own = placesOf(state, side)
  const places = own.length
  const unrest = places > 0 ? own.reduce((sum, one) => sum + one.banditry, 0) / places : 0
  const men = state.bands
    .filter((band) => (side === PLAYER ? band.lordId === PLAYER : band.kingdomId === side))
    .reduce((sum, band) => sum + bandSize(band), 0)
  const days = Math.max(0, day - war.since)
  const years = days / 365
  const lost = Math.max(0, lordsLand(state, side) - places)
  // Война стоит трёх вещей: потерянной земли, времени и войска в поле. Войско
  // — самая дорогая из них: держать в поле три тысячи человек дороже, чем
  // потерять деревню.
  const cost = Math.round(
    lost * PEACE.placeCost +
      years * PEACE.yearCost +
      unrest * PEACE.banditryCost * places +
      men / PEACE.menPerCost,
  )
  return {
    side,
    places,
    men,
    days,
    unrest: Math.round(unrest * 100) / 100,
    cost,
    says: `${side}: мест ${places}, в поле ${men}, воюет ${Math.round(days / 30)} месяцев, разбой ${Math.round(unrest * 100)} из ста — счёт ${cost}.`,
  }
}

function placesOf(state: GameState, side: string) {
  const mine = new Set(
    state.politics.lords.filter((lord) => lord.kingdomId === side).map((lord) => lord.id),
  )
  return Object.values(state.settlements).filter(
    (one) =>
      one.population > 0 &&
      (side === PLAYER
        ? one.owner === PLAYER
        : one.owner === `crown:${side}` || (one.owner !== null && mine.has(one.owner))),
  )
}

/** Сколько мест эта корона держала бы, будь у каждого её лорда его земля. */
function lordsLand(state: GameState, side: string): number {
  if (side === PLAYER) return placesOf(state, side).length
  return state.politics.lords.filter((lord) => lord.kingdomId === side).length + 1
}

// --- торг (М1, М3) ----------------------------------------------------------

/**
 * Чего попросит эта сторона (М1, М3).
 *
 * Требуют по счёту: кто заплатил за войну больше, тот и просит больше. Условия
 * складываются, а не выбираются одно: земля и дань, выкуп и брак — мир бывает
 * из нескольких частей.
 */
export function asksOf(
  state: GameState,
  world: World,
  against: string,
  day: number,
): readonly PeaceTerm[] {
  const war = warsOf(state.politics, PLAYER).find((one) => one.a === against || one.b === against)
  if (!war) return []
  const ours = warToll(state, world, PLAYER, war, day)
  const theirs = warToll(state, world, against, war, day)
  const edge = ours.cost - theirs.cost
  const asks: PeaceTerm[] = []
  // Тот, кому война встала дороже, просит больше — и первым делом просит того,
  // что возвращает потраченное.
  if (edge > 120) asks.push('land')
  if (edge > 40) asks.push('tribute')
  if (edge > 0) asks.push('ransom')
  if (asks.length === 0) asks.push('trade')
  // За обиду просят слов, за долгую войну — родства.
  if (war.casus?.kind === 'feud' || war.casus?.kind === 'raids') asks.push('apology')
  if (ours.days > 365 * 2) asks.push('marriage')
  return asks
}

/** Сколько весят эти условия для того, кто их принимает. */
export function harshness(terms: readonly PeaceTerm[]): number {
  return Math.round(terms.reduce((sum, term) => sum + ACCORD_DEFS[term].weight, 0) * 10) / 10
}

/** Сколько в них обиды: обида переживает мир (М5). */
export function shameOf(terms: readonly PeaceTerm[]): number {
  return Math.round(terms.reduce((sum, term) => sum + ACCORD_DEFS[term].shame, 0) * 10) / 10
}

/**
 * Примут ли такой мир (М1).
 *
 * Считается положением, а не уговорами: чем дороже война обошлась тому, кому
 * предлагают, тем легче он соглашается; чем тяжелее условия — тем труднее.
 * Посредник добавляет своё, каждый отказ за столом злит, а тот, кто считает,
 * что побеждает, упрям вдвое.
 */
export function offerWeight(
  state: GameState,
  world: World,
  against: string,
  terms: readonly PeaceTerm[],
  day: number,
): number {
  const war = warsOf(state.politics, PLAYER).find((one) => one.a === against || one.b === against)
  if (!war) return 0
  const ours = warToll(state, world, PLAYER, war, day)
  const theirs = warToll(state, world, against, war, day)
  const tired = Math.min(1, theirs.cost / 400)
  const winning = theirs.cost < ours.cost ? PEACE.winnerStubborn : 1
  const talks = talksOf(state)
  const ease = talks?.mediator ? MEDIATOR_DEFS[talks.mediator].ease : 0
  const rounds = talks ? talks.rounds * 0.05 : 0
  const price = harshness(terms) / 8
  const weight = 0.25 + tired * 0.6 + ease - price * winning - rounds
  return Math.max(0, Math.min(0.95, Math.round(weight * 100) / 100))
}

// --- посредники (М4) --------------------------------------------------------

export interface MediatorOffer {
  readonly kind: MediatorKind
  /** Кто именно мирит. */
  readonly whoId: string | null
  readonly name: string
  readonly fee: number
  readonly ease: number
  readonly takes: string
}

/**
 * Кто возьмётся мирить (М4).
 *
 * Соседняя корона — та, что не воюет ни с кем из вас и которой выгоден ваш
 * мир. Церковь мирит всегда и берёт не серебром. Купеческий совет мирит там,
 * где война дороже всего, — в торговых землях.
 */
export function mediatorsFor(
  state: GameState,
  world: World,
  against: string,
  day: number,
): readonly MediatorOffer[] {
  const war = warsOf(state.politics, PLAYER).find((one) => one.a === against || one.b === against)
  if (!war) return []
  const stake = warToll(state, world, PLAYER, war, day).cost + 200
  const out: MediatorOffer[] = []
  for (const kingdomId of Object.keys(world.kingdoms)) {
    if (kingdomId === against) continue
    if (atWar(state.politics, PLAYER, kingdomId) || atWar(state.politics, against, kingdomId)) {
      continue
    }
    out.push({
      kind: 'crown',
      whoId: kingdomId,
      name: world.kingdoms[kingdomId]?.name ?? kingdomId,
      fee: Math.round(stake * MEDIATOR_DEFS.crown.cut),
      ease: MEDIATOR_DEFS.crown.ease,
      takes: MEDIATOR_DEFS.crown.takes,
    })
    break
  }
  out.push({
    kind: 'church',
    whoId: null,
    name: MEDIATOR_DEFS.church.label,
    fee: Math.round(stake * MEDIATOR_DEFS.church.cut),
    ease: MEDIATOR_DEFS.church.ease,
    takes: MEDIATOR_DEFS.church.takes,
  })
  const trading = placesOf(state, PLAYER).some((one) => one.population > 2000)
  if (trading) {
    out.push({
      kind: 'guild',
      whoId: null,
      name: MEDIATOR_DEFS.guild.label,
      fee: Math.round(stake * MEDIATOR_DEFS.guild.cut),
      ease: MEDIATOR_DEFS.guild.ease,
      takes: MEDIATOR_DEFS.guild.takes,
    })
  }
  return out
}

// --- плохой мир (М5) и летопись (М6) ----------------------------------------

/** Стал ли этот мир обидой, которая зреет в повод. */
export function grievanceFrom(record: PeaceRecord, day: number): Grievance | null {
  if (record.harshness < PEACE.harshLine) return null
  return {
    who: record.yielded,
    against: record.yielded === PLAYER ? record.against : PLAYER,
    sinceDay: day,
    weight: Math.round((record.harshness - PEACE.harshLine) * PEACE.grudgeWeight * 100) / 100,
  }
}

/** Созрела ли обида: столько суток хватает, чтобы вспомнить всё. */
export function grudgeRipe(grievance: Grievance, day: number): boolean {
  return day - grievance.sinceDay >= PEACE.grudgeDays
}

export interface PeaceChronicle {
  readonly made: number
  readonly held: number
  readonly broken: number
  readonly forced: number
  readonly says: string
}

/** Какие миры держались, а какие не дожили (М6). */
export function peaceChronicle(state: GameState, day: number): PeaceChronicle {
  const rows = peacesOf(state)
  let held = 0
  let broken = 0
  let forced = 0
  for (const row of rows) {
    if (row.brokenDay) broken += 1
    else if (day - row.day >= PEACE.heldDays) held += 1
    if (row.harshness >= PEACE.harshLine) forced += 1
  }
  return {
    made: rows.length,
    held,
    broken,
    forced,
    says:
      rows.length === 0
        ? PEACE_WORDS.none
        : `Миров заключено ${rows.length}: держатся ${held}, нарушено ${broken}, подписано под ножом ${forced}.`,
  }
}

export { PEACE, PEACE_WORDS, type MediatorKind, type PeaceTerm }
