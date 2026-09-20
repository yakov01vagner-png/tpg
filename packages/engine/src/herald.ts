import { HERALD, HERALD_WORDS } from './content/herald'
import { PLAYER, holdingsOf } from './holding'
import type { GameState } from './state'
import { hopsBetween } from './world/queries'
import type { World } from './world/types'

/**
 * Вести с войны (этап 175).
 *
 * О бое в журнале появлялась строка — мгновенно и точно. Оттого война, которую
 * ведёшь не ты, была таблицей: не бывало ни запоздавшей вести, ни привранной,
 * ни двух победителей одной битвы.
 *
 * Здесь о бое приходит рассказ, и приходит он тем же слоем, каким ходит всё
 * прочее знание (0.8): с опозданием по расстоянию и с ошибкой по тому, кто
 * пишет. Обе стороны при этом правы — каждая по-своему, и в летописи остаются
 * обе версии.
 */

/** Реляция: что, где, чем кончилось — и когда об этом узнают. */
export interface Relation {
  readonly id: string
  /** Кто прислал: своя сторона или чужая. */
  readonly from: string
  readonly where: string
  readonly day: number
  /** Когда весть дойдёт. */
  readonly comesDay: number
  /** Как было на самом деле: победа ли это для `from`. */
  readonly won: boolean
  /** Что сказано: во сколько раз названные потери расходятся с правдой. */
  readonly off: number
  readonly fell: number
  readonly told: number
  readonly says: string
}

export function relationsOf(state: Pick<GameState, 'relations'>): readonly Relation[] {
  return (state.relations ?? []) as readonly Relation[]
}

/**
 * Составить реляцию о бое (Рл1, Рл2, Рл3).
 *
 * Пишущий привирает в свою пользу: своё поражение мельчает, своя победа
 * растёт. Идёт весть столько, сколько до неё вёрст, — и всё это время та
 * сторона живёт по-старому.
 */
export function relationFrom(
  world: World,
  options: {
    readonly from: string
    readonly where: string
    readonly to: string
    readonly day: number
    readonly won: boolean
    readonly fell: number
  },
): Relation {
  const hops = hopsBetween(world, options.where, options.to) ?? 4
  const comesDay = options.day + Math.max(1, Math.round(hops * HERALD.perHop))
  // Своё поражение мельчат, свою победу растят: и то и другое в одну сторону.
  const off = options.won ? HERALD.ourGild : -HERALD.theirHide
  const told = Math.max(0, Math.round(options.fell * (1 - off)))
  return {
    id: `relation:${options.from}:${options.where}:${options.day}`,
    from: options.from,
    where: options.where,
    day: options.day,
    comesDay,
    won: options.won,
    off,
    fell: options.fell,
    told,
    says: `${HERALD_WORDS.came} ${world.locations[options.where]?.name ?? options.where}: ${
      options.won ? 'поле за нами' : 'поле осталось за ними'
    }, пало ${told}. Весть шла ${comesDay - options.day} сут.`,
  }
}

/** Реляции, дошедшие к этому дню (Рл2). */
export function arrived(state: GameState, day: number): readonly Relation[] {
  return relationsOf(state).filter((one) => one.comesDay <= day)
}

/** И те, что ещё в пути: по ним решать нельзя, потому что их ещё нет. */
export function onTheWay(state: GameState, day: number): readonly Relation[] {
  return relationsOf(state).filter((one) => one.comesDay > day)
}

/**
 * Своя правда у каждой стороны (Рл3).
 *
 * Об одном и том же бое пишут обе стороны, и обе пишут о победе. Ни одна из
 * них не врёт больше другой: врут они одинаково и в свою сторону.
 */
export function bothSides(
  world: World,
  a: { readonly side: string; readonly where: string; readonly day: number; readonly fell: number },
  b: { readonly side: string; readonly fell: number },
  to: string,
): readonly [Relation, Relation] {
  return [
    relationFrom(world, { from: a.side, where: a.where, to, day: a.day, won: true, fell: a.fell }),
    relationFrom(world, { from: b.side, where: a.where, to, day: a.day, won: true, fell: b.fell }),
  ]
}

/**
 * Что весть делает со своей землёй (Рл4).
 *
 * Проигранная война доходит до своих людей и меняет их: в местах ропщут,
 * подать идёт хуже, в отряд идут неохотнее. Выигранная — наоборот, и меньше.
 */
export function homeMood(
  state: GameState,
  day: number,
): { readonly shift: number; readonly says: string } {
  const fresh = arrived(state, day).filter((one) => day - one.comesDay <= HERALD.fresh)
  const lost = fresh.filter((one) => one.from === PLAYER && !one.won).length
  const won = fresh.filter((one) => one.from === PLAYER && one.won).length
  const shift = lost * HERALD.defeatUnrest + won * HERALD.victoryCheer
  const places = holdingsOf(state.settlements, PLAYER).length
  return {
    shift,
    says:
      fresh.length === 0
        ? 'С войны ничего не приходило: дома спокойно.'
        : `${lost > won ? HERALD_WORDS.home : 'Победы дошли до своих: в местах говорят о тебе доброе.'} Мест ${places}, сдвиг настроения ${shift}.`,
  }
}

/** Решение по вести, которая врала (Рл5). */
export function wasWrong(one: Relation): boolean {
  return Math.abs(one.off) >= HERALD.wrongAt
}

/** Вести с войны в числах (Рл6). */
export function heraldRoll(
  state: GameState,
  day: number,
): {
  readonly sent: number
  readonly arrived: number
  readonly waiting: number
  readonly off: number
  readonly wrong: number
  readonly says: string
} {
  const rows = relationsOf(state)
  const came = arrived(state, day)
  const off =
    rows.length === 0
      ? 0
      : Math.round((rows.reduce((sum, one) => sum + Math.abs(one.off), 0) / rows.length) * 100) /
        100
  const wrong = rows.filter((one) => wasWrong(one)).length
  return {
    sent: rows.length,
    arrived: came.length,
    waiting: rows.length - came.length,
    off,
    wrong,
    says:
      rows.length === 0
        ? 'Реляций с войны не приходило.'
        : `Реляций ${rows.length}: дошло ${came.length}, в пути ${rows.length - came.length}; средняя ошибка ${Math.round(off * 100)} из ста, врущих ${wrong}. ${HERALD_WORDS.both}`,
  }
}

export function rememberRelation(rows: readonly Relation[], one: Relation): readonly Relation[] {
  return [...rows.filter((row) => row.id !== one.id), one].slice(-HERALD.remembers)
}
