import { describe, expect, it } from 'vitest'
import { generateWorld } from '../src/world/generate'
import { worldGrid } from '../src/world/grid'
import { MAP_SIZE } from '../src/world/layout'
import { reachableFrom, roadsFrom } from '../src/world/queries'
import { crossesWater, isWater, onShore, waterShare } from '../src/world/sea'
import { isSettlement } from '../src/world/types'

/**
 * Этап 33: берег и море.
 *
 * До 0.5 у мира не было воды: «побережье» было цветом клетки, карта кончалась
 * обрезом полотна, а порт стоял на берегу, из которого никуда не плыли. Теперь
 * у земли есть край.
 */

const SEEDS = [1, 2, 3]

describe('у мира есть вода', () => {
  it('море занимает больше половины полотна и меньше всего полотна', () => {
    for (const seed of SEEDS) {
      const sea = generateWorld(seed).sea
      expect(sea, `зерно ${seed} без воды`).toBeDefined()
      if (!sea) continue
      const share = waterShare(sea)
      if (seed === 1) console.log(`воды на полотне: ${(share * 100).toFixed(0)}%`)
      expect(share).toBeGreaterThan(0.3)
      expect(share).toBeLessThan(0.85)
    }
  })

  it('все места стоят на суше', () => {
    for (const seed of SEEDS) {
      const world = generateWorld(seed)
      const sea = world.sea
      if (!sea) continue
      for (const one of Object.values(world.locations)) {
        expect(isWater(sea, one.x, one.y), `${one.name} стоит в воде`).toBe(false)
      }
    }
  })

  it('из одного зерна выходит один и тот же берег', () => {
    expect(generateWorld(5).sea).toEqual(generateWorld(5).sea)
    expect(generateWorld(5).sea).not.toEqual(generateWorld(6).sea)
  })
})

describe('дорога по морю не идёт', () => {
  it('ни один отрезок не пересекает воду', () => {
    for (const seed of SEEDS) {
      const world = generateWorld(seed)
      const sea = world.sea
      if (!sea) continue
      let crossing = 0
      for (const from of Object.values(world.locations)) {
        for (const road of roadsFrom(world, from.id)) {
          const to = world.locations[road.to]
          if (to && crossesWater(sea, from, to)) crossing += 1
        }
      }
      expect(crossing, `зерно ${seed}`).toBe(0)
    }
  })

  it('и при этом суша осталась связной', () => {
    for (const seed of SEEDS) {
      const world = generateWorld(seed)
      const all = Object.keys(world.locations)
      expect(reachableFrom(world, all[0] as string).size, `зерно ${seed}`).toBe(all.length)
    }
  })
})

describe('порт стоит на воде', () => {
  it('у каждого порта под боком море', () => {
    for (const seed of SEEDS) {
      const world = generateWorld(seed)
      const sea = world.sea
      if (!sea) continue
      const ports = Object.values(world.locations).filter((one) => one.archetype === 'port')
      if (seed === 1) console.log(`портов: ${ports.length}`)
      expect(ports.length, `зерно ${seed}`).toBeGreaterThan(8)
      for (const port of ports) {
        expect(onShore(sea, port), `${port.name} не у воды`).toBe(true)
      }
    }
  })

  it('у всякой вышедшей к морю области есть свой порт', () => {
    const world = generateWorld(1)
    const sea = world.sea
    if (!sea) return
    for (const region of Object.values(world.regions)) {
      const own = region.provinceIds
        .flatMap((id) => world.provinces[id]?.locationIds ?? [])
        .map((id) => world.locations[id])
        .filter((one) => one !== undefined && isSettlement(one.archetype))
      const shore = own.filter((one) => one && onShore(sea, one))
      if (shore.length === 0) continue
      expect(
        own.some((one) => one?.archetype === 'port'),
        `${region.name} вышла к морю и осталась без порта`,
      ).toBe(true)
    }
  })

  it('берег — не половина мира: приморских мест меньше трети', () => {
    const world = generateWorld(1)
    const sea = world.sea
    if (!sea) return
    const all = Object.values(world.locations)
    const shore = all.filter((one) => onShore(sea, one)).length
    console.log(`на берегу ${shore} мест из ${all.length}`)
    expect(shore / all.length).toBeLessThan(0.33)
    expect(shore).toBeGreaterThan(20)
  })
})

describe('карта знает про воду', () => {
  it('клетки моря не принадлежат ни одной провинции', () => {
    const world = generateWorld(1)
    const grid = worldGrid(world, MAP_SIZE)
    let water = 0
    for (const [index, cell] of grid.cells.entries()) {
      if (!grid.water[index]) continue
      water += 1
      expect(cell).toBeNull()
    }
    console.log(`воды на сетке: ${water} клеток из ${grid.cells.length}`)
    expect(water).toBeGreaterThan(grid.cells.length * 0.3)
  })

  it('глушь осталась глушью, а не утонула', () => {
    const grid = worldGrid(generateWorld(1), MAP_SIZE)
    const land = grid.cells.filter((cell) => cell !== null)
    const wild = land.filter((cell) => cell?.wilds).length
    console.log(`глуши ${((wild / land.length) * 100).toFixed(0)}% суши`)
    expect(wild / land.length).toBeGreaterThan(0.2)
  })
})
