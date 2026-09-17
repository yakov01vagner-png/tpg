import { describe, expect, it } from 'vitest'
import type { Character } from '../src/character'
import { createCharacter } from '../src/character'
import { type Command, applyCommand, canApply } from '../src/commands'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { dayOf } from '../src/time'

/**
 * Прогон баланса.
 *
 * Играет за разумного игрока: стратегия задаёт список дел по убыванию
 * желанности, а выполняется первое, которое движок сейчас разрешает. Это ловит
 * и расписание, и деньги, и усталость, не превращая тест в копию игры.
 *
 * Меряем не корректность, а темп: если правка констант удлинит или укоротит
 * путь вдвое, тест это покажет числом.
 */
interface Strategy {
  readonly name: string
  readonly goal: (state: GameState) => boolean
  readonly plan: (state: GameState) => readonly Command[]
}

const skill = (state: GameState, id: keyof Character['skills']) => state.character.skills[id].level

const MAGE: Strategy = {
  name: 'маг',
  goal: (state) => state.character.magicRank === 'adept',
  plan: (state) => {
    const plan: Command[] = []
    if (skill(state, 'scholarship') < 8) plan.push({ type: 'study', courseId: 'lettersBasics' })
    if (skill(state, 'concentration') < 10) plan.push({ type: 'study', courseId: 'meditation' })
    if (state.character.magicRank === null && skill(state, 'magic') >= 5) {
      plan.push({ type: 'takeExam', examId: 'examNeophyte' })
    }
    if (state.character.magicRank === 'neophyte' && skill(state, 'magic') >= 15) {
      plan.push({ type: 'takeExam', examId: 'examAdept' })
    }
    plan.push({ type: 'study', courseId: 'magicIntro' })
    plan.push({ type: 'work', jobId: 'serveAtSchool' })
    plan.push({ type: 'work', jobId: 'copyPapers' })
    plan.push({ type: 'work', jobId: 'unloadCarts' })
    return plan
  },
}

const WARRIOR: Strategy = {
  name: 'воин',
  goal: (state) => skill(state, 'lightWeapons') >= 30,
  plan: () => [
    { type: 'study', courseId: 'bladeMaster' },
    { type: 'study', courseId: 'swordDrill' },
    { type: 'work', jobId: 'guardCaravan' },
    { type: 'work', jobId: 'nightWatch' },
    { type: 'work', jobId: 'unloadCarts' },
  ],
}

const MERCHANT: Strategy = {
  name: 'торговец',
  goal: (state) => skill(state, 'trade') >= 30 && state.character.money >= 200,
  plan: (state) => {
    const plan: Command[] = []
    if (skill(state, 'scholarship') < 8) plan.push({ type: 'study', courseId: 'lettersBasics' })
    if (skill(state, 'trade') < 30) plan.push({ type: 'study', courseId: 'shopApprentice' })
    plan.push({ type: 'work', jobId: 'countLedgers' })
    plan.push({ type: 'work', jobId: 'tavernHand' })
    plan.push({ type: 'work', jobId: 'runErrands' })
    plan.push({ type: 'work', jobId: 'unloadCarts' })
    return plan
  },
}

interface Run {
  readonly days: number
  readonly actions: number
  readonly state: GameState
  readonly reached: boolean
}

function play(strategy: Strategy, seed: number, maxActions = 6000): Run {
  let state = createGame(createCharacter({ name: 'Подопытный', money: 20 }), seed)
  for (let actions = 1; actions <= maxActions; actions += 1) {
    if (strategy.goal(state)) {
      return { days: dayOf(state.time), actions, state, reached: true }
    }
    const command =
      strategy.plan(state).find((candidate) => canApply(state, candidate).ok) ??
      ({ type: 'sleep' } as Command)
    const result = applyCommand(state, command)
    if (!result.ok) throw new Error(`тупик у стратегии «${strategy.name}»: ${result.message}`)
    state = result.state
  }
  return { days: dayOf(state.time), actions: maxActions, state, reached: false }
}

describe('темп прогрессии', () => {
  for (const strategy of [MAGE, WARRIOR, MERCHANT]) {
    it(`стратегия «${strategy.name}» доходит до цели за разумное время`, () => {
      const runs = [1, 2, 3, 5, 8].map((seed) => play(strategy, seed))
      for (const run of runs) {
        expect(run.reached, `стратегия «${strategy.name}» не дошла до цели`).toBe(true)
      }
      const days = runs.map((run) => run.days)
      const actions = runs.map((run) => run.actions)
      const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length
      console.log(
        `${strategy.name}: ${average(days).toFixed(0)} дней, ` +
          `${average(actions).toFixed(0)} действий (дни: ${days.join(', ')})`,
      )

      // Границы широкие нарочно: ловушка на грубый слом, а не утверждённый баланс.
      expect(Math.min(...days)).toBeGreaterThan(3)
      expect(Math.max(...days)).toBeLessThan(250)
    })
  }

  it('деньги остаются ограничением: маг тратит почти всё, что зарабатывает', () => {
    const run = play(MAGE, 1)
    expect(run.state.character.money).toBeLessThan(200)
    expect(run.state.character.level).toBeGreaterThan(1)
  })

  it('сессия из десятка действий даёт видимый шаг', () => {
    // Десять действий — это примерно три-пять минут в телефоне.
    let state = createGame(createCharacter({ name: 'Подопытный', money: 20 }), 3)
    const before = state.character
    for (let i = 0; i < 10; i += 1) {
      const command =
        MAGE.plan(state).find((candidate) => canApply(state, candidate).ok) ??
        ({ type: 'sleep' } as Command)
      const result = applyCommand(state, command)
      if (!result.ok) throw new Error(result.message)
      state = result.state
    }
    const after = state.character
    const grew = Object.keys(after.skills).some(
      (id) =>
        after.skills[id as keyof Character['skills']].level >
        before.skills[id as keyof Character['skills']].level,
    )
    expect(grew, 'за десять действий не вырос ни один навык').toBe(true)
  })
})
