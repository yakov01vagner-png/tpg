import { congressQuestions, voteOf, votePrice } from './congress'
import { type CongressQuestion, QUESTION_DEFS } from './content/congress'
import { DIET, DIET_MOVES, DIET_MOVE_DEFS, DIET_WORDS, type DietMove } from './content/diet'
import { sideName } from './dread'
import { PLAYER } from './holding'
import { crownPlan } from './plans'
import type { GameState } from './state'
import { allied, relationOf } from './war'
import type { World } from './world/types'

/**
 * Съезд, который решает (этап 194).
 *
 * Съезд есть с этапа 83: повестка, голоса, подкуп, счёт. Чего не было —
 * объяснения: голос выходил числом, торг сводился к подкупу, а решённое ничем
 * не держалось.
 *
 * Здесь у голоса появляется причина, у торга — пять ходов с ценой, весом и
 * риском, а у решения — то, чем оно связывает. Ни одной новой величины:
 * голоса, замыслы корон, союзы и доказательства уже есть.
 */

/** Почему эта корона голосует так (Сз2). */
export function voteWhy(
  state: GameState,
  world: World,
  kingdomId: string,
  question: CongressQuestion,
  about: string | undefined,
  day: number,
): { readonly vote: number; readonly says: string } {
  const vote = voteOf(state, world, kingdomId, question, about, day)
  const plan = crownPlan(world, state.politics, state.settlements, kingdomId)
  const relation = relationOf(state.politics, PLAYER, kingdomId)
  const bribe = state.congress?.bribes?.[kingdomId] ?? 0
  // Причины называются те же, из которых голос и сложился: замысел короны,
  // отношение к тебе, задето ли её собственное, и взято ли серебро.
  const parts = [
    `замысел: ${plan.want}`,
    `отношение к тебе ${relation}`,
    about === kingdomId ? 'решают о ней самой' : null,
    bribe > 0 ? `взято ${bribe}` : null,
  ].filter((one): one is string => one !== null)
  return {
    vote,
    says: `${sideName(world, kingdomId)}: ${vote > 0 ? 'за' : vote < 0 ? 'против' : 'молчит'} (${vote}). Причины: ${parts.join(', ')}.`,
  }
}

/** Чем можно двигать голоса вокруг съезда (Сз3). */
export function dietMoves(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): readonly {
  readonly move: DietMove
  readonly costs: number
  readonly weight: number
  readonly can: boolean
  readonly says: string
}[] {
  const price = votePrice(state, world, kingdomId, 1)
  const hasAlly = Object.keys(world.kingdoms).some(
    (one) => one !== kingdomId && one !== PLAYER && allied(state.politics, PLAYER, one),
  )
  const hasProof = (state.proofs ?? []).some((one) => !one.exposed)
  return DIET_MOVES.map((move) => {
    const def = DIET_MOVE_DEFS[move]
    const costs = move === 'bribe' ? price : 0
    const can =
      move === 'bribe'
        ? state.character.money >= price
        : move === 'ally'
          ? hasAlly
          : move === 'proof'
            ? hasProof
            : true
    return {
      move,
      costs,
      weight: def.weight,
      can,
      says: `${def.label}: ${def.about} Весит +${def.weight}${costs > 0 ? `, стоит ${costs}` : ''}${
        can ? '' : ' — нечем'
      }. Риск: ${def.risk}.`,
    }
  })
}

/** Чем решение связывает (Сз4). */
export function bindsBy(question: CongressQuestion): {
  readonly holds: number
  readonly binds: number
  readonly says: string
} {
  const def = QUESTION_DEFS[question]
  return {
    holds: DIET.holds,
    binds: DIET.binds,
    says: `${def.label}: ${def.does}. ${DIET_WORDS.binds} Нарушение стоит ${DIET.binds} отношения со всеми, кто голосовал, и помнится ${DIET.holds} сут.`,
  }
}

/** Съезд как сцена: повестка от мира и голос каждой короны (Сз1, Сз5). */
export function dietScene(
  state: GameState,
  world: World,
  day: number,
): {
  readonly questions: readonly CongressQuestion[]
  readonly agenda: readonly string[]
  readonly voices: readonly string[]
  readonly says: string
} {
  const rows = congressQuestions(state, world, day)
  const first = rows[0]
  const voices = first
    ? Object.keys(world.kingdoms)
        .filter((one) => one !== PLAYER)
        .map((one) => voteWhy(state, world, one, first.question, first.about, day).says)
    : []
  return {
    questions: rows.map((one) => one.question),
    agenda: rows.map((one) => `${QUESTION_DEFS[one.question].label}: ${one.why}`),
    voices,
    says: `${DIET_WORDS.agenda} На столе ${rows.length}: ${rows
      .map((one) => QUESTION_DEFS[one.question].label)
      .join(', ')}. ${DIET_WORDS.why} ${DIET_WORDS.scene}`,
  }
}

/** Съезды в числах (Сз6). */
export function dietRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly held: number
  readonly decided: number
  readonly onTable: number
  readonly says: string
} {
  const rows = state.congresses ?? []
  const decided = rows.filter((one) => one.passed).length
  const onTable = congressQuestions(state, world, day).length
  return {
    held: rows.length,
    decided,
    onTable,
    says: `Съездов ${rows.length}, решено ${decided}; сейчас на столе вопросов ${onTable}, каждое решение держит ${DIET.holds} сут. ${DIET_WORDS.bargain}`,
  }
}
