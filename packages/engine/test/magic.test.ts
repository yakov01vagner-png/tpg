import { describe, expect, it } from 'vitest'
import {
  GROUP_IDS,
  type GroupId,
  type OrderId,
  formUp,
  startBattle,
  unitsSize,
} from '../src/battle'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import type { Party } from '../src/party'
import { partySize } from '../src/party'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { generateWorld } from '../src/world/generate'

const world = generateWorld(1)
const capital = world.kingdoms.reEstiz?.capitalId ?? ''

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const party = (units: Party['units']): Party => ({ units, morale: 75, hungryDays: 0, gear: 0 })

function battle(units: Party['units'], enemy = 40): GameState {
  const own = party(units)
  const base = createGame(createCharacter({ name: 'Тест', money: 500 }), 1, world)
  return {
    ...base,
    locationId: capital,
    party: own,
    battle: startBattle(
      own,
      { name: 'Разбойники', units: { militia: enemy }, morale: 70, fatigue: 0 },
      'plains',
    ),
  }
}

const orders = (main: OrderId, mages: OrderId): Record<GroupId, OrderId> =>
  Object.fromEntries(GROUP_IDS.map((id) => [id, id === 'mages' ? mages : main])) as Record<
    GroupId,
    OrderId
  >

function fight(state: GameState, main: OrderId, spell: OrderId, rounds = 3): GameState {
  let current = state
  for (let round = 0; round < rounds; round += 1) {
    if (current.battle?.outcome !== 'ongoing') break
    current = ok(applyCommand(current, { type: 'battleOrders', orders: orders(main, spell) }))
  }
  return current
}

describe('маги в бою', () => {
  it('становятся отдельным кругом, а не в строй', () => {
    const groups = formUp(party({ spearman: 10, mage: 3 }))
    expect(unitsSize(groups.mages)).toBe(3)
    expect(unitsSize(groups.vanguard)).toBe(8)
  })

  it('огонь выкашивает больше, чем те же люди с копьями', () => {
    const withMages = fight(battle({ spearman: 20, mage: 4 }), 'hold', 'fireball')
    const without = fight(battle({ spearman: 24 }), 'hold', 'hold')
    const killed = (state: GameState) => 40 - unitsSize(state.battle?.enemy.units ?? {})
    console.log(`за три раунда положили: с магами ${killed(withMages)}, без ${killed(without)}`)
    expect(killed(withMages)).toBeGreaterThan(killed(without))
  })

  it('порча ломает дух быстрее железа', () => {
    const cursed = fight(battle({ spearman: 20, mage: 4 }), 'hold', 'curse')
    const plain = fight(battle({ spearman: 24 }), 'hold', 'hold')
    console.log(
      `дух врага после трёх раундов: под порчей ${cursed.battle?.enemy.morale}, без ${plain.battle?.enemy.morale}`,
    )
    expect(cursed.battle?.enemy.morale ?? 100).toBeLessThan(plain.battle?.enemy.morale ?? 0)
  })

  it('защита магов бережёт своих', () => {
    const warded = fight(battle({ spearman: 20, mage: 4 }), 'hold', 'ward')
    const bare = fight(battle({ spearman: 20, mage: 4 }), 'hold', 'hold')
    console.log(
      `уцелело своих: под защитой ${partySize(warded.party)}, без ${partySize(bare.party)}`,
    )
    expect(partySize(warded.party)).toBeGreaterThanOrEqual(partySize(bare.party))
  })

  it('за колдовство платят истощением, а потом и людьми', () => {
    const long = fight(battle({ spearman: 40, mage: 5 }, 90), 'hold', 'fireball', 8)
    console.log(
      `после восьми раундов огня: истощение ${long.battle?.strain}, магов осталось ` +
        `${unitsSize(long.battle?.groups.mages ?? {})} из 5`,
    )
    expect(long.battle?.strain ?? 0).toBeGreaterThan(40)
  })

  it('магов нанимают только в больших городах', () => {
    const base = createGame(createCharacter({ name: 'Тест', money: 5000 }), 1, world)
    const village = Object.values(world.locations).find((l) => l.archetype === 'village')?.id ?? ''
    expect(
      applyCommand({ ...base, locationId: village }, { type: 'hire', troop: 'mage', count: 1 }).ok,
    ).toBe(false)
    const inCapital = applyCommand(
      { ...base, locationId: capital },
      { type: 'hire', troop: 'mage', count: 1 },
    )
    expect(inCapital.ok).toBe(true)
  })
})
