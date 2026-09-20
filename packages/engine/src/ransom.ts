import type { Captive } from './captive'
import { ransomFor } from './captive'
import { LEVERS, LEVER_DEFS, RANSOM, RANSOM_WORDS, type RansomLeverId } from './content/ransom'
import { sideName } from './dread'
import { PLAYER } from './holding'
import type { GameState } from './state'
import { atWar, warsOf } from './war'
import type { World } from './world/types'

/**
 * Плен и выкуп (этап 150).
 *
 * Пленники 0.6 остаются теми же (`captive.ts`); новое — торг и то, что в плен
 * попадают обе стороны. Цена не вычисляется однозначно: у пленителя своя
 * нужда, и она входит в то, за сколько он отдаст.
 */

export function leverDefOf(id: RansomLeverId) {
  return LEVER_DEFS[id]
}

/** Свои, которые сидят у чужих (Пл1 и Пл4). */
export function yoursTaken(state: GameState): readonly {
  readonly id: string
  readonly name: string
  readonly by: string
  readonly since: number
  readonly ransom: number
}[] {
  return state.taken ?? []
}

/**
 * Торг о выкупе (Пл2).
 *
 * Пленитель просит больше расчётного и не уступит ниже своего дна; воюющему
 * серебро нужнее, и дно у него ниже. Всё это названо заранее — торгуются не
 * вслепую.
 */
export function haggle(
  state: GameState,
  world: World,
  captive: { readonly ransom: number; readonly kingdomId: string | null },
  captor: string,
  day: number,
): { readonly asks: number; readonly least: number; readonly says: string } {
  const fighting = warsOf(state.politics, captor).length > 0
  const asks = Math.round(captive.ransom * RANSOM.asks)
  const least = Math.round(captive.ransom * RANSOM.least * (fighting ? RANSOM.atWar : 1))
  return {
    asks,
    least,
    says: `${RANSOM_WORDS.haggle} ${sideName(world, captor)} просит ${asks}, ниже ${least} не отдаст${fighting ? ': он воюет, и серебро ему нужнее' : ''}.`,
  }
}

/** Чем ещё можно взять за пленника (Пл3). */
export function leversFor(
  state: GameState,
  world: World,
  captive: Captive,
  day: number,
): readonly { readonly lever: RansomLeverId; readonly says: string }[] {
  const at = captive.kingdomId ? atWar(state.politics, PLAYER, captive.kingdomId) : false
  return LEVERS.filter((id) => id !== 'peace' || at).map((id) => ({
    lever: id,
    says: `${LEVER_DEFS[id].label}: ${LEVER_DEFS[id].about}`,
  }))
}

/** Во что обошлось бы выкупить своего (Пл4). */
export function ownRansom(
  state: GameState,
  world: World,
  id: string,
  day: number,
): { readonly cost: number; readonly years: number; readonly says: string } {
  const row = yoursTaken(state).find((one) => one.id === id)
  if (!row) return { cost: 0, years: 0, says: 'Такого в плену нет.' }
  const years = Math.round(((day - row.since) / 365) * 10) / 10
  const price = haggle(state, world, { ransom: row.ransom, kingdomId: null }, row.by, day)
  return {
    cost: price.asks,
    years,
    says: `${row.name} у ${sideName(world, row.by)} ${years} года. ${price.says} ${RANSOM_WORDS.left} За каждый год верность падает на ${Math.abs(RANSOM.forgotten)}.`,
  }
}

/** Плен в числах (Пл6). */
export function ransomLedger(
  state: GameState,
  world: World,
  day: number,
): { readonly held: number; readonly yours: number; readonly paid: number; readonly says: string } {
  const log = state.ransomLog ?? { taken: 0, freed: 0, paid: 0 }
  return {
    held: (state.captives ?? []).length,
    yours: yoursTaken(state).length,
    paid: log.paid,
    says: `${RANSOM_WORDS.all} У тебя сидят ${(state.captives ?? []).length}, у чужих твоих ${yoursTaken(state).length}; пленений за игру ${log.taken}, выкупов ${log.freed} на ${log.paid} серебра.`,
  }
}

export { RANSOM, RANSOM_WORDS, LEVERS, LEVER_DEFS, ransomFor, type RansomLeverId }
