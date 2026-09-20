import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { ELDER } from '../src/content/elder'
import { createSettlements } from '../src/economy'
import { elderRoll, elderSays, heirBeside, retireNow, wordWeight } from '../src/elder'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 189: старость.
 *
 * Годы отнимали силу и потолки и не прибавляли ничего: старость была
 * наказанием за долгую игру, а не временем, в котором играют иначе.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function grey(age: number, heirAge = 20): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 5000 }), 1, world)
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
      bornDay: day - age * 365,
      family: {
        house: 'Заречные',
        spouse: null,
        children: [{ name: 'Мирослав', bornDay: day - heirAge * 365, heir: true }],
      },
    },
  } as GameState
}

describe('Ст1–Ст3: годы берут и дают', () => {
  it('слово старика весит больше удара', () => {
    expect(wordWeight(grey(30), 365 * 40)).toBe(1)
    const old = wordWeight(grey(66), 365 * 40)
    console.log(`в 66 лет слово ×${old}`)
    expect(old).toBeGreaterThan(1)
    expect(old).toBeLessThanOrEqual(ELDER.most)
    console.log(elderSays(grey(66), world, 365 * 40))
    expect(elderSays(grey(66), world, 365 * 40)).toContain('старшим')
  })

  it('наследник рядом, и видно, готов ли он', () => {
    const day = 365 * 40
    const ready = heirBeside(grey(60, 22), day)
    const small = heirBeside(grey(60, 8), day)
    console.log(ready.says)
    console.log(small.says)
    expect(ready.ready).toBe(true)
    expect(small.ready).toBe(false)
  })
})

describe('Ст4–Ст6: отход от дел и счёт', () => {
  it('отойти можно, и сказано, что придётся передать', () => {
    const day = 365 * 40
    const says = retireNow(grey(60, 22), world, day)
    console.log(says.says)
    expect(says.says.length).toBeGreaterThan(20)
  })

  it('старость в числах', () => {
    const day = 365 * 40
    const rolled = elderRoll(grey(66, 22), world, day)
    console.log(rolled.says)
    expect(rolled.fit).toBe(false)
    expect(rolled.heir).toBe(true)
  })
})
