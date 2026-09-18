import { describe, expect, it } from 'vitest'
import { createSettlements } from '../src/economy'
import type { Settlement } from '../src/economy'
import { carryingCapacity, tickDays } from '../src/life'
import { createRng } from '../src/rng'
import { tickSettling } from '../src/settle'
import { generateWorld } from '../src/world/generate'
import { layoutOf } from '../src/world/layout'
import type { World } from '../src/world/types'

const world = generateWorld(1)
const start = createSettlements(world)

/** Деревня в провинции, где нет городка: только такая и может перерасти. */
function someVillage(): string {
  const big = new Set(['town', 'city', 'capital', 'port'])
  const found = Object.values(world.locations).find(
    (one) =>
      one.archetype === 'village' &&
      !(world.provinces[one.provinceId]?.locationIds ?? []).some((id) =>
        big.has(world.locations[id]?.archetype ?? ''),
      ),
  )
  if (!found) throw new Error('нет деревни в провинции без городка')
  return found.id
}

/** Мир, в котором одно место набито людьми под завязку. */
function crowded(locationId: string, share: number): Record<string, Settlement> {
  const ceiling = carryingCapacity(world, locationId, start[locationId])
  const one = start[locationId]
  if (!one) throw new Error('нет такого места')
  return { ...start, [locationId]: { ...one, population: Math.round(ceiling * share) } }
}

describe('места основывают и бросают', () => {
  it('основание не сдвигает на карте ничего из того, что уже стояло', () => {
    // Ради этого правила пришлось переписать раскладку: раньше положение места
    // считалось от его номера в провинции, и одна новая деревня двигала всех
    // соседей. Мир нельзя было пополнить, не перерисовав его целиком.
    const before = layoutOf(world)
    const provinceId = world.locations[someVillage()]?.provinceId as string
    const province = world.provinces[provinceId]
    if (!province) throw new Error('нет провинции')
    const grown: World = {
      ...world,
      locations: {
        ...world.locations,
        'test:new': {
          id: 'test:new',
          provinceId,
          name: 'Новины',
          archetype: 'village',
          terrain: 'plains',
          population: 60,
        },
      },
      provinces: {
        ...world.provinces,
        [provinceId]: { ...province, locationIds: [...province.locationIds, 'test:new'] },
      },
    }
    const after = layoutOf(grown)
    for (const [id, point] of Object.entries(before)) {
      expect(after[id]).toEqual(point)
    }
    expect(after['test:new']).toBeDefined()
  })

  it('тесная провинция ставит выселок, и он дописывается в конец', () => {
    const village = someVillage()
    const provinceId = world.locations[village]?.provinceId as string
    const before = world.provinces[provinceId]?.locationIds ?? []
    let places = crowded(village, 6)
    let current = world
    let rng = createRng(2)
    let founded: string | null = null
    for (let year = 1; year <= 40 && !founded; year += 1) {
      const result = tickSettling(current, places, year * 365, rng)
      current = result.world
      places = { ...result.settlements }
      rng = result.rng
      // Основать может и другая провинция — нас интересует своя.
      founded =
        result.events.find(
          (one) =>
            one.type === 'founded' && current.locations[one.locationId]?.provinceId === provinceId,
        )?.locationId ?? null
    }
    expect(founded).not.toBeNull()
    const after = current.provinces[provinceId]?.locationIds ?? []
    // Скелет пополняется только с конца: на этом стоит раскладка карты.
    expect(after.slice(0, before.length)).toEqual(before)
    expect(after.length).toBe(before.length + 1)
    expect(current.roads[founded as string]?.length).toBeGreaterThan(0)
  })

  it('место, забившее свою землю, перерастает имя', () => {
    const village = someVillage()
    const places = crowded(village, 0.95)
    const result = tickSettling(world, places, 400, createRng(1))
    const grew = result.events.find((one) => one.type === 'grew' && one.locationId === village)
    expect(grew).toBeDefined()
    expect(result.world.locations[village]?.archetype).toBe('town')
  })

  it('второго городка провинция не прокормит', () => {
    // В провинции уже есть городок — деревня в ней останется деревней, как бы
    // ни разрослась. Иначе мир раздувался втрое за век: каждое место получало
    // впятеро больший предел и росло дальше.
    const village = someVillage()
    const provinceId = world.locations[village]?.provinceId as string
    const withTown: World = {
      ...world,
      locations: Object.fromEntries(
        Object.entries(world.locations).map(([id, one]) =>
          id !== village && one.provinceId === provinceId
            ? [id, { ...one, archetype: 'town' as const }]
            : [id, one],
        ),
      ),
    }
    const result = tickSettling(withTown, crowded(village, 0.95), 400, createRng(1))
    expect(result.events.some((one) => one.type === 'grew' && one.locationId === village)).toBe(
      false,
    )
  })

  it('руины заселяют заново: земля никуда не делась', () => {
    const village = someVillage()
    const provinceId = world.locations[village]?.provinceId as string
    const dead = Object.fromEntries(
      Object.entries(start).map(([id, one]) =>
        world.locations[id]?.provinceId === provinceId && id === village
          ? [id, { ...one, population: 0 }]
          : [id, one],
      ),
    )
    let places = dead
    let rng = createRng(5)
    let back = false
    for (let year = 1; year <= 60 && !back; year += 1) {
      const result = tickSettling(world, places, year * 365, rng)
      places = { ...result.settlements }
      rng = result.rng
      back = result.events.some((one) => one.type === 'resettled' && one.locationId === village)
    }
    expect(back).toBe(true)
    expect(places[village]?.population).toBeGreaterThan(0)
  })
})

describe('земля, которая устаёт', () => {
  it('поле под полной нагрузкой беднеет, а брошенное отходит', () => {
    const village = someVillage()
    const worked = crowded(village, 1.1)
    let places: Readonly<Record<string, Settlement>> = worked
    for (let day = 1; day <= 900; day += 1) places = tickDays(world, places, 1).settlements
    const tired = places[village]?.strain ?? 0
    expect(tired).toBeGreaterThan(0.2)

    // Та же земля, но людей на ней почти нет.
    let empty: Readonly<Record<string, Settlement>> = {
      ...worked,
      [village]: { ...(worked[village] as Settlement), population: 30, strain: tired },
    }
    for (let day = 1; day <= 900; day += 1) empty = tickDays(world, empty, 1).settlements
    console.log(
      `усталость земли: под полной пашней ${(tired * 100).toFixed(0)}%, ` +
        `под паром ${((empty[village]?.strain ?? 0) * 100).toFixed(0)}%`,
    )
    expect(empty[village]?.strain ?? 1).toBeLessThan(tired)
  })

  it('усталость бьёт по урожаю, а не по тому, сколько народу поместится', () => {
    const village = someVillage()
    const one = start[village] as Settlement
    const fresh = carryingCapacity(world, village, { ...one, strain: 0 })
    const tired = carryingCapacity(world, village, { ...one, strain: 1 })
    // Предел один и тот же: иначе мир встаёт намертво — все места оказываются
    // выше него, расти некуда, а голода всё равно нет.
    expect(tired).toBe(fresh)
  })
})
