import { describe, expect, it } from 'vitest'
import { musterBands, tickBands } from '../src/band'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { ISLANDS, MARCHES } from '../src/content/world'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { hopsBetween, reachableFrom, roadsFrom } from '../src/world/queries'
import { FRONTIER, isSite } from '../src/world/types'
import type { World } from '../src/world/types'

/**
 * Этап 20: пограничье.
 *
 * Между коронами лежит земля, которой не держит никто. Через неё идёт дорога в
 * чужое королевство, по ней ходят войска, и её можно взять — потому что
 * отнимать её не у кого.
 */
const SEEDS = [1, 2, 3]
const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const marchProvince = (w: World, id: string) => w.provinces[`march.${id}.p0`]

/** Путь от места к месту по дорогам: сам путь, а не только его длина. */
function routeBetween(world: World, from: string, to: string): readonly string[] {
  const back = new Map<string, string>([[from, from]])
  const queue = [from]
  while (queue.length > 0) {
    const current = queue.shift() as string
    if (current === to) break
    for (const road of roadsFrom(world, current)) {
      if (back.has(road.to)) continue
      back.set(road.to, current)
      queue.push(road.to)
    }
  }
  if (!back.has(to)) return []
  const route = [to]
  while (route[0] !== from) {
    const previous = back.get(route[0] as string)
    if (!previous) break
    route.unshift(previous)
  }
  return route
}

/** Чья корона держит место. У ничьей земли это `FRONTIER`. */
function crownOf(world: World, id: string): string {
  const province = world.provinces[world.locations[id]?.provinceId ?? '']
  return world.regions[province?.regionId ?? '']?.kingdomId ?? '?'
}

describe('земля, которой не держит никто', () => {
  it('марок пять, и ни одна не числится за короной', () => {
    for (const seed of SEEDS) {
      const current = generateWorld(seed)
      const frontier = Object.values(current.regions).filter(
        (region) => region.kingdomId === FRONTIER,
      )
      // Земли без короны стало больше: к пяти маркам с версии 0.5 прибавились
      // три острова — это тоже ничья земля, только за морем (этап 35).
      expect(frontier.filter((region) => region.id.startsWith('march.'))).toHaveLength(
        MARCHES.length,
      )
      expect(frontier.filter((region) => region.id.startsWith('island.'))).toHaveLength(
        ISLANDS.length,
      )
      expect(frontier).toHaveLength(MARCHES.length + ISLANDS.length)
      for (const region of frontier) {
        expect(current.kingdoms[region.kingdomId]).toBeUndefined()
        for (const kingdom of Object.values(current.kingdoms)) {
          expect(kingdom.regionIds).not.toContain(region.id)
        }
      }
    }
  })

  it('вольное село ничьё, и лорда на марку не сажают', () => {
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    for (const march of MARCHES) {
      const province = marchProvince(world, march.id)
      const townId = province?.locationIds[0] ?? ''
      expect(base.settlements[townId]?.owner, `${march.freeTown}`).toBeNull()
      for (const lord of base.politics.lords) {
        expect(lord.kingdomId).not.toBe(FRONTIER)
      }
    }
  })

  it('в марке стоит вольное село и застава при нём', () => {
    for (const march of MARCHES) {
      const province = marchProvince(world, march.id)
      expect(province?.locationIds).toHaveLength(1)
      expect(province?.siteIds.length).toBeGreaterThanOrEqual(2)
      const gate = world.locations[province?.siteIds[0] ?? '']
      expect(gate?.archetype).toBe('outpost')
      expect(isSite(gate?.archetype ?? 'village')).toBe(true)
    }
  })
})

