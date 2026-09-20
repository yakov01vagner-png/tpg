import { type Companion, following, wishOf, wishShare } from './companion'
import { quarrelsOf } from './companion'
import { KITH, KITH_ASK_DEFS, KITH_WORDS, type KithAsk } from './content/kith'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Спутники, у которых своя жизнь (этап 167).
 *
 * С 0.2 у спутника есть нрав, дело и расположение к тебе: он смотрит на твои
 * поступки и уходит, если насмотрелся. Не хватало того, что делает человека
 * человеком, — он ничего не просил вслух. Дело его двигалось само, доля не
 * просилась, обещания не давались и не нарушались.
 *
 * Здесь он говорит. Ни одной новой сущности это не заводит: просьба выводится
 * из того, что между вами уже есть (годы службы, дело, доля в добыче,
 * расположение), а хранится только обещанное — то, чего из мира не вывести.
 */

/** Обещание спутнику: что и к какому дню. */
export interface Vow {
  readonly who: string
  readonly ask: KithAsk
  readonly day: number
  readonly untilDay: number
  /** День, когда сдержал. Пусто — ещё нет. */
  readonly keptDay?: number
  /** День, когда стало ясно, что не сдержишь. */
  readonly brokenDay?: number
}

export function vowsOf(state: Pick<GameState, 'vows'>): readonly Vow[] {
  return (state.vows ?? []) as readonly Vow[]
}

/**
 * Сколько ему лет (Сп5).
 *
 * Возраст не хранится: он выводится из того, кто он и сколько с тобой. Оттого
 * спутник, взятый молодым, через двадцать лет стар — и это видно без записи.
 */
export function kithAge(one: Companion, day: number): number {
  const seed = hashOf(`age|${one.id}`)
  const years = Math.max(0, (day - (one.since ?? 0)) / 365)
  return Math.round(24 + (seed % 20) + years)
}

/** Сколько лет он с тобой. */
export function kithYears(one: Companion, day: number): number {
  return Math.round((Math.max(0, day - (one.since ?? 0)) / 365) * 10) / 10
}

/**
 * Чего он хочет от тебя сейчас (Сп1, Сп3).
 *
 * Одна просьба на человека, и та — не случайная: она выводится из его дела, его
 * лет с тобой и того, как он к тебе относится. Пока он всем доволен, он ничего
 * не просит, и это тоже ответ.
 */
export function askOf(
  state: GameState,
  one: Companion,
  day: number,
): { readonly ask: KithAsk; readonly says: string } | null {
  const waiting = vowsOf(state).find(
    (vow) => vow.who === one.id && vow.keptDay === undefined && vow.brokenDay === undefined,
  )
  if (waiting) return null
  const years = kithYears(one, day)
  const wish = wishOf(one)
  // Расположение на дне — он просится уйти, и это последнее, о чём он просит.
  if (one.mood <= KITH.leaveMood) {
    return { ask: 'leave', says: `${one.name}: «${KITH_ASK_DEFS.leave.says}»` }
  }
  // Годы службы дают право просить место: это первое, чего просит выслуживший.
  if (years >= KITH.placeYears && one.role.type === 'party') {
    return { ask: 'place', says: `${one.name}: «${KITH_ASK_DEFS.place.says}»` }
  }
  // Дело стоит, а он с тобой не первый год: он просит помощи своему делу.
  if (wish && wishShare(one) < 1 && years >= 1) {
    return {
      ask: 'help',
      says: `${one.name}: «${KITH_ASK_DEFS.help.says}» Дело его: ${wish.says}`,
    }
  }
  // А богатеющий хозяин — право просить долю.
  if (state.character.money >= KITH_ASK_DEFS.share.cost * 4 && years >= 1) {
    return { ask: 'share', says: `${one.name}: «${KITH_ASK_DEFS.share.says}»` }
  }
  return null
}

/** Все просьбы двора походного, по одной на человека (Сп3). */
export function kithAsks(
  state: GameState,
  world: World,
  day: number,
): readonly { readonly who: Companion; readonly ask: KithAsk; readonly says: string }[] {
  const rows: { who: Companion; ask: KithAsk; says: string }[] = []
  for (const one of following(state.companions)) {
    const ask = askOf(state, one, day)
    if (ask) rows.push({ who: one, ask: ask.ask, says: ask.says })
  }
  return rows
}

