import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { DRAGS, DRAG_DEFS, RACE } from '../src/content/race'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { dragsOn, raceLedger, raceSpeed, risking, rivalsOf, whoLeads } from '../src/race'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { crownWay, theirWay } from '../src/theirway'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 141: продвижение и гонка.
 *
 * Шаг вперёд заметен, соперники на одном пути мешают друг другу, у конца
 * рискуют, а коалиция и война откатывают назад.
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

describe('Гн2, Гн3 и Гн4: соперники, спешка и откат', () => {
  it('двое на одном пути мешают друг другу, а у конца начинают рисковать', () => {
    const state = ruler()
    const id = kingdoms.find((one) => rivalsOf(state, world, one, day).length > 0) as string
    console.log(raceSpeed(state, world, id, day).says)
    expect(raceSpeed(state, world, id, day).speed).toBeLessThan(1)

    const leader = kingdoms
      .map((one) => ({ one, share: theirWay(state, world, one, day).share }))
      .sort((a, b) => b.share - a.share)[0]?.one as string
    console.log(risking(state, world, leader, day).says)
    for (const drag of DRAGS) console.log(`${DRAG_DEFS[drag].label}: ${DRAG_DEFS[drag].says}`)
    console.log(
      `тормозит ${world.kingdoms[leader]?.name}: ${dragsOn(state, world, leader, day).join(', ') || 'ничто'}`,
    )
  })

  it('рискующий платит своими и чужими, а шаги считаются', () => {
    const state = ruler({ time: WORLD_START + (RACE.beat * 14 - 2) * 24 * 60 })
    const leader = kingdoms.find((one) => risking(state, world, one, day).risks) as string
    const before = state.politics.lords.filter((one) => one.kingdomId === leader)
    let after = state
    for (let i = 0; i < 6; i += 1) after = ok(applyCommand(after, { type: 'rest', hours: 12 }))
    const now = new Map(after.politics.lords.map((one) => [one.id, one.loyalty]))
    console.log(
      `${world.kingdoms[leader]?.name} (пройдено ${Math.round(theirWay(state, world, leader, day).share * 100)}): верность своих ${before
        .map((one) => `${one.loyalty}→${now.get(one.id)}`)
        .slice(0, 3)
        .join(', ')}`,
    )
    expect(before.some((one) => (now.get(one.id) ?? one.loyalty) < one.loyalty)).toBe(true)

    console.log(whoLeads(after, world, day).says)
    console.log(raceLedger(after, world, day).says)
    expect(crownWay(after, world, leader, day).length).toBeGreaterThan(0)
  })
})
