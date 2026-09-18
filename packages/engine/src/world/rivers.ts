import { DAYS_PER_YEAR } from '../time'
import type { Point } from './layout'
import { MAP_SIZE } from './layout'
import type { Sea } from './sea'
import { isWater } from './sea'
import type { World } from './types'

/**
 * Реки.
 *
 * В мире стояли броды и переправы, а реки, которую они переходят, не было: они
 * были просто местами с дурной репутацией. Река — препятствие: она режет сушу, и
 * дорога переходит её только там, где стоит брод. Отсюда и смысл переправы:
 * через неё ходят не потому, что так нарисовано, а потому что иначе не пройти.
 *
 * Русло лежит в скелете рядом с берегом: мир целиком уходит в сейв и не
 * меняется.
 */
export interface River {
  readonly id: string
  readonly name: string
  /** Русло ломаной: от истока к устью. */
  readonly points: readonly Point[]
}

/** Сколько единиц полотна проходит река за один шаг русла. */
const STEP = 46

/** Дальше этого река не течёт: длиннее материка русла не бывает. */
const MAX_STEPS = 70

/**
 * Полуширина русла в единицах полотна.
 *
 * Не ширина воды, а ширина препятствия: подойти к реке можно вплотную, а
 * переходят её в одной точке — в броде.
 */
export const RIVER_WIDTH = 14

/**
 * Клеток по стороне в маске русел.
 *
 * Вдвое мельче сетки моря: море — это область, а река — линия, и на клетке в
 * шестнадцать единиц ширина русла пропадала в одной клетке вместе с разницей
 * между «у реки» и «за рекой».
 */
export const RIVER_GRID = 448

/**
 * Докуда от конца отрезка дорога считается стоящей в броде, а не идущей через
 * реку.
 *
 * Брод стоит **на** русле, и дорога, которая в него упирается, реку не
 * переходит — она в неё приходит. Двадцать четыре единицы — чуть больше
 * полуширины русла (`RIVER_WIDTH` плюс клетка маски): ближе этого к месту река
 * и есть то место.
 */
export const FORD_REACH = 24

/**
 * Куда течёт вода.
 *
 * Высот у мира нет, поэтому река течёт к ближайшему морю — по полю расстояний
 * до воды, с меандром. Это то же, что течь под уклон: к морю ведёт кратчайший
 * спуск, а виляет река потому, что земля неровная.
 */
export function buildRivers(
  sea: Sea,
  sources: readonly Point[],
  names: readonly string[],
): River[] {
  const distance = distanceToWater(sea)
  const rivers: River[] = []
  for (const [index, from] of sources.entries()) {
    const points: Point[] = [from]
    let current = from
    let bend = (index % 2 === 0 ? 1 : -1) * 0.5
    const walked = new Set<number>([cellOf(sea.size, from)])
    for (let step = 0; step < MAX_STEPS; step += 1) {
      const next = downhill(sea, distance, current, bend, walked)
      if (!next) break
      points.push(next)
      walked.add(cellOf(sea.size, next))
      // Меандр разворачивается медленно: иначе река выходит зигзагом.
      bend = Math.max(-1, Math.min(1, bend + (step % 3 === 0 ? -0.35 : 0.2)))
      current = next
      if (isWater(sea, next.x, next.y)) break
    }
    // Ручей в три шага — не река: такие не рисуют и такие не переходят вброд.
    if (points.length < 4) continue
    rivers.push({
      id: `river.${rivers.length}`,
      name: names[rivers.length % names.length] ?? 'Река',
      points: smoothed(smoothed(points)),
    })
  }
  return rivers
}

/**
 * Сглаженное русло: каждая точка — среднее с соседями, концы на месте.
 *
 * Спуск идёт по шестнадцати направлениям, и самый пологий из них то и дело
 * меняется на соседний: без сглаживания река шла лесенкой, и на карте это
 * читалось не рекой, а швом (этап 44). Число точек не меняется: маска и броды
 * считаются по тому же руслу, которое рисуют.
 */
function smoothed(points: readonly Point[]): Point[] {
  if (points.length < 3) return [...points]
  return points.map((point, index) => {
    const before = points[index - 1]
    const after = points[index + 1]
    if (!before || !after) return point
    return {
      x: Math.round((before.x + point.x * 2 + after.x) / 4),
      y: Math.round((before.y + point.y * 2 + after.y) / 4),
    }
  })
}

