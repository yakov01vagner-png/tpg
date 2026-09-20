import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { INSIDE_DEFS, LEAGUER } from '../src/content/leaguer'
import { type Settlement, createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import {
  insideVoices,
  leaguerRoll,
  reliefFor,
  siegeTally,
  surrenderNow,
  weekSays,
} from '../src/leaguer'
import type { Party } from '../src/party'
import { createRng } from '../src/rng'
import type { Siege } from '../src/siege'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 172: осада, которая читается.
 *
 * Осада считалась по частям: запас отдельно, стены отдельно, подкоп отдельно,
 * вылазки отдельно. Под стенами шли сутки, а не осада. Здесь всё сведено в
 * один счёт, и счёт этот один для обеих сторон.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const town =
  Object.values(settlements).find((one) => one.population > 1200 && one.owner !== null) ??
  Object.values(settlements)[0]

function besieger(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 9000 }), 1, world)
  const party: Party = {
    units: { spearman: 80 },
    morale: 70,
    hungryDays: 0,
    gear: 0.5,
    veterans: 0,
  }
  return {
    ...game,
    politics,
    settlements,
    time: WORLD_START,
    locationId: town?.locationId ?? game.locationId,
    quarter: null,
    party,
  }
}

function ok(result: ReturnType<typeof applyCommand>): GameState {
  if (!result.ok) throw new Error(result.message)
  return result.state
}

const siege: Siege = { locationId: town?.locationId ?? '', days: 10 }

describe('Ос1 и Ос2: один счёт, и он один для обеих сторон', () => {
  it('запас, стены, машины, подкоп и мор сведены в срок', () => {
    const state = besieger()
    const tally = siegeTally(state, world, siege, 10)
    console.log(tally.says)
    expect(tally.stores).toBeGreaterThanOrEqual(0)
    expect(tally.falls).toBeGreaterThan(0)
    // Машины и пролом срок сокращают, и это видно числом.
    const withEngines = siegeTally(
      state,
      world,
      { ...siege, engines: ['ram', 'tower'] as never },
      10,
    )
    const breached = siegeTally(state, world, { ...siege, breached: true }, 10)
    console.log(
      `срок: без машин ${tally.falls}, с машинами ${withEngines.falls}, с проломом ${breached.falls}`,
    )
    expect(withEngines.falls).toBeLessThan(tally.falls)
    expect(breached.falls).toBeLessThan(tally.falls)
  })

  it('мор приходит со временем и теснотой, а не броском', () => {
    const state = besieger()
    const young = siegeTally(state, world, { ...siege, days: 5 }, 5)
    const old = siegeTally(state, world, { ...siege, days: 60 }, 60)
    console.log(`мор: на 5-е сутки ${young.sickness}, на 60-е ${old.sickness}`)
    expect(young.sickness).toBe(0)
    expect(old.sickness).toBeGreaterThan(0)
    expect(LEAGUER.sicknessFrom).toBeGreaterThan(7)
    // Из одного состояния — один и тот же мор.
    expect(siegeTally(state, world, { ...siege, days: 60 }, 60).sickness).toBe(old.sickness)
  })
})

describe('Ос3 и Ос4: город внутри и помощь снаружи', () => {
  it('горожане, гарнизон и владетель ломаются в своём порядке', () => {
    const state = besieger()
    const full = insideVoices(state, world, siege, 10)
    for (const one of full) console.log(`${INSIDE_DEFS[one.who].label}: ${one.says}`)
    // Голодный город говорит иначе, чем сытый.
    const starved: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [siege.locationId]: {
          ...(state.settlements[siege.locationId] as Settlement),
          stock: { ...(state.settlements[siege.locationId] as Settlement).stock, grain: 0 },
        },
      },
    }
    const hungry = insideVoices(starved, world, siege, 10)
    for (const one of hungry) console.log(`${INSIDE_DEFS[one.who].label}: ${one.says}`)
    expect(hungry.filter((one) => one.breaking).length).toBeGreaterThanOrEqual(
      full.filter((one) => one.breaking).length,
    )
    console.log(
      `готовность сдаться: сытый ${Math.round(surrenderNow(state, world, siege, 10) * 100)}, голодный ${Math.round(surrenderNow(starved, world, siege, 10) * 100)}`,
    )
    expect(surrenderNow(starved, world, siege, 10)).toBeGreaterThan(
      surrenderNow(state, world, siege, 10),
    )
  })

  it('подмога и свободный выход названы', () => {
    const state = besieger()
    const relief = reliefFor(state, world, siege, 10)
    console.log(relief.says)
    console.log(relief.freeExit)
    expect(relief.freeExit).toContain('свободный выход'.slice(1))
    expect(typeof relief.coming).toBe('boolean')
  })
})

describe('Ос5 и Ос6: осада словами и в числах', () => {
  it('неделя под стенами рассказывается', () => {
    const state = besieger()
    const lines = weekSays(state, world, { ...siege, days: 40, breached: true }, 40)
    for (const line of lines) console.log(line)
    expect(lines.length).toBeGreaterThan(0)
    // И это доходит до игрока сквозь команду ожидания.
    const waiting = ok(
      applyCommand({ ...state, siege: { ...siege, days: 34 } }, { type: 'siegeWait', days: 7 }),
    )
    // Смотрим весь журнал этой команды: под стенами за неделю случается много
    // чего ещё (жалованье, голод в лагере), и рассказ осады стоит среди этого.
    const said = waiting.log.map((one) => one.text)
    for (const line of said.filter((one) => one.includes('сутки') || one.includes('пролом'))) {
      console.log(`  ${line}`)
    }
    expect(said.some((one) => one.includes('-е сутки'))).toBe(true)
  })

  it('осады в числах', () => {
    const rolled = leaguerRoll([
      { days: 40, end: 'taken' },
      { days: 12, end: 'lifted' },
      { days: 95, end: 'taken' },
    ])
    console.log(rolled.says)
    expect(rolled.sieges).toBe(3)
    expect(rolled.taken).toBe(2)
    expect(rolled.days).toBe(147)
  })
})
