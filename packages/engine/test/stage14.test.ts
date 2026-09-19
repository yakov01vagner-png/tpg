import { describe, expect, it } from 'vitest'
import { tickBands } from '../src/band'
import type { Band } from '../src/band'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { BUILDING_IDS } from '../src/content/buildings'
import { ITEMS } from '../src/content/equipment'
import { GOOD_IDS } from '../src/content/goods'
import { createSettlements, priceOf } from '../src/economy'
import type { Settlement } from '../src/economy'
import { PLAYER, dailyTax } from '../src/holding'
import { foodSecurity, tickDays } from '../src/life'
import { knownMarkets, priceAgo, priceHistory, recordPrices } from '../src/market'
import { type Plague, tickPlague } from '../src/plague'
import { createRng } from '../src/rng'
import { deserialize, serialize } from '../src/save'
import type { GameState } from '../src/state'
import { SCHEMA_VERSION, createGame } from '../src/state'
import { generateWorld } from '../src/world/generate'
import { kingdomOf } from '../src/world/queries'

const world = generateWorld(1)
const start = createSettlements(world)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function wait(state: GameState, days: number): GameState {
  let current = state
  for (let i = 0; i < days; i += 1) {
    current = ok(applyCommand(current, { type: 'tick', minutes: 24 * 60 }))
  }
  return current
}

function placeOf(archetype: string): Settlement {
  const found = Object.values(start).find(
    (one) => world.locations[one.locationId]?.archetype === archetype,
  )
  if (!found) throw new Error(`нет места вида ${archetype}`)
  return found
}

describe('товары: пятнадцать, и у каждого своя земля', () => {
  it('пять новых товаров, и у всех мест есть их запас', () => {
    expect(GOOD_IDS).toHaveLength(15)
    for (const settlement of Object.values(start)) {
      for (const good of GOOD_IDS) expect(settlement.stock[good]).toBeGreaterThanOrEqual(1)
    }
  })

  it('серебро дёшево в руднике и дорого в столице; пряности — наоборот в порту', () => {
    const mine = placeOf('mine')
    const capital = placeOf('capital')
    const port = placeOf('port')
    expect(priceOf(world, mine, 'silver')).toBeLessThan(priceOf(world, capital, 'silver'))
    expect(priceOf(world, port, 'spices')).toBeLessThan(priceOf(world, capital, 'spices'))
  })
})

describe('постройки: двенадцать, и каждая меняет число', () => {
  const built = (settlement: Settlement, id: (typeof BUILDING_IDS)[number]): Settlement => ({
    ...settlement,
    buildings: [...settlement.buildings, id],
  })

  it('двенадцать построек', () => {
    expect(BUILDING_IDS).toHaveLength(12)
  })

  it('колодец и бани: мор уносит меньше', () => {
    const source = placeOf('city')
    const toll = (settlement: Settlement): number => {
      let places: Readonly<Record<string, Settlement>> = {
        ...start,
        [source.locationId]: settlement,
      }
      let plagues: readonly Plague[] = [
        { locationId: source.locationId, daysLeft: 40, severity: 1 },
      ]
      let rng = createRng(3)
      // Считаем умерших, а не убыль людей: с этапа 64 от мора ещё и бегут, и
      // ушедшие живы. «Мор уносит меньше» — про смерти, а не про отъезды.
      let deaths = 0
      for (let day = 1; day <= 40; day += 1) {
        const result = tickPlague(world, places, plagues, rng)
        plagues = result.plagues
        places = result.settlements
        rng = result.rng
        for (const event of result.events) {
          if (event.type === 'plagueDeaths' && event.locationId === source.locationId) {
            deaths += event.deaths
          }
        }
      }
      return deaths
    }
    const dirty = toll(source)
    const clean = toll(built(built(source, 'well'), 'bathhouse'))
    console.log(`мор в городе: без бань ${dirty}, с колодцем и банями ${clean}`)
    expect(clean).toBeLessThan(dirty * 0.7)
  })

  it('дозорная башня гасит разбой быстрее и уполовинивает набег', () => {
    const village = { ...placeOf('village'), banditry: 0.5 }
    const calm = tickDays(world, { [village.locationId]: village }, 30).settlements[
      village.locationId
    ]
    const watched = tickDays(world, { [village.locationId]: built(village, 'watchtower') }, 30)
      .settlements[village.locationId]
    expect(watched?.banditry ?? 1).toBeLessThan(calm?.banditry ?? 0)

    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    const raider: Band = {
      id: 'raider',
      lordId: base.politics.lords[0]?.id ?? 'x',
      kingdomId: null,
      units: { militia: 30 },
      morale: 70,
      locationId: village.locationId,
      travel: null,
      goal: { type: 'raid', targetId: village.locationId },
      siegeDays: 0,
    }
    const raid = (place: Settlement): number => {
      const result = tickBands(
        world,
        base.politics,
        { ...base.settlements, [village.locationId]: place },
        [raider],
        createRng(5),
      )
      return place.population - (result.settlements[village.locationId]?.population ?? 0)
    }
    const open = raid(village)
    const warned = raid(built(village, 'watchtower'))
    expect(open).toBeGreaterThan(0)
    expect(warned).toBeLessThan(open)
  })

  it('корчма прибавляет подати, склад — запасы', () => {
    const town = placeOf('town')
    expect(dailyTax(built(town, 'tavern'), foodSecurity(town))).toBeGreaterThanOrEqual(
      dailyTax(town, foodSecurity(town)),
    )
    const emptied: Settlement = { ...town, stock: { ...town.stock, cloth: 1, tools: 1 } }
    const plain = tickDays(world, { [town.locationId]: emptied }, 10).settlements[town.locationId]
    const stored = tickDays(world, { [town.locationId]: built(emptied, 'warehouse') }, 10)
      .settlements[town.locationId]
    expect(stored?.stock.cloth ?? 0).toBeGreaterThan(plain?.stock.cloth ?? 0)
  })
})

