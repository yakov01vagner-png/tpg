import { HASHED, ROLL_INVERSE, ROLL_STEP, ROLL_WORDS } from './content/rolls'
import type { Rng } from './rng'

/**
 * Случайность, которую видно (этап 207).
 *
 * Поток случайности в игре один, он лежит в состоянии и передаётся явно
 * (правило репозитория №4). Чего нельзя было сделать — посмотреть на него:
 * сколько бросков стоит такт, где они тратятся, не завёл ли новый слой своей
 * случайности втихую.
 *
 * Считать броски оказалось можно, ничего не храня. У mulberry32 состояние
 * сдвигается на одно и то же число за бросок, и разность двух состояний,
 * умноженная на обратное к шагу, — это и есть число бросков между ними.
 */

/** Сколько бросков сделано между двумя состояниями генератора (Сл2). */
export function rollsBetween(from: Rng, to: Rng): number {
  const delta = (to.state - from.state) >>> 0
  return Math.imul(delta, ROLL_INVERSE) >>> 0
}

/**
 * Проверка самого счёта: столько ли бросков, сколько насчитали.
 *
 * Счёт по разности верен, только если поток шёл вперёд шагом `ROLL_STEP`.
 * Здесь это доказывается прямо: состояние прокручивается вперёд на насчитанное
 * число шагов и обязано совпасть.
 */
export function rollsMatch(from: Rng, to: Rng, counted: number): boolean {
  let state = from.state >>> 0
  for (let i = 0; i < counted; i += 1) state = (state + ROLL_STEP) >>> 0
  return state === to.state >>> 0
}

/** Где случайности нет нарочно (Сл4). */
export function hashedNotRolled(): readonly string[] {
  return HASHED.map((one) => `${one.what}: ${one.why}`)
}

/** Случайность в числах (Сл6). */
export function rollRoll(
  from: Rng,
  to: Rng,
  days: number,
): {
  readonly rolls: number
  readonly perDay: number
  readonly says: string
} {
  const rolls = rollsBetween(from, to)
  const perDay = days > 0 ? Math.round((rolls / days) * 100) / 100 : rolls
  return {
    rolls,
    perDay,
    says: `${ROLL_WORDS.one} ${ROLL_WORDS.counted} Бросков ${rolls} за ${days} сут — ${perDay} на сутки. ${ROLL_WORDS.hashed}`,
  }
}
