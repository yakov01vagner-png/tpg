import { describe, expect, it } from 'vitest'
import { createCharacter, skillLevel } from '../src/character'
import { applyCommand } from '../src/commands'
import { GROWTH } from '../src/content/growth'
import { PATHS } from '../src/content/paths'
import { agedAttributes } from '../src/dynasty'
import { createSettlements } from '../src/economy'
import {
  ageSays,
  attributePointSays,
  hoursLeft,
  rustOf,
  skillCeiling,
  xpToLevel,
  yearsBy,
} from '../src/growth'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 125: потолки, возраст и цена роста.
 *
 * Мягкий потолок был всегда, но невидимый: игрок замечал, что растёт медленнее,
 * и не знал почему. Здесь стена названа числом, у возраста есть голос, а у
 * брошенного навыка — ржавчина.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function hero(skills: Record<string, number> = {}, attributes: Record<string, number> = {}) {
  return createCharacter({
    name: 'Ратша',
    money: 20000,
    skills: skills as never,
    attributes: attributes as never,
  })
}

describe('Ц1: мягкий потолок виден', () => {
  it('названо, что именно тебя держит и во что обходится идти дальше', () => {
    const low = hero({ trade: 20 }, { charisma: 3 })
    const high = hero({ trade: 40 }, { charisma: 3 })
    console.log(skillCeiling(low, 'trade').says)
    console.log(skillCeiling(high, 'trade').says)
    expect(skillCeiling(low, 'trade').cap).toBe(30)
    expect(skillCeiling(high, 'trade').slowedTo).toBeLessThan(1)

    const strong = hero({ trade: 40 }, { charisma: 8 })
    console.log(skillCeiling(strong, 'trade').says)
    expect(skillCeiling(strong, 'trade').cap).toBeGreaterThan(skillCeiling(high, 'trade').cap)
  })
})

describe('Ц2: возраст', () => {
  it('тело сдаёт, голова — нет', () => {
    for (const age of [30, 45, 65]) {
      console.log(ageSays(age))
    }
    const young = hero({}, { strength: 8, mind: 8 })
    const old = agedAttributes(young.attributes, 65)
    console.log(
      `в 65 лет: сила ${young.attributes.strength} → ${old.strength}, разум ${young.attributes.mind} → ${old.mind}`,
    )
    expect(old.strength).toBeLessThan(young.attributes.strength)
    expect(old.mind).toBe(young.attributes.mind)
    expect(GROWTH.bodyHard).toBeGreaterThan(GROWTH.bodyFrom)
  })
})

describe('Ц3: время государя', () => {
  it('учиться — значит не править', () => {
    for (const matters of [0, 1, 3]) {
      console.log(hoursLeft(matters).says)
    }
    expect(hoursLeft(3).hours).toBeLessThan(hoursLeft(0).hours)
  })
})

describe('Ц4: забывается', () => {
  it('брошенный навык оседает — не до нуля и не быстро', () => {
    const level = 40
    for (const years of [1, 3, 6, 30]) {
      const rusted = rustOf(level, day, day + Math.round(years * 365))
      console.log(`через ${years} лет без дела: ${level} → ${rusted.level} — ${rusted.says}`)
    }
    expect(rustOf(level, day, day + 365).lost).toBe(0)
    expect(rustOf(level, day, day + 365 * 6).lost).toBeGreaterThan(0)
    // Ниже половины не оседает: руки помнят.
    expect(rustOf(level, day, day + 365 * 60).level).toBe(Math.round(level * GROWTH.rustFloor))
  })

  it('и это происходит в игре само', () => {
    const game = createGame(hero({ archery: 30 }), 1, world)
    const mine = Object.values(settlements)
      .filter((one) => one.population > 900)
      .slice(0, 2)
    const map = { ...settlements }
    for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
    const state: GameState = {
      ...game,
      politics,
      settlements: map,
      locationId: mine[0]?.locationId ?? game.locationId,
      quarter: null,
      time: WORLD_START + (day - 1) * 24 * 60,
      realm: { name: 'Заречье', sinceDay: 1 },
      usedDay: { archery: day - 365 * 6 },
    }
    const before = skillLevel(state.character, 'archery')
    let later = state
    for (let step = 0; step < GROWTH.rustBeat + 2; step += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    console.log(later.log.find((one) => one.text.includes('оседает'))?.text ?? 'ещё не осело')
    console.log(`стрельба ${before} → ${skillLevel(later.character, 'archery')}`)
    expect(skillLevel(later.character, 'archery')).toBeLessThan(before)
  })
})

describe('Ц5 и Ц6: цена очка и кривая', () => {
  it('очко атрибута названо ценой, а не кнопкой', () => {
    console.log(attributePointSays(7))
    console.log(attributePointSays(9))
    expect(attributePointSays(7)).toContain('через')
  })

  it('за сколько лет каждый путь доводит навык до 40 и до 70', () => {
    console.log(`опыта до 40: ${xpToLevel(40)}, до 70: ${xpToLevel(70)} (при атрибуте 5)`)
    for (const path of PATHS) {
      const to40 = yearsBy(path, 40)
      const to70 = yearsBy(path, 70)
      console.log(
        `${path}: до 40 — ${Number.isFinite(to40) ? `${to40} лет` : 'не доводит'}; до 70 — ${Number.isFinite(to70) ? `${to70} лет` : 'не доводит'}`,
      )
    }
    // Книга не доводит ни до 40 при потолке 50? Доводит — а до 70 нет.
    expect(Number.isFinite(yearsBy('book', 40))).toBe(true)
    expect(Number.isFinite(yearsBy('book', 70))).toBe(false)
    expect(yearsBy('doing', 40)).toBeGreaterThan(yearsBy('teacher', 40))
    expect(xpToLevel(70)).toBeGreaterThan(xpToLevel(40) * 2)
  })
})
