import { SITES, SITE_EPITHETS, sitesFor } from '../content/sites'
import {
  ARCHETYPE_NAMES,
  IMPORT_RELIANCE,
  ISLANDS,
  KINGDOM_BLUEPRINTS,
  type KingdomBlueprint,
  MARCHES,
  NAME_QUALIFIERS,
  PROVINCE_NAMES,
  PROVINCE_PREFIXES,
  RIVER_NAMES,
  SETTLEMENT_NAMES,
  TERRAIN_FERTILITY,
} from '../content/world'
import { landCapacityOf } from '../life'
import type { Rng } from '../rng'
import { createRng, nextFloat, nextInt } from '../rng'
import { buildLanes } from './lanes'
import type { Point } from './layout'
import { MAP_SIZE, MIN_GAP, SITE_GAP, Spacer, placeLocations, provinceCentersOf } from './layout'
import { hopsBetween } from './queries'
import type { River, RiverMask } from './rivers'
import { buildRivers, onRiver, riverCrossing, riverMask } from './rivers'
import type { Spot } from './roads'
import { buildRoads, hoursBetweenPlaces, neighbourPairs, spotOf } from './roads'
import type { Sea } from './sea'
import { buildSea, crossesWater, onShore } from './sea'
import { FRONTIER, isSettlement, isSite } from './types'
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

        // Места без жителей здесь не заводятся: они лягут после того, как
        // поселения встанут на карту, — ровно между соседями (этап 26).
        const siteIds: string[] = []

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

  // Острова кладутся последними из рукописного: они не принадлежат ни одной
  // короне, лежат за морем от всех и потому не участвуют ни в одном расчёте
  // материка (этап 35).
  for (const island of ISLANDS) {
    const regionId = `island.${island.id}`
    const provinceId = `${regionId}.p0`
    const fertility = round2(roll.betweenFloat(TERRAIN_FERTILITY[island.terrain]))
    const locationIds: string[] = []
    for (const [index, place] of island.places.entries()) {
      const id = `${provinceId}.l${index}`
      locations[id] = {
        id,
        provinceId,
        name: place.name,
        archetype: place.archetype,
        terrain: island.terrain,
        // Остров кормится морем, а не землёй: своей земли под ним мало, и людей
        // на нём втрое меньше того, что дала бы эта земля на материке. Гавань
        // в две тысячи душ — это большой остров, а не город: шесть тысяч,
        // которые выходили по общей мере, стояли бы на голом камне.
        population: Math.max(
          60,
          Math.round(landCapacityOf(place.archetype, island.terrain, fertility) * 0.3),
        ),
      }
      locationIds.push(id)
    }
    const siteIds: string[] = []
    for (const [index, kind] of island.sites.entries()) {
      const id = `${provinceId}.s${index}`
      locations[id] = {
        id,
        provinceId,
        name: names.forSite(kind),
        archetype: kind,
        terrain: island.terrain,
        population: 0,
      }
      siteIds.push(id)
    }
    provinces[provinceId] = {
      id: provinceId,
      regionId,
      name: island.provinceName,
      terrain: island.terrain,
      fertility,
      locationIds,
      siteIds,
      island: true,
    }
    regions[regionId] = {
      id: regionId,
      kingdomId: FRONTIER,
      name: island.name,
      terrain: island.terrain,
      provinceIds: [provinceId],
    }
  }

  // Сперва поселения ложатся на карту, потом между соседями встаёт то, через
  // что к ним идут, и только потом по всему этому прокладывают дороги: дорога —
  // следствие земли, а не списка (roads.ts).
  const spacer = new Spacer()
  const points = placeLocations({ kingdoms, regions, provinces }, spacer)
  const placed: Record<string, Location> = {}
  for (const [id, location] of Object.entries(locations)) {
    const point = points[id] ?? { x: MAP_SIZE / 2, y: MAP_SIZE / 2 }
    placed[id] = { ...location, x: point.x, y: point.y }
  }

  fillBetween(roll, names, spacer, { provinces, locations: placed })
  fillLongLegs(roll, names, spacer, { provinces, locations: placed })

  // Вода кладётся после мест и до дорог: суша — это то, что вокруг людей и
  // вдоль дорог между ними, а дорога по морю не идёт (sea.ts). Соседство
  // считается заранее и тем же правилом, каким его потом посчитают дороги.
  const pairs = neighbourPairs(Object.values(placed).map(spotOf))
  const links = pairs.map((pair) => [pair.from, pair.to] as const)
  const centres = provinceCentersOf({ kingdoms, regions, provinces } as World)
  // Середина острова землю вокруг себя не держит: её держат только сами места.
  // Иначе остров выходит куском материка в море — полтораста единиц суши, у
  // которой середина дальше от воды, чем деревня в глубине королевства, и порт
  // на нём оказывается не у моря (этап 35).
  const mainland = Object.entries(centres)
    .filter(([provinceId]) => !provinces[provinceId]?.island)
    .map(([, point]) => point)
  const sea = buildSea(Object.values(placed), links, mainland, seed)

  // Реки текут по уже готовой суше к уже готовому морю, а броды встают там,
  // где их переходит дорога: иначе переправа оказывается местом с дурной
  // репутацией, но без реки (rivers.ts). Соседство берётся то же самое — море
  // его не меняет, а только отнимает у него переходы через воду.
  const rivers = buildRivers(sea, riverSources(sea, centres, provinces), RIVER_NAMES)
  const currents = riverMask(rivers)
  const dry = pairs.filter((pair) => !crossesWater(sea, pair.from, pair.to))
  fillFords(names, spacer, { provinces, locations: placed }, dry, currents)

  settlePorts(placed, provinces, regions, sea)

  const skeleton = { kingdoms, regions, provinces, locations: placed, sea, rivers }
  // Морские пути строятся последними: им нужны и вода, и уже назначенные порты
  // (этап 35).
  return { ...skeleton, roads: buildRoads(skeleton), lanes: buildLanes(placed, sea) }
}

