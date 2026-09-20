import { anointedOf } from './anoint'
import { roadsBack } from './comeback'
import { ENDING, ENDINGS, ENDING_DEFS, ENDING_WORDS, type EndingId } from './content/ending'
import { UNION } from './content/union'
import { sideName } from './dread'
import { PLAYER, holdingsOf } from './holding'
import { houseWay } from './lineage'
import type { GameState } from './state'
import { theirEnd } from './theirend'
import { unionOf } from './union'
import { wayOf } from './way'
import type { World } from './world/types'

/**
 * Условия конца (этап 154).
 *
 * Конец — это состояние мира, у которого есть имя. Считается он тем же кодом,
 * что и пути (этап 130): отдельной «проверки победы» не существует, и потому
 * подделать конец нельзя.
 */

export function endingDef(id: EndingId) {
  return ENDING_DEFS[id]
}

/** Насколько близок каждый конец (Ку1 и Ку5). */
export function endingsNow(
  state: GameState,
  world: World,
  day: number,
): readonly { readonly id: EndingId; readonly share: number; readonly says: string }[] {
  const union = unionOf(state, world, PLAYER, day)
  const rows: { id: EndingId; share: number; says: string }[] = [
    {
      id: 'crown',
      share: union.finished ? 1 : wayOf(state, world, PLAYER, 'crown', day).share,
      says: union.says,
    },
    {
      id: 'house',
      share: houseWay(state, world, day).finished
        ? 1
        : wayOf(state, world, PLAYER, 'house', day).share,
      says: houseWay(state, world, day).says,
    },
    {
      id: 'trade',
      share: wayOf(state, world, PLAYER, 'trade', day).share,
      says: wayOf(state, world, PLAYER, 'trade', day).says,
    },
    {
      id: 'might',
      share: wayOf(state, world, PLAYER, 'might', day).share,
      says: wayOf(state, world, PLAYER, 'might', day).says,
    },
    {
      id: 'faith',
      share: anointedOf(state, world, day).is ? 1 : wayOf(state, world, PLAYER, 'faith', day).share,
      says: anointedOf(state, world, day).says,
    },
  ]
  return rows.sort((a, b) => b.share - a.share)
}

/** Пришёл ли мир к имени — и к какому (Ку1, Ку2 и Ку3). */
export function endingOf(
  state: GameState,
  world: World,
  day: number,
): { readonly id: EndingId | null; readonly says: string } {
  // Сперва то, что не в твою пользу: чужой конец сильнее твоего пути.
  const theirs = theirEnd(state, world, day)
  if (theirs.who && theirs.who !== PLAYER) {
    return {
      id: 'theirs',
      says: `${ENDING_DEFS.theirs.label}: ${sideName(world, theirs.who)}. ${ENDING_DEFS.theirs.about}`,
    }
  }
  if (state.over === true) {
    return { id: 'fallen', says: `${ENDING_DEFS.fallen.label}: ${ENDING_DEFS.fallen.about}` }
  }
  const lost = (state.fallenLog ?? [])[(state.fallenLog ?? []).length - 1]
  if (
    lost &&
    holdingsOf(state.settlements, PLAYER).length === 0 &&
    day - lost.day >= ENDING.goneYears * 365 &&
    roadsBack(state, world, day).every((one) => !one.open)
  ) {
    return { id: 'gone', says: `${ENDING_DEFS.gone.label}: ${ENDING_DEFS.gone.about}` }
  }
  // А теперь твои: по тем же путям, которыми ты шёл.
  const union = unionOf(state, world, PLAYER, day)
  if (union.finished && union.heldYears >= UNION.holdYears) {
    return { id: 'crown', says: `${ENDING_DEFS.crown.label}: ${union.says}` }
  }
  for (const id of ['house', 'trade', 'might', 'faith'] as const) {
    const row = endingsNow(state, world, day).find((one) => one.id === id)
    if (row && row.share >= 1) {
      return { id, says: `${ENDING_DEFS[id].label}: ${row.says}` }
    }
  }
  return { id: null, says: `${ENDING_WORDS.derived} Пока ни одного имени.` }
}

/** К какому концу ты ближе всех (Ку5). */
export function nearestEnding(
  state: GameState,
  world: World,
  day: number,
): { readonly id: EndingId; readonly share: number; readonly says: string } {
  const first = endingsNow(state, world, day)[0] as {
    id: EndingId
    share: number
    says: string
  }
  return {
    ...first,
    says: `${ENDING_WORDS.near} Ближе всего «${ENDING_DEFS[first.id].label}»: ${Math.round(first.share * 100)} из ста. ${first.says}`,
  }
}

/** Концы в числах (Ку6). */
export function endingLedger(
  state: GameState,
  world: World,
  day: number,
): { readonly reached: EndingId | null; readonly says: string } {
  const now = endingOf(state, world, day)
  const rows = endingsNow(state, world, day)
  return {
    reached: now.id,
    says: `${now.says} ${ENDING_WORDS.open} Пути к концам: ${rows.map((one) => `${ENDING_DEFS[one.id].label} ${Math.round(one.share * 100)}`).join('; ')}. Всего имён ${ENDINGS.length}, твоих ${ENDINGS.filter((id) => ENDING_DEFS[id].yours).length}.`,
  }
}

export { ENDING, ENDING_WORDS, ENDINGS, ENDING_DEFS, type EndingId }
