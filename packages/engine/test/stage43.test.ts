import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { VASSAL_SHARE, applyCommand } from '../src/commands'
import { COURT_DAYS, courtCase, loyaltyWord, vassalsOf } from '../src/court'
import { PLAYER, holdingsOf } from '../src/holding'
import { placeRep } from '../src/reputation'
import { createRng } from '../src/rng'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { MINUTES_PER_DAY } from '../src/time'
import { tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 43: двор и вассалы.
 *
 * Власть игрока как система: присяга, лояльность, суд, раздача земли. Своё
 * владение перестаёт быть строкой «у тебя есть замок».
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Владетель с именем, двумя местами и двумя вассалами. */
function realm(): GameState {
  const base = createGame(createCharacter({ name: 'Т', money: 5000 }), 1, world)
  const places = Object.values(base.settlements)
    .filter((one) => one.population > 300 && one.population < 3000)
    .slice(0, 3)
  const settlements = { ...base.settlements }
  for (const one of places) settlements[one.locationId] = { ...one, owner: PLAYER }
  const [first, second] = base.politics.lords.filter((lord) => lord.kingdomId !== null).slice(0, 2)
  if (!first || !second || !places[0]) throw new Error('мир пуст')
  return {
    ...base,
    settlements,
    locationId: places[0].locationId,
    realm: { name: 'Вольное владение' },
    politics: {
      ...base.politics,
      lords: base.politics.lords.map((lord) =>
        lord.id === first.id || lord.id === second.id
          ? { ...lord, kingdomId: PLAYER, loyalty: 55 }
          : lord,
      ),
    },
  }
}

describe('присяга', () => {
  it('у игрока могут быть свои лорды, и они верят по-своему', () => {
    const state = realm()
    expect(vassalsOf(state)).toHaveLength(2)
    expect(loyaltyWord(55)).toBe('верен')
    expect(loyaltyWord(5)).toBe('на грани мятежа')
  })
})

describe('лен даётся и отнимается', () => {
  it('пожалованная земля переходит вассалу, платит долю и крепит верность', () => {
    const state = realm()
    const vassal = vassalsOf(state)[0]
    if (!vassal) return
    const mine = holdingsOf(state.settlements, PLAYER)
    const given = mine[1]
    if (!given) return
    const granted = ok(
      applyCommand(state, { type: 'grantFief', lordId: vassal.id, locationId: given.locationId }),
    )
    expect(granted.settlements[given.locationId]?.owner).toBe(vassal.id)
    expect(vassalsOf(granted).find((lord) => lord.id === vassal.id)?.loyalty).toBe(75)
    // Чужому и чужое — нельзя.
    const foreign = state.politics.lords.find((lord) => lord.kingdomId !== PLAYER && lord.kingdomId)
    if (foreign) {
      expect(
        applyCommand(state, { type: 'grantFief', lordId: foreign.id, locationId: given.locationId })
          .ok,
      ).toBe(false)
    }
    // Доля с пожалованной земли идёт в казну: сутки — и деньги пришли.
    const before = granted.character.money
    const later = ok(applyCommand(granted, { type: 'tick', minutes: MINUTES_PER_DAY }))
    expect(later.character.money).toBeGreaterThanOrEqual(before)
    expect(VASSAL_SHARE).toBeGreaterThan(0)
    expect(VASSAL_SHARE).toBeLessThan(1)

    // И отнять: земля возвращается, он помнит, остальные замечают.
    const revoked = ok(
      applyCommand(
        { ...granted, locationId: given.locationId },
        { type: 'revokeFief', locationId: given.locationId },
      ),
    )
    expect(revoked.settlements[given.locationId]?.owner).toBe(PLAYER)
    const lords = vassalsOf(revoked)
    expect(lords.find((lord) => lord.id === vassal.id)?.loyalty).toBe(45)
    expect(lords.find((lord) => lord.id !== vassal.id)?.loyalty).toBe(50)
  })
})

describe('верность и мятеж против игрока', () => {
  it('без своего архимага вассал на грани уходит; архимаг его держит', () => {
    const state = realm()
    const angry = {
      ...state.politics,
      lords: state.politics.lords.map((lord) =>
        lord.kingdomId === PLAYER ? { ...lord, loyalty: 3 } : lord,
      ),
    }
    let rebelled = 0
    let held = 0
    for (let seed = 1; seed <= 30; seed += 1) {
      const loose = tickPolitics(world, angry, state.settlements, 60, createRng(seed), 'busy')
      const kept = tickPolitics(world, angry, state.settlements, 60, createRng(seed), 'free')
      rebelled += loose.events.filter((event) => event.type === 'rebellion').length
      held += kept.events.filter((event) => event.type === 'rebellion').length
    }
    console.log(`мятежей за 30 прогонов: без архимага ${rebelled}, с архимагом ${held}`)
    expect(rebelled).toBeGreaterThan(0)
    expect(held).toBe(0)
  })

  it('это заслуживается: хлеб голодным крепит верность своих', () => {
    const state = realm()
    const before = vassalsOf(state)[0]?.loyalty ?? 0
    const here = state.settlements[state.locationId]
    if (!here) return
    // Своё место голодает; двадцать мер из поклажи — поступок, который видят.
    const hungry: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [state.locationId]: { ...here, stock: { ...here.stock, grain: 0, fish: 0 } },
      },
      character: { ...state.character, inventory: { ...state.character.inventory, grain: 20 } },
    }
    const fed = ok(applyCommand(hungry, { type: 'giveFood', amount: 20 }))
    expect(vassalsOf(fed)[0]?.loyalty).toBe(before + 1)
  })
})

