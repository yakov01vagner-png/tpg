import type { Command } from './commands'
import { PLAYER } from './holding'
import { nudgesNow } from './nudge'
import { stepsNow } from './opening'
import { jobsAt } from './place'
import { powerScreens } from './screens'
import type { GameState } from './state'
import { dayOf } from './time'
import type { World } from './world/types'

/**
 * Прогон вслепую (этап 205).
 *
 * Проверка людьми меряет одно: хватает ли игроку того, что игра сказала ему
 * сама. Человека здесь заменить нельзя — но можно отнять у проверяющего всё
 * остальное. Этот слой отдаёт ровно то, что игра предлагает: первые уроки,
 * советы и дела с открытых экранов, — и ничего из того, что известно коду.
 *
 * Нечего предложить или предложенного нельзя сделать — это и есть место, где
 * игрок встаёт. Оно называется, а не угадывается.
 */

export interface TrialOffer {
  readonly from: 'step' | 'nudge' | 'screen'
  readonly label: string
  readonly command: Command | null
  readonly why: string
}

/** Всё, что игра сказала игроку сама (Пр1). */
export function offeredTo(state: GameState, world: World, day: number): readonly TrialOffer[] {
  const out: TrialOffer[] = []
  for (const step of stepsNow(state, world, day)) {
    if (!step.can) continue
    out.push({
      from: 'step',
      label: step.id,
      command: commandForStep(state, step.id, step.where),
      why: step.says,
    })
  }
  for (const nudge of nudgesNow(state, world, day)) {
    out.push({ from: 'nudge', label: nudge.id, command: null, why: nudge.says })
  }
  for (const screen of powerScreens(state, world)) {
    for (const deed of screen.deeds) {
      if (!deed.can) continue
      out.push({
        from: 'screen',
        label: `${screen.id}: ${deed.label}`,
        command: deed.command,
        why: deed.why,
      })
    }
  }
  return out
}

function commandForStep(state: GameState, id: string, where: string | null): Command | null {
  if (id === 'ask') return { type: 'askAround' }
  if (id === 'walk' && where) return { type: 'travel', toLocationId: where }
  if (id === 'earn') {
    const job = jobsAt(state)[0]
    return job ? { type: 'work', jobId: job.id } : null
  }
  return null
}

/**
 * Где игрок встал (Пр1, Пр2).
 *
 * Встал — это не «проиграл», а «игра ничего не предложила или предложила то,
 * чего нельзя сделать».
 */
export function stuckAt(
  state: GameState,
  world: World,
  day: number,
): { readonly stuck: boolean; readonly doable: number; readonly says: string } {
  const offers = offeredTo(state, world, day)
  const doable = offers.filter((one) => one.command !== null).length
  return {
    stuck: doable === 0,
    doable,
    says:
      doable === 0
        ? `${dayOf(state.time)} сут: игра предложила ${offers.length}, сделать можно ни одного — здесь игрок встаёт.`
        : `${dayOf(state.time)} сут: предложено ${offers.length}, из них исполнимо ${doable}.`,
  }
}

/** Что осталось непонятным: предложенное без причины (Пр2). */
export function unclearIn(state: GameState, world: World, day: number): readonly string[] {
  return offeredTo(state, world, day)
    .filter((one) => one.why.trim().length < 20)
    .map((one) => `${one.from}: ${one.label}`)
}

/** Прогон вслепую в числах (Пр4). */
export function trialRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly offers: number
  readonly doable: number
  readonly unclear: number
  readonly says: string
} {
  const offers = offeredTo(state, world, day)
  const unclear = unclearIn(state, world, day)
  const mine = state.politics.lords.filter((one) => one.kingdomId === PLAYER).length
  return {
    offers: offers.length,
    doable: offers.filter((one) => one.command !== null).length,
    unclear: unclear.length,
    says: `Предложено ${offers.length}, исполнимо ${
      offers.filter((one) => one.command !== null).length
    }, без внятной причины ${unclear.length}; вассалов ${mine}.`,
  }
}
