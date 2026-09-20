import {
  ARGUMENTS,
  ARGUMENT_DEFS,
  type ArgumentId,
  GIVES,
  GIVE_DEFS,
  type GiveId,
  PARLEY,
  PARLEY_WORDS,
} from './content/parley'
import type { TreatyKind } from './content/treaties'
import { dreadSeen } from './dread'
import { PLAYER } from './holding'
import { crownDebtsOf } from './lever'
import { strengthOf } from './mind'
import type { GameState } from './state'
import { allied, atWar, relationOf } from './war'
import type { World } from './world/types'

/**
 * Разговор вместо кнопки (этап 191).
 *
 * Дипломатия умеет почти всё — договоры, тайные статьи, свидетелей, посольства,
 * съезды, признание, гарантии, коалиции, — и ничего из этого не разговор:
 * кнопка и бросок. Оттого самая богатая часть игры игралась беднее всех.
 *
 * Здесь у встречи появляется сцена: повестка, доводы, уступки и линия другой
 * стороны. Доводы не выдуманы — каждый берётся из состояния, и пустой довод
 * виден обоим: за ним ничего не стоит.
 */

export interface Parley {
  readonly with: string
  readonly agenda: TreatyKind
  readonly mood: number
  readonly weight: number
  readonly moves: number
  readonly says: string
}

/** О чём вообще этот разговор (Рз1): повестку задаёт состояние, а не игрок. */
export function agendaWith(state: GameState, world: World, side: string, day: number): TreatyKind {
  if (atWar(state.politics, PLAYER, side)) return 'peace'
  if (allied(state.politics, PLAYER, side)) return 'trade'
  if (state.politics.tributes.some((one) => one.from === side && one.to === PLAYER))
    return 'tribute'
  if (relationOf(state.politics, PLAYER, side) >= 20) return 'alliance'
  return 'neutrality'
}

/** Чем подкреплён этот довод (Рз2): вес берётся из мира. */
export function argumentWeight(
  state: GameState,
  world: World,
  side: string,
  argument: ArgumentId,
  day: number,
): { readonly weight: number; readonly backed: boolean; readonly says: string } {
  const mine = strengthOf(state, world, PLAYER, day).score
  const theirs = strengthOf(state, world, side, day).score
  let backed = false
  switch (argument) {
    case 'might':
      backed = mine >= theirs
      break
    case 'kin':
      backed = (state.marriages ?? []).some((one) => one.kingdomId === side)
      break
    case 'debt':
      backed =
        crownDebtsOf(state).some((one) => one.kingdomId === side) ||
        state.politics.tributes.some((one) => one.from === side && one.to === PLAYER)
      break
    case 'fear':
      backed = dreadSeen(state, world, side, PLAYER, day).dread.score > 0
      break
    case 'faith':
      backed = state.anointed !== null && state.anointed !== undefined
      break
    case 'gain':
      backed = state.enterprises.length > 0 || state.character.money > 20000
      break
    case 'right':
      backed = (state.treaties ?? []).some(
        (one) => (one.a === PLAYER && one.b === side) || (one.a === side && one.b === PLAYER),
      )
      break
  }
  const weight = backed ? PARLEY.backed : PARLEY.hollow
  return {
    weight,
    backed,
    says: `${ARGUMENT_DEFS[argument].says} — ${backed ? PARLEY_WORDS.backed : PARLEY_WORDS.hollow} (${ARGUMENT_DEFS[argument].from})`,
  }
}

/** Какие доводы у тебя вообще есть (Рз2). */
export function argumentsFor(
  state: GameState,
  world: World,
  side: string,
  day: number,
): readonly { readonly id: ArgumentId; readonly backed: boolean; readonly says: string }[] {
  return ARGUMENTS.map((id) => {
    const row = argumentWeight(state, world, side, id, day)
    return { id, backed: row.backed, says: row.says }
  })
}

/** Чем можно уступить и чего это стоит (Рз3). */
export function concessions(
  state: GameState,
  world: World,
  side: string,
  day: number,
): readonly { readonly id: GiveId; readonly weight: number; readonly says: string }[] {
  return GIVES.filter((id) => id !== 'nothing').map((id) => ({
    id,
    weight: GIVE_DEFS[id].weight,
    says: `${GIVE_DEFS[id].label}: весит ${GIVE_DEFS[id].weight}. Стоит: ${GIVE_DEFS[id].costs}.`,
  }))
}

/**
 * Как идёт разговор (Рз1, Рз4).
 *
 * Считается из того, что сказано и предложено: подкреплённые доводы и уступки
 * складываются в вес, пустые роняют настроение встречи. Когда веса хватает —
 * бумага; когда настроение падает — он уходит.
 */
export function parleyNow(
  state: GameState,
  world: World,
  side: string,
  said: readonly ArgumentId[],
  given: readonly GiveId[],
  day: number,
): Parley {
  let weight = 0
  let mood = relationOf(state.politics, PLAYER, side) / 20
  for (const one of said) {
    const row = argumentWeight(state, world, side, one, day)
    weight += row.weight
    if (!row.backed) mood += PARLEY.annoys
  }
  for (const one of given) weight += GIVE_DEFS[one].weight
  const moves = said.length + given.length
  const agenda = agendaWith(state, world, side, day)
  const done = weight >= PARLEY.agreesAt
  const left = mood <= PARLEY.leavesAt || moves > PARLEY.moves
  return {
    with: side,
    agenda,
    mood: Math.round(mood * 10) / 10,
    weight: Math.round(weight * 10) / 10,
    moves,
    says: done
      ? `${PARLEY_WORDS.agreed} Повестка: ${agenda}. Вес доводов ${Math.round(weight * 10) / 10} из ${PARLEY.agreesAt}.`
      : left
        ? `${PARLEY_WORDS.left} ${PARLEY_WORDS.nothing}`
        : `${PARLEY_WORDS.opened} Повестка: ${agenda}. Вес ${Math.round(weight * 10) / 10} из ${PARLEY.agreesAt}, ходов ${moves} из ${PARLEY.moves}.`,
  }
}

/** Чем кончился разговор (Рз5). */
export function parleyEnd(now: Parley): {
  readonly treaty: TreatyKind | null
  readonly says: string
} {
  if (now.weight >= PARLEY.agreesAt) {
    return { treaty: now.agenda, says: `${PARLEY_WORDS.agreed} Бумага: ${now.agenda}.` }
  }
  return { treaty: null, says: PARLEY_WORDS.nothing }
}

/** Разговоры в числах (Рз6). */
export function parleyRoll(
  rows: readonly { readonly weight: number; readonly treaty: TreatyKind | null }[],
): {
  readonly talks: number
  readonly papers: number
  readonly empty: number
  readonly says: string
} {
  const papers = rows.filter((one) => one.treaty !== null).length
  return {
    talks: rows.length,
    papers,
    empty: rows.length - papers,
    says: `Переговоров ${rows.length}: бумагой кончились ${papers}, ничем ${rows.length - papers}.`,
  }
}
