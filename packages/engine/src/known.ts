import { bandSize } from './band'
import {
  ASKED_DEFS,
  KNOWN,
  KNOWN_WORDS,
  type QuestionKind,
  SOURCE_DEFS,
  type SourceKind,
} from './content/known'
import { storeDays } from './fort'
import { PLAYER, garrisonSize } from './holding'
import { strengthOf } from './mind'
import { crownGame } from './mind'
import type { GameState } from './state'
import { crownPurse } from './theirs'
import { neighbourSettlements } from './world/queries'
import type { World } from './world/types'

/**
 * Знание как вещь (этап 99).
 *
 * До 0.8 в игре было одно состояние мира и один способ его читать: спросил —
 * получил точное число. Оттого власть стоила дешевле, чем должна: решать легко,
 * когда не бывает неизвестного, и ошибаться можно только по невнимательности.
 *
 * Здесь между правдой и тем, кто спрашивает, встаёт слой. Правило простое:
 * **в ядре остаётся правда** — сколько у Робла войска, знает состояние, и тесты
 * читают это напрямую, как читали. Но всякий, кто спрашивает мир — игрок или
 * корона, — получает не число, а ответ: значение, источник, день, когда его
 * узнали, и вилку, в которой оно может лежать.
 *
 * Второго состояния не заводится. Знание выводится из правды и из вестей,
 * которые кто-то принёс (`words`); вилка считается по источнику, возрасту и
 * расстоянию. Поэтому знание нельзя рассогласовать с миром: его не хранят.
 */

/** Весть: то, что кто-то принёс. */
export interface Word {
  readonly id: string
  /** Кому принесли. */
  readonly to: string
  readonly kind: QuestionKind
  /** О ком или о чём. */
  readonly about: string
  /** Что сказано: число или место. */
  readonly value: number | string
  readonly source: SourceKind
  /** Кто именно сказал, если у вести есть имя. */
  readonly from: string | null
  readonly day: number
}

export interface Question {
  readonly kind: QuestionKind
  readonly about: string
}

/** Ответ мира: не число, а знание о числе. */
export interface Known {
  readonly kind: QuestionKind
  readonly about: string
  /** Что известно. Ноль вестей — `null`, и это честный ответ. */
  readonly value: number | string | null
  readonly source: SourceKind | null
  readonly from: string | null
  /** Когда узнали и сколько суток назад это было. */
  readonly day: number
  readonly age: number
  /** Вилка: доля, на которую значение может отличаться от правды. */
  readonly spread: number
  /** Расходятся ли источники. */
  readonly clash: boolean
  readonly says: string
}

export function sourceDef(source: SourceKind) {
  return SOURCE_DEFS[source]
}

export function askedDef(kind: QuestionKind) {
  return ASKED_DEFS[kind]
}

export function wordsOf(state: Pick<GameState, 'words'>): readonly Word[] {
  return state.words ?? []
}

/** Вести, принесённые этому: своя память о мире. */
export function wordsTo(state: Pick<GameState, 'words'>, who: string): readonly Word[] {
  return wordsOf(state).filter((one) => one.to === who)
}

// --- правда (то, что знает состояние) ---------------------------------------

/**
 * Как оно есть на самом деле.
 *
 * Эта функция — не для игрока: она для мира, для тестов и для того, чтобы было
 * с чем сравнивать. Всё, что видит игрок, проходит через `knownTo`.
 */
export function truthOf(
  state: GameState,
  world: World,
  question: Question,
  day: number,
): number | string | null {
  if (question.kind === 'strength') return strengthOf(state, world, question.about, day).score
  if (question.kind === 'garrison') {
    const place = state.settlements[question.about]
    return place ? garrisonSize(place) : null
  }
  if (question.kind === 'stores') {
    const place = state.settlements[question.about]
    return place ? storeDays(place) : null
  }
  if (question.kind === 'host') {
    const band = state.bands.find((one) => one.id === question.about)
    return band ? band.locationId : null
  }
  if (question.kind === 'aim') {
    if (question.about === PLAYER) return null
    return crownGame(state, world, question.about, day).aim
  }
  if (question.kind === 'way') {
    // Продвижение по пути (этап 135) глазами не видно: его только слышат.
    // Правда о нём считается в dread.ts, а сюда доходит вестями.
    return null
  }
  if (question.kind === 'purse') {
    if (question.about === PLAYER) return state.character.money
    // С этапа 165 чужая казна — настоящее число, и правда о ней есть. Дойти до
    // спрашивающего она может только вестями: своими глазами чужой казны не
    // видят (этап 165, Кз5).
    return crownPurse(state, world, question.about, day)
  }
  return null
}

// --- знание (то, что доходит до спрашивающего) ------------------------------

