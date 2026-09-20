import {
  ACCLAIM,
  ACCLAIM_WORDS,
  DEARER,
  DEARER_DEFS,
  type DearerId,
  TITLE_NEEDS,
} from './content/acclaim'
import { sideName } from './dread'
import { PLAYER } from './holding'
import type { GameState } from './state'
import { TITLES, type TitleId, titleDef, titleOf } from './title'
import { relationOf } from './war'
import { type Walker, recognisedBySides } from './way'
import type { World } from './world/types'

/**
 * Признание (этап 138).
 *
 * Правило: **титул значит то, что его признали**. Земля даёт право называться,
 * признание — быть. Отсюда всё остальное: отозванное признание — повод к войне,
 * а тому, кого не признали, дороже всё, что делается через чужие руки.
 */

export function dearerDef(id: DearerId) {
  return DEARER_DEFS[id]
}

/** Чего стоит твой титул на самом деле (Пр1). */
export function titleWorth(
  state: GameState,
  world: World,
  day: number,
): {
  readonly claimed: TitleId
  readonly real: TitleId
  readonly yes: number
  readonly hollow: boolean
  readonly says: string
} {
  const claimed = titleOf(state)
  const { yes } = recognisedBySides(state, world, PLAYER, day)
  let real: TitleId = claimed
  for (const id of [...TITLES].reverse()) {
    if (TITLES.indexOf(id) > TITLES.indexOf(claimed)) continue
    if (yes.length >= (TITLE_NEEDS[id] ?? 0)) {
      real = id
      break
    }
  }
  const hollow = real !== claimed
  return {
    claimed,
    real,
    yes: yes.length,
    hollow,
    says: hollow
      ? `${ACCLAIM_WORDS.hollow} Зовёшься ${titleDef(claimed).label}, а признали тебя ${yes.length} — это ${titleDef(real).label}.`
      : `${ACCLAIM_WORDS.worth} ${titleDef(claimed).label}: за тобой ${yes.length} корон.`,
  }
}

/** Насколько дороже всё непризнанному (Пр4). */
export function strangerCost(
  state: GameState,
  world: World,
  day: number,
): { readonly times: number; readonly no: number; readonly says: string } {
  const { no } = recognisedBySides(state, world, PLAYER, day)
  const times =
    Math.round(Math.min(ACCLAIM.dearestTimes, 1 + no.length * ACCLAIM.perStranger) * 100) / 100
  return {
    times,
    no: no.length,
    says:
      no.length === 0
        ? 'Тебя признали все: дороже обычного ничего не стоит.'
        : `${ACCLAIM_WORDS.stranger} Не признали ${no.length} — всё через чужие руки дороже в ${times} раза: ${DEARER.map((id) => DEARER_DEFS[id].label).join(', ')}.`,
  }
}

/** Кого признал ты сам (Пр5). */
export function givenTo(state: Pick<GameState, 'given'>): Readonly<Record<string, number>> {
  return state.given ?? {}
}

export function hasGiven(state: Pick<GameState, 'given'>, to: string): boolean {
  return (state.given?.[to] ?? 0) > 0
}

/**
 * Чего стоит признать чужого (Пр5).
 *
 * Не любезность: признание двигает его путь к концу. Оттого и цена его — не
 * серебро, а то, что ближе к концу становится не ты.
 */
export function givingCost(
  state: GameState,
  world: World,
  to: string,
  day: number,
): { readonly moves: number; readonly says: string } {
  const before = recognisedBySides(state, world, to, day).yes.length
  const after = hasGiven(state, to) ? before : before + 1
  return {
    moves: after - before,
    says: `${ACCLAIM_WORDS.given} ${sideName(world, to)}: признавших ${before} станет ${after}.`,
  }
}

/** Кто готов отозвать своё признание (Пр3). */
export function wouldRecall(
  state: GameState,
  world: World,
  of: Walker,
  day: number,
): readonly string[] {
  if (of !== PLAYER) return []
  return Object.keys(state.recognitions ?? {}).filter(
    (id) => relationOf(state.politics, PLAYER, id) <= ACCLAIM.recallsAt,
  )
}

/** Признание в числах (Пр6). */
export function acclaimLedger(
  state: GameState,
  world: World,
  day: number,
): {
  readonly yes: number
  readonly given: number
  readonly recalled: number
  readonly says: string
} {
  const sides = recognisedBySides(state, world, PLAYER, day)
  const given = Object.keys(givenTo(state)).length
  const recalls = state.recalls ?? []
  const worth = titleWorth(state, world, day)
  return {
    yes: sides.yes.length,
    given,
    recalled: recalls.length,
    says: `Тебя признали ${sides.yes.length}, не признали ${sides.no.length}${sides.no.length > 0 ? ` (${sides.no.map((id) => sideName(world, id)).join(', ')})` : ''}; ты признал ${given}; отозвано признаний ${recalls.length}${recalls.length > 0 ? ` (${recalls.map((one) => `${sideName(world, one.by)} на ${one.day}-й день`).join(', ')})` : ''}. ${worth.says}`,
  }
}

export { ACCLAIM, ACCLAIM_WORDS, DEARER, DEARER_DEFS, TITLE_NEEDS, type DearerId }
