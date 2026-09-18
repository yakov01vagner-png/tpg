import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { createRng } from '../src/rng'
import { defeatOutcome, healWound, woundedAttributes } from '../src/wounds'

describe('раны и плен', () => {
  it('поражение — чаще рана, реже плен, и лишь иногда смерть', () => {
    const tally = { wounded: 0, captured: 0, killed: 0 }
    let rng = createRng(1)
    for (let i = 0; i < 600; i += 1) {
      const [outcome, next] = defeatOutcome(rng, 'lord:x', 100, 0)
      rng = next
      tally[outcome.type] += 1
    }
    console.log(
      `из 600 поражений: ранен ${tally.wounded}, в плену ${tally.captured}, убит ${tally.killed}`,
    )
    expect(tally.wounded).toBeGreaterThan(tally.captured)
    expect(tally.captured).toBeGreaterThan(tally.killed)
    // Смерть остаётся настоящей: не ноль.
    expect(tally.killed).toBeGreaterThan(0)
  })

  it('рана ослабляет тело и заживает; лекарь ускоряет', () => {
    const hero = createCharacter({ name: 'Вит', attributes: { strength: 6, agility: 6 } })
    const wound = { daysLeft: 30, severity: 1 }
    const weak = woundedAttributes(hero.attributes, wound)
    expect(weak.strength).toBeLessThan(hero.attributes.strength)
    expect(weak.mind).toBe(hero.attributes.mind)
    expect(healWound(wound, 10, false)?.daysLeft).toBe(20)
    expect(healWound(wound, 10, true)?.daysLeft).toBe(10)
    expect(healWound(wound, 30, false)).toBeNull()
  })

  it('стойкий встаёт раньше', () => {
    let short = 0
    let long = 0
    let rng = createRng(3)
    for (let i = 0; i < 200; i += 1) {
      const [a, r1] = defeatOutcome(rng, 'x', 0, 8)
      const [b, r2] = defeatOutcome(r1, 'x', 0, 0)
      rng = r2
      if (a.type === 'wounded') short += a.wound.daysLeft
      if (b.type === 'wounded') long += b.wound.daysLeft
    }
    expect(short).toBeLessThan(long)
  })
})
