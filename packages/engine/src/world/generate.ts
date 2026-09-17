import {
  ARCHETYPE_NAMES,
  IMPORT_RELIANCE,
  KINGDOM_BLUEPRINTS,
  type KingdomBlueprint,
  NAME_QUALIFIERS,
  PROVINCE_NAMES,
  PROVINCE_PREFIXES,
  SETTLEMENT_NAMES,
  TERRAIN_FERTILITY,
} from '../content/world'
import { landCapacityOf } from '../life'
import type { Rng } from '../rng'
import { createRng, nextFloat, nextInt } from '../rng'
import { hopsBetween } from './queries'
import type {
  Kingdom,
  Location,
  LocationArchetype,
  Province,
  Region,
  Road,
  Terrain,
  World,
} from './types'

/**
 * Генерация мира.
 *
 * Мир собирается один раз при создании игры и дальше замерзает в сейве: это
 * даёт неизменный скелет из DESIGN.md п.3.1 и при этом избавляет от написания
 * шестидесяти локаций руками. Из одного зерна всегда получается один и тот же
 * мир — на это есть тест.
 */
export function generateWorld(
  seed: number,
  blueprints: readonly KingdomBlueprint[] = KINGDOM_BLUEPRINTS,
): World {
  const roll = makeRoller(seed)
  const names = makeNamer(roll)

  const kingdoms: Record<string, Kingdom> = {}
  const regions: Record<string, Region> = {}
  const provinces: Record<string, Province> = {}
  const locations: Record<string, Location> = {}

  for (const blueprint of blueprints) {
    const regionIds: string[] = []
    let capitalId = ''

    for (const [regionIndex, regionPlan] of blueprint.regions.entries()) {
      const regionId = `${blueprint.id}.r${regionIndex}`
      const provinceIds: string[] = []
      const provinceCount = roll.between(regionPlan.provinces)

      for (let provinceIndex = 0; provinceIndex < provinceCount; provinceIndex += 1) {
        const provinceId = `${regionId}.p${provinceIndex}`
        // Провинция обычно повторяет местность своей области, но не всегда:
        // иначе области выходят однородными до скуки.
        const terrain = roll.chance(0.7) ? regionPlan.terrain : roll.pick(blueprint.terrains)
        const fertility = round2(roll.betweenFloat(TERRAIN_FERTILITY[terrain]))
        const locationIds: string[] = []
        const locationCount = roll.int(2, 4)

        for (let locationIndex = 0; locationIndex < locationCount; locationIndex += 1) {
          const isCapital = regionIndex === 0 && provinceIndex === 0 && locationIndex === 0
          const archetype: LocationArchetype = isCapital ? 'capital' : pickArchetype(roll, terrain)
          const id = `${provinceId}.l${locationIndex}`
          if (isCapital) capitalId = id
          locations[id] = {
            id,
            provinceId,
            name: isCapital ? blueprint.capitalName : names.forArchetype(archetype),
            archetype,
            terrain,
            // Население считается от того, сколько кормит земля: мир начинается
            // в равновесии, а не в состоянии неизбежного голода.
            population: Math.max(
              20,
              Math.round(
                landCapacityOf(archetype, terrain, fertility) *
                  roll.betweenFloat(IMPORT_RELIANCE[archetype]),
              ),
            ),
          }
          locationIds.push(id)
        }

        provinces[provinceId] = {
          id: provinceId,
          regionId,
          name: names.forProvince(terrain),
          terrain,
          fertility,
          locationIds,
        }
        provinceIds.push(provinceId)
      }

      regions[regionId] = {
        id: regionId,
        kingdomId: blueprint.id,
        name: regionPlan.name,
        terrain: regionPlan.terrain,
        provinceIds,
      }
      regionIds.push(regionId)
    }

    kingdoms[blueprint.id] = {
      id: blueprint.id,
      name: blueprint.name,
      flavor: blueprint.flavor,
      capitalId,
      regionIds,
    }
  }

  const roads = buildRoads(roll, { kingdoms, regions, provinces, locations })
  return { kingdoms, regions, provinces, locations, roads }
}

