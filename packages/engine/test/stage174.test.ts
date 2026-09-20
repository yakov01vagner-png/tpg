import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { SCARS } from '../src/content/scars'
import { createSettlements } from '../src/economy'
import type { Party } from '../src/party'
import { createRng } from '../src/rng'
import {
  type Hurt,
  bloodDue,
  healDays,
  hospitalAt,
  hostAfter,
  hurtOf,
  scarsRoll,
  toHospital,
  veteranSays,
  woundedFrom,
} from '../src/scars'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 174: потери, раненые и ветераны.
 *
 * Раненые возвращались в строй в тот же день: доля павших просто прибавлялась
 * обратно, и война не оставляла следа. Здесь у потерь появляется срок —
 * лазарет, выплаты семьям и разница между дружиной после войны и набранной
 * заново.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function captain(units: Record<string, number> = { spearman: 60 }): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
  const party: Party = { units, morale: 70, hungryDays: 0, gear: 0.5, veterans: 20 } as Party
  return { ...game, politics, settlements, time: WORLD_START, quarter: null, party }
}

function ok(result: ReturnType<typeof applyCommand>): GameState {
  if (!result.ok) throw new Error(result.message)
  return result.state
}

describe('Пт1 и Пт2: раненый — не убитый, но и не строевой', () => {
  it('часть павших ранена, и держащий поле подбирает своих', () => {
    const held = woundedFrom({ spearman: 20, archer: 10 }, true)
    const lost = woundedFrom({ spearman: 20, archer: 10 }, false)
    console.log(
      `из тридцати павших: за нами поле — ранено ${JSON.stringify(held)}, за ними — ${JSON.stringify(lost)}`,
    )
    expect((held.spearman ?? 0) + (held.archer ?? 0)).toBeGreaterThan(
      (lost.spearman ?? 0) + (lost.archer ?? 0),
    )
  })

  it('лечение — срок, а не бросок, и лекарь его сокращает', () => {
    expect(healDays('healer')).toBeLessThan(healDays('field'))
    expect(healDays('monastery')).toBeLessThan(healDays('field'))
    const hurt = toHospital([], { spearman: 6 }, ['Ждан', 'Фрол', 'Сила'], 100, 'field')
    console.log(`в лазарете ${hurt.length}, встанут к ${hurt[0]?.untilDay}-му дню`)
    expect(hurt).toHaveLength(6)
    // Пока срок не вышел — лежат все.
    expect(hospitalAt(hurt, 120).lying).toHaveLength(6)
    const after = hospitalAt(hurt, 100 + healDays('field') + 1)
    console.log(
      `через ${healDays('field')} сут.: встало ${after.back.length}, не встало ${after.died.length}`,
    )
    expect(after.back.length + after.died.length).toBe(6)
    expect(after.died.length).toBeGreaterThanOrEqual(0)
    // Из одного лазарета — один и тот же исход: это не кубик.
    expect(hospitalAt(hurt, 200).died.length).toBe(after.died.length)
  })

  it('после боя раненые идут в обоз, а не в строй', () => {
    const state = captain()
    const before = state.party.units.spearman ?? 0
    const fought: GameState = {
      ...state,
      battle: {
        enemy: { name: 'Разбойники', units: {}, morale: 0, fatigue: 50 },
        enemyStart: 30,
        groups: {
          vanguard: { spearman: before - 20 },
          archers: {},
          flank: {},
          reserve: {},
          mages: {},
        },
        morale: 60,
        fatigue: 40,
        round: 5,
        outcome: 'won',
        terrain: 'plains',
        log: [],
        spoils: { money: 100, prisoners: 0 },
        stake: null,
        wallBonus: 1,
        ownWalls: 1,
        strain: 0,
        foeId: null,
        duel: 'none',
        ground: 'open',
        veterans: 20,
        fallen: { spearman: 20 },
      },
    } as unknown as GameState
    const after = ok(applyCommand(fought, { type: 'battleEnd', prisoners: 'release' }))
    const hurt = hurtOf(after)
    console.log(`павших 20 → в лазарете ${hurt.length}; в строю ${after.party.units.spearman ?? 0}`)
    expect(hurt.length).toBeGreaterThan(0)
    // Главное: строй после боя не прибавился. До 1.0 семеро раненых встали бы
    // в него в тот же день.
    expect(after.party.units.spearman ?? 0).toBe(before)
    expect(after.log.map((one) => one.text).some((one) => one.includes('обозе'))).toBe(true)
  })
})

describe('Пт3–Пт6: ветеран, память о павших и счёт', () => {
  it('ветеран виден числами и словами', () => {
    const green = captain({ spearman: 60 })
    const hardened: GameState = { ...green, party: { ...green.party, veterans: 55 } }
    console.log(veteranSays(green, 1))
    console.log(veteranSays(hardened, 1))
    expect(veteranSays(hardened, 1)).toContain('три войны')
    expect(SCARS.veteranWars).toBe(3)
  })

  it('за павших платят семьям, и это помнится', () => {
    const state: GameState = {
      ...captain(),
      graves: [
        { name: 'Ждан', troop: 'spearman', day: 10, where: null, how: 'fell' },
        { name: 'Фрол', troop: 'archer', day: 10, where: null, how: 'fell' },
      ],
    }
    const due = bloodDue(state, 20)
    console.log(due.says)
    expect(due.fallen).toBe(2)
    expect(due.due).toBe(2 * SCARS.bloodMoney)
    const paid = ok(applyCommand(state, { type: 'payBlood' }))
    console.log(bloodDue(paid, 20).says)
    expect(paid.bloodPaid).toBe(due.due)
    expect(paid.character.money).toBe(state.character.money - due.due)
    expect(bloodDue(paid, 20).says).toContain('заплачено семьям')
  })

  it('через год после войны от дружины остаётся не то, что вышло', () => {
    const state: GameState = {
      ...captain({ spearman: 30 }),
      hurt: toHospital([], { spearman: 12 }, [], 100, 'field') as readonly Hurt[],
      graves: Array.from({ length: 18 }, (_, i) => ({
        name: `Павший ${i}`,
        troop: 'spearman',
        day: 100,
        where: null,
        how: 'fell' as const,
      })),
    }
    const after = hostAfter(state, world, 120)
    console.log(after.says)
    const rolled = scarsRoll(state, 120)
    console.log(rolled.says)
    expect(after.men).toBe(30)
    expect(after.lying).toBe(12)
    expect(rolled.fell).toBe(18)
    expect(rolled.hurt).toBe(12)
  })
})
