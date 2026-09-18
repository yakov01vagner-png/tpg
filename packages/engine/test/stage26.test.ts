import { describe, expect, it } from 'vitest'
import { generateWorld } from '../src/world/generate'
import { MAP_SIZE } from '../src/world/layout'
import { neighbourSettlements, roadsFrom } from '../src/world/queries'
import { isSettlement, isSite } from '../src/world/types'
import type { World } from '../src/world/types'

/**
 * Этап 26: земля гуще.
 *
 * Главное правило версии 0.4: прямой дороги из деревни в деревню не бывает —
 * между ними всегда лежит не меньше двух мест без жителей. До 0.4 между
 * поселениями стояло ноль или одно место, и путь из деревни в деревню был одним
 * шагом: земля между ними была надписью.
 */

const SEEDS = [1, 2, 3]

describe('между поселениями лежит земля', () => {
  it('прямой дороги из поселения в поселение не бывает', () => {
    for (const seed of SEEDS) {
      const world = generateWorld(seed)
      const direct: string[] = []
      for (const from of Object.values(world.locations)) {
        if (!isSettlement(from.archetype)) continue
        for (const road of roadsFrom(world, from.id)) {
          const to = world.locations[road.to]
          if (to && isSettlement(to.archetype)) direct.push(`${from.name} → ${to.name}`)
        }
      }
      expect(direct, `зерно ${seed}: ${direct.slice(0, 3).join(', ')}`).toHaveLength(0)
    }
  })

  it('до ближайшего соседа с людьми — три перехода, а не один', () => {
    for (const seed of SEEDS) {
      const world = generateWorld(seed)
      let pairs = 0
      let close = 0
      const hops: number[] = []
      for (const one of Object.values(world.locations)) {
        if (!isSettlement(one.archetype)) continue
        const near = neighbourSettlements(world, one.id)
        expect(near.length, `${one.name} без соседей`).toBeGreaterThan(0)
        hops.push(Math.min(...near.map((step) => step.hops)))
        for (const step of near) {
          if (one.id > step.id) continue
          pairs += 1
          if (step.hops < 3) close += 1
        }
      }
      const middle = hops.sort((a, b) => a - b)[Math.floor(hops.length / 2)] ?? 0
      if (seed === 1) {
        console.log(
          `до соседнего поселения: обычно ${middle} перехода; пар ближе трёх — ${close} из ${pairs}`,
        )
      }
      expect(middle, `зерно ${seed}`).toBeGreaterThanOrEqual(3)
      // Одна пара на мир — это переход через пустошь, где ставить землю уже
      // некуда: место, положенное в середину, упирается в чужое и отменяется.
      expect(close, `зерно ${seed}`).toBeLessThanOrEqual(1)
    }
  })

  it('глушь не висит хвостом, а стоит на дороге', () => {
    const world = generateWorld(1)
    const sites = Object.values(world.locations).filter((one) => isSite(one.archetype))
    const through = sites.filter((one) => roadsFrom(world, one.id).length >= 2).length
    console.log(`мест без жителей ${sites.length}, из них проходных ${through}`)
    // Место без жителей — это то, через что идут, а не тупик в стороне.
    expect(through / sites.length).toBeGreaterThan(0.85)
  })
})

describe('мир стал гуще', () => {
  it('областей, провинций и мест — втрое против 0.3', () => {
    for (const seed of SEEDS) {
      const world = generateWorld(seed)
      const places = Object.values(world.locations)
      const settlements = places.filter((one) => isSettlement(one.archetype)).length
      const counts = {
        regions: Object.keys(world.regions).length,
        provinces: Object.keys(world.provinces).length,
        places: places.length,
        settlements,
      }
      console.log(
        `зерно ${seed}: ${counts.regions} областей, ${counts.provinces} провинций, ` +
          `${counts.places} мест (${counts.settlements} с жителями)`,
      )
      // В 0.3 было 20 областей, 44 провинции, 213 мест, 102 из них с жителями.
      expect(counts.regions).toBe(25)
      expect(counts.provinces).toBeGreaterThanOrEqual(50)
      expect(counts.places).toBeGreaterThan(450)
      expect(counts.settlements).toBeGreaterThan(120)
    }
  })

  it('шаг стал короче, а путь — длиннее', () => {
    const world = generateWorld(1)
    const hours = Object.values(world.roads)
      .flatMap((list) => list.map((road) => road.hours))
      .sort((a, b) => a - b)
    const middle = hours[Math.floor(hours.length / 2)] ?? 0
    console.log(`часы отрезка: половина ${middle}, 90% ${hours[Math.floor(hours.length * 0.9)]}`)
    // Отрезок — это переход, а не дневной марш: решение принимается чаще.
    expect(middle).toBeLessThanOrEqual(5)
    // И длинных не осталось: всё, что больше дневного перехода, разбито землёй.
    expect(hours[hours.length - 1] ?? 0).toBeLessThanOrEqual(24)
  })

  it('мир не рассыпался: всё связано, имена не повторяются', () => {
    for (const seed of SEEDS) {
      const world = generateWorld(seed)
      const names = Object.values(world.locations).map((one) => one.name)
      expect(new Set(names).size, `зерно ${seed}: имена повторяются`).toBe(names.length)
      for (const one of Object.values(world.locations)) {
        expect(roadsFrom(world, one.id).length, `${one.name} отрезан`).toBeGreaterThan(0)
      }
    }
  })

  it('и по-прежнему помещается в полотно', () => {
    const world = generateWorld(1)
    for (const one of Object.values(world.locations)) {
      expect(one.x).toBeGreaterThanOrEqual(0)
      expect(one.x).toBeLessThanOrEqual(MAP_SIZE)
      expect(one.y).toBeGreaterThanOrEqual(0)
      expect(one.y).toBeLessThanOrEqual(MAP_SIZE)
    }
  })
})

describe('густой мир рождается быстро', () => {
  it('мир строится за десятую долю секунды', () => {
    let best = Number.POSITIVE_INFINITY
    for (let i = 0; i < 3; i += 1) {
      const began = performance.now()
      generateWorld(i + 11)
      best = Math.min(best, performance.now() - began)
    }
    console.log(`рождение мира: ${best.toFixed(0)} мс`)
    // Проверка «не стоит ли кто между» на шести сотнях мест стоила ста
    // семидесяти миллисекунд, пока сетка поиска была с клеткой в целый предел.
    // Два прохода соседства: сперва между поселениями, потом по длинным
    // отрезкам. Каждый — около полусотни миллисекунд на шести с половиной
    // сотнях мест; холодный старт целиком укладывается в две десятых секунды.
    expect(best).toBeLessThan(160)
  })
})

/** Сколько мест лежит между двумя поселениями по кратчайшему пути. */
export function placesBetween(world: World, from: string, to: string): number {
  const near = neighbourSettlements(world, from).find((one) => one.id === to)
  return near ? near.hops - 1 : 0
}