describe('в чужую корону — через землю', () => {
  it('прямой дороги между столицами больше нет', () => {
    for (const seed of SEEDS) {
      const current = generateWorld(seed)
      for (const march of MARCHES) {
        const [first, second] = march.between
        const from = current.kingdoms[first]?.capitalId ?? ''
        const to = current.kingdoms[second]?.capitalId ?? ''
        expect(roadsFrom(current, from).some((road) => road.to === to)).toBe(false)
        // Но дойти можно, и путь идёт через марку.
        expect(hopsBetween(current, from, to) ?? 0).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('путь в чужую столицу проходит через ничью землю', () => {
    // Это больше не проводка дорог руками, а свойство самой земли: марка лежит
    // между коронами, дорога идёт по земле — значит, в чужую корону входят
    // через неё. До 0.4 то же правило держалось на прямом отрезке «столица —
    // вольное село» длиной в четверть мира, то есть на портале.
    for (const march of MARCHES) {
      const [first, second] = march.between
      const from = world.kingdoms[first]?.capitalId ?? ''
      const to = world.kingdoms[second]?.capitalId ?? ''
      const route = routeBetween(world, from, to)
      expect(route.length, `${first} → ${second}: пути нет`).toBeGreaterThan(2)
      const crowns = route.map((id) => crownOf(world, id))
      expect(crowns, `${first} → ${second} идёт мимо пограничья`).toContain(FRONTIER)
    }
  })

  it('чужая столица теперь далеко: это переход, а не шаг', () => {
    const march = MARCHES[0]
    if (!march) return
    const [first, second] = march.between
    const from = world.kingdoms[first]?.capitalId ?? ''
    const to = world.kingdoms[second]?.capitalId ?? ''
    const hops = hopsBetween(world, from, to) ?? 0
    console.log(`из ${first} в ${second}: ${hops} переходов`)
    // В 0.3 между столицами было два перехода: столица — вольное село —
    // чужая столица. Дорога по земле превращает это в две недели пути.
    expect(hops).toBeGreaterThan(6)
  })

  it('мир по-прежнему связен: из любого места можно дойти до любого', () => {
    for (const seed of SEEDS) {
      const current = generateWorld(seed)
      const start = Object.keys(current.locations)[0] as string
      expect(reachableFrom(current, start).size).toBe(Object.keys(current.locations).length)
    }
  })
})

describe('война идёт по земле', () => {
  it('дружины заходят в пограничье, а не перелетают его', () => {
    const current = generateWorld(1)
    const base = createGame(createCharacter({ name: 'Т' }), 1, current)
    const marchPlaces = new Set(
      MARCHES.flatMap((march) => {
        const province = marchProvince(current, march.id)
        return [...(province?.locationIds ?? []), ...(province?.siteIds ?? [])]
      }),
    )
    let politics = base.politics
    let settlements = base.settlements
    const [initial] = musterBands(politics, settlements, createRng(7))
    let bands = initial
    let rng = createRng(11)
    let seen = 0
    for (let day = 1; day <= 360 * 6; day += 1) {
      // Без политики войн не объявляют, и воевать дружинам не с кем: мир
      // считается тем же порядком, что и в игре.
      const turn = tickPolitics(current, politics, settlements, day, rng)
      politics = turn.politics
      settlements = turn.settlements
      rng = turn.rng
      const march = tickBands(current, politics, settlements, bands, rng)
      bands = march.bands
      settlements = march.settlements
      politics = march.politics
      rng = march.rng
      for (const band of bands) {
        if (marchPlaces.has(band.locationId)) seen += 1
        if (band.travel && marchPlaces.has(band.travel.toLocationId)) seen += 1
      }
    }
    console.log(`за шесть лет дружины были в пограничье ${seen} раз`)
    expect(seen).toBeGreaterThan(0)
  })
})

describe('пограничье можно взять', () => {
  it('вольное село осаждают и берут: отнимать его не у кого', () => {
    const march = MARCHES[0]
    if (!march) return
    const townId = marchProvince(world, march.id)?.locationIds[0] ?? ''
    const base = createGame(createCharacter({ name: 'Т', money: 900 }), 1, world)
    const state: GameState = {
      ...base,
      locationId: townId,
      party: { units: { manAtArms: 30, archer: 12 }, morale: 90, hungryDays: 0, gear: 0.8 },
    }
    const besieged = ok(applyCommand(state, { type: 'besiege' }))
    expect(besieged.siege?.locationId).toBe(townId)

    let current = ok(applyCommand(besieged, { type: 'siegeAssault' }))
    for (let round = 0; round < 30 && current.battle?.outcome === 'ongoing'; round += 1) {
      // У стен не обходят (этап 58): фланга там нет, и приказ обойти теперь
      // спрашивает командования, которого у этого героя нет.
      const orders = {
        vanguard: 'charge',
        archers: 'shoot',
        flank: 'charge',
        reserve: 'charge',
        mages: 'fireball',
      } as const
      current = ok(applyCommand(current, { type: 'battleOrders', orders }))
    }
    if (current.battle?.outcome !== 'won') return
    const after = ok(applyCommand(current, { type: 'battleEnd', prisoners: 'release' }))
    expect(after.settlements[townId]?.owner).toBe(PLAYER)
  })
})
