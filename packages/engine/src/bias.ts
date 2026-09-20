import { BIAS, BIAS_DEFS, BIAS_WORDS, type BiasKind } from './content/bias'
import { PLAYER } from './holding'
import { crownWarlust } from './lordlife'
import { strengthOf } from './mind'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Он ошибается и упорствует (этап 120).
 *
 * Предубеждение выводится из нрава короны, а не хранится: надменный видит чужое
 * меньшим, пугливый — большим, жадный считает доход, расчётливый ошибается
 * мало. Хранится только то, чего вывести нельзя, — во что он сейчас верит:
 * иначе у заблуждения не было бы инерции, а без инерции нет и прозрения.
 */

export function biasOf(watcher: string): BiasKind {
  const lust = crownWarlust(watcher)
  if (lust >= 1.2) return 'proud'
  if (lust <= 0.9) return 'fearful'
  if (lust >= 1.05) return 'greedy'
  return 'cold'
}

export function biasDef(kind: BiasKind) {
  return BIAS_DEFS[kind]
}

/** Как он смотрит на чужое: предубеждение как поправка (Уп1). */
export function shadedBy(watcher: string, value: number): number {
  const def = BIAS_DEFS[biasOf(watcher)]
  return Math.max(0, Math.round(value * (1 + def.onOthers)))
}

/**
 * Как он считает своё войско (Уп2).
 *
 * Переоценка себя — самая дорогая ошибка на войне: она не мешает видеть чужое,
 * она мешает понять, чего стоит своё.
 */
export function ownStrengthAs(
  state: GameState,
  world: World,
  watcher: string,
  day: number,
): { readonly thinks: number; readonly truth: number; readonly says: string } {
  const truth = strengthOf(state, world, watcher, day).score
  const def = BIAS_DEFS[biasOf(watcher)]
  const thinks = Math.max(0, Math.round(truth * (1 + def.onSelf)))
  return {
    thinks,
    truth,
    says: `${def.onSelf > 0 ? BIAS_WORDS.selfHigh : BIAS_WORDS.selfLow} ${watcher} (${def.label}): считает своё войско равным ${thinks} при ${truth}.`,
  }
}

/** Во что он верит сейчас. */
export function beliefOf(
  state: Pick<GameState, 'beliefs'>,
  watcher: string,
  about: string,
): { readonly value: number; readonly day: number } | null {
  return state.beliefs?.[`${watcher}:${about}`] ?? null
}

/**
 * Довольно ли громко это опровержение (Уп3).
 *
 * Тихая весть не меняет мнения: чтобы человек передумал, новое должно
 * разойтись с прежним сильнее, чем он упрям. Оттого ошибка живёт годами.
 */
export function loudEnough(
  watcher: string,
  believed: number,
  fresh: number,
  weight = 1,
): { readonly loud: boolean; readonly delta: number; readonly needs: number } {
  const def = BIAS_DEFS[biasOf(watcher)]
  const delta = believed === 0 ? 1 : Math.abs(fresh - believed) / believed
  const needs = Math.round((def.stubborn / Math.max(0.2, weight)) * 100) / 100
  return { loud: delta >= needs, delta: Math.round(delta * 100) / 100, needs }
}

/** Ошибка словами (Уп6). */
export function errorSays(
  watcher: string,
  world: World,
  about: string,
  believed: number,
  truth: number,
): string {
  const who = world.kingdoms[watcher]?.name ?? watcher
  const whom = about === PLAYER ? 'тебя' : (world.kingdoms[about]?.name ?? about)
  // О ком: родительный для «у кого», предложный для «судит о ком».
  const ofWhom = about === PLAYER ? 'тебе' : (world.kingdoms[about]?.name ?? about)
  if (truth === 0) return `${who} не знает о ${ofWhom} ничего.`
  const times = Math.round((believed / truth) * 10) / 10
  if (times >= 1.6) return `${who} думает, что у ${whom} вдвое больше людей, чем есть.`
  if (times <= 0.6) return `${who} думает, что у ${whom} вдвое меньше людей, чем есть.`
  if (times >= 1.15)
    return `${who} переоценивает ${whom} на ${Math.round((times - 1) * 100)} из ста.`
  if (times <= 0.85)
    return `${who} недооценивает ${whom} на ${Math.round((1 - times) * 100)} из ста.`
  return `${who} судит о ${ofWhom} близко к правде.`
}

export interface BiasLedger {
  readonly held: number
  readonly woke: number
  readonly warsByError: number
  readonly says: string
}

/** Цена упорства (Уп5). */
export function biasLedger(state: Pick<GameState, 'biasLog'>): BiasLedger {
  const log = state.biasLog ?? { held: 0, woke: 0, warsByError: 0 }
  return {
    ...log,
    says:
      log.held === 0 && log.woke === 0
        ? 'Чужих заблуждений век пока не считал.'
        : `Заблуждения держались ${log.held} раз, прозрений ${log.woke}; войн, начатых по ошибке, ${log.warsByError}.`,
  }
}

export { BIAS, BIAS_DEFS, BIAS_WORDS, type BiasKind }
