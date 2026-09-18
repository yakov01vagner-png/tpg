import { describe, expect, it } from 'vitest'
import { SITES } from '../src/content/sites'
import { generateWorld } from '../src/world/generate'
import { layoutOf } from '../src/world/layout'
import { reachableFrom, roadsFrom } from '../src/world/queries'
import { UNITS_PER_HOUR, hoursBetweenPlaces } from '../src/world/roads'
import { isSite } from '../src/world/types'
import type { Location, World } from '../src/world/types'

/**
 * Этап 25: дорога по земле.
 *
 * Дорога соединяет соседей — тех двоих, между которыми не стоит никто третий.
 * До 0.4 дороги строились из списков генерации: 131 отрезок из 229 проходил
 * мимо чужих мест, самый длинный покрывал треть мира, а часы бросал кубик
 * (r = 0.51 со расстоянием).
 */

const seeds = [1, 2, 3]
const span = (a: Location, b: Location) => Math.hypot(a.x - b.x, a.y - b.y)

/** Все отрезки мира, каждый по одному разу. */
function legs(world: World): { from: Location; to: Location; hours: number }[] {
  const out: { from: Location; to: Location; hours: number }[] = []
  for (const from of Object.values(world.locations)) {
    for (const road of roadsFrom(world, from.id)) {
      if (from.id > road.to) continue
      const to = world.locations[road.to]
      if (to) out.push({ from, to, hours: road.hours })
    }
  }
  return out
}

describe('дорога лежит по земле', () => {
  it('между концами отрезка не стоит никто третий', () => {
    for (const seed of seeds) {
      const world = generateWorld(seed)
      const all = Object.values(world.locations)
      let chords = 0
      for (const leg of legs(world)) {
        const reach = span(leg.from, leg.to)
        // Если до кого-то ближе от обоих концов, чем они друг от друга, дорога
        // обязана идти через него. Это и значит «по земле, а не хордой».
        const between = all.find(
          (other) =>
            other.id !== leg.from.id &&
            other.id !== leg.to.id &&
            span(leg.from, other) < reach &&
            span(leg.to, other) < reach,
        )
        if (between) chords += 1
      }
      // Ноль — кроме перемычек, которыми сшиваются острова: без них мир
      // распадается, и лучше одна дальняя дорога, чем недостижимая земля.
      expect(chords, `зерно ${seed}`).toBeLessThanOrEqual(2)
    }
  })

  it('часы отрезка — это расстояние, земля и то, что на нём стоит', () => {
    for (const seed of seeds) {
      const world = generateWorld(seed)
      const all = legs(world)
      for (const leg of all) {
        expect(leg.hours).toBe(hoursBetweenPlaces(leg.from, leg.to))
      }
      // Связь с расстоянием почти полная. Не полная нарочно: гать и перевал
      // дороже ровного места, и в этом весь смысл.
      const r = correlation(
        all.map((leg) => span(leg.from, leg.to)),
        all.map((leg) => leg.hours),
      )
      const exact = correlation(
        all.map((leg) => span(leg.from, leg.to) * slowOf(leg.from, leg.to)),
        all.map((leg) => leg.hours),
      )
      if (seed === 1)
        console.log(`часы и расстояние: r = ${r.toFixed(2)}, с землёй r = ${exact.toFixed(2)}`)
      expect(r, `зерно ${seed}`).toBeGreaterThan(0.85)
      expect(exact, `зерно ${seed}`).toBeGreaterThan(0.97)
    }
  })

  it('шаг не покрывает полмира', () => {
    for (const seed of seeds) {
      const world = generateWorld(seed)
      const longest = legs(world).reduce((worst, leg) => Math.max(worst, span(leg.from, leg.to)), 0)
      if (seed === 1) console.log(`самый длинный отрезок: ${longest.toFixed(0)} единиц карты`)
      // В 0.3 самый длинный отрезок был 360 единиц при мире 1085 × 1165.
      expect(longest, `зерно ${seed}`).toBeLessThan(170)
    }
  })

  it('из столицы дороги идут к соседям', () => {
    for (const seed of seeds) {
      const world = generateWorld(seed)
      for (const kingdom of Object.values(world.kingdoms)) {
        const capital = world.locations[kingdom.capitalId]
        if (!capital) continue
        for (const road of roadsFrom(world, kingdom.capitalId)) {
          const to = world.locations[road.to]
          if (!to) continue
          expect(span(capital, to), `${capital.name} → ${to.name}`).toBeLessThan(120)
        }
      }
    }
  })
})

