import { describe, expect, it } from 'vitest'
import { musterBands, tickBands } from '../src/band'
import { createSettlements } from '../src/economy'
import type { Settlement } from '../src/economy'
import { PLAYER } from '../src/holding'
import { tickDays } from '../src/life'
import { createRng } from '../src/rng'
import { createPolitics, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { isSettlement } from '../src/world/types'

/**
 * Этап 31: разорённое отстраивают (долг версии 0.3).
 *
 * За век войны столицы, города и порты худели на пятую часть: набег уносил
 * людей, и никто их не возвращал. Теперь хозяин чинит своё, а уведённые не все
 * гибнут — часть уходит к соседям и возвращается, когда утихнет.
 */

const world = generateWorld(1)
const start = createSettlements(world)

/** Место с людьми и хозяином, которому есть что терять. */
function bigPlace(): string {
  const found = Object.values(start)
    .filter((one) => isSettlement(world.locations[one.locationId]?.archetype ?? 'village'))
    .sort((a, b) => b.population - a.population)[0]
  if (!found) throw new Error('мир пуст')
  return found.locationId
}

describe('хозяин отстраивает своё', () => {
  it('разорённое место с хозяином поднимается быстрее ничейного', () => {
    const id = bigPlace()
    const one = start[id] as Settlement
    const half = Math.round(one.population * 0.5)
    const owned: Record<string, Settlement> = {
      ...start,
      [id]: { ...one, population: half, owner: PLAYER },
    }
    const nobodys: Record<string, Settlement> = {
      ...start,
      [id]: { ...one, population: half, owner: null },
    }
    const years = 5 * 360
    const withLord = tickDays(world, owned, years).settlements[id]?.population ?? 0
    const alone = tickDays(world, nobodys, years).settlements[id]?.population ?? 0
    console.log(
      `за пять лет с половины: у хозяина ${withLord.toFixed(0)}, ничейное ${alone.toFixed(0)}`,
    )
    expect(withLord).toBeGreaterThan(alone)
    expect(withLord).toBeGreaterThan(half)
  })

  it('отстроенное не перерастает того, чем было', () => {
    const id = bigPlace()
    const one = start[id] as Settlement
    const full: Record<string, Settlement> = { ...start, [id]: { ...one, owner: PLAYER } }
    const after = tickDays(world, full, 20 * 360).settlements[id]?.population ?? 0
    // Ускорение — это возвращение своих, а не бесконечный рост: у места всё та
    // же земля (growthRoom).
    expect(after).toBeLessThan(one.population * 1.6)
  })
})

describe('уведённые не все гибнут', () => {
  it('часть уходит к соседям, и мир их не теряет', () => {
    let settlements: Readonly<Record<string, Settlement>> = createSettlements(world)
    const [politicsStart, owned] = createPolitics(world, settlements, createRng(1))
    settlements = owned
    let politics = politicsStart
    let rng = createRng(1001)
    const [initial] = musterBands(politics, settlements, createRng(8))
    let bands = initial
    let raided = 0
    let lost = 0
    const before = Object.values(settlements).reduce((sum, one) => sum + one.population, 0)
    for (let day = 1; day <= 3 * 360; day += 1) {
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
        if (event.type !== 'bandRaid') continue
        raided += 1
        lost += event.lost
      }
    }
    const after = Object.values(settlements).reduce((sum, one) => sum + one.population, 0)
    const gone = before - after
    console.log(`за три года: набегов ${raided}, уведено ${lost}, мир потерял ${gone}`)
    expect(raided).toBeGreaterThan(10)
    // Мир теряет меньше, чем уведено: часть народу осела у соседей.
    expect(gone).toBeLessThan(lost)
  })
})