/** Обещание дано: оно записано, и его ждут (Сп4). */
export function promise(
  vows: readonly Vow[],
  who: string,
  ask: KithAsk,
  day: number,
): readonly Vow[] {
  return [
    ...vows.filter(
      (one) => !(one.who === who && one.keptDay === undefined && one.brokenDay === undefined),
    ),
    { who, ask, day, untilDay: day + KITH_ASK_DEFS[ask].waits },
  ].slice(-KITH.remembers)
}

/** Что стало с обещаниями к этому дню (Сп4). */
export function vowsDue(
  vows: readonly Vow[],
  day: number,
): { readonly vows: readonly Vow[]; readonly broken: readonly Vow[] } {
  const broken: Vow[] = []
  const rows = vows.map((one) => {
    if (one.keptDay !== undefined || one.brokenDay !== undefined) return one
    if (day <= one.untilDay) return one
    const failed = { ...one, brokenDay: day }
    broken.push(failed)
    return failed
  })
  return { vows: rows, broken }
}

/**
 * Что он о тебе помнит (Сп4).
 *
 * Не «расположение 62», а годы, дела, шрамы и то, что ты обещал. Слова берутся
 * из состояния и ничего к нему не добавляют.
 */
export function kithSays(state: GameState, one: Companion, day: number): string {
  const years = kithYears(one, day)
  const mine = vowsOf(state).filter((vow) => vow.who === one.id)
  const broken = mine.filter((vow) => vow.brokenDay !== undefined).length
  const kept = mine.filter((vow) => vow.keptDay !== undefined).length
  const waiting = mine.find((vow) => vow.keptDay === undefined && vow.brokenDay === undefined)
  const age = kithAge(one, day)
  const parts = [
    `${one.name}, ${age} лет: с тобой ${years} г., дел за ним ${one.deeds ?? 0}`,
    one.scar ? `шрам — ${one.scar}` : null,
    kept > 0 ? `сдержанных обещаний ${kept}` : null,
    broken > 0 ? `${KITH_WORDS.brokenWord} Нарушено ${broken}` : null,
    waiting
      ? `${KITH_WORDS.waiting} Ждёт: ${KITH_ASK_DEFS[waiting.ask].label}, срок ${waiting.untilDay}`
      : null,
    age >= KITH.oldAt ? KITH_WORDS.old : null,
  ].filter((part): part is string => part !== null)
  return `${parts.join('; ')}. Расположение ${one.mood}.`
}

/**
 * Кому пора уйти (Сп5).
 *
 * Конец у спутника бывает разный: расположение на дне, годы, своё дело
 * сделано и зовёт дом. Считается это из состояния, а не броском.
 */
export function whoGoes(
  state: GameState,
  world: World,
  day: number,
): readonly { readonly who: Companion; readonly why: string }[] {
  const rows: { who: Companion; why: string }[] = []
  for (const one of following(state.companions)) {
    const age = kithAge(one, day)
    const broken = vowsOf(state).filter(
      (vow) => vow.who === one.id && vow.brokenDay !== undefined,
    ).length
    if (one.mood <= KITH.leaveMood && broken > 0) {
      rows.push({ who: one, why: `${KITH_WORDS.brokenWord} Нарушенных обещаний ${broken}.` })
      continue
    }
    if (age >= KITH.oldAt && (age - KITH.oldAt) * KITH.oldLeaves >= 0.5) {
      rows.push({ who: one, why: `${KITH_WORDS.old} Ему ${age}.` })
    }
  }
  return rows
}

/** Спутники в числах (Сп6). */
export function kithRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly with: number
  readonly asking: number
  readonly kept: number
  readonly broken: number
  readonly oldest: number
  readonly says: string
} {
  const party = following(state.companions)
  const vows = vowsOf(state)
  const kept = vows.filter((one) => one.keptDay !== undefined).length
  const broken = vows.filter((one) => one.brokenDay !== undefined).length
  const oldest = party.reduce((best, one) => Math.max(best, kithAge(one, day)), 0)
  const asking = kithAsks(state, world, day).length
  return {
    with: party.length,
    asking,
    kept,
    broken,
    oldest,
    says:
      party.length === 0
        ? `С тобой никого. Обещаний сдержано ${kept}, нарушено ${broken}.`
        : `С тобой ${party.length}; просят ${asking}; обещаний сдержано ${kept}, нарушено ${broken}; старшему ${oldest}. ${quarrelsOf(state.companions).length > 0 ? 'В отряде ссорятся.' : 'В отряде мир.'}`,
  }
}

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}
