import type { BuildingId } from './content/buildings'
import { BUILDINGS, BUILDING_SLOTS } from './content/buildings'
import type { TroopId } from './content/troops'
import { TROOPS } from './content/troops'
import type { Settlement } from './economy'
import type { World } from './world/types'

/**
 * Своя земля (DESIGN.md, п.7).
 *
 * Владеть местом — значит отвечать за него: собирать подати с того, что оно
 * производит, держать гарнизон, который ест и требует жалованья, и строить то,
 * чего этому месту не хватает. Разорённая земля — не доход, а обуза.
 */
export const PLAYER = 'player'

export function isOwnedByPlayer(settlement: Settlement): boolean {
  return settlement.owner === PLAYER
}

export function holdingsOf(
  settlements: Readonly<Record<string, Settlement>>,
  owner: string,
): readonly Settlement[] {
  return Object.values(settlements).filter((settlement) => settlement.owner === owner)
}

export function hasBuilding(settlement: Settlement, building: BuildingId): boolean {
  return settlement.buildings.includes(building)
}

export function freeSlots(world: World, settlement: Settlement): number {
  const archetype = world.locations[settlement.locationId]?.archetype
  if (!archetype) return 0
  return BUILDING_SLOTS[archetype] - settlement.buildings.length - (settlement.building ? 1 : 0)
}

/**
 * Достаток места: сыто ли оно и спокойно ли вокруг.
 * Из него считаются подати — с голодной и разорённой земли взять нечего.
 */
export function prosperity(settlement: Settlement, foodSecurity: number): number {
  return Math.max(0, foodSecurity * (1 - settlement.banditry))
}

/** Дневная подать с одного владения. */
export function dailyTax(settlement: Settlement, foodSecurity: number): number {
  const base = settlement.population * 0.012 * prosperity(settlement, foodSecurity)
  const market = hasBuilding(settlement, 'market') ? 1.3 : 1
  return Math.floor(base * market)
}

/** Сколько человек помещается в гарнизон: без казарм много не посадишь. */
export function garrisonLimit(world: World, settlement: Settlement): number {
  const archetype = world.locations[settlement.locationId]?.archetype
  const base = archetype === 'fortress' ? 60 : archetype === 'capital' ? 80 : 30
  return hasBuilding(settlement, 'barracks') ? base * 2 : base
}

export function garrisonSize(settlement: Settlement): number {
  return Object.values(settlement.garrison).reduce((sum, count) => sum + (count ?? 0), 0)
}

/** Жалованье гарнизону в сутки — платит владелец. */
export function garrisonWages(settlement: Settlement): number {
  let wages = 0
  for (const [troop, count] of Object.entries(settlement.garrison)) {
    wages += TROOPS[troop as TroopId].wage * (count ?? 0)
  }
  return wages
}

/** Во что обходится постройка и сколько её ждать. */
export function buildingCost(building: BuildingId): number {
  return BUILDINGS[building].cost
}