/**
 * Дороги строятся уровнями: внутри провинции — цепочкой, дальше провинции
 * сшиваются в области, области в королевства, королевства между собой. Так мир
 * заведомо связен, и при этом дальний путь честно состоит из многих переходов.
 */
function buildRoads(roll: Roller, world: Omit<World, 'roads'>): Record<string, readonly Road[]> {
  const roads: Record<string, Road[]> = {}

  const connect = (from: string, to: string, hours: number) => {
    if (from === to) return
    const forward = roads[from] ?? []
    const backward = roads[to] ?? []
    if (forward.some((road) => road.to === to)) return
    forward.push({ to, hours })
    backward.push({ to: from, hours })
    roads[from] = forward
    roads[to] = backward
  }

  const firstLocation = (provinceId: string): string | null =>
    world.provinces[provinceId]?.locationIds[0] ?? null

  for (const kingdom of Object.values(world.kingdoms)) {
    let previousRegionHub: string | null = null

    for (const regionId of kingdom.regionIds) {
      const region = world.regions[regionId]
      if (!region) continue
      let previousProvinceHub: string | null = null
      const provinceHubs: string[] = []

      for (const provinceId of region.provinceIds) {
        const province = world.provinces[provinceId]
        if (!province) continue

        // Внутри провинции — цепочка: соседняя деревня в нескольких часах ходу.
        for (let i = 1; i < province.locationIds.length; i += 1) {
          const from = province.locationIds[i - 1]
          const to = province.locationIds[i]
          if (from && to) connect(from, to, roll.int(3, 7))
        }

        // Кольцо внутри провинции: из глухого угла есть обходной путь.
        const ends = province.locationIds
        const firstInProvince = ends[0]
        const lastInProvince = ends[ends.length - 1]
        if (ends.length >= 3 && firstInProvince && lastInProvince && roll.chance(0.6)) {
          connect(lastInProvince, firstInProvince, roll.int(4, 9))
        }

        const hub = firstLocation(provinceId)
        if (!hub) continue
        if (previousProvinceHub) connect(previousProvinceHub, hub, roll.int(9, 18))
        provinceHubs.push(hub)
        previousProvinceHub = hub
      }

      // И кольцо по области: дорога в обход, если на прямой что-то случилось.
      const firstHub = provinceHubs[0]
      const lastHub = provinceHubs[provinceHubs.length - 1]
      if (provinceHubs.length >= 3 && firstHub && lastHub) {
        connect(lastHub, firstHub, roll.int(12, 22))
      }

      const regionHub = firstLocation(region.provinceIds[0] ?? '')
      if (!regionHub) continue
      if (previousRegionHub) connect(previousRegionHub, regionHub, roll.int(20, 30))
      previousRegionHub = regionHub
    }
  }

  // Королевства сшиваются через столицы: дорога между странами долгая.
  const capitals = Object.values(world.kingdoms).map((kingdom) => kingdom.capitalId)
  for (let i = 1; i < capitals.length; i += 1) {
    const from = capitals[i - 1]
    const to = capitals[i]
    if (from && to) connect(from, to, roll.int(30, 50))
  }

  return roads
}

/**
 * Деревня, с которой начинается обычная игра.
 *
 * Берём не первую попавшуюся, а самую дальнюю от столицы деревню Ре-Эстиза:
 * игра должна начинаться в глуши, чтобы дорога до столицы была событием, а не
 * прогулкой после завтрака.
 */