/**
 * Следующая точка русла: вниз по полю расстояний, с поправкой на меандр.
 *
 * Не кратчайшим спуском, а самым пологим из тех, что всё-таки вниз: река не
 * падает к морю по прямой, она обходит землю. Кратчайший спуск давал русла в
 * две сотни единиц — ровно расстояние от истока до ближайшей воды, — и река
 * выходила короче дневного перехода.
 */
function downhill(
  sea: Sea,
  distance: readonly number[],
  from: Point,
  bend: number,
  walked: Set<number>,
): Point | null {
  const here = distance[cellOf(sea.size, from)] ?? 0
  let best: Point | null = null
  let bestScore = Number.NEGATIVE_INFINITY
  // Запруда: ближайший выход из ямы, в которой спуска уже нет.
  let out: Point | null = null
  let outDrop = Number.POSITIVE_INFINITY
  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2
    const to = { x: from.x + Math.cos(angle) * STEP, y: from.y + Math.sin(angle) * STEP }
    if (to.x < 0 || to.y < 0 || to.x > MAP_SIZE || to.y > MAP_SIZE) continue
    const cell = cellOf(sea.size, to)
    if (walked.has(cell)) continue
    const drop = distance[cell] ?? Number.POSITIVE_INFINITY
    if (drop < outDrop) {
      outDrop = drop
      out = { x: Math.round(to.x), y: Math.round(to.y) }
    }
    // Только вниз: иначе река ходит по кругу и никуда не приходит.
    if (drop >= here) continue
    // Меандр: из одинаково пологих направлений вода берёт то, куда её ведёт
    // изгиб.
    const score = drop + bend * Math.sin(angle)
    if (score > bestScore) {
      bestScore = score
      best = { x: Math.round(to.x), y: Math.round(to.y) }
    }
  }
  // Спуска нет — вода стоит и переливается через край: русло идёт в самое
  // низкое из соседних мест, где ещё не было. На пройденное река не
  // возвращается, поэтому и в озере она не запирается.
  return best ?? out
}

function cellOf(size: number, point: Point): number {
  const cell = MAP_SIZE / size
  const column = Math.max(0, Math.min(size - 1, Math.floor(point.x / cell)))
  const row = Math.max(0, Math.min(size - 1, Math.floor(point.y / cell)))
  return row * size + column
}

/**
 * Сколько клеток до ближайшей воды.
 *
 * Обход в ширину от всех морских клеток разом: это и есть «куда под уклон».
 */
function distanceToWater(sea: Sea): number[] {
  const total = sea.size * sea.size
  const distance = new Array<number>(total).fill(Number.POSITIVE_INFINITY)
  const queue: number[] = []
  for (let i = 0; i < total; i += 1) {
    if (sea.mask[i] === '1') {
      distance[i] = 0
      queue.push(i)
    }
  }
  for (let head = 0; head < queue.length; head += 1) {
    const at = queue[head] as number
    const row = Math.floor(at / sea.size)
    const column = at % sea.size
    const step = (distance[at] ?? 0) + 1
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = column + dx
      const ny = row + dy
      if (nx < 0 || ny < 0 || nx >= sea.size || ny >= sea.size) continue
      const next = ny * sea.size + nx
      if ((distance[next] ?? Number.POSITIVE_INFINITY) <= step) continue
      distance[next] = step
      queue.push(next)
    }
  }
  return distance
}

/**
 * Русла клетками: так проверка «переходит ли эта дорога реку» стоит обхода
 * линии, а не перебора всех колен всех рек.
 */
export interface RiverMask {
  readonly size: number
  readonly mask: string
}

/** Пустая маска: мир без рек ничего не переходит. */
export const NO_RIVERS: RiverMask = { size: 1, mask: '0' }

