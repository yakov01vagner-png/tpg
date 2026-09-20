import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { crownsDiffer, mindRoll, weightsUsed, worldMind } from '../src/brain'
import { createCharacter } from '../src/character'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import { changedBy } from '../src/sovereign'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, WORLD_START } from '../src/time'
import { createPolitics, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 200: ИИ в числах.
 *
 * К 1.0 у корон есть человек, объяснимое решение, учение и партия против
 * игрока. Проверить, что это не одно и то же с разными именами, было нечем.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const crowns = Object.keys(world.kingdoms).filter((one) => one !== PLAYER)

function ruler(over: Partial<GameState> = {}): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 20000 }), 1, world)
  return { ...game, politics, settlements, time: WORLD_START, ...over }
}

/**
 * Век мира тактом: без игрока и с игроком, который держит землю.
 *
 * Прогон один и тот же, кроме одного — держит ли игрок места. Оттого разница в
 * числах и есть то, что изменил он, а не другой жребий.
 */
function century(mine: number): GameState {
  const places = { ...settlements }
  if (mine > 0) {
    for (const one of Object.values(settlements)
      .filter((row) => row.population > 800)
      .slice(0, mine)) {
      places[one.locationId] = { ...one, owner: PLAYER }
    }
  }
  let over = politics
  let current = places
  let rng = createRng(11)
  let state = ruler({ settlements: current })
  for (let year = 1; year <= 100; year += 1) {
    const day = year * DAYS_PER_YEAR
    const ticked = tickPolitics(
      world,
      over,
      current,
      day,
      rng,
      'busy',
      () => 1,
      () => ({ haste: 1, winner: null, term: null }),
      (id, when) => changedBy(state, world, id, when).taste,
    )
    over = ticked.politics
    current = ticked.settlements
    rng = ticked.rng
    state = ruler({ politics: over, settlements: current })
  }
  return state
}

describe('Ии1–Ии2: сводка мира и разница между коронами', () => {
  it('все стороны, их замыслы, пути и взгляд — на одном месте', () => {
    const rows = worldMind(ruler(), world, 100)
    for (const one of rows) console.log(one.says)
    expect(rows.length).toBe(crowns.length)
    expect(rows.every((one) => one.says.includes('дорога'))).toBe(true)
  })

  it('короны расходятся числом, а не описанием', () => {
    const differ = crownsDiffer(ruler(), world, 100)
    console.log(differ.says)
    expect(differ.aims).toBeGreaterThan(1)
    expect(differ.spread).toBeGreaterThan(0)
  })
})

describe('Ии3–Ии4: век без игрока и век с ним', () => {
  it('мир живёт сам и приходит к чему-то, а игрок это меняет', () => {
    const without = mindRoll(century(0), world, 100 * DAYS_PER_YEAR)
    console.log(`без игрока: ${without.says}`)
    const withMe = mindRoll(century(4), world, 100 * DAYS_PER_YEAR)
    console.log(`с игроком:  ${withMe.says}`)
    // Век без игрока — не пустой: мир воюет, роднится и платит дань.
    expect(without.wars + without.alliances + without.tributes).toBeGreaterThan(0)
    // И тот же век с игроком приходит к другим числам.
    expect([withMe.wars, withMe.alliances, withMe.tributes]).not.toEqual([
      without.wars,
      without.alliances,
      without.tributes,
    ])
  })
})

describe('Ии5–Ии6: ничего не спрятано, и всё сосчитано', () => {
  it('все веса решений лежат в content и читаются', () => {
    const weights = weightsUsed()
    console.log(weights.says)
    for (const file of weights.tables) {
      const text = readFileSync(`packages/engine/src/${file}`, 'utf8')
      // Таблица, на которую ссылаются, обязана существовать и быть непустой:
      // список весов, который нельзя открыть, — обещание, а не список.
      expect(text.length).toBeGreaterThan(200)
    }
    expect(weights.tables.length).toBeGreaterThan(8)
  })

  it('ИИ в числах', () => {
    const rolled = mindRoll(ruler(), world, 100)
    console.log(rolled.says)
    expect(Object.values(rolled.aims).reduce((sum, one) => sum + one, 0)).toBe(crowns.length)
    expect(Object.values(rolled.rules).reduce((sum, one) => sum + one, 0)).toBe(crowns.length)
    expect(rolled.learned).toBe(0)
  })
})
