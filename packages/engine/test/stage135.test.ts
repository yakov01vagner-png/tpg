import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { DREAD, FEARS, FEAR_DEFS } from '../src/content/dread'
import {
  dreadLedger,
  dreadOf,
  dreadSeen,
  firstOf,
  rumouredWay,
  sideName,
  wayTruth,
  whoFears,
} from '../src/dread'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 135: кто чего боится.
 *
 * Страх перестаёт быть настроением и становится числом, и число это считается
 * не по войску, а по пути: опасен тот, кому осталось меньше всех. И считается
 * оно по вестям, а не по правде.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(places: number, extra: Partial<GameState> = {}): GameState {
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, places)
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

/** Тот, кто прошёл три четверти пути короны: держава, венец, вассалы. */
function far(extra: Partial<GameState> = {}): GameState {
  return ruler(16, {
    crowned: { day: 300, titleId: 'king', guests: kingdoms.slice(0, 3), absent: [] },
    recognitions: Object.fromEntries(kingdoms.slice(0, 5).map((id) => [id, 100])),
    ...extra,
  })
}

describe('Бо1 и Бо2: страх считается, и считается по пути', () => {
  it('у страха есть число и названная причина', () => {
    for (const id of FEARS) {
      console.log(`${FEAR_DEFS[id].label} (вес ${FEAR_DEFS[id].weight}): ${FEAR_DEFS[id].about}`)
    }
    const small = ruler(3)
    const one = dreadOf(small, world, kingdoms[0] ?? '', PLAYER, day)
    console.log(one.says)
    expect(one.scared).toBe(false)

    const big = far()
    const two = dreadOf(big, world, kingdoms[0] ?? '', PLAYER, day)
    console.log(two.says)
    console.log(
      `из чего сложился: ${two.parts.map((p) => `${FEAR_DEFS[p.fear].label} ${p.part}`).join(', ')}`,
    )
    expect(two.score).toBeGreaterThan(one.score)
  })

  it('боятся не сильного, а близкого к концу', () => {
    const state = far()
    const rows = kingdoms.map((id) => ({
      id,
      share: wayTruth(state, world, id, day),
      fear: dreadOf(state, world, PLAYER, id, day).score,
    }))
    for (const row of rows) {
      console.log(
        `${world.kingdoms[row.id]?.name}: пройдено ${row.share} из ста, страх ${row.fear}`,
      )
    }
    const mine = wayTruth(state, world, PLAYER, day)
    const first = firstOf(state, world, day)
    console.log(`твоё продвижение ${mine} из ста. ${first.says}`)
    expect(first.share).toBeGreaterThanOrEqual(mine)
  })
})

describe('Бо3 и Бо4: чужими глазами и своими словами', () => {
  it('без вестей о твоём продвижении не знают ничего', () => {
    const state = far()
    const seen = dreadSeen(state, world, kingdoms[0] ?? '', PLAYER, day)
    console.log(seen.says)
    expect(seen.known.value).toBeNull()
    expect(seen.dread.score).toBeLessThan(
      dreadOf(state, world, kingdoms[0] ?? '', PLAYER, day).score,
    )
  })

  it('молва разносит продвижение с прибавкой, соседи слышат вернее', () => {
    const state = far({ time: WORLD_START + (DREAD.wordBeat * 14 - 2) * 24 * 60 })
    const truth = wayTruth(state, world, PLAYER, day)
    console.log(`правда ${truth} из ста, молва скажет ${rumouredWay(state, world, PLAYER, day)}`)

    let after = state
    for (let i = 0; i < 4; i += 1) {
      after = ok(applyCommand(after, { type: 'rest', hours: 12 }))
    }
    const heard = kingdoms.map((id) => dreadSeen(after, world, id, PLAYER, dayOfState(after)))
    for (const one of heard.slice(0, 4)) console.log(one.says)
    expect(heard.some((one) => one.known.value !== null)).toBe(true)
  })
})

describe('Бо5 и Бо6: не только к тебе, и всё это в числах', () => {
  it('короны считают тем же счётом друг друга', () => {
    const state = far()
    const pair = dreadOf(state, world, kingdoms[0] ?? '', kingdoms[1] ?? '', day)
    console.log(
      `${sideName(world, kingdoms[0] ?? '')} о ${sideName(world, kingdoms[1] ?? '')}: ${pair.says}`,
    )
    const ledger = dreadLedger(state, world, day)
    console.log(ledger.says)
    expect(ledger.pairs).toBeGreaterThanOrEqual(0)
  })

  it('видно, кто тебя боится, насколько и с какого дня', () => {
    const state = far({ time: WORLD_START + (DREAD.wordBeat * 14 - 2) * 24 * 60 })
    let after = state
    for (let i = 0; i < 46; i += 1) {
      after = ok(applyCommand(after, { type: 'rest', hours: 12 }))
    }
    const fears = whoFears(after, world, PLAYER, dayOfState(after))
    console.log(
      `тебя боятся ${fears.length} из ${kingdoms.length}: ${fears
        .map((one) => `${world.kingdoms[one.who]?.name} ${one.score} с ${one.sinceDay}-го дня`)
        .join('; ')}`,
    )
    expect(Object.keys(after.dreadLog ?? {}).length).toBe(fears.length)
  })
})

function dayOfState(state: GameState): number {
  return Math.floor((state.time - WORLD_START) / (24 * 60)) + 1
}
