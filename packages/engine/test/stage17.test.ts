import { describe, expect, it } from 'vitest'
import { generateWorld } from '../src/world/generate'
import { GRID_SIZE, worldGrid } from '../src/world/grid'
import { MAP_SIZE, layoutOf, provinceCentersOf } from '../src/world/layout'
import type { World } from '../src/world/types'

/**
 * Этап 17: провинция — земля, а не список.
 *
 * Проверяется не то, что карта красивая, а то, ради чего её переделывали:
 * у каждой провинции есть своя земля; место стоит на земле своей провинции;
 * между местами есть глушь; материк связный, а не россыпь островов.
 */
const SEEDS = [1, 2, 3]

function gridOf(world: World) {
  return worldGrid(world, MAP_SIZE)
}

describe('у провинции есть земля', () => {
  it('ни одна провинция не осталась без клеток — даже с единственным местом', () => {
    for (const seed of SEEDS) {
      const world = generateWorld(seed)
      const grid = gridOf(world)
      const acres = new Map<string, number>()
      for (const cell of grid.cells) {
        if (!cell) continue
        acres.set(cell.provinceId, (acres.get(cell.provinceId) ?? 0) + 1)
      }
      for (const provinceId of Object.keys(world.provinces)) {
        const own = acres.get(provinceId) ?? 0
        expect(own, `${provinceId} без земли на зерне ${seed}`).toBeGreaterThan(8)
      }
    }
  })

  it('середина провинции лежит на её же земле', () => {
    const world = generateWorld(1)
    const grid = gridOf(world)
    for (const [provinceId, point] of Object.entries(provinceCentersOf(world))) {
      const column = Math.floor(point.x / grid.cell)
      const row = Math.floor(point.y / grid.cell)
      if (column < 0 || row < 0 || column >= GRID_SIZE || row >= GRID_SIZE) continue
      expect(grid.cells[row * GRID_SIZE + column]?.provinceId).toBe(provinceId)
    }
  })

  it('место стоит на земле своей провинции, а не соседней', () => {
    for (const seed of SEEDS) {
      const world = generateWorld(seed)
      const grid = gridOf(world)
      const points = layoutOf(world)
      for (const [locationId, point] of Object.entries(points)) {
        const column = Math.min(GRID_SIZE - 1, Math.floor(point.x / grid.cell))
        const row = Math.min(GRID_SIZE - 1, Math.floor(point.y / grid.cell))
        const cell = grid.cells[row * GRID_SIZE + column]
        expect(cell?.provinceId, `${locationId} на чужой земле`).toBe(
          world.locations[locationId]?.provinceId,
        )
      }
    }
  })

  it('местность клетки — местность провинции, а не ближайшей деревни', () => {
    const world = generateWorld(1)
    for (const cell of gridOf(world).cells) {
      if (!cell) continue
      expect(cell.terrain).toBe(world.provinces[cell.provinceId]?.terrain)
    }
  })
})

describe('глушь между местами', () => {
  it('есть, но не съедает всю землю', () => {
    for (const seed of SEEDS) {
      const grid = gridOf(generateWorld(seed))
      const land = grid.cells.filter((cell) => cell !== null)
      const wild = land.filter((cell) => cell?.wilds).length
      const share = wild / land.length
      expect(share, `глушь на зерне ${seed}`).toBeGreaterThan(0.2)
      expect(share, `глушь на зерне ${seed}`).toBeLessThan(0.75)
    }
  })

  it('околица есть у каждого места: на самом поселении глуши не бывает', () => {
    const world = generateWorld(1)
    const grid = gridOf(world)
    for (const [locationId, point] of Object.entries(layoutOf(world))) {
      const column = Math.min(GRID_SIZE - 1, Math.floor(point.x / grid.cell))
      const row = Math.min(GRID_SIZE - 1, Math.floor(point.y / grid.cell))
      const cell = grid.cells[row * GRID_SIZE + column]
      // Сама околица проверяется флагом, а не именем: клетка шире зазора между
      // двумя соседними деревнями, и её середина честно бывает ближе к соседке.
      expect(cell?.wilds, `${locationId} стоит в глуши`).toBe(false)
      expect(world.locations[cell?.locationId ?? '']?.provinceId).toBe(
        world.locations[locationId]?.provinceId,
      )
    }
  })
})

describe('материк, а не россыпь островов', () => {
  /** Заливка по земле: сколько клеток достижимо от первой найденной. */
  function mainland(grid: ReturnType<typeof gridOf>): Set<number> {
    const start = grid.cells.findIndex((cell) => cell !== null)
    const seen = new Set<number>()
    if (start < 0) return seen
    const queue = [start]
    seen.add(start)
    while (queue.length > 0) {
      const index = queue.pop() as number
      const row = Math.floor(index / grid.size)
      const column = index % grid.size
      const around = [
        [column - 1, row],
        [column + 1, row],
        [column, row - 1],
        [column, row + 1],
      ]
      for (const [nx, ny] of around) {
        if (nx === undefined || ny === undefined) continue
        if (nx < 0 || ny < 0 || nx >= grid.size || ny >= grid.size) continue
        const next = ny * grid.size + nx
        if (seen.has(next) || grid.cells[next] === null) continue
        seen.add(next)
        queue.push(next)
      }
    }
    return seen
  }

  it('все короны сидят на одной земле: из любой можно дойти до любой', () => {
    for (const seed of SEEDS) {
      const world = generateWorld(seed)
      const grid = gridOf(world)
      const reachable = mainland(grid)
      const crowns = new Set<string>()
      for (const index of reachable) {
        const cell = grid.cells[index]
        if (cell) crowns.add(cell.kingdomId)
      }
      expect(crowns.size, `корон на материке, зерно ${seed}`).toBe(
        Object.keys(world.kingdoms).length,
      )
    }
  })

  it('за краем материка мир кончается, а не продолжается сушей', () => {
    const grid = gridOf(generateWorld(1))
    const empty = grid.cells.filter((cell) => cell === null).length
    expect(empty).toBeGreaterThan(grid.cells.length * 0.2)
  })
})

describe('сетка выводится, а не хранится', () => {
  it('один и тот же мир даёт одну и ту же землю', () => {
    expect(gridOf(generateWorld(2))).toEqual(gridOf(generateWorld(2)))
  })
})
