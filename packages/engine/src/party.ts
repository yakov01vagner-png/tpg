import type { Character } from './character'
import { carriedWeight, carryCapacity } from './character'
import type { GoodId } from './content/goods'
import { TROOPS, TROOP_CARRY, TROOP_FOOD_PER_DAY, type TroopId } from './content/troops'

/**
 * Отряд: люди, которых надо кормить и которым надо платить.
 *
 * Отряд — не бесплатная сила, а ежедневный расход. Голодный и неоплаченный
 * отряд разбегается сам, и это главный ограничитель: водить войско дороже, чем
 * его нанять.
 */
export interface Party {
  readonly units: Readonly<Partial<Record<TroopId, number>>>
  /** Боевой дух 0..100. */
  readonly morale: number
  /** Сколько суток подряд людям не платили или не кормили. */
  readonly hungryDays: number
}

export const EMPTY_PARTY: Party = { units: {}, morale: 60, hungryDays: 0 }

export const MORALE_MAX = 100
/** Ниже этого начинают уходить по ночам. */
export const DESERTION_MORALE = 25

export function partySize(party: Party): number {
  return Object.values(party.units).reduce((sum, count) => sum + (count ?? 0), 0)
}

export function troopCount(party: Party, troop: TroopId): number {
  return party.units[troop] ?? 0
}

/** Жалованье всему отряду за сутки. */
export function dailyWages(party: Party): number {
  let wages = 0
  for (const [troop, count] of Object.entries(party.units)) {
    wages += TROOPS[troop as TroopId].wage * (count ?? 0)
  }
  return wages
}

/** Сколько еды отряд съедает за сутки. */
export function dailyFood(party: Party): number {
  return Math.ceil(partySize(party) * TROOP_FOOD_PER_DAY)
}

/** Поклажа: своя спина плюс спины тех, кто идёт с тобой. */
export function partyCapacity(character: Character, party: Party): number {
  return carryCapacity(character) + partySize(party) * TROOP_CARRY
}

export function partyLoad(character: Character): number {
  return carriedWeight(character)
}

export function withUnits(party: Party, troop: TroopId, delta: number): Party {
  const next = Math.max(0, troopCount(party, troop) + delta)
  const units = { ...party.units }
  if (next === 0) delete units[troop]
  else units[troop] = next
  return { ...party, units }
}

/** Сила отряда одним числом — для сравнения на глаз и для встреч на дороге. */
export function partyStrength(party: Party): number {
  let strength = 0
  for (const [troop, count] of Object.entries(party.units)) {
    const def = TROOPS[troop as TroopId]
    strength += (def.attack + def.defense + def.ranged * 0.8) * (count ?? 0)
  }
  return Math.round(strength * (0.5 + party.morale / 200))
}

/** Еда, которой отряд может кормиться: что съедобно, то и съедят. */
export const EDIBLE: readonly GoodId[] = ['grain', 'fish']
