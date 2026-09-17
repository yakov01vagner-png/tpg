import type { AttributeId, Attributes } from './attributes'
import { baseAttributes, clampAttribute } from './attributes'
import type { Equipment } from './content/equipment'
import type { GoodId } from './content/goods'
import { GOODS } from './content/goods'
import type { MagicRankId } from './magic'
import type { SkillProgress } from './progression'
import { EMPTY_SKILL } from './progression'
import type { SkillId } from './skills'
import { SKILLS, SKILL_IDS } from './skills'

export interface Character {
  readonly name: string
  readonly attributes: Attributes
  readonly skills: Readonly<Record<SkillId, SkillProgress>>
  readonly level: number
  readonly xp: number
  readonly unspentSkillPoints: number
  readonly unspentAttributePoints: number
  readonly money: number
  /** Усталость 0..100. Не даёт работать круглые сутки. */
  readonly fatigue: number
  /** Признанный магический ранг. Может отставать от навыка — см. magic.ts. */
  readonly magicRank: MagicRankId | null
  /** Теги биографии: остаются с персонажем навсегда, их читают другие системы. */
  readonly tags: readonly string[]
  /** Что несёшь на себе. Отсутствие товара в списке означает ноль. */
  readonly inventory: Readonly<Partial<Record<GoodId, number>>>
  /** Что надето: оружие, щит, доспех, шлем, конь. */
  readonly equipment: Equipment
}

export const FATIGUE_MAX = 100

export interface CharacterDraft {
  readonly name: string
  readonly attributes?: Partial<Attributes>
  readonly skills?: Partial<Record<SkillId, number>>
  readonly money?: number
  readonly tags?: readonly string[]
}

export function emptySkills(): Record<SkillId, SkillProgress> {
  const skills = {} as Record<SkillId, SkillProgress>
  for (const id of SKILL_IDS) skills[id] = EMPTY_SKILL
  return skills
}

/**
 * Собрать персонажа из черновика создания.
 * Черновик — это то, что выдаёт биография (п.6): атрибуты, навыки, деньги, теги.
 */
export function createCharacter(draft: CharacterDraft): Character {
  const attributes = { ...baseAttributes() }
  for (const [id, value] of Object.entries(draft.attributes ?? {})) {
    attributes[id as AttributeId] = clampAttribute(value)
  }
  const skills = emptySkills()
  for (const [id, level] of Object.entries(draft.skills ?? {})) {
    skills[id as SkillId] = { level: Math.max(0, Math.round(level)), xp: 0 }
  }
  return {
    name: draft.name,
    attributes,
    skills,
    level: 1,
    xp: 0,
    unspentSkillPoints: 0,
    unspentAttributePoints: 0,
    money: draft.money ?? 0,
    fatigue: 0,
    magicRank: null,
    tags: [...(draft.tags ?? [])],
    inventory: {},
    equipment: {},
  }
}

export function skillLevel(character: Character, skill: SkillId): number {
  return character.skills[skill].level
}

/** Атрибут, от которого зависит рост навыка. */
export function attributeForSkill(character: Character, skill: SkillId): number {
  return character.attributes[SKILLS[skill].attribute]
}

export function hasTag(character: Character, tag: string): boolean {
  return character.tags.includes(tag)
}

export function carried(character: Character, good: GoodId): number {
  return character.inventory[good] ?? 0
}

/** Сколько всего весит поклажа. */
export function carriedWeight(character: Character): number {
  let weight = 0
  for (const [good, amount] of Object.entries(character.inventory)) {
    weight += GOODS[good as GoodId].weight * (amount ?? 0)
  }
  return Math.round(weight * 10) / 10
}

/**
 * Сколько можно унести на себе. Пока только на себе: вьючные животные и телеги —
 * отдельный разговор, и он не про этот блок.
 */
export function carryCapacity(character: Character): number {
  return Math.round(15 + character.attributes.strength * 5 + character.skills.athletics.level * 0.3)
}

/**
 * Множитель эффективности от усталости: со свежей головой учишься вдвое лучше,
 * чем вымотанным. Жёсткого запрета нет, но смысл работать на износ теряется.
 */
export function fatigueFactor(fatigue: number): number {
  const ratio = Math.min(1, Math.max(0, fatigue / FATIGUE_MAX))
  return 1 - 0.5 * ratio
}
