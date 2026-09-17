import { describe, expect, it } from 'vitest'
import { MAGIC_RANKS, eligibleRank, nextRank, rankTier, unrecognizedGap } from '../src/magic'

describe('лестница рангов', () => {
  it('идёт снизу вверх без пропусков', () => {
    expect(rankTier(null)).toBe(0)
    expect(nextRank(null)).toBe('neophyte')
    expect(nextRank('neophyte')).toBe('adept')
    expect(nextRank('archon')).toBe(null)
    expect(MAGIC_RANKS.archon.tier).toBe(10)
  })

  it('право претендовать даёт навык', () => {
    expect(eligibleRank(0)).toBe(null)
    expect(eligibleRank(5)).toBe('neophyte')
    expect(eligibleRank(24)).toBe('adept')
    expect(eligibleRank(100)).toBe('archon')
  })

  it('видит самоучку: сила обгоняет титул', () => {
    // Навык тянет на Подмастерье, признан только Адептом — разрыв в две ступени.
    expect(unrecognizedGap(35, 'adept')).toBe(2)
    expect(unrecognizedGap(15, 'adept')).toBe(0)
  })
})