/** Насколько широка вилка у такой вести. */
export function spreadOf(source: SourceKind, age: number, hops: number): number {
  const def = SOURCE_DEFS[source]
  const years = Math.max(0, age) / 365
  return (
    Math.round(
      (def.spread + years * KNOWN.agePerYear * def.ages + Math.max(0, hops) * KNOWN.perHop) * 100,
    ) / 100
  )
}

/**
 * Видит ли он это своими глазами.
 *
 * Своими глазами видно то, что рядом: своё место, место, где ты стоишь, и то,
 * где стоят твои люди. Это и есть та единственная точность, которая доступна
 * всегда, — и потому она стоит времени (этап 102).
 */
export function seesNow(state: GameState, world: World, who: string, question: Question): boolean {
  const where = placeOfQuestion(state, question)
  if (!where) return false
  // Своими глазами — значит своими: владение местом не заменяет присутствия.
  // Именно здесь версия 0.8 расходится с прежними: о своей дальней земле
  // государь знает по донесениям (этап 100), а не по праву собственности.
  // Запас и гарнизон — то, что за стенами: стоять рядом мало, надо быть внутри.
  // Иначе осада снова считалась бы при открытых картах (этап 113).
  const inside = question.kind === 'stores' || question.kind === 'garrison'
  const place = state.settlements[where]
  if (who === PLAYER) {
    const ours = place?.owner === PLAYER
    if (inside && !ours) return false
    if (state.locationId === where) return true
    return state.bands.some((one) => one.lordId === PLAYER && one.locationId === where)
  }
  if (inside) {
    const owner = place?.owner ?? null
    const theirs =
      owner === `crown:${who}` ||
      state.politics.lords.some((lord) => lord.id === owner && lord.kingdomId === who)
    if (!theirs) return false
  }
  if (seatOf(state, who) === where) return true
  return state.bands.some((one) => one.kingdomId === who && one.locationId === where)
}

/** О каком месте этот вопрос, если он о месте. */
function placeOfQuestion(state: GameState, question: Question): string | null {
  if (question.kind === 'garrison' || question.kind === 'stores') return question.about
  if (question.kind === 'host') {
    return state.bands.find((one) => one.id === question.about)?.locationId ?? null
  }
  return null
}

/** Сколько переходов от спрашивающего до того, о чём он спрашивает. */
export function hopsTo(state: GameState, world: World, who: string, question: Question): number {
  const where = placeOfQuestion(state, question)
  const from = who === PLAYER ? state.locationId : seatOf(state, who)
  if (!where || !from) return 6
  if (where === from) return 0
  const near = neighbourSettlements(world, from, 8)
  return near.find((one) => one.id === where)?.hops ?? 9
}

function seatOf(state: GameState, side: string): string | null {
  let best: { id: string; population: number } | null = null
  for (const one of Object.values(state.settlements)) {
    if (!one.owner || one.population <= 0) continue
    const owner = one.owner
    const theirs =
      owner === `crown:${side}` ||
      state.politics.lords.some((lord) => lord.id === owner && lord.kingdomId === side)
    if (!theirs) continue
    if (!best || one.population > best.population) {
      best = { id: one.locationId, population: one.population }
    }
  }
  return best?.id ?? null
}

/**
 * Что он об этом знает (З1–З4).
 *
 * Сначала глаза: увиденное сейчас точно и не стареет. Потом вести: берётся самая
 * полезная — не самая свежая и не самая надёжная, а та, у которой вилка уже.
 * Если две годные вести говорят разное — это расхождение, и оно названо.
 */
export function knownTo(
  state: GameState,
  world: World,
  who: string,
  question: Question,
  day: number,
): Known {
  const truth = truthOf(state, world, question, day)
  const blank: Known = {
    kind: question.kind,
    about: question.about,
    value: null,
    source: null,
    from: null,
    day: 0,
    age: 0,
    spread: 0,
    clash: false,
    says: KNOWN_WORDS.unknown,
  }
  if (seesNow(state, world, who, question)) {
    return {
      ...blank,
      value: truth,
      source: 'eyes',
      day,
      age: 0,
      spread: 0,
      says: `${sourceDef('eyes').label}: ${KNOWN_WORDS.eyes}`,
    }
  }
  const hops = hopsTo(state, world, who, question)
  const heard = wordsTo(state, who)
    .filter(
      (one) =>
        one.kind === question.kind &&
        one.about === question.about &&
        day - one.day <= KNOWN.keepDays,
    )
    // Имя источника меняет цену его вести (этап 103): тот, кто уже врал,
    // проигрывает даже со свежей вестью.
    .map((one) => ({
      word: one,
      // Разум работает прямо (этап 122, А3): тот, кто умнее, складывает вести
      // точнее — вилка у него уже при том же источнике и том же возрасте.
      spread:
        spreadOf(one.source, day - one.day, hops) / (trustIn(state, one.from) * witsOf(state, who)),
    }))
    .sort((a, b) => a.spread - b.spread)
  const best = heard[0]
  if (!best || best.spread > KNOWN.useless) return blank
  const second = heard[1]
  const clash =
    second !== undefined &&
    second.spread <= KNOWN.useless &&
    differ(best.word.value, second.word.value, clashAt(state, who))
  const age = day - best.word.day
  const def = sourceDef(best.word.source)
  return {
    kind: question.kind,
    about: question.about,
    value: best.word.value,
    source: best.word.source,
    from: best.word.from,
    day: best.word.day,
    age,
    spread: best.spread,
    clash,
    says: `${def.label}${best.word.from ? ` (${best.word.from})` : ''}, ${agedWords(age)}; вилка ${Math.round(best.spread * 100)} из ста${clash ? `. ${KNOWN_WORDS.clash}` : ''}`,
  }
}

