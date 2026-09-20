import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { DIET, DIET_MOVES } from '../src/content/diet'
import { bindsBy, dietMoves, dietRoll, dietScene, voteWhy } from '../src/diet'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 194: съезд, который решает.
 *
 * Съезд корон был счётом голосов: число без причины, торг без цены, решение
 * без последствий.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const crowns = Object.keys(world.kingdoms)
const them = crowns[1] as string

function ruler(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
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
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

describe('Сз1–Сз2: повестка от мира и голос с причиной', () => {
  it('на столе лежит то, что мир принёс сам', () => {
    const state = ruler()
    const scene = dietScene(state, world, 1)
    console.log(scene.says)
    for (const one of scene.agenda) console.log(`  ${one}`)
    expect(scene.questions.length).toBeGreaterThan(0)
    expect(scene.agenda.length).toBe(scene.questions.length)
    // Идущая война сама поднимает вопрос об общем мире.
    const atWar: GameState = {
      ...state,
      politics: {
        ...state.politics,
        wars: [{ a: them, b: crowns[2] as string, since: 1, reason: 'спор о марке' }],
      },
    }
    expect(dietScene(atWar, world, 1).questions).toContain('peace')
    expect(scene.questions).not.toContain('peace')
  })

  it('у каждого голоса названа причина, и она не в симпатии', () => {
    const state = ruler()
    const scene = dietScene(state, world, 1)
    for (const one of scene.voices) console.log(one)
    expect(scene.voices.length).toBe(crowns.filter((one) => one !== PLAYER).length)
    const said = voteWhy(state, world, them, 'commonFoe', them, 1)
    console.log(said.says)
    // О ком решают, тот всегда против — и в объяснении это сказано.
    expect(said.vote).toBeLessThan(0)
    expect(said.says).toContain('решают о ней самой')
    expect(said.says).toContain('замысел')
    const bought: GameState = {
      ...state,
      congress: {
        question: 'roads',
        calledDay: 1,
        meetDay: 21,
        guests: crowns,
        absent: [],
        bribes: { [them]: 900 },
      },
    }
    const after = voteWhy(bought, world, them, 'roads', undefined, 1)
    expect(after.says).toContain('взято 900')
    expect(after.vote).toBeGreaterThan(voteWhy(state, world, them, 'roads', undefined, 1).vote)
  })
})

describe('Сз3–Сз4: торг вокруг съезда и то, чем решение связывает', () => {
  it('ходов пять, у каждого вес, цена и риск', () => {
    const state = ruler()
    const rows = dietMoves(state, world, them, 1)
    for (const one of rows) console.log(one.says)
    expect(rows.length).toBe(DIET_MOVES.length)
    const bribe = rows.find((one) => one.move === 'bribe')
    expect(bribe?.costs).toBeGreaterThan(0)
    // Подкуп — самый дешёвый ход только на словах: бумага весит больше.
    expect(rows.find((one) => one.move === 'proof')?.weight).toBeGreaterThan(
      bribe?.weight as number,
    )
    expect(rows.every((one) => one.says.includes('Риск:'))).toBe(true)
    // Ход, которого нечем сделать, назван прямо: союзников нет, бумаги нет.
    expect(rows.find((one) => one.move === 'ally')?.can).toBe(false)
    expect(rows.find((one) => one.move === 'proof')?.can).toBe(false)
    const poor: GameState = { ...state, character: { ...state.character, money: 10 } }
    expect(dietMoves(poor, world, them, 1).find((one) => one.move === 'bribe')?.can).toBe(false)
  })

  it('решённое связывает, и цена нарушения названа заранее', () => {
    const binds = bindsBy('peace')
    console.log(binds.says)
    expect(binds.binds).toBe(DIET.binds)
    expect(binds.binds).toBeLessThan(0)
    expect(binds.holds).toBeGreaterThan(365 * 2)
    expect(binds.says).toContain('общий мир')
  })
})

describe('Сз5–Сз6: съезд читается и считается', () => {
  it('съезды в числах', () => {
    const state = ruler()
    const rolled = dietRoll(state, world, 1)
    console.log(rolled.says)
    expect(rolled.held).toBe(0)
    expect(rolled.onTable).toBeGreaterThan(0)
    const held: GameState = {
      ...state,
      congresses: [
        { day: 1, question: 'roads', passed: true, guests: 4 },
        { day: 2, question: 'faith', passed: false, guests: 3 },
      ],
    }
    const after = dietRoll(held, world, 3)
    console.log(after.says)
    expect(after.held).toBe(2)
    expect(after.decided).toBe(1)
  })
})
