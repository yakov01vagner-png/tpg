import { SOURCE_DEFS, type SourceKind } from './content/known'
import { PLAYER } from './holding'
import { type Known, type Question, type Word, knownTo, spreadOf, truthOf, wordsTo } from './known'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Ложь и проверка (этап 103).
 *
 * Три источника знания уже есть, и каждый из них может соврать: наместник — в
 * свою пользу, посол — по нраву, молва — просто так. Пока враньё ничем не
 * отличается от ошибки, оно ничего не стоит: игрок просто видит числа похуже.
 *
 * Здесь у лжи появляется хозяин и цена. У всякой лжи есть тот, кому выгодно,
 * чтобы в неё поверили, и это выводится, а не назначается. Пойманный на лжи
 * перестаёт быть источником: его вести идут с поправкой, которая помнится
 * годами. А ошибка по ложной вести стоит ровно того, на сколько она разошлась с
 * правдой, — и это считается, а не объявляется.
 */

export const LIES = {
  /** Насколько уличённая ложь расширяет вилку всех прочих вестей от него. */
  liarSpread: 0.5,
  /** И насколько подтверждённая правда её сужает. */
  soothSpread: 0.1,
  /** Сколько лет помнится уличённая ложь. */
  memoryYears: 6,
  /** Расхождение больше этого называется прямым противоречием. */
  clash: 0.3,
} as const

export const LIE_WORDS = {
  none: 'Проверять нечего: об этом говорит один источник.',
  agree: 'Источники сходятся: похоже на правду.',
  clash: 'Источники противоречат друг другу.',
  liar: 'Этот уже врал: верить ему дороже.',
  clean: 'Этот не врал ни разу.',
} as const

/** Память о том, кто как говорил. */
export interface Record_ {
  readonly said: number
  readonly lied: number
}

export function trustOf(state: Pick<GameState, 'trust'>, from: string | null): number {
  if (!from) return 1
  const row = state.trust?.[from]
  if (!row || row.said === 0) return 1
  const share = row.lied / row.said
  return Math.max(0.3, 1 - share)
}

export function trustWords(state: Pick<GameState, 'trust'>, from: string | null): string {
  if (!from) return LIE_WORDS.clean
  const row = state.trust?.[from]
  if (!row || row.lied === 0) return LIE_WORDS.clean
  return `${LIE_WORDS.liar} Врал ${row.lied} раз из ${row.said}.`
}

/** Записать, как этот говорил: правду или нет (Л3, Л4). */
export function remember(
  trust: Readonly<globalThis.Record<string, Record_>> | undefined,
  from: string | null,
  lied: boolean,
): Readonly<globalThis.Record<string, Record_>> {
  if (!from) return trust ?? {}
  const row = trust?.[from] ?? { said: 0, lied: 0 }
  return {
    ...(trust ?? {}),
    [from]: { said: row.said + 1, lied: row.lied + (lied ? 1 : 0) },
  }
}

/**
 * Кому выгодно, чтобы в это поверили (Л1).
 *
 * Считается из того, что весть делает с миром: преуменьшенная чужая сила
 * выгодна тому, о ком весть; преувеличенная своя подать — тому, кто её принёс;
 * ложь о запасе за стенами — тому, кто эти стены держит. Имя выводится, а не
 * назначается.
 */
export function whoGains(
  state: GameState,
  world: World,
  word: Word,
  day: number,
): { readonly who: string; readonly why: string } | null {
  const truth = truthOf(state, world, { kind: word.kind, about: word.about }, day)
  if (typeof truth !== 'number' || typeof word.value !== 'number') return null
  if (truth === word.value) return null
  const less = word.value < truth
  if (word.kind === 'strength' || word.kind === 'garrison' || word.kind === 'stores') {
    const place = state.settlements[word.about]
    const holder = place?.owner ?? word.about
    if (less) {
      return {
        who: holder,
        why: 'Преуменьшенная сила зовёт на себя удар — а удар по тому, кого считают слабым, готовят хуже.',
      }
    }
    return {
      who: holder,
      why: 'Преувеличенная сила отпугивает: на такого не идут, и проверять некому.',
    }
  }
  if (word.kind === 'purse') {
    return less
      ? {
          who: word.from ?? word.about,
          why: 'Малая казна в отчёте — это разница, осевшая в чужом кармане.',
        }
      : { who: word.about, why: 'Богатая казна на словах поднимает цену всякому договору.' }
  }
  return null
}