describe('мир от этого не рассыпался', () => {
  it('связен: из любого места можно дойти до любого', () => {
    for (const seed of seeds) {
      const world = generateWorld(seed)
      const all = Object.keys(world.locations)
      const first = all[0] as string
      expect(reachableFrom(world, first).size, `зерно ${seed}`).toBe(all.length)
    }
  })

  it('без тупиков и с кольцами', () => {
    for (const seed of seeds) {
      const world = generateWorld(seed)
      const places = Object.values(world.locations)
      for (const place of places) {
        expect(roadsFrom(world, place.id).length, `${place.name} отрезан`).toBeGreaterThan(0)
      }
      const edges = legs(world).length
      if (seed === 1) console.log(`дорог: ${edges} на ${places.length} мест`)
      // У дерева рёбер на одно меньше, чем узлов: нам нужны обходные пути.
      expect(edges, `зерно ${seed}`).toBeGreaterThan(places.length)
    }
  })

  it('дороги двусторонние и с одинаковой ценой', () => {
    const world = generateWorld(1)
    for (const from of Object.values(world.locations)) {
      for (const road of roadsFrom(world, from.id)) {
        const back = roadsFrom(world, road.to).find((one) => one.to === from.id)
        expect(back, `${from.name} → ${road.to} в одну сторону`).toBeDefined()
        expect(back?.hours).toBe(road.hours)
      }
    }
  })
})

describe('карта и дорога говорят одно', () => {
  it('место лежит там, где его рисуют', () => {
    const world = generateWorld(1)
    const points = layoutOf(world)
    for (const location of Object.values(world.locations)) {
      expect(points[location.id]).toEqual({ x: location.x, y: location.y })
    }
  })

  it('из одного зерна выходит одна и та же карта', () => {
    expect(layoutOf(generateWorld(7))).toEqual(layoutOf(generateWorld(7)))
  })
})

/** Во сколько раз земля и место замедляют этот отрезок. */
function slowOf(from: Location, to: Location): number {
  const travel = {
    plains: 1,
    steppe: 1.05,
    coast: 1.15,
    forest: 1.3,
    hills: 1.4,
    marsh: 1.7,
    mountains: 2,
  }
  const ground = (travel[from.terrain] + travel[to.terrain]) / 2
  const site = (one: Location) => (isSite(one.archetype) ? SITES[one.archetype].slow : 1)
  return ground * Math.max(site(from), site(to))
}

function correlation(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length
  const mx = xs.reduce((sum, one) => sum + one, 0) / n
  const my = ys.reduce((sum, one) => sum + one, 0) / n
  let cov = 0
  let vx = 0
  let vy = 0
  for (const [i, x] of xs.entries()) {
    const y = ys[i] ?? 0
    cov += (x - mx) * (y - my)
    vx += (x - mx) ** 2
    vy += (y - my) ** 2
  }
  return cov / Math.sqrt(vx * vy)
}

describe('час пути — это расстояние', () => {
  it('единица карты стоит столько, сколько сказано', () => {
    const world = generateWorld(1)
    const [first, second] = Object.values(world.locations)
    if (!first || !second) return
    const flat: Location = { ...first, terrain: 'plains', archetype: 'village', x: 0, y: 0 }
    const far: Location = {
      ...second,
      terrain: 'plains',
      archetype: 'village',
      x: UNITS_PER_HOUR * 10,
      y: 0,
    }
    expect(hoursBetweenPlaces(flat, far)).toBe(10)
  })
})
