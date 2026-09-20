import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { PLAYER, holdingsOf } from '../src/holding'
import { legendFrom, legendsOf, legendsSay, newLifeIn } from '../src/newlife'
import { createRng } from '../src/rng'
import { deserialize, serialize } from '../src/save'
import { SCHEMA_VERSION } from '../src/state'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 157: новая игра в старом мире.
 *
 * Мир не сбрасывается: границы, кривые, эпохи и летопись — те, к которым он
 * пришёл, а прежний герой остаётся в нём преданием.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(name: string, places: number): GameState {
  const base = createGame(createCharacter({ name, money: 20000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, places)
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
    log: [
      { time: WORLD_START + 100 * 24 * 60, text: 'Ты венчан на царство', kind: 'world' as const },
      {
        time: WORLD_START + 120 * 24 * 60,
        text: 'Престол Робла взят приступом',
        kind: 'war' as const,
      },
    ],
  }
}

describe('Нг1–Нг4: мир остаётся, а прежний уходит в предания', () => {
  it('новая жизнь начинается в том же мире', () => {
    const first = ruler('Ратша', 9)
    const legend = legendFrom(first, world, day)
    console.log(`предание: ${legend.says}`)

    const second = newLifeIn(first, createCharacter({ name: 'Всеслав', money: 500 }), day)
    console.log(legendsSay(second, world, day))
    console.log(
      `мир: день ${Math.round((second.time - WORLD_START) / (24 * 60)) + 1}, мест у тебя ${holdingsOf(second.settlements, PLAYER).length}, летописи ${second.log.length} строк, преданий ${legendsOf(second).length}`,
    )
    expect(legendsOf(second)).toHaveLength(1)
    expect(holdingsOf(second.settlements, PLAYER)).toHaveLength(0)
    expect(second.time).toBe(first.time)
    expect(second.character.name).toBe('Всеслав')
    // Границы остались чужими: земля прежнего вышла из-под руки, но мир цел.
    expect(Object.keys(second.settlements)).toHaveLength(Object.keys(first.settlements).length)
  })
})

describe('Нг5 и Нг6: три партии подряд, и сейв это держит', () => {
  it('мир не вырождается, а сейв остаётся в бюджете', () => {
    let state = ruler('Первый', 6)
    for (let life = 2; life <= 4; life += 1) {
      state = ok(applyCommand(state, { type: 'tick', minutes: MINUTES_PER_DAY }))
      const at = Math.round((state.time - WORLD_START) / (24 * 60)) + 1
      state = newLifeIn(state, createCharacter({ name: `Жизнь ${life}`, money: 500 }), at)
    }
    const raw = serialize(state)
    const kb = Math.round(raw.length / 1024)
    console.log(
      `после трёх жизней: преданий ${legendsOf(state).length}, летописи ${state.log.length} строк, сейв ${kb} КБ, схема ${SCHEMA_VERSION}`,
    )
    expect(legendsOf(state)).toHaveLength(3)
    expect(kb).toBeLessThan(1024)
    expect(deserialize(raw).ok).toBe(true)
  })
})
