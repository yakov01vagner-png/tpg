import { describe, expect, it } from 'vitest'
import {
  ARMY_PACE,
  WAGON_PACE,
  bandsOnLeg,
  legHoursFor,
  musterBands,
  paceOf,
  tickBands,
} from '../src'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import type { Settlement } from '../src/economy'
import { tickDays } from '../src/life'
import { createRng } from '../src/rng'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { createPolitics, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { roadsFrom } from '../src/world/queries'

/**
 * Этап 29: все ходят одинаково.
 *
 * Дружины и караваны идут теми же отрезками и тем же временем, что и герой.
 * Значит, их можно встретить в поле — и перехватить до того, как они дошли.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}
const firstRoad = (state: GameState) => {
  const road = roadsFrom(state.world, state.locationId)[0]
  if (!road) throw new Error('дорог нет')
  return road
}

describe('часы отрезка считает одно правило', () => {
  it('герой, войско и обоз считают по одной формуле', () => {
    const road = 6
    const alone = legHoursFor(
      road,
      paceOf({ units: {}, morale: 60, hungryDays: 0, gear: 0 }, false),
    )
    const army = legHoursFor(road, ARMY_PACE)
    const wagon = legHoursFor(road, WAGON_PACE)
    console.log(`шесть часов дороги: путник ${alone} ч, войско ${army} ч, обоз ${wagon} ч`)
    expect(alone).toBe(6)
    expect(army).toBeGreaterThan(alone)
    expect(wagon).toBeGreaterThan(army)
  })
})

describe('кто на отрезке', () => {
  it('видно тех, кто стоит на концах и кто идёт по нему', () => {
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    const road = firstRoad(base)
    const band = base.bands[0]
    if (!band) throw new Error('дружин нет')
    const standing = { ...band, locationId: road.to, travel: null }
    const walking = {
      ...band,
      id: 'band:walker',
      locationId: base.locationId,
      travel: { toLocationId: road.to, hoursLeft: 3 },
    }
    const elsewhere = { ...band, id: 'band:far', locationId: 'нигде', travel: null }
    const found = bandsOnLeg([standing, walking, elsewhere], base.locationId, road.to)
    expect(found.map((one) => one.id)).toEqual([band.id, 'band:walker'])
  })
})

describe('перехват', () => {
  /** Герой на дороге, а на том же отрезке — чужая дружина. */
  function meeting(atWarWith: boolean): GameState {
    const base = createGame(createCharacter({ name: 'Т' }), 3, world)
    const band = base.bands.find((one) => one.kingdomId && one.kingdomId !== 'reEstiz')
    if (!band) throw new Error('нет чужой дружины')
    const road = firstRoad(base)
    const state: GameState = {
      ...base,
      party: { units: { militia: 10 }, morale: 70, hungryDays: 0, gear: 0 },
      service: atWarWith ? 'reEstiz' : null,
      politics: atWarWith
        ? {
            ...base.politics,
            wars: [
              {
                a: 'reEstiz',
                b: band.kingdomId as string,
                reason: 'спорная земля',
                since: 0,
              },
            ],
          }
        : { ...base.politics, wars: [] },
      bands: [{ ...band, locationId: road.to, travel: null }],
    }
    return ok(applyCommand(state, { type: 'travel', toLocationId: road.to }))
  }

  it('на дороге воюющие сходятся в бой', () => {
    let fought = false
    for (let attempt = 0; attempt < 12 && !fought; attempt += 1) {
      let state = meeting(true)
      state = { ...state, rng: createRng(attempt + 1) }
      for (let hour = 0; hour < 12 && state.journey && !state.battle; hour += 1) {
        state = ok(applyCommand(state, { type: 'tick', minutes: 60 }))
      }
      if (state.battle) fought = true
    }
    expect(fought).toBe(true)
  })

  it('с невоюющими расходятся', () => {
    let state = meeting(false)
    let met = false
    for (let hour = 0; hour < 12 && state.journey && !state.battle; hour += 1) {
      const step = applyCommand(state, { type: 'tick', minutes: 60 })
      if (!step.ok) break
      state = step.state
      if (step.events.some((one) => 'text' in one && String(one.text).includes('Разминулись'))) {
        met = true
      }
    }
    expect(state.battle).toBeNull()
    expect(met).toBe(true)
  })

  it('перехватить можно самому, не дожидаясь встречи', () => {
    const state = meeting(true)
    const band = state.bands[0]
    if (!band) throw new Error('дружина пропала')
    const attack = applyCommand(state, { type: 'attackBand', bandId: band.id })
    expect(attack.ok).toBe(true)
    if (attack.ok) expect(attack.state.battle).not.toBeNull()
  })
})

describe('походы не встали от густоты', () => {
  it('за пять лет войска доходят и разоряют', () => {
    let settlements: Readonly<Record<string, Settlement>> = createSettlements(world)
    const [politicsStart, owned] = createPolitics(world, settlements, createRng(1))
    settlements = owned
    let politics = politicsStart
    let rng = createRng(1001)
    const [initial] = musterBands(politics, settlements, createRng(8))
    let bands = initial
    let raids = 0
    let taken = 0
    for (let day = 1; day <= 5 * 360; day += 1) {
      settlements = tickDays(world, settlements, 1).settlements
      const pol = tickPolitics(world, politics, settlements, day, rng)
      politics = pol.politics
      settlements = pol.settlements
      rng = pol.rng
      const march = tickBands(world, politics, settlements, bands, rng)
      bands = march.bands
      settlements = march.settlements
      politics = march.politics
      rng = march.rng
      for (const event of march.events) {
        if (event.type === 'bandRaid') raids += 1
        if (event.type === 'bandTook') taken += 1
      }
    }
    console.log(`за пять лет: набегов ${raids}, взято мест ${taken}`)
    // В густом мире с прежним пределом обзора в двенадцать переходов войска
    // переставали находить друг друга: за век 962 набега вместо 3496.
    //
    // Считаем дошедшие походы, а не одни набеги: с этапа 72 у войска есть
    // замысел хозяина, и поход всё чаще кончается взятым местом, а не
    // разорённым полем. Проверяется то же самое — войска доходят до цели.
    expect(raids + taken).toBeGreaterThan(60)
    expect(raids).toBeGreaterThan(20)
    expect(taken).toBeGreaterThan(10)
  })
})
