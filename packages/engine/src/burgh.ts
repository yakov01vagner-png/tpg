import { type City, citiesOf } from './city'
import { BURGH, BURGH_WORDS, GUILDS, GUILD_DEFS, type GuildId } from './content/burgh'
import { FACE_NAMES } from './content/face'
import { CHARTER_DEFS } from './content/realm'
import { PLAYER, dailyTax } from './holding'
import { foodSecurity } from './life'
import { charterOf } from './realm'
import type { GameState } from './state'
import { hopsBetween } from './world/queries'
import type { World } from './world/types'

/**
 * Город и вольности (этап 184).
 *
 * Город с 0.7 — место с казной, настроением черни и купцов и вольностью, у
 * которой два состояния: есть или нет. Внутри него никого: ни цехов, ни
 * магистрата, ни ополчения. Оттого город был поставщиком денег и бунтов, а не
 * стороной, с которой договариваются.
 *
 * Здесь у города появляются цехи, магистрат, своё ополчение и вольность как
 * договор. Всё выводится из того, что в городе уже есть: постройки, люди,
 * казна, настроение.
 */

/** Цехи этого города (Гр1). */
export function guildsAt(state: GameState, world: World, locationId: string): readonly GuildId[] {
  const place = state.settlements[locationId]
  if (!place) return []
  const rows: GuildId[] = []
  for (const id of GUILDS) {
    const needs = GUILD_DEFS[id].needs
    if (needs && !place.buildings.includes(needs as never)) continue
    if (id === 'boatmen' && world.locations[locationId]?.archetype !== 'port') continue
    if (id === 'masons' && place.population < 3000) continue
    rows.push(id)
  }
  return rows.slice(0, BURGH.guildsMost)
}

/** Магистрат: те, с кем на самом деле говорят (Гр1). */
export function magistrateAt(
  state: GameState,
  world: World,
  locationId: string,
): readonly { readonly who: string; readonly name: string; readonly says: string }[] {
  const guilds = guildsAt(state, world, locationId)
  const seed = hashOf(`burgh|${locationId}`)
  const mayor = FACE_NAMES[seed % FACE_NAMES.length] ?? 'Безымянный'
  const rows = [
    {
      who: 'бургомистр',
      name: mayor,
      says: `Бургомистр ${mayor}: говорит от города, а думает о своём цехе.`,
    },
  ]
  for (const [at, id] of guilds.entries()) {
    const name = FACE_NAMES[(seed >>> (3 * (at + 1))) % FACE_NAMES.length] ?? 'Безымянный'
    rows.push({
      who: GUILD_DEFS[id].label,
      name,
      says: `${GUILD_DEFS[id].label}, старшина ${name}: ${GUILD_DEFS[id].about} Просит: ${GUILD_DEFS[id].wants}.`,
    })
  }
  return rows
}

/** Городское ополчение (Гр1). */
export function militiaAt(city: City): { readonly men: number; readonly says: string } {
  const glad = city.commons > 20 ? BURGH.gladGives : city.commons < -20 ? 0.6 : 1
  const men = Math.round((city.people / 1000) * BURGH.militiaPer1000 * glad)
  return { men, says: `${city.name}: ополчения ${men}. ${BURGH_WORDS.militia}` }
}

/**
 * Вольность как договор (Гр2).
 *
 * Не флаг, а условия: что город отдаёт разом, какую долю подати платит потом,
 * что берёт себе — суд, стражу и право не пускать чужих. Цена считается из его
 * же подати.
 */
export function charterTerms(
  state: GameState,
  world: World,
  city: City,
  day: number,
): {
  readonly has: boolean
  readonly paysNow: number
  readonly takeAfter: number
  readonly gets: readonly string[]
  readonly says: string
} {
  const place = state.settlements[city.locationId]
  const yearTax = place ? dailyTax(place, foodSecurity(place)) * 365 : 0
  const paysNow = Math.round(yearTax * BURGH.charterCosts)
  const has = charterOf(state, city.locationId, day)?.kind === 'liberty'
  return {
    has,
    paysNow,
    takeAfter: CHARTER_DEFS.liberty.take,
    gets: ['свой суд', 'своя стража', 'право не пускать чужих купцов'],
    says: has
      ? `${city.name} вольный: платит ${Math.round(CHARTER_DEFS.liberty.take * 100)} из ста подати и судит сам. ${BURGH_WORDS.charter}`
      : `${city.name} даст ${paysNow} разом и станет платить ${Math.round(CHARTER_DEFS.liberty.take * 100)} из ста подати. Взамен: свой суд, своя стража, своё слово о чужих купцах. ${BURGH_WORDS.charter}`,
  }
}

/** Чем город торгуется (Гр3). */
export function cityOffers(
  state: GameState,
  world: World,
  city: City,
  day: number,
): readonly { readonly what: string; readonly says: string }[] {
  const rows: { what: string; says: string }[] = []
  const loan = Math.round(city.purse * BURGH.lends)
  if (loan > 0) {
    rows.push({
      what: 'заём',
      says: `${city.name} даёт взаймы ${loan} под ${Math.round(BURGH.rate * 100)} из ста. ${BURGH_WORDS.lends}`,
    })
  }
  const terms = charterTerms(state, world, city, day)
  if (!terms.has) rows.push({ what: 'вольность', says: terms.says })
  const place = state.settlements[city.locationId]
  if ((place?.banditry ?? 0) > 0.2) {
    rows.push({
      what: 'защита',
      says: `${city.name} требует охраны дорог: без неё купцы не поедут, а подать берётся с торга.`,
    })
  }
  return rows
}

/** Города между собой (Гр5). */
export function cityRivals(
  state: GameState,
  world: World,
  city: City,
): readonly { readonly other: string; readonly hops: number; readonly says: string }[] {
  const rows: { other: string; hops: number; says: string }[] = []
  for (const one of citiesOf(state, world)) {
    if (one.locationId === city.locationId) continue
    const hops = hopsBetween(world, city.locationId, one.locationId) ?? 99
    if (hops > BURGH.rivalHops) continue
    rows.push({
      other: one.name,
      hops,
      says: `${one.name} в ${hops} переходах: ${BURGH_WORDS.rivals}`,
    })
  }
  return rows
}

/** Города в числах (Гр6). */
export function burghRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly cities: number
  readonly free: number
  readonly purse: number
  readonly militia: number
  readonly says: string
} {
  const rows = citiesOf(state, world)
  const free = rows.filter((one) => one.free).length
  const purse = rows.reduce((sum, one) => sum + one.purse, 0)
  const militia = rows.reduce((sum, one) => sum + militiaAt(one).men, 0)
  return {
    cities: rows.length,
    free,
    purse,
    militia,
    says: `Городов ${rows.length}, вольных ${free}; в их казнах ${purse}, ополчения ${militia}. ${BURGH_WORDS.guilds}`,
  }
}

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}
