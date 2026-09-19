import type { LogKind } from './events'
import { bynameOf } from './fame'
import type { GameState, LogEntry } from './state'
import { DAYS_PER_YEAR, dayOf, formatDate, yearOf } from './time'

/**
 * Летопись как история (этап 69).
 *
 * Журнал был лентой: сто строк подряд, и чем дальше, тем меньше смысла. Но
 * прожитое — это не лента, а главы: год, в который случилось главное, и то, что
 * его наполнило. Здесь ничего нового не считается — всё уже записано в журнале;
 * это способ его прочитать.
 */

/** Что считается делом мира, а что — твоим. */
const WORLD_KINDS: readonly LogKind[] = ['war', 'plague', 'world']

export interface Chapter {
  readonly year: number
  /** Как называется этот год: по главному, что в нём случилось. */
  readonly title: string
  readonly lines: readonly LogEntry[]
  /** Сколько в нём было твоего и сколько мирового. */
  readonly own: number
  readonly world: number
}

/**
 * Главное в этом году — по тому, чего в нём было больше.
 *
 * Не «событие с наибольшим весом»: веса у событий нет и не должно быть. Год
 * называется тем, чем он был занят, — войной, дорогой, торгом, людьми.
 */
function titleOf(lines: readonly LogEntry[]): string {
  const tally = new Map<LogKind, number>()
  for (const line of lines) tally.set(line.kind, (tally.get(line.kind) ?? 0) + 1)
  let top: LogKind = 'notice'
  let most = 0
  for (const [kind, count] of tally) {
    if (count > most) {
      most = count
      top = kind
    }
  }
  switch (top) {
    case 'war':
      return 'Год войны'
    case 'plague':
      return 'Год мора'
    case 'trade':
      return 'Год торга'
    case 'people':
      return 'Год людей'
    case 'money':
      return 'Год трудов'
    case 'skill':
    case 'level':
    case 'rank':
      return 'Год учения'
    case 'world':
      return 'Год, когда мир менялся'
    default:
      return 'Год дороги'
  }
}

/**
 * Летопись главами (И1).
 *
 * Год — глава. Пустые годы не пишутся: в летописи нет строки «в этот год не
 * случилось ничего», потому что такой год и не помнят.
 */
export function chaptersOf(state: Pick<GameState, 'log'>): readonly Chapter[] {
  const byYear = new Map<number, LogEntry[]>()
  for (const line of state.log) {
    const year = yearOf(dayOf(line.time))
    const list = byYear.get(year) ?? []
    list.push(line)
    byYear.set(year, list)
  }
  const out: Chapter[] = []
  for (const [year, lines] of [...byYear.entries()].sort((a, b) => a[0] - b[0])) {
    const world = lines.filter((one) => WORLD_KINDS.includes(one.kind)).length
    out.push({
      year,
      title: titleOf(lines),
      lines,
      own: lines.length - world,
      world,
    })
  }
  return out
}

/**
 * Летопись мира (И6 и И2).
 *
 * Что случилось без тебя: войны, моры, смены хозяев. Ты этого не делал — но ты
 * при этом был, и потому оно в твоей летописи тоже, только отдельной книгой.
 */
export function worldChronicle(state: Pick<GameState, 'log'>): readonly Chapter[] {
  return chaptersOf({ log: state.log.filter((one) => WORLD_KINDS.includes(one.kind)) })
}

/** И то, что делал ты: вторая книга той же летописи. */
export function ownChronicle(state: Pick<GameState, 'log'>): readonly Chapter[] {
  return chaptersOf({ log: state.log.filter((one) => !WORLD_KINDS.includes(one.kind)) })
}

// --- летопись рода (И4) -----------------------------------------------------

/**
 * Одно колено рода.
 *
 * Пишется, когда имя переходит к наследнику: что этот человек успел, чем его
 * запомнили и сколько он прожил. Дальше летопись идёт дальше — сын читает
 * жизнь отца, а не начинает с чистого листа.
 */
export interface Generation {
  readonly name: string
  /** Прозвище, под которым его запомнили. */
  readonly byname: string | null
  readonly fromDay: number
  readonly toDay: number
  /** Сколько за ним побед и сколько владений. */
  readonly battles: number
  readonly holdings: number
  /** Одной строкой: чем был этот человек. */
  readonly said: string
}

export function houseOf(state: Pick<GameState, 'house'>): readonly Generation[] {
  return state.house ?? []
}

/** Записать колено: что о нём скажут, когда имя перейдёт дальше. */
export function closeGeneration(
  state: Pick<GameState, 'character' | 'fame' | 'battlesWon' | 'renown'>,
  fromDay: number,
  toDay: number,
  holdings: number,
): Generation {
  const byname = bynameOf(state)
  const years = Math.max(0, Math.floor((toDay - fromDay) / DAYS_PER_YEAR))
  const said =
    state.battlesWon > 8
      ? 'Прожил жизнь на войне.'
      : holdings > 2
        ? 'Собрал землю и удержал её.'
        : state.renown > 10
          ? 'Имя его знали дальше, чем он бывал.'
          : years > 25
            ? 'Прожил долго и тихо.'
            : 'О нём говорят немного.'
  return {
    name: state.character.name,
    byname: byname?.label ?? null,
    fromDay,
    toDay,
    battles: state.battlesWon,
    holdings,
    said,
  }
}

// --- карта памяти (И5) ------------------------------------------------------

export type Marks = Readonly<Record<string, number>>

export function marksAt(state: Pick<GameState, 'marks'>, locationId: string): number {
  return state.marks?.[locationId] ?? 0
}

/** Отметить место: здесь с тобой что-то было. */
export function withMark(marks: Marks | undefined, locationId: string): Marks {
  return { ...(marks ?? {}), [locationId]: (marks?.[locationId] ?? 0) + 1 }
}

/** Места с историей: где ты бывал не мимоходом. */
export function rememberedPlaces(state: Pick<GameState, 'marks'>): readonly string[] {
  return Object.entries(state.marks ?? {})
    .filter(([, times]) => times > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
}

/** Одной строкой: что за место для тебя. */
export function markWord(times: number): string {
  if (times <= 0) return ''
  if (times === 1) return 'здесь что-то было'
  if (times < 4) return 'место с историей'
  return 'здесь прошла часть твоей жизни'
}

/** Как летопись говорит о дне. */
export function chronicleDate(day: number): string {
  return formatDate(day)
}
