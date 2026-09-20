import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { STOPS, THEIREND } from '../src/content/theirend'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { endNear, theirEnd, theirEndLedger, waysToStop } from '../src/theirend'
import { theirWay } from '../src/theirway'
import { WORLD_START } from '../src/time'
import { createPolitics, warsOf } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 142: корона доходит до конца.
 *
 * Мир может кончиться не тобой — и это положение, а не экран поражения.
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

describe('Дх2 и Дх3: последний шаг виден, и помешать есть чем', () => {
  it('названо, кому сколько осталось и чем его останавливают', () => {
    const state = ruler()
    const near = endNear(state, world, day)
    console.log(near.says)
    expect(near.who).not.toBeNull()
    for (const one of waysToStop(state, world, near.who ?? '', day)) console.log(one.says)
    expect(waysToStop(state, world, near.who ?? '', day)).toHaveLength(STOPS.length)
  })
})

describe('Дх1, Дх4 и Дх5: чужой конец, мир после него и служба', () => {
  it('дошедший делает мир другим, и в этом мире можно пойти к нему первым человеком', () => {
    const winner = kingdoms
      .map((id) => ({ id, share: theirWay(ruler(), world, id, day).share }))
      .sort((a, b) => b.share - a.share)[0]?.id as string
    const state = ruler({
      theirEnd: { who: winner, sinceDay: day - 400 },
      politics: {
        ...politics,
        wars: [...politics.wars, { a: PLAYER, b: winner, since: day - 50, reason: 'поздно' }],
      },
      time: WORLD_START + (THEIREND.beat * 21 - 2) * 24 * 60,
    })
    console.log(theirEnd(state, world, day).says)
    expect(theirEnd(state, world, day).who).toBe(winner)

    const served = ok(applyCommand(state, { type: 'serveWinner' }))
    console.log(
      `после службы: войн с ним ${warsOf(served.politics, PLAYER).filter((one) => one.a === winner || one.b === winner).length}, под рукой ${(served.hands ?? []).some((one) => one.ward === PLAYER)}`,
    )
    console.log(theirEnd(served, world, day).says)
    console.log(theirEndLedger(served, world, day).says)
    expect(theirEnd(served, world, day).served).toBe(true)
    expect(applyCommand(served, { type: 'serveWinner' }).ok).toBe(false)
  })
})
