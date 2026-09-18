import { SITES } from '../content/sites'
import { TERRAIN_TRAVEL } from '../content/world'
import { MAP_SIZE } from './layout'
import type { RiverMask } from './rivers'
import { NO_RIVERS, crossesRiver, riverMaskOf } from './rivers'
import type { Sea } from './sea'
import { crossesWater } from './sea'
import type { Location, Road, Terrain, World } from './types'
import { isSite } from './types'

/**
 * Дороги строятся от земли.
 *
 * Правило одно: дорога соединяет соседей. Соседи — это те двое, между которыми
 * не стоит никто третий; если между ними кто-то есть, дорога идёт через него, а
 * не мимо. Это граф относительного соседства, и он даёт ровно то, чего от карты
 * ждёт игрок: путь из деревни в деревню проходит через то, что между ними
 * лежит.
 *
 * До 0.4 дороги строились из списков: провинция сшивалась цепочкой в порядке
 * генерации, области — по первому месту в списке, столица — прямо с вольным
 * селом чужой марки. Выходило, что 131 отрезок из 229 проходил мимо чужих мест,
 * самый длинный шаг покрывал треть мира (360 единиц карты при мире 1085 × 1165),
 * а часы были связаны с расстоянием лишь наполовину (r = 0.51): их бросал кубик.
 * Из столицы Ре-Эстиза уходили четыре дороги по 227–303 единицы прямо к вольным
 * сёлам марок, перепрыгивая через 43–67 мест, — «портал между столицами»,
 * который версия 0.3 считала закрытым, просто переехал на пограничье.
 */

/** Сколько единиц карты покрывает час пешего пути по ровному месту. */
export const UNITS_PER_HOUR = 12

/**
 * Дальше этого места соседями не считаются.
 *
 * Не бесконечность нарочно: за краем обитаемой земли лежит пустота, и тянуть
 * через неё тракт незачем. Всё, что после этого распадается на острова,
 * сшивается отдельно и по кратчайшему — так в мире остаются и дальние
 * переходы, но ровно там, где без них не обойтись.
 */
const REACH = 225

/** Место на карте: только то, что нужно дороге. */
export interface Spot {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly terrain: Terrain
  readonly slow: number
  /** Стоит на острове: к нему не тянут перемычку, туда плывут (этап 35). */
  readonly island?: boolean
}

export function buildRoads(world: Omit<World, 'roads'>): Record<string, readonly Road[]> {
  const spots = Object.values(world.locations).map((one) =>
    toSpot(one, world.provinces[one.provinceId]?.island === true),
  )
  const roads: Record<string, Road[]> = {}
  const sea = world.sea ?? null
  const rivers = riverMaskOf(world)

  const connect = (a: Spot, b: Spot) => {
    const forward = roads[a.id] ?? []
    if (forward.some((road) => road.to === b.id)) return
    const hours = legHours(a, b)
    const backward = roads[b.id] ?? []
    forward.push({ to: b.id, hours })
    backward.push({ to: a.id, hours })
    roads[a.id] = forward
    roads[b.id] = backward
  }

  const union = new Union(spots.map((spot) => spot.id))
  for (const pair of neighbourPairs(spots, sea, rivers)) {
    connect(pair.from, pair.to)
    union.join(pair.from.id, pair.to.id)
  }

  // Острова сшиваются кратчайшим переходом посуху: мир должен быть связен,
  // даже если между двумя его кусками пусто. Через воду перемычку не тянут —
  // туда плывут (этап 35).
  bridgeIslands(spots, union, connect, sea, rivers)

  return roads
}

/**
 * Кто кому сосед: пары, между которыми не стоит никто третий.
 *
 * Тем же правилом генератор решает, где встать местам без жителей: сперва
 * считается соседство поселений, а потом между соседями кладётся то, через что
 * к ним идут (этап 26).
 */
