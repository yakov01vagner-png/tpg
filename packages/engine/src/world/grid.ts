import { layoutOf, provinceCentersOf } from './layout'
import { landPieces, pieceAt, riverMaskOf } from './rivers'
import { isWater } from './sea'
import type { Terrain, World } from './types'
import { isSettlement } from './types'

/**
 * Полотно мира клетками.
 *
 * Карта — не схема связей, а земля: клетка либо чьей-то провинции, либо ничья.
 * Чьей именно — решает ближайший якорь провинции: её середина или любое из её
 * поселений. Из этого само собой выходит и политическая карта (клетка окрашена
 * по короне), и рельефная (по местности), и разбивка по областям — данные одни
 * и те же, меняется только то, чем красить.
 *
 * До версии 0.3 клетка принадлежала **ближайшему поселению**, и провинция была
 * не землёй, а списком. Карта областей выходила кляксами вокруг деревень, а всё,
 * что дальше околицы, было дырой. Теперь земля принадлежит провинции целиком, а
 * поселение держит внутри неё только свою округу (DESIGN.md, п.3.1.1).
 *
 * Сетка, как и раскладка, не хранится в сейве: она выводится из неизменного
 * скелета мира (DESIGN.md, п.3.1) и потому одинакова при каждом запуске.
 */
/**
 * Клеток по стороне полотна.
 *
 * Выросло вместе с миром: при полотне в полторы тысячи и шестидесяти двух
 * местах хватало пятидесяти шести, но с версии 0.4 мест шестьсот на полотне в
 * две тысячи с лишним, и на прежней сетке провинция пограничья умещалась в
 * восемь клеток — то есть переставала читаться землёй.
 */
export const GRID_SIZE = 84

export interface GridCell {
  /**
   * Ближайшее поселение этой же провинции: его округа. Пусто только там, где
   * в провинции не записано ни одного места.
   */
  readonly locationId: string | null
  readonly provinceId: string
  readonly regionId: string
  readonly kingdomId: string
  /** Местность провинции: земля не меняется от того, чья деревня ближе. */
  readonly terrain: Terrain
  /** Глушь: досюда не дотянулась ничья околица, хотя земля провинции. */
  readonly wilds: boolean
}

export interface WorldGrid {
  /** Клеток по стороне. */
  readonly size: number
  /** Сторона клетки в единицах полотна. */
  readonly cell: number
  /** Клетки построчно: индекс — y * size + x. `null` — ничья земля или вода. */
  readonly cells: readonly (GridCell | null)[]
  /** Вода: та же разбивка, `true` — море (версия 0.5). */
  readonly water: readonly boolean[]
}

/**
 * Докуда дотягивается земля провинции от своего якоря.
 *
 * Сто восемнадцать, как было у околицы поселения, оставляли Дор-Хазад и ещё
 * одну корону островами: короны стоят в четырёх-пяти сотнях единиц друг от
 * друга, а область — клин, и в сторону соседа клина может не оказаться вовсе.
 * При ста пятидесяти материк связен на всех зёрнах, и при этом половина
 * полотна остаётся за краем мира.
 */
const REACH = 225

/**
 * Докуда дотягивается околица поселения. Дальше начинается глушь: земля всё ещё
 * чья-то, но людей на ней нет и дорога через неё идёт сама по себе.
 */
const SETTLED_REACH = 55

/** Неровность границы: без неё округа выходят циркулем, а не землёй. */
function wobble(x: number, y: number): number {
  let hash = 2166136261
  hash = Math.imul(hash ^ x, 16777619)
  hash = Math.imul(hash ^ y, 16777619)
  return 1 + (((hash >>> 9) % 1000) / 1000 - 0.5) * 0.22
}

