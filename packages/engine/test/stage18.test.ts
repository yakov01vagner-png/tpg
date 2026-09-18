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

/** Расстояние между местами по карте. */
function span(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
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

  it('мест за полтысячи, и две трети из них — без жителей', () => {
    for (const seed of SEEDS) {
      const current = generateWorld(seed)
      const all = Object.keys(current.locations).length
      const wild = sitesOf(current).length
      // С версии 0.4 между любыми двумя поселениями лежит не меньше двух мест
      // без жителей (этап 26), поэтому глушь и стала большинством мира: её
      // ровно столько, сколько нужно, чтобы дорога шла по земле.
      expect(all, `зерно ${seed}`).toBeGreaterThan(450)
      expect(wild / all, `зерно ${seed}`).toBeGreaterThan(0.6)
      expect(wild / all, `зерно ${seed}`).toBeLessThan(0.85)
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
    // Работа в глуши бывает (этап 21), но только та, что названа прямо: ни
    // конюшен, ни прилавка, ни наставника здесь нет и быть не может.
    for (const job of jobsAt(there)) {
      expect(job.where?.archetypes, job.id).toContain(site.archetype)
    }
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

  it('дорога в глушь ведёт к ближайшим соседям, а не к однопровинциальным', () => {
    // Граница провинции — не стена: дорога из урочища идёт туда, куда ближе.
    // Пока дороги строились из списков, сосед у места был тот, кто оказался
    // рядом в перечислении провинции, — отсюда и хорды через полмира.
    let ownProvince = 0
    let total = 0
    for (const site of sitesOf(world)) {
      const roads = roadsFrom(world, site.id)
      expect(roads.length, `${site.name} без дорог`).toBeGreaterThan(0)
      // Ближайшее место мира обязано быть соседом: иначе дорога прошла мимо.
      const nearest = Object.values(world.locations)
        .filter((one) => one.id !== site.id)
        .sort((a, b) => span(site, a) - span(site, b))[0]
      expect(
        roads.some((road) => road.to === nearest?.id),
        `${site.name}: ближайший сосед ${nearest?.name} не связан дорогой`,
      ).toBe(true)
      for (const road of roads) {
        total += 1
        if (world.locations[road.to]?.provinceId === site.provinceId) ownProvince += 1
      }
    }
    // И всё же глушь принадлежит своей земле: большинство её дорог — домашние.
    console.log(`дорог из глуши: ${total}, из них внутри своей провинции ${ownProvince}`)
    expect(ownProvince / total).toBeGreaterThan(0.5)
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
