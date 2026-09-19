import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { hireCompanion } from '../src/companion'
import type { Companion } from '../src/companion'
import { COMPANIONS } from '../src/content/companions'
import { OATH_BREAKS } from '../src/content/vassals'
import { createSettlements } from '../src/economy'
import { lawOf } from '../src/estate'
import { PLAYER, holdingsOf } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import {
  callWord,
  fiefWorth,
  loyaltyDrift,
  oathFor,
  oathOf,
  raisable,
  serviceOf,
  swearCandidates,
  titleForFiefs,
} from '../src/vassal'
import { createPolitics } from '../src/war'
import type { Lord } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 74: присяга и вассалы.
 *
 * Вассал был числом верности и долей подати. Присяга — договор: у неё две
 * стороны, свои условия и своя цена. Проверяется то, ради чего она заведена:
 * отказ объясним, служба видна заранее, верность ходит от того, что вассал
 * видит у себя во дворе, а отнятый лен кончает присягу.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Игрок со своим именем, двумя владениями и верным спутником. */
function ruler(options: { renown?: number; noble?: number } = {}): {
  state: GameState
  mine: readonly string[]
} {
  const base = createGame(createCharacter({ name: 'Ратша', money: 2000 }), 1, world)
  const rich = Object.values(settlements)
    .filter((one) => one.population > 1500 && one.population < 9000)
    .sort((a, b) => b.population - a.population)
    .slice(0, 2)
  const places = { ...settlements }
  for (const one of rich) places[one.locationId] = { ...one, owner: PLAYER }
  const first = rich[0]
  const friend = Object.values(COMPANIONS)[0]
  if (!first || !friend) throw new Error('нет подходящих мест или спутников')
  return {
    state: {
      ...base,
      politics,
      settlements: places,
      locationId: first.locationId,
      quarter: null,
      time: WORLD_START,
      realm: { name: 'Вольное владение', sinceDay: 1 },
      renown: options.renown ?? 20,
      fame: { noble: options.noble ?? 60 },
      companions: [{ ...hireCompanion(friend), mood: 70 }],
    },
    mine: rich.map((one) => one.locationId),
  }
}

/** Свой человек, которого можно посадить на землю. */
function comrade(state: GameState): Companion {
  const one = raisable(state)[0]
  if (!one) throw new Error('некого сажать на землю')
  return one
}

/** Лорд, которому своя корона уже не мила: такому есть что предложить. */
function doubting(state: GameState): { state: GameState; lord: Lord } {
  const lord = state.politics.lords.find((one) => one.kingdomId !== null)
  if (!lord) throw new Error('лордов нет')
  const cold: Lord = { ...lord, loyalty: 20 }
  return {
    state: {
      ...state,
      politics: {
        ...state.politics,
        lords: state.politics.lords.map((one) => (one.id === lord.id ? cold : one)),
      },
    },
    lord: cold,
  }
}

describe('В1 и В2: лен и присяга', () => {
  it('свой человек садится на землю и становится лордом', () => {
    const { state, mine } = ruler()
    const friend = comrade(state)
    const place = mine[0] as string
    const after = ok(
      applyCommand(state, { type: 'swearOath', lordId: friend.id, locationId: place }),
    )
    const lord = after.politics.lords.find((one) => one.kingdomId === PLAYER)
    console.log(
      `${friend.name} → ${lord?.title} ${lord?.name}: верность ${lord?.loyalty}, сила ${lord?.strength}`,
    )
    expect(lord).toBeDefined()
    expect(after.settlements[place]?.owner).toBe(lord?.id)
    expect(oathOf(after, lord?.id ?? '')).not.toBeNull()
    // Спутник с земли уходит из отряда: держать лен и ходить за тобой — разные жизни.
    expect(after.companions.some((one) => one.id === friend.id)).toBe(false)
  })

  it('чужой ставит свои условия — и может отказать', () => {
    const rich = ruler({ renown: 60, noble: 90 })
    const poor = ruler({ renown: 0, noble: -40 })
    const strong = doubting(rich.state)
    const weak = doubting(poor.state)
    const high = oathFor(strong.state, strong.lord, rich.mine[0] as string, 1)
    const low = oathFor(weak.state, weak.lord, poor.mine[0] as string, 1)
    console.log(`${strong.lord.name}: «${high.asks}»`)
    console.log(
      `государю — ${high.accepts ? 'да' : 'нет'} (${high.weight}), безымянному — ${low.accepts ? 'да' : 'нет'} (${low.weight})`,
    )
    expect(high.weight).toBeGreaterThan(low.weight)
    expect(low.accepts).toBe(false)
    // Условия — его, а не твои: они те же, на что бы он ни смотрел.
    expect(high.terms.gives).toBe(low.terms.gives)
    expect(high.asks.length).toBeGreaterThan(20)

    // Отказ — ответ: он записан в его памяти, и земля осталась твоей.
    const after = ok(
      applyCommand(weak.state, {
        type: 'swearOath',
        lordId: weak.lord.id,
        locationId: poor.mine[0] as string,
      }),
    )
    expect(after.settlements[poor.mine[0] as string]?.owner).toBe(PLAYER)
    expect(after.lordDeeds?.[weak.lord.id]).toContain('refused')
  })

  it('разорённая земля стоит меньше: за неё присягают хуже', () => {
    const { state, mine } = ruler()
    const place = state.settlements[mine[0] as string]
    if (!place) return
    const { state: cold, lord } = doubting(state)
    const ruined: GameState = {
      ...cold,
      settlements: { ...cold.settlements, [place.locationId]: { ...place, banditry: 0.9 } },
    }
    const fat = oathFor(cold, lord, place.locationId, 1)
    const thin = oathFor(ruined, lord, place.locationId, 1)
    console.log(
      `цена земли: тихой ${fiefWorth(place).toFixed(2)}, разбойной ${fiefWorth({ ...place, banditry: 0.9 }).toFixed(2)}; вес ${fat.weight} → ${thin.weight}`,
    )
    expect(thin.weight).toBeLessThan(fat.weight)
  })

  it('верному своей короне присяга не нужна', () => {
    const { state } = ruler()
    const loyal = state.politics.lords.find((one) => one.loyalty > 50)
    if (!loyal) return
    expect(swearCandidates(state).some((one) => one.id === loyal.id)).toBe(false)
  })
})

