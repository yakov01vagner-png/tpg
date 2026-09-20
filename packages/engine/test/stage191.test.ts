import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { PARLEY } from '../src/content/parley'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import {
  agendaWith,
  argumentsFor,
  concessions,
  parleyEnd,
  parleyNow,
  parleyRoll,
} from '../src/parley'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 191: разговор вместо кнопки.
 *
 * Дипломатия умела почти всё и ничего из этого не было разговором: кнопка и
 * бросок.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const them = Object.keys(world.kingdoms)[1] as string

function ruler(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, 4)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    politics,
    settlements: map,
    time: WORLD_START,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

describe('Рз1–Рз3: сцена, доводы из мира и цена уступки', () => {
  it('повестку задаёт состояние, а не игрок', () => {
    const state = ruler()
    console.log(`повестка с ${them}: ${agendaWith(state, world, them, 1)}`)
    const atWar: GameState = {
      ...state,
      politics: {
        ...state.politics,
        wars: [{ a: PLAYER, b: them, since: 1, reason: 'спор о марке' }],
      },
    }
    expect(agendaWith(atWar, world, them, 1)).toBe('peace')
  })

  it('пустой довод виден обоим', () => {
    const state = ruler()
    const rows = argumentsFor(state, world, them, 1)
    for (const one of rows) console.log(one.says)
    expect(rows.some((one) => one.backed)).toBe(true)
    expect(rows.some((one) => !one.backed)).toBe(true)
    // Родство подкрепляется браком, а не словами.
    const wed: GameState = { ...state, marriages: [{ kingdomId: them, sinceDay: 1 }] as never }
    expect(argumentsFor(wed, world, them, 1).find((one) => one.id === 'kin')?.backed).toBe(true)
  })

  it('видно, чем уступить и чего это стоит', () => {
    const rows = concessions(ruler(), world, them, 1)
    for (const one of rows) console.log(one.says)
    expect(rows.length).toBeGreaterThan(3)
  })
})

describe('Рз4–Рз6: он тоже торгуется, и разговор кончается бумагой', () => {
  it('подкреплённые доводы и уступки складываются в бумагу', () => {
    const state = ruler()
    const empty = parleyNow(state, world, them, ['kin', 'faith'], [], 1)
    console.log(empty.says)
    expect(empty.weight).toBeLessThan(PARLEY.agreesAt)
    const solid = parleyNow(state, world, them, ['might', 'gain'], ['silver', 'land'], 1)
    console.log(solid.says)
    expect(solid.weight).toBeGreaterThanOrEqual(PARLEY.agreesAt)
    console.log(parleyEnd(solid).says)
    expect(parleyEnd(solid).treaty).toBe(solid.agenda)
    expect(parleyEnd(empty).treaty).toBe(null)
  })

  it('пустые доводы роняют настроение, и он уходит', () => {
    const state = ruler()
    const rude = parleyNow(state, world, them, ['kin', 'faith', 'debt', 'right'], [], 1)
    console.log(rude.says)
    expect(rude.mood).toBeLessThan(0)
  })

  it('разговоры в числах', () => {
    const rolled = parleyRoll([
      { weight: 7, treaty: 'peace' },
      { weight: 2, treaty: null },
      { weight: 9, treaty: 'alliance' },
    ])
    console.log(rolled.says)
    expect(rolled.papers).toBe(2)
  })
})
