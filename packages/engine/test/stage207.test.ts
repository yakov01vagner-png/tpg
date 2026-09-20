import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { ROLL_INVERSE, ROLL_STEP } from '../src/content/rolls'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng, nextFloat, nextInt, rollChance } from '../src/rng'
import { hashedNotRolled, rollRoll, rollsBetween, rollsMatch } from '../src/rolls'
import { royalHouse } from '../src/royal'
import { deserialize, serialize } from '../src/save'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, WORLD_START } from '../src/time'
import { createPolitics, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 207: случайность, которую видно.
 *
 * Поток один и лежит в состоянии — но посмотреть на него было нельзя: сколько
 * бросков стоит такт, где они тратятся, не завёл ли новый слой своей
 * случайности втихую.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function ruler(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 20000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, 4)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return { ...game, politics, settlements: map, time: WORLD_START }
}

describe('Сл1–Сл2: поток один, и броски считаны', () => {
  it('обратное к шагу верно, и счёт бросков сходится с прокруткой', () => {
    expect(Math.imul(ROLL_STEP, ROLL_INVERSE) >>> 0).toBe(1)
    let rng = createRng(7)
    for (let i = 0; i < 4; i += 1) rng = nextFloat(rng)[1]
    rng = nextInt(rng, 1, 6)[1]
    rng = rollChance(rng, 0.5)[1]
    const counted = rollsBetween(createRng(7), rng)
    console.log(`бросков насчитано ${counted}`)
    expect(counted).toBe(6)
    expect(rollsMatch(createRng(7), rng, counted)).toBe(true)
  })

  it('видно, во сколько бросков обходится такт мира', () => {
    const from = createRng(3)
    const years = 10
    const ticked = tickPolitics(world, politics, settlements, years * DAYS_PER_YEAR, from)
    const rolled = rollRoll(from, ticked.rng, years * DAYS_PER_YEAR)
    console.log(rolled.says)
    expect(rollsMatch(from, ticked.rng, rolled.rolls)).toBe(true)
    // Такт не бесплатный и не бездонный: броски есть, и их немного на сутки.
    expect(rolled.rolls).toBeGreaterThan(0)
    expect(rolled.perDay).toBeLessThan(20)
  })

  it('сутки героя тоже считаны', () => {
    const before = ruler()
    const after = applyCommand(before, { type: 'tick', minutes: 24 * 60 })
    expect(after.ok).toBe(true)
    if (!after.ok) return
    const rolled = rollRoll(before.rng, after.state.rng, 1)
    console.log(`за сутки героя: ${rolled.says}`)
    expect(rollsMatch(before.rng, after.state.rng, rolled.rolls)).toBe(true)
  })
})

describe('Сл3: новый слой в единице не двигает чужую случайность', () => {
  it('такт с подсказками-единицами повторяет такт без них', () => {
    const years = 20
    const plain = tickPolitics(world, politics, settlements, years * DAYS_PER_YEAR, createRng(5))
    const hooked = tickPolitics(
      world,
      politics,
      settlements,
      years * DAYS_PER_YEAR,
      createRng(5),
      'busy',
      () => 1,
      () => ({ haste: 1, winner: null, term: null }),
    )
    console.log(
      `без подсказок ${rollsBetween(createRng(5), plain.rng)} бросков, с подсказками ${rollsBetween(
        createRng(5),
        hooked.rng,
      )}`,
    )
    expect(hooked.rng.state).toBe(plain.rng.state)
    expect(hooked.politics.wars).toEqual(plain.politics.wars)
  })
})

describe('Сл4: где ответ обязан быть одним, стоит хэш', () => {
  it('перечень таких мест назван, и они и правда не бросают', () => {
    for (const one of hashedNotRolled()) console.log(one)
    expect(hashedNotRolled().length).toBeGreaterThan(4)
    // Дом короны спрашивают дважды подряд — он тот же, и поток не тронут.
    const first = royalHouse(world, Object.keys(world.kingdoms)[0] as string, 5000)
    const again = royalHouse(world, Object.keys(world.kingdoms)[0] as string, 5000)
    expect(again).toEqual(first)
  })

  it('ни один файл ядра не заводит своей случайности', () => {
    const found: string[] = []
    const look = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = `${dir}/${entry.name}`
        if (entry.isDirectory()) {
          look(full)
          continue
        }
        if (!entry.name.endsWith('.ts')) continue
        if (readFileSync(full, 'utf8').includes('Math.random')) found.push(full)
      }
    }
    look('packages/engine/src')
    expect(found).toEqual([])
  })
})

describe('Сл5–Сл6: поток переживает сейв, и всё это считается', () => {
  it('генератор не теряется в записи и загрузке', () => {
    const state = ruler()
    const moved = applyCommand(state, { type: 'tick', minutes: 20 * 60 })
    expect(moved.ok).toBe(true)
    if (!moved.ok) return
    const back = deserialize(serialize(moved.state))
    expect(back.ok).toBe(true)
    if (!back.ok) return
    expect(back.state.rng.state).toBe(moved.state.rng.state)
    // И счёт бросков через сейв тот же: поток не перескочил.
    const counted = rollsBetween(state.rng, back.state.rng)
    console.log(`через сейв: бросков ${counted}`)
    expect(rollsMatch(state.rng, back.state.rng, counted)).toBe(true)
    // Загруженный мир продолжает тот же поток, а не начинает свой.
    const onward = applyCommand(back.state, { type: 'tick', minutes: 24 * 60 })
    const straight = applyCommand(moved.state, { type: 'tick', minutes: 24 * 60 })
    expect(onward.ok && straight.ok).toBe(true)
    if (onward.ok && straight.ok) {
      expect(onward.state.rng.state).toBe(straight.state.rng.state)
    }
  })

  it('случайность в числах: век, война, съезд', () => {
    const from = createRng(9)
    const century = tickPolitics(world, politics, settlements, 100 * DAYS_PER_YEAR, from)
    const rolled = rollRoll(from, century.rng, 100 * DAYS_PER_YEAR)
    console.log(rolled.says)
    console.log(
      `за век: войн ${century.politics.wars.length}, бросков на войну ${Math.round(
        rolled.rolls / Math.max(1, century.politics.wars.length),
      )}`,
    )
    expect(rolled.rolls).toBeGreaterThan(1000)
    expect(rollsMatch(from, century.rng, rolled.rolls)).toBe(true)
  })
})