export function defaultStartLocationId(world: World): string {
  const all = Object.values(world.locations)
  const capitalId = world.kingdoms.reEstiz?.capitalId
  const villages = all.filter(
    (location) => location.archetype === 'village' && location.id.startsWith('reEstiz.'),
  )

  if (capitalId && villages.length > 0) {
    let best = villages[0]
    let bestDistance = -1
    for (const village of villages) {
      const distance = hopsBetween(world, capitalId, village.id) ?? -1
      if (distance > bestDistance) {
        best = village
        bestDistance = distance
      }
    }
    if (best) return best.id
  }

  const chosen = villages[0] ?? all.find((location) => location.archetype === 'village') ?? all[0]
  if (!chosen) throw new Error('мир пуст: генерация не создала ни одной локации')
  return chosen.id
}

function pickArchetype(roll: Roller, terrain: Terrain): LocationArchetype {
  if ((terrain === 'mountains' || terrain === 'hills') && roll.chance(0.3)) return 'mine'
  if (terrain === 'coast' && roll.chance(0.35)) return 'port'
  if (roll.chance(0.1)) return 'fortress'
  if (roll.chance(0.07)) return 'monastery'
  const value = roll.float()
  if (value < 0.6) return 'village'
  return value < 0.85 ? 'town' : 'city'
}

// --- вспомогательное ------------------------------------------------------

interface Roller {
  int(min: number, max: number): number
  float(): number
  chance(probability: number): boolean
  pick<T>(items: readonly T[]): T
  between(range: readonly [number, number]): number
  betweenFloat(range: readonly [number, number]): number
}

/**
 * Обёртка над детерминированным ГПСЧ.
 *
 * Внутри генератора состояние прячется в замыкание — иначе каждая строчка
 * превращается в передачу Rng туда-сюда. Снаружи функция остаётся чистой: одно
 * зерно — один мир.
 */
function makeRoller(seed: number): Roller {
  let rng: Rng = createRng(seed)
  const float = (): number => {
    const [value, next] = nextFloat(rng)
    rng = next
    return value
  }
  const int = (min: number, max: number): number => {
    const [value, next] = nextInt(rng, min, max)
    rng = next
    return value
  }
  return {
    int,
    float,
    chance: (probability) => float() < probability,
    pick: <T>(items: readonly T[]): T => {
      const item = items[int(0, items.length - 1)]
      if (item === undefined) throw new Error('выбор из пустого списка')
      return item
    },
    between: (range) => int(range[0], range[1]),
    betweenFloat: (range) => range[0] + float() * (range[1] - range[0]),
  }
}

interface Namer {
  forProvince(terrain: Terrain): string
  forArchetype(archetype: LocationArchetype): string
}

/**
 * Раздатчик имён без повторов. Когда пул кончается, имя собирается из
 * приставки и уже использованного («Малый Козий Брод») — это выглядит как
 * настоящая карта, где рядом стоят Верхний и Нижний выселки.
 */
function makeNamer(roll: Roller): Namer {
  const used = new Set<string>()
  const pools = new Map<string, string[]>()

  const poolFor = (key: string, source: readonly string[]): string[] => {
    const existing = pools.get(key)
    if (existing) return existing
    const copy = [...source]
    pools.set(key, copy)
    return copy
  }

  const takeUnique = (key: string, source: readonly string[]): string => {
    const pool = poolFor(key, source)
    while (pool.length > 0) {
      const index = roll.int(0, pool.length - 1)
      const [name] = pool.splice(index, 1)
      if (name && !used.has(name)) {
        used.add(name)
        return name
      }
    }
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const candidate = `${roll.pick(NAME_QUALIFIERS)} ${roll.pick(source)}`
      if (!used.has(candidate)) {
        used.add(candidate)
        return candidate
      }
    }
    const fallback = `${roll.pick(source)} ${used.size}`
    used.add(fallback)
    return fallback
  }

  return {
    forProvince: (terrain) =>
      `${roll.pick(PROVINCE_PREFIXES[terrain])} ${takeUnique('province', PROVINCE_NAMES)}`,
    forArchetype: (archetype) => {
      const special = ARCHETYPE_NAMES[archetype]
      return special ? takeUnique(archetype, special) : takeUnique('settlement', SETTLEMENT_NAMES)
    },
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
