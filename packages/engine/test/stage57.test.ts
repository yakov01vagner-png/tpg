import { describe, expect, it } from 'vitest'
import { createSettlements } from '../src/economy'
import { STORE_DAYS } from '../src/economy'
import {
  IMPORT_PULL,
  LIFE,
  carryingCapacity,
  foodSecurity,
  rollHarvest,
  tickDays,
} from '../src/life'
import { createRng } from '../src/rng'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import type { LocationArchetype } from '../src/world/types'

/**
 * Этап 57: город кормится.
 *
 * Большое место живёт привозом, и это наконец видно числом: города и столицы
 * держат людей, обители и крепости не вымирают, а голод остаётся голодом.
 */

const world = generateWorld(1)

/** Сорок лет мира без игрока: те же такты, что и в игре, с хозяевами земли. */
function live(years: number) {
  let settlements = createPolitics(world, createSettlements(world), createRng(1))[1]
  let rng = createRng(1)
  let famines = 0
  let deaths = 0
  const sum = (kind: LocationArchetype) =>
    Object.values(settlements)
      .filter((one) => world.locations[one.locationId]?.archetype === kind)
      .reduce((acc, one) => acc + one.population, 0)
  const start = {
    village: sum('village'),
    town: sum('town'),
    city: sum('city'),
    capital: sum('capital'),
    port: sum('port'),
    mine: sum('mine'),
    fortress: sum('fortress'),
    monastery: sum('monastery'),
  }
  for (let year = 1; year <= years; year += 1) {
    const life = tickDays(world, settlements, 365, LIFE, (year - 1) * 365 + 1)
    settlements = life.settlements
    for (const event of life.events) {
      if (event.type !== 'famine') continue
      famines += 1
      deaths += event.deaths
    }
    const harvest = rollHarvest(world, settlements, rng)
    settlements = harvest.settlements
    rng = harvest.rng
  }
  return { settlements, start, sum, famines, deaths }
}

describe('Е1 и Е2: привоз и житницы', () => {
  it('город тянет обоз сильнее деревни, и держит запас на зиму', () => {
    expect(IMPORT_PULL.capital).toBeGreaterThan(IMPORT_PULL.city)
    expect(IMPORT_PULL.city).toBeGreaterThan(IMPORT_PULL.town)
    expect(IMPORT_PULL.town).toBeGreaterThan(IMPORT_PULL.village)
    expect(IMPORT_PULL.mine).toBeGreaterThan(IMPORT_PULL.village)
    // Житница: у города и столицы запас длиннее, чем у деревни.
    expect(STORE_DAYS.capital).toBeGreaterThan(STORE_DAYS.village)
    expect(STORE_DAYS.city).toBeGreaterThan(STORE_DAYS.town)
  })

  it('город не может быть больше, чем кормит его провинция', () => {
    for (const province of Object.values(world.provinces)) {
      const places = province.locationIds
        .map((id) => world.locations[id])
        .filter((one): one is NonNullable<typeof one> => one !== undefined)
      if (places.length === 0) continue
      const people = places.reduce((sum, one) => sum + one.population, 0)
      const capacity = places.reduce(
        (sum, one) => sum + carryingCapacity(world, one.id, undefined),
        0,
      )
      if (capacity <= 0) continue
      // С запасом на море и мельницы: предел считается по земле, а живут ещё и
      // рыбой, — но втрое больше своей земли провинция не кормит.
      expect(people / capacity, province.name).toBeLessThan(1.6)
    }
  })
})

describe('Е3 и Е4: век без усыхания', () => {
  it('за сорок лет города держат людей, а обители и крепости не вымирают', () => {
    const { start, sum, famines, deaths } = live(40)
    const change = (kind: LocationArchetype) =>
      Math.round((sum(kind) / Math.max(1, start[kind as keyof typeof start]) - 1) * 100)
    const rows = (
      ['village', 'town', 'city', 'capital', 'port', 'mine', 'fortress', 'monastery'] as const
    ).map((kind) => `${kind} ${change(kind)}%`)
    console.log(`за 40 лет: ${rows.join(', ')}; голодовок ${famines}, умерло ${deaths}`)
    // Города и столицы держатся: в пределах десятой доли.
    expect(Math.abs(change('city'))).toBeLessThanOrEqual(10)
    expect(Math.abs(change('capital'))).toBeLessThanOrEqual(10)
    // Крепости, рудники и обители живут не землёй — и не вымирают.
    expect(change('fortress')).toBeGreaterThan(-15)
    expect(change('mine')).toBeGreaterThan(-15)
    expect(change('monastery')).toBeGreaterThan(-10)
    // При этом мир не перестал голодать: голод остался голодом.
    expect(famines).toBeGreaterThan(0)
    expect(deaths).toBeGreaterThan(1000)
  })

  it('мир остаётся сытым, но не сытым до бессмысленности', () => {
    const { settlements } = live(20)
    const places = Object.values(settlements).filter((one) => one.population > 0)
    const fed = places.reduce((sum, one) => sum + foodSecurity(one), 0) / places.length
    console.log(`через 20 лет сытость мира ${fed.toFixed(2)} на ${places.length} местах`)
    // Половина с лишним: амбары у большинства мест неполные, и это правильно
    // — мир живёт на запасе, которого хватает до нового хлеба, а не вдвое.
    expect(fed).toBeGreaterThan(0.45)
    expect(fed).toBeLessThan(0.95)
  })
})
