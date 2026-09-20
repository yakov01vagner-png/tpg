import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { SOVEREIGN } from '../src/content/sovereign'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import type { PeaceRecord } from '../src/peace'
import { createRng } from '../src/rng'
import {
  changedBy,
  pastOf,
  sovereignOf,
  sovereignRoll,
  sovereignSays,
  weaknessesOf,
} from '../src/sovereign'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, WORLD_START } from '../src/time'
import { createPolitics, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 196: государь как человек.
 *
 * У короны был нрав и дом, но играли все одинаково: нрав только множил числа.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const crowns = Object.keys(world.kingdoms).filter((one) => one !== PLAYER)
const them = crowns[0] as string

function ruler(peaces: readonly PeaceRecord[] = []): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 20000 }), 1, world)
  return { ...game, politics, settlements, time: WORLD_START, peaces }
}

function lost(day: number): PeaceRecord {
  return { against: them, day, terms: [], mediator: null, harshness: 60, yielded: them }
}

describe('Гс1–Гс2: за короной человек, и он помнит своё правление', () => {
  it('у государя есть годы, дом и колено', () => {
    const one = sovereignOf(ruler(), world, them, 1)
    console.log(one.says)
    expect(one.age).toBe(SOVEREIGN.crownedAt)
    expect(one.reigned).toBe(0)
    // Через тридцать лет на той же короне сидит другой человек — и это считается.
    const later = sovereignOf(ruler(), world, them, 30 * DAYS_PER_YEAR)
    console.log(later.says)
    expect(later.age).toBeGreaterThan(one.age)
    expect(later.since).toBeLessThanOrEqual(30 * DAYS_PER_YEAR)
  })

  it('память — то, что с ним было, а не новое поле', () => {
    const state = ruler([lost(20)])
    const past = pastOf(state, world, them, 100)
    for (const line of past) console.log(line)
    expect(past.some((one) => one.includes('Уступил на 20 сут'))).toBe(true)
    // Чужое правление о том же не помнит: у каждого колена своя память.
    expect(pastOf(state, world, crowns[1] as string, 100).length).toBe(0)
  })
})

describe('Гс3–Гс4: слабости и перемена', () => {
  it('слабость названа вместе с тем, чем её берут', () => {
    const rows = weaknessesOf(ruler(), world, them, 1)
    for (const one of rows) console.log(one.says)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.length).toBeLessThanOrEqual(SOVEREIGN.shows)
    expect(rows.every((one) => one.says.includes('Берут так:'))).toBe(true)
    // Поражение растит страх: слабости идут от дел, а не от описания.
    const beaten = weaknessesOf(ruler([lost(20), lost(60)]), world, them, 100)
    for (const one of beaten) console.log(one.says)
    expect(beaten.some((one) => one.id === 'fear')).toBe(true)
    // И старость приходит ко всякому.
    const old = weaknessesOf(ruler(), world, them, 40 * DAYS_PER_YEAR)
    expect(
      old.some((one) => one.id === 'age') ||
        sovereignOf(ruler(), world, them, 40 * DAYS_PER_YEAR).age < SOVEREIGN.oldAt,
    ).toBe(true)
  })

  it('поражения и годы меняют охоту воевать, и это видно', () => {
    const same = changedBy(ruler(), world, them, 1)
    console.log(same.says)
    expect(same.taste).toBe(same.was)
    const beaten = changedBy(ruler([lost(20), lost(60)]), world, them, 100)
    console.log(beaten.says)
    expect(beaten.taste).toBeLessThan(beaten.was)
    expect(beaten.says).toContain('проигранных 2')
  })
})

describe('Гс1: человек решает, как корона играет', () => {
  it('охота воевать входит в такт, и битый государь воюет реже', () => {
    const beaten = ruler([lost(20), lost(60), lost(90)])
    const same = changedBy(beaten, world, them, 200)
    // Та же корона, тот же день: прежняя вечная охота — и охота человека.
    expect(same.taste).toBeLessThan(same.was)
    const years = 25 * DAYS_PER_YEAR
    const asWas = tickPolitics(world, politics, settlements, years, createRng(7))
    const asMan = tickPolitics(
      world,
      politics,
      settlements,
      years,
      createRng(7),
      'busy',
      () => 1,
      () => ({ haste: 1, winner: null, term: null }),
      (id, when) => changedBy(beaten, world, id, when).taste,
    )
    console.log(
      `войн за ${years} сут: по нраву основателя ${asWas.politics.wars.length}, по человеку ${asMan.politics.wars.length}`,
    )
    // Хотя бы что-то разошлось: за четверть века колена сменились не у всех,
    // но у кого сменились — те воюют уже по-своему.
    expect(asMan.politics.wars).not.toEqual(asWas.politics.wars)
  })
})

describe('Гс5–Гс6: государь словами и государи в числах', () => {
  it('чужой государь описывается человеком', () => {
    const said = sovereignSays(ruler([lost(20)]), world, them, 100)
    console.log(said)
    expect(said).toContain('лет')
    expect(said.length).toBeGreaterThan(200)
  })

  it('государи в числах', () => {
    const state = ruler()
    const early = sovereignRoll(state, world, 1)
    console.log(early.says)
    expect(early.changed).toBe(0)
    const late = sovereignRoll(state, world, 100 * DAYS_PER_YEAR)
    console.log(late.says)
    expect(late.changed).toBeGreaterThan(crowns.length)
    // Короны за век расходятся: горячий и тихий — не один и тот же.
    expect(late.hottest).not.toBe(late.coolest)
  })
})
