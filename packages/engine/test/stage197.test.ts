import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { CROWN_RULES } from '../src/content/reasons'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { chainOf, planOf, reasonRoll, reasonSeen, refusalsOf, ruleOf } from '../src/reasons'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, WORLD_START } from '../src/time'
import { createPolitics, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 197: решение, которое объясняется.
 *
 * Строка «почему» была при решении с самого начала — но писалась рядом с ним, а
 * не была им.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const crowns = Object.keys(world.kingdoms).filter((one) => one !== PLAYER)
const them = crowns[0] as string

function ruler(over = politics, places = settlements): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 20000 }), 1, world)
  return { ...game, politics: over, settlements: places, time: WORLD_START }
}

describe('Рш1, Рш4: у хода есть правило, и оно то же, по которому он сделан', () => {
  it('правило называется вместе с ходом', () => {
    const rule = ruleOf(ruler(), world, them, 1)
    console.log(rule.says)
    expect(CROWN_RULES).toContain(rule.id)
    expect(rule.fired).toBe(true)
    expect(rule.says).toContain('—')
  })

  it('объяснение и решение сходятся на всяком дне века', () => {
    // Век мира прогоняется тактом, и на каждом пятилетии правило сверяется с
    // тем, что вернул `plans.ts`: разойдись они хоть раз — объяснение врёт.
    let over = politics
    let places = settlements
    let rng = createRng(5)
    let checked = 0
    for (let era = 1; era <= 20; era += 1) {
      const day = era * 5 * DAYS_PER_YEAR
      const ticked = tickPolitics(world, over, places, day, rng)
      over = ticked.politics
      places = ticked.settlements
      rng = ticked.rng
      const state = ruler(over, places)
      for (const id of crowns) {
        const rule = ruleOf(state, world, id, day)
        const plan = planOf(state, world, id)
        expect(rule.want).toBe(plan.want)
        expect(rule.targetId).toBe(plan.targetId)
        checked += 1
      }
    }
    console.log(`сверено решений: ${checked}`)
    expect(checked).toBe(20 * crowns.length)
  })
})

describe('Рш2–Рш3: шаг долгой партии и объяснённый отказ', () => {
  it('ход — часть партии, и партия названа', () => {
    const chain = chainOf(ruler(), world, them, 1)
    console.log(chain.says)
    expect(chain.says).toContain('Сегодняшний ход')
    expect(chain.next.length).toBeGreaterThan(0)
  })

  it('не сделанное объясняется так же, как сделанное', () => {
    const rows = refusalsOf(ruler(), world, them, 1)
    for (const one of rows) console.log(one)
    expect(rows.length).toBe(CROWN_RULES.length - 1)
    expect(rows.every((one) => one.startsWith('не '))).toBe(true)
    // Почему не пошёл войной — сказано числом и положением, а не молчанием.
    expect(rows.some((one) => one.includes('вырос') || one.includes('война'))).toBe(true)
  })
})

describe('Рш5–Рш6: сквозь знание и в числах', () => {
  it('без соглядатая видно сделанное, а не череду за ним', () => {
    const blind = reasonSeen(ruler(), world, them, 1)
    console.log(blind.says)
    expect(blind.can).toBe(false)
    expect(blind.says).toContain('догадка')
    const seeing: GameState = {
      ...ruler(),
      residents: [{ id: 'r1', at: them, sinceDay: 1, name: 'Гостята', skill: 40, bought: false }],
    }
    const open = reasonSeen(seeing, world, them, 1)
    console.log(open.says)
    expect(open.can).toBe(true)
    expect(open.says.length).toBeGreaterThan(blind.says.length)
  })

  it('решения в числах', () => {
    const rolled = reasonRoll(ruler(), world, 1)
    console.log(rolled.says)
    expect(Object.values(rolled.byRule).reduce((sum, one) => sum + one, 0)).toBe(crowns.length)
    expect(rolled.wrong).toBe(0)
  })
})
