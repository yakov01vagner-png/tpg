import { SITES, SITE_EPITHETS, sitesFor } from '../content/sites'
import {
  ARCHETYPE_NAMES,
  IMPORT_RELIANCE,
  KINGDOM_BLUEPRINTS,
  type KingdomBlueprint,
  MARCHES,
  NAME_QUALIFIERS,
  PROVINCE_NAMES,
  PROVINCE_PREFIXES,
  SETTLEMENT_NAMES,
  TERRAIN_FERTILITY,
} from '../content/world'
import { landCapacityOf } from '../life'
import type { Rng } from '../rng'
import { createRng, nextFloat, nextInt } from '../rng'
import { MAP_SIZE, placeLocations } from './layout'
import { hopsBetween } from './queries'
import { buildRoads } from './roads'
import { FRONTIER, isSite } from './types'
import type {
  Kingdom,
  Location,
  LocationArchetype,
  Province,
  Region,
  Road,
  SiteKind,
  Terrain,
  World,
} from './types'

/** Место, ещё не легшее на карту. */
type Unplaced = Omit<Location, 'x' | 'y'>

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
  // Пока карта не разложена, у места нет координаты: она появляется разом для
  // всех, когда скелет собран (`placeLocations`).
  const locations: Record<string, Unplaced> = {}

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

        // Места без жителей: то, что лежит между деревнями. Их вид выбирается
        // по земле провинции — гать бывает только в топях, перевал только в
        // горах, — поэтому провинция читается ещё и по тому, что в ней стоит.
        const siteIds: string[] = []
        const siteCount = roll.int(2, 3)
        for (let siteIndex = 0; siteIndex < siteCount; siteIndex += 1) {
          const kind = pickSite(roll, terrain)
          const id = `${provinceId}.s${siteIndex}`
          locations[id] = {
            id,
            provinceId,
            name: names.forSite(kind),
            archetype: kind,
            terrain,
            population: 0,
          }
          siteIds.push(id)
        }

        provinces[provinceId] = {
          id: provinceId,
          regionId,
          name: names.forProvince(terrain),
          terrain,
          fertility,
          locationIds,
          siteIds,
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

  // Пограничье кладётся после корон: ему нужны обе столицы, между которыми оно
  // лежит, и оно нарочно не попадает ни в один `regionIds` — марку не держит
  // никто (DESIGN.md, п.3.1.1).
  for (const march of MARCHES) {
    const [first, second] = march.between
    if (!kingdoms[first] || !kingdoms[second]) continue
    const regionId = `march.${march.id}`
    const fertility = round2(roll.betweenFloat(TERRAIN_FERTILITY[march.terrain]))
    const provinceIds: string[] = []

    // Марка — полоса поперёк границы, а не точка на ней: две провинции, и в
    // одной из них единственное вольное село. Одной провинции не хватало —
    // пограничье читалось на карте пятном в две клетки.
    for (const [side, provinceName] of march.provinceNames.entries()) {
      const provinceId = `${regionId}.p${side}`
      const locationIds: string[] = []
      if (side === 0) {
        const townId = `${provinceId}.l0`
        locations[townId] = {
          id: townId,
          provinceId,
          name: march.freeTown,
          archetype: 'village',
          terrain: march.terrain,
          // Вольное село живёт проезжими, а не землёй: оно мельче деревни.
          population: Math.max(
            40,
            Math.round(landCapacityOf('village', march.terrain, fertility) * 0.4),
          ),
        }
        locationIds.push(townId)
      }

      // Застава при вольном селе стоит всегда: ничью землю всё равно сторожат.
      const siteIds: string[] = []
      const kinds: SiteKind[] =
        side === 0
          ? ['outpost', pickSite(roll, march.terrain)]
          : [pickSite(roll, march.terrain), pickSite(roll, march.terrain), 'ruins']
      for (const [index, kind] of kinds.entries()) {
        const id = `${provinceId}.s${index}`
        locations[id] = {
          id,
          provinceId,
          name: names.forSite(kind),
          archetype: kind,
          terrain: march.terrain,
          population: 0,
        }
        siteIds.push(id)
      }

      provinces[provinceId] = {
        id: provinceId,
        regionId,
        name: provinceName,
        terrain: march.terrain,
        fertility,
        locationIds,
        siteIds,
      }
      provinceIds.push(provinceId)
    }

    regions[regionId] = {
      id: regionId,
      kingdomId: FRONTIER,
      name: march.name,
      terrain: march.terrain,
      provinceIds,
    }
  }

  // Сперва места ложатся на карту, и только потом по ним прокладывают дороги:
  // дорога — следствие земли, а не списка (roads.ts).
  const points = placeLocations({ kingdoms, regions, provinces })
  const placed: Record<string, Location> = {}
  for (const [id, location] of Object.entries(locations)) {
    const point = points[id] ?? { x: MAP_SIZE / 2, y: MAP_SIZE / 2 }
    placed[id] = { ...location, x: point.x, y: point.y }
  }

  const skeleton = { kingdoms, regions, provinces, locations: placed }
  return { ...skeleton, roads: buildRoads(skeleton) }
}

