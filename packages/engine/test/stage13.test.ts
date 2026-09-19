import { describe, expect, it } from 'vitest'
import type { Band } from '../src/band'
import {
  type BattleSide,
  GROUP_IDS,
  type GroupId,
  type OrderId,
  startBattle,
  unitsSize,
} from '../src/battle'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { hireCompanion } from '../src/companion'
import { COMPANIONS } from '../src/content/companions'
import { PLAYER } from '../src/holding'
import type { Party } from '../src/party'
import { deserialize, serialize } from '../src/save'
import type { GameState } from '../src/state'
import { SCHEMA_VERSION, createGame } from '../src/state'
import { generateWorld } from '../src/world/generate'
import { roadsFrom } from '../src/world/queries'
import { healWound } from '../src/wounds'

const world = generateWorld(1)
const capital = world.kingdoms.reEstiz?.capitalId ?? ''

const party = (units: Party['units'], morale = 70): Party => ({
  units,
  morale,
  hungryDays: 0,
  gear: 0,
})

const foe = (size: number, name = 'Разбойники'): BattleSide => ({
  name,
  units: { militia: size },
  morale: 55,
  fatigue: 0,
})

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Сутки за сутками: одной командой столько времени не проходит. */
function wait(state: GameState, days: number): GameState {
  let current = state
  for (let i = 0; i < days; i += 1) {
    current = ok(applyCommand(current, { type: 'tick', minutes: 24 * 60 }))
  }
  return current
}

const allOrders = (order: OrderId): Record<GroupId, OrderId> =>
  Object.fromEntries(GROUP_IDS.map((id) => [id, order])) as Record<GroupId, OrderId>

function fight(state: GameState, order: OrderId, limit = 30): GameState {
  let current = state
  for (let round = 0; round < limit; round += 1) {
    if (current.battle?.outcome !== 'ongoing') break
    current = ok(applyCommand(current, { type: 'battleOrders', orders: allOrders(order) }))
  }
  return current
}

/** Заведомо проигранный бой: трое против сорока. */
function lostBattle(seed: number): GameState {
  const base = createGame(createCharacter({ name: 'Тест', money: 500 }), seed, world)
  const own = party({ militia: 3 }, 40)
  const state: GameState = {
    ...base,
    locationId: capital,
    party: own,
    battle: startBattle(own, foe(40), 'plains', { foeId: 'bandits' }),
  }
  const done = fight(state, 'charge')
  expect(done.battle?.outcome).toBe('lost')
  return ok(applyCommand(done, { type: 'battleEnd', prisoners: 'release' }))
}

describe('поражение', () => {
  it('чаще рана, реже плен, изредка смерть — и никогда не просто «ничего»', () => {
    let wounded = 0
    let captured = 0
    let killed = 0
    for (let seed = 1; seed <= 40; seed += 1) {
      const after = lostBattle(seed)
      if (after.character.wound) wounded += 1
      else if (after.character.captivity) captured += 1
      else killed += 1
    }
    console.log(`из 40 поражений: ран ${wounded}, плен ${captured}, смертей ${killed}`)
    expect(wounded).toBeGreaterThan(captured)
    expect(captured).toBeGreaterThan(0)
    expect(wounded + captured + killed).toBe(40)
    expect(killed).toBeLessThan(10)
  })

  it('без наследника смерть — конец истории', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const after = lostBattle(seed)
      if (!after.character.wound && !after.character.captivity) {
        expect(after.over).toBe(true)
        return
      }
    }
  })
})

