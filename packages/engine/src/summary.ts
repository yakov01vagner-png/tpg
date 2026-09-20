import { memoryOf } from './annals'
import { centuryOf } from './century'
import { houseOf } from './chronicle'
import { ENDING_DEFS, type EndingId } from './content/ending'
import { vassalsOf } from './court'
import { sideName } from './dread'
import { endingOf, nearestEnding } from './ending'
import { PLAYER, holdingsOf } from './holding'
import { crownDebtsOf } from './lever'
import { partySize } from './party'
import type { GameState } from './state'
import { traceOf } from './trace'
import { treatiesOf } from './treaty'
import { warsOf } from './war'
import type { World } from './world/types'

/**
 * Итог (этап 155) и жизнь как счёт (этап 156).
 *
 * Итог не хвалит и не ставит очков: он называет, что стало с миром, с домом и
 * с теми, кто шёл рядом, чем это взято и чего стоило. Всё — из состояния.
 */

export interface Summary {
  readonly ending: EndingId | null
  readonly world: string
  readonly house: string
  readonly kin: string
  readonly how: string
  readonly cost: string
  readonly says: string
}

/** Итог одним экраном (Ит1–Ит6). */
export function summaryOf(state: GameState, world: World, day: number): Summary {
  const end = endingOf(state, world, day)
  const century = centuryOf(state, world, day)
  const trace = traceOf(state, world, day)
  const memory = memoryOf(state, day)
  const lords = vassalsOf(state)
  // Чем взято: война, серебро, слово, вера — по тому, чего в летописи больше.
  const marks = memory.marks
  const how: readonly [string, number][] = [
    ['войной', (marks.blood ?? 0) + warsOf(state.politics, PLAYER).length],
    ['серебром', crownDebtsOf(state).length + Math.round(state.character.money / 20000)],
    ['словом', treatiesOf(state).filter((one) => one.brokenBy === undefined).length],
    ['верой', state.anointed ? 3 : Math.round((state.piety ?? 0) / 20)],
  ]
  const top = [...how].sort((a, b) => b[1] - a[1])[0] ?? ['ничем', 0]
  return {
    ending: end.id,
    world: `${century.rows.length} сторон: ${century.rows.map((one) => `${sideName(world, one.who)} ${one.share}`).join(', ')}. Эпох ${century.eras.length}.`,
    house: `Колен ${houseOf(state).length}, родства ${(state.marriages ?? []).length}, мест ${holdingsOf(state.settlements, PLAYER).length}.`,
    kin: `Вассалов ${lords.length} (верность в среднем ${lords.length > 0 ? Math.round(lords.reduce((sum, one) => sum + one.loyalty, 0) / lords.length) : 0}), людей в отряде ${partySize(state.party)}.`,
    how: `Взято ${top[0]}: ${how.map(([label, value]) => `${label} ${value}`).join(', ')}.`,
    cost: `Стоило: войн ${state.log.filter((one) => one.kind === 'war').length}, худой памяти ${memory.bad}, потерь державы ${(state.fallenLog ?? []).length}, долгов ${crownDebtsOf(state).length}.`,
    says: `${end.id ? ENDING_DEFS[end.id].label : nearestEnding(state, world, day).says}`,
  }
}

/** Жизнь как счёт (Жз1, Жз4 и Жз5). */
export function lifeOf(
  state: GameState,
  world: World,
  day: number,
): { readonly was: string; readonly got: string; readonly lost: string; readonly left: string } {
  const trace = traceOf(state, world, day)
  const memory = memoryOf(state, day)
  return {
    was: `${state.character.name}, ${state.character.age} лет${state.realm ? `, ${state.realm.name}` : ', без державы'}.`,
    got: `Земли ${holdingsOf(state.settlements, PLAYER).length}, родства ${(state.marriages ?? []).length}, признаний ${Object.keys(state.recognitions ?? {}).length}, доброй памяти ${memory.good}.`,
    lost: `Потерь державы ${(state.fallenLog ?? []).length}, худой памяти ${memory.bad}, позоров ${(state.shames ?? []).length}.`,
    left: trace.says,
  }
}

/** Чужие жизни того же века (Жз3). */
export function othersLives(state: GameState, world: World, day: number): readonly string[] {
  return centuryOf(state, world, day)
    .rows.filter((one) => one.who !== PLAYER)
    .map((one) => `${sideName(world, one.who)}: ${one.way} ${one.share} из ста, ${one.trend}`)
}
