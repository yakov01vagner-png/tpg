/**
 * Математика роста: навыки, уровни, влияние атрибутов.
 *
 * Все константы собраны в PROGRESSION и передаются в функции параметром, чтобы
 * баланс можно было крутить и тестировать, не переписывая логику. Числа — это
 * первая прикидка, а не утверждённый баланс.
 */

export interface SkillProgress {
  readonly level: number
  readonly xp: number
}

export interface ProgressionConfig {
  /** Потолок шкалы навыка. */
  readonly skillMax: number
  /** База и показатель кривой стоимости следующего уровня навыка. */
  readonly skillXpBase: number
  readonly skillXpExponent: number
  /** Влияние атрибута на скорость: множитель = base + attribute * perPoint. */
  readonly attributePaceBase: number
  readonly attributePacePerPoint: number
  /** Мягкий потолок: сколько уровней навыка «обеспечивает» одно очко атрибута. */
  readonly softCapPerAttributePoint: number
  /** Насколько падает скорость за каждый уровень выше мягкого потолка. */
  readonly softCapPenaltyPerLevel: number
  /** Ниже этого множитель не опускается: стена всегда проходима, вопрос цены. */
  readonly softCapFloor: number
  /** Опыт персонажа за поднятый уровень навыка. */
  readonly characterXpPerSkillLevel: number
  /** База и показатель кривой уровня персонажа. */
  readonly characterXpBase: number
  readonly characterXpExponent: number
  /** Раз во сколько уровней дают очко атрибута. */
  readonly attributePointEveryLevels: number
}

export const PROGRESSION: ProgressionConfig = {
  skillMax: 100,
  skillXpBase: 10,
  skillXpExponent: 2,
  attributePaceBase: 0.5,
  attributePacePerPoint: 0.15,
  softCapPerAttributePoint: 10,
  softCapPenaltyPerLevel: 0.03,
  softCapFloor: 0.15,
  characterXpPerSkillLevel: 10,
  characterXpBase: 60,
  characterXpExponent: 1.3,
  attributePointEveryLevels: 3,
}

export const EMPTY_SKILL: SkillProgress = { level: 0, xp: 0 }

/** Сколько опыта нужно, чтобы уйти с текущего уровня навыка на следующий. */
export function skillXpToNext(level: number, config: ProgressionConfig = PROGRESSION): number {
  if (level >= config.skillMax) return Number.POSITIVE_INFINITY
  return Math.round(config.skillXpBase * (1 + level / 10) ** config.skillXpExponent)
}

/** Множитель скорости от атрибута: слабый атрибут учится медленно, но учится. */
export function attributePace(attribute: number, config: ProgressionConfig = PROGRESSION): number {
  return config.attributePaceBase + attribute * config.attributePacePerPoint
}

/** Уровень навыка, до которого атрибут «тянет» без штрафа. */
export function softCap(attribute: number, config: ProgressionConfig = PROGRESSION): number {
  return attribute * config.softCapPerAttributePoint
}

/**
 * Множитель за выход выше мягкого потолка.
 *
 * Жёсткого запрета нет (п.4: «стена всегда преодолима, вопрос цены») — просто
 * каждый уровень сверх потолка обходится дороже, пока не упрёшься в пол.
 */
export function softCapFactor(
  level: number,
  attribute: number,
  config: ProgressionConfig = PROGRESSION,
): number {
  const cap = softCap(attribute, config)
  if (level <= cap) return 1
  return Math.max(config.softCapFloor, 1 - (level - cap) * config.softCapPenaltyPerLevel)
}

/** Сырой опыт практики, пропущенный через атрибут и мягкий потолок. */
export function effectiveSkillXp(
  rawXp: number,
  level: number,
  attribute: number,
  config: ProgressionConfig = PROGRESSION,
): number {
  return rawXp * attributePace(attribute, config) * softCapFactor(level, attribute, config)
}

export interface SkillGain {
  readonly progress: SkillProgress
  readonly levelsGained: number
  readonly appliedXp: number
}

/** Начислить навыку опыт и поднять уровни, которые он закрыл. */
export function applySkillXp(
  progress: SkillProgress,
  rawXp: number,
  attribute: number,
  config: ProgressionConfig = PROGRESSION,
): SkillGain {
  if (rawXp <= 0 || progress.level >= config.skillMax) {
    return { progress, levelsGained: 0, appliedXp: 0 }
  }
  const applied = effectiveSkillXp(rawXp, progress.level, attribute, config)
  let level = progress.level
  let xp = progress.xp + applied
  let levelsGained = 0
  for (;;) {
    const needed = skillXpToNext(level, config)
    if (!Number.isFinite(needed) || xp < needed) break
    xp -= needed
    level += 1
    levelsGained += 1
  }
  if (level >= config.skillMax) xp = 0
  return {
    progress: { level, xp: round2(xp) },
    levelsGained,
    appliedXp: round2(applied),
  }
}

/** Сколько опыта персонажу до следующего уровня. */
export function characterXpToNext(level: number, config: ProgressionConfig = PROGRESSION): number {
  return Math.round(config.characterXpBase * level ** config.characterXpExponent)
}

export interface LevelUpResult {
  readonly level: number
  readonly xp: number
  readonly levelsGained: number
  readonly skillPointsGained: number
  readonly attributePointsGained: number
}

/**
 * Начислить опыт персонажу.
 * Каждый уровень даёт очко навыка, каждый третий — ещё и очко атрибута.
 */
export function applyCharacterXp(
  level: number,
  xp: number,
  gainedXp: number,
  config: ProgressionConfig = PROGRESSION,
): LevelUpResult {
  let nextLevel = level
  let nextXp = xp + gainedXp
  let levelsGained = 0
  let attributePointsGained = 0
  for (;;) {
    const needed = characterXpToNext(nextLevel, config)
    if (nextXp < needed) break
    nextXp -= needed
    nextLevel += 1
    levelsGained += 1
    if (nextLevel % config.attributePointEveryLevels === 0) attributePointsGained += 1
  }
  return {
    level: nextLevel,
    xp: round2(nextXp),
    levelsGained,
    skillPointsGained: levelsGained,
    attributePointsGained,
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
