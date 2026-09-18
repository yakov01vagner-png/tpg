import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { journeyLeft, journeyProgress, legHoursFor, paceOf } from '../src/journey'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { generateWorld } from '../src/world/generate'
import { roadsFrom } from '../src/world/queries'
import { goTo, walkOut } from './road'

/**
 * Этап 27: путь — это часы, а не команда.
 *
 * До 0.4 перемещение было мгновенным: одна команда, время скакнуло, герой на
 * месте. Теперь между местами можно находиться, и это меняет всё остальное —
 * от того, где случается засада, до того, что нельзя торговать под открытым
 * небом.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}
const home = () => createGame(createCharacter({ name: 'Вит', money: 300 }), 1, world)
const firstRoad = (state: GameState) => {
  const road = roadsFrom(state.world, state.locationId)[0]
  if (!road) throw new Error('из стартового места нет дорог')
  return road
}

describe('выйти — не значит прийти', () => {
  it('команда ставит на дорогу, а не переносит', () => {
    const base = home()
    const road = firstRoad(base)
    const after = ok(applyCommand(base, { type: 'travel', toLocationId: road.to }))
    expect(after.locationId).toBe(base.locationId)
    expect(after.journey?.toId).toBe(road.to)
    expect(after.journey?.done).toBe(0)
    // Время на выход не уходит: уходит на дорогу.
    expect(after.time).toBe(base.time)
  })

  it('часы двигают путь, и в конце — приход', () => {
    const base = home()
    const road = firstRoad(base)
    let state = ok(applyCommand(base, { type: 'travel', toLocationId: road.to }))
    const total = state.journey?.hours ?? 0
    expect(total).toBeGreaterThan(0)
    let walked = 0
    while (state.journey && walked < 48) {
      const before = journeyLeft(state.journey)
      state = ok(applyCommand(state, { type: 'tick', minutes: 60 }))
      walked += 1
      if (state.journey) expect(journeyLeft(state.journey)).toBeLessThan(before)
    }
    expect(state.journey).toBeNull()
    expect(state.locationId).toBe(road.to)
    expect(walked).toBe(total)
    console.log(`${total} ч пути — ${walked} часовых тактов`)
  })

  it('полоса заполняется ровно', () => {
    const base = home()
    const road = firstRoad(base)
    const state = ok(applyCommand(base, { type: 'travel', toLocationId: road.to }))
    const journey = state.journey
    if (!journey) throw new Error('не вышли')
    expect(journeyProgress(journey)).toBe(0)
    expect(journeyProgress({ ...journey, done: journey.hours / 2 })).toBeCloseTo(0.5)
    expect(journeyProgress({ ...journey, done: journey.hours })).toBe(1)
  })

  it('дорога берёт силы по мере ходьбы, а не разом на выходе', () => {
    const base = home()
    const road = firstRoad(base)
    const out = ok(applyCommand(base, { type: 'travel', toLocationId: road.to }))
    expect(out.character.fatigue).toBe(base.character.fatigue)
    const half = ok(applyCommand(out, { type: 'tick', minutes: 60 }))
    expect(half.character.fatigue).toBeGreaterThan(base.character.fatigue)
    const done = walkOut(half)
    expect(done.character.fatigue).toBeGreaterThan(half.character.fatigue)
  })
})

describe('с дороги есть выход', () => {
  it('повернуть назад: пройденное становится оставшимся', () => {
    const base = home()
    const road = firstRoad(base)
    let state = ok(applyCommand(base, { type: 'travel', toLocationId: road.to }))
    const total = state.journey?.hours ?? 0
    state = ok(applyCommand(state, { type: 'tick', minutes: 60 }))
    const turned = ok(applyCommand(state, { type: 'turnBack' }))
    expect(turned.journey?.toId).toBe(base.locationId)
    // Час прошли — час и возвращаться.
    expect(journeyLeft(turned.journey as NonNullable<typeof turned.journey>)).toBe(1)
    const home2 = walkOut(turned)
    expect(home2.locationId).toBe(base.locationId)
    expect(total).toBeGreaterThan(1)
  })

  it('лагерь разбивают прямо на дороге', () => {
    const base = home()
    const road = firstRoad(base)
    const state = ok(applyCommand(base, { type: 'travel', toLocationId: road.to }))
    const camped = applyCommand(state, { type: 'camp' })
    expect(camped.ok).toBe(true)
  })
})

describe('в пути нельзя то, для чего нужно место', () => {
  it('торг, работа и наём под открытым небом не идут', () => {
    const base = home()
    const road = firstRoad(base)
    const state = ok(applyCommand(base, { type: 'travel', toLocationId: road.to }))
    for (const command of [
      { type: 'work', jobId: 'ditch' },
      { type: 'buy', good: 'grain', amount: 1 },
      { type: 'hire', troop: 'militia', count: 1 },
      { type: 'travel', toLocationId: road.to },
    ] as const) {
      const result = applyCommand(state, command)
      expect(result.ok, `${command.type} прошла в пути`).toBe(false)
      if (!result.ok) expect(result.code).toBe('onTheRoad')
    }
  })

  it('а часы, отдых и спутники — идут', () => {
    const base = home()
    const road = firstRoad(base)
    const state = ok(applyCommand(base, { type: 'travel', toLocationId: road.to }))
    expect(applyCommand(state, { type: 'tick', minutes: 30 }).ok).toBe(true)
    expect(applyCommand(state, { type: 'rest', hours: 2 }).ok).toBe(true)
  })
})

describe('отряд идёт со скоростью обоза', () => {
  it('конные быстрее пеших, толпа медленнее малого отряда', () => {
    const alone = paceOf({ units: {}, morale: 60, hungryDays: 0, gear: 0 }, false)
    const foot = paceOf({ units: { militia: 60 }, morale: 60, hungryDays: 0, gear: 0 }, false)
    const horse = paceOf({ units: { horseman: 60 }, morale: 60, hungryDays: 0, gear: 0 }, false)
    const hurt = paceOf({ units: { militia: 10 }, morale: 60, hungryDays: 0, gear: 0 }, true)
    console.log(
      `шаг: один ${alone}, шесть десятков пеших ${foot}, конных ${horse}, с раной ${hurt}`,
    )
    expect(foot).toBeGreaterThan(alone)
    expect(horse).toBeLessThan(foot)
    expect(hurt).toBeGreaterThan(
      paceOf({ units: { militia: 10 }, morale: 60, hungryDays: 0, gear: 0 }, false),
    )
    expect(legHoursFor(10, foot)).toBeGreaterThan(legHoursFor(10, horse))
  })

  it('это видно в часах ещё до выхода', () => {
    const base = home()
    const road = firstRoad(base)
    const light = ok(applyCommand(base, { type: 'travel', toLocationId: road.to }))
    const heavy = ok(
      applyCommand(
        { ...base, party: { units: { militia: 80 }, morale: 60, hungryDays: 0, gear: 0 } },
        { type: 'travel', toLocationId: road.to },
      ),
    )
    console.log(
      `один идёт ${light.journey?.hours} ч, с восемью десятками — ${heavy.journey?.hours} ч`,
    )
    expect(heavy.journey?.hours ?? 0).toBeGreaterThan(light.journey?.hours ?? 0)
  })
})

describe('сохранение знает про дорогу', () => {
  it('герой в пути переживает запись и чтение', () => {
    const base = home()
    const road = firstRoad(base)
    const state = ok(applyCommand(base, { type: 'travel', toLocationId: road.to }))
    const walked = ok(applyCommand(state, { type: 'tick', minutes: 60 }))
    const copy = JSON.parse(JSON.stringify(walked)) as GameState
    expect(copy.journey).toEqual(walked.journey)
    const arrived = goTo(base, road.to)
    expect(arrived.journey).toBeNull()
  })
})
