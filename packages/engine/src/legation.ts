import { LEGATION, LEGATION_WORDS, WELCOME_DEFS, type WelcomeId } from './content/legation'
import { PLAYER } from './holding'
import { residentsOf } from './resident'
import type { GameState } from './state'
import { hopsBetween } from './world/queries'
import type { World } from './world/types'

/**
 * Посольство как люди (этап 193).
 *
 * Посол с 0.8 — человек с нравом и умением, и этим всё кончается: дорога
 * ничего не стоит, приём ничего не значит, резидент не стареет и не обрастает
 * связями, а чужое посольство у тебя — строка с ответом.
 *
 * Здесь посольство становится дорогой, приёмом и людьми, которые за это время
 * меняются. Ничего нового не хранится: посол, резидент и двор уже есть.
 */

/** Во что обходится дорога и что она делает с послом (Пс2). */
export function roadFor(
  state: GameState,
  world: World,
  to: string,
  day: number,
): {
  readonly days: number
  readonly costs: number
  readonly wears: number
  readonly says: string
} {
  const from = state.locationId
  const seat = Object.values(state.settlements).find(
    (one) => one.owner === `crown:${to}` && one.population > 0,
  )
  const hops = seat ? (hopsBetween(world, from, seat.locationId) ?? 6) : 6
  const days = Math.max(2, hops * LEGATION.perHop)
  const costs = Math.round(days * LEGATION.perDay)
  const wears = Math.round((days / 10) * LEGATION.roadWears * 100) / 100
  return {
    days,
    costs,
    wears,
    says: `${days} сут. пути и ${costs} серебра на содержание. ${LEGATION_WORDS.road} Умение посла падает на ${Math.round(wears * 100)} из ста.`,
  }
}

/** Как принять чужое посольство (Пс5). */
export function welcomes(
  state: GameState,
  world: World,
  day: number,
): readonly { readonly id: WelcomeId; readonly costs: number; readonly says: string }[] {
  return (Object.keys(WELCOME_DEFS) as WelcomeId[]).map((id) => ({
    id,
    costs: WELCOME_DEFS[id].costs,
    says: `${WELCOME_DEFS[id].label}: ${WELCOME_DEFS[id].costs} серебра, отношение ${WELCOME_DEFS[id].mood > 0 ? '+' : ''}${WELCOME_DEFS[id].mood}. ${WELCOME_DEFS[id].says}`,
  }))
}

/** Что привозит посол (Пс3). */
export function bringsBack(
  state: GameState,
  world: World,
  to: string,
  day: number,
): readonly string[] {
  const road = roadFor(state, world, to, day)
  return [
    'ответ: то, что тебе сказали вслух',
    `картину двора: кто там в силе, кто в опале (с поправкой на ${Math.round(road.wears * 100)} из ста)`,
    'свои домыслы: он тоже человек и тоже ошибается',
  ]
}

/** Резидент, который прижился (Пс4). */
export function rootedThere(
  state: GameState,
  world: World,
  day: number,
): readonly {
  readonly where: string
  readonly years: number
  readonly sees: number
  readonly risk: number
  readonly says: string
}[] {
  return residentsOf(state).map((one) => {
    const years = Math.max(0, Math.round(((day - one.sinceDay) / 365) * 10) / 10)
    const rooted = years >= LEGATION.rootsYears
    return {
      where: one.at,
      years,
      sees: rooted ? LEGATION.rootsSee : 1,
      risk: rooted ? LEGATION.rootsRisk : 0,
      says: rooted
        ? `${one.at}: сидит ${years} г. ${LEGATION_WORDS.roots} Видит ×${LEGATION.rootsSee}, попадается ${Math.round(LEGATION.rootsRisk * 100)} из ста за такт.`
        : `${one.at}: сидит ${years} г. Пока присматривается.`,
    }
  })
}

/** Посольства в числах (Пс6). */
export function legationRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly sent: number
  readonly residents: number
  readonly rooted: number
  readonly says: string
} {
  const log = state.envoyLog ?? { sent: 0, brought: 0, offSum: 0, guests: 0 }
  const rows = rootedThere(state, world, day)
  const rooted = rows.filter((one) => one.sees > 1).length
  return {
    sent: log.sent,
    residents: rows.length,
    rooted,
    says: `Послано ${log.sent}, привезли ${log.brought}; резидентов ${rows.length}, из них прижилось ${rooted}. ${LEGATION_WORDS.brings}`,
  }
}
