import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { TROOPS } from '../src/content/troops'
import { dailyFood, dailyWages, partyCapacity, partySize, partyStrength } from '../src/party'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { generateWorld } from '../src/world/generate'
import type { LocationArchetype } from '../src/world/types'

const world = generateWorld(1)

function someplace(archetype: LocationArchetype): string {
  const found = Object.values(world.locations).find((l) => l.archetype === archetype)
  if (!found) throw new Error(`нет места вида «${archetype}»`)
  return found.id
}

function gameAt(locationId: string, money = 1000): GameState {
  return { ...createGame(createCharacter({ name: 'Тест', money }), 1, world), locationId }
}

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

describe('найм', () => {
  it('берёт деньги, убавляет рекрутов и пополняет отряд', () => {
    const before = gameAt(someplace('capital'))
    const after = ok(applyCommand(before, { type: 'hire', troop: 'militia', count: 5 }))

    expect(partySize(after.party)).toBe(5)
    expect(after.character.money).toBe(before.character.money - TROOPS.militia.hireCost * 5)
    const recruitsBefore = before.settlements[before.locationId]?.recruits ?? 0
    expect(after.settlements[after.locationId]?.recruits).toBe(recruitsBefore - 5)
  })

  it('людей в поселении конечное число', () => {
    const villageId = someplace('village')
    const state = gameAt(villageId, 100_000)
    const pool = state.settlements[villageId]?.recruits ?? 0
    console.log(`в деревне (${state.settlements[villageId]?.population} чел.) готовы идти ${pool}`)
    const result = applyCommand(state, { type: 'hire', troop: 'militia', count: pool + 1 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('noRecruits')
  })

  it('латника в деревне не найдёшь', () => {
    const result = applyCommand(gameAt(someplace('village')), {
      type: 'hire',
      troop: 'manAtArms',
      count: 1,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('unavailableHere')
  })

  it('распустить можно только тех, кто есть', () => {
    const state = ok(
      applyCommand(gameAt(someplace('capital')), { type: 'hire', troop: 'militia', count: 3 }),
    )
    expect(applyCommand(state, { type: 'disband', troop: 'militia', count: 4 }).ok).toBe(false)
    const after = ok(applyCommand(state, { type: 'disband', troop: 'militia', count: 2 }))
    expect(partySize(after.party)).toBe(1)
  })
})

describe('содержание отряда', () => {
  const withParty = (count: number, money = 1000) => {
    const state = gameAt(someplace('capital'), money)
    return ok(applyCommand(state, { type: 'hire', troop: 'militia', count }))
  }

  it('за сутки уходит жалованье', () => {
    const before = withParty(6)
    const after = ok(applyCommand(before, { type: 'sleep' }))
    const spent = before.character.money - after.character.money
    expect(spent).toBeGreaterThanOrEqual(dailyWages(before.party))
  })

  it('отряд ест из поклажи', () => {
    const hired = withParty(6)
    const fed = ok(applyCommand(hired, { type: 'buy', good: 'grain', amount: 30 }))
    const after = ok(applyCommand(fed, { type: 'sleep' }))
    expect(after.character.inventory.grain ?? 0).toBeLessThan(fed.character.inventory.grain ?? 0)
    expect(dailyFood(hired.party)).toBeGreaterThan(0)
  })

  it('без денег и еды дух падает, а люди расходятся', () => {
    let state = withParty(10, 130)
    const started = partySize(state.party)
    for (let day = 0; day < 12; day += 1) state = ok(applyCommand(state, { type: 'sleep' }))
    console.log(
      `нищий отряд за 12 суток: ${started} → ${partySize(state.party)}, дух ${state.party.morale}`,
    )
    expect(state.party.morale).toBeLessThan(60)
    expect(partySize(state.party)).toBeLessThan(started)
  })

  it('люди несут поклажу: с отрядом влезает больше', () => {
    const alone = gameAt(someplace('capital'))
    const withMen = withParty(5)
    expect(partyCapacity(withMen.character, withMen.party)).toBeGreaterThan(
      partyCapacity(alone.character, alone.party),
    )
  })

  it('сила отряда растёт с выучкой, а не только с числом', () => {
    const rabble = { units: { militia: 10 }, morale: 60, hungryDays: 0 }
    const veterans = { units: { manAtArms: 10 }, morale: 60, hungryDays: 0 }
    expect(partyStrength(veterans)).toBeGreaterThan(partyStrength(rabble) * 2)
  })

  it('прогон: сколько десяток ополченцев проедает при полном довольствии', () => {
    let state = withParty(10, 1000)
    state = ok(applyCommand(state, { type: 'buy', good: 'grain', amount: 60 }))
    const start = state.character.money
    let days = 0
    while (state.character.money > 0 && partySize(state.party) === 10 && days < 300) {
      state = ok(applyCommand(state, { type: 'sleep' }))
      days += 1
    }
    console.log(
      `десять ополченцев: ${start} монет и 60 мер зерна кончились за ${days} суток простоя`,
    )
    expect(days).toBeGreaterThan(3)
    expect(days).toBeLessThan(300)
  })

  it('еда кончается раньше денег: голод разваливает отряд быстрее безденежья', () => {
    // Денег вдоволь, еды нет вовсе.
    let rich = withParty(10, 5000)
    let days = 0
    while (partySize(rich.party) === 10 && days < 60) {
      rich = ok(applyCommand(rich, { type: 'sleep' }))
      days += 1
    }
    console.log(`сытых денег мало: без еды отряд начал расходиться на ${days}-е сутки`)
    expect(days).toBeLessThan(10)
    expect(rich.character.money).toBeGreaterThan(1000)
  })
})
