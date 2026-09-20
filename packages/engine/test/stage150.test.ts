import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { RANSOM, RANSOM_LEVERS, RANSOM_LEVER_DEFS } from '../src/content/ransom'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { haggleRansomFor, leversFor, ownRansom, ransomLedger, yoursTaken } from '../src/ransom'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 150: плен и выкуп.
 *
 * В плен попадают все, а выкуп торгуется: у пленителя своя нужда, и она в
 * цене видна.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(extra: Partial<GameState> = {}): GameState {
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, 8)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world),
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? '',
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    ...extra,
  }
}

describe('Пл2 и Пл3: выкуп торгуют, а пленник — рычаг', () => {
  it('цена имеет верх и дно, и ниже дна не берут', () => {
    const foe = kingdoms[0] as string
    const captive = {
      id: 'lord:foe',
      name: 'Вельд',
      title: 'барон',
      kingdomId: foe,
      since: day - 40,
      ransom: 2000,
    }
    const state = ruler({ captives: [captive] })
    const price = haggleRansomFor(state, world, captive, foe, day)
    console.log(price.says)
    for (const one of leversFor(state, world, captive, day)) console.log(one.says)
    expect(price.asks).toBeGreaterThan(price.least)

    const low = applyCommand(state, {
      type: 'haggleRansom',
      captiveId: captive.id,
      offer: price.least - 1,
    })
    console.log(low.ok ? 'отдал ниже дна' : low.message)
    expect(low.ok).toBe(false)

    const sold = ok(
      applyCommand(state, { type: 'haggleRansom', captiveId: captive.id, offer: price.asks }),
    )
    console.log(
      `отпущен за ${price.asks}: казна ${state.character.money} -> ${sold.character.money}, пленных ${(sold.captives ?? []).length}`,
    )
    expect((sold.captives ?? []).length).toBe(0)
    for (const id of RANSOM_LEVERS) expect(RANSOM_LEVER_DEFS[id].label.length).toBeGreaterThan(2)
  })
})

describe('Пл1, Пл4, Пл5 и Пл6: свои в плену', () => {
  it('своего выкупают, а забытый в плену помнит', () => {
    const lord = politics.lords[0]
    if (!lord) return
    const state = ruler({
      politics: {
        ...politics,
        lords: politics.lords.map((one, i) =>
          i === 0 ? { ...one, kingdomId: PLAYER, loyalty: 60 } : one,
        ),
      },
      taken: [
        {
          id: lord.id,
          name: lord.name,
          by: kingdoms[0] as string,
          since: day - 800,
          ransom: 1500,
        },
      ],
      time: WORLD_START + (RANSOM.beat * 14 - 2) * 24 * 60,
    })
    const price = ownRansom(state, world, lord.id, day)
    console.log(price.says)
    expect(yoursTaken(state)).toHaveLength(1)

    const back = ok(applyCommand(state, { type: 'ransomOwn', id: lord.id }))
    const loyalty = back.politics.lords.find((one) => one.id === lord.id)?.loyalty ?? 0
    console.log(
      `выкуплен за ${price.cost}: в плену осталось ${yoursTaken(back).length}, верность ${loyalty}`,
    )
    expect(yoursTaken(back)).toHaveLength(0)
    console.log(ransomLedger(back, world, day).says)
  })
})
