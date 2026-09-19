import {
  CITY,
  CITY_ASK_DEFS,
  CITY_WORDS,
  type CityAsk,
  type CitySide,
  SIDE_DEFS,
} from './content/city'
import { TAX_DEFS } from './content/estate'
import type { Settlement } from './economy'
import { lawOf } from './estate'
import { PLAYER } from './holding'
import { foodSecurity } from './life'
import { placeRep } from './reputation'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Народ и города (этап 95).
 *
 * Город был местом с числом жителей, рынком и гарнизоном: он не хотел ничего.
 * Оттого власть над ним ничего не стоила — держать город было тем же, что
 * держать поле. Здесь у города появляется воля, а внутри него — две правды:
 * черни нужен хлеб и покой, купцам — дороги, право и низкая пошлина. Угодить
 * обеим нельзя, и в этом весь смысл.
 *
 * Считается из мира: сытость, цены, подать, разбой, память места. Хранится
 * только договор — вольность, о которой договорились.
 */

/** Городская вольность: договор, а не милость. */
export interface Pact {
  readonly locationId: string
  readonly sinceDay: number
  readonly untilDay: number
  /** Что город обещал взамен. */
  readonly paid: number
  /** Кто поручился: корона, церковь или никто. */
  readonly guarantor: string | null
}

export function pactsOf(state: Pick<GameState, 'pacts'>): readonly Pact[] {
  return state.pacts ?? []
}

export function pactAt(state: Pick<GameState, 'pacts'>, locationId: string): Pact | null {
  return pactsOf(state).find((one) => one.locationId === locationId) ?? null
}

/** Город ли это: у деревни своей воли нет. */
export function isCity(settlement: Settlement): boolean {
  return settlement.population >= CITY.cityFrom
}

// --- город как сила (На1) ---------------------------------------------------

export interface City {
  readonly locationId: string
  readonly name: string
  readonly people: number
  /** Сытость, 0..1. */
  readonly fed: number
  /** Своя казна: с чего городу говорить с тобой на равных. */
  readonly purse: number
  /** Настроение черни и купцов, −100..100. */
  readonly commons: number
  readonly guilds: number
  /** Вольный ли он по договору. */
  readonly free: boolean
  readonly says: string
}

/**
 * Каков город сегодня (На1 и На4).
 *
 * Две правды считаются по-разному: чернь смотрит на хлеб и на то, берут ли её
 * сыновей на войну; купцы — на пошлину, разбой и право. Одно и то же твоё
 * решение двигает эти два числа в разные стороны.
 */
export function cityOf(state: GameState, world: World, locationId: string): City | null {
  const settlement = state.settlements[locationId]
  const here = world.locations[locationId]
  if (!settlement || !here || !isCity(settlement)) return null
  const fed = foodSecurity(settlement)
  const law = lawOf(state)
  const tax = TAX_DEFS[law.tax].take
  const rep = placeRep(state.reputation, locationId)
  const fighting = state.politics.wars.some((war) => war.a === PLAYER || war.b === PLAYER)
  const free = pactAt(state, locationId) !== null
  const commons = Math.round(
    (fed - CITY.hungerLine) * 120 - (tax - 1) * 30 - (fighting ? 15 : 0) + rep * 0.4,
  )
  const guilds = Math.round(
    -(tax - 1) * 45 - settlement.banditry * 60 + (free ? 25 : 0) + rep * 0.5 + 10,
  )
  const purse = Math.round(settlement.population * 0.9 * (free ? 1.4 : 1))
  return {
    locationId,
    name: here.name,
    people: settlement.population,
    fed: Math.round(fed * 100) / 100,
    purse,
    commons: Math.max(-100, Math.min(100, commons)),
    guilds: Math.max(-100, Math.min(100, guilds)),
    free,
    says: free
      ? CITY_WORDS.free
      : commons < -20 || guilds < -20
        ? CITY_WORDS.murmur
        : CITY_WORDS.quiet,
  }
}

/** Все города, которые ты держишь. */
export function citiesOf(state: GameState, world: World): readonly City[] {
  const out: City[] = []
  for (const one of Object.values(state.settlements)) {
    if (one.owner !== PLAYER) continue
    const city = cityOf(state, world, one.locationId)
    if (city) out.push(city)
  }
  return out.sort((a, b) => b.people - a.people)
}

// --- чего просят (На2) ------------------------------------------------------

export interface CityAskOffer {
  readonly ask: CityAsk
  readonly label: string
  readonly from: CitySide | 'both'
  readonly says: string
  readonly costs: string
  readonly calms: number
}

/**
 * Что город просит у тебя сегодня (На2).
 *
 * Просьбы берутся из его положения, а не из списка: голодный просит хлеба,
 * задавленный пошлиной — снять её, богатый и спокойный — вольности и права.
 */