/**
 * Откуда берутся реки.
 *
 * Исток — в горах и холмах, подальше от моря: река, начинающаяся в получасе от
 * прибоя, — это ручей, и дорогу она не режет. Истоки разводятся друг от друга,
 * иначе с одной гряды сходит десяток русел в одну сторону.
 */
const SOURCE_GAP = 260
const INLAND = 220
const MAX_RIVERS = 12

function riverSources(
  sea: Sea,
  centres: Readonly<Record<string, Point>>,
  provinces: Readonly<Record<string, Province>>,
): Point[] {
  const highland: Point[] = []
  const lowland: Point[] = []
  for (const [provinceId, point] of Object.entries(centres)) {
    const terrain = provinces[provinceId]?.terrain
    if (!terrain || onShore(sea, point, INLAND)) continue
    if (terrain === 'mountains' || terrain === 'hills') highland.push(point)
    else lowland.push(point)
  }
  const chosen: Point[] = []
  // Сперва горы: река идёт с высоты. Если гор мало, исток берётся с суши
  // подальше от воды — родник бьёт и на равнине.
  for (const point of [...highland, ...lowland]) {
    if (chosen.length >= MAX_RIVERS) break
    if (chosen.some((other) => Math.hypot(other.x - point.x, other.y - point.y) < SOURCE_GAP)) {
      continue
    }
    chosen.push(point)
  }
  return chosen
}

/**
 * Броды на руслах.
 *
 * Дорога переходит реку только там, где на русле стоит место, — значит это
 * место должно там стоять. Поэтому сперва считается соседство без рек (те
 * двое, между которыми никто не стоит), а потом на каждый отрезок, который
 * упирается в русло, кладётся брод ровно в точке перехода. После этого сам
 * отрезок перестаёт быть прямым: брод ближе к обоим концам, чем они друг к
 * другу, и дорога идёт через него (roads.ts).
 *
 * Вид места выбирает земля: в топях это гать, у воды — переправа с паромом, а
 * на прочей земле брод. Разница не косметическая: брод весной уходит под воду,
 * а паром ходит и в половодье (`isFlood`).
 */
