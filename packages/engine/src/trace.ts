import { memoryOf } from './annals'
import { houseOf } from './chronicle'
import { LEAVES, LEAVE_DEFS, type LeaveId, TRACE, TRACE_WORDS } from './content/trace'
import { sideName } from './dread'
import { PLAYER, holdingsOf } from './holding'
import { crownDebtsOf } from './lever'
import type { GameState } from './state'
import { treatiesOf } from './treaty'
import { guaranteesOf } from './ward'
import type { World } from './world/types'

/**
 * Мир после тебя (этап 148).
 *
 * След считается из того, что уже есть: земля, грамоты, родство, долги и
 * память. Ничего нового не хранится — и потому «что осталось» нельзя
 * подделать: оно либо стоит в мире, либо нет.
 */

export function leaveDef(id: LeaveId) {
  return LEAVE_DEFS[id]
}

/** Что от тебя осталось (Пс2 и Пс3). */
export function traceOf(
  state: GameState,
  world: World,
  day: number,
): {
  readonly left: Readonly<Record<LeaveId, number>>
  readonly generations: number
  readonly says: string
} {
  const left: Record<LeaveId, number> = {
    land: holdingsOf(state.settlements, PLAYER).length,
    papers:
      treatiesOf(state).filter((one) => one.brokenBy === undefined).length +
      guaranteesOf(state).filter((one) => one.brokenDay === undefined).length,
    kin: (state.marriages ?? []).length,
    debts: crownDebtsOf(state).length,
    name: memoryOf(state, day).good,
  }
  const generations = houseOf(state).length
  return {
    left,
    generations,
    says: `${TRACE_WORDS.left} Колен ${generations}; ${LEAVES.map((id) => `${LEAVE_DEFS[id].label} ${left[id]}`).join(', ')}.`,
  }
}

/** Что дошло от первого колена до нынешнего (Пс6). */
export function fromFounder(
  state: GameState,
  world: World,
  day: number,
): { readonly years: number; readonly holdings: number; readonly says: string } {
  const house = houseOf(state)
  const first = house[0]
  if (!first) {
    return { years: 0, holdings: 0, says: 'Дом ещё не начат: считать не от кого.' }
  }
  const now = holdingsOf(state.settlements, PLAYER).length
  const years = Math.round((day - first.fromDay) / 365)
  return {
    years,
    holdings: now,
    says: `${TRACE_WORDS.got} Первое колено — ${first.name}${first.byname ? ` ${first.byname}` : ''}, лет с тех пор: ${years}. У него было мест ${first.holdings}, сейчас ${now}. ${first.said}`,
  }
}

/** Сколько ещё помнят твой дом (Пс5). */
export function houseMemory(
  state: GameState,
  world: World,
  id: string,
  day: number,
): { readonly years: number; readonly says: string } {
  const memory = memoryOf(state, day)
  const house = houseOf(state)
  const years = Math.round((memory.good + memory.bad) * TRACE.houseLonger)
  return {
    years,
    says: `${TRACE_WORDS.house} ${sideName(world, id)} помнит дом ${house.length > 0 ? 'ещё' : ''} ${years} лет: доброго ${memory.good}, худого ${memory.bad}.`,
  }
}

/** Род пресёкся (Пс4). */
export function houseFell(state: GameState): { readonly fell: boolean; readonly says: string } {
  const fell = state.over === true
  return { fell, says: fell ? TRACE_WORDS.fell : `${TRACE_WORDS.goes} Дом стоит.` }
}

export { TRACE, TRACE_WORDS, LEAVES, LEAVE_DEFS, type LeaveId }
