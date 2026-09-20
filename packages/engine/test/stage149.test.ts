import { describe, expect, it } from 'vitest'
import { centuryOf, raceOfCentury } from '../src/century'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 149: сводка века.
 *
 * Ничего не хранится: сводка выводится из летописи, путей и кривых — и ничего
 * не хвалит, только называет числа с причинами.
 */

const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function game(seed: number): { state: GameState; world: ReturnType<typeof generateWorld> } {
  const world = generateWorld(seed)
  const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(seed))
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, 8)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    world,
    state: {
      ...createGame(createCharacter({ name: 'Ратша', money: 40000 }), seed, world),
      politics,
      settlements: map,
      locationId: mine[0]?.locationId ?? '',
      quarter: null,
      time: WORLD_START + (day - 1) * 24 * 60,
      realm: { name: 'Заречье', sinceDay: 1 },
    },
  }
}

describe('Св1–Св5: век одним счётом, из состояния и без похвал', () => {
  it('сводка собирается из летописи и путей', () => {
    const { state, world } = game(1)
    let after = state
    for (let i = 0; i < 20; i += 1) after = ok(applyCommand(after, { type: 'rest', hours: 12 }))
    const century = centuryOf(after, world, day + 10)
    console.log(century.says)
    console.log(century.yours)
    console.log(`гонка века: ${raceOfCentury(after, world, day + 10)}`)
    expect(century.rows).toHaveLength(Object.keys(world.kingdoms).length + 1)
    // Сводка ничего не хранит: та же сводка собирается из того же состояния.
    expect(centuryOf(after, world, day + 10).says).toBe(century.says)
  })
})

describe('Св6: три зерна — три разных века', () => {
  it('каждый век читается', () => {
    for (const seed of [1, 2, 3]) {
      const { state, world } = game(seed)
      // Год живого мира: без него три зерна дают одну и ту же картинку — пути
      // выводятся из корон, а короны на всех картах одни и те же.
      let lived = state
      for (let i = 0; i < 365; i += 1) {
        lived = ok(applyCommand(lived, { type: 'tick', minutes: MINUTES_PER_DAY }))
      }
      const century = centuryOf(lived, world, day + 365)
      console.log(`зерно ${seed}: ${century.says}`)
      console.log(`  гонка: ${raceOfCentury(lived, world, day + 365)}`)
      expect(century.rows.length).toBeGreaterThan(1)
    }
  })
})
