import type { Settlement } from './economy'
import { createSettlement, recruitPool } from './economy'
import { carryingCapacity } from './life'
import { type Rng, nextInt, rollChance } from './rng'
import { placeNear } from './world/layout'
import { hoursBetweenPlaces } from './world/roads'
import type { Location, LocationArchetype, PlaceKind, Province, World } from './world/types'
import { isSettlement } from './world/types'

/**
 * Места основывают и бросают.
 *
 * До этого скелет мира был неизменен целиком: те же шестьдесят два места век
 * спустя, ни одного нового и ни одного мёртвого насовсем. Прогон на сто лет
 * показывал это числом — «запустело 0, заселено заново 0». Мир менял хозяев, но
 * не менял вида.
 *
 * Правило меняется на более слабое и точное: **скелет пополняется только с
 * конца и ничего из него не исчезает**. Основанное место дописывается в конец
 * списка провинции, мёртвое остаётся руинами с нулём жителей. На этом держится
 * раскладка карты (`layout.ts`): положение выводится из имени места, а не из
 * номера, поэтому новое поселение никогда не сдвигает старое.
 */

/** Сколько людей надо, чтобы выселок стал местом на карте. */
export const SETTLERS_NEEDED = 60
/** Сколько лет место стоит руинами, прежде чем в него вернутся. */
export const RUIN_YEARS = 5

export type SettleEvent =
  | { readonly type: 'founded'; readonly locationId: string; readonly fromId: string }
  | { readonly type: 'resettled'; readonly locationId: string }
  | { readonly type: 'grew'; readonly locationId: string; readonly archetype: LocationArchetype }

export interface SettleResult {
  readonly world: World
  readonly settlements: Readonly<Record<string, Settlement>>
  readonly rng: Rng
  readonly events: readonly SettleEvent[]
}

const NEW_NAMES = [
  'Новины',
  'Выселки',
  'Заимка',
  'Отруб',
  'Новосёлки',
  'Починок',
  'Слобода',
  'Заполье',
  'Подлесье',
  'Раздолье',
  'Кривель',
  'Тихвино',
]

/**
 * Что вырастает из чего.
 *
 * Место растёт не в любую сторону: рудник не становится столицей, а деревня не
 * становится портом посреди суши. Порог — число жителей, при котором прежнее
 * название перестаёт быть правдой.
 */
/**
 * Порог задан долей от того, что земля этого места и правда кормит, а не числом
 * жителей. Числом не выходило: деревня кормится с семисот душ земли и до тысячи
 * восьмисот не дорастала никогда — за век не выросло ни одно место в мире.
 * Доля же значит одно и то же везде: место, забившее свою землю, переросло имя.
 */
const GROWTH: Partial<
  Record<LocationArchetype, { readonly to: LocationArchetype; readonly at: number }>
> = {
  // Доля меньше, чем у городка, нарочно: деревенская округа велика
  // (LAND_CAPACITY), и по общей мерке село становилось бы городком только к двум
  // с лишним тысячам душ. Городком его делают полторы — это и есть 0.7 земли.
  village: { to: 'town', at: 0.7 },
  town: { to: 'city', at: 0.82 },
  // Рудник и крепость кормятся привозом, и земли под ними мало: чтобы такое
  // место стало городком, народу должно стать заметно больше, чем оно родит.
  mine: { to: 'town', at: 1.6 },
  fortress: { to: 'town', at: 1.6 },
}

/**
 * Есть ли в округе место для ещё одного большого поселения.
 *
 * Городок кормится не своим огородом, а всей провинцией; город — всей областью.
 * Поэтому их не может быть сколько угодно: второй город в области — это второй
 * набор тех же полей, которых нет.
 */
function hasRoomFor(
  world: World,
  locations: Readonly<Record<string, Location>>,
  province: Province,
  wanted: LocationArchetype,
): boolean {
  const big: readonly PlaceKind[] = ['town', 'city', 'capital', 'port']
  if (wanted === 'town') {
    const here = province.locationIds.filter((id) =>
      big.includes(locations[id]?.archetype ?? 'village'),
    ).length
    return here < 1
  }
  if (wanted === 'city') {
    const region = world.regions[province.regionId]
    if (!region) return false
    const cities = region.provinceIds
      .flatMap((id) => world.provinces[id]?.locationIds ?? [])
      .filter((id) => {
        const archetype = locations[id]?.archetype
        return archetype === 'city' || archetype === 'capital'
      }).length
    return cities < 1
  }
  return true
}

/** Сколько мест провинция вообще может прокормить. */
const MAX_PER_PROVINCE = 6

/**
 * Сутки расселения.
 *
 * Считается редко — раз в год, а не каждый день: основание деревни не то
 * событие, которое стоит проверять триста шестьдесят пять раз.
 */
