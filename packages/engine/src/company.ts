import {
  COMPANIES,
  COMPANY,
  COMPANY_WORDS,
  type CompanyDef,
  type CompanyTemper,
  TEMPER_DEFS,
} from './content/companies'
import type { TroopId } from './content/troops'
import { PLAYER } from './holding'
import type { GameState } from './state'
import { atWar, warsOf } from './war'
import type { World } from './world/types'

/**
 * Наёмники (этап 86).
 *
 * До 0.7 войско бывало только своё: ополчение от сохи, набор за серебро,
 * дружина на жалованье. Все они слушаются. Рота — первое войско, у которого
 * есть своя воля: она приходит с именем и славой, служит тому, кто платит, и
 * уходит к тому, кто платит больше. Неоплаченная рота — не убыток, а враг,
 * который знает твой лагерь.
 *
 * Роты — данные (`content/companies.ts`), а в состоянии лежит только то, что
 * меняется: кому служат, сколько людей осталось, сколько им должны.
 */

/** Что известно о роте сейчас. Всё остальное — в содержимом. */
export interface Company {
  readonly id: string
  /** Сколько людей в ней осталось. */
  readonly men: number
  /** Кому служит: корона, игрок или никто. */
  readonly hiredBy: string | null
  /** До какого дня служит. */
  readonly untilDay: number
  /** Сколько ей задолжали. */
  readonly owed: number
  /** Сколько суток подряд не платят. */
  readonly unpaidDays: number
  /** Слава: по ней считается цена. */
  readonly fame: number
  readonly locationId: string
}

export function companyDef(id: string): CompanyDef {
  const def = COMPANIES.find((one) => one.id === id)
  if (!def) throw new Error(`нет роты ${id}`)
  return def
}

export function temperDef(temper: CompanyTemper) {
  return TEMPER_DEFS[temper]
}

export function companiesOf(state: Pick<GameState, 'companies'>): readonly Company[] {
  return state.companies ?? []
}

export function companyById(state: Pick<GameState, 'companies'>, id: string): Company | null {
  return companiesOf(state).find((one) => one.id === id) ?? null
}

/** Из кого состоит рота сейчас: состав из содержимого, ужатый до живых. */
export function companyUnits(company: Company): Readonly<Partial<Record<TroopId, number>>> {
  const def = companyDef(company.id)
  const share = def.men > 0 ? company.men / def.men : 0
  const units: Partial<Record<TroopId, number>> = {}
  for (const [troop, count] of Object.entries(def.make)) {
    const men = Math.round(count * share)
    if (men > 0) units[troop as TroopId] = men
  }
  return units
}

// --- цена и контракт (Н2) ---------------------------------------------------

/** Сколько рота берёт в сутки. */
export function wageOf(company: Company): number {
  const def = companyDef(company.id)
  const temper = TEMPER_DEFS[def.temper]
  const fame = 1 + company.fame * COMPANY.famePrice
  return Math.round(company.men * COMPANY.wagePerMan * temper.price * fame)
}

/** Во что обойдётся контракт на столько суток, считая задаток. */
export function contractPrice(company: Company, days: number): number {
  return Math.round(wageOf(company) * days)
}

/** Задаток: столько платят при рукопожатии. */
export function upfrontFor(company: Company): number {
  return Math.round(wageOf(company) * COMPANY.upfront)
}

/**
 * Что даёт корона, чтобы перебить чужой найм (Н2).
 *
 * Роту не «отбирают»: ей предлагают больше. Корона считает по своей войне —
 * воюющему рота нужнее, — и по своей казне, которой у неё столько, сколько
 * земли.
 */
export function bidOf(state: GameState, world: World, kingdomId: string, company: Company): number {
  const wars = warsOf(state.politics, kingdomId).length
  if (wars === 0) return 0
  const reach = Object.keys(world.kingdoms).includes(kingdomId) ? 1 : 0.6
  const purse = Math.min(2.2, 0.4 + crownPlaces(state, kingdomId) / 14)
  return Math.round(wageOf(company) * (0.6 + wars * 0.35) * purse * reach)
}

/**
 * Сколько земли держит корона.
 *
 * Считаются и её собственные места, и места её лордов: платит корона, но
 * богатство её — это земля всех, кто ей присягал.
 */
export function crownPlaces(state: GameState, kingdomId: string): number {
  const mine = new Set(
    state.politics.lords.filter((lord) => lord.kingdomId === kingdomId).map((lord) => lord.id),
  )
  let places = 0
  for (const one of Object.values(state.settlements)) {
    if (!one.owner) continue
    if (one.owner === `crown:${kingdomId}` || mine.has(one.owner)) places += 1
  }
  return places
}

/**
 * Кто из корон возьмёт эту роту сейчас (Н2).
 *
 * Считается без броска: по войнам, по земле и по тому, сколько рот корона уже
 * содержит — вторая рота нужна ей вдвое меньше первой. Равные ставки
 * разводятся зерном имени, иначе все роты уходили бы к одной короне, первой в
 * списке.
 */
export function hireBids(
  state: GameState,
  world: World,
  company: Company,
): readonly { readonly kingdomId: string; readonly bid: number }[] {
  const served = new Map<string, number>()
  for (const one of companiesOf(state)) {
    if (!one.hiredBy || one.hiredBy === PLAYER) continue
    served.set(one.hiredBy, (served.get(one.hiredBy) ?? 0) + 1)
  }
  const out: { kingdomId: string; bid: number }[] = []
  for (const kingdomId of Object.keys(world.kingdoms)) {
    if (kingdomId === company.hiredBy) continue
    const full = bidOf(state, world, kingdomId, company)
    if (full <= 0) continue
    const has = served.get(kingdomId) ?? 0
    const jitter = 0.9 + (hashOf(`${company.id}:${kingdomId}`) % 21) / 100
    out.push({ kingdomId, bid: Math.round(full * COMPANY.crowded ** has * jitter) })
  }
  return out.sort((a, b) => b.bid - a.bid)
}

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return ((hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0) % 1000
}