export function neighbourPairs(
  spots: readonly Spot[],
  sea: Sea | null = null,
  rivers: RiverMask = NO_RIVERS,
): { from: Spot; to: Spot }[] {
  const index = new Grid(spots)
  const pairs: { from: Spot; to: Spot }[] = []
  const near: { spot: Spot; index: number; span: number }[] = []
  for (const [i, a] of spots.entries()) {
    // Все, кто в пределе, по возрастанию расстояния. Тот, кто может стоять
    // между `a` и `b`, сам ближе к `a`, чем `b`, — то есть уже лежит в этом
    // списке раньше `b`. Поэтому проверка «не стоит ли кто между» идёт по
    // началу списка, а не по сетке заново: на полутора тысячах мест это
    // втрое дешевле (этап 44).
    near.length = 0
    index.forEachNear(a, REACH, (j, b) => {
      near.push({ spot: b, index: j, span: distance(a, b) })
      return true
    })
    near.sort((one, other) => one.span - other.span)
    for (const candidate of near) {
      // Пара считается один раз: соседство взаимно.
      if (candidate.index <= i) continue
      const b = candidate.spot
      const limit = candidate.span * candidate.span
      let alone = true
      for (const other of near) {
        if (other.span > candidate.span) break
        if (other.spot === b) continue
        if (squared(other.spot, b) < limit) {
          alone = false
          break
        }
      }
      if (!alone) continue
      // По воде дороги не бывает: залив обходят берегом или переплывают, но
      // тракта через него нет (этап 33).
      if (sea && crossesWater(sea, a, b)) continue
      // И через реку тракт идёт только бродом: отрезок, переходящий русло
      // мимо места, стоящего на нём, — это дорога вплавь (этап 34).
      if (crossesRiver(rivers, a, b)) continue
      pairs.push({ from: a, to: b })
    }
  }
  return pairs
}

/** Место на карте в виде, который понимает дорога. */
export function spotOf(location: Location, island = false): Spot {
  return toSpot(location, island)
}

/**
 * Часы отрезка: расстояние, земля и то, что на нём стоит.
 *
 * Гать вдвое дольше тракта не потому, что так выпал кубик, а потому что это
 * гать. Меньше часа дорог не бывает: даже соседний хутор — это выйти и дойти.
 */
export function legHours(a: Spot, b: Spot): number {
  const terrain = (TERRAIN_TRAVEL[a.terrain] + TERRAIN_TRAVEL[b.terrain]) / 2
  const slow = Math.max(a.slow, b.slow)
  return Math.max(1, Math.round((distance(a, b) / UNITS_PER_HOUR) * terrain * slow))
}

/** Часы между двумя местами мира — тем же правилом, что и при постройке. */
export function hoursBetweenPlaces(from: Location, to: Location): number {
  return legHours(toSpot(from), toSpot(to))
}

function toSpot(location: Location, island = false): Spot {
  return {
    id: location.id,
    x: location.x,
    y: location.y,
    terrain: location.terrain,
    slow: isSite(location.archetype) ? SITES[location.archetype].slow : 1,
    ...(island ? { island } : {}),
  }
}

/** Квадратный корень, а не `Math.hypot`: тот в разы медленнее, а зовётся миллионами. */
function distance(a: Spot, b: Spot): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function squared(a: Spot, b: Spot): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

function bridgeIslands(
  spots: readonly Spot[],
  union: Union,
  connect: (a: Spot, b: Spot) => void,
  sea: Sea | null = null,
  rivers: RiverMask = NO_RIVERS,
): void {
  // Кусок, до которого посуху не дотянуться, таким и остаётся: соседство
  // взаимно, и раз он не нашёл берега, к нему берега не найдёт никто. Его не
  // перебирают заново на каждом круге — на полутора тысячах мест этот перебор
  // стоил половины рождения мира (этап 44).
  const stranded = new Set<string>()
  for (let guard = 0; guard < 128; guard += 1) {
    const islands = new Map<string, Spot[]>()
    for (const spot of spots) {
      const root = union.root(spot.id)
      const island = islands.get(root) ?? []
      island.push(spot)
      islands.set(root, island)
    }
    if (islands.size <= 1) return

    // Берём кусок поменьше и тянем от него кратчайший переход к чужой земле.
    // Тот, до которого посуху не дотянуться вовсе (настоящий остров за морем),
    // пропускаем и берёмся за следующий: иначе один остров отменяет сшивание
    // всего остального — а в мире с версии 0.5 острова есть нарочно (этап 35).
    const sorted = [...islands.entries()].sort((one, other) => one[1].length - other[1].length)
    let joined = false
    for (const [root, island] of sorted) {
      if (stranded.has(root)) continue
      // Остров по замыслу — остров: его не ищут на карте перебором, он записан
      // в скелете.
      if (island.every((spot) => spot.island)) {
        stranded.add(root)
        continue
      }
      // Когда все остальные куски — острова за морем, материку искать некого:
      // он перебирал бы всех своих против двух десятков чужих.
      if (sorted.filter(([other]) => !stranded.has(other)).length < 2) return
      const best = shortestLandLink(island, spots, sea, rivers)
      if (!best) {
        stranded.add(root)
        continue
      }
      connect(best.from, best.to)
      union.join(best.from.id, best.to.id)
      joined = true
      break
    }
    // Всё, что осталось, за морем друг от друга: сшивать больше нечего.
    if (!joined) return
  }
}

