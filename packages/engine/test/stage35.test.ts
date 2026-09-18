import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { SHIPS } from '../src/content/ships'
import { routeTo } from '../src/journey'
import { ABOARD_MAX } from '../src/ship'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { generateWorld } from '../src/world/generate'
import { lanesFrom } from '../src/world/lanes'
import { reachableFrom } from '../src/world/queries'

/**
 * Этап 35: корабли и морской путь.
 *
 * До 0.5 порт был городком, у которого в описании сказано «порт»: море
 * кончалось обрезом карты, и плыть было некуда и не на чем. Теперь у моря есть
 * пути, у путей — часы, а у острова нет дороги вовсе: на него можно только
 * приплыть.
 */

const SEEDS = [1, 2, 3]
const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Гавань, из которой есть куда плыть, и путь из неё. */
const harbour = (() => {
  for (const place of Object.values(world.locations)) {
    const lanes = lanesFrom(world, place.id)
    if (lanes.length > 0 && lanes[0]) return { id: place.id, lane: lanes[0] }
  }
  throw new Error('в мире нет гаваней')
})()

function atHarbour(money = 20000, seed = 1): GameState {
  return {
    ...createGame(createCharacter({ name: 'Т', money }), seed, world),
    locationId: harbour.id,
  }
}

/** Плыть, пока плывётся. */
function sailOut(state: GameState, maxHours = 200): GameState {
  let current = state
  for (let hour = 0; hour < maxHours && current.journey && !current.battle; hour += 1) {
    current = ok(applyCommand(current, { type: 'tick', minutes: 60 }))
  }
  return current
}

describe('морской путь — это часы, а не перенос', () => {
  it('в море выходят, а не оказываются на том берегу', () => {
    const state = atHarbour()
    const sailing = ok(
      applyCommand(state, { type: 'sail', toLocationId: harbour.lane.to, manner: 'hire' }),
    )
    expect(sailing.journey?.sea, 'путь не морской').toBe(true)
    expect(sailing.locationId, 'герой перенёсся').toBe(harbour.id)
    expect(sailing.journey?.hours ?? 0).toBeGreaterThanOrEqual(2)

    // Час хода — час времени: на полпути герой всё ещё в море.
    const half = ok(applyCommand(sailing, { type: 'tick', minutes: 60 }))
    expect(half.journey).not.toBeNull()
    expect(half.time).toBeGreaterThan(sailing.time)

    const arrived = sailOut(sailing)
    expect(arrived.journey, 'так и не доплыли').toBeNull()
    expect(arrived.locationId).toBe(harbour.lane.to)
  })

  it('в море не встают лагерем и не сворачивают на дорогу', () => {
    const sailing = ok(
      applyCommand(atHarbour(), { type: 'sail', toLocationId: harbour.lane.to, manner: 'hire' }),
    )
    const camp = applyCommand(sailing, { type: 'camp' })
    expect(camp.ok).toBe(false)
    const road = applyCommand(sailing, { type: 'travel', toLocationId: harbour.lane.to })
    expect(road.ok).toBe(false)
  })

  it('морем быстрее, чем берегом', () => {
    let faster = 0
    let pairs = 0
    for (const [fromId, lanes] of Object.entries(world.lanes ?? {})) {
      for (const lane of lanes) {
        if (fromId > lane.to) continue
        const byLand = routeTo(world, fromId, lane.to)
        if (!byLand) continue
        pairs += 1
        if (lane.hours < byLand.hours) faster += 1
      }
    }
    expect(pairs, 'нет пар, связанных и морем, и сушей').toBeGreaterThan(0)
    console.log(`пар «море и суша» ${pairs}, морем быстрее в ${faster}`)
    expect(faster / pairs).toBeGreaterThan(0.85)
  })
})

