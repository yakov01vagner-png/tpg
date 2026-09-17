import { describe, expect, it } from 'vitest'
import { GROUP_IDS, type GroupId, type OrderId, startBattle } from '../src/battle'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { ITEMS_BY_ID } from '../src/content/equipment'
import { effectiveness, gearBonus, repairCost } from '../src/equipment'
import { partySize } from '../src/party'
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

function hero(money = 3000, strength = 6): GameState {
  const character = createCharacter({ name: 'Тест', money })
  return {
    ...createGame({ ...character, attributes: { ...character.attributes, strength } }, 1, world),
    locationId: someplace('capital'),
  }
}

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

describe('снаряжение', () => {
  it('покупается и надевается сразу', () => {
    const before = hero()
    const after = ok(applyCommand(before, { type: 'buyItem', itemId: 'mail' }))
    expect(after.character.equipment.armor?.id).toBe('mail')
    expect(after.character.money).toBeLessThan(before.character.money)
  })

  it('прежнее уходит за полцены', () => {
    let state = ok(applyCommand(hero(), { type: 'buyItem', itemId: 'gambeson' }))
    const before = state.character.money
    state = ok(applyCommand(state, { type: 'buyItem', itemId: 'mail' }))
    // Заплатил за кольчугу, но что-то вернули за стёганку.
    expect(state.character.money).toBeGreaterThan(before - ITEMS_BY_ID.mail!.price)
  })

  it('в деревне лат не купишь', () => {
    const village = { ...hero(), locationId: someplace('village') }
    const result = applyCommand(village, { type: 'buyItem', itemId: 'plate' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('unavailableHere')
  })

  it('вещь не по силам помогает хуже', () => {
    const strong = createCharacter({ name: 'Сильный' })
    const plate = ITEMS_BY_ID.plate
    if (!plate) return
    const mighty = { ...strong, attributes: { ...strong.attributes, strength: 9 } }
    const weak = { ...strong, attributes: { ...strong.attributes, strength: 3 } }
    console.log(
      `латы: при силе 9 годность ${effectiveness(mighty, plate, 100).toFixed(2)}, ` +
        `при силе 3 — ${effectiveness(weak, plate, 100).toFixed(2)}`,
    )
    expect(effectiveness(weak, plate, 100)).toBeLessThan(effectiveness(mighty, plate, 100))
  })

  it('изношенное защищает хуже', () => {
    const character = createCharacter({ name: 'Тест' })
    const worn = { ...character, equipment: { armor: { id: 'mail', condition: 30 } } }
    const fresh = { ...character, equipment: { armor: { id: 'mail', condition: 100 } } }
    expect(gearBonus(worn).defense).toBeLessThan(gearBonus(fresh).defense)
  })

  it('железо героя считается в бою', () => {
    const bare = hero()
    const armed = ok(
      applyCommand(ok(applyCommand(hero(), { type: 'buyItem', itemId: 'longSword' })), {
        type: 'buyItem',
        itemId: 'mail',
      }),
    )
    const enemy = { name: 'Разбойники', units: { militia: 30 }, morale: 65, fatigue: 0 }
    const party = { units: { spearman: 20 }, morale: 75, hungryDays: 0, gear: 0 }
    const orders = Object.fromEntries(GROUP_IDS.map((id) => [id, 'hold'])) as Record<
      GroupId,
      OrderId
    >

    const fight = (state: GameState) => {
      let current: GameState = { ...state, party, battle: startBattle(party, enemy, 'plains') }
      for (let round = 0; round < 12; round += 1) {
        if (current.battle?.outcome !== 'ongoing') break
        current = ok(applyCommand(current, { type: 'battleOrders', orders }))
      }
      return current
    }

    const withGear = fight(armed)
    const without = fight(bare)
    console.log(
      `уцелело: с железом героя ${partySize(withGear.party)}, без ${partySize(without.party)}`,
    )
    expect(partySize(withGear.party)).toBeGreaterThanOrEqual(partySize(without.party))
  })

  it('снашивается в бою и чинится за деньги', () => {
    let state = ok(applyCommand(hero(), { type: 'buyItem', itemId: 'mail' }))
    const party = { units: { spearman: 10 }, morale: 75, hungryDays: 0, gear: 0 }
    state = {
      ...state,
      party,
      battle: startBattle(
        party,
        { name: 'Разбойники', units: { militia: 8 }, morale: 60, fatigue: 0 },
        'plains',
      ),
    }
    const orders = Object.fromEntries(GROUP_IDS.map((id) => [id, 'hold'])) as Record<
      GroupId,
      OrderId
    >
    state = ok(applyCommand(state, { type: 'battleOrders', orders }))
    const worn = state.character.equipment.armor?.condition ?? 100
    expect(worn).toBeLessThan(100)

    const mail = ITEMS_BY_ID.mail
    if (!mail) return
    expect(repairCost(mail, worn)).toBeGreaterThan(0)
  })

  it('куётся из железа и инструментов, а не из воздуха', () => {
    const smith = hero()
    const skilled: GameState = {
      ...smith,
      character: {
        ...smith.character,
        skills: { ...smith.character.skills, engineering: { level: 30, xp: 0 } },
        inventory: { iron: 30, tools: 10 },
      },
    }
    const after = ok(applyCommand(skilled, { type: 'craftItem', itemId: 'mail' }))
    expect(after.character.equipment.armor?.id).toBe('mail')
    expect(after.character.inventory.iron).toBeLessThan(30)

    const unskilled = applyCommand(
      { ...skilled, character: { ...skilled.character, inventory: { iron: 30, tools: 10 } } },
      { type: 'craftItem', itemId: 'plate' },
    )
    expect(unskilled.ok).toBe(false)
  })

  it('конь везёт поклажу', () => {
    const afoot = hero()
    const mounted = ok(applyCommand(afoot, { type: 'buyItem', itemId: 'packHorse' }))
    const buyLots = { type: 'buy', good: 'grain', amount: 60 } as const
    expect(applyCommand(afoot, buyLots).ok).toBe(false)
    expect(applyCommand(mounted, buyLots).ok).toBe(true)
  })

  it('отряд снаряжается оружием из поклажи', () => {
    const state = hero()
    const armed: GameState = {
      ...state,
      party: { units: { militia: 10 }, morale: 70, hungryDays: 0, gear: 0 },
      character: { ...state.character, inventory: { weapons: 10 } },
    }
    const after = ok(applyCommand(armed, { type: 'outfitParty', weapons: 10 }))
    console.log(`снаряжение отряда: ${Math.round(after.party.gear * 100)}%`)
    expect(after.party.gear).toBeGreaterThan(0)
    expect(after.character.inventory.weapons ?? 0).toBe(0)
  })
})
