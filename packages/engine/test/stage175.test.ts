import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { HERALD } from '../src/content/herald'
import { createSettlements } from '../src/economy'
import {
  arrived,
  bothSides,
  heraldRoll,
  homeMood,
  onTheWay,
  relationFrom,
  relationsOf,
  wasWrong,
} from '../src/herald'
import { PLAYER } from '../src/holding'
import type { Party } from '../src/party'
import { createRng } from '../src/rng'
import { newsScreen } from '../src/screens'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { roadsFrom } from '../src/world/queries'

/**
 * Этап 175: вести с войны.
 *
 * О бое в журнале появлялась строка — мгновенно и точно. Война, которую ведёшь
 * не ты, была таблицей: ни запоздавшей вести, ни привранной, ни двух
 * победителей одной битвы.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const home = Object.values(settlements).find((one) => one.population > 900)?.locationId ?? ''
const far = roadsFrom(world, home)[0]?.to ?? home

function ruler(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 20000 }), 1, world)
  const map = { ...settlements }
  const mine = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, 3)
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  const party: Party = {
    units: { spearman: 40 },
    morale: 70,
    hungryDays: 0,
    gear: 0.5,
    veterans: 0,
  } as Party
  return {
    ...game,
    politics,
    settlements: map,
    time: WORLD_START,
    locationId: mine[0]?.locationId ?? home,
    quarter: null,
    party,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

describe('Рл1 и Рл2: рассказ вместо строки, и он идёт и врёт', () => {
  it('реляция знает, кто, где, чем кончилось — и сколько шла', () => {
    const one = relationFrom(world, {
      from: PLAYER,
      where: far,
      to: home,
      day: 100,
      won: true,
      fell: 40,
    })
    console.log(one.says)
    expect(one.comesDay).toBeGreaterThan(one.day)
    // Своя победа привирает в свою пользу: павших называют меньше, чем было.
    expect(one.told).toBeLessThan(one.fell)
    const lost = relationFrom(world, {
      from: PLAYER,
      where: far,
      to: home,
      day: 100,
      won: false,
      fell: 40,
    })
    console.log(lost.says)
    expect(lost.told).toBeGreaterThan(lost.fell)
    expect(wasWrong(one)).toBe(true)
  })

  it('пока весть идёт, по ней решать нечего', () => {
    const state: GameState = {
      ...ruler(),
      relations: [
        relationFrom(world, { from: PLAYER, where: far, to: home, day: 100, won: true, fell: 10 }),
      ],
    }
    console.log(`в пути ${onTheWay(state, 100).length}, дошло ${arrived(state, 100).length}`)
    expect(onTheWay(state, 100)).toHaveLength(1)
    expect(arrived(state, 100)).toHaveLength(0)
    const later = arrived(state, 120)
    expect(later).toHaveLength(1)
  })
})

describe('Рл3 и Рл4: своя правда у каждой и слухи в державе', () => {
  it('об одном бое пишут обе стороны, и обе — о победе', () => {
    const [ours, theirs] = bothSides(
      world,
      { side: PLAYER, where: far, day: 100, fell: 30 },
      { side: 'robl', fell: 50 },
      home,
    )
    console.log(ours.says)
    console.log(theirs.says)
    expect(ours.won).toBe(true)
    expect(theirs.won).toBe(true)
    expect(ours.where).toBe(theirs.where)
  })

  it('проигранная война доходит до своих и меняет их', () => {
    const base = ruler()
    const lost: GameState = {
      ...base,
      relations: [
        {
          ...relationFrom(world, {
            from: PLAYER,
            where: far,
            to: home,
            day: 10,
            won: false,
            fell: 60,
          }),
          comesDay: 20,
        },
      ],
    }
    const won: GameState = {
      ...base,
      relations: [
        {
          ...relationFrom(world, {
            from: PLAYER,
            where: far,
            to: home,
            day: 10,
            won: true,
            fell: 10,
          }),
          comesDay: 20,
        },
      ],
    }
    console.log(homeMood(lost, 25).says)
    console.log(homeMood(won, 25).says)
    expect(homeMood(lost, 25).shift).toBeLessThan(0)
    expect(homeMood(won, 25).shift).toBeGreaterThan(0)
    expect(HERALD.defeatUnrest).toBeLessThan(0)
  })
})

describe('Рл5 и Рл6: вести решают, и они считаны', () => {
  it('реляции видны на экране вестей — и дошедшие, и те, что в пути', () => {
    const state: GameState = {
      ...ruler(),
      relations: [
        {
          ...relationFrom(world, {
            from: PLAYER,
            where: far,
            to: home,
            day: 10,
            won: true,
            fell: 20,
          }),
          comesDay: 12,
        },
        relationFrom(world, { from: PLAYER, where: far, to: home, day: 40, won: false, fell: 30 }),
      ],
    }
    const screen = newsScreen(state, world)
    const lines = screen.lines.filter(
      (one) => one.label.startsWith('С войны') || one.label === 'В пути',
    )
    for (const line of lines) console.log(`${line.label}: ${line.value} — ${line.hint}`)
    expect(lines.length).toBeGreaterThan(0)
  })

  it('вести с войны в числах', () => {
    const state: GameState = {
      ...ruler(),
      relations: [
        {
          ...relationFrom(world, {
            from: PLAYER,
            where: far,
            to: home,
            day: 10,
            won: true,
            fell: 20,
          }),
          comesDay: 12,
        },
        relationFrom(world, { from: 'robl', where: far, to: home, day: 40, won: true, fell: 30 }),
      ],
    }
    const rolled = heraldRoll(state, 30)
    console.log(rolled.says)
    expect(rolled.sent).toBe(2)
    expect(rolled.arrived).toBe(1)
    expect(rolled.waiting).toBe(1)
    expect(relationsOf(state)).toHaveLength(2)
  })
})
