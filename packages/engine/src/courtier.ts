import {
  COURTIER,
  COURTIER_WORDS,
  COURT_TEMPER_DEFS,
  COURT_WANT_DEFS,
  type CourtTemper,
  type CourtWant,
} from './content/courtier'
import { OFFICES, type OfficeId } from './content/offices'
import { officeDef, officerAt } from './office'
import type { GameState } from './state'

/**
 * Люди двора (этап 104).
 *
 * Должность 0.7 была числом пригодности: у неё было имя, но не было человека.
 * Оттого двор — место, где решается половина державы, — оставался таблицей: не с
 * кем поссориться, некого повысить, некому обидеться.
 *
 * Здесь у того, кто держит должность, появляется своё: нрав, годы, цель и
 * голос. Всё это выводится из имени и должности, а не хранится: один и тот же
 * человек на одном и том же месте — один и тот же всегда. Хранится лишь то, что
 * меняется от твоих решений: исполненные просьбы и обиды.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

export interface CourtPerson {
  readonly office: OfficeId
  readonly id: string
  readonly name: string
  readonly temper: CourtTemper
  /** Сколько ему лет. */
  readonly age: number
  /** Чего он хочет для себя. */
  readonly wants: CourtWant
  /** Сколько лет служит тебе. */
  readonly years: number
  /** Умение, каким оно выходит с поправкой на нрав. */
  readonly worth: number
  /** Верность тебе лично, 0..100. */
  readonly loyalty: number
  readonly says: string
}

export function courtTemperDef(temper: CourtTemper) {
  return COURT_TEMPER_DEFS[temper]
}

export function courtWantDef(want: CourtWant) {
  return COURT_WANT_DEFS[want]
}

/**
 * Кто сидит на этой должности — как человек (Дв1 и Дв2).
 *
 * Нрав, годы и цель выводятся из имени: у одного и того же человека они не
 * меняются от того, куда ты его посадил. Верность считается из того, что между
 * вами было: годы службы, исполненные просьбы, обиды.
 */
export function courtierAt(state: GameState, office: OfficeId, day: number): CourtPerson | null {
  const officer = officerAt(state, office)
  const seat = state.offices?.[office]
  if (!officer || !seat) return null
  const seed = hashOf(`courtier:${officer.id}`)
  const tempers = Object.keys(COURT_TEMPER_DEFS) as CourtTemper[]
  const wants = Object.keys(COURT_WANT_DEFS) as CourtWant[]
  const temper = tempers[seed % tempers.length] ?? 'weary'
  const want = wants[(seed >>> 5) % wants.length] ?? 'coin'
  const age = 30 + ((seed >>> 9) % 30) + Math.floor((day - seat.sinceDay) / 365)
  const years = Math.max(0, Math.floor((day - seat.sinceDay) / 365))
  const def = COURT_TEMPER_DEFS[temper]
  const favours = state.favours?.[officer.id] ?? 0
  const loyalty = Math.max(
    0,
    Math.min(100, Math.round(45 * def.loyal + years * 4 + favours * COURTIER.granted)),
  )
  return {
    office,
    id: officer.id,
    name: officer.name,
    temper,
    age,
    wants: want,
    years,
    worth: Math.round(officer.skill * def.work * 10) / 10,
    loyalty,
    says: `${officer.name}, ${officeDef(office).label.toLowerCase()}: ${def.label}, ${age} лет, ${COURTIER_WORDS.serves} ${years} лет. ${def.about}`,
  }
}

/** Весь двор в лицах (Дв6). */
export function courtiersOf(state: GameState, day: number): readonly CourtPerson[] {
  const out: CourtPerson[] = []
  for (const office of OFFICES) {
    const one = courtierAt(state, office, day)
    if (one) out.push(one)
  }
  return out
}

/**
 * Чего он просит у тебя сейчас (Дв2 и Дв5).
 *
 * Просит не каждый день: раз в полгода, и только если ему есть что сказать.
 * Исполненная просьба помнится годами, отказ — тоже.
 */
export function asksNow(courtier: CourtPerson, day: number): boolean {
  if (courtier.years < 1) return false
  const seed = hashOf(`asks:${courtier.id}`)
  return (day + (seed % COURTIER.asksEvery)) % COURTIER.asksEvery === 0
}

export function askWords(courtier: CourtPerson): string {
  return `${courtier.name} ${COURTIER_WORDS.asks}: «${COURT_WANT_DEFS[courtier.wants].says}» Стоит: ${COURT_WANT_DEFS[courtier.wants].costs}.`
}

/** Пора ли ему на покой (Дв3). */
export function leavesSoon(courtier: CourtPerson): boolean {
  return courtier.age >= COURTIER.tiredAge
}

export function endsNow(courtier: CourtPerson): boolean {
  return courtier.age >= COURTIER.endAge
}

export function careerWords(courtier: CourtPerson): string {
  if (endsNow(courtier)) return `${courtier.name} ${COURTIER_WORDS.died}`
  if (leavesSoon(courtier)) return `${courtier.name} ${COURTIER_WORDS.tired}`
  return `${courtier.name} ${COURTIER_WORDS.serves}.`
}

/**
 * Каким голосом он говорит (Дв4).
 *
 * Совет 0.7 был числом; здесь то же число произносится человеком, и по тому,
 * как он это говорит, видно, каков он сам.
 */
export function voiceOf(courtier: CourtPerson, plain: string): string {
  const def = COURT_TEMPER_DEFS[courtier.temper]
  if (courtier.temper === 'sly') return `${courtier.name} понижает голос: «${plain}»`
  if (courtier.temper === 'proud') return `${courtier.name}, не глядя на тебя: «${plain}»`
  if (courtier.temper === 'weary') return `${courtier.name} вздыхает: «${plain}»`
  if (courtier.temper === 'kindly') return `${courtier.name} мягко: «${plain}»`
  return `${courtier.name} (${def.label}): «${plain}»`
}

export { COURTIER, COURTIER_WORDS, COURT_TEMPER_DEFS, COURT_WANT_DEFS }
export type { CourtTemper, CourtWant }