export interface Weighed {
  readonly best: Known
  readonly other: Known | null
  readonly agree: boolean
  readonly says: string
}

/**
 * Свести два источника (Л2).
 *
 * Сойдутся — веришь обоим; разойдутся — выбираешь того, чья вилка уже с
 * поправкой на его имя. Имя тут и решает: тот, кто уже врал, проигрывает даже
 * со свежей вестью.
 */
export function weigh(state: GameState, world: World, question: Question, day: number): Weighed {
  const heard = wordsTo(state, PLAYER)
    .filter((one) => one.kind === question.kind && one.about === question.about)
    .map((one) => ({
      word: one,
      spread: spreadOf(one.source, day - one.day, 3) / trustOf(state, one.from),
    }))
    .sort((a, b) => a.spread - b.spread)
  const best = knownTo(state, world, PLAYER, question, day)
  const second = heard[1]
  if (!second) return { best, other: null, agree: true, says: LIE_WORDS.none }
  const other: Known = {
    ...best,
    value: second.word.value,
    source: second.word.source,
    from: second.word.from,
    day: second.word.day,
    age: day - second.word.day,
    spread: second.spread,
    says: `${SOURCE_DEFS[second.word.source].label}${second.word.from ? ` (${second.word.from})` : ''}`,
  }
  const agree = !differs(best.value, other.value)
  return {
    best,
    other,
    agree,
    says: agree
      ? `${LIE_WORDS.agree} ${best.says}`
      : `${LIE_WORDS.clash} ${best.says} против: ${other.says} — ${other.value}. Веришь первому: ${trustWords(state, best.from)}`,
  }
}

function differs(a: number | string | null, b: number | string | null): boolean {
  if (a === null || b === null) return false
  if (typeof a === 'string' || typeof b === 'string') return a !== b
  const bigger = Math.max(Math.abs(a), Math.abs(b), 1)
  return Math.abs(a - b) / bigger >= LIES.clash
}

/**
 * Во что обошлась ошибка (Л5).
 *
 * Не «ты ошибся», а «ты действовал по числу, которое разошлось с правдой
 * настолько». Считается разницей и тем, что на эту разницу опиралось.
 */
export function mistakeOf(
  state: GameState,
  world: World,
  known: Known,
  day: number,
): { readonly off: number; readonly says: string } {
  const truth = truthOf(state, world, { kind: known.kind, about: known.about }, day)
  if (typeof truth !== 'number' || typeof known.value !== 'number') {
    return { off: 0, says: 'Сверить не с чем.' }
  }
  const bigger = Math.max(Math.abs(truth), 1)
  const off = Math.round((Math.abs(truth - known.value) / bigger) * 100) / 100
  return {
    off,
    says:
      off === 0
        ? 'Сошлось точно.'
        : `Ты знал ${known.value}, на деле ${truth}: разошлось на ${Math.round(off * 100)} из ста${known.source ? ` (${SOURCE_DEFS[known.source].label})` : ''}.`,
  }
}

export interface LieLedger {
  readonly sources: number
  readonly liars: number
  readonly lies: number
  readonly says: string
}

/** Ложь в числах (Л6). */
export function lieLedger(state: Pick<GameState, 'trust'>): LieLedger {
  const rows = Object.entries(state.trust ?? {})
  const liars = rows.filter(([, one]) => one.lied > 0)
  const lies = liars.reduce((sum, [, one]) => sum + one.lied, 0)
  return {
    sources: rows.length,
    liars: liars.length,
    lies,
    says:
      rows.length === 0
        ? 'Источников у тебя пока нет — и обманывать тебя некому.'
        : `Источников ${rows.length}, врали ${liars.length}, лжей поймано ${lies}: ${liars.map(([name, one]) => `${name} (${one.lied} из ${one.said})`).join(', ') || 'ни одной'}.`,
  }
}

export type { SourceKind }