/** Кто из корон готов перебить твою цену. */
export function rivalsFor(
  state: GameState,
  world: World,
  company: Company,
  paying: number,
): readonly { readonly kingdomId: string; readonly bid: number }[] {
  const out: { kingdomId: string; bid: number }[] = []
  for (const kingdomId of Object.keys(world.kingdoms)) {
    if (kingdomId === company.hiredBy) continue
    const bid = bidOf(state, world, kingdomId, company)
    if (bid > paying * COMPANY.outbid) out.push({ kingdomId, bid })
  }
  return out.sort((a, b) => b.bid - a.bid)
}

// --- верность и измена (Н3) -------------------------------------------------

/** Насколько рота близка к тому, чтобы уйти или повернуть оружие. */
export function patienceLeft(company: Company): number {
  const def = companyDef(company.id)
  return Math.max(0, TEMPER_DEFS[def.temper].patience - company.unpaidDays)
}

/** С какой вероятностью неоплаченная рота повернёт оружие, а не просто уйдёт. */
export function treacheryChance(company: Company): number {
  const def = companyDef(company.id)
  const temper = TEMPER_DEFS[def.temper]
  if (company.unpaidDays <= 0) return 0
  const over = company.unpaidDays / Math.max(1, temper.patience)
  return Math.max(0, Math.min(0.85, (over - 1) * 0.5 * temper.treachery))
}

export function companySays(company: Company): string {
  if (!company.hiredBy) return COMPANY_WORDS.free
  if (company.unpaidDays > 0) return COMPANY_WORDS.owed
  return COMPANY_WORDS.served
}

// --- своя рота (Н4) ---------------------------------------------------------

/** Сговор с короной: ты — капитан, они — наниматель. */
export interface Commission {
  readonly kingdomId: string
  readonly sinceDay: number
  readonly untilDay: number
  /** Сколько платят в сутки. */
  readonly wage: number
  /** Сколько уже заплачено. */
  readonly paid: number
  readonly share: number
}

/**
 * Сколько корона даст тебе за твоих людей (Н4).
 *
 * Считается так же, как рота: по числу людей, по славе и по тому, насколько
 * короне сейчас нужна война. Разница одна — своя рота торгуется лицом.
 */
export function commissionOffer(
  state: GameState,
  world: World,
  kingdomId: string,
  men: number,
): number {
  const wars = warsOf(state.politics, kingdomId).length
  const need = 0.5 + wars * 0.4
  const fame = 1 + Math.max(0, state.renown) * COMPANY.famePrice * 2
  const purse = Math.min(2, 0.5 + crownPlaces(state, kingdomId) / 16)
  const reach = Object.keys(world.kingdoms).includes(kingdomId) ? 1 : 0.5
  return Math.round(men * COMPANY.wagePerMan * need * fame * purse * reach)
}

/** Короны, которым сейчас есть с кем воевать и есть чем платить. */
export function hiringCrowns(
  state: GameState,
  world: World,
  men: number,
): readonly { readonly kingdomId: string; readonly wage: number; readonly against: string }[] {
  const out: { kingdomId: string; wage: number; against: string }[] = []
  for (const kingdomId of Object.keys(world.kingdoms)) {
    const wars = warsOf(state.politics, kingdomId)
    const first = wars[0]
    if (!first) continue
    if (atWar(state.politics, PLAYER, kingdomId)) continue
    const wage = commissionOffer(state, world, kingdomId, men)
    if (wage <= 0) continue
    out.push({ kingdomId, wage, against: first.a === kingdomId ? first.b : first.a })
  }
  return out.sort((a, b) => b.wage - a.wage)
}

// --- роты между войнами (Н5) и счёт (Н6) ------------------------------------

/** Рота без нанимателя кормится разбоем: где она стоит, там это чувствуют. */
export function idleHarm(company: Company): { readonly mood: number; readonly banditry: number } {
  const def = companyDef(company.id)
  const cruel = def.temper === 'cruel' ? 1.8 : 1
  return {
    mood: COMPANY.idleMood * cruel * (company.men / 60),
    banditry: COMPANY.idleBanditry * cruel,
  }
}

export interface CompanyLedger {
  /** Сколько рот в службе. */
  readonly served: number
  readonly free: number
  readonly men: number
  /** Сколько серебра в сутки уходит на роты у тебя. */
  readonly daily: number
  readonly owed: number
  readonly says: string
}

export function companyLedger(state: GameState): CompanyLedger {
  let served = 0
  let free = 0
  let men = 0
  let daily = 0
  let owed = 0
  for (const company of companiesOf(state)) {
    men += company.men
    if (company.hiredBy) served += 1
    else free += 1
    if (company.hiredBy === PLAYER) {
      daily += wageOf(company)
      owed += company.owed
    }
  }
  return {
    served,
    free,
    men,
    daily,
    owed,
    says: `Рот в мире ${served + free}: в службе ${served}, вольных ${free}; людей ${men}. Твоих ${daily} в сутки${owed > 0 ? `, долгу ${owed}` : ''}.`,
  }
}

export { COMPANY, COMPANIES, type CompanyTemper }
