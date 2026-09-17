import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { tickDays } from '../src/life'
import type { Party } from '../src/party'
import { partySize } from '../src/party'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { NO_POLITICS, atWar, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

const world = generateWorld(1)
const start = createSettlements(world)
const capital = world.kingdoms.reEstiz?.capitalId ?? ''

const totalPopulation = (settlements: Record<string, (typeof start)[string]>) =>
  Object.values(settlements).reduce((sum, s) => sum + s.population, 0)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

describe('политика', () => {
  it('войны начинаются и кончаются сами', () => {
    const result = tickPolitics(world, NO_POLITICS, start, 900, createRng(3))
    const declared = result.events.filter((event) => event.type === 'warDeclared').length
    const peace = result.events.filter((event) => event.type === 'peace').length
    console.log(`за 900 суток: объявлено войн ${declared}, заключено миров ${peace}`)
    expect(declared).toBeGreaterThan(0)
    expect(peace).toBeGreaterThan(0)
    // Мир не превращается во всеобщую резню без конца.
    expect(result.politics.wars.length).toBeLessThan(Object.keys(world.kingdoms).length)
  })

  it('у каждой войны есть причина', () => {
    const result = tickPolitics(world, NO_POLITICS, start, 900, createRng(3))
    for (const event of result.events) {
      if (event.type === 'warDeclared') expect(event.war.reason.length).toBeGreaterThan(5)
    }
  })

  it('разорение уводит людей, выгребает хлеб и плодит разбой', () => {
    const result = tickPolitics(world, NO_POLITICS, start, 1200, createRng(11))
    const raids = result.events.filter((event) => event.type === 'raid')
    expect(raids.length).toBeGreaterThan(0)

    const raid = raids[0]
    if (!raid || raid.type !== 'raid') return
    const before = start[raid.locationId]
    const after = result.settlements[raid.locationId]
    console.log(
      `разорено ${world.locations[raid.locationId]?.name}: людей ${before?.population} → ${after?.population}, ` +
        `разбой ${before?.banditry} → ${after?.banditry}`,
    )
    expect(after?.banditry ?? 0).toBeGreaterThan(before?.banditry ?? 0)
  })
})

describe('разбой душит подвоз', () => {
  it('в неспокойной округе голодают сильнее', () => {
    // Тот же мир, но по дорогам страшно ездить: подвоз тощает, и первыми
    // это чувствуют те, кто своей еды не растит.
    const troubled: Record<string, (typeof start)[string]> = {}
    for (const [id, settlement] of Object.entries(start)) {
      troubled[id] = { ...settlement, banditry: 0.9 }
    }

    const calmAfter = tickDays(world, start, 400).settlements
    const troubledAfter = tickDays(world, troubled, 400).settlements

    const mines = Object.values(world.locations).filter((l) => l.archetype === 'mine')
    const minePop = (settlements: Record<string, (typeof start)[string]>) =>
      mines.reduce((sum, mine) => sum + (settlements[mine.id]?.population ?? 0), 0)

    console.log(
      `за 400 суток: всего людей ${totalPopulation(calmAfter)} против ${totalPopulation(troubledAfter)}, ` +
        `в рудниках ${minePop(calmAfter)} против ${minePop(troubledAfter)}`,
    )
    expect(totalPopulation(troubledAfter)).toBeLessThan(totalPopulation(calmAfter))
    expect(minePop(troubledAfter)).toBeLessThan(minePop(calmAfter))
  })
})

describe('дорога', () => {
  const traveller = (party: Party, banditry: number, seed: number): GameState => {
    const base = createGame(createCharacter({ name: 'Тест', money: 300 }), seed, world)
    const settlements: Record<string, (typeof start)[string]> = { ...base.settlements }
    for (const [id, settlement] of Object.entries(settlements)) {
      settlements[id] = { ...settlement, banditry }
    }
    return { ...base, settlements, party }
  }

  const firstRoad = (state: GameState) => {
    const road = state.world.roads[state.locationId]?.[0]
    if (!road) throw new Error('из стартовой деревни нет дорог')
    return road.to
  }

  it('в разбойной округе отряд нарывается на засаду', () => {
    let ambushed = false
    for (let seed = 1; seed <= 12 && !ambushed; seed += 1) {
      const state = traveller({ units: { militia: 8 }, morale: 70, hungryDays: 0 }, 0.9, seed)
      const after = ok(applyCommand(state, { type: 'travel', toLocationId: firstRoad(state) }))
      if (after.battle) ambushed = true
    }
    expect(ambushed).toBe(true)
  })

  it('на спокойных дорогах обычно тихо', () => {
    let ambushes = 0
    for (let seed = 1; seed <= 12; seed += 1) {
      const state = traveller({ units: { militia: 8 }, morale: 70, hungryDays: 0 }, 0, seed)
      const after = ok(applyCommand(state, { type: 'travel', toLocationId: firstRoad(state) }))
      if (after.battle) ambushes += 1
    }
    console.log(`из 12 переходов по спокойной дороге засад: ${ambushes}`)
    expect(ambushes).toBeLessThan(4)
  })

  it('одиночку не бьют, а обирают', () => {
    let robbed = false
    for (let seed = 1; seed <= 12 && !robbed; seed += 1) {
      const state = traveller({ units: {}, morale: 60, hungryDays: 0 }, 0.9, seed)
      const after = ok(applyCommand(state, { type: 'travel', toLocationId: firstRoad(state) }))
      if (after.character.money < state.character.money) {
        robbed = true
        expect(after.battle).toBe(null)
      }
    }
    expect(robbed).toBe(true)
  })
})

describe('служба', () => {
  const inCapital = (): GameState => ({
    ...createGame(createCharacter({ name: 'Тест', money: 500 }), 1, world),
    locationId: capital,
  })

  it('на службу берут на своей земле', () => {
    const state = inCapital()
    const after = ok(applyCommand(state, { type: 'takeService', kingdomId: 'reEstiz' }))
    expect(after.service).toBe('reEstiz')
    const foreign = applyCommand(state, { type: 'takeService', kingdomId: 'boharut' })
    expect(foreign.ok).toBe(false)
  })

  it('без войны воевать не с кем', () => {
    const served = ok(applyCommand(inCapital(), { type: 'takeService', kingdomId: 'reEstiz' }))
    const withParty = { ...served, party: { units: { militia: 8 }, morale: 70, hungryDays: 0 } }
    const result = applyCommand(withParty, { type: 'seekEnemy' })
    expect(result.ok).toBe(false)
  })

  it('на войне выход к врагу оборачивается боем', () => {
    const served = ok(applyCommand(inCapital(), { type: 'takeService', kingdomId: 'reEstiz' }))
    const atWarState: GameState = {
      ...served,
      party: { units: { spearman: 20, archer: 6 }, morale: 75, hungryDays: 0 },
      politics: {
        wars: [{ a: 'reEstiz', b: 'boharut', since: 1, reason: 'старые счёты' }],
        lastDay: 1,
      },
    }
    expect(atWar(atWarState.politics, 'reEstiz', 'boharut')).toBe(true)
    const after = ok(applyCommand(atWarState, { type: 'seekEnemy' }))
    expect(after.battle).not.toBe(null)
    expect(partySize(after.party)).toBe(26)
  })
})

describe('мир выдерживает войну', () => {
  it('десять лет войн не превращают мир в пустыню', () => {
    let settlements = start
    let politics = NO_POLITICS
    let rng = createRng(7)
    let day = 0
    const began = performance.now()

    for (let chunk = 0; chunk < 122; chunk += 1) {
      day += 30
      settlements = tickDays(world, settlements, 30).settlements
      const result = tickPolitics(world, politics, settlements, day, rng)
      settlements = result.settlements
      politics = result.politics
      rng = result.rng
    }

    const survivors = Object.values(settlements).filter((s) => s.population > 0).length
    console.log(
      `десять лет войн: население ${totalPopulation(start)} → ${totalPopulation(settlements)}, ` +
        `мест ${survivors} из ${Object.keys(start).length}, войн сейчас ${politics.wars.length}, ` +
        `счёт ${(performance.now() - began).toFixed(0)} мс`,
    )
    expect(totalPopulation(settlements)).toBeGreaterThan(totalPopulation(start) * 0.3)
    expect(survivors).toBeGreaterThan(Object.keys(start).length * 0.5)
  })
})
