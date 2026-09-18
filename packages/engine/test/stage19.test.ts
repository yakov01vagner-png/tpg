import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { SITES } from '../src/content/sites'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { generateWorld } from '../src/world/generate'
import { roadsFrom } from '../src/world/queries'
import { UNITS_PER_HOUR, hoursBetweenPlaces } from '../src/world/roads'
import { isSite } from '../src/world/types'
import type { SiteKind, World } from '../src/world/types'
import { walkLog } from './road'

/**
 * Этап 19: дорога через землю.
 *
 * Дорога перестала быть числом часов между двумя деревнями. Она идёт через
 * места: брод, перевал, урочище, — и каждый отрезок берёт свою цену и свою
 * опасность у той земли, по которой проложен.
 */
const SEEDS = [1, 2, 3]
const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

describe('путь складывается из отрезков', () => {
  it('места без жителей стоят на дорогах, а не висят сбоку', () => {
    for (const seed of SEEDS) {
      const current = generateWorld(seed)
      const wild = Object.values(current.locations).filter((one) => isSite(one.archetype))
      const onRoute = wild.filter((one) => roadsFrom(current, one.id).length >= 2)
      // Большинство стоит прямо в цепочке между двумя местами; остальные —
      // тупики, к которым ходят нарочно.
      expect(onRoute.length / wild.length, `зерно ${seed}`).toBeGreaterThan(0.5)
    }
  })

  it('у деревни в соседях бывает не только деревня', () => {
    const wildNeighbours = Object.values(world.locations)
      .filter((one) => !isSite(one.archetype))
      .filter((one) =>
        roadsFrom(world, one.id).some((road) =>
          isSite(world.locations[road.to]?.archetype ?? 'village'),
        ),
      )
    expect(wildNeighbours.length).toBeGreaterThan(Object.keys(world.provinces).length)
  })

  it('дорога никого не бросает: до всякого места можно дойти', () => {
    for (const seed of SEEDS) {
      const current = generateWorld(seed)
      for (const location of Object.values(current.locations)) {
        expect(roadsFrom(current, location.id).length, `${location.name} отрезан`).toBeGreaterThan(
          0,
        )
      }
    }
  })
})

describe('отрезок берёт цену у земли', () => {
  const legsTo = (w: World, kind: SiteKind): number[] => {
    const hours: number[] = []
    for (const [from, roads] of Object.entries(w.roads)) {
      for (const road of roads) {
        if (w.locations[road.to]?.archetype === kind || w.locations[from]?.archetype === kind) {
          hours.push(road.hours)
        }
      }
    }
    return hours
  }

  it('через гать и перевал идти дольше, чем мимо святилища', () => {
    const slow: number[] = []
    const quick: number[] = []
    for (const seed of SEEDS) {
      const current = generateWorld(seed)
      slow.push(...legsTo(current, 'causeway'), ...legsTo(current, 'pass'))
      quick.push(...legsTo(current, 'shrine'), ...legsTo(current, 'spring'))
    }
    const mean = (values: number[]) => values.reduce((sum, one) => sum + one, 0) / values.length
    console.log(
      `отрезок через топь и перевал ${mean(slow).toFixed(1)} ч, мимо святилища ${mean(quick).toFixed(1)} ч`,
    )
    expect(mean(slow)).toBeGreaterThan(mean(quick))
  })

  it('часы отрезка сходятся с тем, во сколько раз место замедляет', () => {
    for (const site of Object.values(world.locations)) {
      if (!isSite(site.archetype)) continue
      // Застава в марке держит дорогу между коронами, а не отрезок внутри
      // провинции: её часы меряются сутками пути, а не землёй под ногами.
      if (site.provinceId.startsWith('march.')) continue
      const slow = SITES[site.archetype as SiteKind].slow
      for (const road of roadsFrom(world, site.id)) {
        // Часы теперь считает земля: расстояние по карте, местность обоих
        // концов и то, во сколько раз замедляет само место (roads.ts). Сверяем
        // с той же формулой — она и есть правило.
        const to = world.locations[road.to]
        if (!to) continue
        expect(road.hours, `${site.name} → ${to.name}`).toBe(hoursBetweenPlaces(site, to))
        expect(road.hours).toBeGreaterThanOrEqual(1)
        // Замедление места видно в цене: отрезок дороже, чем был бы по ровному.
        const plain = Math.hypot(site.x - to.x, site.y - to.y) / UNITS_PER_HOUR
        expect(road.hours, `${site.name}`).toBeGreaterThanOrEqual(Math.floor(plain * slow * 0.9))
      }
    }
  })
})

describe('встреча в пути — по земле, а не по разбою места назначения', () => {
  function walkInto(kind: SiteKind, seeds: number): number {
    const site = Object.values(world.locations).find((one) => one.archetype === kind)
    if (!site) return -1
    const road = roadsFrom(world, site.id)[0]
    if (!road) return -1
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    let met = 0
    for (let seed = 1; seed <= seeds; seed += 1) {
      const state: GameState = { ...base, locationId: road.to, rng: createRng(seed) }
      // Встреча случается в конце пути, а путь теперь занимает часы: идём.
      const started = applyCommand(state, { type: 'travel', toLocationId: site.id })
      if (!started.ok) continue
      const after = walkLog(started.state)
      const events = after.lines
      if (events.some((line) => line.includes('Разбойники') || line.includes('дороге ждали'))) {
        met += 1
      }
    }
    return met
  }

  it('в урочище нарываются чаще, чем у святилища', () => {
    const grim = walkInto('wilds', 60)
    const calm = walkInto('shrine', 60)
    console.log(`встреч из 60: урочище ${grim}, святилище ${calm}`)
    if (grim < 0 || calm < 0) return
    expect(grim).toBeGreaterThan(calm)
  })
})