export function tickSettling(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  day: number,
  rng: Rng,
): SettleResult {
  let generator = rng
  const events: SettleEvent[] = []
  let places = settlements
  let locations = world.locations
  let provinces = world.provinces
  let roads = world.roads

  for (const province of Object.values(provinces)) {
    const own = province.locationIds
      .map((id) => places[id])
      .filter((one): one is Settlement => one !== undefined)
    if (own.length === 0) continue

    // 1. Переросшее место меняет вид: деревня в тысячу восемьсот душ —
    //    уже городок, как её ни называй.
    for (const settlement of own) {
      const location = locations[settlement.locationId]
      if (!location || !isSettlement(location.archetype)) continue
      const step = GROWTH[location.archetype]
      if (!step) continue
      const ceiling = carryingCapacity(world, location.id, settlement)
      if (ceiling <= 0 || settlement.population < ceiling * step.at) continue
      // Земли в провинции ровно столько, сколько есть. Без этого условия
      // деревня становилась городком, получала впятеро больший предел, дорастала
      // до города — и мир за век раздувался с двухсот тридцати тысяч до
      // семисот девяноста. Провинция держит не больше одного большого места,
      // область — не больше одного города.
      if (!hasRoomFor(world, locations, province, step.to)) continue
      locations = { ...locations, [location.id]: { ...location, archetype: step.to } }
      events.push({ type: 'grew', locationId: location.id, archetype: step.to })
    }

    // 2. Руины заселяют заново: земля никуда не делась, и о ней помнят.
    const ruins = own.filter((one) => one.population <= 0)
    const living = own.filter((one) => one.population > 0)
    if (ruins.length > 0 && living.length > 0) {
      const crowded = living.reduce((sum, one) => sum + one.population, 0)
      const [returns, afterReturn] = rollChance(generator, crowded > 3000 ? 0.25 : 0.06)
      generator = afterReturn
      const ruin = ruins[0]
      if (returns && ruin) {
        places = {
          ...places,
          [ruin.locationId]: {
            ...ruin,
            population: SETTLERS_NEEDED,
            recruits: recruitPool(SETTLERS_NEEDED),
          },
        }
        events.push({ type: 'resettled', locationId: ruin.locationId })
      }
      continue
    }

    // 3. Тесно — ставят выселок. Людей на него дают самые людные соседи.
    if (province.locationIds.length >= MAX_PER_PROVINCE) continue
    const biggest = [...living].sort((a, b) => b.population - a.population)[0]
    if (!biggest || biggest.population < 2500) continue
    const [founds, afterFound] = rollChance(generator, 0.05 * province.fertility)
    generator = afterFound
    if (!founds) continue

    const [nameIndex, afterName] = nextInt(generator, 0, NEW_NAMES.length - 1)
    generator = afterName
    const id = `${province.id}:n${province.locationIds.length}`
    const parent = locations[biggest.locationId]
    if (!parent) continue
    const name = uniqueName(locations, NEW_NAMES[nameIndex] ?? 'Новины')

    // Выселок встаёт рядом с матерью-деревней и получает свою точку на карте
    // сразу: место без координаты — это место, до которого не проложить дорогу.
    const spot = placeNear({ x: parent.x, y: parent.y }, id)
    const founded: Location = {
      id,
      provinceId: province.id,
      name,
      archetype: 'village',
      terrain: parent.terrain,
      population: SETTLERS_NEEDED,
      x: spot.x,
      y: spot.y,
    }
    locations = { ...locations, [id]: founded }
    // Скелет пополняется только с конца: иначе сдвинется вся карта.
    provinces = {
      ...provinces,
      [province.id]: { ...province, locationIds: [...province.locationIds, id] },
    }
    // Дорога до матери-деревни: без неё выселок не жилец. Часы считает то же
    // правило, что и при рождении мира, — расстояние и земля, а не кубик.
    const hours = hoursBetweenPlaces(parent, founded)
    roads = {
      ...roads,
      [id]: [{ to: biggest.locationId, hours }],
      [biggest.locationId]: [...(roads[biggest.locationId] ?? []), { to: id, hours }],
    }
    places = {
      ...places,
      [biggest.locationId]: {
        ...biggest,
        population: biggest.population - SETTLERS_NEEDED,
      },
      // Запас выселку считает та же логика, что и всем: с общим правилом мир
      // остаётся одним миром.
      [id]: {
        ...createSettlement({ ...world, locations }, id),
        owner: biggest.owner,
      },
    }
    events.push({ type: 'founded', locationId: id, fromId: biggest.locationId })
  }

  if (events.length === 0) return { world, settlements, rng: generator, events }
  return {
    world: { ...world, locations, provinces, roads },
    settlements: places,
    rng: generator,
    events,
  }
}

/** Двух Выселков в мире быть не должно — путаться будет сам игрок. */
function uniqueName(locations: Readonly<Record<string, Location>>, wanted: string): string {
  const taken = new Set(Object.values(locations).map((one) => one.name))
  if (!taken.has(wanted)) return wanted
  for (let i = 2; i < 40; i += 1) {
    const candidate = `${wanted} Вторые`
    const numbered = i === 2 ? candidate : `${wanted} ${i}`
    if (!taken.has(numbered)) return numbered
  }
  return wanted
}

/** Провинция, к которой принадлежит место: нужна и расселению, и земле. */
export function provinceOfId(world: World, locationId: string): Province | null {
  const location = world.locations[locationId]
  return location ? (world.provinces[location.provinceId] ?? null) : null
}
