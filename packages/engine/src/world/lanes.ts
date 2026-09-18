import { seasonOf } from '../time'
import { MAP_SIZE } from './layout'
import type { Point } from './layout'
import type { Sea } from './sea'
import type { Location, World } from './types'

/**
 * Морские пути.
 *
 * Дорога кончается на берегу, и до 0.5 мир кончался вместе с ней: порт был
 * городком, у которого в описании сказано «порт». Морской путь — та же дорога,
 * только по воде: он соединяет две гавани, стоит часы и лежит в скелете рядом с
 * берегом и руслами.
 *
 * Путь меряется не по прямой, а по воде. Прямая между двумя гаванями одного
 * моря сплошь и рядом идёт через материк — в мире, где суши треть, таких пар
 * оказалось больше половины, и «морские пути» выходили сетью перелётов над
 * землёй. Поэтому расстояние считается обходом по морским клеткам: сколько
 * воды между гаванями на самом деле, столько и часов. Заодно это даёт мысы и
 * проливы даром — путь вокруг полуострова честно длиннее пути через открытое
 * море.
 */
export interface Lane {
  readonly to: string
  /** Часы пути под парусом в обычную погоду. */
  readonly hours: number
}

/**
 * Сколько единиц полотна покрывает час хода под парусом.
 *
 * Вдвое больше пешего часа (`UNITS_PER_HOUR` = 12): корабль быстрее обоза, и в
 * этом весь смысл моря. Но не втрое: иначе сухопутная половина мира перестаёт
 * иметь значение, а карта превращается в список портов.
 */
export const SEA_UNITS_PER_HOUR = 25

/** Со сколькими соседями по воде связана гавань. */
const NEIGHBOURS = 3

/** Докуда от гавани ищется вода, в которую она выходит. */
const HARBOUR_REACH = 120

export function buildLanes(
  locations: Readonly<Record<string, Location>>,
  sea: Sea,
): Record<string, readonly Lane[]> {
  const harbours = Object.values(locations).filter((one) => one.archetype === 'port')
  const lanes: Record<string, Lane[]> = {}
  if (harbours.length < 2) return lanes

  // Обход идёт по укрупнённой воде: клетка вдвое крупнее той, которой рисуется
  // берег. Море от этого не меняется — меняется цена вопроса: на мелкой сетке
  // обход стоил бы больше, чем всё рождение мира, а длина пути от укрупнения
  // гуляет на проценты.
  const water = coarsen(sea)
  const size = water.size
  const cell = MAP_SIZE / size

  // Одна Дейкстра на всё море сразу, из всех гаваней разом: каждая клетка воды
  // узнаёт, какая гавань к ней ближе всего по воде и насколько. Получается
  // разбивка моря на рейды — а соседями оказываются те гавани, чьи рейды
  // сходятся. Это и есть морская карта: с кем у тебя общая вода, с тем и путь.
  // Отдельный обход из каждой гавани давал то же самое, но стоил вдесятеро.
  const distance = new Float64Array(size * size).fill(Number.POSITIVE_INFINITY)
  const owner = new Int32Array(size * size).fill(-1)
  const heap = new Heap()
  for (const [index, harbour] of harbours.entries()) {
    for (const mouth of mouthOf(water, harbour)) {
      const start = Math.hypot(
        harbour.x - ((mouth % size) + 0.5) * cell,
        harbour.y - (Math.floor(mouth / size) + 0.5) * cell,
      )
      if (start >= (distance[mouth] ?? Number.POSITIVE_INFINITY)) continue
      distance[mouth] = start
      owner[mouth] = index
      heap.push(mouth, start)
    }
  }
  const steps: readonly (readonly [number, number, number])[] = [
    [1, 0, cell],
    [-1, 0, cell],
    [0, 1, cell],
    [0, -1, cell],
    [1, 1, cell * Math.SQRT2],
    [1, -1, cell * Math.SQRT2],
    [-1, 1, cell * Math.SQRT2],
    [-1, -1, cell * Math.SQRT2],
  ]
  for (;;) {
    const at = heap.pop()
    if (at === null) break
    const spent = distance[at] ?? 0
    const row = Math.floor(at / size)
    const column = at % size
    for (const [dx, dy, cost] of steps) {
      const nx = column + dx
      const ny = row + dy
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
      const next = ny * size + nx
      if (water.mask[next] !== '1') continue
      const reached = spent + cost
      if ((distance[next] ?? Number.POSITIVE_INFINITY) <= reached) continue
      distance[next] = reached
      owner[next] = owner[at] ?? -1
      heap.push(next, reached)
    }
  }

  // Где сходятся два рейда, там и путь: длина — сколько воды от гавани до
  // гавани через это место. Из всех мест, где они сходятся, берётся то, где
  // выходит короче: море не заставляет огибать мыс дважды.
  const spans = new Map<string, number>()
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const at = row * size + column
      const mine = owner[at] ?? -1
      if (mine < 0) continue
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ] as const) {
        const nx = column + dx
        const ny = row + dy
        if (nx >= size || ny >= size) continue
        const next = ny * size + nx
        const theirs = owner[next] ?? -1
        if (theirs < 0 || theirs === mine) continue
        const span = (distance[at] ?? 0) + (distance[next] ?? 0) + cell
        const key = mine < theirs ? `${mine}|${theirs}` : `${theirs}|${mine}`
        const known = spans.get(key)
        if (known === undefined || span < known) spans.set(key, span)
      }
    }
  }

  for (const [key, span] of spans) {
    const [first, second] = key.split('|')
    const a = harbours[Number(first)]
    const b = harbours[Number(second)]
    if (!a || !b) continue
    const hours = laneHours(span)
    const forward = lanes[a.id] ?? []
    const backward = lanes[b.id] ?? []
    forward.push({ to: b.id, hours })
    backward.push({ to: a.id, hours })
    lanes[a.id] = forward
    lanes[b.id] = backward
  }

  return lanes
}

