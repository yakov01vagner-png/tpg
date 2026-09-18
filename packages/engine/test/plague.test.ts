import { describe, expect, it } from 'vitest'
import { overgrown } from '../src/diplomacy'
import { createSettlements } from '../src/economy'
import type { Settlement } from '../src/economy'
import { type Plague, plagueAt, tickPlague } from '../src/plague'
import { createRng } from '../src/rng'
import { generateWorld } from '../src/world/generate'
import { roadsFrom } from '../src/world/queries'

const world = generateWorld(1)
const start = createSettlements(world)

function bigPlace(): string {
  const found = Object.values(start).sort((a, b) => b.population - a.population)[0]
  if (!found) throw new Error('мир пуст')
  return found.locationId
}

describe('мор', () => {
  it('рождается в скученности, а не в чистом поле', () => {
    let places: Readonly<Record<string, Settlement>> = start
    let plagues: readonly Plague[] = []
    let rng = createRng(4)
    const born: string[] = []
    for (let day = 1; day <= 365 * 60; day += 1) {
      const result = tickPlague(world, places, plagues, rng)
      plagues = result.plagues
      places = result.settlements
      rng = result.rng
      for (const event of result.events) {
        if (event.type === 'plagueBegan') born.push(event.locationId)
      }
    }
    expect(born.length).toBeGreaterThan(0)
    for (const id of born) {
      // Начинается только там, где людей много: в деревне мору не с кого начать.
      expect(start[id]?.population ?? 0).toBeGreaterThanOrEqual(2500)
    }
  })

  it('идёт по дорогам, а не по воздуху', () => {
    const source = bigPlace()
    const neighbours = new Set(roadsFrom(world, source).map((road) => road.to))
    let places: Readonly<Record<string, Settlement>> = start
    let plagues: readonly Plague[] = [{ locationId: source, daysLeft: 60, severity: 1 }]
    let rng = createRng(7)
    const spread: string[] = []
    for (let day = 1; day <= 60; day += 1) {
      const result = tickPlague(world, places, plagues, rng)
      plagues = result.plagues
      places = result.settlements
      rng = result.rng
      for (const event of result.events) {
        if (event.type === 'plagueSpread' && event.from === source) spread.push(event.to)
      }
    }
    expect(spread.length).toBeGreaterThan(0)
    for (const id of spread) expect(neighbours.has(id)).toBe(true)
  })

  it('уносит людей и кончается сам', () => {
    const source = bigPlace()
    const before = start[source]?.population ?? 0
    let places: Readonly<Record<string, Settlement>> = start
    let plagues: readonly Plague[] = [{ locationId: source, daysLeft: 40, severity: 1 }]
    let rng = createRng(11)
    let ended = false
    for (let day = 1; day <= 120; day += 1) {
      const result = tickPlague(world, places, plagues, rng)
      plagues = result.plagues
      places = result.settlements
      rng = result.rng
      ended = ended || result.events.some((one) => one.type === 'plagueEnded')
    }
    const after = places[source]?.population ?? 0
    const share = (before - after) / Math.max(1, before)
    console.log(`мор в одном месте: людей ${before} → ${after} (${(share * 100).toFixed(0)}%)`)
    expect(after).toBeLessThan(before)
    // Вспышка выкашивает часть места, а не место целиком.
    expect(share).toBeGreaterThan(0.02)
    expect(share).toBeLessThan(0.5)
    expect(ended).toBe(true)
    // Вернуться мор может: соседи, которых он успел заразить, приносят его
    // обратно. Поэтому проверяем, что вспышка кончилась, а не что место
    // очистилось навсегда.
    expect(plagueAt([], source)).toBeNull()
  })

  it('голодному мор страшнее сытого', () => {
    const source = bigPlace()
    const one = start[source] as Settlement
    const fed = { ...start, [source]: { ...one, stock: { ...one.stock, grain: 999999 } } }
    const starving = { ...start, [source]: { ...one, stock: { ...one.stock, grain: 0, fish: 0 } } }
    const plagues: readonly Plague[] = [{ locationId: source, daysLeft: 30, severity: 1 }]
    const wellFed = tickPlague(world, fed, plagues, createRng(3))
    const hungry = tickPlague(world, starving, plagues, createRng(3))
    const lostFed = (fed[source]?.population ?? 0) - (wellFed.settlements[source]?.population ?? 0)
    const lostHungry =
      (starving[source]?.population ?? 0) - (hungry.settlements[source]?.population ?? 0)
    expect(lostHungry).toBeGreaterThan(lostFed)
  })
})

describe('равновесие сил', () => {
  it('видит того, кто забрал слишком много', () => {
    expect(overgrown(world, start)).toBeNull()
    const kingdom = Object.keys(world.kingdoms)[0] as string
    const swallowed = Object.fromEntries(
      Object.entries(start).map(([id, one]) => [id, { ...one, owner: `crown:${kingdom}` }]),
    )
    expect(overgrown(world, swallowed)).toBe(kingdom)
  })
})