describe('В3: служба вассала', () => {
  it('на зов идут по верности, и видно заранее, кто придёт', () => {
    const { state, mine } = ruler()
    const friend = comrade(state)
    const sworn = ok(
      applyCommand(state, { type: 'swearOath', lordId: friend.id, locationId: mine[0] as string }),
    )
    const lord = sworn.politics.lords.find((one) => one.kingdomId === PLAYER) as Lord
    const oath = oathOf(sworn, lord.id)
    const cold: Lord = { ...lord, loyalty: OATH_BREAKS - 5 }
    console.log(
      `${lord.name} (верность ${lord.loyalty}): ${callWord(lord, oath)}; он же на ${cold.loyalty}: ${callWord(cold, oath)}`,
    )
    expect(serviceOf(cold, oath)).toBe(0)

    const before = Object.values(sworn.party.units).reduce((sum, one) => sum + (one ?? 0), 0)
    const called = ok(applyCommand(sworn, { type: 'summonVassals' }))
    const after = Object.values(called.party.units).reduce((sum, one) => sum + (one ?? 0), 0)
    console.log(`в отряде было ${before}, стало ${after}; присяга — ${oath?.gives}`)
    if (oath?.gives === 'tax') {
      expect(after).toBe(before)
    } else {
      expect(after).toBeGreaterThan(before)
      expect(oathOf(called, lord.id)?.calledDay).toBeGreaterThan(0)
    }
  })
})

describe('В4: верность к тебе', () => {
  it('подать, суд и позор двигают её в разные стороны', () => {
    const { state, mine } = ruler()
    const friend = comrade(state)
    const sworn = ok(
      applyCommand(state, { type: 'swearOath', lordId: friend.id, locationId: mine[0] as string }),
    )
    const vassal = sworn.politics.lords.find((one) => one.kingdomId === PLAYER) as Lord
    const oath = oathOf(sworn, vassal.id)
    const plain = loyaltyDrift(sworn, world, vassal, oath, 10)
    const heavy = loyaltyDrift(
      { ...sworn, law: { ...lawOf(sworn), tax: 'heavy' } },
      world,
      vassal,
      oath,
      10,
    )
    const shamed = loyaltyDrift(
      { ...sworn, shames: [{ id: 'fled', since: 1, covered: 0 }] },
      world,
      vassal,
      oath,
      10,
    )
    console.log(
      `верность за сутки: по обычаю ${plain.toFixed(3)}, при тяжёлой подати ${heavy.toFixed(3)}, с позором ${shamed.toFixed(3)}`,
    )
    expect(heavy).toBeLessThan(plain)
    expect(shamed).toBeLessThan(plain)

    // И это видно в игре: двести суток тяжёлой подати сбивают верность.
    let harsh: GameState = { ...sworn, law: { ...lawOf(sworn), tax: 'heavy' } }
    for (let day = 0; day < 200; day += 1) {
      harsh = ok(applyCommand(harsh, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const later = harsh.politics.lords.find((one) => one.id === vassal.id) as Lord
    console.log(`через 200 суток тяжёлой подати: ${vassal.loyalty} → ${later.loyalty.toFixed(1)}`)
    expect(later.loyalty).toBeLessThan(vassal.loyalty)
  })
})

describe('В5 и В6: люди и отнятый лен', () => {
  it('титул растёт от земли, а отнятая земля кончает присягу', () => {
    expect(titleForFiefs(1)).toBe('барон')
    expect(titleForFiefs(3)).toBe('граф')
    expect(titleForFiefs(7)).toBe('герцог')

    const { state, mine } = ruler()
    const friend = comrade(state)
    const sworn = ok(
      applyCommand(state, { type: 'swearOath', lordId: friend.id, locationId: mine[0] as string }),
    )
    const lord = sworn.politics.lords.find((one) => one.kingdomId === PLAYER) as Lord
    expect(holdingsOf(sworn.settlements, lord.id)).toHaveLength(1)

    const taken = ok(applyCommand(sworn, { type: 'revokeFief', locationId: mine[0] as string }))
    console.log(
      `после отнятия: земель у него ${holdingsOf(taken.settlements, lord.id).length}, присяга ${oathOf(taken, lord.id) ? 'цела' : 'кончилась'}`,
    )
    expect(holdingsOf(taken.settlements, lord.id)).toHaveLength(0)
    expect(oathOf(taken, lord.id)).toBeNull()
    expect(taken.politics.lords.some((one) => one.id === lord.id)).toBe(false)
    expect(taken.lordDeeds?.[lord.id]).toContain('robbed')
  })
})
