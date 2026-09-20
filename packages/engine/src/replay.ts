import { type Command, applyCommand } from './commands'
import { REPLAY, REPLAY_WORDS } from './content/replay'
import { serialize } from './save'
import type { GameState } from './state'

/**
 * Повтор (этап 206).
 *
 * Правило репозитория №4 обещает: из одного сейва одна и та же команда даёт
 * один и тот же результат. Обещание это проверялось на отдельных тактах и ни
 * разу — на длинной цепи через `applyCommand`, с записью и загрузкой
 * посередине. А за 1.0 в такт вошли четыре подсказки со стороны — давление,
 * счёт войны, охота воевать и учение, — и каждая из них была новой
 * возможностью утечь.
 *
 * Здесь повтор становится величиной, которую можно померить: у состояния есть
 * отпечаток, у расхождения — место и имя поля, у цепи — длина и число сверок.
 */

/**
 * Отпечаток состояния.
 *
 * Сравнивать состояния целиком дорого и неудобно: отпечаток — одно число,
 * которое меняется от любой разницы в сейве. Хэш тот же FNV-1a, что во всём
 * ядре: своего у повтора нет ничего.
 */
export function fingerprint(state: GameState): number {
  const text = serialize(state)
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

export interface Divergence {
  /** Путь до поля: `politics.wars.0.since`. */
  readonly path: string
  readonly mine: string
  readonly theirs: string
  readonly says: string
}

/**
 * Первое расхождение двух состояний (Пв4).
 *
 * Не «повтор сломался», а «на поле `politics.wars.0.since` было 300, стало
 * 301»: без этого искать утечку приходится глазами по мегабайту сейва.
 */
export function firstDifference(a: GameState, b: GameState): Divergence | null {
  const mine = JSON.parse(serialize(a)) as unknown
  const theirs = JSON.parse(serialize(b)) as unknown
  const found = walk(mine, theirs, '')
  if (!found) return null
  return {
    ...found,
    says: `${REPLAY_WORDS.broke} Поле «${found.path}»: было ${found.mine}, стало ${found.theirs}.`,
  }
}

function walk(
  mine: unknown,
  theirs: unknown,
  path: string,
): { path: string; mine: string; theirs: string } | null {
  if (mine === theirs) return null
  const shown = (one: unknown) => {
    const text = JSON.stringify(one) ?? 'undefined'
    return text.length > REPLAY.shows ? `${text.slice(0, REPLAY.shows)}…` : text
  }
  if (
    typeof mine !== 'object' ||
    typeof theirs !== 'object' ||
    mine === null ||
    theirs === null ||
    Array.isArray(mine) !== Array.isArray(theirs)
  ) {
    return { path: path || '(целиком)', mine: shown(mine), theirs: shown(theirs) }
  }
  if (Array.isArray(mine) && Array.isArray(theirs)) {
    if (mine.length !== theirs.length) {
      return {
        path: `${path}.length`,
        mine: String(mine.length),
        theirs: String(theirs.length),
      }
    }
    for (let i = 0; i < mine.length; i += 1) {
      const found = walk(mine[i], theirs[i], `${path}.${i}`)
      if (found) return found
    }
    return null
  }
  const left = mine as Record<string, unknown>
  const right = theirs as Record<string, unknown>
  // Ключи берутся из обоих: поле, появившееся только с одной стороны, — это
  // расхождение, и самое коварное из них.
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])]
  for (const key of keys) {
    const found = walk(left[key], right[key], path ? `${path}.${key}` : key)
    if (found) return found
  }
  return null
}

export interface Replay {
  readonly state: GameState
  /** Отпечаток после каждой исполненной команды. */
  readonly marks: readonly number[]
  /** Сколько команд отказом не прошло: отказ — тоже часть повтора. */
  readonly refused: number
}

/** Проиграть цепь команд от одного состояния (Пв1). */
export function replayOf(state: GameState, commands: readonly Command[]): Replay {
  let current = state
  const marks: number[] = []
  let refused = 0
  for (const command of commands) {
    const result = applyCommand(current, command)
    if (result.ok) current = result.state
    else refused += 1
    marks.push(fingerprint(current))
  }
  return { state: current, marks, refused }
}

/** Где две цепи разошлись: ход, а не только поле (Пв4). */
export function partedAt(mine: Replay, theirs: Replay): number | null {
  const length = Math.min(mine.marks.length, theirs.marks.length)
  for (let i = 0; i < length; i += 1) {
    if (mine.marks[i] !== theirs.marks[i]) return i
  }
  return mine.marks.length === theirs.marks.length ? null : length
}

/** Повтор в числах (Пв6). */
export function replayRoll(
  mine: Replay,
  theirs: Replay,
): {
  readonly length: number
  readonly checks: number
  readonly parted: number | null
  readonly says: string
} {
  const parted = partedAt(mine, theirs)
  return {
    length: mine.marks.length,
    checks: Math.min(mine.marks.length, theirs.marks.length),
    parted,
    says:
      parted === null
        ? `${REPLAY_WORDS.held} Цепь ${mine.marks.length} команд, сверок ${mine.marks.length}, отказов ${mine.refused}.`
        : `${REPLAY_WORDS.broke} Разошлись на ${parted + 1}-й команде из ${mine.marks.length}.`,
  }
}
