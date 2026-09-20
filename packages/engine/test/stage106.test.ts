import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import type { applyCommand } from '../src/commands'
import { OFFICES } from '../src/content/offices'
import { courtiersOf } from '../src/courtier'
import { createSettlements } from '../src/economy'
import { FACTION, appointCost, balanceOf, intrigueNow, partiesOf, sidesWith } from '../src/faction'
import { PLAYER } from '../src/holding'
import { candidatesFor } from '../src/office'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 106: партии при дворе.
 *
 * Партии были настроением из четырёх чисел. Здесь у каждой есть то, чем она
 * живёт, и то, чего боится, — и власть над твоим слухом: победившая партия
 * решает, что до тебя дойдёт.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function court(atWar = false): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, 6)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  let filled: GameState = {
    ...game,
    politics: atWar
      ? { ...politics, wars: [{ a: PLAYER, b: 'robl', since: 1, reason: 'война' }] }
      : politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
  for (const office of OFFICES) {
    const who = candidatesFor(filled, office)[0]
    if (!who) continue
    filled = {
      ...filled,
      offices: {
        ...(filled.offices ?? {}),
        [office]: { holderId: who.id, kind: who.kind, sinceDay: day - 3 * DAYS_PER_YEAR },
      },
    }
  }
  return filled
}

describe('П1: чем живёт партия', () => {
  it('у каждой свой хлеб и свой страх', () => {
    const state = court()
    for (const one of partiesOf(state, day)) {
      console.log(
        `«${one.label}» (${one.mood}): живут тем, что ${one.lives}; боятся: ${one.fears}. За них: ${one.people.join(', ') || 'никого'}`,
      )
    }
    expect(partiesOf(state, day)).toHaveLength(4)
    const people = courtiersOf(state, day)
    expect(people.every((one) => sidesWith(one).length > 0)).toBe(true)
  })
})

describe('П5 и П2: равновесие и слух', () => {
  it('победившая партия придерживает дурное сильнее', () => {
    const calm = balanceOf(court(), day)
    const warring = balanceOf(court(true), day)
    console.log(`в мире: ${calm.says} Утайка ×${calm.hides}`)
    console.log(`в войну: ${warring.says} Утайка ×${warring.hides}`)
    expect(calm.hides).toBeGreaterThan(0)
    expect(FACTION.wonHides).toBeGreaterThan(FACTION.evenHelps)
  })
})

describe('П3: назначение как ход', () => {
  it('видно заранее, кто прибавит, а кто запомнит', () => {
    const state = court()
    for (const one of courtiersOf(state, day).slice(0, 3)) {
      console.log(appointCost(state, one, day).says)
    }
    const first = courtiersOf(state, day)[0]
    if (!first) return
    const cost = appointCost(state, first, day)
    expect(cost.gains).not.toBe(cost.loses)
  })
})

describe('П4: интрига против своего', () => {
  it('партии бьют друг друга твоими руками', () => {
    const state = court()
    const intrigue = intrigueNow(state, day)
    console.log(intrigue?.says ?? 'при дворе тихо')
    if (!intrigue) return
    expect(['denounce', 'audit', 'errand']).toContain(intrigue.how)
    expect(intrigue.against.length).toBeGreaterThan(0)
  })
})