/**
 * Деревня, с которой начинается обычная игра.
 *
 * Берём не первую попавшуюся, а самую дальнюю от столицы деревню Ре-Эстиза:
 * игра должна начинаться в глуши, чтобы дорога до столицы была событием, а не
 * прогулкой после завтрака.
 */
/**
 * Где начинать по биографии: тег родины выбирает королевство, а внутри него
 * — деревню подальше от столицы, как и в Ре-Эстизе. Гном начинает под горой,
 * степняк — в степи, и первые дни у них разные.
 */
export function startLocationFor(world: World, tags: readonly string[]): string {
  const home = tags.find((tag) => tag.startsWith('home_'))?.slice('home_'.length)
  if (!home || !world.kingdoms[home]) return defaultStartLocationId(world)
  const capitalId = world.kingdoms[home]?.capitalId
  const villages = Object.values(world.locations).filter(
    (location) => location.archetype === 'village' && location.id.startsWith(`${home}.`),
  )
  if (!capitalId || villages.length === 0) return defaultStartLocationId(world)
  let best = villages[0]
  let bestDistance = -1
  for (const village of villages) {
    const distance = hopsBetween(world, capitalId, village.id) ?? -1
    if (distance > bestDistance) {
      best = village
      bestDistance = distance
    }
  }
  return best?.id ?? defaultStartLocationId(world)
}

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
  forSite(kind: SiteKind): string
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
    // «Волчий Брод», но «Волчья Гать»: прилагательное согласуется с родом.
    forSite: (kind) => {
      const def = SITES[kind]
      const names = SITE_EPITHETS.map((epithet) => `${epithet[def.gender]} ${def.noun}`)
      return takeUnique(`site:${kind}`, names)
    },
  }
}

/** Что уместно на такой земле. Если ничего — святилище бывает везде. */
/**
 * Часы одного отрезка.
 *
 * Отрезок берёт свою цену у земли, через которую идёт: гать вдвое дольше
 * прямой дороги, перевал почти вдвое, святилище не замедляет вовсе. Это
 * свойство места, а не дороги, поэтому и считается по месту.
 */
function legHours(
  roll: Roller,
  locations: Readonly<Record<string, Location>>,
  from: string,
  to: string,
): number {
  const base = roll.int(3, 7)
  const slowest = [from, to].reduce((worst, id) => {
    const kind = locations[id]?.archetype
    if (!kind || !isSite(kind)) return worst
    return Math.max(worst, SITES[kind].slow)
  }, 1)
  return Math.max(2, Math.round(base * slowest))
}

function pickSite(roll: Roller, terrain: Terrain): SiteKind {
  const fitting = sitesFor(terrain)
  return fitting.length > 0 ? roll.pick(fitting).id : 'shrine'
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