export function riverMask(rivers: readonly River[], size: number = RIVER_GRID): RiverMask {
  const cell = MAP_SIZE / size
  const marks = new Uint8Array(size * size)
  const radius = Math.max(1, Math.round(RIVER_WIDTH / cell))
  for (const river of rivers) {
    for (let i = 1; i < river.points.length; i += 1) {
      const from = river.points[i - 1] as Point
      const to = river.points[i] as Point
      const span = Math.hypot(to.x - from.x, to.y - from.y)
      const steps = Math.max(1, Math.ceil(span / (cell / 2)))
      for (let step = 0; step <= steps; step += 1) {
        const share = step / steps
        const x = from.x + (to.x - from.x) * share
        const y = from.y + (to.y - from.y) * share
        const column = Math.floor(x / cell)
        const row = Math.floor(y / cell)
        for (let dx = -radius; dx <= radius; dx += 1) {
          for (let dy = -radius; dy <= radius; dy += 1) {
            const nx = column + dx
            const ny = row + dy
            if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
            marks[ny * size + nx] = 1
          }
        }
      }
    }
  }
  return { size, mask: maskString(marks) }
}

/**
 * Строка из нулей и единиц по массиву отметок.
 *
 * Не через массив строк и `join`: на двухстах тысячах клеток это стоило двадцать
 * миллисекунд на каждое рождение мира, а кусками по коду символа — одну.
 */
export function maskString(marks: Uint8Array): string {
  const codes = new Uint8Array(marks.length)
  for (let i = 0; i < marks.length; i += 1) codes[i] = marks[i] === 1 ? 49 : 48
  let out = ''
  const chunk = 8192
  for (let i = 0; i < codes.length; i += chunk) {
    out += String.fromCharCode.apply(
      null,
      codes.subarray(i, Math.min(codes.length, i + chunk)) as unknown as number[],
    )
  }
  return out
}

/**
 * Маска русел этого мира.
 *
 * Считается один раз на мир и держится при нём: русла не меняются, а спрашивают
 * их и дороги, и сетка провинций, и карта. В сейв не идёт — она целиком
 * выводится из `world.rivers`.
 */
const masks = new WeakMap<readonly River[], RiverMask>()

export function riverMaskOf(world: Pick<World, 'rivers'>): RiverMask {
  const rivers = world.rivers
  if (!rivers || rivers.length === 0) return NO_RIVERS
  const known = masks.get(rivers)
  if (known) return known
  const made = riverMask(rivers)
  masks.set(rivers, made)
  return made
}

/** Течёт ли река в этой точке. */
export function onRiver(mask: RiverMask, x: number, y: number): boolean {
  const cell = MAP_SIZE / mask.size
  const column = Math.floor(x / cell)
  const row = Math.floor(y / cell)
  if (column < 0 || row < 0 || column >= mask.size || row >= mask.size) return false
  return mask.mask[row * mask.size + column] === '1'
}

/**
 * Пересекает ли отрезок реку — мимо брода.
 *
 * Концы отрезка не считаются (`FORD_REACH`): переход через реку возможен только
 * через место, стоящее на русле.
 */
export function crossesRiver(mask: RiverMask, from: Point, to: Point): boolean {
  return riverCrossing(mask, from, to) !== null
}

/**
 * Где отрезок переходит реку: середина того куска, которым он идёт по руслу.
 *
 * Середина, а не первая встреченная клетка: брод ставят там, где берега ближе
 * всего друг к другу, — посреди русла, а не у его края.
 */
export function riverCrossing(mask: RiverMask, from: Point, to: Point): Point | null {
  if (mask.size <= 1) return null
  const cell = MAP_SIZE / mask.size
  const span = Math.hypot(to.x - from.x, to.y - from.y)
  if (span <= 0) return null
  const steps = Math.max(2, Math.ceil(span / (cell / 2)))
  const wet = (step: number): boolean => {
    const share = step / steps
    return onRiver(mask, from.x + (to.x - from.x) * share, from.y + (to.y - from.y) * share)
  }
  // Конец, стоящий на русле, — это брод: русло, идущее от него без разрыва,
  // не переход, а сам брод. На излучине оно тянется дальше `FORD_REACH`, и
  // без этого брод на излучине оставался без единой дороги (этап 44).
  let low = 0
  while (low <= steps && (span * low) / steps < FORD_REACH) low += 1
  if (wet(0)) while (low <= steps && wet(low)) low += 1
  let high = steps
  while (high >= 0 && (span * (steps - high)) / steps < FORD_REACH) high -= 1
  if (wet(steps)) while (high >= 0 && wet(high)) high -= 1
  let first = -1
  let last = -1
  for (let step = low; step <= high; step += 1) {
    if (!wet(step)) continue
    if (first < 0) first = step
    last = step
  }
  if (first < 0) return null
  const share = (first + last) / 2 / steps
  return {
    x: Math.round(from.x + (to.x - from.x) * share),
    y: Math.round(from.y + (to.y - from.y) * share),
  }
}

