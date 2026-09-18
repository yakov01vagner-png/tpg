import { describe, expect, it } from 'vitest'
import { ARMY_PACE, legHoursFor, pointBetween, routeTo } from '../src/journey'
import { generateWorld } from '../src/world/generate'
import { roadsFrom } from '../src/world/queries'
import { isSettlement } from '../src/world/types'

/**
 * Этап 30: карта как дорога.
 *
 * Дальнее место — это маршрут из отрезков, а не одно нажатие: видно, через что
 * пойдёшь и сколько это стоит. И видно, где кто идёт: положение между двумя
 * точками считается тем же правилом для героя, войска и обоза.
 */

const world = generateWorld(1)
const capital = world.kingdoms.reEstiz?.capitalId ?? ''
const start = Object.values(world.locations).find(
  (one) => isSettlement(one.archetype) && one.id !== capital,
)

describe('путь до дальнего места', () => {
  it('складывается из отрезков и считает их часы', () => {
    if (!start) throw new Error('мир пуст')
    const route = routeTo(world, start.id, capital)
    expect(route).not.toBeNull()
    if (!route) return
    expect(route.steps[route.steps.length - 1]).toBe(capital)
    // Каждый шаг — сосед предыдущего: маршрут идёт по дорогам, а не по воздуху.
    let previous = start.id
    let hours = 0
    for (const step of route.steps) {
      const road = roadsFrom(world, previous).find((one) => one.to === step)
      expect(road, `${previous} → ${step} не дорога`).toBeDefined()
      hours += road?.hours ?? 0
      previous = step
    }
    console.log(`от ${start.name} до столицы: ${route.steps.length} переходов, ${route.hours} ч`)
    expect(route.hours).toBe(hours)
  })

  it('войску тот же путь обходится дороже', () => {
    if (!start) throw new Error('мир пуст')
    const man = routeTo(world, start.id, capital)
    const host = routeTo(world, start.id, capital, ARMY_PACE)
    expect(host?.hours ?? 0).toBeGreaterThan(man?.hours ?? 0)
  })

  it('до соседа — один переход, до себя — ни одного', () => {
    if (!start) throw new Error('мир пуст')
    const road = roadsFrom(world, start.id)[0]
    if (!road) throw new Error('дорог нет')
    expect(routeTo(world, start.id, road.to)?.steps).toEqual([road.to])
    expect(routeTo(world, start.id, start.id)?.steps).toEqual([])
  })

  it('в никуда пути нет', () => {
    if (!start) throw new Error('мир пуст')
    expect(routeTo(world, start.id, 'нет такого места')).toBeNull()
  })

  it('короткий путь и правда короткий: через соседа не длиннее, чем напрямую', () => {
    if (!start) throw new Error('мир пуст')
    const direct = routeTo(world, start.id, capital)?.hours ?? 0
    const road = roadsFrom(world, start.id)[0]
    if (!road) return
    const detour = (routeTo(world, road.to, capital)?.hours ?? 0) + road.hours
    expect(direct).toBeLessThanOrEqual(detour)
  })
})

describe('кто где идёт', () => {
  it('положение между местами считается долей пути', () => {
    if (!start) throw new Error('мир пуст')
    const road = roadsFrom(world, start.id)[0]
    if (!road) throw new Error('дорог нет')
    const to = world.locations[road.to]
    if (!to) return
    expect(pointBetween(world, start.id, road.to, 0)).toEqual({ x: start.x, y: start.y })
    expect(pointBetween(world, start.id, road.to, 1)).toEqual({ x: to.x, y: to.y })
    const middle = pointBetween(world, start.id, road.to, 0.5)
    expect(middle?.x).toBe(Math.round((start.x + to.x) / 2))
    // Доля вне отрезка не выносит метку за его концы.
    expect(pointBetween(world, start.id, road.to, 2)).toEqual({ x: to.x, y: to.y })
  })

  it('часы войска на отрезке — то же правило, что у карты', () => {
    expect(legHoursFor(6, ARMY_PACE)).toBe(8)
  })
})
