import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { CUSTOM_DEFS, FACE, LOCAL_DEFS, TRADE_DEFS } from '../src/content/face'
import { type Settlement, createSettlements } from '../src/economy'
import { changeAt, customAt, faceOf, faceRoll, localsAt, tradesAt } from '../src/face'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 176: место, у которого есть лицо.
 *
 * Место считалось честно — жители, запасы, разбой, постройки, — а смотреть на
 * него было нечем: строка с числами и название. Здесь у места появляется лицо,
 * и ни одного нового числа при этом не заводится.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function wanderer(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 900 }), 1, world)
  return { ...game, politics, settlements, time: WORLD_START, quarter: null }
}

const places = Object.values(settlements)
  .filter((one) => one.population > 0)
  .slice(0, 20)
  .map((one) => one.locationId)

describe('Мс1 и Мс2: у места своя жизнь и свои люди', () => {
  it('занятие и порядок выводятся из того, где место стоит и что в нём есть', () => {
    const state = wanderer()
    for (const id of places.slice(0, 5)) {
      console.log(faceOf(state, world, id, 1).says)
    }
    const kinds = new Set(places.map((id) => tradesAt(state, world, id).join('+')))
    console.log(`занятий на двадцати местах: ${kinds.size} разных наборов`)
    expect(kinds.size).toBeGreaterThan(1)
    const customs = new Set(places.map((id) => customAt(state, world, id)))
    console.log(`порядков: ${[...customs].map((one) => CUSTOM_DEFS[one].label).join(', ')}`)
    expect(customs.size).toBeGreaterThanOrEqual(1)
    // Из одного состояния — одно и то же лицо: оно считается.
    const first = places[0] as string
    expect(faceOf(state, world, first, 1).says).toBe(faceOf(state, world, first, 1).says)
  })

  it('люди места берутся из построек, а не из списка ролей', () => {
    const state = wanderer()
    const bare = places.find((id) => (state.settlements[id]?.buildings.length ?? 0) === 0)
    expect(bare).toBeTruthy()
    if (!bare) return
    const few = localsAt(state, world, bare)
    console.log(`в месте без построек: ${few.map((one) => one.says).join('; ')}`)
    const built: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [bare]: {
          ...(state.settlements[bare] as Settlement),
          buildings: ['smithy', 'chapel', 'market'],
        },
      },
    }
    const many = localsAt(built, world, bare)
    console.log(`с кузней, часовней и рынком: ${many.map((one) => one.says).join('; ')}`)
    expect(many.length).toBeGreaterThan(few.length)
    expect(many.some((one) => one.who === 'smith')).toBe(true)
    expect(LOCAL_DEFS.smith.needs).toBe('smithy')
  })
})

describe('Мс3–Мс5: место меняется, различается и помнит', () => {
  it('рост и упадок видны словами', () => {
    const state = wanderer()
    const id = places[0] as string
    const start = world.locations[id]?.population ?? 0
    const grown: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [id]: { ...(state.settlements[id] as Settlement), population: Math.round(start * 1.5) },
      },
    }
    const ruined: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [id]: { ...(state.settlements[id] as Settlement), population: Math.round(start * 0.5) },
      },
    }
    console.log(faceOf(grown, world, id, 1).says)
    console.log(faceOf(ruined, world, id, 1).says)
    expect(changeAt(grown, world, id)).toBe('grew')
    expect(changeAt(ruined, world, id)).toBe('fell')
    expect(FACE.growsBy).toBeGreaterThan(1)
  })

  it('своё место отличается от чужого, и память о тебе названа', () => {
    const state = wanderer()
    const id = places[1] as string
    const mine: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [id]: { ...(state.settlements[id] as Settlement), owner: PLAYER },
      },
      marks: { [id]: 3 },
    }
    const theirs = faceOf(state, world, id, 1)
    const own = faceOf(mine, world, id, 1)
    console.log(theirs.says)
    console.log(own.says)
    expect(theirs.mine).toBe(false)
    expect(own.mine).toBe(true)
    expect(theirs.says).toContain('гость')
    expect(own.says).toContain('помнят')
  })
})

describe('Мс6: места в числах', () => {
  it('двадцать мест: сколько поднялось, сколько просело, где неспокойно', () => {
    const state = wanderer()
    const rolled = faceRoll(state, world, 1, places)
    console.log(rolled.says)
    expect(rolled.places).toBe(places.length)
    expect(rolled.grew + rolled.fell).toBeLessThanOrEqual(places.length)
    for (const id of places) {
      const face = faceOf(state, world, id, 1)
      expect(face.says.length).toBeGreaterThan(40)
      for (const trade of face.trades) expect(TRADE_DEFS[trade].label.length).toBeGreaterThan(3)
    }
  })
})
