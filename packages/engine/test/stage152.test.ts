import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { comebackLedger, oldClaim, roadsBack, secondTime, whoHelps } from '../src/comeback'
import { applyCommand } from '../src/commands'
import { COMEBACK, ROADS, ROAD_DEFS } from '../src/content/comeback'
import { createSettlements } from '../src/economy'
import { PLAYER, holdingsOf } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics, pairOf } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 152: путь обратно.
 *
 * Из потери державы есть четыре дороги назад, и каждая открыта настолько,
 * насколько её условия есть в мире.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Тот, у кого державу уже отняли. */
function fallen(extra: Partial<GameState> = {}): GameState {
  const base = createGame(createCharacter({ name: 'Ратша', money: 2000 }), 1, world)
  const seat = Object.values(settlements).find((one) => one.population > 600)
  return {
    ...base,
    politics,
    settlements,
    locationId: seat?.locationId ?? base.locationId,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: null,
    fallenLog: [{ name: 'Заречье', day: day - 700, places: 0 }],
    ...extra,
  }
}

describe('Об1, Об2 и Об3: дороги, право и те, кому выгодно', () => {
  it('дороги открыты по миру, а не по списку', () => {
    const poor = fallen()
    for (const one of roadsBack(poor, world, day)) console.log(one.says)
    expect(roadsBack(poor, world, day).filter((one) => one.open)).toHaveLength(0)
    console.log(oldClaim(poor, world, day).says)

    const rich = fallen({
      character: { ...createCharacter({ name: 'Ратша', money: COMEBACK.hireSilver + 500 }) },
      politics: {
        ...politics,
        relations: { ...politics.relations, [pairOf(PLAYER, kingdoms[0] as string)]: 30 },
      },
    })
    const open = roadsBack(rich, world, day).filter((one) => one.open)
    console.log(`открыто дорог: ${open.map((one) => ROAD_DEFS[one.road].label).join(', ')}`)
    expect(open.length).toBeGreaterThan(0)
    for (const one of whoHelps(rich, world, day)) console.log(`помогут: ${one.who} — ${one.why}`)
  })
})

describe('Об4 и Об6: второй раз дороже', () => {
  it('вернуться можно, но держава держится хуже', () => {
    const rich = fallen({
      character: { ...createCharacter({ name: 'Ратша', money: COMEBACK.hireSilver + 500 }) },
    })
    console.log(secondTime(rich, world, day).says)
    const back = ok(applyCommand(rich, { type: 'claimBack', road: 'hire' }))
    console.log(
      `держава ${back.realm?.name} с ${back.realm?.sinceDay}-го дня, мест ${holdingsOf(back.settlements, PLAYER).length}, казна ${rich.character.money} -> ${back.character.money}, признаний ${Object.keys(back.recognitions ?? {}).length}`,
    )
    expect(back.realm?.name).toBe('Заречье')
    expect(holdingsOf(back.settlements, PLAYER).length).toBe(1)
    expect(applyCommand(back, { type: 'claimBack', road: 'hire' }).ok).toBe(false)
    console.log(comebackLedger(back, world, day).says)
    for (const id of ROADS) expect(ROAD_DEFS[id].years).toBeGreaterThan(0)
  })
})