describe('рана', () => {
  function wounded(days: number, severity: number): GameState {
    const base = createGame(createCharacter({ name: 'Тест', money: 100 }), 1, world)
    return { ...base, character: { ...base.character, wound: { daysLeft: days, severity } } }
  }

  it('тяжёлая рана — постель: ни дороги, ни работы', () => {
    const state = wounded(20, 0.8)
    const road = roadsFrom(state.world, state.locationId)[0]
    if (!road) throw new Error('дорог нет')
    const travel = applyCommand(state, { type: 'travel', toLocationId: road.to })
    expect(travel.ok).toBe(false)
    if (!travel.ok) expect(travel.code).toBe('wounded')
    // Ждать и спать можно всегда.
    expect(applyCommand(state, { type: 'sleep' }).ok).toBe(true)
  })

  it('заживает со временем, с лекарем — вдвое быстрее', () => {
    // Само правило: за десять суток рана в двадцать дней уходит наполовину, а
    // с лекарем — вся. Проверяется на самой мере, а не на прогоне: с этапа 64
    // рана ещё и гноится по броску, и от него зависит, какая именно рана
    // достанется этому сейву, а не то, как быстро она заживает.
    expect(healWound({ daysLeft: 20, severity: 0.8 }, 10, 1)?.daysLeft).toBe(10)
    expect(healWound({ daysLeft: 20, severity: 0.8 }, 10, 2)).toBeNull()

    const state = wounded(20, 0.8)
    const alone = wait(state, 10)
    expect(alone.character.wound).not.toBeNull()
    const healerDef = Object.values(COMPANIONS).find((def) => (def.skills.healing ?? 0) >= 3)
    if (!healerDef) throw new Error('лекаря нет среди спутников')
    const withHealer: GameState = { ...state, companions: [hireCompanion(healerDef)] }
    const healed = wait(withHealer, 10)
    // С лекарем рана и заживает быстрее, и гноится реже: в сумме — меньше дней
    // в постели, чем без него.
    const left = (one: GameState) => one.character.wound?.daysLeft ?? 0
    expect(left(healed)).toBeLessThan(left(alone))
  })
})

describe('плен', () => {
  function captive(ransom: number, money: number): GameState {
    const base = createGame(createCharacter({ name: 'Тест', money }), 1, world)
    return {
      ...base,
      character: {
        ...base.character,
        captivity: { captorId: 'bandits', daysLeft: 10, ransom },
      },
    }
  }

  it('в плену не работают и не ходят, но ждут', () => {
    const state = captive(100, 500)
    const work = applyCommand(state, { type: 'work', jobId: 'x' })
    expect(work.ok).toBe(false)
    if (!work.ok) expect(work.code).toBe('captive')
    expect(applyCommand(state, { type: 'tick', minutes: 60 }).ok).toBe(true)
  })

  it('выкуп освобождает сразу и стоит денег', () => {
    const state = captive(100, 500)
    const free = ok(applyCommand(state, { type: 'payRansom' }))
    expect(free.character.captivity).toBeNull()
    expect(free.character.money).toBe(400)
    expect(applyCommand(captive(1000, 500), { type: 'payRansom' }).ok).toBe(false)
  })

  it('срок выходит — отпускают, взяв что есть', () => {
    const state = captive(100, 60)
    const free = wait(state, 11)
    expect(free.character.captivity).toBeNull()
    expect(free.character.money).toBe(0)
  })
})

describe('поединок', () => {
  function duelState(seed: number, skill: number): GameState {
    const base = createGame(
      createCharacter({ name: 'Тест', money: 100, skills: { lightWeapons: skill } }),
      seed,
      world,
    )
    const own = party({ militia: 10 })
    return {
      ...base,
      locationId: capital,
      party: own,
      battle: startBattle(own, foe(10), 'plains', { foeId: 'bandits' }),
    }
  }

  it('один на бой; исход ломает чей-то дух', () => {
    const state = duelState(1, 5)
    const after = ok(applyCommand(state, { type: 'duel' }))
    expect(after.battle?.duel).not.toBe('none')
    if (after.battle?.duel === 'won') {
      expect(after.battle.enemy.morale).toBeLessThan(55)
    } else {
      expect(after.battle?.morale).toBeLessThan(70)
      expect(after.character.wound).not.toBeNull()
    }
    if (after.battle?.outcome === 'ongoing') {
      expect(applyCommand(after, { type: 'duel' }).ok).toBe(false)
    }
  })

  it('мастер клинка выигрывает чаще новичка', () => {
    let master = 0
    let novice = 0
    for (let seed = 1; seed <= 30; seed += 1) {
      if (ok(applyCommand(duelState(seed, 12), { type: 'duel' })).battle?.duel === 'won')
        master += 1
      if (ok(applyCommand(duelState(seed, 0), { type: 'duel' })).battle?.duel === 'won') novice += 1
    }
    console.log(`поединков выиграно из 30: мастер ${master}, новичок ${novice}`)
    expect(master).toBeGreaterThan(novice)
  })
})

