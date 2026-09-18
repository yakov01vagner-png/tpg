import { applyCommand } from '../src/commands'
import type { GameState } from '../src/state'

/**
 * Дойти до соседнего места.
 *
 * С версии 0.4 команда `travel` не переносит, а выводит на дорогу: дальше идут
 * часы. В тестах, которым важен приход, а не сама дорога, этим занимается эта
 * обёртка — выйти и идти, пока не придёшь или пока не случится бой.
 */
export function goTo(state: GameState, toLocationId: string): GameState {
  const started = applyCommand(state, { type: 'travel', toLocationId })
  if (!started.ok) throw new Error(started.message)
  return walkOut(started.state)
}

/** Идти, пока идётся: до прихода, до боя или до конца суток пути. */
export function walkOut(state: GameState, maxHours = 72): GameState {
  let current = state
  for (let hour = 0; hour < maxHours && current.journey && !current.battle; hour += 1) {
    const step = applyCommand(current, { type: 'tick', minutes: 60 })
    if (!step.ok) throw new Error(step.message)
    current = step.state
  }
  return current
}

/** Дойти и собрать всё, что сказали по дороге: иногда важен не итог, а слова. */
export function walkLog(state: GameState, maxHours = 72): { state: GameState; lines: string[] } {
  let current = state
  const lines: string[] = []
  for (let hour = 0; hour < maxHours && current.journey && !current.battle; hour += 1) {
    const step = applyCommand(current, { type: 'tick', minutes: 60 })
    if (!step.ok) throw new Error(step.message)
    current = step.state
    lines.push(...step.events.map((one) => ('text' in one ? String(one.text) : '')))
  }
  return { state: current, lines }
}
