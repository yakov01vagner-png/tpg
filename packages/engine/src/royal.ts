import { CROWN_NAMES, CROWN_TEMPERS, type CrownTemper } from './content/lords'
import {
  BLOOD_CLAIM,
  CHILDLESS_SHARE,
  CHILDREN,
  DOWRY,
  HEIR_AGE,
  MARRIAGE_HOLD,
  REIGN_YEARS,
  ROYAL_MEN,
  ROYAL_WOMEN,
  ROYAL_WORDS,
} from './content/royals'
import { PLAYER } from './holding'
import { crownOf } from './lordlife'
import type { GameState } from './state'
import { DAYS_PER_YEAR } from './time'
import type { World } from './world/types'

/**
 * Родство корон (этап 81).
 *
 * У короны был человек (этап 66) — но человек смертен, а держава живёт дальше.
 * Здесь у короны появляется дом: супруга, дети, наследник и ветви, — и от этого
 * дома зависит то, что раньше решал случай: кто будет править через двадцать
 * лет, за кого сватаются и на чей трон у соседа есть право.
 *
 * Дом ничего не хранит: он выводится из короны и дня, как купцы (этап 49) и
 * мастера (этап 50). В состоянии лежат только браки, о которых договорились.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mix(hash: number): number {
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

/** Сколько лет правит эта корона подряд: у каждой земли свой обычай и свой век. */
export function reignYears(kingdomId: string): number {
  const hash = mix(hashOf(`правление|${kingdomId}`))
  return REIGN_YEARS.least + (hash % (REIGN_YEARS.most - REIGN_YEARS.least + 1))
}

/** Какое по счёту колено сидит на этой короне в такой день. */
export function reignOf(kingdomId: string, day: number): number {
  return Math.floor(day / (reignYears(kingdomId) * DAYS_PER_YEAR))
}

export interface Royal {
  readonly name: string
  /** Сколько ему лет в этот день. */
  readonly age: number
  readonly heir: boolean
}

export interface RoyalHouse {
  readonly kingdomId: string
  readonly title: string
  /** Кто сидит на короне сейчас. */
  readonly name: string
  readonly temper: CrownTemper
  /** Какое это колено. */
  readonly reign: number
  readonly spouse: string | null
  readonly children: readonly Royal[]
  readonly heir: Royal | null
  /** Дальняя родня с правами. */
  readonly branches: number
  readonly says: string
}

/**
 * Кто сидит на этой короне и кто за ним (Р1 и Р3).
 *
 * Колено считается от дня: корона правит свой век и уступает место наследнику.
 * Имя и нрав берутся по колену — значит, через тридцать лет соседи будут иметь
 * дело с другим человеком, и это можно посчитать заранее.
 */
export function royalHouse(world: World, kingdomId: string, day: number): RoyalHouse {
  const base = crownOf(kingdomId)
  const reign = reignOf(kingdomId, day)
  const hash = mix(hashOf(`дом|${kingdomId}|${reign}`))
  const name = reign === 0 ? base.name : (CROWN_NAMES[hash % CROWN_NAMES.length] ?? base.name)
  const temper =
    reign === 0 ? base.temper : (CROWN_TEMPERS[(hash >>> 5) % CROWN_TEMPERS.length] ?? base.temper)
  const childless = (hash >>> 9) % 100 < CHILDLESS_SHARE * 100
  const count = childless
    ? 0
    : CHILDREN.least + ((hash >>> 13) % (CHILDREN.most - CHILDREN.least + 1))
  const reignStart = reign * reignYears(kingdomId) * DAYS_PER_YEAR
  const years = Math.floor((day - reignStart) / DAYS_PER_YEAR)
  const children: Royal[] = []
  for (let i = 0; i < count; i += 1) {
    const own = mix(hashOf(`дитя|${kingdomId}|${reign}|${i}`))
    const boy = own % 2 === 0
    const list = boy ? ROYAL_MEN : ROYAL_WOMEN
    children.push({
      name: list[(own >>> 4) % list.length] ?? 'дитя',
      // Дети рождаются в первые годы правления: к концу века они взрослые.
      age: Math.max(0, years - (own % 8)) + 2,
      heir: false,
    })
  }
  children.sort((a, b) => b.age - a.age)
  const eldest = children[0] ?? null
  const heir = eldest ? { ...eldest, heir: true } : null
  const spouse =
    (hash >>> 17) % 5 === 0 ? null : (ROYAL_WOMEN[(hash >>> 19) % ROYAL_WOMEN.length] ?? null)
  const branches = 1 + ((hash >>> 23) % 3)
  return {
    kingdomId,
    title: base.title,
    name,
    temper,
    reign,
    spouse,
    children: children.map((one, index) => (index === 0 ? { ...one, heir: true } : one)),
    heir,
    branches,
    says: heir
      ? heir.age >= HEIR_AGE
        ? ROYAL_WORDS.heirReady
        : ROYAL_WORDS.heirYoung
      : ROYAL_WORDS.childless,
  }
}

