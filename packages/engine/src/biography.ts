import type { AttributeId, Attributes } from './attributes'
import { ATTRIBUTE_IDS, baseAttributes } from './attributes'
import type { CharacterDraft } from './character'
import type { SkillId } from './skills'

/**
 * Биография — это создание персонажа (DESIGN.md, п.6).
 *
 * Ветвление сделано тегами, а не деревом: вариант объявляет, какие теги он
 * выдаёт и какие требует, а не кто был его родителем. Поэтому ветки пересекаются
 * бесплатно — к чистке конюшен можно прийти и от сына лорда, и от деревенского,
 * и это будут разные персонажи, потому что теги происхождения остаются.
 */

export interface BiographyEffects {
  /** Прибавки к атрибутам, а не абсолютные значения. */
  readonly attributes?: Partial<Attributes>
  /** Прибавки к уровням навыков. */
  readonly skills?: Partial<Record<SkillId, number>>
  readonly money?: number
  readonly tags?: readonly string[]
}

export interface BiographyOption {
  readonly id: string
  readonly label: string
  /** Строка для экрана: что это значило для персонажа. */
  readonly text: string
  /** Нужны все перечисленные теги. */
  readonly requires?: readonly string[]
  /** Нужен хотя бы один из перечисленных. */
  readonly requiresAny?: readonly string[]
  /** Не должно быть ни одного из перечисленных. */
  readonly excludes?: readonly string[]
  readonly effects: BiographyEffects
}

export interface BiographyStage {
  readonly id: string
  readonly label: string
  readonly question: string
  readonly options: readonly BiographyOption[]
}

/** Готовый набор ответов для быстрого старта. */
export interface BiographyTemplate {
  readonly id: string
  readonly label: string
  readonly description: string
  /** По одному id варианта на каждый этап, в порядке этапов. */
  readonly optionIds: readonly string[]
}

export interface Biography {
  readonly stages: readonly BiographyStage[]
  readonly templates: readonly BiographyTemplate[]
}

export function isOptionAvailable(option: BiographyOption, tags: readonly string[]): boolean {
  if (option.requires?.some((tag) => !tags.includes(tag))) return false
  if (option.excludes?.some((tag) => tags.includes(tag))) return false
  if (option.requiresAny && !option.requiresAny.some((tag) => tags.includes(tag))) return false
  return true
}

/** Варианты этапа, доступные с уже накопленными тегами. */
export function availableOptions(
  stage: BiographyStage,
  tags: readonly string[],
): readonly BiographyOption[] {
  return stage.options.filter((option) => isOptionAvailable(option, tags))
}

/**
 * Состояние прохождения биографии. Хранит только выбранные id — всё остальное
 * (теги, черновик персонажа) выводится из них, чтобы не было двух источников правды.
 */
export interface BiographyProgress {
  readonly optionIds: readonly string[]
  readonly tags: readonly string[]
  /** Этап, на котором сейчас стоит игрок, или null если биография пройдена. */
  readonly stage: BiographyStage | null
  readonly options: readonly BiographyOption[]
  readonly done: boolean
}

export function progressOf(biography: Biography, optionIds: readonly string[]): BiographyProgress {
  const tags: string[] = []
  for (let i = 0; i < optionIds.length; i += 1) {
    const stage = biography.stages[i]
    const option = stage?.options.find((candidate) => candidate.id === optionIds[i])
    if (option) tags.push(...(option.effects.tags ?? []))
  }
  const stage = biography.stages[optionIds.length] ?? null
  return {
    optionIds,
    tags,
    stage,
    options: stage ? availableOptions(stage, tags) : [],
    done: stage === null,
  }
}

export type BiographyResult =
  | { readonly ok: true; readonly draft: CharacterDraft }
  | { readonly ok: false; readonly error: string }

/**
 * Собрать черновик персонажа из пройденной биографии.
 * Отказывает, если ответов не столько, сколько этапов, или если выбранный
 * вариант недоступен с накопленными тегами.
 */
export function buildCharacterDraft(
  name: string,
  optionIds: readonly string[],
  biography: Biography,
): BiographyResult {
  if (optionIds.length !== biography.stages.length) {
    return {
      ok: false,
      error: `Биография не пройдена: выбрано ${optionIds.length} из ${biography.stages.length}.`,
    }
  }

  const attributes: Attributes = baseAttributes()
  const skills: Partial<Record<SkillId, number>> = {}
  const tags: string[] = []
  let money = 0

  for (const [index, stage] of biography.stages.entries()) {
    const optionId = optionIds[index]
    const option = stage.options.find((candidate) => candidate.id === optionId)
    if (!option) {
      return { ok: false, error: `На этапе «${stage.label}» нет варианта «${optionId}».` }
    }
    if (!isOptionAvailable(option, tags)) {
      return {
        ok: false,
        error: `Вариант «${option.label}» недоступен с такой биографией.`,
      }
    }
    const effects = option.effects
    for (const attribute of ATTRIBUTE_IDS) {
      attributes[attribute] += effects.attributes?.[attribute] ?? 0
    }
    for (const [skill, bonus] of Object.entries(effects.skills ?? {})) {
      const id = skill as SkillId
      skills[id] = (skills[id] ?? 0) + (bonus ?? 0)
    }
    money += effects.money ?? 0
    for (const tag of effects.tags ?? []) if (!tags.includes(tag)) tags.push(tag)
  }

  return { ok: true, draft: { name, attributes, skills, money, tags } }
}

/** Развернуть шаблон быстрого старта в обычный набор ответов. */
export function templateOptionIds(
  biography: Biography,
  templateId: string,
): readonly string[] | null {
  return biography.templates.find((template) => template.id === templateId)?.optionIds ?? null
}