/** Часы морского пути из пройденной воды. В море нет ни гати, ни перевала. */
export function laneHours(span: number): number {
  return Math.max(2, Math.round(span / SEA_UNITS_PER_HOUR))
}

/**
 * Лёд (этап 38).
 *
 * Зимой море встаёт: в гавань не войти, из гавани не выйти, и остров на три
 * месяца перестаёт быть частью мира. Это не запрет ради запрета — это то, ради
 * чего на острове держат запас, а торговый год кончается осенью. Ледостав
 * берёт зиму целиком: студень, сечень и лютень.
 */
export function iceBound(day: number | null): boolean {
  return day !== null && seasonOf(day) === 'winter'
}

/** Морские пути из этой гавани. Сейвы до 0.5 их не знают. */
export function lanesFrom(world: World, fromId: string): readonly Lane[] {
  return world.lanes?.[fromId] ?? []
}

/** Гавань ли это: отсюда уходят морем. */
export function isHarbour(world: World, locationId: string): boolean {
  return lanesFrom(world, locationId).length > 0
}

/**
 * Вода покрупнее: клетка вдвое больше. Вода там, где была вода хоть в одной из
 * четырёх: пролив шириной в клетку остаётся проливом, а не зарастает сушей.
 */
function coarsen(sea: Sea): Sea {
  const size = Math.max(2, Math.floor(sea.size / 2))
  const mask: string[] = []
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      let wet = false
      for (let dy = 0; dy < 2 && !wet; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) {
          const y = row * 2 + dy
          const x = column * 2 + dx
          if (y >= sea.size || x >= sea.size) continue
          if (sea.mask[y * sea.size + x] === '1') {
            wet = true
            break
          }
        }
      }
      mask.push(wet ? '1' : '0')
    }
  }
  return { size, mask: mask.join('') }
}

/**
 * Клетки воды, в которые выходит гавань.
 *
 * Гавань стоит на суше, и обход по морю должен с чего-то начаться. Берётся вся
 * вода в получасе от неё: рейд, а не одна клетка, — иначе обход упирается в
 * случайный камень и гавань оказывается запертой.
 */
function mouthOf(sea: Sea, at: Point): number[] {
  const cell = MAP_SIZE / sea.size
  const steps = Math.ceil(HARBOUR_REACH / cell)
  const column = Math.floor(at.x / cell)
  const row = Math.floor(at.y / cell)
  const out: number[] = []
  for (let dx = -steps; dx <= steps; dx += 1) {
    for (let dy = -steps; dy <= steps; dy += 1) {
      const nx = column + dx
      const ny = row + dy
      if (nx < 0 || ny < 0 || nx >= sea.size || ny >= sea.size) continue
      if (Math.hypot(dx, dy) * cell > HARBOUR_REACH) continue
      if (sea.mask[ny * sea.size + nx] === '1') out.push(ny * sea.size + nx)
    }
  }
  return out
}

/** Двоичная куча: без неё обход по шестнадцати тысячам клеток стоит секунды. */
class Heap {
  private readonly items: number[] = []
  private readonly keys: number[] = []

  push(item: number, key: number): void {
    this.items.push(item)
    this.keys.push(key)
    let at = this.items.length - 1
    while (at > 0) {
      const up = (at - 1) >> 1
      if ((this.keys[up] ?? 0) <= (this.keys[at] ?? 0)) break
      this.swap(at, up)
      at = up
    }
  }

  pop(): number | null {
    if (this.items.length === 0) return null
    const top = this.items[0] as number
    const item = this.items.pop() as number
    const key = this.keys.pop() as number
    if (this.items.length > 0) {
      this.items[0] = item
      this.keys[0] = key
      let at = 0
      for (;;) {
        const left = at * 2 + 1
        const right = left + 1
        let best = at
        if (left < this.items.length && (this.keys[left] ?? 0) < (this.keys[best] ?? 0)) best = left
        if (right < this.items.length && (this.keys[right] ?? 0) < (this.keys[best] ?? 0)) {
          best = right
        }
        if (best === at) break
        this.swap(at, best)
        at = best
      }
    }
    return top
  }

  private swap(a: number, b: number): void {
    const item = this.items[a] as number
    this.items[a] = this.items[b] as number
    this.items[b] = item
    const key = this.keys[a] as number
    this.keys[a] = this.keys[b] as number
    this.keys[b] = key
  }
}
