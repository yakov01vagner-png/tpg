import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { LIFE, SEASON_FOOD, foodStock, tickDays } from '../src/life'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import {
  DAYS_PER_YEAR,
  HARVEST_DAY,
  MINUTES_PER_DAY,
  MONTHS,
  SEASON_LABELS,
  crossedDayOfYear,
  dayOfYear,
  daysToHarvest,
  formatDate,
  monthOf,
  seasonOf,
} from '../src/time'
import { generateWorld } from '../src/world/generate'
import { roadsFrom } from '../src/world/queries'

/**
 * Этап 37: четыре времени года.
 *
 * До 0.5 год был числом дней: земля родила каждый день одинаково, дорога стоила
 * одинаково в липне и в студне, а «урожай» был множителем, который катали раз в
 * год неизвестно когда. Теперь год — это год: он начинается весной, делится на
 * месяцы, кормит летом и не кормит зимой.
 */

const world = generateWorld(1)

describe('у года есть месяцы', () => {
  it('двенадцать месяцев складываются в год и начинаются с весны', () => {
    expect(MONTHS).toHaveLength(12)
    expect(MONTHS.reduce((sum, month) => sum + month.days, 0)).toBe(DAYS_PER_YEAR)
    expect(MONTHS[0]?.season).toBe('spring')
    expect(seasonOf(1)).toBe('spring')
    expect(formatDate(1)).toBe('1 березень')
    // Каждое время года занимает свою четверть, и ни одно не потерялось.
    const bySeason = new Map<string, number>()
    for (let day = 1; day <= DAYS_PER_YEAR; day += 1) {
      const season = seasonOf(day)
      bySeason.set(season, (bySeason.get(season) ?? 0) + 1)
    }
    expect([...bySeason.keys()].sort()).toEqual(Object.keys(SEASON_LABELS).sort())
    for (const days of bySeason.values()) {
      expect(days).toBeGreaterThan(80)
      expect(days).toBeLessThan(100)
    }
  })

  it('год повторяется: тот же день года в следующем году — тот же месяц', () => {
    for (const day of [1, 57, 184, 300, 365]) {
      expect(seasonOf(day)).toBe(seasonOf(day + DAYS_PER_YEAR))
      expect(monthOf(day).index).toBe(monthOf(day + DAYS_PER_YEAR).index)
      expect(dayOfYear(day + DAYS_PER_YEAR * 3)).toBe(dayOfYear(day))
    }
  })

  it('жатва в первый день осени, и до неё считают сутки', () => {
    expect(seasonOf(HARVEST_DAY)).toBe('autumn')
    expect(seasonOf(HARVEST_DAY - 1)).toBe('summer')
    expect(daysToHarvest(HARVEST_DAY - 10)).toBe(10)
    expect(daysToHarvest(HARVEST_DAY)).toBe(DAYS_PER_YEAR)
    // День жатвы нельзя проспать: переход считается по промежутку.
    expect(crossedDayOfYear(HARVEST_DAY - 5, HARVEST_DAY + 5, HARVEST_DAY)).toBe(true)
    expect(crossedDayOfYear(HARVEST_DAY + 1, HARVEST_DAY + 20, HARVEST_DAY)).toBe(false)
  })
})

describe('земля живёт годом', () => {
  it('зимой земля не родит, осенью даёт больше всего', () => {
    expect(SEASON_FOOD.winter).toBeLessThan(0.3)
    expect(SEASON_FOOD.autumn).toBeGreaterThan(SEASON_FOOD.summer)
    expect(SEASON_FOOD.summer).toBeGreaterThan(SEASON_FOOD.spring)
    // Средний по году — единица: мир кормится столько же, сколько кормился.
    let total = 0
    for (let day = 1; day <= DAYS_PER_YEAR; day += 1) total += SEASON_FOOD[seasonOf(day)]
    expect(total / DAYS_PER_YEAR).toBeGreaterThan(0.97)
    expect(total / DAYS_PER_YEAR).toBeLessThan(1.03)
  })

  it('амбар полон осенью и пуст весной, и год за годом это повторяется', () => {
    let settlements = createSettlements(world)
    let day = 1
    const level = () => {
      let stock = 0
      let eaten = 0
      for (const one of Object.values(settlements)) {
        stock += foodStock(one)
        eaten += one.population * LIFE.foodPerPerson
      }
      return stock / eaten
    }
    const walk = (days: number) => {
      settlements = tickDays(world, settlements, days, LIFE, day).settlements
      day += days
    }
    // Первый год: от весны до конца осени и обратно к весне.
    walk(90)
    const summer = level()
    walk(120)
    const autumn = level()
    walk(120)
    const spring = level()
    console.log(
      `в амбарах мира: лето ${summer.toFixed(0)} суток, осень ${autumn.toFixed(0)}, весна ${spring.toFixed(0)}`,
    )
    expect(autumn).toBeGreaterThan(spring)
    expect(autumn).toBeGreaterThan(summer)
    // И мир при этом не вымирает: зима — не мор.
    const people = Object.values(settlements).reduce((sum, one) => sum + one.population, 0)
    expect(people).toBeGreaterThan(300_000)
  })

  it('год объявляется на жатве, а не на Новый год', () => {
    const game = createGame(createCharacter({ name: 'Т' }), 1, world)
    const atDay = (day: number): GameState => ({
      ...game,
      time: (day - 1) * MINUTES_PER_DAY + 6 * 60,
    })
    // Мир идёт сутками: разом больше суток не проходит (`tick`).
    const walk = (from: GameState, days: number): GameState => {
      let current = from
      for (let day = 0; day < days; day += 1) {
        const step = applyCommand(current, { type: 'tick', minutes: MINUTES_PER_DAY })
        if (!step.ok) throw new Error(step.message)
        current = step.state
      }
      return current
    }
    // Перешагиваем жатву — год становится известен.
    const after = walk(atDay(HARVEST_DAY - 3), 6)
    const harvests = new Set(Object.values(after.settlements).map((one) => one.harvest))
    // Урожай стал разным по провинциям: год выдался.
    expect(harvests.size).toBeGreaterThan(1)

    // А в середине зимы ничего не объявляют.
    const still = walk(atDay(300), 6)
    expect(new Set(Object.values(still.settlements).map((one) => one.harvest)).size).toBe(1)
  })
})

describe('дорога знает время года', () => {
  it('осенью тот же переход дольше, чем летом', () => {
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    // Отрезок подлиннее: на двухчасовом переходе сезонная надбавка тонет в
    // округлении, и весна с летом выходят поровну.
    const long = Object.entries(world.roads).find(([, roads]) =>
      roads.some((one) => one.hours >= 4),
    )
    const road = long?.[1].find((one) => one.hours >= 4)
    expect(road).toBeDefined()
    if (!road || !long) return
    const game: GameState = { ...base, locationId: long[0] }
    const at = (day: number) => {
      const state: GameState = { ...game, time: (day - 1) * MINUTES_PER_DAY + 6 * 60 }
      const result = applyCommand(state, { type: 'travel', toLocationId: road.to })
      if (!result.ok) throw new Error(result.message)
      return result.state.journey?.hours ?? 0
    }
    const summer = at(120)
    const autumn = at(200)
    const winter = at(300)
    const spring = at(30)
    console.log(
      `переход в ${road.hours} ч: лето ${summer}, осень ${autumn}, зима ${winter}, весна ${spring}`,
    )
    expect(autumn).toBeGreaterThan(summer)
    expect(spring).toBeGreaterThan(summer)
    expect(winter).toBeGreaterThanOrEqual(summer)
    expect(autumn).toBeGreaterThanOrEqual(spring)
  })
})
