import { describe, expect, it } from 'vitest'
import {
  type Battle,
  type BattleSide,
  GROUP_IDS,
  type GroupId,
  type OrderId,
  formUp,
  groupsSize,
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

const party = (units: Party['units'], morale = 70): Party => ({
  units,
  morale,
  hungryDays: 0,
  gear: 0,
})

const bandits = (size: number): BattleSide => ({
  name: 'Разбойники',
  units: { militia: size },
  morale: 55,
  fatigue: 0,
})

function battleState(own: Party, enemy: BattleSide, seed = 1): GameState {
  const base = createGame(createCharacter({ name: 'Тест', money: 500 }), seed, world)
  return {
    ...base,
    locationId: capital,
    party: own,
    battle: startBattle(own, enemy, 'plains'),
  }
}

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const allOrders = (order: OrderId): Record<GroupId, OrderId> =>
  Object.fromEntries(GROUP_IDS.map((id) => [id, order])) as Record<GroupId, OrderId>

/** Довести бой до конца одними и теми же приказами. */
function fight(state: GameState, order: OrderId, limit = 30): GameState {
  let current = state
  for (let round = 0; round < limit; round += 1) {
    if (current.battle?.outcome !== 'ongoing') break
    current = ok(applyCommand(current, { type: 'battleOrders', orders: allOrders(order) }))
  }
  return current
}

describe('построение', () => {
  it('разводит по группам: стрелки к стрелкам, конные во фланг', () => {
    const groups = formUp(party({ militia: 8, archer: 4, horseman: 3 }))
    expect(unitsSize(groups.archers)).toBe(4)
    expect(unitsSize(groups.flank)).toBe(3)
    // Часть строя уходит в резерв — он вступает свежим.
    expect(unitsSize(groups.reserve)).toBeGreaterThan(0)
    expect(groupsSize(groups)).toBe(15)
  })
})

describe('бой', () => {
  it('заканчивается за разумное число раундов', () => {
    const after = fight(battleState(party({ militia: 12 }), bandits(10)), 'charge')
    expect(after.battle?.outcome).not.toBe('ongoing')
    console.log(
      `бой 12 против 10: ${after.battle?.round} раундов, исход «${after.battle?.outcome}», ` +
        `осталось ${partySize(after.party)}`,
    )
    expect(after.battle?.round).toBeLessThan(25)
  })

  it('приказ меняет ход боя: атака решает быстро, строй — дёшево за раунд', () => {
    // Берём отряды покрупнее: на дюжине человек любая разница тонет в округлении.
    const charged = fight(battleState(party({ spearman: 40 }), bandits(40)), 'charge')
    const held = fight(battleState(party({ spearman: 40 }), bandits(40)), 'hold')

    const chargeRounds = charged.battle?.round ?? 1
    const holdRounds = held.battle?.round ?? 1
    const chargeLossRate = (40 - partySize(charged.party)) / chargeRounds
    const holdLossRate = (40 - partySize(held.party)) / holdRounds
    console.log(
      `40 копейщиков против 40: атака — ${chargeRounds} р., потери ${chargeLossRate.toFixed(2)}/раунд; ` +
        `строй — ${holdRounds} р., потери ${holdLossRate.toFixed(2)}/раунд`,
    )

    // Атака решает дело быстрее.
    expect(chargeRounds).toBeLessThan(holdRounds)
    // Зато в строю за раунд теряешь меньше — стоять дешевле, но дольше,
    // и против равного противника глухая оборона в сумме обходится не дешевле.
    expect(holdLossRate).toBeLessThan(chargeLossRate)
  })

  it('слабейший бежит, а не умирает до последнего', () => {
    const after = fight(battleState(party({ militia: 4 }), bandits(20)), 'hold')
    expect(after.battle?.outcome).toBe('lost')
    // Кто-то уцелел: разгром — это бегство, а не поголовная резня.
    expect(partySize(after.party)).toBeGreaterThan(0)
  })

  it('победа даёт добычу и пленных', () => {
    const won = fight(battleState(party({ manAtArms: 15 }), bandits(8)), 'charge')
    expect(won.battle?.outcome).toBe('won')
    const spoils = won.battle?.spoils
    expect(spoils?.money ?? 0).toBeGreaterThan(0)

    const ransomed = ok(applyCommand(won, { type: 'battleEnd', prisoners: 'ransom' }))
    expect(ransomed.battle).toBe(null)
    expect(ransomed.character.money).toBeGreaterThan(won.character.money)

    const recruited = ok(applyCommand(won, { type: 'battleEnd', prisoners: 'recruit' }))
    if ((spoils?.prisoners ?? 0) > 0) {
      expect(partySize(recruited.party)).toBeGreaterThan(partySize(won.party))
    }
  })

  it('поражение обходится дорого', () => {
    const lost = fight(battleState(party({ militia: 3 }), bandits(25)), 'charge')
    expect(lost.battle?.outcome).toBe('lost')
    const after = ok(applyCommand(lost, { type: 'battleEnd', prisoners: 'release' }))
    expect(after.character.money).toBeLessThan(lost.character.money)
  })

  it('из боя можно выйти, заплатив людьми', () => {
    const state = battleState(party({ militia: 10 }), bandits(20))
    const after = ok(applyCommand(state, { type: 'battleFlee' }))
    expect(after.battle?.outcome).toBe('fled')
    expect(partySize(after.party)).toBeLessThan(10)
    expect(partySize(after.party)).toBeGreaterThan(0)
  })

  it('во время боя больше ничем не займёшься', () => {
    const state = battleState(party({ militia: 10 }), bandits(10))
    const result = applyCommand(state, { type: 'work', jobId: 'unloadCarts' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('inBattle')
  })

  it('из одного зерна выходит один и тот же бой', () => {
    const first = fight(battleState(party({ militia: 12 }), bandits(12), 777), 'hold')
    const second = fight(battleState(party({ militia: 12 }), bandits(12), 777), 'hold')
    expect(first.party).toEqual(second.party)
    expect(first.battle?.log).toEqual(second.battle?.log)
  })

  it('по логу видно, что происходило', () => {
    const after = fight(battleState(party({ militia: 12 }), bandits(10)), 'charge')
    const log = after.battle?.log ?? []
    expect(log.length).toBeGreaterThan(3)
    expect(log.some((line: string) => line.includes('потери'))).toBe(true)
  })
})

describe('конница', () => {
  it('в поле бьёт сильнее, чем в горах', () => {
    const horsemen = party({ horseman: 40 })
    const field: Battle = startBattle(horsemen, bandits(60), 'plains')
    const hills: Battle = startBattle(horsemen, bandits(60), 'mountains')
    const base = createGame(createCharacter({ name: 'Тест', money: 500 }), 5, world)

    const inField = fight(
      { ...base, locationId: capital, party: horsemen, battle: field },
      'charge',
    )
    const inHills = fight(
      { ...base, locationId: capital, party: horsemen, battle: hills },
      'charge',
    )
    console.log(
      `сорок всадников против 60: в поле — ${inField.battle?.round} р., уцелело ${partySize(inField.party)}; ` +
        `в горах — ${inHills.battle?.round} р., уцелело ${partySize(inHills.party)}`,
    )
    // В поле конница решает дело быстрее и дешевле; в горах она вязнет.
    expect(inField.battle?.round ?? 99).toBeLessThanOrEqual(inHills.battle?.round ?? 0)
    expect(partySize(inField.party)).toBeGreaterThan(partySize(inHills.party))
  })
})