/**
 * Насколько разум спрашивающего сужает вилку (этап 122, А3).
 *
 * Прямое дело атрибута: шесть — ничего, десять — вилка на пятую часть уже.
 * Чужим коронам это не даётся: у них своё предубеждение (этап 120).
 */
function witsOf(state: GameState, who: string): number {
  if (who !== PLAYER) return 1
  const mind = state.character.attributes.mind
  return 1 + Math.max(0, mind - 6) * KNOWN.perWit
}

/** Насколько верят этому имени: 1 — не врал, меньше — врал (этап 103). */
function trustIn(state: GameState, from: string | null): number {
  if (!from) return 1
  const row = state.trust?.[from]
  if (!row || row.said === 0) return 1
  return Math.max(0.3, 1 - row.lied / row.said)
}

/**
 * При каком расхождении это считается расхождением (этап 123, Н2).
 *
 * Учёный государь замечает несходство счетов раньше: ему довольно меньшей
 * разницы, чтобы понять, что кто-то из двух врёт.
 */
function clashAt(state: GameState, who: string): number {
  if (who !== PLAYER) return KNOWN.clash
  const learned = state.character.skills.scholarship.level
  return Math.max(0.05, KNOWN.clash - learned * KNOWN.perLearned)
}

function differ(a: number | string, b: number | string, at: number = KNOWN.clash): boolean {
  if (typeof a === 'string' || typeof b === 'string') return a !== b
  const bigger = Math.max(Math.abs(a), Math.abs(b), 1)
  return Math.abs(a - b) / bigger >= at
}

function agedWords(age: number): string {
  if (age <= 3) return 'вести три дня'
  if (age < 30) return `вести ${age} сут.`
  if (age < 365) return `вести ${Math.round(age / 30)} месяцев`
  return `вести ${Math.round(age / 365)} лет`
}

/** Вилка словами: не точка, а от и до (З3). */
export function spreadWords(known: Known): string {
  if (known.value === null) return KNOWN_WORDS.unknown
  if (typeof known.value === 'string') return known.value
  const low = Math.round(known.value * (1 - known.spread))
  const high = Math.round(known.value * (1 + known.spread))
  const unit = askedDef(known.kind).unit
  if (known.spread === 0) return `${known.value}${unit ? ` ${unit}` : ''}`
  return `от ${low} до ${high}${unit ? ` ${unit}` : ''}`
}

/** Насколько знание разошлось с правдой: для отчётов и тестов, не для игрока. */
export function offBy(state: GameState, world: World, known: Known, day: number): number {
  const truth = truthOf(state, world, { kind: known.kind, about: known.about }, day)
  if (typeof truth !== 'number' || typeof known.value !== 'number') return 0
  const bigger = Math.max(Math.abs(truth), 1)
  return Math.round((Math.abs(truth - known.value) / bigger) * 100) / 100
}

/** Принести весть: единственный способ, которым знание попадает в состояние. */
export function bring(words: readonly Word[], word: Word): readonly Word[] {
  const kept = words.filter(
    (one) =>
      !(
        one.to === word.to &&
        one.kind === word.kind &&
        one.about === word.about &&
        one.source === word.source
      ),
  )
  return [...kept, word]
}

/** Сколько вестей помнит этот: чтобы сейв не рос без меры. */
export function forgetOld(
  words: readonly Word[],
  day: number,
  keepDays: number = KNOWN.keepDays,
): readonly Word[] {
  return words.filter((one) => day - one.day <= keepDays)
}

export { KNOWN, KNOWN_WORDS, SOURCE_DEFS, ASKED_DEFS, type QuestionKind, type SourceKind }
