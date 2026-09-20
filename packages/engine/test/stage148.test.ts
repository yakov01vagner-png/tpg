import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { LEAVES, LEAVE_DEFS, TRACE } from '../src/content/trace'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { theirWay } from '../src/theirway'
import { WORLD_START } from '../src/time'
import { fromFounder, houseFell, houseMemory, traceOf } from '../src/trace'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 148: мир после тебя.
 *
 * Смерть государя не кончает мир, а след считается из того, что стоит в мире:
 * земля, грамоты, родство, долги и имя.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(extra: Partial<GameState> = {}): GameState {
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, 8)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world),
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? '',
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    ...extra,
  }
}

describe('Пс2, Пс3 и Пс6: наследство, след и счёт от основателя', () => {
  it('видно, что стоит в мире от тебя', () => {
    for (const id of LEAVES) console.log(`${LEAVE_DEFS[id].label}: ${LEAVE_DEFS[id].says}`)
    const state = ruler({
      marriages: [
        { kingdomId: kingdoms[0] as string, who: 'self', name: 'Мирава', sinceDay: 200, dowry: 0 },
      ],
      crownDebts: { [kingdoms[1] as string]: { owed: 9000, sinceDay: 100 } },
      house: [
        {
          name: 'Ратибор',
          byname: 'Первый',
          fromDay: 1,
          toDay: 300,
          battles: 4,
          holdings: 3,
          said: 'Начал с трёх мест и оставил дом.',
        },
      ],
      // Имя считается по летописи, а не по пересчёту: здесь смотрят точно.
      log: [
        {
          time: WORLD_START + 100 * 24 * 60,
          text: 'Ты венчан на царство',
          kind: 'world' as const,
        },
        {
          time: WORLD_START + 120 * 24 * 60,
          text: 'В недород ты кормил свою землю хлебом',
          kind: 'world' as const,
        },
      ],
    })
    const trace = traceOf(state, world, day)
    console.log(trace.says)
    expect(trace.left.kin).toBe(1)
    expect(trace.left.name).toBeGreaterThan(0)
    expect(trace.left.debts).toBe(1)

    console.log(fromFounder(state, world, day).says)
    expect(fromFounder(state, world, day).years).toBeGreaterThan(0)
    console.log(houseMemory(state, world, kingdoms[0] as string, day).says)
    console.log(houseFell(state).says)
    expect(houseFell(state).fell).toBe(false)
  })
})

describe('Пс1: мир идёт дальше', () => {
  it('он считается тем же тактом, что и при тебе', () => {
    const state = ruler()
    const before = theirWay(state, world, kingdoms[0] as string, day).share
    let after = state
    for (let i = 0; i < 20; i += 1) after = ok(applyCommand(after, { type: 'rest', hours: 12 }))
    const now = theirWay(after, world, kingdoms[0] as string, day + 10).share
    console.log(
      `за десять суток: путь ${world.kingdoms[kingdoms[0] as string]?.name} ${before} → ${now}, через ${TRACE.afterYears} лет след смотрят снова`,
    )
    expect(after.time).toBeGreaterThan(state.time)
  })
})
