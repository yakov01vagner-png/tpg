import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { FIELD_WORK_DEFS, type FieldWork, TILLAGE } from '../src/content/tillage'
import { type Settlement, createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import { realmScreen } from '../src/screens'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import {
  bread,
  fieldSays,
  fieldWork,
  needsAt,
  tillageRoll,
  warHarvest,
  whyIncome,
  whySpent,
} from '../src/tillage'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 177: хозяйство, которое видно.
 *
 * Хозяйство считалось честно, а видно его было плохо: в казну капало число, и
 * почему оно такое, не сказано нигде. Здесь оно объясняется — и ни одной новой
 * величины при этом не заводится.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function ruler(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 20000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, 5)
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

describe('Хз1: год земли', () => {
  it('у хозяйства есть год, и война приходится на страду', () => {
    const seen = new Set<FieldWork>()
    for (let day = 1; day <= 365; day += 15) seen.add(fieldWork(day))
    console.log(`за год: ${[...seen].map((one) => FIELD_WORK_DEFS[one].label).join(', ')}`)
    expect(seen.size).toBeGreaterThanOrEqual(4)
    const state = ruler()
    const atWar: GameState = {
      ...state,
      politics: { ...state.politics, wars: [{ a: PLAYER, b: 'robl', since: 1, reason: 'спор' }] },
    }
    console.log(fieldSays(state, 220))
    console.log(fieldSays(atWar, 220))
    expect(warHarvest(state, 220)).toBe(1)
    expect(warHarvest(atWar, 220)).toBeLessThan(1)
    expect(fieldSays(atWar, 220)).toContain('страду')
  })
})

describe('Хз2 и Хз3: откуда приходит и куда уходит', () => {
  it('всякая статья объяснена, и видно, что срезать', () => {
    const state = ruler()
    const income = whyIncome(state, world, 1)
    for (const one of income) console.log(`${one.what} ${one.sum}: ${one.why}`)
    expect(income.length).toBeGreaterThan(0)
    for (const one of income) expect(one.why.length).toBeGreaterThan(20)
    const spent = whySpent(state, world, 1)
    for (const one of spent.rows) console.log(`${one.what} ${one.sum}: ${one.why}`)
    console.log(spent.cut)
    expect(spent.cut.length).toBeGreaterThan(20)
  })

  it('и это стоит на экране державы, а не в подвале', () => {
    const state = ruler()
    const labels = realmScreen(state, world).lines.map((one) => one.label)
    console.log(labels.join(', '))
    expect(labels).toContain('Откуда приходит')
    expect(labels).toContain('Куда уходит')
    expect(labels).toContain('Год земли')
    expect(labels).toContain('Хлеб')
  })
})

describe('Хз4 и Хз5: голод, излишек и постройка как решение', () => {
  it('видно, где едят запас и где хлеб лишний', () => {
    const state = ruler()
    const mine = Object.values(state.settlements).filter((one) => one.owner === PLAYER)
    const first = mine[0] as Settlement
    const starving: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [first.locationId]: { ...first, stock: { ...first.stock, grain: 0 } },
      },
    }
    console.log(bread(state, world, 1).says)
    console.log(bread(starving, world, 1).says)
    expect(bread(starving, world, 1).hungry.length).toBeGreaterThan(0)
  })

  it('нужда места называет постройку и причину', () => {
    const state = ruler()
    const mine = Object.values(state.settlements).filter((one) => one.owner === PLAYER)
    for (const one of mine.slice(0, 4)) {
      const need = needsAt(state, world, one.locationId)
      console.log(`${world.locations[one.locationId]?.name}: ${need.build ?? '—'} — ${need.why}`)
      expect(need.why.length).toBeGreaterThan(10)
    }
    // Разбой требует стен, пустой амбар — амбара.
    const first = mine[0] as Settlement
    const raided: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [first.locationId]: { ...first, banditry: 0.5, buildings: ['granary'] },
      },
    }
    expect(needsAt(raided, world, first.locationId).build).toBe('walls')
    expect(TILLAGE.needsWalls).toBeLessThan(1)
  })
})

describe('Хз6: хозяйство в числах по всему миру', () => {
  it('голод и излишек считаются не только у игрока', () => {
    const state = ruler()
    const rolled = tillageRoll(state, world, 1)
    console.log(rolled.says)
    expect(rolled.places).toBeGreaterThan(50)
    expect(rolled.hungry + rolled.spare).toBeLessThanOrEqual(rolled.places)
  })
})
