import { lordTemper } from './castle'
import {
  LOOKS,
  LOOK_DEFS,
  type LookId,
  PRIMACY,
  PRIMACY_WORDS,
  TEMPER_LOOK,
} from './content/primacy'
import { vassalsOf } from './court'
import { firstOf, sideName, wayTruth } from './dread'
import { PLAYER } from './holding'
import type { GameState } from './state'
import { type Walker, waysOf } from './way'
import type { World } from './world/types'

/**
 * Цена первенства (этап 139).
 *
 * Первенство считается тем же числом, что и страх (этап 135): долей пройденного
 * пути. Отсюда всё: с первого просят дороже, свои смотрят на него по-разному, и
 * у него появляется выбор, которого не было, — идти тихо.
 */

export function lookDef(id: LookId) {
  return LOOK_DEFS[id]
}

/** Насколько дороже всё тому, кто впереди (Це1). */
export function firstPays(
  state: GameState,
  world: World,
  day: number,
): { readonly times: number; readonly share: number; readonly says: string } {
  const share = wayTruth(state, world, PLAYER, day) / 100
  const times = Math.round(Math.min(PRIMACY.dearestTimes, 1 + share * PRIMACY.perShare) * 100) / 100
  return {
    times,
    share,
    says:
      times <= 1
        ? 'Ты ещё не первый: платишь как все.'
        : `${PRIMACY_WORDS.pays} Пройдено ${Math.round(share * 100)} из ста — всё дороже в ${times} раза.`,
  }
}

/** Чем твой путь своим: славой или страхом (Це2). */
export function courtSplit(
  state: GameState,
  world: World,
  day: number,
): {
  readonly glory: number
  readonly fear: number
  readonly says: string
} {
  let glory = 0
  let fear = 0
  for (const lord of vassalsOf(state)) {
    if ((TEMPER_LOOK[lordTemper(lord)] ?? 'fear') === 'glory') glory += 1
    else fear += 1
  }
  return {
    glory,
    fear,
    says: `${PRIMACY_WORDS.split} В славу это ${glory}, в страх ${fear}${glory + fear > 0 ? `; за такт двор двигается на ${PRIMACY.courtMoves}` : ''}.`,
  }
}

/** Идёшь ли ты тихо (Це3). */
export function goingQuiet(state: Pick<GameState, 'quiet'>): boolean {
  return (state.quiet?.sinceDay ?? 0) > 0
}

/**
 * Чего стоит тишина (Це3 и Це4).
 *
 * Тихий не коронуется, не созывает соборов и не ходит по призыву — а это шаги
 * пути. Значит, тишина не бесплатна: она платится теми вехами, которые без
 * громкого дела не берутся.
 */
export function quietCost(
  state: GameState,
  world: World,
  day: number,
): {
  readonly quiet: boolean
  readonly closed: readonly string[]
  readonly says: string
} {
  const quiet = goingQuiet(state)
  const closed = ['венчание на царство', 'собор', 'поход по призыву']
  return {
    quiet,
    closed,
    says: quiet
      ? `${PRIMACY_WORDS.quiet} ${PRIMACY_WORDS.slower} Закрыты: ${closed.join(', ')}.`
      : `${PRIMACY_WORDS.loud} Тихо идти можно, но тогда закрыты: ${closed.join(', ')}.`,
  }
}

/**
 * Сколько пути можно пройти тихо, а сколько — только громко (Це4).
 *
 * Считается по тем же путям (этап 130): веха, которая берётся громким делом,
 * тихому недоступна, и потому его доля меньше при той же игре.
 */
export function loudAndQuiet(
  state: GameState,
  world: World,
  who: Walker,
  day: number,
): { readonly loud: number; readonly quiet: number; readonly says: string } {
  const LOUD = new Set(['crowned', 'crusade'])
  let loud = 0
  let quiet = 0
  let all = 0
  for (const way of waysOf(state, world, who, day)) {
    for (const step of way.steps) {
      all += 1
      if (LOUD.has(step.step.measure)) loud += 1
      else quiet += 1
    }
  }
  return {
    loud,
    quiet,
    says: `Из ${all} вех громкими делами берутся ${loud}, тихими ${quiet}. ${PRIMACY_WORDS.slower}`,
  }
}

/** Тот ли первый, против кого собирают (Це5). */
export function rightlyFirst(
  state: GameState,
  world: World,
  against: string,
  day: number,
): { readonly right: boolean; readonly first: string; readonly says: string } {
  const first = firstOf(state, world, day)
  const right = first.who === against
  return {
    right,
    first: first.who,
    says: right
      ? `Против ${sideName(world, against)} собирают верно: он и есть первый.`
      : `${PRIMACY_WORDS.wrong} Первый на деле ${sideName(world, first.who)}, а не ${sideName(world, against)}.`,
  }
}

/** Цена первенства в числах (Це6). */
export function primacyLedger(
  state: GameState,
  world: World,
  day: number,
): {
  readonly times: number
  readonly quiet: boolean
  readonly wrong: number
  readonly says: string
} {
  const pays = firstPays(state, world, day)
  const split = courtSplit(state, world, day)
  const wrong = (state.wrongCalls ?? []).length
  return {
    times: pays.times,
    quiet: goingQuiet(state),
    wrong,
    says: `${pays.says} ${split.says} Идёшь ${goingQuiet(state) ? 'тихо' : 'громко'}; собрано не против того ${wrong} раз.`,
  }
}

export { PRIMACY, PRIMACY_WORDS, LOOKS, LOOK_DEFS, TEMPER_LOOK, type LookId }
