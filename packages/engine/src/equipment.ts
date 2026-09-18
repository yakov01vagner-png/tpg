import type { Character } from './character'
import type { Equipment, EquippedItem, ItemDef, SlotId } from './content/equipment'
import { HORSE_CARRY, ITEMS, ITEMS_BY_ID, SLOT_IDS } from './content/equipment'
import type { LocationArchetype } from './world/types'

export type { Equipment, EquippedItem }

/**
 * Надетое на герое.
 *
 * Вещь не просто прибавляет числа: она требует силы и навыка, а без них тянет
 * вниз. Латы на слабом человеке — не защита, а обуза, и это должно быть видно
 * в тех же числах, а не запретом.
 */
export function itemOf(equipment: Equipment, slot: SlotId): ItemDef | null {
  const worn = equipment[slot]
  return worn ? (ITEMS_BY_ID[worn.id] ?? null) : null
}

/**
 * Годность вещи: изношенная и не по силам работает хуже.
 * Ниже нуля не опускается — вещь просто перестаёт помогать.
 */
export function effectiveness(character: Character, item: ItemDef, condition: number): number {
  const wear = Math.max(0.3, condition / 100)
  const strengthGap = item.strength - character.attributes.strength
  const strengthFactor = strengthGap > 0 ? Math.max(0.3, 1 - strengthGap * 0.18) : 1
  const skillFactor = item.skill
    ? Math.max(0.4, Math.min(1, 0.4 + character.skills[item.skill.id].level / item.skill.level / 2))
    : 1
  return wear * strengthFactor * skillFactor
}

export interface GearBonus {
  readonly attack: number
  readonly defense: number
  readonly weight: number
}

/** Что даёт надетое — с поправкой на износ, силу и выучку. */
export function gearBonus(character: Character): GearBonus {
  let attack = 0
  let defense = 0
  let weight = 0
  for (const slot of SLOT_IDS) {
    const worn = character.equipment[slot]
    const item = worn ? ITEMS_BY_ID[worn.id] : null
    if (!worn || !item) continue
    const factor = effectiveness(character, item, worn.condition)
    attack += item.attack * factor
    defense += item.defense * factor
    weight += item.weight
  }
  return {
    attack: Math.round(attack * 10) / 10,
    defense: Math.round(defense * 10) / 10,
    weight,
  }
}

/** Конь везёт поклажу — за это его и держат те, кто не воюет. */
export function horseCarry(character: Character): number {
  return character.equipment.horse ? HORSE_CARRY : 0
}

export function withItem(equipment: Equipment, slot: SlotId, item: EquippedItem | null): Equipment {
  const next = { ...equipment }
  if (item === null) delete next[slot]
  else next[slot] = item
  return next
}

/** Починка: сколько стоит вернуть вещь в порядок. */
export function repairCost(item: ItemDef, condition: number): number {
  return Math.max(1, Math.round((item.price * (100 - condition)) / 100 / 2))
}

/** Что продают в этом месте: по виду места и, для именных вещей, по короне. */
export function itemsSoldAt(
  archetype: LocationArchetype,
  kingdomId: string | null,
): readonly ItemDef[] {
  return ITEMS.filter(
    (item) => item.where.includes(archetype) && (!item.kingdomId || item.kingdomId === kingdomId),
  )
}
