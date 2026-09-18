import { describe, expect, it } from 'vitest'
import { musterBands, tickBands } from '../src/band'
import type { Band } from '../src/band'
import { createSettlements } from '../src/economy'
import type { Settlement } from '../src/economy'
import { LIFE, carryingCapacity, foodStock, rollHarvest, tickDays } from '../src/life'
import { createRng } from '../src/rng'
import { tickSettling } from '../src/settle'
import { createPolitics, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { roadsFrom } from '../src/world/queries'
import { FRONTIER, isSettlement } from '../src/world/types'
import type { World } from '../src/world/types'

/**
 * Этап 24: мир по-прежнему живёт.
 *
 * Здесь проверяется не отдельное правило, а то, что мир версии 0.3 — вдвое
 * больший, с провинциями-землёй и пограничьем — остаётся живым: растёт, когда
 * его не трогают, голодает в недород и ходит по земле, а не по воздуху.
 */

const YEAR = 360

/** Сколько людей живёт в мире против того, сколько кормит его земля. */
function landLoad(world: World, settlements: Readonly<Record<string, Settlement>>): number {
  let people = 0
  let land = 0
  for (const [id, settlement] of Object.entries(settlements)) {
    people += settlement.population
    land += carryingCapacity(world, id, settlement)
  }
  return people / land
}

/** Мир, проживший годы сам по себе: без войн, но с расселением и годами. */
function lived(years: number, seed = 1) {
  let world = generateWorld(seed)
  let settlements: Readonly<Record<string, Settlement>> = createSettlements(world)
  let rng = createRng(4000 + seed)
  let famines = 0
  let deaths = 0
  for (let year = 1; year <= years; year += 1) {
    const life = tickDays(world, settlements, YEAR)
    settlements = life.settlements
    for (const event of life.events) {
      if (event.type !== 'famine') continue
      famines += 1
      deaths += event.deaths
    }
    const settled = tickSettling(world, settlements, year * YEAR, rng)
    world = settled.world
    settlements = settled.settlements
    const harvest = rollHarvest(settled.world, settled.settlements, settled.rng)
    settlements = harvest.settlements
    rng = harvest.rng
  }
  return { world, settlements, famines, deaths }
}

describe('скелет мира и ёмкость земли', () => {
  it('мир заводится с запасом: людей меньше, чем кормит земля', () => {
    for (const seed of [1, 2, 3]) {
      const world = generateWorld(seed)
      const load = landLoad(world, createSettlements(world))
      console.log(`зерно ${seed}: людей ${(load * 100).toFixed(0)}% от того, что кормит земля`)
      // Выше запаса роста (GROWTH_HEADROOM) мир не может расти вовсе: земля
      // устаёт, урожай падает, и всякий голодный год становится ступенькой вниз
      // без возврата. Так версия 0.2 и теряла рудники с крепостями за век.
      expect(load).toBeLessThan(0.85)
      // Ниже трёх четвертей мир становится сытым до бессмысленности: ни голода,
      // ни разбоя, ни запустевших мест.
      expect(load).toBeGreaterThan(0.7)
    }
  })

  it('за век рудники и крепости не тают', () => {
    const world = generateWorld(1)
    const start = createSettlements(world)
    const fed = Object.values(world.locations)
      .filter((one) => one.archetype === 'mine' || one.archetype === 'fortress')
      .map((one) => one.id)
    const before = fed.reduce((sum, id) => sum + (start[id]?.population ?? 0), 0)
    const after = lived(20).settlements
    const now = fed.reduce((sum, id) => sum + (after[id]?.population ?? 0), 0)
    console.log(`рудники и крепости за 20 лет: ${before} → ${now.toFixed(0)}`)
    // Место, живущее привозом, возвращает себе своё: его потолок роста не ниже
    // того числа, с каким оно было основано.
    expect(now).toBeGreaterThan(before * 0.95)
  })

  it('хлеб не лежит вечно: амбары не растут без предела', () => {
    const { settlements } = lived(20)
    let stock = 0
    let eaten = 0
    for (const one of Object.values(settlements)) {
      stock += foodStock(one)
      eaten += one.population * LIFE.foodPerPerson
    }
    const days = stock / eaten
    console.log(`во всех амбарах мира ${days.toFixed(0)} суток еды`)
    // Пока хлеб не портился, к восьмидесятому году в амбарах лежало на две с
    // половиной тысячи суток вперёд — и мир не знал голода вовсе: холодное лето
    // просто съедало часть кучи.
    expect(days).toBeLessThan(60)
  })
})

describe('год на год не приходится', () => {
  const world = generateWorld(1)
  const start = createSettlements(world)

  it('недород берёт провинцию целиком', () => {
    const rolled = rollHarvest(world, start, createRng(7)).settlements
    for (const province of Object.values(world.provinces)) {
      const inside = province.locationIds
        .map((id) => rolled[id]?.harvest)
        .filter((value): value is number => value !== undefined)
      if (inside.length < 2) continue
      expect(new Set(inside).size).toBe(1)
    }
  })

  it('бывают годы, когда не задалось у всех сразу', () => {
    let rng = createRng(11)
    let settlements = start
    const means: number[] = []
    for (let year = 0; year < 200; year += 1) {
      const rolled = rollHarvest(world, settlements, rng)
      settlements = rolled.settlements
      rng = rolled.rng
      const all = Object.values(settlements).map((one) => one.harvest)
      means.push(all.reduce((sum, one) => sum + one, 0) / all.length)
    }
    const cold = means.filter((mean) => mean < 0.8).length
    const grey = means.filter((mean) => mean < 0.95).length
    console.log(`за 200 лет: голодных годов ${cold}, тощих ${grey}`)
    expect(cold).toBeGreaterThan(1)
    expect(cold).toBeLessThan(20)
    expect(grey).toBeGreaterThan(cold)
  })

  it('недород доводит до голода, обычный год — нет', () => {
    const settled = lived(20).settlements
    const under = (harvest: number) => {
      const places: Record<string, Settlement> = {}
      for (const [id, one] of Object.entries(settled)) places[id] = { ...one, harvest }
      const result = tickDays(generateWorld(1), places, YEAR)
      const famine = result.events.filter((event) => event.type === 'famine')
      return famine.reduce((sum, event) => sum + (event.type === 'famine' ? event.deaths : 0), 0)
    }
    const good = under(1.05)
    const bad = under(0.7)
    console.log(`умерло за год: при хорошем урожае ${good}, при недороде ${bad}`)
    expect(bad).toBeGreaterThan(good * 5)
    expect(bad).toBeGreaterThan(1000)
  })

  it('за век мир голодает, но не вымирает', () => {
    const { famines, deaths, settlements } = lived(100)
    const people = Object.values(settlements).reduce((sum, one) => sum + one.population, 0)
    console.log(
      `за век: голод в ${famines} случаях, умерло ${deaths}, к концу ${people.toFixed(0)}`,
    )
    expect(famines).toBeGreaterThan(0)
    // Голод — явление, а не погода: он не съедает мир, который его переживает.
    expect(people).toBeGreaterThan(300_000)
  })
})

describe('дружины ходят по земле', () => {
  it('войско не проходит гору насквозь: шаг всегда по дороге', () => {
    const world = generateWorld(1)
    let settlements: Readonly<Record<string, Settlement>> = createSettlements(world)
    const [politicsStart, owned] = createPolitics(world, settlements, createRng(1))
    settlements = owned
    let politics = politicsStart
    let rng = createRng(1001)
    const [initial] = musterBands(politics, settlements, createRng(8))
    let bands: readonly Band[] = initial
    let steps = 0
    let onSites = 0
    let inFrontier = 0
    for (let day = 1; day <= 6 * YEAR; day += 1) {
      const turn = tickPolitics(world, politics, settlements, day, rng)
      politics = turn.politics
      settlements = turn.settlements
      rng = turn.rng
      const march = tickBands(world, politics, settlements, bands, rng)
      bands = march.bands
      settlements = march.settlements
      politics = march.politics
      rng = march.rng
      for (const band of bands) {
        if (!band.travel) continue
        steps += 1
        const next = band.travel.toLocationId
        // Ход идёт только по отрезку дороги. Пограничье потому и держит
        // проходы: чтобы попасть в чужую корону, надо пройти марку.
        expect(
          roadsFrom(world, band.locationId).some((road) => road.to === next),
          `дружина ${band.id} шагнула из ${band.locationId} в ${next} без дороги`,
        ).toBe(true)
        const location = world.locations[next]
        if (location && !isSettlement(location.archetype)) onSites += 1
        const province = location ? world.provinces[location.provinceId] : undefined
        const region = province ? world.regions[province.regionId] : undefined
        if (region?.kingdomId === FRONTIER) inFrontier += 1
      }
    }
    console.log(
      `за шесть лет: ${steps} переходов, из них через места без жителей ${onSites}, ` +
        `через пограничье ${inFrontier}`,
    )
    expect(steps).toBeGreaterThan(100)
    expect(onSites).toBeGreaterThan(0)
    expect(inFrontier).toBeGreaterThan(0)
  })
})

describe('век воспроизводится', () => {
  it('из одного зерна выходит один и тот же мир', () => {
    const first = lived(10)
    const second = lived(10)
    expect(second.settlements).toEqual(first.settlements)
    expect(second.famines).toBe(first.famines)
  })
})
