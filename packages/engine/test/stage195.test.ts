import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { STANDING } from '../src/content/standing'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import { bondsOf, drift, standingMoves, standingOf, standingRoll } from '../src/standing'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import type { Treaty } from '../src/treaty'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 195: дипломатия в числах.
 *
 * Дипломатии к 1.0 много, но она лежала по разным экранам: строки были, а
 * расклада не было.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const crowns = Object.keys(world.kingdoms)
const foe = crowns[1] as string
const friend = crowns[2] as string
const third = crowns[3] as string

const paper: Treaty = {
  id: 'paper-1',
  a: PLAYER,
  b: third,
  kind: 'trade',
  sinceDay: 100,
  untilDay: 900,
  secret: { id: 'partition', against: foe },
}

function ruler(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, 4)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    settlements: map,
    time: WORLD_START,
    locationId: mine[0]?.locationId ?? game.locationId,
    realm: { name: 'Заречье', sinceDay: 1 },
    treaties: [paper],
    politics: {
      ...politics,
      wars: [{ a: PLAYER, b: foe, since: 300, reason: 'спор о марке' }],
      alliances: [{ a: PLAYER, b: friend, since: 200, byMarriage: true }],
      tributes: [{ from: foe, to: PLAYER, perDay: 12, untilDay: 800 }],
    },
  }
}

describe('Дп1–Дп2: одна сводка, и у каждой связи свой день', () => {
  it('кто с кем, против кого и с какого дня — на одном месте', () => {
    const now = standingOf(ruler(), world, PLAYER, 600)
    console.log(now.says)
    for (const one of now.bonds) console.log(`  ${one.says}`)
    // Одна сторона — одна строка, и война перебивает дань с тем же соседом.
    expect(new Set(now.bonds.map((one) => one.other)).size).toBe(now.bonds.length)
    const war = now.bonds.find((one) => one.other === foe)
    expect(war?.kind).toBe('war')
    expect(war?.since).toBe(300)
    expect(war?.says).toContain('спор о марке')
    const ally = now.bonds.find((one) => one.other === friend)
    expect(ally?.kind).toBe('ally')
    expect(ally?.says).toContain('скреплён браком')
    expect(ally?.says).toContain('200 сут')
    // Расклад — число: война весит против, союз и бумага за.
    expect(now.weight).toBe(
      now.bonds.reduce(
        (sum, one) =>
          sum + ({ war: -3, ally: 3, tribute: 1, paper: 2, warm: 1, cold: -1 }[one.kind] as number),
        0,
      ),
    )
  })
})

describe('Дп3–Дп4: что сложится и что с этим делать', () => {
  it('видно, что будет, если не менять ничего', () => {
    const state = ruler()
    const ahead = drift(state, world, PLAYER, 600)
    for (const one of ahead) console.log(one)
    expect(ahead.some((one) => one.includes('война идёт 300 сут'))).toBe(true)
    // Срок бумаги и дани виден заранее, а не в день окончания.
    expect(ahead.some((one) => one.includes('Дань'))).toBe(true)
    expect(ahead.some((one) => one.includes('бумага истекает'))).toBe(true)
    // За год до срока — молчит: думать ещё рано.
    expect(
      drift(state, world, PLAYER, 900 - STANDING.soonDays - 1).some((one) =>
        one.includes('бумага истекает'),
      ),
    ).toBe(false)
  })

  it('сводка кончается ходами', () => {
    const moves = standingMoves(ruler(), world, PLAYER, 600)
    for (const one of moves) console.log(one)
    expect(moves.length).toBeGreaterThan(0)
    expect(moves.length).toBeLessThanOrEqual(STANDING.shows)
    expect(moves.some((one) => one.includes('о мире'))).toBe(true)
  })
})

describe('Дп5–Дп6: чужими глазами и век дипломатии', () => {
  it('тот же расклад с чужого места, и тайного там не видно', () => {
    const state = ruler()
    const mine = standingOf(state, world, PLAYER, 600)
    const theirs = standingOf(state, world, foe, 600)
    console.log(theirs.says)
    for (const one of theirs.bonds) console.log(`  ${one.says}`)
    // У врага тот же ряд связей, но война считается с его стороны.
    expect(theirs.bonds.find((one) => one.other === PLAYER)?.kind).toBe('war')
    expect(theirs.weight).not.toBe(mine.weight)
    // Тайная статья направлена против него — и он о ней не знает.
    const seenByMe = mine.bonds.find((one) => one.other === third)
    expect(seenByMe?.says).toContain('тайно')
    // Та же бумага между двумя чужими коронами: она видна, статья — нет.
    const alien: GameState = { ...state, treaties: [{ ...paper, a: friend, b: third }] }
    expect(
      standingOf(alien, world, friend, 600).bonds.find((one) => one.other === third)?.says,
    ).toContain('не тебе о ней знать')
    // Пока не раскрыта: раскрытую читают так же, как свою.
    const open: GameState = {
      ...state,
      treaties: [{ ...paper, a: friend, b: third, secret: { id: 'partition', known: true } }],
    }
    expect(
      standingOf(open, world, friend, 600).bonds.find((one) => one.other === third)?.says,
    ).toContain('раздел третьей земли')
  })

  it('дипломатия в числах', () => {
    const state = ruler()
    const rolled = standingRoll(state, world, 600)
    console.log(rolled.says)
    expect(rolled.papers).toBe(1)
    expect(rolled.allies).toBe(1)
    expect(rolled.wars).toBe(1)
    const torn = standingRoll({ ...state, treaties: [{ ...paper, brokenBy: foe }] }, world, 600)
    expect(torn.broken).toBe(1)
    // Порванная бумага уходит из расклада, но остаётся в счёте.
    expect(
      bondsOf({ ...state, treaties: [{ ...paper, brokenBy: foe }] }, world, PLAYER, 600).find(
        (one) => one.other === third,
      )?.kind,
    ).not.toBe('paper')
  })
})
