import type { BuildingId } from './content/buildings'
import { BUILDINGS, BUILDING_SLOTS } from './content/buildings'
import type { TroopId } from './content/troops'
import { TROOPS } from './content/troops'
import type { Settlement } from './economy'
import type { World } from './world/types'
import { isSettlement } from './world/types'

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

/**
 * Чьи это места — в порядке, который не плавает (этап 208, Пр1).
 *
 * Порядок ключей в словаре поселений — не данные: он такой, каким его оставила
 * запись. А держатель по этому списку ходит: отчитывается местами, объезжает
 * их, кормит и собирает подать, — и пока список шёл словарём, «первое место»
 * значило «то, что раньше записалось в сейв». Здесь порядок назван: по имени.
 */
export function holdingsOf(
  settlements: Readonly<Record<string, Settlement>>,
  owner: string,
): readonly Settlement[] {
  return Object.values(settlements)
    .filter((settlement) => settlement.owner === owner)
    .sort((a, b) => (a.locationId < b.locationId ? -1 : a.locationId > b.locationId ? 1 : 0))
}

export function hasBuilding(settlement: Settlement, building: BuildingId): boolean {
  return settlement.buildings.includes(building)
}

export function freeSlots(world: World, settlement: Settlement): number {
  const archetype = world.locations[settlement.locationId]?.archetype
  if (!archetype || !isSettlement(archetype)) return 0
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
  const tavern = hasBuilding(settlement, 'tavern') ? 1.1 : 1
  return Math.floor(base * market * tavern)
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

/**
 * Главное место провинции для этого держателя: самое людное из тех, что он
 * здесь держит. По нему провинция и считается взятой.
 */
export function provinceSeat(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  provinceId: string,
  owner: string | null,
): string | null {
  const province = world.provinces[provinceId]
  if (!province) return null
  let seat: string | null = null
  let most = -1
  for (const id of province.locationIds) {
    const settlement = settlements[id]
    if (!settlement || settlement.owner !== owner || settlement.population <= 0) continue
    if (settlement.population > most) {
      most = settlement.population
      seat = id
    }
  }
  return seat
}

/**
 * Взять землю.
 *
 * Провинция следует за своим главным местом (DESIGN.md, п.3.2: лорд держит
 * провинцию, а не точку). Пока каждую деревню приходилось брать отдельно,
 * владение рассыпалось в чересполосицу: у одного лорда три деревни здесь, у
 * другого одна там, и «отнять у него землю» не значило ничего.
 *
 * Берущий получает всё, что прежний держатель держал в этой провинции, — но
 * только если взял его главное место. Хутор на отшибе остаётся хутором.
 */
export function takeLand(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  locationId: string,
  owner: string,
): Readonly<Record<string, Settlement>> {
  const taken = settlements[locationId]
  if (!taken) return settlements
  const loser = taken.owner
  const provinceId = world.locations[locationId]?.provinceId
  const seat = provinceId ? provinceSeat(world, settlements, provinceId, loser) : null

  const next: Record<string, Settlement> = { ...settlements, [locationId]: { ...taken, owner } }
  if (!provinceId || seat !== locationId || loser === null || loser === owner) return next

  for (const id of world.provinces[provinceId]?.locationIds ?? []) {
    const settlement = next[id]
    if (!settlement || settlement.owner !== loser) continue
    next[id] = { ...settlement, owner }
  }
  return next
}

/**
 * Чья это земля.
 *
 * У перевала и кургана хозяина нет и быть не может — но земля под ними чья-то.
 * Держателем считается тот, кто держит главное место провинции: провинция и
 * есть единица владения (DESIGN.md, п.3.2).
 */
export function landHolderOf(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  locationId: string,
): string | null {
  const provinceId = world.locations[locationId]?.provinceId
  if (!provinceId) return null
  let owner: string | null = null
  let most = 0
  for (const id of world.provinces[provinceId]?.locationIds ?? []) {
    const settlement = settlements[id]
    if (!settlement || settlement.population <= most) continue
    most = settlement.population
    owner = settlement.owner
  }
  return owner
}

/** Сколько застава в своей провинции даёт в сутки, когда на дорогах спокойно. */
export const TOLL_PER_OUTPOST = 7

/**
 * Пошлина с дорог.
 *
 * Дорога — тоже хозяйство: застава в провинции берёт с проезжих, и берёт тем
 * больше, чем спокойнее вокруг. В разбойной округе обозы идут в объезд или не
 * идут вовсе, и застава не берёт ничего.
 */
export function dailyTolls(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  owner: string,
): number {
  const held = new Set(
    Object.values(settlements)
      .filter((one) => one.owner === owner && one.population > 0)
      .map((one) => world.locations[one.locationId]?.provinceId ?? ''),
  )
  let toll = 0
  for (const provinceId of held) {
    const province = world.provinces[provinceId]
    if (!province) continue
    const gates = province.siteIds.filter(
      (id) => world.locations[id]?.archetype === 'outpost',
    ).length
    if (gates === 0) continue
    const around = province.locationIds
      .map((id) => settlements[id])
      .filter((one): one is Settlement => one !== undefined && one.owner === owner)
    const peace =
      around.length === 0
        ? 0
        : 1 - around.reduce((sum, one) => sum + one.banditry, 0) / around.length
    toll += gates * TOLL_PER_OUTPOST * Math.max(0, peace)
  }
  return Math.floor(toll)
}

/** Во что обходится постройка и сколько её ждать. */
export function buildingCost(building: BuildingId): number {
  return BUILDINGS[building].cost
}
