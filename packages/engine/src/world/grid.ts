import { layoutOf } from './layout'
import type { Terrain, World } from './types'

/**
 * Полотно мира клетками.
 *
 * Карта — не схема связей, а земля: клетка либо чья-то, либо ничья. Чья
 * именно — решает ближайшее поселение: где чей город, там и его округа. Из
 * этого само собой выходит и политическая карта (клетка окрашена по короне), и
 * рельефная (по местности), и разбивка по областям — данные одни и те же,
 * меняется только то, чем красить.
 *
 * Сетка, как и раскладка, не хранится в сейве: она выводится из неизменного
 * скелета мира (DESIGN.md, п.3.1) и потому одинакова при каждом запуске.
 */
export const GRID_SIZE = 56

export interface GridCell {
  /** Ближайшее поселение: его округа. */
  readonly locationId: string
  readonly provinceId: string
  readonly regionId: string
  readonly kingdomId: string
  readonly terrain: Terrain
}

export interface WorldGrid {
  /** Клеток по стороне. */
  readonly size: number
  /** Сторона клетки в единицах полотна. */
  readonly cell: number
  /** Клетки построчно: индекс — y * size + x. `null` — ничья земля. */
  readonly cells: readonly (GridCell | null)[]
}

/**
 * Докуда дотягивается округа поселения. Больше — мир слипается в один материк,
 * меньше — королевства рассыпаются на острова вокруг каждой деревни.
 */
const REACH = 118

/** Неровность границы: без неё округа выходят циркулем, а не землёй. */
function wobble(x: number, y: number): number {
  let hash = 2166136261
  hash = Math.imul(hash ^ x, 16777619)
  hash = Math.imul(hash ^ y, 16777619)
  return 1 + (((hash >>> 9) % 1000) / 1000 - 0.5) * 0.22
}

export function worldGrid(world: World, mapSize: number): WorldGrid {
  const points = layoutOf(world)
  const cell = mapSize / GRID_SIZE

  // Разворачиваем локации в плоские массивы: по ним считается ближайшее место
  // для каждой из трёх тысяч клеток, и словари тут обходятся дороже.
  const ids: string[] = []
  const xs: number[] = []
  const ys: number[] = []
  for (const [id, point] of Object.entries(points)) {
    ids.push(id)
    xs.push(point.x)
    ys.push(point.y)
  }

  const cells: (GridCell | null)[] = []
  for (let row = 0; row < GRID_SIZE; row += 1) {
    const cy = (row + 0.5) * cell
    for (let column = 0; column < GRID_SIZE; column += 1) {
      const cx = (column + 0.5) * cell
      const reach = REACH * wobble(column, row)
      let best = -1
      let bestDistance = reach
      for (let i = 0; i < ids.length; i += 1) {
        const distance = Math.hypot((xs[i] ?? 0) - cx, (ys[i] ?? 0) - cy)
        if (distance < bestDistance) {
          bestDistance = distance
          best = i
        }
      }
      cells.push(best < 0 ? null : describe(world, ids[best] ?? ''))
    }
  }

  return { size: GRID_SIZE, cell, cells }
}

function describe(world: World, locationId: string): GridCell | null {
  const location = world.locations[locationId]
  if (!location) return null
  const province = world.provinces[location.provinceId]
  if (!province) return null
  const region = world.regions[province.regionId]
  if (!region) return null
  return {
    locationId,
    provinceId: province.id,
    regionId: region.id,
    kingdomId: region.kingdomId,
    terrain: location.terrain,
  }
}

/** Рельеф: цвета земли, а не политики. */
export const TERRAIN_COLORS: Record<Terrain, string> = {
  plains: '#6e7148',
  forest: '#41563a',
  hills: '#7a6a4a',
  mountains: '#6d6a67',
  marsh: '#4d5748',
  coast: '#4a6675',
  steppe: '#8a7c50',
}

/** Палитра для областей: цвета различимы между собой, а не оттенки одного. */
export const REGION_PALETTE: readonly string[] = [
  '#6f8fbf',
  '#c8b56a',
  '#a86a6a',
  '#7e7f8c',
  '#7f9a63',
  '#8a6f9c',
  '#5f9a97',
]

/**
 * Цвет области.
 *
 * Цвет из имени не годится: два соседних края легко получают почти один
 * оттенок, и граница между ними пропадает — а карта областей нужна ровно
 * затем, чтобы её видеть. Поэтому цвета раздаются по смежности: у касающихся
 * друг друга областей он обязан различаться. Обход детерминирован, значит один
 * и тот же край всегда одного цвета.
 */
export function regionColors(world: World, grid: WorldGrid): Readonly<Record<string, string>> {
  const neighbours = new Map<string, Set<string>>()
  const touch = (a: string, b: string) => {
    if (a === b) return
    const first = neighbours.get(a) ?? new Set<string>()
    first.add(b)
    neighbours.set(a, first)
    const second = neighbours.get(b) ?? new Set<string>()
    second.add(a)
    neighbours.set(b, second)
  }

  for (let row = 0; row < grid.size; row += 1) {
    for (let column = 0; column < grid.size; column += 1) {
      const cell = grid.cells[row * grid.size + column]
      if (!cell) continue
      const right = column + 1 < grid.size ? grid.cells[row * grid.size + column + 1] : null
      const below = row + 1 < grid.size ? grid.cells[(row + 1) * grid.size + column] : null
      if (right) touch(cell.regionId, right.regionId)
      if (below) touch(cell.regionId, below.regionId)
    }
  }

  const colors: Record<string, string> = {}
  const spent = new Map<string, number>(REGION_PALETTE.map((color) => [color, 0]))
  for (const regionId of Object.keys(world.regions)) {
    const used = new Set<string>()
    for (const other of neighbours.get(regionId) ?? []) {
      const taken = colors[other]
      if (taken) used.add(taken)
    }
    // Из разрешённых берём самый редкий: иначе жадный обход красит весь мир
    // двумя цветами — соседи-то разные, а карта выходит шахматной доской.
    let chosen = REGION_PALETTE[0] as string
    let best = Number.POSITIVE_INFINITY
    for (const color of REGION_PALETTE) {
      if (used.has(color)) continue
      const count = spent.get(color) ?? 0
      if (count < best) {
        best = count
        chosen = color
      }
    }
    colors[regionId] = chosen
    spent.set(chosen, (spent.get(chosen) ?? 0) + 1)
  }
  return colors
}
