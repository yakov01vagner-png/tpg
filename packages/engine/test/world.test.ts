import { describe, expect, it } from 'vitest'
import { KINGDOM_BLUEPRINTS, MARCHES } from '../src/content/world'
import { defaultStartLocationId, generateWorld } from '../src/world/generate'
import { addressOf, hopsBetween, reachableFrom, roadsFrom } from '../src/world/queries'
import { FRONTIER, isSettlement } from '../src/world/types'
import type { World } from '../src/world/types'

const world = generateWorld(1)
const allLocations = (w: World) => Object.values(w.locations)

describe('генерация мира', () => {
  it('из одного зерна даёт один и тот же мир', () => {
    expect(generateWorld(42)).toEqual(generateWorld(42))
  })

  it('из разных зёрен даёт разные миры', () => {
    expect(generateWorld(42)).not.toEqual(generateWorld(43))
  })

  it('создаёт все королевства со столицами', () => {
    expect(Object.keys(world.kingdoms).length).toBe(KINGDOM_BLUEPRINTS.length)
    for (const kingdom of Object.values(world.kingdoms)) {
      const capital = world.locations[kingdom.capitalId]
      expect(capital, `у королевства «${kingdom.name}» нет столицы`).toBeDefined()
      expect(capital?.archetype).toBe('capital')
    }
  })

  it('делает мир нужного размера', () => {
    const counts = {
      regions: Object.keys(world.regions).length,
      provinces: Object.keys(world.provinces).length,
      locations: allLocations(world).length,
    }
    console.log(
      `мир: ${Object.keys(world.kingdoms).length} королевств, ${counts.regions} областей, ` +
        `${counts.provinces} провинций, ${counts.locations} локаций`,
    )
    // Пятнадцать областей корон плюс пять марок пограничья.
    const crownRegions = KINGDOM_BLUEPRINTS.reduce((sum, one) => sum + one.regions.length, 0)
    expect(counts.regions).toBe(crownRegions + MARCHES.length)
    expect(
      Object.values(world.regions).filter((region) => region.kingdomId === FRONTIER).length,
    ).toBe(MARCHES.length)
    expect(counts.provinces).toBeGreaterThanOrEqual(20)
    expect(counts.locations).toBeGreaterThanOrEqual(40)
  })

  it('связывает иерархию в обе стороны', () => {
    for (const location of allLocations(world)) {
      const province = world.provinces[location.provinceId]
      expect(province, `локация ${location.id} висит без провинции`).toBeDefined()
      // Место числится в своей провинции: поселение среди поселений, место без
      // жителей — среди мест без жителей. Списка нарочно два: всё, что считает
      // людей, ходит по первому и никогда не спотыкается о перевал.
      const listed = isSettlement(location.archetype) ? province?.locationIds : province?.siteIds
      expect(listed, `${location.id} не числится в провинции`).toContain(location.id)
      const region = world.regions[province?.regionId ?? '']
      expect(region?.provinceIds).toContain(province?.id)
      // У пограничья короны нет нарочно: марку не держит никто, и `kingdoms`
      // о ней не знает — на этом и стоит вся её ничейность.
      if (region?.kingdomId === FRONTIER) {
        expect(world.kingdoms[FRONTIER]).toBeUndefined()
        continue
      }
      const kingdom = world.kingdoms[region?.kingdomId ?? '']
      expect(kingdom?.regionIds).toContain(region?.id)
    }
  })

  it('не повторяет имена', () => {
    const names = allLocations(world).map((location) => location.name)
    expect(new Set(names).size).toBe(names.length)
    const provinces = Object.values(world.provinces).map((province) => province.name)
    expect(new Set(provinces).size).toBe(provinces.length)
  })

  it('заселяет каждое поселение осмысленным числом жителей', () => {
    for (const location of allLocations(world)) {
      if (!isSettlement(location.archetype)) {
        expect(location.population, `${location.name} с жителями`).toBe(0)
        continue
      }
      expect(location.population, `${location.name} пуст`).toBeGreaterThan(0)
      expect(location.population).toBeLessThan(50_000)
    }
  })
})

