import { ASSIZE, ASSIZE_WORDS, COURT_PROOF_DEFS, type ProofId } from './content/assize'
import { type CourtCase, courtCase, vassalsOf } from './court'
import { localsAt } from './face'
import { storeDays } from './fort'
import { PLAYER, holdingsOf } from './holding'
import type { GameState } from './state'
import { oathOf } from './vassal'
import type { World } from './world/types'

/**
 * Суд (этап 182).
 *
 * Суд с 0.6 — дело раз в месяц и два-три ответа к нему. Дело приходило по
 * расписанию, доводов у сторон не было, свидетелей не было, правды, которой ты
 * не знаешь, тоже не было. Оттого суд был выбором без веса: любая сторона
 * стоила примерно одного.
 *
 * Здесь у дела появляются стороны с доводами, свидетели из этого самого места
 * (этап 176) и правда, которой ты не знаешь. Поток дел идёт из земли, а не из
 * расписания, и чужие суды — церковный, городской, вассальный — спорят с твоим.
 */

export interface Argued {
  readonly who: string
  readonly proof: ProofId
  readonly says: string
}

export interface CaseNow {
  readonly source: CourtCase
  readonly sides: readonly Argued[]
  readonly witnesses: readonly string[]
  /** Кто прав на деле. Игроку это не показывают — он судит по доводам. */
  readonly truth: string
  readonly says: string
}

/** Дело как дело (Сд1). */
export function caseNow(state: GameState, world: World, day: number): CaseNow | null {
  const source = courtCase(state)
  if (!source) return null
  const parties =
    source.lords.length > 0
      ? source.lords.map((one) => `${one.title} ${one.name}`)
      : ['старшины места', 'твой сборщик']
  const sides = parties.map((who, at) => {
    const seed = hashOf(`${source.id}|${who}|${at}`)
    const proof = (Object.keys(COURT_PROOF_DEFS) as ProofId[])[seed % PROOFS_LENGTH] ?? 'nothing'
    return {
      who,
      proof,
      says: `${who}: ${COURT_PROOF_DEFS[proof].label}. ${COURT_PROOF_DEFS[proof].about}`,
    }
  })
  const witnesses = source.locationId
    ? localsAt(state, world, source.locationId).map((one) => `${one.name}`)
    : []
  // Правда есть, и она не про доводы: складно говорит и тот, кто врёт.
  const truth = parties[hashOf(`truth|${source.id}`) % parties.length] ?? parties[0] ?? ''
  return {
    source,
    sides,
    witnesses,
    truth,
    says: `${source.title}. ${source.text} ${sides.map((one) => one.says).join(' ')}${
      witnesses.length > 0 ? ` Свидетели: ${witnesses.join(', ')}.` : ''
    } ${ASSIZE_WORDS.unknown}`,
  }
}

const PROOFS_LENGTH = Object.keys(COURT_PROOF_DEFS).length

/** Чем решение кому отзовётся (Сд2). */
export function verdictCost(
  now: CaseNow,
  choice: string,
): {
  readonly pleased: readonly string[]
  readonly angered: readonly string[]
  readonly right: boolean
  readonly says: string
} {
  const [first, second] = now.sides
  const pleased: string[] = []
  const angered: string[] = []
  // У каждого рода дел свои ответы (0.6): жалоба решается за крестьян или за
  // лорда, прошение — прощением или отказом. Приговор должен говорить о тех,
  // кто в этом деле есть, а не о «первом» и «втором» вообще.
  if (choice === 'peasants') {
    pleased.push('земля')
    if (first) angered.push(first.who)
  }
  if (choice === 'lord') {
    if (first) pleased.push(first.who)
    angered.push('земля')
  }
  if (choice === 'grant') pleased.push('земля')
  if (choice === 'refuse') {
    pleased.push('казна')
    angered.push('земля')
  }
  if (choice === 'first' && first) {
    pleased.push(first.who)
    if (second) angered.push(second.who)
  }
  if (choice === 'second' && second) {
    pleased.push(second.who)
    if (first) angered.push(first.who)
  }
  if (choice === 'split') {
    if (first) angered.push(first.who)
    if (second) angered.push(second.who)
  }
  if (choice === 'ransom') {
    pleased.push('казна')
    if (first) angered.push(first.who)
    if (second) angered.push(second.who)
  }
  const right =
    (choice === 'first' && first?.who === now.truth) ||
    (choice === 'second' && second?.who === now.truth) ||
    // В жалобе правда на стороне того, за кого она: если врёт лорд — правы
    // крестьяне, и наоборот.
    (choice === 'peasants' && first?.who !== now.truth) ||
    (choice === 'lord' && first?.who === now.truth)
  return {
    pleased,
    angered,
    right,
    says: `Довольны: ${pleased.join(', ') || 'никто'}. Обижены: ${angered.join(', ') || 'никто'}. ${
      right ? 'По правде — так и было.' : 'По правде было иначе, но доводов хватило.'
    }`,
  }
}