describe('свои стены и союзники', () => {
  function besieged(): { state: GameState; band: Band } {
    const base = createGame(createCharacter({ name: 'Тест', money: 100 }), 1, world)
    const here = base.settlements[base.locationId]
    if (!here) throw new Error('нет места')
    const lord = base.politics.lords[0]
    if (!lord) throw new Error('нет лордов')
    const band: Band = {
      id: 'siege-band',
      lordId: lord.id,
      kingdomId: lord.kingdomId,
      units: { militia: 6 },
      morale: 60,
      locationId: base.locationId,
      travel: null,
      goal: { type: 'siege', targetId: base.locationId },
      siegeDays: 2,
    }
    const own = party({ spearman: 6, archer: 4 })
    const state: GameState = {
      ...base,
      party: own,
      settlements: {
        ...base.settlements,
        [base.locationId]: { ...here, owner: PLAYER, garrison: { militia: 5 } },
      },
      bands: [band],
    }
    return { state, band }
  }

  it('оборона: гарнизон встаёт в строй, стены за тебя, после боя — обратно на стены', () => {
    const { state, band } = besieged()
    const fighting = ok(applyCommand(state, { type: 'attackBand', bandId: band.id }))
    expect(fighting.battle?.stake?.type).toBe('defense')
    expect(fighting.battle?.ownWalls ?? 1).toBeGreaterThan(1)
    // Гарнизон и ополчение — в строю рядом с отрядом.
    expect(unitsSize(fighting.party.units)).toBeGreaterThan(10)
    expect(fighting.settlements[state.locationId]?.garrison).toEqual({})

    const done = fight(fighting, 'hold')
    expect(done.battle?.outcome).toBe('won')
    const after = ok(applyCommand(done, { type: 'battleEnd', prisoners: 'release' }))
    expect(after.settlements[state.locationId]?.owner).toBe(PLAYER)
    expect(unitsSize(after.settlements[state.locationId]?.garrison ?? {})).toBeGreaterThan(0)
    expect(unitsSize(after.party.units)).toBeLessThanOrEqual(10)
  })

  it('союзное войско бьёт первым: тебе достаётся меньше врагов', () => {
    const { state, band } = besieged()
    const ally: Band = {
      ...band,
      id: 'ally',
      lordId: 'ally-lord',
      kingdomId: PLAYER,
      units: { manAtArms: 12 },
      goal: { type: 'defend', targetId: state.locationId },
    }
    const helped = applyCommand(
      { ...state, bands: [band, ally] },
      { type: 'attackBand', bandId: band.id },
    )
    const alone = ok(applyCommand(state, { type: 'attackBand', bandId: band.id }))
    if (!helped.ok) throw new Error(helped.message)
    const enemyLeft = helped.state.battle ? unitsSize(helped.state.battle.enemy.units) : 0
    expect(enemyLeft).toBeLessThan(unitsSize(alone.battle?.enemy.units ?? {}))
  })
})

describe('сейв', () => {
  it('старый герой поднимается здоровым и на воле', () => {
    const state = createGame(createCharacter({ name: 'Тест' }), 1, world)
    const saved = JSON.parse(serialize(state)) as Record<string, unknown>
    const character = saved.character as Record<string, unknown>
    character.wound = undefined
    character.captivity = undefined
    saved.schemaVersion = 11
    const loaded = deserialize(JSON.stringify(saved))
    if (!loaded.ok) throw new Error(loaded.error)
    expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(loaded.state.character.wound).toBeNull()
    expect(loaded.state.character.captivity).toBeNull()
  })
})
