import { describe, expect, it } from 'vitest'
import { musterBands, tickBands } from '../src/band'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { LIFE, rollHarvest, tickDays } from '../src/life'
import { createRng } from '../src/rng'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { HARVEST_DAY, MINUTES_PER_DAY, seasonOf } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { iceBound, lanesFrom } from '../src/world/lanes'

/**
 * Этап 38: зима.
 *
 * Зима — не косметика, а другое состояние мира: море закрыто, войска стоят,
 * запас решает, кто доживёт до весны, а ночёвка в поле перестаёт быть кнопкой.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const harbour = (() => {
  for (const place of Object.values(world.locations)) {
    const lanes = lanesFrom(world, place.id)
    if (lanes.length > 0 && lanes[0]) return { id: place.id, lane: lanes[0] }
  }
  throw new Error('в мире нет гаваней')
})()

/** День года → состояние в этот день. */
function atDay(day: number, money = 5000): GameState {
  return {
    ...createGame(createCharacter({ name: 'Т', money }), 1, world),
    locationId: harbour.id,
    time: (day - 1) * MINUTES_PER_DAY + 8 * 60,
  }
}

describe('море встаёт', () => {
  it('зимой из гавани не выйти, а летом выйти', () => {
    expect(iceBound(300)).toBe(true)
    expect(iceBound(120)).toBe(false)
    const winter = applyCommand(atDay(300), {
      type: 'sail',
      toLocationId: harbour.lane.to,
      manner: 'hire',
    })
    expect(winter.ok).toBe(false)
    if (!winter.ok) {
      expect(winter.code).toBe('ice')
      expect(winter.message).toContain('Море встало')
    }
    const summer = applyCommand(atDay(120), {
      type: 'sail',
      toLocationId: harbour.lane.to,
      manner: 'hire',
    })
    expect(summer.ok).toBe(true)
  })

  it('зимой остров отрезан: до него нет ни дороги, ни пути', () => {
    const island = Object.values(world.provinces).find((one) => one.island)
    const islandPort = island?.locationIds.find((id) => world.locations[id]?.archetype === 'port')
    expect(islandPort).toBeDefined()
    if (!islandPort) return
    // Дороги на остров нет ни в какое время года, а морской путь зимой закрыт —
    // значит, зимой остров живёт сам по себе.
    const from = lanesFrom(world, islandPort)[0]
    expect(from).toBeDefined()
    if (!from) return
    const state: GameState = { ...atDay(310), locationId: islandPort }
    const away = applyCommand(state, { type: 'sail', toLocationId: from.to, manner: 'hire' })
    expect(away.ok).toBe(false)
  })
})

describe('войско зимой не воюет', () => {
  it('за зиму походов меньше, чем за лето', () => {
    const settlements = createSettlements(world)
    const [politics, places] = createPolitics(world, settlements, createRng(3))
    const [start] = musterBands(politics, places, createRng(11))

    const marchedOver = (fromDay: number, days: number): number => {
      let bands = start
      let current = places
      let sides = politics
      let rng = createRng(77)
      let marches = 0
      for (let day = 0; day < days; day += 1) {
        const step = tickBands(world, sides, current, bands, rng, fromDay + day)
        marches += step.bands.filter((band) => band.travel).length
        bands = step.bands
        current = step.settlements
        sides = step.politics
        rng = step.rng
      }
      return marches
    }
    const summer = marchedOver(100, 80)
    const winter = marchedOver(285, 80)
    console.log(`в пути за 80 суток: лето ${summer}, зима ${winter}`)
    expect(winter).toBeLessThan(summer / 2)
  })
})

describe('голод приходит к концу зимы', () => {
  it('за десять лет голодные случаи ложатся на конец зимы и весну, а не на осень', () => {
    let settlements = createSettlements(world)
    let rng = createRng(9)
    const bySeason: Record<string, number> = { spring: 0, summer: 0, autumn: 0, winter: 0 }
    let day = 1
    for (let step = 0; step < 365 * 10; step += 5) {
      const life = tickDays(world, settlements, 5, LIFE, day)
      settlements = life.settlements
      for (const event of life.events) {
        if (event.type !== 'famine') continue
        const season = seasonOf(day)
        bySeason[season] = (bySeason[season] ?? 0) + event.deaths
      }
      if ((day - 1) % 365 < HARVEST_DAY - 1 && (day + 4) % 365 >= HARVEST_DAY - 1) {
        const harvest = rollHarvest(world, settlements, rng)
        settlements = harvest.settlements
        rng = harvest.rng
      }
      day += 5
    }
    const total = Object.values(bySeason).reduce((sum, one) => sum + one, 0)
    console.log(
      `за 10 лет умерло от голода ${Math.round(total)}: ${Object.entries(bySeason)
        .map(([season, deaths]) => `${season} ${Math.round(deaths)}`)
        .join(', ')}`,
    )
    expect(total).toBeGreaterThan(0)
    // Осенью, сразу после жатвы, не голодает никто: амбары полны.
    expect(bySeason.autumn ?? 0).toBe(0)
    // А ложится это всё на ту пору, когда прошлогоднее кончилось, а нового нет.
    expect((bySeason.spring ?? 0) + (bySeason.winter ?? 0)).toBeGreaterThan(total * 0.7)
  })
})

describe('ночёвка в мороз', () => {
  const wild = (() => {
    const place = Object.values(world.locations).find((one) => one.population === 0)
    if (!place) throw new Error('в мире нет мест без жителей')
    return place.id
  })()

  const camped = (day: number, seed: number, survival = 0): GameState => {
    const base = createGame(
      createCharacter({ name: 'Т', skills: survival > 0 ? { survival } : {} }),
      1,
      world,
    )
    const state: GameState = {
      ...base,
      locationId: wild,
      rng: { state: seed * 613 },
      time: (day - 1) * MINUTES_PER_DAY + 20 * 60,
      character: { ...base.character, fatigue: 60 },
    }
    return ok(applyCommand(state, { type: 'camp' }))
  }

  it('зимой под небом отдыхают хуже, чем летом', () => {
    const summer = camped(120, 1)
    const winter = camped(300, 1)
    console.log(
      `усталость после ночёвки: лето ${summer.character.fatigue}, зима ${winter.character.fatigue}`,
    )
    expect(winter.character.fatigue).toBeGreaterThan(summer.character.fatigue)
  })

  it('мороз кусает неумелого чаще, чем бывалого', () => {
    let green = 0
    let seasoned = 0
    for (let seed = 1; seed <= 60; seed += 1) {
      if (camped(300, seed, 0).character.wound) green += 1
      if (camped(300, seed, 8).character.wound) seasoned += 1
    }
    console.log(`обморожений за 60 ночей: без выживания ${green}, с выживанием ${seasoned}`)
    expect(green).toBeGreaterThan(0)
    expect(seasoned).toBeLessThan(green)
  })
})