const FORD_GAP = 36

function fillFords(
  names: Namer,
  spacer: Spacer,
  world: { provinces: Record<string, Province>; locations: Record<string, Location> },
  pairs: readonly { from: Spot; to: Spot }[],
  currents: RiverMask,
): void {
  const counters = new Map<string, number>()
  for (const province of Object.values(world.provinces)) {
    counters.set(province.id, province.siteIds.length)
  }
  const placed: Point[] = []

  for (const pair of pairs) {
    const from = world.locations[pair.from.id]
    const to = world.locations[pair.to.id]
    if (!from || !to) continue
    const crossing = riverCrossing(currents, from, to)
    if (!crossing) continue
    // Один брод на переход: соседние пары переходят реку в одном и том же
    // месте, и ставить там три брода подряд незачем.
    if (placed.some((one) => Math.hypot(one.x - crossing.x, one.y - crossing.y) < FORD_GAP)) {
      continue
    }
    const host =
      Math.hypot(from.x - crossing.x, from.y - crossing.y) <
      Math.hypot(to.x - crossing.x, to.y - crossing.y)
        ? from
        : to
    const province = world.provinces[host.provinceId]
    if (!province) continue
    // Вид переправы выбирает земля — и выбирает из того, что на такой земле
    // вообще бывает (правило этапа 26: гать только в топях, перевал только в
    // горах). В горах реку переходят по мосту, потому что брода там нет.
    const kind: SiteKind = crossingFor(province.terrain)
    // Брод обязан стоять на русле: отведённый в сторону, он уже не брод. Если
    // в самой точке перехода тесно, место ищется вдоль русла — по кругу, но
    // только там, где река ещё течёт. Не нашлось — брода не будет, и дорога
    // здесь не пройдёт вовсе.
    const point = freeOnRiver(spacer, currents, crossing)
    if (!point) continue
    const next = (counters.get(province.id) ?? 0) + 1
    counters.set(province.id, next)
    const id = `${province.id}.s${next - 1}`
    world.locations[id] = {
      id,
      provinceId: province.id,
      name: names.forSite(kind),
      archetype: kind,
      terrain: province.terrain,
      population: 0,
      x: point.x,
      y: point.y,
    }
    world.provinces[province.id] = { ...province, siteIds: [...province.siteIds, id] }
    placed.push(point)
  }
}

/**
 * Порты ставятся по воде, а не по названию местности.
 *
 * Вид места выбирается по местности провинции («побережье»), а вода появляется
 * позже и своим правилом — поэтому порт легко оказывался в полутора днях от
 * моря, а у приморской области не оказывалось ни одного порта. Два правила:
 * порт не на берегу меняется видом с тем местом своей провинции, что стоит на
 * берегу (а если такого нет — становится городком, потому что порт без воды и
 * есть городок); и всякая область, вышедшая к морю, получает хотя бы один порт
 * — самое людное из своих береговых мест.
 */
function settlePorts(
  locations: Record<string, Location>,
  provinces: Record<string, Province>,
  regions: Record<string, Region>,
  sea: Sea,
): void {
  // Читаем текущее состояние, а не снимок: обмен видами меняет обоих, и по
  // устаревшему списку порт легко поменяться сам с собой во второй раз.
  for (const id of Object.keys(locations)) {
    const location = locations[id]
    if (!location || location.archetype !== 'port' || onShore(sea, location)) continue
    const province = provinces[location.provinceId]
    const neighbour = (province?.locationIds ?? [])
      .map((one) => locations[one])
      .find(
        (one): one is Location =>
          one !== undefined &&
          one.id !== location.id &&
          isSettlement(one.archetype) &&
          // Со столицей не меняются — её место в мире назначено сеттингом; с
          // другим портом меняться бессмысленно, оба останутся портами.
          one.archetype !== 'capital' &&
          one.archetype !== 'port' &&
          onShore(sea, one),
      )
    if (neighbour) {
      locations[location.id] = { ...location, archetype: neighbour.archetype }
      locations[neighbour.id] = { ...neighbour, archetype: 'port' }
      continue
    }
    locations[location.id] = { ...location, archetype: 'town' }
  }

  // У каждой области, вышедшей к морю, есть свой порт: без этого на весь мир
  // оставалось два порта, и версия про воду начиналась с того, что плыть
  // неоткуда.
  for (const region of Object.values(regions)) {
    const own = region.provinceIds
      .flatMap((id) => provinces[id]?.locationIds ?? [])
      .map((id) => locations[id])
      .filter((one): one is Location => one !== undefined && isSettlement(one.archetype))
    if (own.some((one) => one.archetype === 'port')) continue
    const shore = own
      .filter((one) => one.archetype !== 'capital' && onShore(sea, one))
      .sort((a, b) => b.population - a.population)[0]
    if (!shore) continue
    locations[shore.id] = { ...shore, archetype: 'port' }
  }
}

