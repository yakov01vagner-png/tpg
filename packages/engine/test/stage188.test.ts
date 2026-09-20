import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { LEARN_ROAD_DEFS } from '../src/content/teaching'
import { createSettlements } from '../src/economy'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { ceilingSays, learningSays, lettersOf, roadsFor, yearsToMastery } from '../src/teaching'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 188: учение.
 *
 * Наставники, книги, курсы и ордена давали одно и то же — очки в навык, — и
 * выбор между ними был выбором цены, а не дороги.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function student(learning = 0): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 3000 }), 1, world)
  return {
    ...game,
    politics,
    settlements,
    time: WORLD_START,
    quarter: null,
    character: {
      ...game.character,
      skills: {
        ...game.character.skills,
        scholarship: { ...game.character.skills.scholarship, level: learning, xp: 0 },
      },
    },
  }
}

describe('Уч1–Уч3: дороги учения расходятся, и предел назван', () => {
  it('у каждой дороги свой ход и свой предел', () => {
    const state = student()
    const roads = roadsFor(state, 'command')
    for (const one of roads) console.log(one.says)
    expect(roads).toHaveLength(5)
    // Делом дальше середины не уйти, наставник и орден доводят до предела.
    expect(LEARN_ROAD_DEFS.doing.upTo).toBeLessThan(LEARN_ROAD_DEFS.master.upTo)
    expect(LEARN_ROAD_DEFS.master.upTo).toBe(1)
    console.log(ceilingSays(state, 'command'))
    expect(ceilingSays(state, 'command')).toContain('Сам дойдёшь')
  })

  it('сколько лет до мастерства разными дорогами', () => {
    const rows = yearsToMastery(student(), 'command')
    for (const one of rows) console.log(one.says)
    const master = rows.find((one) => one.road === 'master')
    const doing = rows.find((one) => one.road === 'doing')
    expect(master?.years ?? 0).toBeGreaterThan(0)
    expect((master?.years ?? 0) < (doing?.years ?? 0) * 3).toBe(true)
  })
})

describe('Уч4 и Уч5: знание открывает разговоры, и учение видно', () => {
  it('грамота, счёт, право, языки и Писание требуют учёности', () => {
    const green = lettersOf(student(0))
    const learned = lettersOf(student(60))
    for (const one of learned) console.log(one.says)
    expect(green.filter((one) => one.has)).toHaveLength(0)
    expect(learned.every((one) => one.has)).toBe(true)
  })

  it('что умеешь и чего не умеешь — одной строкой', () => {
    const says = learningSays(student(30), world, 1)
    console.log(says)
    expect(says).toContain('знаний')
  })
})
