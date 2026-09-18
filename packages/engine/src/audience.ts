import { LORD_LINES, type LordStance } from './content/lines'
import { PLAYER } from './holding'
import { lordRep } from './reputation'
import type { GameState } from './state'
import type { Lord } from './war'
import { atWar } from './war'

/**
 * Аудиенция: что лорд скажет герою.
 *
 * Отношение выводится из того, что уже есть в состоянии: репутация у лорда,
 * война между его короной и твоей, служба, вассалитет, брак. Строка выбирается
 * детерминированно от дня — один и тот же лорд в один день говорит одно и то же.
 */
export function lordStance(state: GameState, lord: Lord): LordStance {
  if (lord.kingdomId === PLAYER) return 'vassal'
  if (state.character.family.spouse?.lordId === lord.id) return 'kin'
  if (state.service && lord.kingdomId && atWar(state.politics, state.service, lord.kingdomId)) {
    return 'enemy'
  }
  const rep = lordRep(state.reputation, lord.id)
  if (rep <= -20) return 'hostile'
  if (state.service && lord.kingdomId === state.service) return 'liege'
  if (rep >= 30) return 'friend'
  if (rep >= 10) return 'warm'
  if (rep < 0) return 'cold'
  return 'stranger'
}

export function lordSays(state: GameState, lord: Lord, day: number): string {
  const lines = LORD_LINES[lordStance(state, lord)]
  return lines[day % lines.length] ?? lines[0] ?? '…'
}
