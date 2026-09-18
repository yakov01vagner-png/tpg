import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { MINUTES_PER_DAY, timeOfDay } from '../src/time'
import { generateWorld } from '../src/world/generate'
import { roadsFrom } from '../src/world/queries'
import { walkLog } from './road'

/**
 * Этап 28: что случается в пути.
 *
 * Засада перестала быть событием точки прибытия. Она случается на отрезке, её
 * опасность берётся у той земли, по которой идёшь, и считается на каждый час
 * пути — поэтому долгая дорога опаснее короткой, а ночь опаснее дня.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Мир, в котором по дорогам страшно ездить. */
function troubled(seed: number, banditry: number, at?: number): GameState {
  const base = createGame(createCharacter({ name: 'Т', money: 200 }), seed, world)
  const settlements: Record<string, (typeof base.settlements)[string]> = {}
  for (const [id, one] of Object.entries(base.settlements)) settlements[id] = { ...one, banditry }
  // С отрядом засада оборачивается боем, а одиночку просто обирают.
  return {
    ...base,
    settlements,
    time: at ?? base.time,
    party: { units: { militia: 8 }, morale: 70, hungryDays: 0, gear: 0 },
  }
}

const firstRoad = (state: GameState) => {
  const road = roadsFrom(state.world, state.locationId)[0]
  if (!road) throw new Error('дорог нет')
  return road.to
}

/** Сколько раз из N попыток дорога кончилась встречей. */
function meetings(banditry: number, seeds: number, at?: number): number {
  let met = 0
  for (let seed = 1; seed <= seeds; seed += 1) {
    const state = troubled(seed, banditry, at)
    const started = applyCommand(state, { type: 'travel', toLocationId: firstRoad(state) })
    if (!started.ok) continue
    const walked = walkLog(started.state)
    if (walked.state.battle) met += 1
    else if (walked.lines.some((line) => line.includes('Разбойники'))) met += 1
  }
  return met
}

describe('засада случается на дороге', () => {
  it('встреча происходит в пути, а не в точке прибытия', () => {
    let onTheRoad = 0
    let seen = 0
    for (let seed = 1; seed <= 24; seed += 1) {
      const state = troubled(seed, 0.9)
      const started = applyCommand(state, { type: 'travel', toLocationId: firstRoad(state) })
      if (!started.ok) continue
      const walked = walkLog(started.state)
      if (!walked.state.battle) continue
      seen += 1
      // Бой застал героя в дороге: он всё ещё между местами.
      if (walked.state.journey) onTheRoad += 1
    }
    console.log(`из 24 дорог засад ${seen}, из них в пути ${onTheRoad}`)
    expect(seen).toBeGreaterThan(0)
    expect(onTheRoad).toBe(seen)
  })

  it('в разбойной округе нарываются чаще, чем в спокойной', () => {
    const calm = meetings(0, 24)
    const grim = meetings(0.9, 24)
    console.log(`встреч из 24: спокойно ${calm}, разбойно ${grim}`)
    expect(grim).toBeGreaterThan(calm)
  })

  it('ночью на дороге опаснее, чем днём', () => {
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    const day = base.time - (base.time % MINUTES_PER_DAY) + 10 * 60
    const night = base.time - (base.time % MINUTES_PER_DAY) + 1 * 60
    expect(timeOfDay(night)).toBe('night')
    // Шестьдесят зёрен, а не двадцать: правило вероятностное, и на малой
    // выборке день с ночью честно совпадают по случайности.
    const byDay = meetings(0.6, 60, day)
    const byNight = meetings(0.6, 60, night)
    console.log(`встреч из 60: днём ${byDay}, ночью ${byNight}`)
    expect(byNight).toBeGreaterThan(byDay)
  })
})

describe('ночь на дороге', () => {
  it('ночью идут медленнее', () => {
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    const day = base.time - (base.time % MINUTES_PER_DAY) + 10 * 60
    const night = base.time - (base.time % MINUTES_PER_DAY) + 1 * 60
    const to = firstRoad(base)
    const walkHour = (from: GameState) => {
      const out = ok(applyCommand(from, { type: 'travel', toLocationId: to }))
      const after = ok(applyCommand(out, { type: 'tick', minutes: 60 }))
      return after.journey?.done ?? 0
    }
    const byDay = walkHour({ ...base, time: day })
    const byNight = walkHour({ ...base, time: night })
    console.log(`за час прошли: днём ${byDay}, ночью ${byNight}`)
    expect(byNight).toBeLessThan(byDay)
  })

  it('лагерь на дороге стоит ночи, но с места не двигает', () => {
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    const out = ok(applyCommand(base, { type: 'travel', toLocationId: firstRoad(base) }))
    const tired = { ...out, character: { ...out.character, fatigue: 60 } }
    const camped = ok(applyCommand(tired, { type: 'camp' }))
    expect(camped.journey?.done).toBe(out.journey?.done)
    expect(camped.character.fatigue).toBeLessThan(tired.character.fatigue)
    expect(camped.time).toBeGreaterThan(tired.time)
  })
})

describe('дорога рассказывает, что впереди', () => {
  it('войско на том конце отрезка видно заранее', () => {
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    const to = firstRoad(base)
    const band = base.bands[0]
    if (!band) throw new Error('дружин нет')
    const watched: GameState = {
      ...base,
      bands: [{ ...band, locationId: to, travel: null }, ...base.bands.slice(1)],
    }
    const out = ok(applyCommand(watched, { type: 'travel', toLocationId: to }))
    const step = applyCommand(out, { type: 'tick', minutes: 60 })
    expect(step.ok).toBe(true)
    if (!step.ok) return
    const lines = step.events.map((one) => ('text' in one ? String(one.text) : ''))
    expect(lines.some((line) => line.includes('Впереди на дороге войско'))).toBe(true)
  })
})
