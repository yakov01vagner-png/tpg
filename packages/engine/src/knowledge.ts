import type { GameState } from './state'
import { regionOf, roadsFrom } from './world/queries'
import type { World } from './world/types'
import { isSettlement } from './world/types'

/**
 * Что герой знает о мире (этап 46).
 *
 * Карта не известна с рождения: на старте видна своя область и то, что
 * рядом, дальше — туман. Мир открывается ногами (пришёл — увидел), слухами
 * (в корчме знают, чего ты не видел) и картами, которые продают. Знание
 * считается провинциями: земля открывается кусками, а не точками.
 *
 * В состоянии лежит только список открытых провинций. Сейв до 0.5 знания не
 * знает — и знает всё: старому игроку туман не выставляют.
 */
export interface Knowledge {
  readonly provinces: readonly string[]
}

export function isKnown(state: Pick<GameState, 'knowledge'>, provinceId: string): boolean {
  return !state.knowledge || state.knowledge.provinces.includes(provinceId)
}

export function knowsPlace(
  state: Pick<GameState, 'knowledge' | 'world'>,
  locationId: string,
): boolean {
  const place = state.world.locations[locationId]
  return place ? isKnown(state, place.provinceId) : false
}

/** Сколько провинций мира открыто, долей. */
export function knownShare(state: Pick<GameState, 'knowledge' | 'world'>): number {
  const all = Object.keys(state.world.provinces).length
  if (!state.knowledge || all === 0) return 1
  return state.knowledge.provinces.filter((id) => state.world.provinces[id]).length / all
}

export function reveal(knowledge: Knowledge, provinceIds: readonly string[]): Knowledge {
  const fresh = provinceIds.filter((id) => !knowledge.provinces.includes(id))
  if (fresh.length === 0) return knowledge
  return { provinces: [...knowledge.provinces, ...fresh] }
}

/**
 * С чем начинают: своя область целиком и всё, до чего от дома три перехода
 * между поселениями. Деревенский знает свою округу и соседей, а не карту.
 */
export function startKnowledge(world: World, homeId: string): Knowledge {
  const region = regionOf(world, homeId)
  const known = new Set<string>(region?.provinceIds ?? [])
  for (const id of within(world, homeId, START_SIGHT)) {
    const place = world.locations[id]
    if (place) known.add(place.provinceId)
  }
  return { provinces: [...known] }
}

/** Докуда видно с дороги: пришёл в место — знаешь его землю и то, куда отсюда ведут дороги. */
export function seenFrom(world: World, locationId: string): readonly string[] {
  const out = new Set<string>()
  const here = world.locations[locationId]
  if (here) out.add(here.provinceId)
  for (const road of roadsFrom(world, locationId)) {
    const next = world.locations[road.to]
    if (next) out.add(next.provinceId)
  }
  return [...out]
}

/** Места в стольких переходах с людьми от точки. */
function within(world: World, fromId: string, settlements: number): readonly string[] {
  const seen = new Set<string>([fromId])
  let edge: { id: string; passed: number }[] = [{ id: fromId, passed: 0 }]
  while (edge.length > 0) {
    const next: { id: string; passed: number }[] = []
    for (const step of edge) {
      for (const road of roadsFrom(world, step.id)) {
        if (seen.has(road.to)) continue
        seen.add(road.to)
        const place = world.locations[road.to]
        const passed = step.passed + (place && isSettlement(place.archetype) ? 1 : 0)
        if (passed < settlements) next.push({ id: road.to, passed })
      }
    }
    edge = next
  }
  return [...seen]
}

const START_SIGHT = 3

/**
 * Слух: ближайшая незнакомая земля, о которой здесь знают.
 *
 * Идём по дорогам от корчмы, пока не упрёмся в место, чьей провинции герой не
 * знает; о ней и расскажут. Без броска: слух — то, что тут все знают, а не
 * лотерея. Ничего незнакомого поблизости — и слухов нет.
 */
export function rumourAt(
  state: Pick<GameState, 'knowledge' | 'world'>,
  locationId: string,
): { readonly provinceId: string; readonly viaId: string } | null {
  if (!state.knowledge) return null
  const seen = new Set<string>([locationId])
  const queue = [locationId]
  while (queue.length > 0) {
    const id = queue.shift() as string
    for (const road of roadsFrom(state.world, id)) {
      if (seen.has(road.to)) continue
      seen.add(road.to)
      const place = state.world.locations[road.to]
      if (!place) continue
      if (!isKnown(state, place.provinceId)) return { provinceId: place.provinceId, viaId: road.to }
      queue.push(road.to)
    }
  }
  return null
}

/** Что говорят о земле: местность, сколько мест, чья. */
export function describeLand(world: World, provinceId: string): string {
  const province = world.provinces[provinceId]
  if (!province) return 'ничего толком'
  const region = world.regions[province.regionId]
  const settled = province.locationIds.length
  const kingdom = region ? world.kingdoms[region.kingdomId]?.name : undefined
  return `${province.name}, ${region?.name ?? 'край'}${kingdom ? ` (${kingdom})` : ''}: ${settled} ${settled === 1 ? 'место' : settled < 5 ? 'места' : 'мест'} с людьми`
}

/** Карта, которую продают: область целиком. */
export interface MapForSale {
  readonly regionId: string
  readonly name: string
  /** Сколько провинций она откроет. */
  readonly fresh: number
  readonly price: number
}

/** Цена за одну незнакомую провинцию: своя корона и чужая. */
export const MAP_PRICE_HOME = 12
export const MAP_PRICE_FAR = 30

/**
 * Какие карты продают здесь.
 *
 * В городе и порту — карты своей короны; в столице — ещё и дальних земель,
 * дороже. Карта уже известной земли не продаётся: знание — товар, а не бумага.
 */
export function mapsFor(
  state: Pick<GameState, 'knowledge' | 'world'>,
  locationId: string,
): readonly MapForSale[] {
  if (!state.knowledge) return []
  const here = state.world.locations[locationId]
  if (!here) return []
  const kind = here.archetype
  if (kind !== 'city' && kind !== 'capital' && kind !== 'port') return []
  const own = regionOf(state.world, locationId)?.kingdomId ?? null
  const out: MapForSale[] = []
  for (const region of Object.values(state.world.regions)) {
    const home = region.kingdomId === own
    if (!home && kind !== 'capital') continue
    const fresh = region.provinceIds.filter((id) => !isKnown(state, id)).length
    if (fresh === 0) continue
    out.push({
      regionId: region.id,
      name: region.name,
      fresh,
      price: fresh * (home ? MAP_PRICE_HOME : MAP_PRICE_FAR),
    })
  }
  return out.sort((a, b) => a.price - b.price)
}

/** Во сколько раз дольше идти незнакомой землёй: дороги не знаешь, спрашиваешь, плутаешь. */
export const BLIND_SLOW = 1.3
/** И во сколько раз опаснее: не знаешь, где ждут. */
export const BLIND_DANGER = 1.5
