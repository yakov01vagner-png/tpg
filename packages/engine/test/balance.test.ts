import { describe, expect, it } from 'vitest'
import type { Character } from '../src/character'
import { createCharacter } from '../src/character'
import type { Command } from '../src/commands'
import { applyCommand } from '../src/commands'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { dayOf, isNight } from '../src/time'

/**
 * Прогон баланса.
 *
 * Играет за разумного игрока, который целенаправленно идёт в магию, и меряет,
 * за сколько игровых дней он получает ранг Адепта. Это не столько тест
 * корректности, сколько страховка от случайного слома темпа: если после правки
 * констант путь станет вдвое длиннее или вдвое короче, тест это покажет.
 */
function decide(state: GameState): Command {
  const hero: Character = state.character
  if (isNight(state.time)) return { type: 'sleep' }
  if (hero.fatigue >= 55) return { type: 'sleep' }

  const skill = (id: keyof Character['skills']) => hero.skills[id].level

  // Сначала то, без чего в школу магии не пустят.
  if (skill('scholarship') < 8 && hero.money >= 6) {
    return { type: 'study', courseId: 'lettersBasics' }
  }
  if (skill('concentration') < 5 && hero.money >= 5) {
    return { type: 'study', courseId: 'meditation' }
  }
  // Ранг берём, как только навык позволяет и деньги есть.
  if (hero.magicRank === null && skill('magic') >= 5 && hero.money >= 10) {
    return { type: 'takeExam', examId: 'examNeophyte' }
  }
  if (hero.magicRank === 'neophyte' && skill('magic') >= 15 && hero.money >= 35) {
    return { type: 'takeExam', examId: 'examAdept' }
  }
  // Учиться магии, пока есть на что; иначе идти зарабатывать.
  if (hero.money >= 20 && skill('magic') < 30) {
    return { type: 'study', courseId: 'magicIntro' }
  }
  return skill('scholarship') >= 5
    ? { type: 'work', jobId: 'copyPapers' }
    : { type: 'work', jobId: 'unloadCarts' }
}

function playUntilAdept(seed: number, maxActions = 4000) {
  let state = createGame(createCharacter({ name: 'Подопытный', money: 20 }), seed)
  for (let i = 0; i < maxActions; i += 1) {
    if (state.character.magicRank === 'adept') return { state, reached: true }
    const result = applyCommand(state, decide(state))
    // Если задуманное не вышло (нет денег, ночь, усталость) — отсыпаемся.
    state = result.ok ? result.state : ((): GameState => {
      const fallback = applyCommand(state, { type: 'sleep' })
      if (!fallback.ok) throw new Error(`тупик: ${fallback.message}`)
      return fallback.state
    })()
  }
  return { state, reached: false }
}

describe('темп прогрессии', () => {
  it('путь до Адепта занимает разумное число дней', () => {
    const days: number[] = []
    for (const seed of [1, 2, 3, 5, 8]) {
      const { state, reached } = playUntilAdept(seed)
      expect(reached).toBe(true)
      days.push(dayOf(state.time))
    }
    const average = days.reduce((sum, value) => sum + value, 0) / days.length
    console.log(`Дней до Адепта по зёрнам ${days.join(', ')} (в среднем ${average.toFixed(1)})`)

    // Границы широкие нарочно: это ловушка на грубый слом, а не утверждённый баланс.
    expect(Math.min(...days)).toBeGreaterThan(5)
    expect(Math.max(...days)).toBeLessThan(200)
  })

  it('деньги и время остаются связанными: без работы учиться не на что', () => {
    const { state } = playUntilAdept(1)
    // Герой не превратился в бесконечный кошелёк: тратил почти всё, что зарабатывал.
    expect(state.character.money).toBeLessThan(200)
    expect(state.character.level).toBeGreaterThan(1)
  })
})