export function cityAsks(state: GameState, world: World, city: City): readonly CityAskOffer[] {
  const settlement = state.settlements[city.locationId]
  if (!settlement) return []
  const law = lawOf(state)
  const tax = TAX_DEFS[law.tax].take
  const out: CityAsk[] = []
  if (city.fed < CITY.hungerLine) out.push('grain')
  if (tax > 1 || law.toll === 'greedy') out.push('toll')
  if (settlement.banditry > 0.25) out.push('guard')
  if (!city.free && city.guilds > -30) out.push('charter')
  if (city.purse > 2500) out.push('monopoly')
  if (state.politics.wars.some((war) => war.a === PLAYER || war.b === PLAYER)) out.push('peace')
  return out.map((ask) => ({
    ask,
    label: CITY_ASK_DEFS[ask].label,
    from: CITY_ASK_DEFS[ask].from,
    says: CITY_ASK_DEFS[ask].says,
    costs: CITY_ASK_DEFS[ask].costs,
    calms: CITY_ASK_DEFS[ask].calms,
  }))
}

/** Кого это порадует, а кого разозлит (На4). */
export function sideOfAsk(ask: CityAsk): 'commons' | 'guilds' | 'both' {
  return CITY_ASK_DEFS[ask].from
}

export function sideDef(side: CitySide) {
  return SIDE_DEFS[side]
}

// --- хлебный бунт (На3) -----------------------------------------------------

export interface Riot {
  readonly risk: number
  readonly why: string
  readonly nigh: boolean
}

/**
 * Далеко ли до бунта (На3).
 *
 * Голод, дороговизна, тяжёлая подать и разбой складываются в счёт, и счёт этот
 * виден заранее: бунт — не случайность, а то, к чему шло.
 */
export function riotRisk(state: GameState, world: World, city: City): Riot {
  const settlement = state.settlements[city.locationId]
  if (!settlement) return { risk: 0, why: '', nigh: false }
  const hunger = Math.max(0, CITY.hungerLine - city.fed) * 150
  const law = lawOf(state)
  const tax = Math.max(0, TAX_DEFS[law.tax].take - 1) * 40
  const unrest = settlement.banditry * 40
  const mood = Math.max(0, -city.commons) * 0.4
  const risk = Math.round(hunger + tax + unrest + mood)
  const why =
    `хлеб ${Math.round(city.fed * 100)} из ста (${Math.round(hunger)}), подать (${Math.round(tax)}), ` +
    `разбой ${Math.round(settlement.banditry * 100)} из ста (${Math.round(unrest)}), ропот (${Math.round(mood)})`
  return { risk, why, nigh: risk >= CITY.riotLine }
}

/** Во что обошёлся бы бунт: считается до того, как он случится. */
export function riotCost(city: City): { readonly dead: number; readonly says: string } {
  const dead = Math.round(city.people * CITY.riotLoss)
  return {
    dead,
    says: `${CITY_WORDS.riot} ${city.name} потеряет ${dead} человек, память места упадёт на ${Math.abs(CITY.riotMood)}, разбой поднимется на ${Math.round(CITY.riotBanditry * 100)} из ста.`,
  }
}

// --- вольность как договор (На5) --------------------------------------------

/** Во что городу обойдётся вольность — и во что она обойдётся тебе. */
export function pactPrice(city: City): number {
  return Math.round((city.people / 100) * CITY.pactPerHundred)
}

export function pactWords(pact: Pact, city: City | null, day: number): string {
  const years = Math.max(0, Math.round((pact.untilDay - day) / 365))
  return `${city?.name ?? pact.locationId}: вольность по договору, ещё ${years} лет${pact.guarantor ? `, поручитель — ${pact.guarantor}` : ''}. Город заплатил ${pact.paid} и платит подать вполовину.`
}

// --- города в отчёте (На6) --------------------------------------------------

export interface CityLedger {
  readonly cities: number
  readonly free: number
  readonly restless: number
  readonly people: number
  readonly says: string
}

export function cityLedger(state: GameState, world: World): CityLedger {
  const cities = citiesOf(state, world)
  const free = cities.filter((one) => one.free).length
  const restless = cities.filter(
    (one) => riotRisk(state, world, one).risk >= CITY.riotLine * 0.6,
  ).length
  const people = cities.reduce((sum, one) => sum + one.people, 0)
  return {
    cities: cities.length,
    free,
    restless,
    people,
    says:
      cities.length === 0
        ? 'Городов за тобой нет: твоя власть кончается за околицей.'
        : `Городов ${cities.length} (${people} душ): вольных ${free}, неспокойных ${restless}.`,
  }
}

export { CITY, CITY_ASK_DEFS, CITY_WORDS, SIDE_DEFS, type CityAsk, type CitySide }
