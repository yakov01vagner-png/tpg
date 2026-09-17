import { describe, expect, it } from 'vitest'
import {
  EMPTY_SKILL,
  PROGRESSION,
  applyCharacterXp,
  applySkillXp,
  attributePace,
  characterXpToNext,
  skillXpToNext,
  softCap,
  softCapFactor,
} from '../src/progression'

describe('кривая навыка', () => {
  it('каждый следующий уровень дороже предыдущего', () => {
    for (let level = 0; level < 50; level += 1) {
      expect(skillXpToNext(level + 1)).toBeGreaterThan(skillXpToNext(level))
    }
  })

  it('на пределе шкалы расти больше некуда', () => {
    expect(skillXpToNext(PROGRESSION.skillMax)).toBe(Number.POSITIVE_INFINITY)
    const maxed = applySkillXp({ level: PROGRESSION.skillMax, xp: 0 }, 10_000, 10)
    expect(maxed.progress.level).toBe(PROGRESSION.skillMax)
    expect(maxed.levelsGained).toBe(0)
  })
})

describe('влияние атрибута', () => {
  it('высокий атрибут учится быстрее', () => {
    expect(attributePace(8)).toBeGreaterThan(attributePace(3))
  })

  it('низкий атрибут учится медленнее, но учится', () => {
    const weak = applySkillXp(EMPTY_SKILL, 200, 1)
    const strong = applySkillXp(EMPTY_SKILL, 200, 8)
    expect(weak.appliedXp).toBeGreaterThan(0)
    expect(strong.appliedXp).toBeGreaterThan(weak.appliedXp)
    expect(strong.progress.level).toBeGreaterThan(weak.progress.level)
  })
})

describe('мягкий потолок', () => {
  it('до потолка штрафа нет', () => {
    expect(softCap(4)).toBe(40)
    expect(softCapFactor(40, 4)).toBe(1)
  })

  it('выше потолка растёт медленнее, но не встаёт намертво', () => {
    const factor = softCapFactor(50, 4)
    expect(factor).toBeLessThan(1)
    expect(factor).toBeGreaterThan(0)
    const gain = applySkillXp({ level: 50, xp: 0 }, 500, 4)
    expect(gain.appliedXp).toBeGreaterThan(0)
  })

  it('штраф не падает ниже пола: стена всегда проходима', () => {
    expect(softCapFactor(1000, 1)).toBe(PROGRESSION.softCapFloor)
  })
})

describe('уровень персонажа', () => {
  it('даёт очко навыка за уровень и очко атрибута каждый третий', () => {
    const needed = characterXpToNext(1) + characterXpToNext(2) + characterXpToNext(3)
    const result = applyCharacterXp(1, 0, needed)
    expect(result.level).toBe(4)
    expect(result.levelsGained).toBe(3)
    expect(result.skillPointsGained).toBe(3)
    expect(result.attributePointsGained).toBe(1)
  })

  it('не выдаёт уровень авансом', () => {
    const result = applyCharacterXp(1, 0, characterXpToNext(1) - 1)
    expect(result.level).toBe(1)
    expect(result.skillPointsGained).toBe(0)
  })
})
