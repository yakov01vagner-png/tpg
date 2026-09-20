import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { ENDINGS, ENDING_DEFS } from '../src/content/ending'
import { createSettlements } from '../src/economy'
import { endingLedger, endingOf, endingsNow, nearestEnding } from '../src/ending'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 154: условия конца.
 *
 * Конец — состояние мира, у которого есть имя. Считается он тем же кодом, что
 * и пути, и потому подделать его нельзя.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const day = 400

function ruler(places: number, extra: Partial<GameState> = {}): GameState {
  const base = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
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

describe('Ку1, Ку2, Ку3 и Ку5: восемь имён и то, к какому ты ближе', () => {
  it('концов восемь, пять твоих, и ближайший назван', () => {
    for (const id of ENDINGS) {
      console.log(
        `${ENDING_DEFS[id].label} (${ENDING_DEFS[id].yours ? 'твой' : 'не в твою пользу'}): ${ENDING_DEFS[id].about}`,
      )
    }
    const state = ruler(8)
    console.log(nearestEnding(state, world, day).says)
    expect(endingsNow(state, world, day)).toHaveLength(5)
    expect(endingOf(state, world, day).id).toBeNull()

    // Чужой конец сильнее твоего пути: он и называется первым.
    const theirs = ruler(8, { theirEnd: { who: kingdoms[0] as string, sinceDay: day - 100 } })
    console.log(endingOf(theirs, world, day).says)
    expect(endingOf(theirs, world, day).id).toBe('theirs')

    // Пресёкшийся род — второй из тех, что не в твою пользу.
    const fallen = ruler(8, { over: true })
    console.log(endingOf(fallen, world, day).says)
    expect(endingOf(fallen, world, day).id).toBe('fallen')
  })
})

describe('Ку4 и Ку6: конец не обрывает, и всё это в числах', () => {
  it('после имени мир считается дальше', () => {
    const state = ruler(8, { theirEnd: { who: kingdoms[0] as string, sinceDay: day - 100 } })
    const ledger = endingLedger(state, world, day)
    console.log(ledger.says)
    expect(ledger.reached).toBe('theirs')
    expect(ENDINGS.filter((id) => ENDING_DEFS[id].yours)).toHaveLength(5)
  })
})
