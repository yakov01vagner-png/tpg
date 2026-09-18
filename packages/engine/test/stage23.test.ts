import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import type { Settlement } from '../src/economy'
import { PLAYER, dailyTolls, landHolderOf, provinceSeat, takeLand } from '../src/holding'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { generateWorld } from '../src/world/generate'
import { isSite } from '../src/world/types'

/**
 * Этап 23: земля под рукой.
 *
 * Политика догоняет географию: лорд держит провинцию, а не точку; у глуши есть
 * хозяин земли, хотя своего хозяина у неё нет; дорога — тоже хозяйство.
 */
const world = generateWorld(1)
const start = createSettlements(world)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Провинция, в которой одному держателю принадлежит несколько мест. */
function crowdedProvince(): { provinceId: string; owner: string; places: string[] } {
  const base = createGame(createCharacter({ name: 'Т' }), 1, world)
  for (const province of Object.values(world.provinces)) {
    const byOwner = new Map<string, string[]>()
    for (const id of province.locationIds) {
      const owner = base.settlements[id]?.owner
      if (!owner) continue
      byOwner.set(owner, [...(byOwner.get(owner) ?? []), id])
    }
    for (const [owner, places] of byOwner) {
      if (places.length >= 2) return { provinceId: province.id, owner, places }
    }
  }
  throw new Error('нет провинции с двумя местами одного держателя')
}

describe('провинция следует за главным местом', () => {
  it('взяв главное место, берут и остальное того же держателя', () => {
    const { provinceId, owner, places } = crowdedProvince()
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    const seat = provinceSeat(world, base.settlements, provinceId, owner)
    expect(seat).not.toBeNull()
    const after = takeLand(world, base.settlements, seat as string, PLAYER)
    for (const id of places) {
      expect(after[id]?.owner, `${id} остался за прежним`).toBe(PLAYER)
    }
  })

  it('хутор на отшибе остаётся хутором: провинция за ним не идёт', () => {
    const { provinceId, owner, places } = crowdedProvince()
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    const seat = provinceSeat(world, base.settlements, provinceId, owner)
    const lesser = places.find((id) => id !== seat)
    if (!lesser) return
    const after = takeLand(world, base.settlements, lesser, PLAYER)
    expect(after[lesser]?.owner).toBe(PLAYER)
    expect(after[seat as string]?.owner).toBe(owner)
  })

  it('ничью землю берут просто так: провинция за ней не тянется', () => {
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    const free = Object.values(base.settlements).find((one) => one.owner === null)
    if (!free) return
    const after = takeLand(world, base.settlements, free.locationId, PLAYER)
    expect(after[free.locationId]?.owner).toBe(PLAYER)
  })
})

describe('у глуши есть хозяин земли', () => {
  it('курган стоит на чьей-то земле, хотя своего хозяина у него нет', () => {
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    let checked = 0
    for (const place of Object.values(world.locations)) {
      if (!isSite(place.archetype)) continue
      expect(base.settlements[place.id]).toBeUndefined()
      const holder = landHolderOf(world, base.settlements, place.id)
      if (holder !== null) checked += 1
    }
    expect(checked).toBeGreaterThan(20)
  })
})

describe('дорога — тоже хозяйство', () => {
  it('застава в своей провинции приносит пошлину, чужая — нет', () => {
    const province = Object.values(world.provinces).find((one) =>
      one.siteIds.some((id) => world.locations[id]?.archetype === 'outpost'),
    )
    if (!province) return
    const seat = province.locationIds[0]
    if (!seat) return
    const nothing = dailyTolls(world, start, PLAYER)
    expect(nothing).toBe(0)
    const mine: Record<string, Settlement> = {
      ...start,
      [seat]: { ...(start[seat] as Settlement), owner: PLAYER, banditry: 0 },
    }
    expect(dailyTolls(world, mine, PLAYER)).toBeGreaterThan(0)
  })

  it('в разбойной округе пошлины не берут: обозы идут в объезд', () => {
    const province = Object.values(world.provinces).find((one) =>
      one.siteIds.some((id) => world.locations[id]?.archetype === 'outpost'),
    )
    const seat = province?.locationIds[0]
    if (!province || !seat) return
    const calm: Record<string, Settlement> = {
      ...start,
      [seat]: { ...(start[seat] as Settlement), owner: PLAYER, banditry: 0 },
    }
    const lawless: Record<string, Settlement> = {
      ...start,
      [seat]: { ...(start[seat] as Settlement), owner: PLAYER, banditry: 1 },
    }
    expect(dailyTolls(world, lawless, PLAYER)).toBeLessThan(dailyTolls(world, calm, PLAYER))
  })

  it('пошлина доходит до кошелька вместе с податями', () => {
    const province = Object.values(world.provinces).find((one) =>
      one.siteIds.some((id) => world.locations[id]?.archetype === 'outpost'),
    )
    const seat = province?.locationIds[0]
    if (!province || !seat) return
    const base = createGame(createCharacter({ name: 'Т', money: 500 }), 1, world)
    const mine: GameState = {
      ...base,
      settlements: {
        ...base.settlements,
        [seat]: { ...(base.settlements[seat] as Settlement), owner: PLAYER, banditry: 0 },
      },
    }
    const after = ok(applyCommand(mine, { type: 'tick', minutes: 24 * 60 }))
    expect(after.character.money).toBeGreaterThan(500)
  })
})
