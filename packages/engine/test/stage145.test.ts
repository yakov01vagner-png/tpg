import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { crownPlaces } from '../src/company'
import { CURVE, REASONS, REASON_DEFS } from '../src/content/curve'
import { curveLedger, curveOf, curveSays, samplesOf, yourHand } from '../src/curve'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 145: долгие процессы.
 *
 * У державы появляется кривая длиной в десятилетия: возвышение и упадок видны
 * заранее, а не выясняются задним числом.
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

describe('Дл1, Дл2 и Дл3: кривая, причины и то, что видно заранее', () => {
  it('упадок виден по замерам, и он назван', () => {
    const id = kingdoms[0] as string
    // Нынешнее число мест берём из мира: кривая считается против него.
    const now = crownPlaces(ruler(), id)
    const falling = ruler({ curves: { [id]: [now + 20, now + 14, now + 8, now + 3] } })
    const curve = curveOf(falling, world, id, day)
    console.log(curveSays(falling, world, id, day))
    expect(curve.trend).toBe('fall')

    const rising = ruler({ curves: { [id]: [now - 20, now - 14, now - 8, now - 3] } })
    console.log(curveSays(rising, world, id, day))
    expect(curveOf(rising, world, id, day).trend).toBe('rise')

    const flat = ruler({ curves: { [id]: [now, now, now, now] } })
    console.log(curveSays(flat, world, id, day))
    expect(curveOf(flat, world, id, day).trend).toBe('still')
    for (const one of REASONS) console.log(`${REASON_DEFS[one].label}: ${REASON_DEFS[one].says}`)
  })
})

describe('Дл4, Дл5 и Дл6: твоя рука, земля и числа', () => {
  it('замеры берутся сами, и в них видна твоя рука', () => {
    const state = ruler({ time: WORLD_START + (CURVE.beat * 2 - 2) * 24 * 60 })
    let after = state
    for (let i = 0; i < 6; i += 1) after = ok(applyCommand(after, { type: 'rest', hours: 12 }))
    console.log(
      `замеров у тебя ${samplesOf(after, PLAYER).length}, у ${world.kingdoms[kingdoms[0] as string]?.name} ${samplesOf(after, kingdoms[0] as string).length}`,
    )
    expect(samplesOf(after, PLAYER).length).toBeGreaterThan(0)

    const at = ruler({
      politics: {
        ...politics,
        wars: [
          ...politics.wars,
          { a: PLAYER, b: kingdoms[0] as string, since: day - 100, reason: 'спор' },
        ],
      },
    })
    console.log(yourHand(at, world, kingdoms[0] as string, day).says)
    expect(yourHand(at, world, kingdoms[0] as string, day).touched).toBe(true)
    console.log(curveLedger(after, world, day).says)
  })
})
