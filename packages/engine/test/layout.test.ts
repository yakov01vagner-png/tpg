import { describe, expect, it } from 'vitest'
import { KINGDOM_CENTERS } from '../src/content/world'
import { generateWorld } from '../src/world/generate'
import { MAP_SIZE, layoutOf } from '../src/world/layout'
import { roadsFrom } from '../src/world/queries'

const world = generateWorld(1)
const layout = layoutOf(world)

describe('раскладка карты', () => {
  it('ставит на карту каждое поселение', () => {
    expect(Object.keys(layout).length).toBe(Object.keys(world.locations).length)
    for (const id of Object.keys(world.locations)) {
      expect(layout[id]).toBeDefined()
    }
  })

  it('не хранит координаты в сейве: одна и та же раскладка выводится заново', () => {
    expect(layoutOf(generateWorld(1))).toEqual(layout)
  })

  it('держит все точки в пределах полотна', () => {
    for (const point of Object.values(layout)) {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(MAP_SIZE)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThanOrEqual(MAP_SIZE)
    }
  })

  it('не кладёт поселения друг на друга: каждое видно и по каждому можно попасть', () => {
    const all = Object.values(layout)
    for (let i = 0; i < all.length; i += 1) {
      const a = all[i]
      for (let j = i + 1; j < all.length; j += 1) {
        const b = all[j]
        if (!a || !b) continue
        expect(distance(a, b)).toBeGreaterThanOrEqual(16)
      }
    }
  })

  it('держит королевства порознь: свои ближе к своей столице, чем к чужой', () => {
    for (const kingdom of Object.values(world.kingdoms)) {
      const own = KINGDOM_CENTERS[kingdom.id]
      if (!own) throw new Error(`у королевства ${kingdom.id} нет места на карте`)
      const others = Object.entries(KINGDOM_CENTERS).filter(([id]) => id !== kingdom.id)
      for (const regionId of kingdom.regionIds) {
        for (const provinceId of world.regions[regionId]?.provinceIds ?? []) {
          for (const locationId of world.provinces[provinceId]?.locationIds ?? []) {
            const point = layout[locationId]
            if (!point) throw new Error(`поселение ${locationId} не попало на карту`)
            const mine = distance(point, own)
            for (const [, center] of others) {
              expect(mine).toBeLessThan(distance(point, center))
            }
          }
        }
      }
    }
  })

  it('дороги внутри королевства остаются короткими: через всю карту ходят только тракты между столицами', () => {
    for (const [from, point] of Object.entries(layout)) {
      for (const road of roadsFrom(world, from)) {
        const other = layout[road.to]
        if (!other) continue
        if (kingdomOf(from) !== kingdomOf(road.to)) continue
        expect(distance(point, other)).toBeLessThan(MAP_SIZE / 3)
      }
    }
  })
})

function kingdomOf(locationId: string): string {
  const provinceId = world.locations[locationId]?.provinceId ?? ''
  const regionId = world.provinces[provinceId]?.regionId ?? ''
  return world.regions[regionId]?.kingdomId ?? ''
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