/**
 * Куски суши: что отрезано от чего.
 *
 * Море делит землю на материк и острова, река — материк на берега. Клетка
 * получает номер того куска, по которому до неё можно дойти, не замочив ног;
 * `-1` — вода, `-2` — само русло (оно и есть граница). На этом держится правило
 * «провинция не перешагивает реку»: земля принадлежит той провинции, чей якорь
 * лежит на этом же берегу.
 */
export function landPieces(sea: Sea, rivers: RiverMask): Int32Array {
  const size = sea.size
  const cell = MAP_SIZE / size
  const pieces = new Int32Array(size * size).fill(-3)
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const at = row * size + column
      if (sea.mask[at] === '1') {
        pieces[at] = -1
        continue
      }
      if (onRiver(rivers, (column + 0.5) * cell, (row + 0.5) * cell)) pieces[at] = -2
    }
  }
  let next = 0
  const queue: number[] = []
  for (let start = 0; start < pieces.length; start += 1) {
    if (pieces[start] !== -3) continue
    const id = next
    next += 1
    pieces[start] = id
    queue.length = 0
    queue.push(start)
    for (let head = 0; head < queue.length; head += 1) {
      const at = queue[head] as number
      const row = Math.floor(at / size)
      const column = at % size
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = column + dx
        const ny = row + dy
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
        const to = ny * size + nx
        if (pieces[to] !== -3) continue
        pieces[to] = id
        queue.push(to)
      }
    }
  }
  return pieces
}

/** Кусок суши под этой точкой. Отрицательное — вода или само русло. */
export function pieceAt(pieces: Int32Array, size: number, x: number, y: number): number {
  const cell = MAP_SIZE / size
  const column = Math.floor(x / cell)
  const row = Math.floor(y / cell)
  if (column < 0 || row < 0 || column >= size || row >= size) return -1
  return pieces[row * size + column] ?? -1
}

/**
 * Половодье.
 *
 * Весной река вскрывается и поднимается, и брод — мелкое место, а не мост —
 * уходит под воду. Это и есть разница между бродом и переправой: паром на
 * канате ходит и в большую воду, а через брод в эти недели просто не пройти —
 * ни герою, ни войску, ни обозу. Обход при этом всегда есть: русло переходят не
 * в одном месте.
 */
export const FLOOD_FROM = 75
export const FLOOD_TO = 105

/** Стоит ли большая вода в этот день года. `null` — время неизвестно. */
export function isFlood(day: number | null): boolean {
  if (day === null) return false
  const inYear = (((day - 1) % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR
  return inYear + 1 >= FLOOD_FROM && inYear + 1 <= FLOOD_TO
}

/** Закрыт ли этот брод большой водой. */
export function fordShut(world: World, locationId: string, day: number | null): boolean {
  if (!isFlood(day)) return false
  return world.locations[locationId]?.archetype === 'ford'
}

/**
 * На какой реке стоит это место.
 *
 * Нужно там, где мир объясняется игроку: «брод на Студёной» — это не украшение,
 * а ответ на вопрос, почему через него все и ходят.
 */
export function riverAt(world: World, point: Point): River | null {
  const rivers = riversOf(world)
  if (rivers.length === 0 || !onRiver(riverMaskOf(world), point.x, point.y)) return null
  let best: River | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const river of rivers) {
    for (const knee of river.points) {
      const distance = Math.hypot(knee.x - point.x, knee.y - point.y)
      if (distance < bestDistance) {
        bestDistance = distance
        best = river
      }
    }
  }
  return best
}

/** Реки мира, если они в нём есть. Сейвы до 0.5 их не знают. */
export function riversOf(world: World): readonly River[] {
  return world.rivers ?? []
}
