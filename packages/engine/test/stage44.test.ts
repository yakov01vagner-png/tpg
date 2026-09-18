import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { BIOGRAPHY } from '../src/content/biography'
import { sitesFor } from '../src/content/sites'
import { KINGDOM_BLUEPRINTS, KINGDOM_SHORT, LORD_TITLES } from '../src/content/world'
import { FEASTS } from '../src/content/year'
import { serialize } from '../src/save'
import { createGame } from '../src/state'
import { CLIMATE_FERTILITY, climateAt, climateTerrain } from '../src/world/climate'
import { generateWorld } from '../src/world/generate'
import { worldGrid } from '../src/world/grid'
import { MAP_SIZE } from '../src/world/layout'
import { kingdomOf } from '../src/world/queries'
import type { World } from '../src/world/types'
import { isSettlement } from '../src/world/types'

/**
 * Этап 44: материк.
 *
 * Мир вырастает втрое: восемь корон, полторы тысячи мест. Генерация идёт от
 * воды и климата, а не от пяти кругов на полотне: север лесист и холоден, юг
 * сух, и по виду места понятно, где ты.
 */

const world = generateWorld(1)

function fastest(work: () => void, times = 3): number {
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < times; i += 1) {
    const began = performance.now()
    work()
    best = Math.min(best, performance.now() - began)
  }
  return best
}

/** Провинции короны. */
function provincesOf(current: World, kingdomId: string) {
  return (current.kingdoms[kingdomId]?.regionIds ?? [])
    .flatMap((regionId) => current.regions[regionId]?.provinceIds ?? [])
    .map((provinceId) => current.provinces[provinceId])
    .filter((one): one is NonNullable<typeof one> => one !== undefined)
}

/** Места короны, с жителями и без. */
function placesOf(current: World, kingdomId: string) {
  return Object.values(current.locations).filter(
    (one) => kingdomOf(current, one.id)?.id === kingdomId,
  )
}

describe('Ц1: восемь корон', () => {
  it('восемь корон, у каждой столица, четыре области и своё имя', () => {
    expect(KINGDOM_BLUEPRINTS).toHaveLength(8)
    expect(Object.keys(world.kingdoms)).toHaveLength(8)
    for (const blueprint of KINGDOM_BLUEPRINTS) {
      const kingdom = world.kingdoms[blueprint.id]
      expect(kingdom, blueprint.id).toBeDefined()
      const capital = world.locations[kingdom?.capitalId ?? '']
      expect(capital?.archetype).toBe('capital')
      expect(capital?.name).toBe(blueprint.capitalName)
      expect(kingdom?.regionIds).toHaveLength(4)
      expect(KINGDOM_SHORT[blueprint.id]).toBeDefined()
      expect(
        FEASTS.some((feast) => feast.kingdomId === blueprint.id),
        blueprint.id,
      ).toBe(true)
    }
  })

  it('три новых уклада, а не три копии: титулы, родина и праздник свои', () => {
    const titles = KINGDOM_BLUEPRINTS.flatMap((one) => LORD_TITLES[one.id] ?? [])
    expect(titles).toHaveLength(24)
    // Ни один титул не повторяется между коронами: боярин — не барон.
    expect(new Set(titles).size).toBe(24)
    const homeland = BIOGRAPHY.stages.find((stage) => stage.id === 'homeland')
    expect(homeland).toBeDefined()
    for (const blueprint of KINGDOM_BLUEPRINTS) {
      const option = homeland?.options.find((one) =>
        one.effects?.tags?.includes(`home_${blueprint.id}`),
      )
      expect(option, `родина ${blueprint.id}`).toBeDefined()
    }
    // У трёх новых корон разные первые навыки: север выживает, юг торгуется и
    // уговаривает, Лига считает.
    const skillsOf = (id: string) =>
      Object.keys(
        homeland?.options.find((one) => one.effects?.tags?.includes(`home_${id}`))?.effects
          ?.skills ?? {},
      ).join(',')
    expect(new Set([skillsOf('hlad'), skillsOf('rahim'), skillsOf('league')]).size).toBe(3)
  })
})

