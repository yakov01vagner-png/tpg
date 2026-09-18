import { SITES } from '../content/sites'
import { TERRAIN_TRAVEL } from '../content/world'
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
}

export function buildRoads(world: Omit<World, 'roads'>): Record<string, readonly Road[]> {
  const spots = Object.values(world.locations).map(toSpot)
  const roads: Record<string, Road[]> = {}

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
  for (const pair of neighbourPairs(spots)) {
    connect(pair.from, pair.to)
    union.join(pair.from.id, pair.to.id)
  }

  // Острова сшиваются кратчайшим переходом: мир должен быть связен, даже если
  // между двумя его кусками пусто.
  bridgeIslands(spots, union, connect)

  return roads
}

/**
 * Кто кому сосед: пары, между которыми не стоит никто третий.
 *
 * Тем же правилом генератор решает, где встать местам без жителей: сперва
 * считается соседство поселений, а потом между соседями кладётся то, через что
 * к ним идут (этап 26).
 */
export function neighbourPairs(spots: readonly Spot[]): { from: Spot; to: Spot }[] {
  const index = new Grid(spots)
  const pairs: { from: Spot; to: Spot }[] = []
  for (const [i, a] of spots.entries()) {
    index.forEachNear(a, REACH, (j, b) => {
      // Пара считается один раз: соседство взаимно.
      if (j > i && neighbours(a, b, index)) pairs.push({ from: a, to: b })
      return true
    })
  }
  return pairs
}

/** Место на карте в виде, который понимает дорога. */
export function spotOf(location: Location): Spot {
  return toSpot(location)
}

/**
 * Стоит ли между ними кто-то третий.
 *
 * Если найдётся место, до которого от обоих концов ближе, чем они друг от
 * друга, — дорога должна идти через него. Это и значит «дорога лежит по земле,
 * а не хордой поверх неё».
 */
function neighbours(a: Spot, b: Spot, index: Grid): boolean {
  const span = distance(a, b)
  let alone = true
  index.forEachNear(a, span, (_index, c) => {
    if (c.id === b.id || distance(c, b) >= span) return true
    alone = false
    return false
  })
  return alone
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

function toSpot(location: Location): Spot {
  return {
    id: location.id,
    x: location.x,
    y: location.y,
    terrain: location.terrain,
    slow: isSite(location.archetype) ? SITES[location.archetype].slow : 1,
  }
}

function distance(a: Spot, b: Spot): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function bridgeIslands(
  spots: readonly Spot[],
  union: Union,
  connect: (a: Spot, b: Spot) => void,
): void {
  for (let guard = 0; guard < 64; guard += 1) {
    const islands = new Map<string, Spot[]>()
    for (const spot of spots) {
      const root = union.root(spot.id)
      const island = islands.get(root) ?? []
      island.push(spot)
      islands.set(root, island)
    }
    if (islands.size <= 1) return

    // Берём остров поменьше и тянем от него кратчайший переход к чужой земле.
    const sorted = [...islands.values()].sort((one, other) => one.length - other.length)
    const island = sorted[0]
    if (!island) return
    const mine = new Set(island.map((spot) => spot.id))
    let best: { from: Spot; to: Spot; span: number } | null = null
    for (const from of island) {
      for (const to of spots) {
        if (mine.has(to.id)) continue
        const span = distance(from, to)
        if (!best || span < best.span) best = { from, to, span }
      }
    }
    if (!best) return
    connect(best.from, best.to)
    union.join(best.from.id, best.to.id)
  }
}

/**
 * Сетка для поиска соседей: перебирать все места против всех дорого.
 *
 * Клетка мельче предела нарочно. При клетке в целый предел проверка «не стоит
 * ли кто между» перебирала сотню мест на каждую пару и стоила ста семидесяти
 * миллисекунд на рождение мира — больше всего бюджета холодного старта. При
 * мелкой клетке перебирается десяток, и та же работа занимает двадцать.
 * Соседей отдаём обходом без списка: на шести с половиной сотнях мест пары
 * складываются десятками тысяч, и каждый выделенный массив стоит дороже самой
 * проверки.
 */
const CELL = 75

class Grid {
  private readonly cells = new Map<number, number[]>()
  private readonly columns: number

  constructor(private readonly spots: readonly Spot[]) {
    this.columns = Math.ceil(4000 / CELL)
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
class Union {
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