describe('записная книжка цен', () => {
  it('пишется там, где стоишь, не чаще раза в пять суток, и помнит год', () => {
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    // Первая запись — при первом же действии.
    const first = ok(applyCommand(base, { type: 'tick', minutes: 60 }))
    expect(priceHistory(first.priceLog, first.locationId, 'grain')).toHaveLength(1)
    const later = wait(first, 30)
    const history = priceHistory(later.priceLog, later.locationId, 'grain')
    expect(history.length).toBeGreaterThanOrEqual(6)
    expect(history.length).toBeLessThanOrEqual(8)
    // Соседей не знаем, пока не были там.
    expect(knownMarkets(later.priceLog, 'grain')).toHaveLength(1)
    const monthAgo = priceAgo(later.priceLog, later.locationId, 'grain', 31, 30)
    expect(monthAgo).not.toBeNull()
    expect(priceAgo(later.priceLog, later.locationId, 'grain', 31, 360)).toBeNull()
  })

  it('чистая функция: запись не меняет исходную книжку', () => {
    const empty = {}
    const place = placeOf('village')
    const once = recordPrices(empty, world, place, 1)
    expect(empty).toEqual({})
    expect(Object.keys(once)).toEqual([place.locationId])
  })
})

describe('вещи: тридцать, и есть именные', () => {
  it('тридцать вещей, четыре из них — одной короны', () => {
    expect(ITEMS).toHaveLength(30)
    expect(ITEMS.filter((item) => item.kingdomId).length).toBeGreaterThanOrEqual(4)
  })

  it('топор Дур-Хазада не купить в Ре-Эстизе', () => {
    const base = createGame(createCharacter({ name: 'Т', money: 5000 }), 1, world)
    const capital = world.kingdoms.reEstiz?.capitalId ?? ''
    const inReEstiz = applyCommand(
      { ...base, locationId: capital },
      { type: 'buyItem', itemId: 'dwarvenAxe' },
    )
    expect(inReEstiz.ok).toBe(false)
    const dwarvenCapital = world.kingdoms.durHazad?.capitalId ?? ''
    expect(kingdomOf(world, dwarvenCapital)?.id).toBe('durHazad')
    const inDurHazad = applyCommand(
      { ...base, locationId: dwarvenCapital },
      { type: 'buyItem', itemId: 'dwarvenAxe' },
    )
    // Может не хватить навыка или славы — но не места.
    if (!inDurHazad.ok) expect(inDurHazad.code).not.toBe('unavailableHere')
  })
})

describe('сейв', () => {
  it('старому месту досыпают новые товары, книжка пуста', () => {
    const state = createGame(createCharacter({ name: 'Т' }), 1, world)
    const saved = JSON.parse(serialize(state)) as Record<string, unknown>
    const settlements = saved.settlements as Record<string, Record<string, unknown>>
    for (const settlement of Object.values(settlements)) {
      const stock = settlement.stock as Record<string, number>
      stock.honey = undefined as unknown as number
      stock.silver = undefined as unknown as number
    }
    saved.priceLog = undefined
    saved.schemaVersion = 12
    const loaded = deserialize(JSON.stringify(saved))
    if (!loaded.ok) throw new Error(loaded.error)
    expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(loaded.state.priceLog).toEqual({})
    for (const settlement of Object.values(loaded.state.settlements)) {
      expect(settlement.stock.honey).toBeGreaterThanOrEqual(1)
      expect(settlement.stock.silver).toBeGreaterThanOrEqual(1)
    }
    expect(loaded.state.settlements[state.locationId]?.owner).not.toBe(PLAYER)
  })
})
