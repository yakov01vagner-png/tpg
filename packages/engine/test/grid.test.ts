import { describe, expect, it } from 'vitest'
import { generateWorld } from '../src/world/generate'
import { GRID_SIZE, REGION_PALETTE, regionColors, worldGrid } from '../src/world/grid'
import { MAP_SIZE, layoutOf } from '../src/world/layout'
import { FRONTIER } from '../src/world/types'

const world = generateWorld(1)
const grid = worldGrid(world, MAP_SIZE)
const points = layoutOf(world)

describe('полотно мира клетками', () => {
  it('выводится из скелета заново, а не хранится', () => {
    expect(worldGrid(generateWorld(1), MAP_SIZE)).toEqual(grid)
  })

  it('заполняет всё поле', () => {
    expect(grid.cells.length).toBe(GRID_SIZE * GRID_SIZE)
    expect(grid.cell * grid.size).toBe(MAP_SIZE)
  })

  it('оставляет ничью землю: мир — не сплошная шахматная доска', () => {
    const wild = grid.cells.filter((cell) => cell === null).length
    expect(wild).toBeGreaterThan(grid.cells.length * 0.15)
    expect(wild).toBeLessThan(grid.cells.length * 0.8)
  })

  it('каждое поселение стоит на своей земле, а не на чужой', () => {
    for (const [locationId, point] of Object.entries(points)) {
      const column = Math.min(GRID_SIZE - 1, Math.floor(point.x / grid.cell))
      const row = Math.min(GRID_SIZE - 1, Math.floor(point.y / grid.cell))
      expect(grid.cells[row * GRID_SIZE + column]).not.toBeNull()
      // Допуск в одну клетку: полотно грубее, чем зазор между двумя местами,
      // и середина клетки честно бывает ближе к чужому якорю (этап 17).
      const nearby: (string | undefined)[] = []
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const x = column + dx
          const y = row + dy
          if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) continue
          nearby.push(grid.cells[y * GRID_SIZE + x]?.provinceId)
        }
      }
      expect(nearby, locationId).toContain(world.locations[locationId]?.provinceId)
    }
  })

  it('у каждого королевства есть земля, и ни одно не занимает весь мир', () => {
    const owned = new Map<string, number>()
    for (const cell of grid.cells) {
      // Пограничье на полотне есть, но короной не считается: его никто не держит.
      if (!cell || cell.kingdomId === FRONTIER) continue
      owned.set(cell.kingdomId, (owned.get(cell.kingdomId) ?? 0) + 1)
    }
    expect(owned.size).toBe(Object.keys(world.kingdoms).length)
    for (const count of owned.values()) {
      expect(count).toBeGreaterThan(20)
      expect(count).toBeLessThan(grid.cells.length * 0.6)
    }
  })

  it('земля королевства держится вместе: у страны один материк, а не россыпь', () => {
    for (const kingdom of Object.values(world.kingdoms)) {
      const own = new Set<number>()
      grid.cells.forEach((cell, index) => {
        if (cell?.kingdomId === kingdom.id) own.add(index)
      })
      expect(largestIsland(own)).toBeGreaterThan(own.size * 0.85)
    }
  })

  it('считается быстро: карту открывают на телефоне', () => {
    const world = generateWorld(7)
    // По лучшему из прогонов: см. perf.test.ts — среднее мерит соседний файл.
    let spent = Number.POSITIVE_INFINITY
    for (let i = 0; i < 5; i += 1) {
      const began = performance.now()
      worldGrid(world, MAP_SIZE)
      spent = Math.min(spent, performance.now() - began)
    }
    console.log(`сетка мира: ${spent.toFixed(1)} мс на ${GRID_SIZE}×${GRID_SIZE}`)
    expect(spent).toBeLessThan(40)
  })
})

/** Размер самого большого связного куска: клетки соседствуют по стороне. */
function largestIsland(own: Set<number>): number {
  const seen = new Set<number>()
  let best = 0
  for (const start of own) {
    if (seen.has(start)) continue
    let size = 0
    const queue = [start]
    seen.add(start)
    while (queue.length > 0) {
      const index = queue.pop() as number
      size += 1
      const x = index % GRID_SIZE
      const y = Math.floor(index / GRID_SIZE)
      const neighbours = [
        x > 0 ? index - 1 : -1,
        x < GRID_SIZE - 1 ? index + 1 : -1,
        y > 0 ? index - GRID_SIZE : -1,
        y < GRID_SIZE - 1 ? index + GRID_SIZE : -1,
      ]
      for (const next of neighbours) {
        if (next < 0 || seen.has(next) || !own.has(next)) continue
        seen.add(next)
        queue.push(next)
      }
    }
    best = Math.max(best, size)
  }
  return best
}

describe('цвета областей', () => {
  it('соседние области не красятся одинаково: иначе граница между ними пропадает', () => {
    const colors = regionColors(world, grid)
    for (let row = 0; row < grid.size; row += 1) {
      for (let column = 0; column < grid.size; column += 1) {
        const cell = grid.cells[row * grid.size + column]
        if (!cell) continue
        const right = column + 1 < grid.size ? grid.cells[row * grid.size + column + 1] : null
        const below = row + 1 < grid.size ? grid.cells[(row + 1) * grid.size + column] : null
        for (const other of [right, below]) {
          if (!other || other.regionId === cell.regionId) continue
          expect(colors[cell.regionId]).not.toBe(colors[other.regionId])
        }
      }
    }
  })

  it('красит каждую область, и цвета берутся из палитры', () => {
    const colors = regionColors(world, grid)
    for (const regionId of Object.keys(world.regions)) {
      expect(REGION_PALETTE).toContain(colors[regionId])
    }
  })
})

describe('палитра областей', () => {
  it('разбирает палитру, а не два цвета на весь мир', () => {
    const colors = regionColors(world, grid)
    const distinct = new Set(Object.values(colors))
    expect(distinct.size).toBeGreaterThanOrEqual(Math.min(REGION_PALETTE.length, 5))
  })
})
