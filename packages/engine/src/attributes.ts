/**
 * Атрибуты — шесть широких характеристик (п.6 дизайн-документа).
 * Меняются редко и дорого, задают скорость роста и мягкий потолок навыков.
 */
export const ATTRIBUTE_IDS = [
  'strength',
  'agility',
  'endurance',
  'mind',
  'will',
  'charisma',
] as const

export type AttributeId = (typeof ATTRIBUTE_IDS)[number]

export type Attributes = Record<AttributeId, number>

export const ATTRIBUTE_LABELS: Record<AttributeId, string> = {
  strength: 'Сила',
  agility: 'Ловкость',
  endurance: 'Выносливость',
  mind: 'Разум',
  will: 'Воля',
  charisma: 'Обаяние',
}

export const ATTRIBUTE_MIN = 1
export const ATTRIBUTE_MAX = 10

/** Отправная точка: середина шкалы по всем шести. Биография сдвигает её. */
export function baseAttributes(value = 3): Attributes {
  return {
    strength: value,
    agility: value,
    endurance: value,
    mind: value,
    will: value,
    charisma: value,
  }
}

export function clampAttribute(value: number): number {
  return Math.min(ATTRIBUTE_MAX, Math.max(ATTRIBUTE_MIN, Math.round(value)))
}

export function isAttributeId(value: string): value is AttributeId {
  return (ATTRIBUTE_IDS as readonly string[]).includes(value)
}