describe('Ц2: климат', () => {
  it('пояс читается по широте: север холоден, юг сух', () => {
    expect(climateAt({ x: MAP_SIZE / 2, y: 100 })).toBe('cold')
    expect(climateAt({ x: MAP_SIZE / 2, y: MAP_SIZE / 2 })).toBe('temperate')
    expect(climateAt({ x: MAP_SIZE / 2, y: MAP_SIZE - 100 })).toBe('dry')
  })

  it('чертёж просит, земля решает', () => {
    expect(climateTerrain('plains', 'cold', 0.1)).toBe('forest')
    expect(climateTerrain('plains', 'dry', 0.9)).toBe('desert')
    expect(climateTerrain('plains', 'temperate', 0.5)).toBe('plains')
    // Пустыни в средних землях не бывает, гор климат не трогает.
    expect(climateTerrain('desert', 'temperate', 0.5)).toBe('steppe')
    expect(climateTerrain('mountains', 'dry', 0.5)).toBe('mountains')
    expect(climateTerrain('mountains', 'cold', 0.5)).toBe('mountains')
    expect(CLIMATE_FERTILITY.cold).toBeLessThan(CLIMATE_FERTILITY.temperate)
    expect(CLIMATE_FERTILITY.dry).toBeLessThan(CLIMATE_FERTILITY.temperate)
  })

  it('в мире: у Хлади север, у Рахима юг, пустыня только на юге', () => {
    for (const seed of [1, 2, 3]) {
      const current = generateWorld(seed)
      const share = (kingdomId: string, climate: string) => {
        const own = provincesOf(current, kingdomId)
        return own.filter((one) => one.climate === climate).length / own.length
      }
      expect(share('hlad', 'cold'), `Хладь, зерно ${seed}`).toBeGreaterThan(0.6)
      expect(share('rahim', 'dry'), `Рахим, зерно ${seed}`).toBeGreaterThan(0.6)
      expect(share('reEstiz', 'temperate'), `Ре-Эстиз, зерно ${seed}`).toBeGreaterThan(0.6)
      for (const province of Object.values(current.provinces)) {
        if (province.terrain === 'desert') expect(province.climate, province.name).toBe('dry')
      }
      const byClimate: Record<string, number[]> = { cold: [], temperate: [], dry: [] }
      for (const province of Object.values(current.provinces)) {
        if (province.climate && !province.island)
          byClimate[province.climate]?.push(province.fertility)
      }
      const mean = (values: number[]) => values.reduce((sum, one) => sum + one, 0) / values.length
      const cold = mean(byClimate.cold ?? [])
      const mild = mean(byClimate.temperate ?? [])
      const dry = mean(byClimate.dry ?? [])
      if (seed === 1) {
        console.log(
          `плодородие: север ${cold.toFixed(2)}, средние земли ${mild.toFixed(2)}, юг ${dry.toFixed(2)}`,
        )
      }
      expect(cold).toBeLessThan(mild)
      expect(dry).toBeLessThan(mild)
    }
  })

  it('места без жителей знают климат: оазис на юге, зимовье на севере', () => {
    expect(sitesFor('steppe', 'dry').some((site) => site.id === 'oasis')).toBe(true)
    expect(sitesFor('steppe', 'temperate').some((site) => site.id === 'oasis')).toBe(false)
    expect(sitesFor('forest', 'cold').some((site) => site.id === 'lodge')).toBe(true)
    expect(sitesFor('forest', 'temperate').some((site) => site.id === 'lodge')).toBe(false)
    for (const location of Object.values(world.locations)) {
      const climate = world.provinces[location.provinceId]?.climate
      if (location.archetype === 'oasis') expect(climate, location.name).toBe('dry')
      if (location.archetype === 'lodge') expect(climate, location.name).toBe('cold')
    }
  })
})