/** Ближайшая к переходу точка на русле, где ещё не тесно. */
function freeOnRiver(spacer: Spacer, currents: RiverMask, at: Point): Point | null {
  if (spacer.free(at, MIN_GAP)) return spacer.take(at, MIN_GAP)
  for (const radius of [18, 26, 34, 44]) {
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2
      const point = {
        x: Math.round(at.x + Math.cos(angle) * radius),
        y: Math.round(at.y + Math.sin(angle) * radius),
      }
      if (!onRiver(currents, point.x, point.y)) continue
      if (!spacer.free(point, MIN_GAP)) continue
      return spacer.take(point, MIN_GAP)
    }
  }
  return null
}

/** Чем переходят реку на такой земле. */
function crossingFor(terrain: Terrain): SiteKind {
  if (terrain === 'marsh') return 'causeway'
  if (terrain === 'coast') return 'crossing'
  if (terrain === 'mountains') return 'bridge'
  return 'ford'
}

/**
 * Дневной переход — это предел отрезка.
 *
 * После того как места легли между поселениями, в мире остаются длинные
 * отрезки: там, где между двумя местами лежит пустая земля, — через марку,
 * через горы, через степь. Двадцать пять часов одним шагом — это не переход, а
 * прежний портал в малом виде: за такой отрезок нельзя ни свернуть, ни
 * остановиться, и решение принимается раз в сутки. Поэтому на всякий длинный
 * отрезок кладётся ещё земля, пока шаг не станет дневным.
 *
 * Заодно это чинит последнюю лазейку правила «между поселениями два места»:
 * одна пара на мир оказывалась в двух переходах через одинокий курган посреди
 * ничьей земли.
 */
const LONG_LEG = 10

function fillLongLegs(
  roll: Roller,
  names: Namer,
  spacer: Spacer,
  world: { provinces: Record<string, Province>; locations: Record<string, Location> },
): void {
  const pairs = neighbourPairs(Object.values(world.locations).map(spotOf))
  const counters = new Map<string, number>()
  for (const province of Object.values(world.provinces)) {
    counters.set(province.id, province.siteIds.length)
  }

  for (const pair of pairs) {
    const from = world.locations[pair.from.id]
    const to = world.locations[pair.to.id]
    if (!from || !to) continue
    const hours = hoursBetweenPlaces(from, to)
    if (hours <= LONG_LEG) continue
    const count = Math.min(4, Math.round(hours / LONG_LEG))
    const span = Math.hypot(from.x - to.x, from.y - to.y)
    for (let index = 0; index < count; index += 1) {
      const share = (index + 1) / (count + 1)
      const host = world.locations[share < 0.5 ? from.id : to.id]
      const province = world.provinces[host?.provinceId ?? '']
      if (!host || !province) continue
      const next = (counters.get(province.id) ?? 0) + 1
      counters.set(province.id, next)
      const id = `${province.id}.s${next - 1}`
      const kind = pickSite(roll, province.terrain)
      const point = spacer.place(
        {
          x: from.x + (to.x - from.x) * share,
          y: from.y + (to.y - from.y) * share,
        },
        SITE_GAP,
      )
      // Если распорядитель отнёс точку далеко в сторону, земля тут уже занята:
      // ставить нечего, отрезок останется длинным.
      if (Math.hypot(point.x - from.x, point.y - from.y) > span) continue
      world.locations[id] = {
        id,
        provinceId: province.id,
        name: names.forSite(kind),
        archetype: kind,
        terrain: province.terrain,
        population: 0,
        x: point.x,
        y: point.y,
      }
      world.provinces[province.id] = { ...province, siteIds: [...province.siteIds, id] }
    }
  }
}

