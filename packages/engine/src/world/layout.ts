import { ISLANDS, KINGDOM_CENTERS, MARCHES } from '../content/world'
import type { World } from './types'

/**
 * Где что лежит на карте.
 *
 * Королевства стоят там, где им положено по сеттингу, области расходятся от
 * столицы веером, провинции — от центра области, а места рассыпаны внутри
 * провинции с небольшим разбросом, чтобы карта не выглядела чертежом.
 *
 * Считается это один раз, при рождении мира, и ложится в скелет: у места есть
 * координата (`Location.x/y`). Раньше положение выводилось из списков при
 * каждом обращении, а дороги строились из тех же списков, но по другому
 * правилу, — и карта с дорогой говорили разное: 131 отрезок из 229 проходил
 * мимо чужих мест. Теперь дорога строится от той же координаты, по которой
 * место рисуют.
 */
export interface Point {
  readonly x: number
  readonly y: number
}

export const MAP_SIZE = 3600

/**
 * Полотно мира.
 *
 * Полторы тысячи было тесно: с версии 0.4 между двумя поселениями должны
 * умещаться два места без жителей, и при прежнем масштабе распорядитель
 * (`Spacer`) растаскивал деревни на сто восемьдесят единиц от середины их же
 * провинции — то есть в чужую землю. Полотно выросло в полтора раза, а зазоры
 * остались прежними: земля стала просторнее, а не крупнее. Час пути при этом
 * стоит столько же — `UNITS_PER_HOUR` вырос вместе с полотном.
 */

/** Насколько далеко половины марки расходятся вдоль границы. */
const MARCH_SPAN = 93

/**
 * Как далеко от престола ложатся провинции: ближнее кольцо — на шаг от
 * престола, дальнее — на два с лишним. Короны на материке стоят в
 * тысяче единиц друг от друга (этап 44), и при прежнем шаге в девяносто три
 * единицы каждая была пятном в три сотни посреди пустой земли, а марки —
 * точками в никуда. С шагом в сто тридцать земля короны доходит до пяти сотен,
 * и соседи сходятся краями там, где между ними лежит марка, — но не дальше
 * середины между престолами: всякое место ближе к своему престолу, чем к
 * чужому, с запасом на разброс и на распорядителя, который отводит тесно
 * стоящих в сторону.
 */
const PROVINCE_NEAR = 110
const PROVINCE_STEP = 130

/** Устойчивый разброс: одно и то же место всегда оказывается в одной точке. */
function jitter(seed: string, spread: number): Point {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const a = ((hash >>> 8) % 1000) / 1000
  const b = ((hash >>> 18) % 1000) / 1000
  const angle = a * Math.PI * 2
  const radius = Math.sqrt(b) * spread
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
}

/**
 * Середина провинции.
 *
 * Считается отдельно от мест, потому что провинция — это земля, а не список
 * поселений (DESIGN.md, п.3.1.1). Даже провинция, где стоит одна деревня на
 * краю, держит свою округу вокруг этой точки, а не вокруг деревни.
 */
