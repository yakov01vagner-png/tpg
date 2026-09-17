import { describe, expect, it } from 'vitest'
import { createSettlements } from '../src/economy'
import { carryingCapacity, foodSecurity, tickDays } from '../src/life'
import { generateWorld } from '../src/world/generate'
import type { LocationArchetype } from '../src/world/types'

const world = generateWorld(1)
const start = createSettlements(world)

const totalPopulation = (
  settlements: Record<string, ReturnType<typeof createSettlements>[string]>,
) => Object.values(settlements).reduce((sum, settlement) => sum + settlement.population, 0)

const alive = (settlements: Record<string, ReturnType<typeof createSettlements>[string]>) =>
  Object.values(settlements).filter((settlement) => settlement.population > 0).length

function someplace(archetype: LocationArchetype): string {
  const found = Object.values(world.locations).find((l) => l.archetype === archetype)
  if (!found) throw new Error(`нет места вида «${archetype}»`)
  return found.id
}

describe('мир живёт сам', () => {
  it('пять лет без игрока не разваливают мир', () => {
    const began = performance.now()
    const after = tickDays(world, start, 365 * 5)
    const elapsed = performance.now() - began

    const before = totalPopulation(start)
    const now = totalPopulation(after.settlements)
    console.log(
      `за 5 лет: население ${before} → ${now}, живых мест ${alive(after.settlements)} из ${alive(start)}, ` +
        `событий ${after.events.length}, счёт занял ${elapsed.toFixed(0)} мс`,
    )

    // Мир не вымирает и не улетает в бесконечность.
    expect(now).toBeGreaterThan(before * 0.4)
    expect(now).toBeLessThan(before * 4)
    // И большинство мест остаётся на карте.
    expect(alive(after.settlements)).toBeGreaterThan(alive(start) * 0.6)
  })

  it('считает быстро: телефон не должен думать над сутками', () => {
    const began = performance.now()
    tickDays(world, start, 365)
    const elapsed = performance.now() - began
    console.log(`год мира: ${elapsed.toFixed(0)} мс на ${Object.keys(start).length} поселений`)
    expect(elapsed).toBeLessThan(2000)
  })

  it('из одного состояния даёт один и тот же результат', () => {
    expect(tickDays(world, start, 90).settlements).toEqual(tickDays(world, start, 90).settlements)
  })
})

describe('еда и люди', () => {
  it('город не прокормится своей землёй — он живёт привозом', () => {
    const capital = someplace('capital')
    const village = someplace('village')
    const capitalPopulation = start[capital]?.population ?? 0
    console.log(
      `столица: ${capitalPopulation} жителей, а земля кормит ${carryingCapacity(world, capital)}; ` +
        `деревня: ${start[village]?.population} и ${carryingCapacity(world, village)}`,
    )
    expect(carryingCapacity(world, capital)).toBeLessThan(capitalPopulation)
  })

  it('отрезанное от еды место пустеет', () => {
    const mine = someplace('mine')
    const settlement = start[mine]
    if (!settlement) return
    // Рудник без привоза: своей еды нет, запас кончился.
    const starving = {
      [mine]: { ...settlement, stock: { ...settlement.stock, grain: 0, fish: 0 } },
    }
    const after = tickDays(world, starving, 120)
    const left = after.settlements[mine]?.population ?? 0
    console.log(`рудник в одиночестве: ${settlement.population} → ${left}`)
    expect(left).toBeLessThan(settlement.population)
    expect(after.events.some((event) => event.type === 'famine')).toBe(true)
  })

  it('сытая деревня прирастает', () => {
    const village = someplace('village')
    const settlement = start[village]
    if (!settlement) return
    const after = tickDays(world, { [village]: settlement }, 365)
    const now = after.settlements[village]?.population ?? 0
    console.log(`деревня за год: ${settlement.population} → ${now}`)
    expect(now).toBeGreaterThanOrEqual(settlement.population)
  })

  it('рудник живёт привозом: один он чахнет, в мире — держится', () => {
    const mineId = someplace('mine')
    const mine = start[mineId]
    if (!mine) return

    const inWorld = tickDays(world, start, 300).settlements[mineId]?.population ?? 0
    const alone = tickDays(world, { [mineId]: mine }, 300).settlements[mineId]?.population ?? 0

    console.log(`рудник за 300 суток: в мире ${inWorld}, в одиночку ${alone}`)
    // Своей земли под рудником почти нет — без подвоза он усыхает до неё.
    expect(alone).toBeLessThan(mine.population * 0.7)
    // А в живом мире хлеб довозят, и посёлок стоит.
    expect(inWorld).toBeGreaterThan(alone * 1.5)
  })

  it('обеспеченность едой видна числом', () => {
    const village = start[someplace('village')]
    if (!village) return
    expect(foodSecurity(village)).toBeGreaterThan(0)
    expect(foodSecurity({ ...village, stock: { ...village.stock, grain: 0, fish: 0 } })).toBe(0)
  })
})
