import type { AttributeId } from './attributes'

/**
 * Навыки и их привязка к атрибутам (п.6.1 дизайн-документа, черновик).
 * Таблица может измениться — код нигде не должен предполагать конкретный
 * состав, только то, что у навыка есть attribute.
 */
export const SKILL_IDS = [
  'heavyWeapons',
  'hardLabour',
  'lightWeapons',
  'archery',
  'sleight',
  'athletics',
  'riding',
  'survival',
  'magic',
  'scholarship',
  'healing',
  'engineering',
  'concentration',
  'fortitude',
  'trade',
  'persuasion',
  'command',
] as const

export type SkillId = (typeof SKILL_IDS)[number]

export interface SkillDef {
  readonly id: SkillId
  readonly label: string
  readonly attribute: AttributeId
}

export const SKILLS: Record<SkillId, SkillDef> = {
  heavyWeapons: { id: 'heavyWeapons', label: 'Тяжёлое оружие', attribute: 'strength' },
  hardLabour: { id: 'hardLabour', label: 'Тяжёлый труд', attribute: 'strength' },
  lightWeapons: { id: 'lightWeapons', label: 'Лёгкое оружие', attribute: 'agility' },
  archery: { id: 'archery', label: 'Стрельба', attribute: 'agility' },
  sleight: { id: 'sleight', label: 'Ловкость рук', attribute: 'agility' },
  athletics: { id: 'athletics', label: 'Атлетика', attribute: 'endurance' },
  riding: { id: 'riding', label: 'Верховая езда', attribute: 'endurance' },
  survival: { id: 'survival', label: 'Выживание', attribute: 'endurance' },
  magic: { id: 'magic', label: 'Магия', attribute: 'mind' },
  scholarship: { id: 'scholarship', label: 'Учёность', attribute: 'mind' },
  healing: { id: 'healing', label: 'Врачевание', attribute: 'mind' },
  engineering: { id: 'engineering', label: 'Инженерия', attribute: 'mind' },
  concentration: { id: 'concentration', label: 'Концентрация', attribute: 'will' },
  fortitude: { id: 'fortitude', label: 'Стойкость', attribute: 'will' },
  trade: { id: 'trade', label: 'Торговля', attribute: 'charisma' },
  persuasion: { id: 'persuasion', label: 'Убеждение', attribute: 'charisma' },
  command: { id: 'command', label: 'Командование', attribute: 'charisma' },
}

export function isSkillId(value: string): value is SkillId {
  return value in SKILLS
}

export function skillsOfAttribute(attribute: AttributeId): readonly SkillDef[] {
  return SKILL_IDS.map((id) => SKILLS[id]).filter((skill) => skill.attribute === attribute)
}
