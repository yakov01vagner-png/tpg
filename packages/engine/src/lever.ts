import { skillLevel } from './character'
import { LEVER, LEVERS, LEVER_DEFS, LEVER_WORDS, type LeverId, MIGHT } from './content/lever'
import { PLAYER } from './holding'
import { rankTier } from './magic'
import { strengthOf } from './mind'
import { warToll } from './peace'
import type { GameState } from './state'
import { atWar, warsOf } from './war'
import type { World } from './world/types'

/**
 * Путь торга и путь силы (этап 133).
 *
 * Оба пути обходятся без войска, и оба поэтому нуждаются в том, чтобы это было
 * посчитано: сколько именно серебра делает то, что делает война, и с какой
 * ступени корона считается с человеком как с короной.
 */

export function leverDef(id: LeverId) {
  return LEVER_DEFS[id]
}

/** Долг короны перед тобой: сколько и с какого дня. */
export interface CrownDebt {
  readonly kingdomId: string
  readonly owed: number
  readonly sinceDay: number
}

export function crownDebtsOf(state: Pick<GameState, 'crownDebts'>): readonly CrownDebt[] {
  return Object.entries(state.crownDebts ?? {}).map(([kingdomId, one]) => ({
    kingdomId,
    ...one,
  }))
}

/**
 * Сколько эта корона возьмёт в долг (Тс2).
 *
 * Берут те, кому нужно: воюющий возьмёт больше мирного, слабый — больше
 * сильного. Больше, чем она сможет отдать, не берут: заимодавец тоже считает.
 */
export function loanWanted(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): { readonly wants: number; readonly can: boolean; readonly says: string } {
  const theirs = strengthOf(state, world, kingdomId, day)
  const wars = warsOf(state.politics, kingdomId).length
  const purse = Math.round(theirs.places * 420)
  const wants = Math.round(purse * (wars > 0 ? 0.35 : 0.12))
  const name = world.kingdoms[kingdomId]?.name ?? kingdomId
  const already = state.crownDebts?.[kingdomId]
  return {
    wants,
    can: wants >= LEVER.leastLoan && !already,
    says: already
      ? `${name} уже у тебя в долгу: ${already.owed}.`
      : wars > 0
        ? `${name} воюет и возьмёт до ${wants}: воюющему серебро нужнее.`
        : `${name} в мире и возьмёт разве что ${wants}.`,
  }
}

/** Во что обойдётся откупиться от этой войны (Тс2). */
export function buyPeaceCost(
  state: GameState,
  world: World,
  against: string,
  day: number,
): { readonly cost: number; readonly can: boolean; readonly says: string } {
  const war = warsOf(state.politics, PLAYER).find((one) => one.a === against || one.b === against)
  if (!war) {
    return { cost: 0, can: false, says: 'С этой короной ты не воюешь.' }
  }
  const theirs = warToll(state, world, against, war, day)
  const ours = warToll(state, world, PLAYER, war, day)
  // Откуп тем дороже, чем лучше идут их дела: выигрывающий дёшево не уходит.
  const winning = theirs.cost < ours.cost ? 1.5 : 1
  const cost = Math.round(theirs.cost * LEVER.buyPeaceTimes * winning * 20)
  return {
    cost,
    can: state.character.money >= cost,
    says: `${world.kingdoms[against]?.name ?? against}: откуп ${cost}. ${LEVER_DEFS.buyPeace.after}`,
  }
}

/**
 * Что станет с долгом за такт (Тс2).
 *
 * Воюющий не отдаёт: ему сейчас нужнее, и долг растёт процентом. Мирный
 * отдаёт десятую — и всё равно платит процент, потому долги и переживают
 * государей.
 */
export function debtAfterBeat(
  owed: number,
  atWarNow: boolean,
): { readonly owed: number; readonly back: number } {
  const grown = Math.round(owed * (1 + LEVER.interest * MIGHT.beat))
  if (atWarNow) return { owed: grown, back: 0 }
  const back = Math.round(grown / 10)
  return { owed: grown - back, back }
}

