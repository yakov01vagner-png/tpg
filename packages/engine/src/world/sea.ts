import type { Point } from './layout'
import { MAP_SIZE } from './layout'
import type { World } from './types'

/**
 * Вода.
 *
 * До 0.5 у мира не было моря: «побережье» было цветом клетки, а карта кончалась
 * обрезом полотна. Порт стоял на берегу, из которого никуда не плыли. Теперь у
 * земли есть край, и за ним вода — часть мира, а не отсутствие мира.
 *
 * Вода лежит в скелете, как и координаты мест (0.4): мир целиком уходит в сейв
 * и не меняется, поэтому берег обязан быть одним и тем же при каждом запуске.
 * Хранится маской по клеткам, а не многоугольником: клетками карта и так
 * думает, проверка «тут вода?» стоит одного обращения, а рисование — одного
 * прямоугольника.
 */
export interface Sea {
  /** Клеток по стороне полотна. */
  readonly size: number
  /** Строка из «0» и «1» построчно: единица — вода. */
  readonly mask: string
}

/**
 * Клеток по стороне в маске воды.
 *
 * Мельче, чем сетка провинций (84): берег — это линия, и на ней видна разница
 * между мысом и заливом. Сто двадцать восемь клеток на две тысячи единиц — это
 * шестнадцать единиц на клетку, вдвое меньше зазора между местами.
 */
export const SEA_GRID = 224

/**
 * Докуда от места тянется суша.
 *
 * Земля — это то, что вокруг людей: континент выходит объединением кругов
 * вокруг мест и полос вдоль дорог между ними. Круг маленький нарочно — иначе
 * берег уходит за сто единиц от крайнего места, и «порт» стоит в полутора днях
 * от воды. Полоса вдоль дороги нужна затем, чтобы между двумя соседями не
 * оказалось пролива, которого никто не переплывал.
 */
const LAND_REACH = 58
const ROAD_REACH = 58
/**
 * И докуда тянется земля провинции.
 *
 * Без этого круга континент выходил лентой вдоль дорог: шестьдесят процентов
 * мест оказывались «на берегу», потому что берег был с обеих сторон в получасе
 * ходьбы. Провинция — это земля целиком (DESIGN.md, п.3.1.1), и суша обязана
 * заполнять её середину, а не обтекать дороги.
 */
const PROVINCE_REACH = 118

/** Насколько рвано идёт берег: доля радиуса, которую отъедает или добавляет шум. */
const RAGGED = 0.42

/**
 * Докуда от хребта материка тянется суша.
 *
 * Короны стоят в тысяче единиц друг от друга; земля каждой доходит примерно до
 * пяти сотен. Три сотни от линии между столицами закрывают промежуток и
 * оставляют море там, где хребта нет: у внешнего края и в углах полотна, где
 * стоят острова.
 */
const SPINE_REACH = 300

/** Устойчивый шум: один и тот же берег при каждом запуске. */
function noise(x: number, y: number, salt: number): number {
  let hash = 2166136261 ^ salt
  hash = Math.imul(hash ^ x, 16777619)
  hash = Math.imul(hash ^ y, 16777619)
  hash = Math.imul(hash ^ (hash >>> 13), 16777619)
  return ((hash >>> 8) % 1000) / 1000
}

/**
 * Мягкий шум: соседние клетки похожи, иначе берег выходит не изрезанным, а
 * пилой в одну клетку. Считается по четырём углам крупной ячейки.
 */
function ease(t: number): number {
  return t * t * (3 - 2 * t)
}

function smoothNoise(x: number, y: number, step: number, salt: number): number {
  const cx = Math.floor(x / step)
  const cy = Math.floor(y / step)
  const fx = x / step - cx
  const fy = y / step - cy
  const a = noise(cx, cy, salt)
  const b = noise(cx + 1, cy, salt)
  const c = noise(cx, cy + 1, salt)
  const d = noise(cx + 1, cy + 1, salt)
  const ex = ease(fx)
  const ey = ease(fy)
  return (a * (1 - ex) + b * ex) * (1 - ey) + (c * (1 - ex) + d * ex) * ey
}

