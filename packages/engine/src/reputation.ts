/**
 * Имя: что о тебе помнят (этап 6, блок R).
 *
 * Отношение — не абстрактные очки, а память о поступках: разорил город — там
 * тебя не пустят в ворота; привёз хлеб в голод — примут как своего. Числа
 * держатся в промежутке −100..100 и влияют на цены, найм и доступ.
 */
export interface Reputation {
  readonly places: Readonly<Record<string, number>>
  readonly lords: Readonly<Record<string, number>>
}

export const NO_REPUTATION: Reputation = { places: {}, lords: {} }

/** Ниже этого тебя не пускают на порог. */
export const SHUNNED = -50

export function placeRep(reputation: Reputation, locationId: string): number {
  return reputation.places[locationId] ?? 0
}

export function lordRep(reputation: Reputation, lordId: string): number {
  return reputation.lords[lordId] ?? 0
}

function clamp(value: number): number {
  return Math.max(-100, Math.min(100, Math.round(value)))
}

export function withPlaceRep(
  reputation: Reputation,
  locationId: string,
  delta: number,
): Reputation {
  return {
    ...reputation,
    places: { ...reputation.places, [locationId]: clamp(placeRep(reputation, locationId) + delta) },
  }
}

export function withLordRep(reputation: Reputation, lordId: string, delta: number): Reputation {
  return {
    ...reputation,
    lords: { ...reputation.lords, [lordId]: clamp(lordRep(reputation, lordId) + delta) },
  }
}

export function attitudeWord(value: number): string {
  if (value <= SHUNNED) return 'ненавидят'
  if (value < -20) return 'не рады'
  if (value < 10) return 'всё равно'
  if (value < 40) return 'уважают'
  return 'свой'
}

/**
 * Во сколько раз дороже покупать здесь.
 * Своим уступают, чужих обдирают — но в разумных пределах.
 */
export function priceFactor(value: number): number {
  return 1 - value / 1000
}

export function isShunned(value: number): boolean {
  return value <= SHUNNED
}