export function provinceCentersOf(world: World): Readonly<Record<string, Point>> {
  const centers: Record<string, Point> = {}

  for (const kingdom of Object.values(world.kingdoms)) {
    const center = KINGDOM_CENTERS[kingdom.id] ?? { x: MAP_SIZE / 2, y: MAP_SIZE / 2 }
    const regions = kingdom.regionIds
    // Область — клин от столицы наружу, и клинья делят круг поровну. Пока
    // области стояли кольцом вокруг столицы, а провинции кольцом вокруг
    // области, выходило два зла сразу: земля короны рвалась надвое, потому что
    // у самой столицы не было ничьей провинции, а провинции соседних областей
    // залезали друг к другу, и «карта по областям» переставала быть картой
    // областей.
    const spread = (Math.PI * 2) / Math.max(1, regions.length)

    regions.forEach((regionId, regionIndex) => {
      const region = world.regions[regionId]
      if (!region) return
      const regionAngle = regionIndex * spread + 0.6
      const count = Math.max(1, region.provinceIds.length)

      region.provinceIds.forEach((provinceId, provinceIndex) => {
        // Провинции заполняют клин веером, а не уходят от престола цепочкой:
        // чётные — ближним кольцом, нечётные — дальним, и вбок они расходятся
        // по всему клину. Пока провинции шли цепочкой по оси клина, корона
        // была не кругом, а четырёхлучевой звездой, и между лучами оставались
        // пустые углы — ровно там, где стоит соседняя корона и марка между
        // ними: вольное село марки оказывалось в двенадцати переходах от
        // ближайшей деревни (этап 44).
        const radius = PROVINCE_NEAR + (provinceIndex % 2 === 0 ? 1 : 1.75) * PROVINCE_STEP
        const angle = regionAngle - spread / 2 + (spread * (provinceIndex + 0.5)) / count
        centers[provinceId] = {
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius,
        }
      })
    })
  }

  // Пограничье ложится ровно между столицами тех корон, между которыми лежит.
  // Оно и есть то, что между: у марки нет своего угла на карте, есть только
  // промежуток.
  for (const march of MARCHES) {
    const [first, second] = march.between
    const a = KINGDOM_CENTERS[first]
    const b = KINGDOM_CENTERS[second]
    if (!a || !b) continue
    // Полоса ложится поперёк линии между столицами: марка — это то, что между,
    // и вытянута она вдоль границы, а не вдоль дороги. Одной провинцией
    // пограничье читалось на карте пятном в две клетки.
    const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const length = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y))
    const across = { x: -(b.y - a.y) / length, y: (b.x - a.x) / length }
    for (const side of [0, 1]) {
      const provinceId = `march.${march.id}.p${side}`
      if (!world.provinces[provinceId]) continue
      const shift = side === 0 ? -MARCH_SPAN : MARCH_SPAN
      centers[provinceId] = {
        x: middle.x + across.x * shift,
        y: middle.y + across.y * shift,
      }
    }
  }

  // Остров стоит там, где ему назначено, и больше нигде: у него нет короны, от
  // которой можно было бы отложить угол и радиус (этап 35).
  for (const island of ISLANDS) {
    const provinceId = `island.${island.id}.p0`
    if (!world.provinces[provinceId]) continue
    centers[provinceId] = island.at
  }

  return centers
}

/** Где стоят места мира: читается из скелета, а не считается заново. */
export function layoutOf(world: World): Readonly<Record<string, Point>> {
  const points: Record<string, Point> = {}
  for (const location of Object.values(world.locations)) {
    points[location.id] = { x: location.x, y: location.y }
  }
  return points
}

/**
 * Разложить места по карте.
 *
 * Зовётся генератором один раз и миграцией — для старых сейвов, где координат
 * в скелете ещё не было. Порядок обхода важен: от него зависит, кого при
 * тесноте отводят в сторону, и старый мир должен разложиться ровно так же, как
 * раскладывался раньше.
 */
export function placeLocations(
  world: Pick<World, 'kingdoms' | 'regions' | 'provinces'>,
  spacer: Spacer = new Spacer(),
): Readonly<Record<string, Point>> {
  const points: Record<string, Point> = {}
  const centers = provinceCentersOf(world as World)

  // Обход идёт по всем провинциям сразу, а не по коронам: у пограничья короны
  // нет, но места в нём есть, и раскладываются они по тому же правилу. Порядок
  // обхода важен: от него зависит, кого при тесноте отводят в сторону.
  for (const [provinceId, province] of Object.entries(world.provinces)) {
    const provinceCenter = centers[provinceId]
    if (!provinceCenter) continue

    // Место стоит там, куда его кладёт собственное имя, — не там, где оно
    // оказалось в списке. Пока положение считалось от номера в провинции,
    // основание одной деревни двигало на карте все соседние: мир нельзя было
    // пополнить, не перерисовав его целиком (DESIGN.md, п.3.1).
    // Разброс в семьдесят с небольшим, а не шестьдесят: с материка (этап 44) в
    // провинции до пяти поселений, и в прежнем круге пятому не хватало места —
    // распорядитель уносил его на полтораста единиц, в чужую землю.
    for (const locationId of province.locationIds) {
      const spot = jitter(locationId, 74)
      points[locationId] = spacer.place(
        { x: provinceCenter.x + spot.x, y: provinceCenter.y + spot.y },
        SETTLEMENT_GAP,
      )
    }

    // Места без жителей ложатся по тому же правилу, но дальше от середины:
    // они и есть то, что лежит между.
    for (const siteId of province.siteIds ?? []) {
      const spot = jitter(siteId, 78)
      points[siteId] = spacer.place({
        x: provinceCenter.x + spot.x,
        y: provinceCenter.y + spot.y,
      })
    }
  }

  return points
}

/**
 * Где встанет выселок.
 *
 * Новая деревня ставится рядом с материнской — на день пути, не дальше:
 * выселки не заводят за горами. Точка выводится из имени места, поэтому
 * основание ничего не двигает на карте (DESIGN.md, п.3.1).
 */
export function placeNear(parent: Point, id: string): Point {
  const spot = jitter(id, 69)
  const span = Math.max(33, Math.hypot(spot.x, spot.y))
  const angle = Math.atan2(spot.y, spot.x)
  return {
    x: clamp(parent.x + Math.cos(angle) * span),
    y: clamp(parent.y + Math.sin(angle) * span),
  }
}