describe('дороги', () => {
  it('не оставляют тупиков', () => {
    for (const location of allLocations(world)) {
      expect(roadsFrom(world, location.id).length, `${location.name} отрезан`).toBeGreaterThan(0)
    }
  })

  it('связывают весь мир: из любой локации можно дойти до любой', () => {
    const start = allLocations(world)[0]
    expect(start).toBeDefined()
    if (!start) return
    const reachable = reachableFrom(world, start.id)
    expect(reachable.size).toBe(allLocations(world).length)
  })

  it('двусторонние', () => {
    for (const location of allLocations(world)) {
      for (const road of roadsFrom(world, location.id)) {
        const back = roadsFrom(world, road.to)
        expect(
          back.some((candidate) => candidate.to === location.id),
          `дорога ${location.id} → ${road.to} односторонняя`,
        ).toBe(true)
      }
    }
  })

  it('в чужую корону идут через пограничье, а не из столицы в столицу', () => {
    for (const march of MARCHES) {
      const [first, second] = march.between
      const hub = world.provinces[`march.${march.id}.p0`]?.locationIds[0] ?? ''
      const fromCapital = world.kingdoms[first]?.capitalId ?? ''
      const toCapital = world.kingdoms[second]?.capitalId ?? ''
      // Прямой дороги между столицами больше нет: она шла мимо земли.
      expect(roadsFrom(world, fromCapital).some((road) => road.to === toCapital)).toBe(false)
      expect(roadsFrom(world, fromCapital).some((road) => road.to === hub)).toBe(true)
      expect(hopsBetween(world, fromCapital, toCapital) ?? 0).toBeGreaterThan(1)
    }
  })

  it('делают соседние места ближе далёких', () => {
    // Внутри провинции ходьба занимает часы, между королевствами — сутки.
    // Соседом деревни теперь бывает брод или перевал: дорога идёт через землю,
    // и отрезок берёт часы у неё — гать вдвое дольше прямой дороги.
    const withinProvince: number[] = []
    for (const province of Object.values(world.provinces)) {
      const [first] = province.locationIds
      if (!first) continue
      for (const road of roadsFrom(world, first)) {
        if (world.locations[road.to]?.provinceId !== province.id) continue
        withinProvince.push(road.hours)
      }
    }
    expect(withinProvince.length).toBeGreaterThan(0)
    expect(Math.max(...withinProvince)).toBeLessThanOrEqual(13)

    // До чужой столицы теперь идут через марку, и один её отрезок сам по себе
    // длиннее любой дороги внутри провинции.
    const march = MARCHES[0]
    const hub = world.provinces[`march.${march?.id}.p0`]?.locationIds[0] ?? ''
    const fromCapital = world.kingdoms[march?.between[0] ?? '']?.capitalId ?? ''
    const leg = roadsFrom(world, fromCapital).find((road) => road.to === hub)
    expect(leg?.hours).toBeGreaterThanOrEqual(15)
  })

  it('держат дальние концы мира далеко друг от друга', () => {
    const capitals = Object.values(world.kingdoms).map((kingdom) => kingdom.capitalId)
    const first = capitals[0]
    const last = capitals[capitals.length - 1]
    if (!first || !last) return
    const hops = hopsBetween(world, first, last)
    expect(hops).not.toBe(null)
    console.log(`от столицы до столицы через весь мир: ${hops} переходов`)
    expect(hops ?? 0).toBeGreaterThan(2)
  })
})

describe('место в мире', () => {
  it('называет адрес целиком', () => {
    const start = defaultStartLocationId(world)
    const address = addressOf(world, start)
    expect(address.split(' · ').length).toBe(3)
    console.log(`старт: ${world.locations[start]?.name} — ${address}`)
  })

  it('начинает игру в деревне Ре-Эстиза', () => {
    const start = world.locations[defaultStartLocationId(world)]
    expect(start?.archetype).toBe('village')
    expect(start?.id.startsWith('reEstiz.')).toBe(true)
  })

  it('начинает в глуши, а не у ворот столицы', () => {
    const capitalId = world.kingdoms.reEstiz?.capitalId ?? ''
    const start = defaultStartLocationId(world)
    const distance = hopsBetween(world, capitalId, start) ?? 0
    console.log(`от родной деревни до столицы: ${distance} перехода`)
    expect(distance).toBeGreaterThan(1)
  })
})

describe('обходные пути', () => {
  it('в мире есть кольца, а не только одна дорога в каждую сторону', () => {
    const nodes = allLocations(world).length
    const edges = Object.values(world.roads).reduce((sum, roads) => sum + roads.length, 0) / 2
    console.log(`дорог: ${edges} на ${nodes} локаций`)
    // У дерева рёбер ровно на одно меньше, чем узлов. Нам нужно больше.
    expect(edges).toBeGreaterThan(nodes - 1)
  })
})
