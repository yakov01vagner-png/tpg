import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import {
  CITY,
  CITY_ASK_DEFS,
  SIDE_DEFS,
  citiesOf,
  cityAsks,
  cityLedger,
  cityOf,
  isCity,
  pactAt,
  pactPrice,
  riotCost,
  riotRisk,
} from '../src/city'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { placeRep } from '../src/reputation'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 95: народ и города.
 *
 * Город был местом с числом жителей и гарнизоном: он не хотел ничего. Здесь у
 * него появляется воля и две правды внутри — черни нужен хлеб и покой, купцам
 * дороги и право, — и выбирать между ними приходится тебе.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Государь с городами: большие места — его. */
function burgher(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 60000 }), 1, world)
  const big = Object.values(settlements)
    .filter((one) => one.population >= CITY.cityFrom)
    .sort((a, b) => b.population - a.population)
    .slice(0, 4)
  const map = { ...settlements }
  for (const one of big) map[one.locationId] = { ...one, owner: PLAYER }
  // И пара сёл в запас: из них возят хлеб.
  for (const one of Object.values(settlements)
    .filter((one) => one.population > 300 && one.population < CITY.cityFrom)
    .slice(0, 4)) {
    map[one.locationId] = { ...one, owner: PLAYER }
  }
  return {
    ...game,
    politics,
    settlements: map,
    time: WORLD_START,
    locationId: big[0]?.locationId ?? game.locationId,
    quarter: null,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

describe('На1 и На4: город как сила и две правды', () => {
  it('у города свои числа, и чернь с купцами смотрят в разные стороны', () => {
    const state = burgher()
    for (const city of citiesOf(state, world)) {
      console.log(
        `${city.name}: ${city.people} душ, сытость ${city.fed}, казна ${city.purse}; чернь ${city.commons}, купцы ${city.guilds} — ${city.says}`,
      )
    }
    expect(citiesOf(state, world).length).toBeGreaterThan(0)
    const village = Object.values(state.settlements).find((one) => one.population < 400)
    if (village) expect(isCity(village)).toBe(false)

    // Тяжёлая подать бьёт по обоим, но по купцам сильнее.
    const heavy: GameState = {
      ...state,
      law: { tax: 'heavy', toll: 'greedy', levy: 'full', justice: 'harsh' },
    }
    const before = cityOf(state, world, state.locationId)
    const after = cityOf(heavy, world, state.locationId)
    console.log(
      `${before?.name}: при обычной подати чернь ${before?.commons}/купцы ${before?.guilds}, при тяжёлой ${after?.commons}/${after?.guilds}`,
    )
    expect(after?.guilds ?? 0).toBeLessThan(before?.guilds ?? 0)
    console.log(
      `${SIDE_DEFS.commons.label}: ${SIDE_DEFS.commons.wants}; ${SIDE_DEFS.guilds.label}: ${SIDE_DEFS.guilds.wants}`,
    )
  })
})

describe('На2: чего просят', () => {
  it('просьбы берутся из положения города', () => {
    const state: GameState = {
      ...burgher(),
      law: { tax: 'heavy', toll: 'greedy', levy: 'full', justice: 'harsh' },
    }
    const city = cityOf(state, world, state.locationId)
    if (!city) return
    const asks = cityAsks(state, world, city)
    for (const one of asks) {
      console.log(`${one.label} (${one.from}): «${one.says}» — платишь ${one.costs}`)
    }
    expect(asks.length).toBeGreaterThan(0)
    const answered = ok(
      applyCommand(state, {
        type: 'answerCity',
        locationId: city.locationId,
        ask: asks[0]?.ask as never,
      }),
    )
    console.log(answered.log[answered.log.length - 1]?.text ?? '')
    expect(placeRep(answered.reputation, city.locationId)).toBeGreaterThan(
      placeRep(state.reputation, city.locationId),
    )
    for (const id of Object.keys(CITY_ASK_DEFS)) {
      expect(CITY_ASK_DEFS[id as keyof typeof CITY_ASK_DEFS].calms).toBeGreaterThan(0)
    }
  })
})

describe('На3: хлебный бунт', () => {
  it('бунт виден заранее и стоит городу людей', () => {
    const state = burgher()
    const id = state.locationId
    const settlement = state.settlements[id]
    if (!settlement) return
    // Ставим канун десятого дня: города считают раз в декаду, и голод не
    // должен успеть зарасти подвозом.
    const starving: GameState = {
      ...state,
      time: WORLD_START + 8 * 24 * 60,
      law: { tax: 'heavy', toll: 'greedy', levy: 'full', justice: 'harsh' },
      settlements: {
        ...state.settlements,
        [id]: {
          ...settlement,
          stock: { ...settlement.stock, grain: 0, fish: 0, honey: 0 },
          banditry: 0.5,
        },
      },
    }
    const city = cityOf(starving, world, id)
    if (!city) return
    const risk = riotRisk(starving, world, city)
    console.log(`${city.name}: счёт бунта ${risk.risk} при черте ${CITY.riotLine} — ${risk.why}`)
    console.log(riotCost(city).says)
    expect(risk.nigh).toBe(true)

    const before = starving.settlements[id]?.population ?? 0
    let run = starving
    for (let i = 0; i < 6; i += 1) {
      run = ok(applyCommand(run, { type: 'rest', hours: 12 }))
      run = ok(applyCommand(run, { type: 'rest', hours: 12 }))
      if (run.log.some((one) => one.text.includes('Хлебный бунт'))) break
    }
    console.log(
      `${run.log.find((one) => one.text.includes('Хлебный бунт'))?.text ?? 'бунта не случилось'} Жителей ${before} → ${run.settlements[id]?.population ?? 0}.`,
    )
    expect(run.log.some((one) => one.text.includes('Хлебный бунт'))).toBe(true)
    expect(run.settlements[id]?.population ?? 0).toBeLessThan(before - 1000)
  })
})

describe('На5: вольность как договор', () => {
  it('город платит за вольность и получает срок, а не милость', () => {
    const state = burgher()
    const city = cityOf(state, world, state.locationId)
    if (!city) return
    const price = pactPrice(city)
    const given = ok(
      applyCommand(state, {
        type: 'grantPact',
        locationId: city.locationId,
        guarantor: 'церковь',
      }),
    )
    const pact = pactAt(given, city.locationId)
    console.log(
      `${given.log[given.log.length - 1]?.text ?? ''} Казна ${state.character.money} → ${given.character.money}.`,
    )
    expect(pact).toBeTruthy()
    expect(given.character.money).toBe(state.character.money + price)
    expect(pact?.untilDay).toBeGreaterThan(pact?.sinceDay ?? 0)
    // Дважды одну вольность не дают.
    expect(applyCommand(given, { type: 'grantPact', locationId: city.locationId }).ok).toBe(false)
    const free = cityOf(given, world, city.locationId)
    console.log(`после договора: ${free?.says} Казна города ${city.purse} → ${free?.purse}.`)
    expect(free?.free).toBe(true)
    expect(free?.purse ?? 0).toBeGreaterThan(city.purse)
  })
})

describe('На6: города в отчёте', () => {
  it('счёт по городам виден числом', () => {
    const state = burgher()
    const ledger = cityLedger(state, world)
    console.log(ledger.says)
    expect(ledger.cities).toBeGreaterThan(0)
    expect(ledger.people).toBeGreaterThan(CITY.cityFrom)
    const none = cityLedger(createGame(createCharacter({ name: 'Никто' }), 1, world), world)
    console.log(none.says)
    expect(none.cities).toBe(0)
  })
})
