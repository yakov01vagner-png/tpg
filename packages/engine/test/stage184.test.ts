import { describe, expect, it } from 'vitest'
import { burghRoll, charterTerms, cityOffers, cityRivals, guildsAt, magistrateAt, militiaAt } from '../src/burgh'
import { createCharacter } from '../src/character'
import { citiesOf } from '../src/city'
import { BURGH, GUILD_DEFS } from '../src/content/burgh'
import { type Settlement, createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 184: город и вольности.
 *
 * Город был местом с казной и настроением, а вольность — флагом: есть или нет.
 * Внутри города не было никого: ни цехов, ни магистрата, ни ополчения.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function ruler(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 4000)
    .slice(0, 3)
  const map = { ...settlements }
  for (const one of mine) {
    map[one.locationId] = { ...one, owner: PLAYER, buildings: ['market', 'smithy'] }
  }
  return {
    ...game,
    politics,
    settlements: map,
    time: WORLD_START,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

describe('Гр1: город — не место побольше', () => {
  it('у города есть цехи, магистрат и своё ополчение', () => {
    const state = ruler()
    const city = citiesOf(state, world).find((one) => state.settlements[one.locationId]?.owner === PLAYER)
    expect(city).toBeTruthy()
    if (!city) return
    const guilds = guildsAt(state, world, city.locationId)
    console.log(`${city.name}: ${guilds.map((one) => GUILD_DEFS[one].label).join(', ')}`)
    expect(guilds.length).toBeGreaterThan(0)
    for (const one of magistrateAt(state, world, city.locationId)) console.log(one.says)
    expect(magistrateAt(state, world, city.locationId).length).toBeGreaterThan(1)
    const militia = militiaAt(city)
    console.log(militia.says)
    expect(militia.men).toBeGreaterThan(0)
    // Довольный город даёт людей охотнее недовольного.
    expect(militiaAt({ ...city, commons: 50 }).men).toBeGreaterThan(
      militiaAt({ ...city, commons: -50 }).men,
    )
  })
})

describe('Гр2 и Гр3: вольность как договор, и город торгуется', () => {
  it('в вольности написано, что город отдаёт и что берёт', () => {
    const state = ruler()
    const city = citiesOf(state, world).find((one) => state.settlements[one.locationId]?.owner === PLAYER)
    if (!city) return
    const terms = charterTerms(state, world, city, 1)
    console.log(terms.says)
    expect(terms.has).toBe(false)
    expect(terms.paysNow).toBeGreaterThan(0)
    expect(terms.gets.length).toBe(3)
    expect(BURGH.charterCosts).toBeGreaterThan(1)
  })

  it('город даёт заём, просит вольность и требует защиты', () => {
    const state = ruler()
    const city = citiesOf(state, world).find((one) => state.settlements[one.locationId]?.owner === PLAYER)
    if (!city) return
    const rich = { ...city, purse: 9000 }
    const offers = cityOffers(
      {
        ...state,
        settlements: {
          ...state.settlements,
          [city.locationId]: { ...(state.settlements[city.locationId] as Settlement), banditry: 0.5 },
        },
      },
      world,
      rich,
      1,
    )
    for (const one of offers) console.log(`${one.what}: ${one.says}`)
    expect(offers.some((one) => one.what === 'заём')).toBe(true)
    expect(offers.some((one) => one.what === 'защита')).toBe(true)
  })
})

describe('Гр5 и Гр6: города между собой и в числах', () => {
  it('соседний город — соперник, и это названо', () => {
    const state = ruler()
    const rows = citiesOf(state, world)
    const first = rows[0]
    if (!first) return
    const rivals = cityRivals(state, world, first)
    for (const one of rivals.slice(0, 3)) console.log(one.says)
    expect(rivals.every((one) => one.hops <= BURGH.rivalHops)).toBe(true)
  })

  it('города в числах', () => {
    const state = ruler()
    const rolled = burghRoll(state, world, 1)
    console.log(rolled.says)
    expect(rolled.cities).toBeGreaterThan(0)
    expect(rolled.militia).toBeGreaterThan(0)
  })
})