/**
 * Два места в одной точке — это место, которого на карте нет.
 *
 * Слишком близкую точку отводим по спирали, пока она не встанет отдельно.
 * Отводят всегда того, кто пришёл позже: списки мест пополняются с конца,
 * поэтому основанное сегодня никогда не сдвинет стоявшее вчера. Тем же
 * распорядителем генератор кладёт места без жителей — после того, как
 * поселения уже встали (этап 26).
 */
export const MIN_GAP = 16

/**
 * Сколько места держит вокруг себя поселение.
 *
 * Не для красоты карты, а ради правила 0.4: между двумя поселениями должно
 * умещаться не меньше двух мест без жителей. Пока деревни стояли в шестнадцати
 * единицах друг от друга, поставить между ними что-либо было нельзя — тридцать
 * отрезков из четырёхсот так и оставались прямыми «деревня — деревня».
 */
export const SETTLEMENT_GAP = 42

/** А место без жителей — самую малость: оно и есть то, что стоит вплотную. */
export const SITE_GAP = 12

/** Клетка распорядителя: не меньше самого широкого зазора. */
const SPACER_CELL = 64

export class Spacer {
  // Занятые точки по клеткам: зазор не больше клетки, и тесноту проверяют по
  // соседним девяти, а не по всем полутора тысячам (этап 44).
  private readonly cells = new Map<number, { point: Point; gap: number }[]>()
  private readonly columns = Math.ceil(MAP_SIZE / SPACER_CELL) + 2

  place(wanted: Point, gap: number = MIN_GAP): Point {
    const target = { x: clamp(wanted.x), y: clamp(wanted.y) }
    let point = target
    for (let step = 0; step < 64 && this.crowded(point, gap); step += 1) {
      const angle = step * 2.399963 // золотой угол: витки не ложатся друг на друга
      const radius = gap * (1 + step * 0.35)
      point = {
        x: clamp(target.x + Math.cos(angle) * radius),
        y: clamp(target.y + Math.sin(angle) * radius),
      }
    }
    this.add(point, gap)
    return point
  }

  /**
   * Свободно ли тут.
   *
   * Нужно тому, кто не может встать куда попало: брод обязан стоять на русле, и
   * если русло занято — брода не будет вовсе (этап 34). Зазор здесь требуется
   * весь, а не меньший из двух: тот, кто выбирает место сам, не имеет права
   * встать другому на голову.
   */
  free(point: Point, gap: number = MIN_GAP): boolean {
    return !this.crowded({ x: clamp(point.x), y: clamp(point.y) }, gap, true)
  }

  /** Занять точку, не двигая её. */
  take(point: Point, gap: number = MIN_GAP): Point {
    const at = { x: clamp(point.x), y: clamp(point.y) }
    this.add(at, gap)
    return at
  }

  private add(point: Point, gap: number): void {
    const key = this.key(point.x, point.y)
    const cell = this.cells.get(key)
    if (cell) cell.push({ point, gap })
    else this.cells.set(key, [{ point, gap }])
  }

  private key(x: number, y: number): number {
    return Math.floor(x / SPACER_CELL) * this.columns + Math.floor(y / SPACER_CELL)
  }

  /**
   * Тесно ли тут. Двоим хватает того зазора, которого просит меньший: место без
   * жителей встаёт у самой околицы, а два поселения расходятся широко.
   */
  private crowded(point: Point, gap: number, strict = false): boolean {
    const cx = Math.floor(point.x / SPACER_CELL)
    const cy = Math.floor(point.y / SPACER_CELL)
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const cell = this.cells.get((cx + dx) * this.columns + (cy + dy))
        if (!cell) continue
        for (const other of cell) {
          const ox = other.point.x - point.x
          const oy = other.point.y - point.y
          const limit = strict ? gap : Math.min(gap, other.gap)
          if (ox * ox + oy * oy < limit * limit) return true
        }
      }
    }
    return false
  }
}

function clamp(value: number): number {
  return Math.max(12, Math.min(MAP_SIZE - 12, Math.round(value)))
}

/** Цвет королевства на карте: свой у каждого, чтобы границы читались без линий. */
export const KINGDOM_COLORS: Record<string, string> = {
  reEstiz: '#6f8fbf',
  robl: '#c8b56a',
  boharut: '#a86a6a',
  durHazad: '#7e7f8c',
  tribes: '#7f9a63',
  hlad: '#9fb3c8',
  rahim: '#c48a4a',
  league: '#5f9a97',
}
