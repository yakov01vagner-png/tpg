import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { LEGATION } from '../src/content/legation'
import { createSettlements } from '../src/economy'
import { bringsBack, legationRoll, roadFor, rootedThere, welcomes } from '../src/legation'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 193: посольство как люди.
 *
 * Посол был человеком с нравом, и этим всё кончалось: дорога ничего не стоила,
 * приём ничего не значил, резидент не старел.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const them = Object.keys(world.kingdoms)[1] as string

function ruler(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 9000 }), 1, world)
  const here = Object.values(settlements).find((one) => one.population > 900)
  return {
    ...game,
    politics,
    settlements,
    time: WORLD_START,
    locationId: here?.locationId ?? game.locationId,
    quarter: null,
  }
}

describe('Пс2, Пс3 и Пс5: дорога, что привозит и как принимают', () => {
  it('дорога стоит суток, серебра и самого посла', () => {
    const road = roadFor(ruler(), world, them, 1)
    console.log(road.says)
    expect(road.days).toBeGreaterThan(1)
    expect(road.costs).toBeGreaterThan(0)
    expect(road.wears).toBeGreaterThan(0)
  })

  it('посол привозит три вещи, а не одну', () => {
    const rows = bringsBack(ruler(), world, them, 1)
    for (const one of rows) console.log(one)
    expect(rows).toHaveLength(3)
  })

  it('чужое посольство принимают по-разному, и это стоит', () => {
    const rows = welcomes(ruler(), world, 1)
    for (const one of rows) console.log(one.says)
    expect(rows).toHaveLength(4)
    expect(rows[0]?.costs).toBeGreaterThan(rows[3]?.costs ?? 0)
  })
})

describe('Пс4 и Пс6: резидент прирастает связями, и посольства считаны', () => {
  it('прижившийся резидент видит больше и рискует больше', () => {
    const state: GameState = {
      ...ruler(),
      residents: [
        { id: 'r1', at: them, name: 'Онисим', sinceDay: 1, skill: 5 },
        { id: 'r2', at: 'hlad', name: 'Богдан', sinceDay: 1600, skill: 4 },
      ],
    }
    const rows = rootedThere(state, world, 1600)
    for (const one of rows) console.log(one.says)
    expect(rows[0]?.sees).toBe(LEGATION.rootsSee)
    expect(rows[1]?.sees).toBe(1)
  })

  it('посольства в числах', () => {
    const state: GameState = {
      ...ruler(),
      envoyLog: { sent: 7, brought: 5, offSum: 2, guests: 3 },
    }
    const rolled = legationRoll(state, world, 1)
    console.log(rolled.says)
    expect(rolled.sent).toBe(7)
  })
})