/**
 * Где суша, а где вода.
 *
 * Суша — объединение кругов вокруг мест, а радиус круга гуляет от шума: отсюда
 * заливы, мысы и неровная линия прибоя. Море не рисуется отдельно: это всё, что
 * не земля, — потому и берег всегда там, где кончаются люди.
 */
export function buildSea(
  locations: readonly Point[],
  links: readonly (readonly [Point, Point])[],
  provinces: readonly Point[],
  seed: number,
  size: number = SEA_GRID,
  spine: readonly (readonly [Point, Point])[] = [],
): Sea {
  const cell = MAP_SIZE / size
  const step = LAND_REACH * 2
  const columns = Math.ceil(MAP_SIZE / step) + 2
  const buckets = new Map<number, Point[]>()
  const roads = new Map<number, (readonly [Point, Point])[]>()
  const key = (x: number, y: number) => Math.floor(x / step) * columns + Math.floor(y / step)
  for (const point of locations) {
    const at = key(point.x, point.y)
    const bucket = buckets.get(at)
    if (bucket) bucket.push(point)
    else buckets.set(at, [point])
  }
  // Отрезок дороги кладётся во все клетки, которые задевает: иначе полосу земли
  // под ним придётся искать перебором всех дорог на каждую клетку карты.
  for (const link of links) {
    const [from, to] = link
    const span = Math.hypot(to.x - from.x, to.y - from.y)
    const steps = Math.max(1, Math.ceil(span / step))
    for (let i = 0; i <= steps; i += 1) {
      const share = i / steps
      const at = key(from.x + (to.x - from.x) * share, from.y + (to.y - from.y) * share)
      const bucket = roads.get(at)
      if (bucket) {
        if (!bucket.includes(link)) bucket.push(link)
      } else roads.set(at, [link])
    }
  }

  // Середины провинций тоже по клеткам: на сотне провинций и полусотне тысяч
  // клеток перебор всех против всех стоил больше, чем всё остальное море.
  const wide = PROVINCE_REACH * (1 + RAGGED)
  const wideColumns = Math.ceil(MAP_SIZE / wide) + 2
  const middles = new Map<number, Point[]>()
  for (const point of provinces) {
    const at = Math.floor(point.x / wide) * wideColumns + Math.floor(point.y / wide)
    const bucket = middles.get(at)
    if (bucket) bucket.push(point)
    else middles.set(at, [point])
  }

  // Хребет с запасом по краям: точка дальше рамки отрезка и дальше предела —
  // не проверяется вовсе, а таких девять из десяти.
  const margin = SPINE_REACH * (1 + RAGGED)
  const bones = spine.map(([from, to]) => ({
    from,
    to,
    left: Math.min(from.x, to.x) - margin,
    right: Math.max(from.x, to.x) + margin,
    top: Math.min(from.y, to.y) - margin,
    bottom: Math.max(from.y, to.y) + margin,
  }))

  const mask: string[] = []
  for (let row = 0; row < size; row += 1) {
    const y = (row + 0.5) * cell
    for (let column = 0; column < size; column += 1) {
      const x = (column + 0.5) * cell
      // Берег рвётся крупными зубцами (заливы) и мелкими (бухты).
      const coarse = smoothNoise(x, y, 260, seed)
      const fine = smoothNoise(x, y, 90, seed + 7)
      const ragged = 1 + (coarse * 0.7 + fine * 0.3 - 0.5) * RAGGED
      const reach = LAND_REACH * ragged
      const along = ROAD_REACH * ragged
      let land = false
      // Хребет материка держит землю между коронами: без него восемь корон на
      // полотне — восемь островов, а между ними пролив (этап 44).
      for (const bone of bones) {
        if (x < bone.left || x > bone.right || y < bone.top || y > bone.bottom) continue
        if (nearSegment(x, y, bone.from, bone.to) <= SPINE_REACH * ragged) {
          land = true
          break
        }
      }
      // Середина провинции держит вокруг себя землю: провинция — это земля, а
      // не список мест.
      const wx = Math.floor(x / wide)
      const wy = Math.floor(y / wide)
      for (let dx = -1; dx <= 1 && !land; dx += 1) {
        for (let dy = -1; dy <= 1 && !land; dy += 1) {
          for (const middle of middles.get((wx + dx) * wideColumns + (wy + dy)) ?? []) {
            if (Math.hypot(middle.x - x, middle.y - y) <= PROVINCE_REACH * ragged) {
              land = true
              break
            }
          }
        }
      }
      const cx = Math.floor(x / step)
      const cy = Math.floor(y / step)
      for (let dx = -1; dx <= 1 && !land; dx += 1) {
        for (let dy = -1; dy <= 1 && !land; dy += 1) {
          const at = (cx + dx) * columns + (cy + dy)
          for (const point of buckets.get(at) ?? []) {
            if (Math.hypot(point.x - x, point.y - y) <= reach) {
              land = true
              break
            }
          }
          if (land) break
          for (const link of roads.get(at) ?? []) {
            if (nearSegment(x, y, link[0], link[1]) <= along) {
              land = true
              break
            }
          }
        }
      }
      mask.push(land ? '0' : '1')
    }
  }
  return { size, mask: mask.join('') }
}

