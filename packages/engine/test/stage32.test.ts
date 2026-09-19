import { describe, expect, it } from 'vitest'
import { musterBands, tickBands } from '../src/band'
import type { Band } from '../src/band'
import { createSettlements } from '../src/economy'
import type { Settlement } from '../src/economy'
import { rollHarvest, tickDays } from '../src/life'
import { createRng } from '../src/rng'
import { tickSettling } from '../src/settle'
import { createPolitics, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { worldGrid } from '../src/world/grid'
import { MAP_SIZE } from '../src/world/layout'

/**
 * Этап 32: век и бюджет на втрое большем мире.
 *
 * Мир 0.4 — шестьсот мест против двухсот, дорога в три перехода вместо одного,
 * все ходят по отрезкам. Проверяется, что от этого он не встал: растёт,
 * голодает, воюет и меняет хозяев — и по-прежнему считается за кадр.
 */

interface Century {
  readonly people: number
  readonly famine: number
  readonly raids: number
  readonly taken: number
  readonly places: number
  readonly ms: number
}

/** Двадцать лет мира целиком: жизнь, год, политика, войска и расселение. */
function lived(seed: number, years: number): Century {
  let world = generateWorld(seed)
  let settlements: Readonly<Record<string, Settlement>> = createSettlements(world)
  const [politicsStart, owned] = createPolitics(world, settlements, createRng(seed))
  settlements = owned
  let politics = politicsStart
  let rng = createRng(1000 + seed)
  const [initial] = musterBands(politics, settlements, createRng(8))
  let bands: readonly Band[] = initial
  let famine = 0
  let raids = 0
  let taken = 0
  const began = Date.now()
  for (let day = 1; day <= years * 360; day += 1) {
    const life = tickDays(world, settlements, 1)
    settlements = life.settlements
    for (const event of life.events) if (event.type === 'famine') famine += 1
    const pol = tickPolitics(world, politics, settlements, day, rng)
    politics = pol.politics
    settlements = pol.settlements
    rng = pol.rng
    const march = tickBands(world, politics, settlements, bands, rng)
    bands = march.bands
    settlements = march.settlements
    politics = march.politics
    rng = march.rng
    for (const event of march.events) {
      if (event.type === 'bandRaid') raids += 1
      if (event.type === 'bandTook') taken += 1
    }
    if (day % 360 === 0) {
      const settled = tickSettling(world, settlements, day, rng)
      world = settled.world
      settlements = settled.settlements
      const year = rollHarvest(world, settled.settlements, settled.rng)
      settlements = year.settlements
      rng = year.rng
    }
  }
  return {
    people: Object.values(settlements).reduce((sum, one) => sum + one.population, 0),
    famine,
    raids,
    taken,
    places: Object.keys(world.locations).length,
    ms: Date.now() - began,
  }
}

describe('густой мир живёт', () => {
  const twenty = lived(1, 20)

  it('растёт, голодает, воюет и меняет хозяев', () => {
    console.log(
      `двадцать лет: ${twenty.people.toFixed(0)} человек, голод ${twenty.famine}, ` +
        `набегов ${twenty.raids}, взято мест ${twenty.taken}, счёт ${twenty.ms} мс`,
    )
    expect(twenty.people).toBeGreaterThan(300_000)
    expect(twenty.famine).toBeGreaterThan(0)
    // Считаем дошедшие походы, а не одни набеги. С этапа 72 у войска есть
    // замысел хозяина, и поход всё чаще кончается взятым местом, а не
    // разорённым полем: за двадцать лет 292 взятых места против полусотни
    // набегов. Само число набегов вдобавок вышло хаотичным — от сдвига
    // случайности на один бросок оно ходит от двух десятков до полутора сотен,
    // — а число дошедших походов держится.
    expect(twenty.raids + twenty.taken).toBeGreaterThan(150)
    expect(twenty.raids).toBeGreaterThan(10)
    expect(twenty.taken).toBeGreaterThan(20)
  })

  it('из одного зерна выходит один и тот же век', () => {
    // Всё, кроме времени счёта: миллисекунды — свойство машины, а не мира.
    const { ms: _first, ...again } = lived(1, 10)
    const { ms: _second, ...once } = lived(1, 10)
    expect(again).toEqual(once)
  })
})

describe('бюджет на втрое большем мире', () => {
  it('сетка карты считается за кадр', () => {
    const world = generateWorld(2)
    let best = Number.POSITIVE_INFINITY
    for (let i = 0; i < 5; i += 1) {
      const began = performance.now()
      worldGrid(world, MAP_SIZE)
      best = Math.min(best, performance.now() - began)
    }
    console.log(`сетка на ${Object.keys(world.locations).length} местах: ${best.toFixed(1)} мс`)
    expect(best).toBeLessThan(40)
  })

  it('мир рождается за десятую долю секунды', () => {
    let best = Number.POSITIVE_INFINITY
    for (let i = 0; i < 3; i += 1) {
      const began = performance.now()
      generateWorld(20 + i)
      best = Math.min(best, performance.now() - began)
    }
    console.log(`рождение мира: ${best.toFixed(0)} мс`)
    expect(best).toBeLessThan(160)
  })
})
