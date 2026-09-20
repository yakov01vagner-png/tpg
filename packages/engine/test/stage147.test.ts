import { describe, expect, it } from 'vitest'
import { annalsLedger, markOf, memoryOf, theirAnnals, writeCost } from '../src/annals'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { ANNALS, MARKS, MARK_DEFS } from '../src/content/annals'
import { dreadOf } from '../src/dread'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics, pairOf } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 147: летопись, которая судит.
 *
 * Летопись перестаёт быть журналом и становится счётом: мир помнит дела, и
 * память эта входит в страх и в цену.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Летопись из строк: журнал 0.6 и есть то, из чего считается память. */
function withLog(lines: readonly { text: string; day: number }[]): GameState {
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
    log: lines.map((one, i) => ({
      time: WORLD_START + (one.day - 1) * 24 * 60,
      text: one.text,
      kind: 'world' as const,
    })),
  }
}

describe('Лт1, Лт3 и Лт4: счёт, забвение и чужой взгляд', () => {
  it('дела узнаются по словам, и помнятся разное время', () => {
    for (const id of MARKS) {
      console.log(
        `${MARK_DEFS[id].label}: вес ${MARK_DEFS[id].weight}, ${MARK_DEFS[id].years === 0 ? 'не забывается' : `помнится ${MARK_DEFS[id].years} лет`} — ${MARK_DEFS[id].about}`,
      )
    }
    const state = withLog([
      { text: 'Ты венчан на царство при всех', day: 10 },
      { text: 'Престол Робла взят приступом', day: 20 },
      { text: 'Договор с Хладью порван твоей рукой', day: 30 },
      { text: 'В недород ты кормил свою землю хлебом', day: 40 },
    ])
    const memory = memoryOf(state, day)
    console.log(memory.says)
    expect(memory.good).toBeGreaterThan(0)
    expect(memory.bad).toBeGreaterThan(0)
    expect(markOf('Договор порван')).toBe('word')

    // Век спустя слава померкла, а нарушенное слово осталось.
    const later = memoryOf(state, day + 70 * 365)
    console.log(`через семьдесят лет: доброго ${later.good}, худого ${later.bad}`)
    expect(later.bad).toBeGreaterThan(0)

    // Взгляд виден там, где есть отношение: враг помнит кровь, друг — славу.
    const foe = kingdoms[0] as string
    const friend = kingdoms[1] as string
    const seen: GameState = {
      ...state,
      politics: {
        ...state.politics,
        relations: {
          ...state.politics.relations,
          [pairOf(PLAYER, foe)]: -80,
          [pairOf(PLAYER, friend)]: 80,
        },
      },
    }
    console.log(theirAnnals(seen, world, foe, day).says)
    console.log(theirAnnals(seen, world, friend, day).says)
    expect(theirAnnals(seen, world, friend, day).good).toBeGreaterThan(
      theirAnnals(seen, world, foe, day).good,
    )
  })
})

describe('Лт2 и Лт5: память имеет цену, и свою летопись можно писать', () => {
  it('память входит в страх, а своя летопись — в серебро и правду', () => {
    const state = withLog([
      { text: 'Престол Робла взят приступом', day: 20 },
      { text: 'Договор с Хладью порван твоей рукой', day: 30 },
      { text: 'Ты венчан на царство', day: 40 },
    ])
    const memory = memoryOf(state, day)
    const known: GameState = {
      ...state,
      annals: { added: 0, lastDay: 0, remembered: { good: memory.good, bad: memory.bad } },
    }
    const forgotten: GameState = { ...state, annals: { added: 0, lastDay: 0 } }
    const feared = dreadOf(known, world, kingdoms[0] as string, PLAYER, day).score
    const plain = dreadOf(forgotten, world, kingdoms[0] as string, PLAYER, day).score
    console.log(
      `страх к тому, о ком помнят: ${feared}; к тому, о ком забыли: ${plain} (память: доброго ${memory.good}, худого ${memory.bad}, доля в страхе ${ANNALS.intoDread})`,
    )
    expect(feared).toBeGreaterThan(plain)

    console.log(writeCost(known, day).says)
    const written = ok(applyCommand(known, { type: 'writeAnnals' }))
    console.log(
      `после главы: приписано ${written.annals?.added}, казна ${known.character.money} -> ${written.character.money}`,
    )
    expect(written.annals?.added).toBe(1)
    console.log(annalsLedger(written, world, day).says)
  })
})
