import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { FLESH } from '../src/content/flesh'
import { createSettlements } from '../src/economy'
import { ageKind, ageSaysNow, bodyOf, fleshRoll, healingLeft } from '../src/flesh'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 186: тело.
 *
 * Тело считалось по частям — усталость, рана, болезнь, годы — и нигде не
 * сходилось в одно. «Здоровье» было полоской, а не состоянием человека.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function hero(age = 30): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 500 }), 1, world)
  return {
    ...game,
    politics,
    settlements,
    time: WORLD_START,
    quarter: null,
    character: { ...game.character, age },
  }
}

describe('Тл1–Тл5: тело одним счётом и словами', () => {
  it('рана, болезнь, усталость, увечья и годы складываются в одно', () => {
    const whole = bodyOf(hero(), 1)
    console.log(whole.says)
    expect(whole.vigour).toBeGreaterThan(0.9)
    expect(whole.fit).toBe(true)
    const state = hero()
    const hurt = bodyOf(
      {
        ...state,
        character: {
          ...state.character,
          wound: { daysLeft: 20, severity: 0.8 },
          fatigue: 80,
        },
        ailment: { kind: 'fever', since: 1 },
        maims: ['хромота'],
      } as GameState,
      1,
    )
    console.log(hurt.says)
    expect(hurt.vigour).toBeLessThan(whole.vigour)
    expect(hurt.fit).toBe(false)
    expect(hurt.says).toContain('Рана')
  })

  it('возраст меняет, что можно, а не сколько', () => {
    expect(ageKind(20)).toBe('young')
    expect(ageKind(35)).toBe('prime')
    expect(ageKind(50)).toBe('grey')
    expect(ageKind(65)).toBe('old')
    for (const age of [20, 35, 50, 65]) console.log(ageSaysNow(hero(age), 1))
    // Годы отнимают тело, но не сразу.
    expect(bodyOf(hero(65), 1).vigour).toBeLessThan(bodyOf(hero(35), 1).vigour)
    expect(FLESH.fadesFrom).toBeGreaterThan(30)
  })

  it('лечение — срок, а не кнопка', () => {
    const state = hero()
    const hurt: GameState = {
      ...state,
      character: { ...state.character, wound: { daysLeft: 14, severity: 0.5, festering: true } },
    }
    console.log(healingLeft(hurt, 1).says)
    expect(healingLeft(hurt, 1).days).toBe(14)
    expect(healingLeft(state, 1).days).toBe(0)
  })
})

describe('Тл6: тело в числах', () => {
  it('видно, чего тело стоит сегодня', () => {
    const rolled = fleshRoll(hero(58), 1)
    console.log(rolled.says)
    expect(rolled.age).toBe('grey')
    expect(rolled.vigour).toBeGreaterThan(0)
  })
})