describe('из порта уходят тремя способами', () => {
  it('своим судном — только если оно есть', () => {
    const state = atHarbour()
    const without = applyCommand(state, {
      type: 'sail',
      toLocationId: harbour.lane.to,
      manner: 'own',
    })
    expect(without.ok).toBe(false)
    if (!without.ok) expect(without.code).toBe('requirements')

    const bought = ok(applyCommand(state, { type: 'buyShip', kind: 'ladya' }))
    expect(bought.ship?.kind).toBe('ladya')
    expect(bought.character.money).toBe(state.character.money - SHIPS.ladya.price)
    const sailing = ok(
      applyCommand(bought, { type: 'sail', toLocationId: harbour.lane.to, manner: 'own' }),
    )
    // Своё судно не берёт денег за перевоз: оно уже оплачено.
    expect(sailing.character.money).toBe(bought.character.money)
    expect(sailing.journey?.manner).toBe('own')
  })

  it('нанятое судно стоит денег, попутное — грошей', () => {
    const state = atHarbour(600)
    const hired = ok(
      applyCommand(state, { type: 'sail', toLocationId: harbour.lane.to, manner: 'hire' }),
    )
    const aboard = ok(
      applyCommand(state, { type: 'sail', toLocationId: harbour.lane.to, manner: 'aboard' }),
    )
    const hiredPaid = state.character.money - hired.character.money
    const aboardPaid = state.character.money - aboard.character.money
    console.log(
      `перевоз на ${harbour.lane.hours} ч: нанять ${hiredPaid}, попутным ${aboardPaid} (идти ${hired.journey?.hours} и ${aboard.journey?.hours} ч)`,
    )
    expect(hiredPaid).toBeGreaterThan(aboardPaid)
    expect(aboardPaid).toBeGreaterThan(0)
    // Попутное идёт дольше: шкипер идёт по своим делам, а не по твоим.
    expect(aboard.journey?.hours ?? 0).toBeGreaterThan(hired.journey?.hours ?? 0)
    // И ждать его дольше: отплытие — это уже потраченное время.
    expect(aboard.time).toBeGreaterThan(hired.time)
  })

  it('на попутное судно рать не берут', () => {
    const state = atHarbour()
    const withArmy: GameState = {
      ...state,
      party: { ...state.party, units: { militia: ABOARD_MAX + 20 } },
    }
    const aboard = applyCommand(withArmy, {
      type: 'sail',
      toLocationId: harbour.lane.to,
      manner: 'aboard',
    })
    expect(aboard.ok).toBe(false)
    if (!aboard.ok) expect(aboard.code).toBe('noRoom')
    // А нанятое — берёт.
    expect(
      applyCommand(withArmy, { type: 'sail', toLocationId: harbour.lane.to, manner: 'hire' }).ok,
    ).toBe(true)
  })

  it('судно ветшает и чинится, и его можно продать', () => {
    const bought = ok(applyCommand(atHarbour(), { type: 'buyShip', kind: 'shnyaka' }))
    const worn: GameState = {
      ...bought,
      ship: bought.ship ? { ...bought.ship, condition: 0.5 } : null,
    }
    const fixed = ok(applyCommand(worn, { type: 'repairShip' }))
    expect(fixed.ship?.condition).toBe(1)
    expect(fixed.character.money).toBeLessThan(worn.character.money)
    const sold = ok(applyCommand(fixed, { type: 'sellShip' }))
    expect(sold.ship).toBeNull()
    expect(sold.character.money).toBeGreaterThan(fixed.character.money)
  })
})

describe('в море случается своё', () => {
  it('за сотню переходов бывает и шторм, и штиль, и чужой парус', () => {
    let storms = 0
    let calms = 0
    let raiders = 0
    let voyages = 0
    for (let seed = 1; seed <= 60; seed += 1) {
      const state = {
        ...atHarbour(4000, seed),
        party: { ...atHarbour().party, units: { militia: 6 }, morale: 70 },
      }
      const started = applyCommand(state, {
        type: 'sail',
        toLocationId: harbour.lane.to,
        manner: 'hire',
      })
      if (!started.ok) continue
      voyages += 1
      let current = started.state
      for (let hour = 0; hour < 200 && current.journey; hour += 1) {
        const step = applyCommand(current, { type: 'tick', minutes: 60 })
        if (!step.ok) break
        current = step.state
        for (const event of step.events) {
          const text = 'text' in event ? String(event.text) : ''
          if (text.includes('Шторм')) storms += 1
          if (text.includes('Штиль')) calms += 1
          if (text.includes('чёрным парусом') || text.includes('Пираты')) raiders += 1
        }
        if (current.battle) break
      }
    }
    console.log(
      `за ${voyages} переходов морем: штормов ${storms}, штилей ${calms}, пиратов ${raiders}`,
    )
    expect(storms).toBeGreaterThan(0)
    expect(calms).toBeGreaterThan(0)
    expect(raiders).toBeGreaterThan(0)
  })
})

describe('на остров не прийти пешком', () => {
  it('остров есть, и дороги на него нет', () => {
    for (const seed of SEEDS) {
      const current = generateWorld(seed)
      const islands = Object.values(current.provinces).filter((one) => one.island)
      expect(islands.length, `зерно ${seed}: островов нет`).toBeGreaterThanOrEqual(3)

      const mainland = Object.values(current.locations).find(
        (one) => !current.provinces[one.provinceId]?.island,
      )
      if (!mainland) continue
      const byLand = reachableFrom(current, mainland.id, false)
      const byAny = reachableFrom(current, mainland.id, true)
      for (const island of islands) {
        for (const id of island.locationIds) {
          expect(byLand.has(id), `${id}: на остров ведёт дорога`).toBe(false)
          expect(byAny.has(id), `${id}: до острова не доплыть`).toBe(true)
        }
      }
    }
  })

  it('у острова своя гавань и свой путь на материк', () => {
    for (const seed of SEEDS) {
      const current = generateWorld(seed)
      for (const island of Object.values(current.provinces).filter((one) => one.island)) {
        const ports = island.locationIds.filter((id) => current.locations[id]?.archetype === 'port')
        expect(ports.length, `${island.name} без гавани`).toBeGreaterThan(0)
        const lanes = ports.flatMap((id) => lanesFrom(current, id))
        expect(lanes.length, `${island.name}: из гавани некуда плыть`).toBeGreaterThan(0)
        const ashore = lanes.some(
          (lane) => !current.provinces[current.locations[lane.to]?.provinceId ?? '']?.island,
        )
        expect(ashore, `${island.name}: пути только между островами`).toBe(true)
      }
    }
  })

  it('короне остров не достался: там нет ни лорда, ни каравана', () => {
    const state = createGame(createCharacter({ name: 'Т', money: 5000 }), 1, world)
    const island = Object.values(world.provinces).find((one) => one.island)
    const islandPlace = island?.locationIds[0] ?? ''
    expect(state.settlements[islandPlace]?.owner ?? null, 'остров за короной').toBeNull()
    // Каравану туда не дойти: обоз ходит по дорогам, а дороги нет.
    const caravan = applyCommand(state, { type: 'foundCaravan', awayId: islandPlace })
    expect(caravan.ok).toBe(false)
  })
})
