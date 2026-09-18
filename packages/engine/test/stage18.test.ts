import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { SITES } from '../src/content/sites'
import { createSettlements } from '../src/economy'
import { coursesAt, jobsAt } from '../src/place'
import { deserialize, serialize } from '../src/save'
import { SCHEMA_VERSION, createGame } from '../src/state'
import type { GameState } from '../src/state'
import { generateWorld } from '../src/world/generate'
import { roadsFrom } from '../src/world/queries'
import { isSettlement, isSite } from '../src/world/types'
import type { SiteKind, World } from '../src/world/types'

/**
 * Этап 18: места без жителей.
 *
 * Главное здесь не то, что на карте прибавилось значков, а то, что допущение
 * «локация = поселение» перестало действовать: у кургана нет ни жителей, ни
 * запасов, ни хозяина, и всё, что считало людей, об этом знает.
 */
const SEEDS = [1, 2, 3]
const world = generateWorld(1)

const sitesOf = (w: World) => Object.values(w.locations).filter((one) => isSite(one.archetype))

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

describe('мир, в котором есть не только деревни', () => {
  it('в каждой провинции стоит хотя бы два места без жителей', () => {
    for (const seed of SEEDS) {
      const current = generateWorld(seed)
      for (const province of Object.values(current.provinces)) {
        expect(province.siteIds.length, `${province.id} без мест`).toBeGreaterThanOrEqual(2)
        for (const siteId of province.siteIds) {
          expect(isSite(current.locations[siteId]?.archetype ?? 'village')).toBe(true)
        }
      }
    }
  })

  it('мест около ста двадцати, и почти половина — без жителей', () => {
    for (const seed of SEEDS) {
      const current = generateWorld(seed)
      const all = Object.keys(current.locations).length
      const wild = sitesOf(current).length
      expect(all).toBeGreaterThan(100)
      expect(wild / all).toBeGreaterThan(0.35)
      expect(wild / all).toBeLessThan(0.6)
    }
  })

  it('вид места выводится из земли: гать только в топях, перевал только в горах', () => {
    for (const seed of SEEDS) {
      const current = generateWorld(seed)
      for (const site of sitesOf(current)) {
        const def = SITES[site.archetype as SiteKind]
        if (!def.terrains) continue
        expect(def.terrains, `${site.name} на чужой земле`).toContain(site.terrain)
      }
    }
  })

  it('имена согласованы по роду и не повторяются', () => {
    const names = Object.values(world.locations).map((one) => one.name)
    expect(new Set(names).size).toBe(names.length)
    for (const site of sitesOf(world)) {
      const def = SITES[site.archetype as SiteKind]
      expect(site.name.endsWith(def.noun), `${site.name} — не ${def.noun}`).toBe(true)
    }
  })
})

describe('у места без жителей нет ничего, что считает людей', () => {
  const settlements = createSettlements(world)

  it('поселения для него не заводят', () => {
    for (const site of sitesOf(world)) {
      expect(settlements[site.id], `${site.name} завели как поселение`).toBeUndefined()
      expect(site.population).toBe(0)
    }
    for (const id of Object.keys(settlements)) {
      expect(isSettlement(world.locations[id]?.archetype ?? 'pass')).toBe(true)
    }
  })

  it('там не нанимают, не строят и не покупают', () => {
    const site = sitesOf(world)[0]
    if (!site) throw new Error('нет мест без жителей')
    const base = createGame(createCharacter({ name: 'Т', money: 5000 }), 1, world)
    const there: GameState = { ...base, locationId: site.id }
    for (const command of [
      { type: 'hire', troop: 'militia', count: 1 },
      { type: 'build', building: 'granary' },
      { type: 'buyItem', itemId: 'club' },
    ] as const) {
      const result = applyCommand(there, command)
      expect(result.ok, `${command.type} прошло в глуши`).toBe(false)
    }
    expect(jobsAt(there)).toHaveLength(0)
    expect(coursesAt(there)).toHaveLength(0)
  })
})

describe('до глуши можно дойти', () => {
  it('у каждого места без жителей есть дорога', () => {
    for (const seed of SEEDS) {
      const current = generateWorld(seed)
      for (const site of sitesOf(current)) {
        expect(roadsFrom(current, site.id).length, `${site.name} без дорог`).toBeGreaterThan(0)
      }
    }
  })

  it('дорога в глушь ведёт к своим же соседям по провинции', () => {
    for (const site of sitesOf(world)) {
      // Кроме заставы в марке: она нарочно смотрит в чужую корону, через неё
      // и входят в соседнее королевство (этап 20).
      if (site.provinceId.startsWith('march.')) continue
      for (const road of roadsFrom(world, site.id)) {
        expect(world.locations[road.to]?.provinceId).toBe(site.provinceId)
      }
    }
  })

  it('туда доходят обычной командой, и время идёт', () => {
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    const road = roadsFrom(world, base.locationId).find((one) =>
      isSite(world.locations[one.to]?.archetype ?? 'village'),
    )
    if (!road) return
    const after = ok(applyCommand(base, { type: 'travel', toLocationId: road.to }))
    expect(after.locationId).toBe(road.to)
    expect(after.time).toBeGreaterThan(base.time)
    expect(after.settlements[road.to]).toBeUndefined()
  })
})

describe('сейв', () => {
  it('старый герой доигрывает на старой земле, без мест без жителей', () => {
    const state = createGame(createCharacter({ name: 'Т' }), 1, world)
    const saved = JSON.parse(serialize(state)) as Record<string, unknown>
    const savedWorld = saved.world as Record<string, unknown>
    const provinces = savedWorld.provinces as Record<string, Record<string, unknown>>
    for (const province of Object.values(provinces)) province.siteIds = undefined
    saved.schemaVersion = 14
    const loaded = deserialize(JSON.stringify(saved))
    if (!loaded.ok) throw new Error(loaded.error)
    expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION)
    for (const province of Object.values(loaded.state.world.provinces)) {
      expect(province.siteIds).toEqual([])
    }
  })
})
