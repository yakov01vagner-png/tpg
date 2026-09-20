import { memoryOf } from './annals'
import { houseOf } from './chronicle'
import { FALLEN, FALLEN_WORDS, REMAINS, REMAIN_DEFS, type RemainId } from './content/fallen'
import { vassalsOf } from './court'
import { sideName } from './dread'
import { PLAYER, holdingsOf } from './holding'
import type { GameState } from './state'
import { treatiesOf } from './treaty'
import { relationOf } from './war'
import type { World } from './world/types'

/**
 * Потеря державы (этап 151).
 *
 * Держава кончается, когда кончается земля, — и это положение, а не конец
 * игры. Что осталось, считается из состояния: имя по летописи, дом по коленам,
 * слово по грамотам, спутники по отряду, знание по умениям.
 */

export function remainDef(id: RemainId) {
  return REMAIN_DEFS[id]
}

/** Цела ли держава (По1). */
export function realmLost(state: GameState): boolean {
  return state.realm !== null && holdingsOf(state.settlements, PLAYER).length === 0
}

/** Что осталось, когда земли нет (По2). */
export function whatRemains(
  state: GameState,
  world: World,
  day: number,
): { readonly left: Readonly<Record<RemainId, number>>; readonly says: string } {
  const left: Record<RemainId, number> = {
    name: memoryOf(state, day).good,
    house: houseOf(state).length + (state.marriages ?? []).length,
    word: treatiesOf(state).filter((one) => one.brokenBy === undefined).length,
    people: Object.values(state.party.units).reduce((sum, one) => sum + (one ?? 0), 0),
    lore: Object.values(state.character.skills).filter((one) => one.level > 0).length,
  }
  return {
    left,
    says: `${FALLEN_WORDS.goes} ${REMAINS.map((id) => `${REMAIN_DEFS[id].label} ${left[id]}`).join(', ')}.`,
  }
}

/** Кто приютит изгнанника (По3). */
export function exileAt(
  state: GameState,
  world: World,
  day: number,
): { readonly at: string | null; readonly says: string } {
  const best = Object.keys(world.kingdoms)
    .map((id) => ({ id, warmth: relationOf(state.politics, PLAYER, id) }))
    .filter((one) => one.warmth >= FALLEN.exileWarmth)
    .sort((a, b) => b.warmth - a.warmth)[0]
  if (!best) {
    return { at: null, says: 'Приютить тебя некому: ко всем дворам ты холоден или хуже.' }
  }
  return {
    at: best.id,
    says: `${FALLEN_WORDS.exile} Ближе всех ${sideName(world, best.id)} (${best.warmth}).`,
  }
}

/** Кто и как тебя помнит после потери (По4). */
export function whoRemembers(
  state: GameState,
  world: World,
  day: number,
): readonly { readonly who: string; readonly warmth: number; readonly says: string }[] {
  const rows = Object.keys(world.kingdoms).map((id) => ({
    who: id,
    warmth: relationOf(state.politics, PLAYER, id),
    says: `${sideName(world, id)}: ${relationOf(state.politics, PLAYER, id)}`,
  }))
  const own = vassalsOf(state).map((lord) => ({
    who: lord.name,
    warmth: lord.loyalty,
    says: `${lord.name} (бывший вассал): ${lord.loyalty}`,
  }))
  return [...own, ...rows].sort((a, b) => b.warmth - a.warmth)
}

/** Потери в числах (По6). */
export function fallenLedger(
  state: GameState,
  world: World,
  day: number,
): { readonly times: number; readonly says: string } {
  const log = state.fallenLog ?? []
  const remains = whatRemains(state, world, day)
  return {
    times: log.length,
    says: `${log.length === 0 ? 'Державу ты не терял.' : `${FALLEN_WORDS.lost} Раз ${log.length}: ${log.map((one) => `${one.name} на ${one.day}-й день (было мест ${one.places})`).join(', ')}.`} ${remains.says}`,
  }
}

export { FALLEN, FALLEN_WORDS, REMAINS, REMAIN_DEFS, type RemainId }