/** Дом, который кормит королевства (Тс1). */
export function feedsKingdoms(
  state: GameState,
  world: World,
  day: number,
): { readonly is: boolean; readonly owed: number; readonly says: string } {
  const owed = crownDebtsOf(state).reduce((sum, one) => sum + one.owed, 0)
  const purse = state.character.money
  const is = purse >= LEVER.feedsKingdoms && owed > 0
  return {
    is,
    owed,
    says: is
      ? `${LEVER_WORDS.feeds} В казне ${purse}, короны должны ${owed}.`
      : `В казне ${purse} из ${LEVER.feedsKingdoms}, короны должны ${owed}. ${LEVER_WORDS.owes}`,
  }
}

/**
 * Сила, с которой считаются короны (Тс3).
 *
 * Не уровень и не число заклинаний, а то, что видно со стороны: признанная
 * ступень, вещи с чарами и слава. С пятой ступени корона говорит как с короной —
 * и это входит в признание (этап 131).
 */
export function mightOf(
  state: GameState,
  day: number,
): {
  readonly tier: number
  readonly artifacts: number
  readonly reckoned: boolean
  readonly says: string
} {
  const tier = rankTier(state.character.magicRank)
  const artifacts = (state.artifacts ?? []).length
  const reckoned = tier >= MIGHT.crownReckons && artifacts >= MIGHT.artifacts
  return {
    tier,
    artifacts,
    reckoned,
    says: reckoned
      ? `${LEVER_WORDS.reckons} Ступень ${tier}, вещей с чарами ${artifacts}.`
      : `Ступень ${tier} из ${MIGHT.crownReckons}, вещей с чарами ${artifacts} из ${MIGHT.artifacts}: пока зовут, а не считаются.`,
  }
}

/** Чем платится сила (Тс4). */
export function mightCost(
  state: GameState,
  day: number,
): { readonly churchAnger: number; readonly apart: number; readonly says: string } {
  const tier = rankTier(state.character.magicRank)
  if (tier < MIGHT.crownReckons - 1) {
    return { churchAnger: 0, apart: 0, says: 'Ступень ещё не та, чтобы за неё платить.' }
  }
  return {
    churchAnger: MIGHT.churchFears,
    apart: MIGHT.apart,
    says: `${LEVER_WORDS.apart} ${LEVER_WORDS.fears} Гнев церкви +${MIGHT.churchFears} за такт, верность своих ${MIGHT.apart}.`,
  }
}

/** Каким выходит мир, дошедший до каждого из двух концов (Тс5). */
export function bothEnds(
  state: GameState,
  world: World,
  day: number,
): { readonly banker: string; readonly archmage: string } {
  const money = feedsKingdoms(state, world, day)
  const might = mightOf(state, day)
  return {
    banker: `${LEVER_WORDS.banker} ${money.says}`,
    archmage: `${LEVER_WORDS.archmage} ${might.says}`,
  }
}

/** Годы, которые стоит каждый из двух путей — по нынешнему состоянию (Тс6). */
export function bothCosts(state: GameState): {
  readonly tradeYears: number
  readonly mightYears: number
  readonly says: string
} {
  // Торг считается по казне: сколько ещё копить при нынешнем доходе.
  const need = Math.max(0, LEVER.feedsKingdoms - state.character.money)
  const tradeYears =
    Math.round((need / Math.max(200, state.enterprises.length * 900 + 300) / 365) * 10) / 10
  // Сила — по умению: сколько ещё до семидесятой ступени при обычном учении.
  const magic = skillLevel(state.character, 'magic')
  const mightYears = Math.round((Math.max(0, 70 - magic) / 8) * 10) / 10
  return {
    tradeYears,
    mightYears,
    says: `Путь торга: копить ещё ${need} — примерно ${tradeYears} года. Путь силы: до семидесятой ступени ещё ${Math.max(0, 70 - magic)} — примерно ${mightYears} года.`,
  }
}

export { LEVER, LEVER_DEFS, LEVER_WORDS, LEVERS, MIGHT, type LeverId }
