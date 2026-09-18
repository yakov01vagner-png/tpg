import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { CARAVAN_COST, WORKSHOP_COST, tickEnterprises } from '../src/enterprise'
import type { Enterprise } from '../src/enterprise'
import { createRng } from '../src/rng'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { generateWorld } from '../src/world/generate'

const world = generateWorld(1)
const settlements = createSettlements(world)

function ok(result: ReturnType<typeof applyCommand>): GameState {
  if (!result.ok) throw new Error(result.message)
  return result.state
}

function rich(money: number, locationId?: string): GameState {
  const base = createGame(createCharacter({ name: 'Вит' }), 1, world)
  return {
    ...base,
    locationId: locationId ?? base.locationId,
    character: { ...base.character, money },
  }
}

const cityId = (): string => {
  const found = Object.values(world.locations).find((one) => one.archetype === 'capital')
  if (!found) throw new Error('в мире нет столицы')
  return found.id
}

function caravan(over: Partial<Enterprise> = {}): Enterprise {
  const home = Object.keys(world.locations)[0] as string
  const away = world.roads[home]?.[0]?.to as string
  return {
    id: 'c1',
    kind: 'caravan',
    locationId: home,
    homeId: home,
    awayId: away,
    travel: null,
    travelTarget: null,
    invested: CARAVAN_COST,
    managerId: null,
    cargo: {},
    earned: 0,
    ...over,
  }
}

describe('дело, которое кормит', () => {
  it('караван стоит денег и ходит между двумя местами', () => {
    const start = rich(CARAVAN_COST + 50)
    const away = world.roads[start.locationId]?.[0]?.to
    if (!away) throw new Error('дорог нет')
    const after = ok(applyCommand(start, { type: 'foundCaravan', awayId: away }))
    expect(after.character.money).toBe(50)
    expect(after.enterprises.length).toBe(1)
    expect(after.enterprises[0]?.awayId).toBe(away)
  })

  it('мастерскую держат в городе, а не в деревне', () => {
    const village = Object.values(world.locations).find((one) => one.archetype === 'village')
    if (!village) throw new Error('деревень нет')
    const inVillage = applyCommand(rich(WORKSHOP_COST + 10, village.id), { type: 'foundWorkshop' })
    expect(inVillage.ok).toBe(false)
    const inCity = applyCommand(rich(WORKSHOP_COST + 10, cityId()), { type: 'foundWorkshop' })
    expect(inCity.ok).toBe(true)
  })

  it('мастерская приносит каждый день', () => {
    const shop: Enterprise = {
      ...caravan(),
      id: 'w1',
      kind: 'workshop',
      locationId: cityId(),
      homeId: null,
      awayId: null,
      invested: WORKSHOP_COST,
    }
    const result = tickEnterprises(world, settlements, [shop], () => 0, createRng(1))
    expect(result.income).toBeGreaterThan(0)
  })

  it('управляющий отличается от его отсутствия', () => {
    const shop: Enterprise = {
      ...caravan(),
      id: 'w1',
      kind: 'workshop',
      locationId: cityId(),
      homeId: null,
      awayId: null,
      invested: WORKSHOP_COST,
    }
    const alone = tickEnterprises(world, settlements, [shop], () => 0, createRng(1))
    const managed = tickEnterprises(
      world,
      settlements,
      [{ ...shop, managerId: 'marta' }],
      () => 6,
      createRng(1),
    )
    console.log(`мастерская: без управляющего ${alone.income}, с Мартой ${managed.income}`)
    expect(managed.income).toBeGreaterThan(alone.income)
  })

  it('караван идёт дорогой, а не по воздуху', () => {
    const one = caravan()
    const after = tickEnterprises(world, settlements, [one], () => 0, createRng(1))
    const moved = after.enterprises[0]
    expect(moved?.travel).not.toBeNull()
    expect(moved?.travel?.hoursLeft).toBeGreaterThan(0)
  })

  it('в неспокойной округе обоз грабят', () => {
    const lawless: Record<string, (typeof settlements)[string]> = {}
    for (const [id, settlement] of Object.entries(settlements)) {
      lawless[id] = { ...settlement, banditry: 1 }
    }
    const away = caravan().awayId as string
    let one = caravan({ travel: { toLocationId: away, hoursLeft: 1 } })
    let robbed = false
    for (let i = 0; i < 12 && !robbed; i += 1) {
      const after = tickEnterprises(world, lawless, [one], () => 0, createRng(i + 1))
      robbed = after.events.some((event) => event.type === 'caravanRobbed')
      one = caravan({ travel: { toLocationId: away, hoursLeft: 1 } })
    }
    expect(robbed).toBe(true)
  })

  it('дело можно свернуть и вернуть половину вложенного', () => {
    const start = rich(CARAVAN_COST + 50)
    const away = world.roads[start.locationId]?.[0]?.to
    if (!away) throw new Error('дорог нет')
    let state = ok(applyCommand(start, { type: 'foundCaravan', awayId: away }))
    const id = state.enterprises[0]?.id as string
    state = ok(applyCommand(state, { type: 'closeEnterprise', enterpriseId: id }))
    expect(state.enterprises.length).toBe(0)
    expect(state.character.money).toBe(50 + CARAVAN_COST / 2)
  })
})
