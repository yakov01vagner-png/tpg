import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { GOALS, MILESTONE_RENOWN } from '../src/content/goals'
import { fameOf } from '../src/fame'
import {
  goalDef,
  goalOf,
  goalProgress,
  goalStepDone,
  lifeSummary,
  measureOf,
  milestonesOf,
  nextStepWords,
} from '../src/goal'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 70: ради чего.
 *
 * Песочница без цели — набор дел, из которых ни одно не главнее. Цель ничего не
 * запрещает: она называет, ради чего всё это, и по ней видно следующий шаг.
 */

const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function hero(money = 100): GameState {
  const base = createGame(createCharacter({ name: 'Т', money }), 1, world)
  return { ...base, quarter: null, time: WORLD_START }
}

describe('Ц5: двадцать целей', () => {
  it('целей двадцать, и у каждой три-четыре вехи', () => {
    expect(GOALS.length).toBe(20)
    for (const goal of GOALS) {
      expect(goal.steps.length).toBeGreaterThanOrEqual(3)
      expect(goal.steps.length).toBeLessThanOrEqual(4)
      expect(goal.about.length).toBeGreaterThan(20)
      expect(goal.says.length).toBeGreaterThan(20)
    }
    console.log(GOALS.map((one) => one.label).join(', '))
    // Вехи меряются тем, что и правда есть в состоянии.
    const state = hero()
    for (const goal of GOALS) {
      for (const step of goal.steps) {
        expect(Number.isFinite(measureOf(state, step))).toBe(true)
      }
    }
  })
})

describe('Ц1 и Ц4: цель ведёт', () => {
  it('цель выбирают, и она называет следующий шаг', () => {
    const state = hero()
    expect(goalOf(state)).toBeNull()
    expect(nextStepWords(state)).toBeNull()
    const merchant = ok(applyCommand(state, { type: 'setGoal', goalId: 'merchant' }))
    expect(goalOf(merchant)?.id).toBe('merchant')
    const progress = goalProgress(merchant)
    expect(progress?.done).toBe(0)
    console.log(
      `${progress?.goal.label}: ${progress?.steps.map((one) => `${one.step.label} — ${one.have}`).join('; ')}`,
    )
    console.log(`дальше: ${nextStepWords(merchant)}`)
    expect(nextStepWords(merchant)).toContain('из')
    // Дважды одну цель не ставят.
    expect(applyCommand(merchant, { type: 'setGoal', goalId: 'merchant' }).ok).toBe(false)
  })
})

describe('Ц2: вехи', () => {
  it('веха замечается сама, когда в мире появилось то, чем она меряется', () => {
    const rich: GameState = { ...hero(4000), goal: 'merchant' }
    const step = goalDef('merchant')?.steps[0]
    expect(step).toBeDefined()
    if (!step) return
    expect(goalStepDone(rich, step)).toBe(true)
    // Отмечается она в конце любого дела — и один раз.
    const after = ok(applyCommand(rich, { type: 'tick', minutes: 60 }))
    console.log(`вехи: ${milestonesOf(after).join(', ')}; слава ${rich.renown} → ${after.renown}`)
    expect(milestonesOf(after).length).toBeGreaterThan(0)
    expect(after.renown).toBe(rich.renown + MILESTONE_RENOWN * milestonesOf(after).length)
    const again = ok(applyCommand(after, { type: 'tick', minutes: 60 }))
    expect(milestonesOf(again)).toEqual(milestonesOf(after))
    expect(again.renown).toBe(after.renown)
  })
})

describe('Ц6: цель меняется, и мир замечает', () => {
  it('бросил одно ради другого — и прежние круги остыли', () => {
    const known: GameState = { ...hero(), goal: 'warlord', fame: { warriors: 60, folk: 30 } }
    const changed = ok(applyCommand(known, { type: 'setGoal', goalId: 'scholar' }))
    console.log(
      `воины ${fameOf(known, 'warriors')} → ${fameOf(changed, 'warriors')}, люд ${fameOf(known, 'folk')} → ${fameOf(changed, 'folk')}`,
    )
    expect(fameOf(changed, 'warriors')).toBeLessThan(fameOf(known, 'warriors'))
    expect(goalOf(changed)?.id).toBe('scholar')
    // А первый выбор ничего не стоит: терять нечего.
    const fresh = ok(applyCommand(hero(), { type: 'setGoal', goalId: 'scholar' }))
    expect(fameOf(fresh, 'church')).toBe(0)
  })
})

describe('Ц3: конец, который видно', () => {
  it('к концу жизни видно, чего ты достиг', () => {
    const nothing = lifeSummary(hero())
    expect(nothing.goal).toBeNull()
    expect(nothing.said).toContain('без цели')
    const started: GameState = { ...hero(4000), goal: 'merchant' }
    const half = lifeSummary(started)
    console.log(`${half.goal}: взято ${half.done} из ${half.total} — «${half.said}»`)
    expect(half.done).toBeGreaterThan(0)
    expect(half.total).toBe(goalDef('merchant')?.steps.length)
    // Всё взято — и это видно.
    const done: GameState = {
      ...started,
      character: { ...started.character, money: 9000 },
      fame: { traders: 80 },
    }
    const summary = lifeSummary({
      ...done,
      character: {
        ...done.character,
        skills: { ...done.character.skills, trade: { level: 50, xp: 0 } },
      },
      enterprises: [
        {
          id: 'a',
          kind: 'caravan',
          locationId: 'x',
          homeId: null,
          awayId: null,
          travel: null,
          travelTarget: null,
          invested: 100,
          managerId: null,
          cargo: {},
          earned: 0,
        },
        {
          id: 'b',
          kind: 'inn',
          locationId: 'y',
          homeId: null,
          awayId: null,
          travel: null,
          travelTarget: null,
          invested: 100,
          managerId: null,
          cargo: {},
          earned: 0,
        },
      ],
    })
    console.log(`всё взято: «${summary.said}»`)
    expect(summary.done).toBe(summary.total)
    expect(summary.said).toContain('дошёл')
  })
})