/** Бездетна ли эта корона: событие для всех соседей (Р3). */
export function childless(world: World, kingdomId: string, day: number): boolean {
  return royalHouse(world, kingdomId, day).heir === null
}

/** Сколько лет до смены колена: соседи это считают. */
export function yearsToSuccession(kingdomId: string, day: number): number {
  const span = reignYears(kingdomId) * DAYS_PER_YEAR
  const next = (reignOf(kingdomId, day) + 1) * span
  return Math.max(0, Math.round((next - day) / DAYS_PER_YEAR))
}

// --- брак как договор (Р2 и Р5) ---------------------------------------------

/** Брак, о котором договорились: он и есть то единственное, что хранится. */
export interface RoyalMarriage {
  readonly kingdomId: string
  /** Кто женился: сам государь или его ребёнок. */
  readonly who: 'self' | 'child'
  readonly name: string
  readonly sinceDay: number
  readonly dowry: number
}

export function marriagesOf(state: Pick<GameState, 'marriages'>): readonly RoyalMarriage[] {
  return state.marriages ?? []
}

export function marriedTo(state: Pick<GameState, 'marriages'>, kingdomId: string): boolean {
  return marriagesOf(state).some((one) => one.kingdomId === kingdomId)
}

/**
 * Сколько просят приданого.
 *
 * Считается от того, чего стоит невеста: за каждым местом её короны — своё
 * серебро, а за наследницей — вдвое. Тому, кого признают равным, уступают.
 */
export function dowryFor(state: GameState, kingdomId: string, day: number, equal: boolean): number {
  // Считается вся земля этой короны, а не один домен: невеста стоит столько,
  // сколько за её домом стоит людей и мест — вместе с вассальными.
  const lords = new Set(
    state.politics.lords.filter((lord) => lord.kingdomId === kingdomId).map((lord) => lord.id),
  )
  const places = Object.values(state.settlements).filter((one) => {
    if (one.population <= 0 || !one.owner) return false
    return one.owner === `crown:${kingdomId}` || lords.has(one.owner)
  }).length
  const house = royalHouse(state.world, kingdomId, day)
  const heiress = house.heir !== null && house.children.length === 1
  const price = places * DOWRY.perPlace * (heiress ? DOWRY.heiress : 1) * (equal ? DOWRY.equal : 1)
  return Math.max(200, Math.round(price))
}

/** Насколько крепче союз, скреплённый браком. */
export function marriageHold(): number {
  return MARRIAGE_HOLD
}

// --- право по крови (Р4) ----------------------------------------------------

export interface BloodClaim {
  readonly kingdomId: string
  /** Насколько сильно право: больше единицы — сильнее прочих. */
  readonly strength: number
  readonly why: string
}

/**
 * Есть ли у тебя право на чужой трон.
 *
 * Родство само по себе прав не даёт: оно становится правом там, где корона
 * осталась без наследника. Тогда женатый на её дочери говорит первым, а
 * дальняя родня — второй.
 */
export function bloodClaims(state: GameState, day: number): readonly BloodClaim[] {
  const out: BloodClaim[] = []
  for (const kingdomId of Object.keys(state.world.kingdoms)) {
    if (!childless(state.world, kingdomId, day)) continue
    const married = marriedTo(state, kingdomId)
    const house = royalHouse(state.world, kingdomId, day)
    out.push({
      kingdomId,
      strength: married ? BLOOD_CLAIM.byMarriage : BLOOD_CLAIM.byBlood / (1 + house.branches),
      why: married
        ? `${house.title} ${house.name} бездетен, а ты в родстве с его домом.`
        : `${house.title} ${house.name} бездетен; на его трон найдётся ещё ${house.branches} охотников.`,
    })
  }
  return out.sort((a, b) => b.strength - a.strength)
}

export { HEIR_AGE, type CrownTemper }
