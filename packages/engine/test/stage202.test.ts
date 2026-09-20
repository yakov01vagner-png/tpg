import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { NUDGE } from '../src/content/nudge'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { ignoring, nudgeRoll, nudgesNow, oneGesture } from '../src/nudge'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 202: что делать дальше.
 *
 * Список заданий превращает песочницу в очередь и врёт о том, чем игра
 * является.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const them = Object.keys(world.kingdoms)[0] as string

function poor(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40 }), 1, world)
  return { ...game, politics, settlements, time: WORLD_START }
}

function lord(): GameState {
  const base = poor()
  const mine = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, 3)
  const map = { ...base.settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...base,
    settlements: map,
    character: { ...base.character, money: 9000 },
    debts: [{ lender: 'guild', owed: 3000, sinceDay: 1, paidDay: 1 }],
    politics: {
      ...politics,
      wars: [{ a: PLAYER, b: them, since: 100, reason: 'спор о марке' }],
    },
  }
}

describe('Дл1–Дл2, Дл4: совет из мира, дорог несколько, причина названа', () => {
  it('у нищего бродяги и у воюющего лорда советы разные', () => {
    const early = nudgesNow(poor(), world, 200)
    for (const one of early) console.log(one.says)
    console.log('—')
    const late = nudgesNow(lord(), world, 200)
    for (const one of late) console.log(one.says)
    expect(early.map((one) => one.id)).toContain('coin')
    expect(late.map((one) => one.id)).toContain('war')
    expect(late.map((one) => one.id)).not.toContain('coin')
  })

  it('дорог несколько, и все о разном', () => {
    const rows = nudgesNow(lord(), world, 200)
    expect(rows.length).toBeGreaterThan(2)
    expect(rows.length).toBeLessThanOrEqual(NUDGE.shows)
    // Две подсказки об одном и том же — это одна подсказка дважды.
    expect(new Set(rows.map((one) => one.side)).size).toBe(rows.length)
    expect(rows.every((one) => one.says.includes('Почему сейчас:'))).toBe(true)
  })
})

describe('Дл3, Дл5: не навязывает и сводится в один жест', () => {
  it('совет ничего не меняет и почти ни к чему не обязывает', () => {
    const state = poor()
    const before = JSON.stringify(state)
    const rows = nudgesNow(state, world, 200)
    // Подсказка — чтение, а не ход: состояние после неё то же самое.
    expect(JSON.stringify(state)).toBe(before)
    const free = ignoring(state, world, 200)
    console.log(free.says)
    expect(free.free).toBe(rows.length)
    expect(free.costly).toBe(0)
    // А у лорда цена бездействия есть — но она та же, что была бы и без совета.
    const heavy = ignoring(lord(), world, 200)
    console.log(heavy.says)
    expect(heavy.costly).toBeGreaterThan(0)
  })

  it('на каждом открытом экране названо главное дело', () => {
    const rows = oneGesture(lord(), world, 200)
    for (const one of rows) console.log(`${one.screen}: ${one.deed}`)
    expect(rows.length).toBeGreaterThan(2)
    expect(rows.every((one) => one.deed.length > 0)).toBe(true)
  })
})

describe('Дл6: подсказка в числах', () => {
  it('сколько советов, о скольких сторонах жизни и сколько ни к чему не обязывают', () => {
    const early = nudgeRoll(poor(), world, 200)
    console.log(early.says)
    const late = nudgeRoll(lord(), world, 200)
    console.log(late.says)
    expect(early.sides).toBe(early.shown)
    expect(late.free).toBeLessThan(late.shown)
    // Мир без нужды молчит: у того, у кого всё есть, советов меньше.
    const rich: GameState = {
      ...poor(),
      character: { ...poor().character, money: 50000 },
      marks: { a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 },
    }
    expect(nudgeRoll(rich, world, 200).shown).toBeLessThan(early.shown)
  })
})