describe('суд', () => {
  it('дело приходит раз в месяц на свою землю, и решение чего-то стоит', () => {
    const state: GameState = { ...realm(), courtDay: 0, time: 40 * MINUTES_PER_DAY }
    const pending = courtCase(state)
    expect(pending).not.toBeNull()
    if (!pending) return
    expect(pending.choices.length).toBeGreaterThanOrEqual(2)
    const choice = pending.choices[0]
    if (!choice) return
    const judged = ok(applyCommand(state, { type: 'judge', caseId: pending.id, choice: choice.id }))
    expect(judged.courtDay).toBe(41)
    // Второй раз в тот же месяц — нечего судить.
    expect(courtCase(judged)).toBeNull()
    expect(applyCommand(judged, { type: 'judge', caseId: pending.id, choice: choice.id }).ok).toBe(
      false,
    )
    // Что-то сдвинулось: верность, имя у земли или казна.
    const moved =
      vassalsOf(judged).some((lord, index) => lord.loyalty !== vassalsOf(state)[index]?.loyalty) ||
      judged.character.money !== state.character.money ||
      Object.keys(judged.reputation.places).some(
        (id) => placeRep(judged.reputation, id) !== placeRep(state.reputation, id),
      )
    expect(moved).toBe(true)
    // Через месяц — новое дело.
    const later: GameState = { ...judged, time: judged.time + (COURT_DAYS + 1) * MINUTES_PER_DAY }
    expect(courtCase(later)).not.toBeNull()
  })

  it('двор держат на своей земле, а не в чужом городе', () => {
    const state: GameState = { ...realm(), courtDay: 0, time: 40 * MINUTES_PER_DAY }
    const pending = courtCase(state)
    if (!pending) return
    const foreign = Object.values(state.settlements).find((one) => one.owner !== PLAYER)
    if (!foreign) return
    const away = { ...state, locationId: foreign.locationId }
    const result = applyCommand(away, {
      type: 'judge',
      caseId: pending.id,
      choice: pending.choices[0]?.id ?? 'grant',
    })
    expect(result.ok).toBe(false)
  })
})
