import { describe, expect, it } from 'vitest'
import { musterBands, tickBands } from '../src/band'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { ORDERS } from '../src/content/orders'
import { createSettlements } from '../src/economy'
import type { Settlement } from '../src/economy'
import { LIFE, rollHarvest, tickDays } from '../src/life'
import { ordersAt } from '../src/order'
import { createRng } from '../src/rng'
import { deserialize, serialize } from '../src/save'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { DAYS_PER_YEAR, seasonOf } from '../src/time'
import { createPolitics, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { worldGrid } from '../src/world/grid'
import { iceBound } from '../src/world/lanes'
import { MAP_SIZE } from '../src/world/layout'
import type { World } from '../src/world/types'

/**
 * Этап 48: век и бюджет.
 *
 * Большой мир живёт без игрока теми же тактами, что и с ним, детерминированно
 * и в бюджете телефона. Полный век на трёх зёрнах — измерительный прогон
 * (`npm run century -- 100 1,2,3`); здесь — короткий срез теми же тактами.
 */

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function fastest(work: () => void, times: number): number {
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < times; i += 1) {
    const began = performance.now()
    work()
    best = Math.min(best, performance.now() - began)
  }
  return best
}

/** Годы мира без игрока: те же три такта, что и в игре. */
function live(world: World, seed: number, years: number) {
  let settlements: Readonly<Record<string, Settlement>> = createSettlements(world)
  const [start, owned] = createPolitics(world, settlements, createRng(seed))
  settlements = owned
  let politics = start
  const [initial, afterMuster] = musterBands(politics, settlements, createRng(seed + 7))
  let bands = initial
  let rng = afterMuster
  const bySeason: Record<string, number> = { spring: 0, summer: 0, autumn: 0, winter: 0 }
  const byShore = { shore: 0, inland: 0 }
  let iceDays = 0
  for (let day = 1; day <= years * DAYS_PER_YEAR; day += 1) {
    const life = tickDays(world, settlements, 1, LIFE, day)
    settlements = life.settlements
    for (const event of life.events) {
      if (event.type !== 'famine') continue
      bySeason[seasonOf(day)] = (bySeason[seasonOf(day)] ?? 0) + event.deaths
      if (world.locations[event.locationId]?.shore) byShore.shore += event.deaths
      else byShore.inland += event.deaths
    }
    if (iceBound(day)) iceDays += 1
    const turn = tickPolitics(world, politics, settlements, day, rng)
    politics = turn.politics
    settlements = turn.settlements
    rng = turn.rng
    const march = tickBands(world, politics, settlements, bands, rng)
    bands = march.bands
    settlements = march.settlements
    politics = march.politics
    rng = march.rng
    if (day % DAYS_PER_YEAR === 0) {
      const harvest = rollHarvest(world, settlements, rng)
      settlements = harvest.settlements
      rng = harvest.rng
    }
  }
  return { settlements, politics, bands, bySeason, byShore, iceDays }
}

describe('Б1: век на трёх зёрнах большого мира', () => {
  it('три зерна живут одинаково дважды: детерминизм совпал', () => {
    for (const seed of [1, 2, 3]) {
      const world = generateWorld(seed)
      const first = live(world, seed, 2)
      const second = live(world, seed, 2)
      expect(first.settlements).toEqual(second.settlements)
      expect(first.politics.lords).toEqual(second.politics.lords)
      expect(first.bands).toEqual(second.bands)
      const alive = Object.values(first.settlements).filter((one) => one.population > 0).length
      console.log(
        `зерно ${seed}: через два года живых мест ${alive} из ${Object.keys(first.settlements).length}`,
      )
      expect(alive).toBeGreaterThan(Object.keys(first.settlements).length * 0.9)
    }
  })
})

describe('Б2: море, сезоны и ордена живут без игрока', () => {
  it('числа десяти лет их видят', () => {
    const world = generateWorld(1)
    const lived = live(world, 1, 10)
    const total = Object.values(lived.bySeason).reduce((sum, one) => sum + one, 0)
    console.log(
      `голод по временам года за 10 лет: ${Object.entries(lived.bySeason)
        .map(([season, deaths]) => `${season} ${Math.round((deaths / Math.max(1, total)) * 100)}%`)
        .join(
          ', ',
        )}; берег ${lived.byShore.shore}, суша ${lived.byShore.inland}; море стояло ${lived.iceDays} суток`,
    )
    // Год виден: голодают перед жатвой, а не после неё.
    expect(lived.bySeason.spring ?? 0).toBeGreaterThan(lived.bySeason.autumn ?? 0)
    // Море виден: зима запирает его на треть года.
    expect(lived.iceDays).toBeGreaterThan(10 * 80)
    expect(lived.iceDays).toBeLessThan(10 * 100)
    // Берег живёт: голодает, но не вымирает.
    const shorePlaces = Object.values(lived.settlements).filter(
      (one) => world.locations[one.locationId]?.shore,
    )
    expect(shorePlaces.filter((one) => one.population > 0).length).toBeGreaterThan(
      shorePlaces.length * 0.9,
    )
    // Ордена стоят: у каждого через десять лет есть живое место.
    for (const order of ORDERS) {
      const seats = Object.values(lived.settlements).filter(
        (one) =>
          one.population > 0 &&
          ordersAt(world, one.locationId).some((candidate) => candidate.id === order.id),
      )
      expect(seats.length, order.name).toBeGreaterThan(0)
    }
  })
})

describe('Б3: бюджет', () => {
  // Пересдача до двух раз (и только у мер времени): при полном прогоне счёт
  // делят десятки процессов, и лучшая из двадцати попыток выходит на треть
  // дороже, чем та же работа в одиночку. Порог от этого не двигается — двигается
  // только терпение к чужой давке.
  it('сутки ≤ 6 мс, шаг часов ≤ 1 мс, сетка ≤ 45 мс, сейв ≤ 700 КБ', { retry: 2 }, () => {
    const world = generateWorld(1)
    let game = createGame(createCharacter({ name: 'Т' }), 1, world)
    const day = fastest(() => {
      game = ok(applyCommand(game, { type: 'tick', minutes: 24 * 60 }))
    }, 25)
    const hour = fastest(() => {
      game = ok(applyCommand(game, { type: 'tick', minutes: 60 }))
    }, 50)
    // Сетку мерим шесть раз, а не три: при полном прогоне (74 файла разом)
    // счёт делят десятки процессов, и лучшая из трёх попыток выходила на 48 мс
    // там, где одна и та же работа в одиночку стоит 28. Мерить надо цену
    // работы, а не давку в очереди за счётом.
    const grid = fastest(() => worldGrid(world, MAP_SIZE), 6)
    const raw = serialize(game)
    const parse = fastest(() => deserialize(raw), 5)
    console.log(
      `сутки ${day.toFixed(2)} мс, час ${hour.toFixed(2)} мс, сетка ${grid.toFixed(0)} мс, сейв ${(raw.length / 1024).toFixed(0)} КБ, разбор ${parse.toFixed(1)} мс`,
    )
    expect(day).toBeLessThan(6)
    expect(hour).toBeLessThan(1)
    expect(grid).toBeLessThan(45)
    expect(raw.length).toBeLessThan(700 * 1024)
    // Круг сериализации без потерь: маска моря ужата отрезками и развёрнута обратно.
    const back = deserialize(raw)
    expect(back.ok && JSON.stringify(back.state) === JSON.stringify(game)).toBe(true)
  })
})
