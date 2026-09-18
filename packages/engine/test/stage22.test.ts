import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { KINGDOM_BLUEPRINTS, KINGDOM_SHORT, MARCHES } from '../src/content/world'
import { createGame } from '../src/state'
import { generateWorld } from '../src/world/generate'
import { worldGrid } from '../src/world/grid'
import { MAP_SIZE, layoutOf } from '../src/world/layout'
import { FRONTIER, isSite } from '../src/world/types'

/**
 * Этап 22: карта шире.
 *
 * Мир вырос вдвое, и проверяется не «стало больше», а то, что от роста не
 * посыпалось: земля у каждой провинции есть, полотно считается за кадр, имена
 * для общего вида короткие.
 */
const SEEDS = [1, 2, 3]

describe('мир вдвое больше', () => {
  it('у каждой короны по три области', () => {
    for (const blueprint of KINGDOM_BLUEPRINTS) {
      expect(blueprint.regions.length, blueprint.id).toBe(3)
    }
    const world = generateWorld(1)
    for (const kingdom of Object.values(world.kingdoms)) {
      expect(kingdom.regionIds).toHaveLength(3)
    }
  })

  it('мест за две сотни, и почти половина — без жителей', () => {
    for (const seed of SEEDS) {
      const world = generateWorld(seed)
      const all = Object.values(world.locations)
      const wild = all.filter((one) => isSite(one.archetype))
      console.log(`зерно ${seed}: мест ${all.length}, без жителей ${wild.length}, провинций ${Object.keys(world.provinces).length}`)
      expect(all.length).toBeGreaterThan(200)
      expect(wild.length / all.length).toBeGreaterThan(0.35)
      expect(Object.keys(world.provinces).length).toBeGreaterThan(40)
    }
  })

  it('пограничье не потерялось в большом мире', () => {
    const world = generateWorld(1)
    const frontier = Object.values(world.regions).filter((one) => one.kingdomId === FRONTIER)
    expect(frontier).toHaveLength(MARCHES.length)
  })

  it('у каждой короны есть короткое имя для общего вида', () => {
    for (const blueprint of KINGDOM_BLUEPRINTS) {
      const short = KINGDOM_SHORT[blueprint.id]
      expect(short, blueprint.id).toBeDefined()
      expect((short ?? '').length).toBeLessThan(blueprint.name.length)
    }
  })
})

describe('полотно выдерживает рост', () => {
  it('сетка и раскладка считаются за кадр', () => {
    const world = generateWorld(1)
    const gridStart = performance.now()
    worldGrid(world, MAP_SIZE)
    const gridMs = performance.now() - gridStart
    const layoutStart = performance.now()
    layoutOf(world)
    const layoutMs = performance.now() - layoutStart
    console.log(`сетка ${gridMs.toFixed(1)} мс, раскладка ${layoutMs.toFixed(1)} мс`)
    expect(gridMs).toBeLessThan(60)
    expect(layoutMs).toBeLessThan(30)
  })

  it('сейв большого мира остаётся переносимым строкой', () => {
    const game = createGame(createCharacter({ name: 'Т' }), 1)
    const size = JSON.stringify(game).length
    console.log(`сейв большого мира: ${(size / 1024).toFixed(0)} КБ`)
    expect(size).toBeLessThan(400 * 1024)
  })
})
