import {
  CONGRESS_BREACH,
  CONGRESS_COST,
  type CongressQuestion,
  QUESTION_DEFS,
  VOTE_PRICE,
} from './content/congress'
import { overgrown } from './diplomacy'
import { PLAYER } from './holding'
import { crownPlan } from './plans'
import { childless, royalHouse } from './royal'
import type { GameState } from './state'
import { recognitionOf } from './title'
import { relationOf } from './war'
import type { World } from './world/types'

/**
 * Съезд корон (этап 83).
 *
 * Посольство говорит с одним, договор связывает двоих. Съезд — то место, где
 * говорят все сразу, и потому он решает то, чего не решить наедине: кончает
 * чужие войны, делит землю бездетного дома, называет общего врага.
 *
 * Вопросы не выдумываются: они берутся из мира — идущие войны, дом без
 * наследника, корона, забравшая слишком много. Голоса считаются из замыслов
 * (этап 72) и отношений, а купить их можно серебром.
 */

/** Созванный съезд: он живёт в состоянии, пока не собрался. */
export interface Congress {
  readonly question: CongressQuestion
  readonly calledDay: number
  readonly meetDay: number
  /** Кто едет. */
  readonly guests: readonly string[]
  /** И кто не едет. */
  readonly absent: readonly string[]
  /** Кому и сколько уплачено за голос. */
  readonly bribes: Readonly<Record<string, number>>
  /** О кого именно вопрос: общий враг или выморочная земля. */
  readonly about?: string
}

/** Что решено: для летописи (Е6). */
export interface CongressRecord {
  readonly day: number
  readonly question: CongressQuestion
  readonly passed: boolean
  readonly guests: number
  readonly about?: string
}

export function questionDef(question: CongressQuestion) {
  return QUESTION_DEFS[question]
}

export function congressOf(state: Pick<GameState, 'congress'>): Congress | null {
  return state.congress ?? null
}

export function congressesOf(state: Pick<GameState, 'congresses'>): readonly CongressRecord[] {
  return state.congresses ?? []
}

/**
 * О чём есть смысл собирать съезд сейчас (Е2).
 *
 * Вопрос берётся из мира: идут ли войны, есть ли дом без наследника, вырос ли
 * кто-то настолько, что его боятся все. Пустых вопросов на съезде не бывает.
 */
export function congressQuestions(
  state: GameState,
  world: World,
  day: number,
): readonly {
  readonly question: CongressQuestion
  readonly about?: string
  readonly why: string
}[] {
  const out: { question: CongressQuestion; about?: string; why: string }[] = []
  if (state.politics.wars.length > 0) {
    out.push({
      question: 'peace',
      why: `Войн идёт ${state.politics.wars.length}: их можно кончить разом.`,
    })
  }
  const empty = Object.keys(world.kingdoms).find((id) => childless(world, id, day))
  if (empty) {
    const house = royalHouse(world, empty, day)
    out.push({
      question: 'partition',
      about: empty,
      why: `${house.title} ${house.name} бездетен: землю поделят и без тебя.`,
    })
  }
  const giant = overgrown(world, state.settlements)
  if (giant && giant !== PLAYER) {
    out.push({
      question: 'commonFoe',
      about: giant,
      why: `${world.kingdoms[giant]?.name ?? giant} забрал слишком много: против такого сходятся.`,
    })
  }
  out.push({ question: 'roads', why: 'Пошлины и броды: скучный вопрос, на который едут все.' })
  out.push({ question: 'faith', why: 'Спор о вере: решают редко, помнят долго.' })
  return out
}

/** Кто приедет на твой зов: те, кто признаёт тебя хотя бы младшим. */
export function congressPlan(
  state: GameState,
  world: World,
  day: number,
): {
  readonly guests: readonly string[]
  readonly absent: readonly string[]
  readonly cost: number
} {
  const guests: string[] = []
  const absent: string[] = []
  for (const id of Object.keys(world.kingdoms)) {
    const seen = recognitionOf(state, id, day)
    const relation = relationOf(state.politics, PLAYER, id)
    if (seen.standing === 'pretender' || relation < -40) absent.push(id)
    else guests.push(id)
  }
  return {
    guests,
    absent,
    cost: CONGRESS_COST.rite + guests.length * CONGRESS_COST.perGuest,
  }
}

/**
 * Как эта корона голосует (Е3).
 *
 * Голос выводится из того же, из чего и всё остальное: чего эта корона хочет
 * (этап 72), как она к тебе и что вопрос делает с ней самой. Купленный голос —
 * это тот же голос плюс серебро.
 */
export function voteOf(
  state: GameState,
  world: World,
  kingdomId: string,
  question: CongressQuestion,
  about: string | undefined,
  day: number,
): number {
  if (kingdomId === PLAYER) return 1
  const plan = crownPlan(world, state.politics, state.settlements, kingdomId)
  const relation = relationOf(state.politics, PLAYER, kingdomId) / 100
  let vote = relation * 0.5
  if (question === 'peace') {
    // Воюющий за мир не голосует; уставший — голосует.
    vote += plan.want === 'foe' ? -0.5 : 0.4
  }
  if (question === 'commonFoe') {
    if (kingdomId === about) vote -= 2
    else vote += plan.want === 'ally' || plan.want === 'foe' ? 0.5 : 0.2
  }
  if (question === 'partition') {
    if (kingdomId === about) vote -= 2
    else vote += 0.35
  }
  if (question === 'roads') vote += plan.want === 'rest' ? 0.45 : 0.25
  if (question === 'faith') vote += plan.want === 'rest' ? 0.1 : -0.1
  const bribe = state.congress?.bribes?.[kingdomId] ?? 0
  if (bribe > 0) vote += Math.min(0.8, bribe / Math.max(1, votePrice(state, world, kingdomId, 1)))
  return Math.round(vote * 100) / 100
}

/** Во что встанет голос этой короны. */
export function votePrice(state: GameState, world: World, kingdomId: string, lean: number): number {
  const lords = new Set(
    state.politics.lords.filter((one) => one.kingdomId === kingdomId).map((one) => one.id),
  )
  const places = Object.values(state.settlements).filter(
    (one) =>
      one.population > 0 &&
      (one.owner === `crown:${kingdomId}` || (one.owner !== null && lords.has(one.owner))),
  ).length
  const base = Math.max(200, places * VOTE_PRICE.perPlace)
  return Math.round(base * (lean > 0 ? VOTE_PRICE.willing : lean < 0 ? VOTE_PRICE.against : 1))
}

/** Сколько голосов за и сколько нужно. */
export function tally(
  state: GameState,
  world: World,
  congress: Congress,
  day: number,
): { readonly yes: number; readonly no: number; readonly needs: number; readonly passed: boolean } {
  let yes = 0
  let no = 0
  for (const id of congress.guests) {
    const vote = voteOf(state, world, id, congress.question, congress.about, day)
    if (vote > 0) yes += 1
    else no += 1
  }
  // Свой голос считается всегда: съезд собирал ты.
  yes += 1
  const needs = Math.ceil((congress.guests.length + 1) / 2) + QUESTION_DEFS[congress.question].needs
  return { yes, no, needs, passed: yes >= needs }
}

export { CONGRESS_BREACH, CONGRESS_COST, type CongressQuestion }
