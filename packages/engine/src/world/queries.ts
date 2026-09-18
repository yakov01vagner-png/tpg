import type { Kingdom, Location, Province, Region, Road, World } from './types'
import { isSettlement } from './types'

/** Дороги из локации. Пустой список — тупик, такого в сгенерированном мире быть не должно. */
export function roadsFrom(world: World, locationId: string): readonly Road[] {
  return world.roads[locationId] ?? []
}

export function provinceOf(world: World, locationId: string): Province | null {
  const location = world.locations[locationId]
  return location ? (world.provinces[location.provinceId] ?? null) : null
}

export function regionOf(world: World, locationId: string): Region | null {
  const province = provinceOf(world, locationId)
  return province ? (world.regions[province.regionId] ?? null) : null
}

export function kingdomOf(world: World, locationId: string): Kingdom | null {
  const region = regionOf(world, locationId)
  return region ? (world.kingdoms[region.kingdomId] ?? null) : null
}

/** «Ре-Эстиз · Северная область · Лес Эшоран» — где ты находишься. */
export function addressOf(world: World, locationId: string): string {
  const parts = [
    kingdomOf(world, locationId)?.name,
    regionOf(world, locationId)?.name,
    provinceOf(world, locationId)?.name,
  ].filter((part): part is string => Boolean(part))
  return parts.join(' · ')
}

export function locationsOfProvince(world: World, provinceId: string): readonly Location[] {
  const province = world.provinces[provinceId]
  if (!province) return []
  return province.locationIds
    .map((id) => world.locations[id])
    .filter((location): location is Location => Boolean(location))
}

/**
 * Ближайшие поселения по дорогам.
 *
 * С версии 0.4 у деревни не бывает соседа-деревни: между поселениями всегда
 * лежит земля (этап 26). Поэтому всё, что раньше спрашивало «кто у меня за
 * околицей» через `roadsFrom`, теперь спрашивает это: идём по дорогам, пока не
 * упрёмся в людей, и останавливаемся на них. Без этого мор перестал
 * перекидываться вовсе: за околицей у него оказывались одни курганы.
 */
export function neighbourSettlements(
  world: World,
  fromId: string,
  maxHops = 6,
): readonly { readonly id: string; readonly hops: number; readonly hours: number }[] {
  const seen = new Set<string>([fromId])
  const found: { id: string; hops: number; hours: number }[] = []
  let edge: { id: string; hops: number; hours: number }[] = [{ id: fromId, hops: 0, hours: 0 }]

  while (edge.length > 0) {
    const next: { id: string; hops: number; hours: number }[] = []
    for (const step of edge) {
      if (step.hops >= maxHops) continue
      for (const road of roadsFrom(world, step.id)) {
        if (seen.has(road.to)) continue
        seen.add(road.to)
        const reached = { id: road.to, hops: step.hops + 1, hours: step.hours + road.hours }
        const place = world.locations[road.to]
        // Дошли до поселения — дальше через него не идём: это уже его округа.
        if (place && isSettlement(place.archetype)) found.push(reached)
        else next.push(reached)
      }
    }
    edge = next
  }
  return found
}

/** Все локации, куда можно дойти по дорогам. Используется проверкой связности. */
export function reachableFrom(world: World, startId: string): ReadonlySet<string> {
  const seen = new Set<string>()
  const queue = [startId]
  while (queue.length > 0) {
    const current = queue.pop()
    if (current === undefined || seen.has(current)) continue
    seen.add(current)
    for (const road of roadsFrom(world, current)) {
      if (!seen.has(road.to)) queue.push(road.to)
    }
  }
  return seen
}

/** Сколько переходов до цели, или null если пути нет. Для подсказки «3 перехода». */
export function hopsBetween(world: World, fromId: string, toId: string): number | null {
  if (fromId === toId) return 0
  const seen = new Set<string>([fromId])
  let frontier = [fromId]
  let hops = 0
  while (frontier.length > 0) {
    hops += 1
    const next: string[] = []
    for (const current of frontier) {
      for (const road of roadsFrom(world, current)) {
        if (road.to === toId) return hops
        if (seen.has(road.to)) continue
        seen.add(road.to)
        next.push(road.to)
      }
    }
    frontier = next
  }
  return null
}
