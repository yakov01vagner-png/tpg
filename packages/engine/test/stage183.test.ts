import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { churchOf } from '../src/church'
import {
  churchAbroad,
  churchTalk,
  churchWealth,
  clergyOf,
  clergyRoll,
  devoutAt,
} from '../src/clergy'
import { CENSURE_DEFS } from '../src/content/church'
import { CLERGY, CLERGY_DEFS } from '../src/content/clergy'
import { type Settlement, createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 183: церковь как сила.
 *
 * У церкви была земля, десятина, замыслы и счёт недовольства — и ни одного
 * человека: обители безымянны, епископов нет, а спор решался кнопкой
 * «уступить». Церковь была погодой: она случалась, но с ней нельзя было
 * говорить.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function ruler(anger = 0): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 900)
    .slice(0, 4)
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
    churchAnger: anger,
  }
}

describe('Цр1 и Цр2: у церкви свои люди и своя выгода', () => {
  it('настоятели, епископы и проповедники — люди с нравами', () => {
    const state = ruler()
    const people = clergyOf(state, world, 1)
    for (const one of people.slice(0, 5)) console.log(one.says)
    expect(people.length).toBeGreaterThan(2)
    expect(people.some((one) => one.rank === 'abbot')).toBe(true)
    expect(people.some((one) => one.rank === 'bishop')).toBe(true)
    // Легат приезжает не всегда, а когда счёт дошёл до кары.
    const angry = clergyOf(ruler(CENSURE_DEFS.interdict.from + 5), world, 1)
    console.log(angry.find((one) => one.rank === 'legate')?.says ?? 'легата нет')
    expect(angry.some((one) => one.rank === 'legate')).toBe(true)
    expect(people.some((one) => one.rank === 'legate')).toBe(false)
    // Из одного состояния — те же люди: они считаются.
    expect(clergyOf(state, world, 1).map((one) => one.name)).toEqual(people.map((one) => one.name))
  })

  it('церковь прирастает землёй и доходом, и это видно', () => {
    const state = ruler()
    const wealth = churchWealth(state, world, 1)
    console.log(wealth.says)
    expect(wealth.houses).toBeGreaterThan(0)
    expect(wealth.income).toBeGreaterThan(0)
    expect(wealth.share).toBeGreaterThan(0)
    expect(CLERGY.perHouse).toBeGreaterThan(0)
  })
})

describe('Цр3 и Цр4: вера в людях и спор разговором', () => {
  it('благочестивое место слушает не тебя', () => {
    const state = ruler()
    const place = Object.values(state.settlements).find((one) => one.owner === PLAYER) as Settlement
    console.log(devoutAt(state, world, place.locationId).says)
    const withChapel: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [place.locationId]: { ...place, buildings: ['chapel'] },
      },
    }
    const devout = devoutAt(withChapel, world, place.locationId)
    console.log(devout.says)
    expect(devout.devout).toBe(true)
  })

  it('спор с церковью — три двери с ценой, а не кнопка', () => {
    const state = ruler(40)
    const man = clergyOf(state, world, 1).find((one) => one.rank === 'bishop')
    expect(man).toBeTruthy()
    if (!man) return
    const doors = churchTalk(state, world, man, 1)
    for (const one of doors) console.log(`${one.door}: ${one.costs} (сбивает ${one.worth})`)
    expect(doors).toHaveLength(3)
    expect(doors[0]?.costs).toContain('серебра')
    // У мирского дороже, у кроткого дешевле: нрав решает цену.
    const worldly = churchTalk(state, world, { ...man, temper: 'worldly' }, 1)
    const meek = churchTalk(state, world, { ...man, temper: 'meek' }, 1)
    console.log(`покаяние: у мирского ${worldly[0]?.costs}, у кроткого ${meek[0]?.costs}`)
    expect(worldly[0]?.worth).not.toBe(meek[0]?.worth)
  })
})

describe('Цр5 и Цр6: церковь среди корон и в числах', () => {
  it('у церкви свои отношения с каждой короной', () => {
    const state = ruler()
    const rows = churchAbroad(state, world, 1)
    for (const one of rows.slice(0, 4)) console.log(one.says)
    expect(rows.length).toBe(Object.keys(world.kingdoms).length)
    expect(rows.some((one) => one.with)).toBe(true)
  })

  it('церковь в числах', () => {
    const state = ruler(30)
    const rolled = clergyRoll(state, world, 1)
    console.log(rolled.says)
    expect(rolled.people).toBeGreaterThan(0)
    expect(rolled.anger).toBe(30)
    expect(churchOf(state, world, 1).places).toBe(rolled.houses)
    expect(CLERGY_DEFS.legate.weight).toBeGreaterThan(CLERGY_DEFS.abbot.weight)
  })
})