/** Насколько точка отстоит от отрезка. */
function nearSegment(x: number, y: number, from: Point, to: Point): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = dx * dx + dy * dy
  if (length === 0) return Math.hypot(x - from.x, y - from.y)
  const share = Math.max(0, Math.min(1, ((x - from.x) * dx + (y - from.y) * dy) / length))
  return Math.hypot(x - (from.x + dx * share), y - (from.y + dy * share))
}

/** Вода ли в этой точке полотна. За краем полотна — тоже вода. */
export function isWater(sea: Sea, x: number, y: number): boolean {
  const cell = MAP_SIZE / sea.size
  const column = Math.floor(x / cell)
  const row = Math.floor(y / cell)
  if (column < 0 || row < 0 || column >= sea.size || row >= sea.size) return true
  return sea.mask[row * sea.size + column] === '1'
}

/**
 * Переходит ли отрезок воду.
 *
 * Дорога по морю не идёт: проверяется не только середина, но вся линия — иначе
 * тракт спокойно перепрыгивает залив, задевая его краем.
 */
export function crossesWater(sea: Sea, from: Point, to: Point): boolean {
  const span = Math.hypot(to.x - from.x, to.y - from.y)
  const cell = MAP_SIZE / sea.size
  const steps = Math.max(2, Math.ceil(span / (cell / 2)))
  const size = sea.size
  const mask = sea.mask
  // Маска читается впрямую, без вызова на каждый шаг: отрезков проверяются
  // сотни тысяч, и по шагу на клетку в каждом.
  for (let i = 0; i <= steps; i += 1) {
    const share = i / steps
    const column = Math.floor((from.x + (to.x - from.x) * share) / cell)
    const row = Math.floor((from.y + (to.y - from.y) * share) / cell)
    if (column < 0 || row < 0 || column >= size || row >= size) return true
    if (mask.charCodeAt(row * size + column) === 49) return true
  }
  return false
}

/** Сколько в мире воды: доля клеток. Для проверок и для отчёта о мире. */
export function waterShare(sea: Sea): number {
  let water = 0
  for (const one of sea.mask) if (one === '1') water += 1
  return water / (sea.size * sea.size)
}

/**
 * Стоит ли место на берегу: есть ли вода в получасе ходьбы.
 *
 * Восемьдесят две единицы — это чуть больше того, на сколько суша выступает за
 * крайние места (`LAND_REACH`): иначе «на берегу» не оказывается вообще никто,
 * ведь земля всегда немного шире, чем люди на ней.
 */
export function onShore(sea: Sea, point: Point, within = 82): boolean {
  const steps = 8
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2
    if (isWater(sea, point.x + Math.cos(angle) * within, point.y + Math.sin(angle) * within)) {
      return true
    }
  }
  return false
}

/** Вода мира, если она в нём есть. Старые сейвы её не знают. */
export function seaOf(world: World): Sea | null {
  return world.sea ?? null
}
