import { describe, expect, it } from 'vitest'
import { OVERGROWN, roadHours } from '../src/band'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { hireCompanion } from '../src/companion'
import { COMPANIONS } from '../src/content/companions'
import { createSettlements } from '../src/economy'
import type { Settlement } from '../src/economy'
import { type Plague, tickPlague } from '../src/plague'
import { createRng } from '../src/rng'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { generateWorld } from '../src/world/generate'
import { roadsFrom } from '../src/world/queries'

const world = generateWorld(1)
const start = createSettlements(world)

function bigPlace(): string {
  const found = Object.values(start).sort((a, b) => b.population - a.population)[0]
  if (!found) throw new Error('мир пуст')
  return found.locationId
}

function ok(result: ReturnType<typeof applyCommand>): GameState {
  if (!result.ok) throw new Error(result.message)
  return result.state
}

/** Мор в одном месте, N суток, с лекарем или без. */
function toll(healer: string | null, quarantined: boolean): number {
  const source = bigPlace()
  const one = start[source] as Settlement
  let places: Readonly<Record<string, Settlement>> = { ...start, [source]: { ...one, quarantined } }
  let plagues: readonly Plague[] = [{ locationId: source, daysLeft: 40, severity: 1 }]
  let rng = createRng(11)
  for (let day = 1; day <= 40; day += 1) {
    const result = tickPlague(world, places, plagues, rng, healer)
    plagues = result.plagues
    places = result.settlements
    rng = result.rng
  }
  return (start[source]?.population ?? 0) - (places[source]?.population ?? 0)
}

describe('мор: чем отвечают', () => {
  it('лекарь рядом — мор уносит меньше', () => {
    const alone = toll(null, false)
    const treated = toll(bigPlace(), false)
    console.log(`умерло без лекаря ${alone}, с лекарем ${treated}`)
    expect(treated).toBeLessThan(alone)
  })

  it('закрытые ворота: внутри мрут чуть меньше, наружу выходит втрое реже', () => {
    const source = bigPlace()
    const neighbours = roadsFrom(world, source).map((road) => road.to)
    const spreadFrom = (quarantined: boolean): number => {
      const one = start[source] as Settlement
      let places: Readonly<Record<string, Settlement>> = {
        ...start,
        [source]: { ...one, quarantined },
      }
      let plagues: readonly Plague[] = [{ locationId: source, daysLeft: 60, severity: 1 }]
      let spread = 0
      for (let seed = 1; seed <= 12; seed += 1) {
        let rng = createRng(seed)
        places = { ...start, [source]: { ...one, quarantined } }
        plagues = [{ locationId: source, daysLeft: 60, severity: 1 }]
        for (let day = 1; day <= 60; day += 1) {
          const result = tickPlague(world, places, plagues, rng)
          spread += result.events.filter(
            (event) => event.type === 'plagueSpread' && event.from === source,
          ).length
          plagues = result.plagues
          places = result.settlements
          rng = result.rng
        }
      }
      return spread
    }
    const open = spreadFrom(false)
    const shut = spreadFrom(true)
    console.log(`перекинулся на соседей (${neighbours.length}): открыто ${open}, закрыто ${shut}`)
    expect(shut).toBeLessThan(open)
    expect(toll(null, true)).toBeLessThan(toll(null, false))
  })

  it('ворота открываются сами, когда мор ушёл', () => {
    const source = bigPlace()
    const one = start[source] as Settlement
    let places: Readonly<Record<string, Settlement>> = {
      ...start,
      [source]: { ...one, quarantined: true },
    }
    let plagues: readonly Plague[] = [{ locationId: source, daysLeft: 3, severity: 0.5 }]
    let rng = createRng(2)
    for (let day = 1; day <= 5; day += 1) {
      const result = tickPlague(world, places, plagues, rng)
      plagues = result.plagues
      places = result.settlements
      rng = result.rng
    }
    expect(places[source]?.quarantined).toBe(false)
  })

  it('запереть ворота может только хозяин, и только от мора', () => {
    const base = createGame(createCharacter({ name: 'Вит' }), 1, world)
    const here = base.locationId
    const notMine = applyCommand(base, { type: 'quarantine' })
    expect(notMine.ok).toBe(false)

    const owned: GameState = {
      ...base,
      settlements: {
        ...base.settlements,
        [here]: { ...(base.settlements[here] as Settlement), owner: 'player' },
      },
    }
    const noPlague = applyCommand(owned, { type: 'quarantine' })
    expect(noPlague.ok).toBe(false)

    const sick: GameState = {
      ...owned,
      plagues: [{ locationId: here, daysLeft: 20, severity: 0.7 }],
    }
    const shut = ok(applyCommand(sick, { type: 'quarantine' }))
    expect(shut.settlements[here]?.quarantined).toBe(true)
  })

  it('лекарь-спутник считается: с ним в отряде мор в твоём месте уносит меньше', () => {
    // Мерить надо там, где мор виден. В деревне на четыре сотни душ он уносит
    // человека в сутки, а прирост даёт столько же, и разница тонет в росте.
    const base = createGame(createCharacter({ name: 'Вит' }), 1, world)
    const here = bigPlace()
    const sick: GameState = {
      ...base,
      locationId: here,
      plagues: [{ locationId: here, daysLeft: 30, severity: 1 }],
    }
    const healer = COMPANIONS.hedwar
    if (!healer) throw new Error('нет лекаря')
    const withHealer: GameState = { ...sick, companions: [hireCompanion(healer)] }
    const day = 24 * 60
    let a = sick
    let b = withHealer
    for (let i = 0; i < 20; i += 1) {
      a = ok(applyCommand(a, { type: 'tick', minutes: day }))
      b = ok(applyCommand(b, { type: 'tick', minutes: day }))
    }
    const lostAlone =
      (sick.settlements[here]?.population ?? 0) - (a.settlements[here]?.population ?? 0)
    const lostHealed =
      (sick.settlements[here]?.population ?? 0) - (b.settlements[here]?.population ?? 0)
    expect(lostHealed).toBeLessThan(lostAlone)
  })
})

describe('дороги к мёртвым местам', () => {
  it('зарастают: к руинам идти вдвое дольше', () => {
    const from = Object.keys(world.locations)[0] as string
    const road = roadsFrom(world, from)[0]
    if (!road) throw new Error('дорог нет')
    expect(roadHours(world, start, from, road.to)).toBe(road.hours)
    const ruined = { ...start, [road.to]: { ...(start[road.to] as Settlement), population: 0 } }
    expect(roadHours(world, ruined, from, road.to)).toBe(road.hours * OVERGROWN)
  })

  it('игрок это чувствует: путь к руинам занимает больше времени', () => {
    const base = createGame(createCharacter({ name: 'Вит' }), 1, world)
    const road = roadsFrom(world, base.locationId)[0]
    if (!road) throw new Error('дорог нет')
    const alive = ok(applyCommand(base, { type: 'travel', toLocationId: road.to }))
    const ruined: GameState = {
      ...base,
      settlements: {
        ...base.settlements,
        [road.to]: { ...(base.settlements[road.to] as Settlement), population: 0 },
      },
    }
    const overgrown = ok(applyCommand(ruined, { type: 'travel', toLocationId: road.to }))
    // Путь считается на выходе: заросшая дорога — это больше часов впереди.
    expect(overgrown.journey?.hours ?? 0).toBeGreaterThan(alive.journey?.hours ?? 0)
  })
})
