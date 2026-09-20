import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { TEMPER_WAY, THEIRWAY } from '../src/content/theirway'
import { dreadSeen } from '../src/dread'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { crownOf } from '../src/lordlife'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { crownWay, theirWay, theirWaySays, worldWays, wouldChange } from '../src/theirway'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { wayOf } from '../src/way'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 140: у короны есть путь.
 *
 * Путь выводится из короны — из нрава её государя и уклада её земли — и
 * считается тем же кодом, что путь игрока.
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

describe('Кп1, Кп2 и Кп4: путь из короны, одна мерка, слова', () => {
  it('у всякой короны свой путь, и он выведен, а не назначен', () => {
    const state = ruler()
    for (const id of kingdoms) {
      console.log(
        `${world.kingdoms[id]?.name} (${crownOf(id).temper}, «${world.kingdoms[id]?.flavor}»): ${theirWaySays(state, world, id, day)}`,
      )
    }
    const ways = new Set(kingdoms.map((id) => crownWay(state, world, id, day)))
    console.log(
      `разных путей в мире: ${ways.size}; нравы: ${Object.entries(TEMPER_WAY)
        .map(([t, w]) => `${t}→${w}`)
        .join(', ')}`,
    )
    expect(ways.size).toBeGreaterThan(1)

    // Одна мерка на всех: тот же wayOf, что у игрока.
    const id = kingdoms[0] as string
    expect(theirWay(state, world, id, day).share).toBe(
      wayOf(state, world, id, crownWay(state, world, id, day), day).share,
    )
  })
})

describe('Кп3, Кп5 и Кп6: смена пути, чужие глаза и числа', () => {
  it('проигравший меняет путь, а ты узнаёшь об этом вестями', () => {
    const id = kingdoms[0] as string
    const state = ruler({
      time: WORLD_START + (THEIRWAY.beat * 14 - 2) * 24 * 60,
      crownWays: { [id]: { way: 'crown', sinceDay: 100, places: 99 } },
    })
    console.log(wouldChange(state, world, id, day).says)
    expect(wouldChange(state, world, id, day).changes).toBe(true)

    let after = state
    for (let i = 0; i < 6; i += 1) after = ok(applyCommand(after, { type: 'rest', hours: 12 }))
    console.log(`после такта: ${after.crownWays?.[id]?.way}`)
    expect(after.crownWays?.[id]?.way).not.toBe('crown')

    // Чужой путь виден не точно: без вестей о нём не знают ничего.
    console.log(dreadSeen(state, world, PLAYER, kingdoms[1] as string, day).says)

    const rows = worldWays(after, world, day)
    console.log(rows.says)
    expect(rows.rows).toHaveLength(kingdoms.length)
  })
})
