import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import { powerScreens, wayScreen } from '../src/screens'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 158: экран пути.
 *
 * Восьмой экран власти отвечает на пять вопросов разом и кончается действием;
 * чужие числа на нём — вести, а не правда.
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
  const base = createGame(createCharacter({ name: 'Ратша', money: 60000 }), 1, world)
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
    ...extra,
  }
}

describe('Эк1–Эк6: экран пути', () => {
  it('пять вопросов, у каждого числа пояснение, и в конце — дело', () => {
    const state = ruler(12)
    const screen = wayScreen(state, world)
    console.log(screen.says)
    for (const line of screen.lines) console.log(`${line.label}: ${line.value} — ${line.hint}`)
    for (const deed of screen.deeds)
      console.log(`дело: ${deed.label} (${deed.can ? 'можно' : 'нельзя'}) — ${deed.why}`)
    expect(screen.lines).toHaveLength(5)
    // Правило этапа 97: ни одного числа без пояснения.
    for (const line of screen.lines) expect(line.hint.length).toBeGreaterThan(10)
    expect(screen.deeds.length).toBeGreaterThan(0)

    // И экран кончается делом, которое и правда исполняется.
    const deed = screen.deeds.find((one) => one.can)
    if (deed) {
      const after = ok(applyCommand(state, deed.command))
      console.log(`исполнено: ${deed.label}`)
      expect(after.time).toBeGreaterThanOrEqual(state.time)
    }
    console.log(
      `экранов власти: ${powerScreens(state, world)
        .map((one) => one.title)
        .join(', ')}`,
    )
    expect(powerScreens(state, world)).toHaveLength(8)
  })
})
