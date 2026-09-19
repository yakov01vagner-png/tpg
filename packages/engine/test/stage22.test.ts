import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { ISLANDS, KINGDOM_BLUEPRINTS, KINGDOM_SHORT, MARCHES } from '../src/content/world'
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

/** Цена работы по лучшему из прогонов: среднее здесь мерит чужую нагрузку. */
function fastest(work: () => void, times = 5): number {
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < times; i += 1) {
    const began = performance.now()
    work()
    best = Math.min(best, performance.now() - began)
  }
  return best
}

describe('мир вдвое больше', () => {
  it('у каждой короны по четыре области', () => {
    for (const blueprint of KINGDOM_BLUEPRINTS) {
      expect(blueprint.regions.length, blueprint.id).toBe(4)
    }
    const world = generateWorld(1)
    for (const kingdom of Object.values(world.kingdoms)) {
      expect(kingdom.regionIds).toHaveLength(4)
    }
  })

  it('мест за две сотни, и почти половина — без жителей', () => {
    for (const seed of SEEDS) {
      const world = generateWorld(seed)
      const all = Object.values(world.locations)
      const wild = all.filter((one) => isSite(one.archetype))
      console.log(
        `зерно ${seed}: мест ${all.length}, без жителей ${wild.length}, провинций ${Object.keys(world.provinces).length}`,
      )
      expect(all.length).toBeGreaterThan(200)
      expect(wild.length / all.length).toBeGreaterThan(0.35)
      expect(Object.keys(world.provinces).length).toBeGreaterThan(40)
    }
  })

  it('пограничье не потерялось в большом мире', () => {
    const world = generateWorld(1)
    const frontier = Object.values(world.regions).filter((one) => one.kingdomId === FRONTIER)
    // Ничья земля — это марки и острова (этап 35): и те и другие не числятся
    // ни за одной короной.
    expect(frontier.filter((one) => one.id.startsWith('march.'))).toHaveLength(MARCHES.length)
    expect(frontier).toHaveLength(MARCHES.length + ISLANDS.length)
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
    // По лучшему из прогонов: тесты идут в несколько потоков, и соседний файл,
    // считающий двадцать лет войны, растягивает чужой замер вдвое-втрое.
    // Восемь попыток, а не пять: при полном прогоне счёт делят десятки
    // процессов, и лучшая из пяти выходила выше порога там, где та же работа в
    // одиночку стоит вдвое меньше. Мерить надо цену работы, а не давку в
    // очереди за счётом (то же сделано в stage48).
    const gridMs = fastest(() => worldGrid(world, MAP_SIZE), 8)
    const layoutMs = fastest(() => layoutOf(world))
    console.log(`сетка ${gridMs.toFixed(1)} мс, раскладка ${layoutMs.toFixed(1)} мс`)
    expect(gridMs).toBeLessThan(40)
    expect(layoutMs).toBeLessThan(10)
  })

  it('сейв большого мира остаётся переносимым строкой', () => {
    const game = createGame(createCharacter({ name: 'Т' }), 1)
    const size = JSON.stringify(game).length
    console.log(`сейв большого мира: ${(size / 1024).toFixed(0)} КБ`)
    // Граница поднята с четырёхсот килобайт до мегабайта на материке (этап
    // 44): мест втрое больше, чем было в 0.3, — см. perf.test.ts.
    expect(size).toBeLessThan(1024 * 1024)
  })
})