/**
 * Кратчайший переход с куска на чужую землю.
 *
 * Сперва берутся ближние пары, и вода проверяется только у них: проверка
 * отрезка по маске стоит сотни шагов, а пар — сотни тысяч. Круг расширяется,
 * только если поблизости всё за водой.
 */
export function shortestLandLink(
  island: readonly Spot[],
  spots: readonly Spot[],
  sea: Sea | null,
  rivers: RiverMask,
): { from: Spot; to: Spot; span: number } | null {
  const mine = new Set(island.map((spot) => spot.id))
  const others = spots.filter((spot) => !mine.has(spot.id))
  const index = new Grid(others)
  const passable = (from: Spot, to: Spot): boolean =>
    !(sea && crossesWater(sea, from, to)) && !crossesRiver(rivers, from, to)
  let floor = 0
  for (const limit of [120, 240, 480]) {
    const candidates: { from: Spot; to: Spot; span: number }[] = []
    for (const from of island) {
      index.forEachNear(from, limit, (_index, to) => {
        const span = distance(from, to)
        if (span > floor) candidates.push({ from, to, span })
        return true
      })
    }
    candidates.sort((one, other) => one.span - other.span)
    for (const candidate of candidates) if (passable(candidate.from, candidate.to)) return candidate
    floor = limit
  }
  // Поблизости всё за водой: перебираем всех. Сюда доходят только настоящие
  // острова, и они малы.
  const far: { from: Spot; to: Spot; span: number }[] = []
  for (const from of island) {
    for (const to of others) {
      const span = distance(from, to)
      if (span > floor) far.push({ from, to, span })
    }
  }
  far.sort((one, other) => one.span - other.span)
  for (const candidate of far) if (passable(candidate.from, candidate.to)) return candidate
  return null
}

/**
 * Сетка для поиска соседей: перебирать все места против всех дорого.
 *
 * Клетка — половина предела: обход идёт по пяти клеткам на пять, и в каждой
 * стоит по одному-два места. При клетке в целый предел проверка «не стоит ли
 * кто между» перебирала сотню мест на каждую пару и стоила ста семидесяти
 * миллисекунд на рождение мира; при клетке в треть предела клеток выходило
 * полсотни на запрос, и на полутора тысячах мест сами обращения к сетке стоили
 * больше проверок (этап 44).
 * Соседей отдаём обходом без списка: на шести с половиной сотнях мест пары
 * складываются десятками тысяч, и каждый выделенный массив стоит дороже самой
 * проверки.
 */
const CELL = 113

class Grid {
  private readonly cells = new Map<number, number[]>()
  private readonly columns: number

  constructor(private readonly spots: readonly Spot[]) {
    this.columns = Math.ceil((MAP_SIZE * 2) / CELL)
    for (const [index, spot] of spots.entries()) {
      const key = this.key(spot.x, spot.y)
      const cell = this.cells.get(key)
      if (cell) cell.push(index)
      else this.cells.set(key, [index])
    }
  }

  /** Пройтись по всем, кто ближе радиуса. Возврат `false` прекращает обход. */
  forEachNear(from: Spot, radius: number, visit: (index: number, spot: Spot) => boolean): void {
    const steps = Math.ceil(radius / CELL)
    const cx = Math.floor(from.x / CELL)
    const cy = Math.floor(from.y / CELL)
    for (let dx = -steps; dx <= steps; dx += 1) {
      for (let dy = -steps; dy <= steps; dy += 1) {
        const cell = this.cells.get((cx + dx) * this.columns + (cy + dy))
        if (!cell) continue
        for (const index of cell) {
          const spot = this.spots[index]
          if (!spot || spot.id === from.id) continue
          if (distance(from, spot) > radius) continue
          if (!visit(index, spot)) return
        }
      }
    }
  }

  private key(x: number, y: number): number {
    return Math.floor(x / CELL) * this.columns + Math.floor(y / CELL)
  }
}

/** Кто с кем связан: чтобы знать, не распался ли мир на острова. */
export class Union {
  private readonly parent = new Map<string, string>()

  constructor(ids: readonly string[]) {
    for (const id of ids) this.parent.set(id, id)
  }

  root(id: string): string {
    let current = id
    for (let guard = 0; guard < 1000; guard += 1) {
      const next = this.parent.get(current)
      if (!next || next === current) break
      current = next
    }
    this.parent.set(id, current)
    return current
  }

  join(a: string, b: string): void {
    const rootA = this.root(a)
    const rootB = this.root(b)
    if (rootA !== rootB) this.parent.set(rootA, rootB)
  }
}