describe('Ц3: полторы тысячи мест, и всё держится', () => {
  it('мест около полутора тысяч, с жителями — четыре сотни', () => {
    for (const seed of [1, 2, 3]) {
      const current = generateWorld(seed)
      const all = Object.values(current.locations)
      const settled = all.filter((one) => isSettlement(one.archetype))
      if (seed === 1) {
        console.log(
          `зерно ${seed}: ${Object.keys(current.provinces).length} провинций, ${all.length} мест, ${settled.length} с жителями, рек ${current.rivers?.length ?? 0}`,
        )
      }
      expect(all.length).toBeGreaterThan(1400)
      expect(all.length).toBeLessThan(1900)
      expect(settled.length).toBeGreaterThan(350)
      expect(current.rivers?.length ?? 0).toBeGreaterThan(12)
    }
  })

  it('материк связен: от Ре-Эстиза дорога есть ко всему, кроме островов', () => {
    for (const seed of [1, 2, 3]) {
      const current = generateWorld(seed)
      const start = current.kingdoms.reEstiz?.capitalId ?? ''
      const seen = new Set<string>([start])
      const queue = [start]
      while (queue.length > 0) {
        const id = queue.shift() as string
        for (const road of current.roads[id] ?? []) {
          if (seen.has(road.to)) continue
          seen.add(road.to)
          queue.push(road.to)
        }
      }
      for (const location of Object.values(current.locations)) {
        const island = current.provinces[location.provinceId]?.island === true
        expect(seen.has(location.id), `${location.name} (зерно ${seed})`).toBe(!island)
      }
    }
  })

  it('сетка, раскладка, рождение и сейв в бюджете', () => {
    const born = fastest(() => generateWorld(2))
    const grid = fastest(() => worldGrid(world, MAP_SIZE))
    const game = createGame(createCharacter({ name: 'Т' }), 1, world)
    const raw = serialize(game)
    const parse = fastest(() => JSON.parse(raw))
    console.log(
      `рождение ${born.toFixed(0)} мс, сетка ${grid.toFixed(0)} мс, сейв ${(raw.length / 1024).toFixed(0)} КБ, разбор ${parse.toFixed(1)} мс`,
    )
    expect(born).toBeLessThan(160)
    // Сетка меряется своим тестом (stage22): здесь она только печатается.
    expect(grid).toBeLessThan(80)
    expect(raw.length).toBeLessThan(1024 * 1024)
    expect(parse).toBeLessThan(60)
  })
})

describe('Ц4: дальние земли отличаются от ближних', () => {
  it('по одному виду места понятно, где ты', () => {
    const kinds = (kingdomId: string) =>
      new Set(placesOf(world, kingdomId).map((one) => one.archetype))
    // На севере зимовья, на юге оазисы — и ни тех, ни других в средних землях.
    expect(kinds('hlad').has('lodge')).toBe(true)
    expect(kinds('rahim').has('oasis')).toBe(true)
    expect(kinds('reEstiz').has('oasis')).toBe(false)
    expect(kinds('reEstiz').has('lodge')).toBe(false)
    // И земля разная: у Рахима есть пустыня, у Хлади её нет.
    const terrains = (kingdomId: string) =>
      new Set(provincesOf(world, kingdomId).map((one) => one.terrain))
    expect(terrains('rahim').has('desert')).toBe(true)
    expect(terrains('hlad').has('desert')).toBe(false)
    expect(terrains('hlad').has('forest') || terrains('hlad').has('mountains')).toBe(true)
  })

  it('на дальних землях живут реже: север и юг кормят хуже', () => {
    // Деревня к деревне и не у моря: город и деревня несравнимы, берег кормит
    // рыбой в любом поясе, а деревня в глубине живёт одной землёй.
    const density = (climate: string) => {
      const own = Object.values(world.locations).filter(
        (one) =>
          one.archetype === 'village' &&
          !one.shore &&
          world.provinces[one.provinceId]?.climate === climate,
      )
      return own.reduce((sum, one) => sum + one.population, 0) / own.length
    }
    const north = density('cold')
    const south = density('dry')
    const middle = density('temperate')
    console.log(
      `деревня в глубине: север ${north.toFixed(0)}, юг ${south.toFixed(0)}, средние земли ${middle.toFixed(0)}`,
    )
    expect(north).toBeLessThan(middle)
    expect(south).toBeLessThan(middle)
  })
})
