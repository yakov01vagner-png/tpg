import type { Kingdom, Location, Province, Region, Road, World } from './types'

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
