import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { BURIAL_RITE_DEFS, PASSING } from '../src/content/passing'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import {
  deathFrom,
  lastDays,
  othersPassing,
  passingRoll,
  passingSays,
  ritesFor,
} from '../src/passing'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 190: смерть.
 *
 * Смерть приходила сменой цифр: без причины, без последнего дня, без похорон и
 * без того, чтобы мир заметил.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function dying(age: number, hurt = false): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 9000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, 3)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  const day = 365 * 40
  return {
    ...game,
    politics,
    settlements: map,
    time: WORLD_START + day * 24 * 60,
    quarter: null,
    character: {
      ...game.character,
      age,
      wound: hurt ? { daysLeft: 10, severity: 0.7, festering: true } : null,
      family: {
        house: 'Заречные',
        spouse: null,
        children: [{ name: 'Мирослав', bornDay: day - 22 * 365, heir: true }],
      },
    },
  } as GameState
}

describe('См1–См3: причина, последний день и похороны', () => {
  it('смерть приходит откуда-то, и это названо', () => {
    const old = deathFrom(dying(70), 365 * 40)
    const wounded = deathFrom(dying(40, true), 365 * 40)
    console.log(old.says)
    console.log(wounded.says)
    expect(old.what).toBe('age')
    expect(wounded.what).toBe('wound')
  })

  it('последние дни — это дела, а не ожидание', () => {
    const last = lastDays(dying(70), world, 365 * 40)
    console.log(last.says)
    expect(last.days).toBe(PASSING.lastDays)
    expect(last.can.length).toBeGreaterThan(3)
  })

  it('как похоронили — так и запомнили', () => {
    const great = ritesFor(dying(70), world, 365 * 40, 'great')
    const none = ritesFor(dying(70), world, 365 * 40, 'none')
    console.log(great.says)
    console.log(none.says)
    expect(great.costs).toBe(BURIAL_RITE_DEFS.great.costs)
    expect(great.remembers).toBeGreaterThan(none.remembers)
  })
})

describe('См4–См6: переход, чужая смерть и счёт', () => {
  it('переход читается как событие', () => {
    const says = passingSays(dying(70), world, 365 * 40)
    console.log(says)
    expect(says).toContain('принимает')
  })

  it('чужая смерть замечается тем же счётом', () => {
    const state = dying(70)
    const rows = othersPassing(state, world, 365 * 40)
    console.log(`старых спутников: ${rows.length}`)
    expect(Array.isArray(rows)).toBe(true)
  })

  it('смерть в числах', () => {
    const rolled = passingRoll(dying(70), world, 365 * 40)
    console.log(rolled.says)
    expect(rolled.heir).toBe(true)
    expect(rolled.places).toBe(3)
  })
})