/**
 * Земля между поселениями.
 *
 * Правило версии 0.4: прямой дороги из деревни в деревню не бывает — между ними
 * всегда лежит не меньше двух мест без жителей. Поэтому места без жителей не
 * рассыпаются по провинции наугад, а кладутся ровно на те отрезки, по которым
 * от соседа к соседу и ходят: сперва считается, кто кому сосед (`neighbourPairs`
 * — те двое, между которыми никто не стоит), потом на каждый такой отрезок
 * ложатся брод, перевал или урочище. После этого прямого отрезка между
 * поселениями уже не остаётся: дорога идёт через них, потому что они и есть
 * дорога.
 *
 * До 0.4 между деревнями стояло ноль или одно место, и путь из деревни в
 * деревню был одним шагом: земля между ними была надписью.
 */
function fillBetween(
  roll: Roller,
  names: Namer,
  spacer: Spacer,
  world: { provinces: Record<string, Province>; locations: Record<string, Location> },
): void {
  const settlements = Object.values(world.locations).filter((one) => isSettlement(one.archetype))
  const pairs = neighbourPairs(settlements.map(spotOf))
  const counters = new Map<string, number>()
  for (const province of Object.values(world.provinces)) {
    counters.set(province.id, province.siteIds.length)
  }

  for (const pair of pairs) {
    const from = world.locations[pair.from.id]
    const to = world.locations[pair.to.id]
    if (!from || !to) continue
    const span = Math.hypot(from.x - to.x, from.y - to.y)
    // Два места на отрезок, а на длинном — три: чем дальше сосед, тем больше
    // между вами земли, и тем длиннее был бы иначе один шаг.
    const count = span > 90 ? 3 : 2
    for (let index = 0; index < count; index += 1) {
      const share = (index + 1) / (count + 1)
      // Место стоит у дороги, а не строго на прямой: иначе карта — чертёж.
      const off = ((index % 2 === 0 ? 1 : -1) * Math.min(18, span * 0.12)) / 2
      const wanted = {
        x: from.x + (to.x - from.x) * share - ((to.y - from.y) / Math.max(1, span)) * off,
        y: from.y + (to.y - from.y) * share + ((to.x - from.x) / Math.max(1, span)) * off,
      }
      // Земля под местом — земля того соседа, к которому оно ближе.
      const host = world.locations[share < 0.5 ? from.id : to.id]
      const province = world.provinces[host?.provinceId ?? '']
      if (!host || !province) continue
      const next = (counters.get(province.id) ?? 0) + 1
      counters.set(province.id, next)
      const id = `${province.id}.s${next - 1}`
      const kind = pickSite(roll, province.terrain)
      const point = spacer.place(wanted, SITE_GAP)
      world.locations[id] = {
        id,
        provinceId: province.id,
        name: names.forSite(kind),
        archetype: kind,
        terrain: province.terrain,
        population: 0,
        x: point.x,
        y: point.y,
      }
      world.provinces[province.id] = { ...province, siteIds: [...province.siteIds, id] }
    }
  }
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
  // Рукописные имена занимают своё место сразу: столицы, вольные сёла марок и
  // места островов написаны руками, и раздатчик не должен выдать такое же
  // имя деревне в другом конце мира.
  const used = new Set<string>([
    ...KINGDOM_BLUEPRINTS.map((one) => one.capitalName),
    ...MARCHES.map((one) => one.freeTown),
    ...ISLANDS.flatMap((one) => one.places.map((place) => place.name)),
  ])
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