export function worldGrid(world: World, mapSize: number, reach: number = REACH): WorldGrid {
  const points = layoutOf(world)
  const centers = provinceCentersOf(world)
  const cell = mapSize / GRID_SIZE

  // Якоря провинции — её середина и её же поселения. Середина нужна затем,
  // чтобы провинция с единственной деревней на краю всё равно держала свою
  // землю; поселения — затем, чтобы место всегда стояло на земле своей
  // провинции, даже если разброс отнёс его к соседней середине.
  const anchorX: number[] = []
  const anchorY: number[] = []
  const anchorProvince: string[] = []
  const pushAnchor = (point: { x: number; y: number }, provinceId: string) => {
    anchorX.push(point.x)
    anchorY.push(point.y)
    anchorProvince.push(provinceId)
  }
  for (const [provinceId, point] of Object.entries(centers)) pushAnchor(point, provinceId)
  for (const [locationId, point] of Object.entries(points)) {
    const provinceId = world.locations[locationId]?.provinceId
    if (provinceId) pushAnchor(point, provinceId)
  }

  // Река — рубеж (этап 34). Земля делится руслами и морем на куски, и клетка
  // достаётся тому якорю, до которого от неё можно дойти, не переплывая: иначе
  // провинция перешагивает реку, и граница на карте идёт мимо того самого
  // рубежа, из-за которого воюют. Там, где своего берега не нашлось, правило
  // отступает: клетка остаётся у ближайшего якоря, лишь бы не пропадала земля.
  const sea = world.sea ?? null
  const currents = riverMaskOf(world)
  const pieces = sea && currents.size > 1 ? landPieces(sea, currents) : null
  const anchorPiece = pieces
    ? anchorX.map((x, index) => pieceAt(pieces, sea?.size ?? 1, x, anchorY[index] ?? 0))
    : null

  // Поселения по провинциям: внутри своей земли ищем ближайшее, чтобы знать
  // округу. Места без жителей сюда не идут: они держат землю, но не околицу —
  // возле кургана люди не живут, и глушь вокруг него остаётся глушью.
  const settled = new Map<string, { ids: string[]; xs: number[]; ys: number[] }>()
  for (const [locationId, point] of Object.entries(points)) {
    const location = world.locations[locationId]
    const provinceId = location?.provinceId
    if (!provinceId || !location || !isSettlement(location.archetype)) continue
    const group = settled.get(provinceId) ?? { ids: [], xs: [], ys: [] }
    group.ids.push(locationId)
    group.xs.push(point.x)
    group.ys.push(point.y)
    settled.set(provinceId, group)
  }

  const described = new Map<string, Omit<GridCell, 'locationId' | 'wilds'>>()
  const cells: (GridCell | null)[] = []
  const water: boolean[] = []
  for (let row = 0; row < GRID_SIZE; row += 1) {
    const cy = (row + 0.5) * cell
    for (let column = 0; column < GRID_SIZE; column += 1) {
      const cx = (column + 0.5) * cell
      // Вода решает первой: земля короны кончается там, где начинается море, а
      // не там, где кончается досягаемость провинции (версия 0.5).
      const wet = sea !== null && isWater(sea, cx, cy)
      water.push(wet)
      if (wet) {
        cells.push(null)
        continue
      }
      // Сравниваем квадраты: корень на каждую пару «клетка — якорь» стоил
      // тридцати миллисекунд на открытие карты, а порядок не меняет.
      const limit = reach * wobble(column, row)
      const mine = pieces && sea ? pieceAt(pieces, sea.size, cx, cy) : -1
      let best = -1
      let bestDistance = limit * limit
      // Ближайший якорь вообще — на случай, если на своём берегу якорей нет.
      let anyBest = -1
      let anyDistance = limit * limit
      for (let i = 0; i < anchorX.length; i += 1) {
        const dx = (anchorX[i] ?? 0) - cx
        const dy = (anchorY[i] ?? 0) - cy
        const distance = dx * dx + dy * dy
        if (distance < anyDistance) {
          anyDistance = distance
          anyBest = i
        }
        if (mine >= 0 && anchorPiece && anchorPiece[i] !== mine) continue
        if (distance < bestDistance) {
          bestDistance = distance
          best = i
        }
      }
      if (best < 0) best = anyBest
      if (best < 0) {
        cells.push(null)
        continue
      }
      const provinceId = anchorProvince[best] ?? ''
      let land = described.get(provinceId)
      if (land === undefined) {
        const made = describe(world, provinceId)
        if (!made) {
          cells.push(null)
          continue
        }
        land = made
        described.set(provinceId, made)
      }

      const group = settled.get(provinceId)
      let nearest: string | null = null
      let nearestDistance = Number.POSITIVE_INFINITY
      for (let i = 0; i < (group?.ids.length ?? 0); i += 1) {
        const dx = (group?.xs[i] ?? 0) - cx
        const dy = (group?.ys[i] ?? 0) - cy
        const distance = dx * dx + dy * dy
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearest = group?.ids[i] ?? null
        }
      }
      cells.push({
        ...land,
        locationId: nearest,
        wilds: nearestDistance > SETTLED_REACH * SETTLED_REACH,
      })
    }
  }

  return { size: GRID_SIZE, cell, cells, water }
}

function describe(world: World, provinceId: string): Omit<GridCell, 'locationId' | 'wilds'> | null {
  const province = world.provinces[provinceId]
  if (!province) return null
  const region = world.regions[province.regionId]
  if (!region) return null
  return {
    provinceId: province.id,
    regionId: region.id,
    kingdomId: region.kingdomId,
    terrain: province.terrain,
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
