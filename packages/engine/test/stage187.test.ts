import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { TEMPER, TRAIT_DEFS } from '../src/content/temper'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import {
  breakTemper,
  easeOf,
  habitsOf,
  temperRoll,
  temperSays,
  traitsOf,
  voiceOfTemper,
} from '../src/temper'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 187: нрав и привычки.
 *
 * Герой был суммой навыков и списком дел: мир складывал о нём мнение, а сам он
 * от своих дел не менялся — ни в разговоре, ни в том, что даётся легче.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function hero(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 2000 }), 1, world)
  return { ...game, politics, settlements, time: WORLD_START, quarter: null }
}

describe('Нр1, Нр2 и Нр4: нрав вырастает из дел и слышен в разговоре', () => {
  it('три разные жизни дают трёх разных людей из одного начала', () => {
    const plain = hero()
    console.log(temperSays(plain, world, 1))
    expect(traitsOf(plain, world, 1).length).toBe(0)

    const warlike: GameState = {
      ...plain,
      battlesWon: 9,
      politics: { ...plain.politics, wars: [{ a: PLAYER, b: 'robl', since: 1, reason: 'спор' }] },
    }
    const schemer: GameState = {
      ...plain,
      spies: [{ kingdomId: 'robl', seat: 'court', sinceDay: 1 }] as never,
      rumours: [
        { against: 'robl', untilDay: 99 },
        { against: 'hlad', untilDay: 99 },
      ],
      vows: [{ who: 'bran', ask: 'place', day: 1, untilDay: 2, brokenDay: 3 }] as never,
    }
    const rich: GameState = { ...plain, character: { ...plain.character, money: 90000 } }
    for (const one of [warlike, schemer, rich]) console.log(temperSays(one, world, 1))
    expect(traitsOf(warlike, world, 1)[0]?.id).toBe('hard')
    expect(traitsOf(schemer, world, 1).some((one) => one.id === 'sly')).toBe(true)
    expect(traitsOf(rich, world, 1).some((one) => one.id === 'greedy')).toBe(true)
    // И это слышно в разговоре.
    console.log(voiceOfTemper(warlike, world, 1, 'Я возьму эту землю'))
    expect(voiceOfTemper(warlike, world, 1, 'Я возьму эту землю')).toContain(TRAIT_DEFS.hard.voice)
  })
})

describe('Нр3, Нр5 и Нр6: привычка, перемена и счёт', () => {
  it('привычное даётся легче, нетронутое ржавеет', () => {
    const green = hero()
    // У новичка привычек нет вовсе: все умения по нулям.
    expect(habitsOf(green, 1).habits).toHaveLength(0)
    const state: GameState = {
      ...green,
      character: {
        ...green.character,
        skills: {
          ...green.character.skills,
          command: { ...green.character.skills.command, level: 30, xp: 0 },
          trade: { ...green.character.skills.trade, level: 20, xp: 0 },
          riding: { ...green.character.skills.riding, level: 10, xp: 0 },
        },
      },
    }
    const rows = habitsOf(state, 1)
    console.log(rows.says)
    expect(rows.habits.length).toBe(TEMPER.habits)
    const first = rows.habits[0]
    if (first) expect(easeOf(state, first, 1)).toBe(TEMPER.habitEases)
    const rusty = rows.rusty[0]
    if (rusty) expect(easeOf(state, rusty, 1)).toBe(TEMPER.rustCosts)
  })

  it('переменить себя стоит славы и лет, и нрав считан', () => {
    const state = { ...hero(), battlesWon: 9 }
    console.log(breakTemper(state, world, 1).says)
    expect(breakTemper(state, world, 1).years).toBe(TEMPER.breaksYears)
    const rolled = temperRoll(state, world, 1)
    console.log(rolled.says)
    expect(rolled.traits.length).toBeGreaterThan(0)
  })
})
