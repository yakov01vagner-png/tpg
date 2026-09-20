import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { ENDINGS } from '../src/content/ending'
import { ERAS } from '../src/content/era'
import { DEFEATS } from '../src/content/risk'
import { WAYS } from '../src/content/way'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import { deserialize, serialize } from '../src/save'
import type { GameState } from '../src/state'
import { SCHEMA_VERSION, createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { worldGrid } from '../src/world/grid'
import { MAP_SIZE } from '../src/world/layout'

/**
 * Этап 160: век и бюджет 0.9.
 *
 * Закрытие версии: бюджет, миграция сейва и содержимое числом.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const day = 400

function fastest(run: () => void, times: number): number {
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < times; i += 1) {
    const began = performance.now()
    run()
    best = Math.min(best, performance.now() - began)
  }
  return best
}

function ruler(): GameState {
  const base = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, 12)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...base,
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? base.locationId,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

describe('Б1 и Б2: бюджет и то, что пути даром', () => {
  it('сутки, час, сетка и сейв укладываются в телефон', { retry: 2 }, () => {
    const fresh = createGame(createCharacter({ name: 'Т' }), 1, world)
    const dayMs = fastest(() => {
      applyCommand(fresh, { type: 'tick', minutes: MINUTES_PER_DAY })
    }, 25)
    const hourMs = fastest(() => {
      applyCommand(fresh, { type: 'tick', minutes: 60 })
    }, 25)
    const state = ruler()
    const midMs = fastest(() => {
      applyCommand(state, { type: 'tick', minutes: MINUTES_PER_DAY })
    }, 25)
    const gridMs = fastest(() => {
      worldGrid(world, MAP_SIZE)
    }, 5)
    const save = serialize(state)
    const kb = Math.round(save.length / 1024)
    console.log(
      `сутки ${dayMs.toFixed(2)} мс, час ${hourMs.toFixed(2)} мс, середина партии ${midMs.toFixed(2)} мс, сетка ${gridMs.toFixed(1)} мс, сейв ${kb} КБ, схема ${SCHEMA_VERSION}`,
    )
    // Границы те же, что в 0.7 и 0.8; в этом файле они меряются на свежем мире.
    expect(dayMs).toBeLessThan(12)
    expect(hourMs).toBeLessThan(1)
    expect(gridMs).toBeLessThan(45)
    expect(kb).toBeLessThan(1024)
  })
})

describe('Б3: сейв 0.8 играет дальше', () => {
  it('миграция одна, и после неё поля 0.9 на месте', () => {
    const old = ruler()
    // Сейв 0.8: схема прежняя, полей 0.9 в нём нет вовсе.
    const raw = serialize({ ...old, schemaVersion: 24 } as GameState)
    const stripped = JSON.parse(raw) as Record<string, unknown>
    for (const key of [
      'union',
      'recognitions',
      'crownDebts',
      'anointed',
      'dreadLog',
      'league',
      'guarantees',
      'hands',
      'given',
      'crownWays',
      'raceLog',
      'curves',
      'era',
      'annals',
      'taken',
      'fallenLog',
      'legends',
    ]) {
      delete stripped[key]
    }
    const loaded = deserialize(JSON.stringify(stripped))
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    console.log(
      `сейв 0.8 поднят: схема ${loaded.state.schemaVersion}, пути ${loaded.state.crownWays ? 'есть' : 'нет'}, кривые ${loaded.state.curves ? 'есть' : 'нет'}, предания ${(loaded.state.legends ?? []).length}`,
    )
    expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(loaded.state.crownWays).toBeDefined()
    expect(loaded.state.curves).toBeDefined()
    // И игра с него идёт дальше.
    const after = applyCommand(loaded.state, { type: 'tick', minutes: MINUTES_PER_DAY })
    expect(after.ok).toBe(true)
  })
})

describe('Б4: содержимое числом', () => {
  it('пути, эпохи, концы и степени поражения посчитаны', () => {
    console.log(
      `путей ${WAYS.length}, эпох ${ERAS.length}, концов ${ENDINGS.length}, степеней поражения ${DEFEATS.length}, схема ${SCHEMA_VERSION}`,
    )
    expect(WAYS.length).toBe(5)
    expect(ERAS.length).toBe(6)
    expect(ENDINGS.length).toBe(8)
    expect(DEFEATS.length).toBe(6)
  })
})
