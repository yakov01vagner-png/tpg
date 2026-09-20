import { bandSize } from './band'
import { COIN, COIN_WORDS } from './content/coin'
import { PLAYER } from './holding'
import type { GameState } from './state'
import { crownLand } from './theirs'
import { warsOf } from './war'
import type { World } from './world/types'

/**
 * Казна короны как вещь (этап 165).
 *
 * Чужого серебра в игре не было вовсе: казну считали по числу мест, и потому её
 * нельзя было ни истощить, ни наполнить. Война не стоила короне ничего, дань не
 * приносила ничего, а заём игрока (этап 133) уходил в пустоту — давать взаймы
 * было некому, потому что тратить было нечего.
 *
 * Здесь у неё есть число. Оно единственное, что эта версия добавляет в
 * состояние из чужого: вывести из мира, сколько у Робла серебра **сейчас**,
 * нельзя — это история его доходов и трат. Доход и расход при этом не хранятся:
 * они считаются из земли, войска и войн, как и всё прочее.
 */

export interface CrownPurse {
  readonly side: string
  /** Сколько в казне сейчас. */
  readonly coin: number
  /** Подать, пошлины, рудники и дань — серебра в сутки. */
  readonly income: number
  /** Войско, гарнизоны, двор и дань на сторону — серебра в сутки. */
  readonly spend: number
  readonly tax: number
  readonly tolls: number
  readonly tribute: number
  readonly army: number
  readonly court: number
  /** Пуста ли казна (Кз3). */
  readonly empty: boolean
  readonly says: string
}

/** Сколько у неё серебра сейчас (Кз1). */
export function coinOf(state: GameState, world: World, side: string, day: number): number {
  const kept = state.crownCoin?.[side]
  if (kept !== undefined) return kept
  // Сейв до 1.0 казны корон не знает: пока такт её не свёл, считаем по земле —
  // ровно тем же счётом, каким её считали до этапа 165.
  return startingCoin(state, world, side)
}

/** С чего корона начинает, если её казну ещё никто не считал. */
export function startingCoin(state: GameState, world: World, side: string): number {
  const land = crownLand(state, world, side)
  return Math.round(land.places * 380 + land.cities * 2600 + land.ports * 3400 + land.mines * 3000)
}

/** Доход и расход, названные по частям (Кз2). */
export function purseOf(state: GameState, world: World, side: string, day: number): CrownPurse {
  const land = crownLand(state, world, side)
  const tax = (land.people / 1000) * COIN.taxPerThousand
  const tolls =
    land.cities * COIN.cityToll + land.ports * COIN.portToll + land.mines * COIN.mineYield
  let tribute = 0
  for (const one of state.politics.tributes) {
    if (one.untilDay < day) continue
    if (one.to === side) tribute += one.perDay
    if (one.from === side) tribute -= one.perDay
  }
  const men = state.bands
    .filter((band) => (band.lordId === PLAYER ? PLAYER : band.kingdomId) === side)
    .reduce((sum, band) => sum + bandSize(band), 0)
  const wars = warsOf(state.politics, side).length
  const army =
    (men * COIN.manWage + land.places * COIN.guardWage * 8) * (wars > 0 ? COIN.warCosts : 1)
  const court = land.places * COIN.courtPerPlace
  const income = Math.round((tax + tolls + Math.max(0, tribute)) * 100) / 100
  const spend = Math.round((army + court + Math.max(0, -tribute)) * 100) / 100
  const coin = coinOf(state, world, side, day)
  const empty = coin < COIN.emptyAt
  return {
    side,
    coin,
    income,
    spend,
    tax: Math.round(tax),
    tolls: Math.round(tolls),
    tribute: Math.round(tribute),
    army: Math.round(army),
    court: Math.round(court),
    empty,
    says: `${side}: в казне ${coin}, приход ${Math.round(income)} в сутки (подать ${Math.round(tax)}, пошлины ${Math.round(tolls)}, дань ${Math.round(tribute)}), расход ${Math.round(spend)} (войско ${Math.round(army)}, двор ${Math.round(court)}).${empty ? ` ${COIN_WORDS.empty}` : ''}`,
  }
}

/** Что станет с казной за такт (Кз1, Кз4). */
export function coinAfterBeat(
  state: GameState,
  world: World,
  side: string,
  day: number,
  days: number,
): { readonly coin: number; readonly borrowed: boolean; readonly broke: boolean } {
  const purse = purseOf(state, world, side, day)
  let coin = purse.coin + Math.round((purse.income - purse.spend) * days)
  // Заём игрока (этап 133) — настоящие деньги: корона их получает и по ним
  // платит. Долг отдаётся долей за такт, и отдаётся он из казны.
  const debt = state.crownDebts?.[side]
  if (debt && debt.owed > 0) {
    coin -= Math.round(debt.owed * COIN.paysDebt)
  }
  let borrowed = false
  let broke = false
  if (coin < 0) {
    // Пустая казна занимает: у своих же городов, у церкви, у кого придётся.
    coin += COIN.borrows
    borrowed = true
    broke = true
  }
  return { coin: Math.max(0, coin), borrowed, broke }
}

/**
 * Как пустая казна меняет поведение (Кз3).
 *
 * Не отдельная ветка ИИ, а два множителя к тому, что уже считается: мира такая
 * ищет первой (этап 163), а войну начинает неохотно (этап 143). Этого хватает,
 * чтобы разорение было видно по её делам, а не по строке в журнале.
 */
export function poorHaste(state: GameState, world: World, side: string, day: number): number {
  return purseOf(state, world, side, day).empty ? COIN.pooreHaste : 1
}

export function poorPressure(state: GameState, world: World, side: string, day: number): number {
  return purseOf(state, world, side, day).empty ? COIN.poorPressure : 1
}

/** Деньги мира в числах (Кз6). */
export function coinRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly total: number
  readonly richest: string | null
  readonly poorest: string | null
  readonly empty: number
  readonly broke: number
  readonly says: string
} {
  const rows = Object.keys(world.kingdoms)
    .map((side) => purseOf(state, world, side, day))
    .sort((a, b) => b.coin - a.coin)
  const total = rows.reduce((sum, one) => sum + one.coin, 0)
  const empty = rows.filter((one) => one.empty).length
  const broke = Object.values(state.coinLog ?? {}).reduce((sum, one) => sum + one, 0)
  return {
    total,
    richest: rows[0]?.side ?? null,
    poorest: rows[rows.length - 1]?.side ?? null,
    empty,
    broke,
    says:
      rows.length === 0
        ? 'Корон в мире нет.'
        : `Серебра у корон ${total}: больше всех у ${rows[0]?.side} (${rows[0]?.coin}), меньше всех у ${rows[rows.length - 1]?.side} (${rows[rows.length - 1]?.coin}); пустых казн ${empty}, разорений за игру ${broke}.`,
  }
}
