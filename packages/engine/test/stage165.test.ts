import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { coinAfterBeat, coinOf, coinRoll, poorHaste, purseOf, startingCoin } from '../src/coin'
import { applyCommand } from '../src/commands'
import { COIN } from '../src/content/coin'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { knownTo } from '../src/known'
import { createRng } from '../src/rng'
import { SCHEMA_VERSION } from '../src/state'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import type { War } from '../src/war'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 165: казна короны как вещь.
 *
 * Чужого серебра в игре не было: казну считали по числу мест, и потому её
 * нельзя было ни истощить, ни наполнить. Война не стоила короне ничего, дань не
 * приносила ничего, а заём игрока уходил в пустоту. Здесь у неё есть число,
 * которое растёт, тратится и кончается.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const [first, second] = kingdoms as [string, string]

function base(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
  const taken = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, 4)
  const map = { ...settlements }
  for (const one of taken) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    politics,
    settlements: map,
    time: WORLD_START,
    locationId: taken[0]?.locationId ?? game.locationId,
    quarter: null,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

function ok(result: ReturnType<typeof applyCommand>): GameState {
  if (!result.ok) throw new Error(result.message)
  return result.state
}

describe('Кз1 и Кз2: серебро, у которого названы приход и расход', () => {
  it('мирный год корона сводит с прибытком, военный — в убыток', () => {
    const state = base()
    const war: War = { a: first, b: second, since: 1, reason: 'спор о марке' }
    const fighting: GameState = {
      ...state,
      politics: { ...state.politics, wars: [war] },
    }
    const peace = purseOf(state, world, first, 30)
    const fight = purseOf(fighting, world, first, 30)
    console.log(peace.says)
    console.log(fight.says)
    expect(peace.income).toBeGreaterThan(peace.spend)
    expect(fight.spend).toBeGreaterThan(peace.spend)
    expect(fight.income - fight.spend).toBeLessThan(0)
    // Части названы, а не свалены в одно число.
    expect(peace.tax).toBeGreaterThan(0)
    expect(peace.tolls).toBeGreaterThan(0)
    expect(peace.army).toBeGreaterThan(0)
    expect(peace.court).toBeGreaterThan(0)
  })

  it('казна растёт и тратится, а не пересчитывается по земле заново', () => {
    const state = base()
    expect(coinOf(state, world, first, 1)).toBe(startingCoin(state, world, first))
    const after = coinAfterBeat(state, world, first, 30, COIN.beat)
    console.log(`${first}: ${coinOf(state, world, first, 1)} → ${after.coin} за такт`)
    expect(after.coin).toBeGreaterThan(coinOf(state, world, first, 1))
    // Хранимое число весит больше счёта по земле: казну свели — её и читают.
    const kept: GameState = { ...state, crownCoin: { [first]: 777 } }
    expect(coinOf(kept, world, first, 1)).toBe(777)
  })
})

describe('Кз3 и Кз4: пустая казна видна по делам, а заём в неё входит', () => {
  it('разорившаяся корона занимает и ищет мира первой', () => {
    const state = base()
    const poor: GameState = { ...state, crownCoin: { [first]: 300 } }
    const purse = purseOf(poor, world, first, 30)
    console.log(purse.says)
    expect(purse.empty).toBe(true)
    expect(poorHaste(poor, world, first, 30)).toBeGreaterThan(1)
    expect(poorHaste(state, world, first, 30)).toBe(1)
    // Война съедает казну до дна, и тогда корона занимает.
    const war: War = { a: first, b: second, since: 1, reason: 'спор о марке' }
    const broke: GameState = {
      ...poor,
      crownCoin: { [first]: 100 },
      politics: { ...state.politics, wars: [war] },
    }
    const after = coinAfterBeat(broke, world, first, 30, COIN.beat)
    console.log(
      `${first} воюет с пустой казной: ${100} → ${after.coin}${after.borrowed ? ', заняв' : ''}`,
    )
    expect(after.borrowed).toBe(true)
    expect(after.broke).toBe(true)
    // Долг перед игроком (этап 133) платится из той же казны.
    const owing: GameState = { ...state, crownDebts: { [first]: { owed: 40000, sinceDay: 1 } } }
    const paid = coinAfterBeat(owing, world, first, 30, COIN.beat)
    console.log(`${first} с долгом в 40000: за такт ${paid.coin} против ${after.coin} без долга`)
    expect(paid.coin).toBeLessThan(coinAfterBeat(state, world, first, 30, COIN.beat).coin)
  })
})

describe('Кз5 и Кз6: чужое серебро известно не точно, и деньги мира считаны', () => {
  it('казна соседа доходит вестями, а не глазами', () => {
    const state = base()
    const known = knownTo(state, world, PLAYER, { kind: 'purse', about: first }, 1)
    console.log(`о казне ${first}: ${known.value ?? 'не знаешь ничего'} — ${known.says}`)
    expect(known.value).toBe(null)
    expect(known.source).toBe(null)
  })

  it('за год казна мира сходится, и такт её ведёт', () => {
    let state = base()
    const before = coinRoll(state, world, 1)
    console.log(before.says)
    for (let i = 0; i < 200; i += 1) {
      state = ok(applyCommand(state, { type: 'rest', hours: 12 }))
      state = ok(applyCommand(state, { type: 'rest', hours: 12 }))
    }
    const after = coinRoll(state, world, 200)
    console.log(after.says)
    expect(Object.keys(state.crownCoin ?? {})).toHaveLength(kingdoms.length)
    expect(after.total).not.toBe(before.total)
    // Схема растёт с каждой версией: проверяется, что поле этого этапа
    // в ней уже есть, а не точное число — иначе следующий этап ломает
    // чужую проверку.
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(26)
  })
})