/** Что весит в суде, кроме доводов (Сд3). */
export function weighsToo(
  state: GameState,
  now: CaseNow,
): readonly { readonly what: string; readonly weight: number; readonly says: string }[] {
  const rows: { what: string; weight: number; says: string }[] = []
  rows.push({
    what: 'серебро',
    weight: ASSIZE.bribeWeight,
    says: 'Заплатить может каждая сторона. Взятку помнят дольше приговора.',
  })
  if ((state.marriages ?? []).length > 0) {
    rows.push({
      what: 'родство',
      weight: ASSIZE.kinWeight,
      says: 'Родне судить трудно: её не осудишь, и это видят все.',
    })
  }
  const strong = now.source.lords.find((one) => one.strength > 120)
  if (strong) {
    rows.push({
      what: 'страх',
      weight: ASSIZE.fearWeight,
      says: `${strong.title} ${strong.name} пришёл с людьми: решение против него придётся защищать.`,
    })
  }
  return rows
}

/** Чужие суды здесь (Сд4). */
export function otherCourts(
  state: GameState,
  world: World,
  locationId: string,
): { readonly takes: number; readonly whose: readonly string[]; readonly says: string } {
  const place = state.settlements[locationId]
  const whose: string[] = []
  let takes = 0
  if (
    place?.buildings.includes('chapel') ||
    world.locations[locationId]?.archetype === 'monastery'
  ) {
    takes += ASSIZE.churchTakes
    whose.push('церковный')
  }
  if (state.charters?.[locationId]) {
    takes += ASSIZE.townTakes
    whose.push('городской')
  }
  const owner = place?.owner
  if (owner && owner !== PLAYER && oathOf(state, owner)?.justice) {
    takes += ASSIZE.lordTakes
    whose.push('вассальный')
  }
  return {
    takes: Math.min(1, Math.round(takes * 100) / 100),
    whose,
    says:
      whose.length === 0
        ? 'Здесь судишь только ты.'
        : `${ASSIZE_WORDS.other} Дела забирают: ${whose.join(', ')} — ${Math.round(Math.min(1, takes) * 100)} из ста.`,
  }
}

/** Сколько дел ждёт суда (Сд5): поток идёт из земли. */
export function caseFlow(
  state: GameState,
  world: World,
  day: number,
): { readonly waiting: number; readonly why: string } {
  const mine = holdingsOf(state.settlements, PLAYER)
  if (mine.length === 0) return { waiting: 0, why: 'Судить нечего: своей земли нет.' }
  let waiting = ASSIZE.quiet
  const banditry = mine.reduce((sum, one) => sum + one.banditry, 0) / mine.length
  waiting += banditry * ASSIZE.perBanditry
  const hungry = mine.filter((one) => storeDays(one) < 20).length
  waiting += hungry * ASSIZE.perHunger
  const feuds = vassalsOf(state).length >= 2 ? ASSIZE.perFeud : 0
  waiting += feuds
  return {
    waiting: Math.round(waiting * 10) / 10,
    why: `Разбой ${Math.round(banditry * 100)} из ста, голодных мест ${hungry}, вассалов ${vassalsOf(state).length}. ${ASSIZE_WORDS.waiting}`,
  }
}

/** Суд в числах (Сд6). */
export function assizeRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly heard: number
  readonly sold: number
  readonly waiting: number
  readonly says: string
} {
  const log = state.courtLog ?? { heard: 0, sold: 0 }
  const flow = caseFlow(state, world, day)
  const share = log.heard > 0 ? log.sold / log.heard : 0
  return {
    heard: log.heard,
    sold: log.sold,
    waiting: flow.waiting,
    says: `Дел рассужено ${log.heard}, из них за серебро ${log.sold}; ждёт ${flow.waiting}. ${
      share >= ASSIZE.soldAt ? ASSIZE_WORDS.sold : ASSIZE_WORDS.fair
    }`,
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
