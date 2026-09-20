import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { IMPOST } from '../src/content/impost'
import { type Settlement, createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { collectAll, collectAt, impostRoll, risingNow, unrestOf } from '../src/impost'
import { createRng } from '../src/rng'
import { realmScreen } from '../src/screens'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import type { Lord } from '../src/war'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 185: подать и недовольство.
 *
 * Подать бралась сама, а недовольство жило по частям: память мест, настроение
 * черни, обиды вассалов — и мятеж вырастал из своего отдельного счёта.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function ruler(tax: 'light' | 'plain' | 'heavy' = 'plain'): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 20000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 700)
    .slice(0, 5)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  const theirs = politics.lords.filter((one) => one.kingdomId !== null).slice(0, 2)
  const lords: Lord[] = politics.lords.map((one) =>
    theirs.some((row) => row.id === one.id) ? { ...one, kingdomId: PLAYER, loyalty: 30 } : one,
  )
  return {
    ...game,
    politics: { ...politics, lords },
    settlements: map,
    time: WORLD_START,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    realm: { name: 'Заречье', sinceDay: 1 },
    law: { tax, toll: 'plain', levy: 'plain', justice: 'plain' },
  }
}

describe('Пд1 и Пд2: подать берут люди, и тяжесть видно', () => {
  it('сбор считается с утечкой и недобором, и это названо', () => {
    const state = ruler()
    const place = Object.values(state.settlements).find((one) => one.owner === PLAYER) as Settlement
    const row = collectAt(state, world, place.locationId, 1)
    expect(row).toBeTruthy()
    if (!row) return
    console.log(row.says)
    expect(row.due).toBeGreaterThan(0)
    expect(row.taken).toBeLessThanOrEqual(row.due)
    expect(row.leaked).toBeGreaterThan(0)
    // С голодной и разорённой земли берут хуже.
    const poor: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [place.locationId]: { ...place, banditry: 0.6, stock: { ...place.stock, grain: 0 } },
      },
    }
    const thin = collectAt(poor, world, place.locationId, 1)
    console.log(thin?.says)
    expect(thin?.taken ?? 0).toBeLessThan(row.taken)
    const all = collectAll(state, world, 1)
    console.log(all.says)
    expect(all.due).toBeGreaterThan(all.taken)
  })
})

describe('Пд3 и Пд4: один счёт недовольства, и мятеж из него', () => {
  it('видно, откуда недовольство и чем сбивается', () => {
    const light = unrestOf(ruler('light'), world, 1)
    const heavy = unrestOf(ruler('heavy'), world, 1)
    console.log(light.says)
    console.log(heavy.says)
    expect(heavy.score).toBeGreaterThan(light.score)
    expect(heavy.parts.some((one) => one.what.includes('подать'))).toBe(true)
  })

  it('мятеж вырастает из счёта, и у каждого своя сторона', () => {
    const state = ruler('heavy')
    const quiet = risingNow(state, world, 1)
    console.log(quiet.says)
    const angry: GameState = {
      ...state,
      settlements: Object.fromEntries(
        Object.entries(state.settlements).map(([id, one]) => [
          id,
          one.owner === PLAYER ? { ...one, banditry: 0.6, stock: { ...one.stock, grain: 0 } } : one,
        ]),
      ),
    }
    const boiling = risingNow(angry, world, 1)
    console.log(boiling.says)
    expect(unrestOf(angry, world, 1).score).toBeGreaterThan(unrestOf(state, world, 1).score)
    expect(boiling.withThem.length + boiling.withYou.length).toBeGreaterThan(0)
    expect(IMPOST.risesAt).toBeGreaterThan(0)
  })
})

describe('Пд5 и Пд6: стороны названы, и всё это считано', () => {
  it('на экране державы стоят недовольство и сбор', () => {
    const state = ruler('heavy')
    const labels = realmScreen(state, world).lines.map((one) => one.label)
    console.log(labels.join(', '))
    expect(labels).toContain('Недовольство')
    expect(labels).toContain('Сбор подати')
  })

  it('подать и недовольство в числах', () => {
    const state = ruler()
    const rolled = impostRoll(state, world, 1)
    console.log(rolled.says)
    expect(rolled.due).toBeGreaterThan(0)
    expect(rolled.leaked).toBeGreaterThan(0)
  })
})
