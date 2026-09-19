import type { Companion } from './companion'
import {
  EMBASSY_DAYS,
  EMBASSY_DEFS,
  type EmbassyErrand,
  type EmbassyErrandDef,
  HOST_DEFS,
  type HostAnswer,
  LETTER,
} from './content/embassy'
import { vassalsOf } from './court'
import { PLAYER } from './holding'
import { officerAt } from './office'
import { crownPlan } from './plans'
import type { GameState } from './state'
import { recognitionOf } from './title'
import type { SecretId } from './treaty'
import { allied, atWar, relationOf } from './war'
import type { World } from './world/types'

/**
 * Посольства (этап 79).
 *
 * До сих пор дипломатия была чужой: к тебе приезжали и о чём-то просили. Свой
 * ход появляется здесь — посольство. Оно стоит денег, идёт днями, живёт при
 * чужом дворе и возвращается с ответом, на который ты уже не влияешь.
 *
 * Ответ не бросок вслепую: чужая корона отвечает по своему замыслу (этап 72) —
 * та, что ищет союза, согласится на союз; та, что ведёт войну, не станет
 * слушать о проходе. Поэтому дипломатия и ИИ в этой версии растут вместе.
 */

export interface Embassy {
  readonly id: string
  /** К какой короне. */
  readonly to: string
  readonly errand: EmbassyErrand
  /** Кто поехал: спутник, вассал, человек двора — или письмо вместо человека. */
  readonly envoyId: string | null
  readonly envoyName: string
  readonly byLetter: boolean
  readonly sentDay: number
  /** Когда вернётся с ответом. */
  readonly backDay: number
  /** С чем едет на бумаге (этап 80): тайная статья и свидетель. */
  readonly secret?: SecretId
  readonly guarantor?: string
}

export function embassiesOf(state: Pick<GameState, 'embassies'>): readonly Embassy[] {
  return state.embassies ?? []
}

export function embassyDef(errand: EmbassyErrand): EmbassyErrandDef {
  return EMBASSY_DEFS[errand]
}

export function hostAnswerDef(answer: HostAnswer) {
  return HOST_DEFS[answer]
}

/** Кого можно послать: свои люди, которым есть чем говорить. */
export interface EnvoyChoice {
  readonly id: string
  readonly name: string
  /** Чем он берёт: умение убеждать. */
  readonly skill: number
  readonly kind: 'chancellor' | 'companion' | 'vassal'
}

export function envoyChoices(state: GameState, day: number): readonly EnvoyChoice[] {
  const out: EnvoyChoice[] = []
  const chancellor = officerAt(state, 'chancellor')
  if (chancellor && chancellor.awayUntil === undefined) {
    out.push({
      id: chancellor.id,
      name: chancellor.name,
      skill: chancellor.skill + 2,
      kind: 'chancellor',
    })
  }
  for (const companion of state.companions as readonly Companion[]) {
    if (companion.captive) continue
    if (out.some((one) => one.id === companion.id)) continue
    out.push({
      id: companion.id,
      name: companion.name,
      skill: companion.skills.persuasion ?? 0,
      kind: 'companion',
    })
  }
  for (const lord of vassalsOf(state)) {
    if (out.some((one) => one.id === lord.id)) continue
    out.push({
      id: lord.id,
      name: `${lord.title} ${lord.name}`,
      // Вассал говорит не умением, а тем, что он вассал: за ним видна держава.
      skill: Math.min(8, 3 + Math.round(lord.strength / 25)),
      kind: 'vassal',
    })
  }
  return out
}

/** Во что обойдётся такое посольство. */
export function embassyCost(errand: EmbassyErrand, byLetter: boolean): number {
  const def = EMBASSY_DEFS[errand]
  return Math.round(def.cost * (byLetter ? LETTER.cost : 1))
}

/** Сколько суток его не будет. */
export function embassyDays(byLetter: boolean): number {
  return Math.round(EMBASSY_DAYS * 2 * (byLetter ? LETTER.days : 1))
}

/**
 * Насколько это посольство близко к согласию.
 *
 * Считается из того, что и так есть в мире: признаёт ли тебя эта корона (этап
 * 78), как у вас с отношениями, чего эта корона сейчас хочет (этап 72), кого ты
 * послал и живым ли словом или письмом. Единица — согласие; всё, что ниже, —
 * отказ, и по числу видно, насколько близко было.
 */
export function embassyWeight(
  state: GameState,
  world: World,
  to: string,
  errand: EmbassyErrand,
  envoy: EnvoyChoice | null,
  byLetter: boolean,
  day: number,
): number {
  const def = EMBASSY_DEFS[errand]
  const standing = recognitionOf(state, to, day)
  const seen = standing.standing === 'equal' ? 0.45 : standing.standing === 'lesser' ? 0.25 : 0
  const relation = relationOf(state.politics, PLAYER, to) / 160
  const voice = envoy ? Math.min(0.35, envoy.skill * 0.045) : 0
  const plan = crownPlan(world, state.politics, state.settlements, to)
  // Замысел короны (этап 72) решает больше всего: та, что ищет союза, союз и
  // заключит; та, что ведёт войну, не станет слушать о проходе.
  let wants = 0
  if (plan.want === 'ally' && (errand === 'alliance' || errand === 'marriage')) wants += 0.35
  if (plan.want === 'marry' && errand === 'marriage') wants += 0.4
  if (plan.want === 'foe' && plan.targetId === PLAYER) wants -= 0.4
  if (plan.want === 'foe' && errand === 'mediation') wants += 0.2
  if (plan.want === 'rest' && (errand === 'threat' || errand === 'tribute')) wants -= 0.15
  if (errand === 'threat') {
    // Угрозу слушают только те, кто слабее и знает это.
    const mine = recognitionOf(state, to, day).value
    wants += mine > 70 ? 0.3 : -0.2
  }
  const weight =
    (seen + relation + voice + wants + 0.25 - def.hard) * (byLetter ? LETTER.weight : 1)
  return Math.round(weight * 100) / 100
}

/** Можно ли вообще посылать с этим к этой короне. */
export function embassyPossible(
  state: GameState,
  to: string,
  errand: EmbassyErrand,
): { readonly can: boolean; readonly why: string } {
  if (!state.realm) return { can: false, why: 'Посольства шлёт держава, а не человек.' }
  if (!state.world.kingdoms[to]) return { can: false, why: 'Такой короны нет.' }
  if (embassiesOf(state).some((one) => one.to === to)) {
    return { can: false, why: 'Твой человек уже там: дождись ответа.' }
  }
  if (errand === 'alliance' && allied(state.politics, PLAYER, to)) {
    return { can: false, why: 'Вы и так союзники.' }
  }
  if (errand === 'mediation' && !state.politics.wars.some((war) => war.a === to || war.b === to)) {
    return { can: false, why: 'Эта корона ни с кем не воюет: мирить некого.' }
  }
  if (atWar(state.politics, PLAYER, to) && errand !== 'threat' && errand !== 'ransom') {
    return { can: false, why: 'Вы воюете: с этим послов не шлют.' }
  }
  return { can: true, why: '' }
}

/** Что висит без ответа — для сводки дипломатии (П6). */
export function pending(state: GameState, day: number): readonly Embassy[] {
  return embassiesOf(state).filter((one) => one.backDay > day)
}

export { EMBASSY_DAYS, LETTER, type EmbassyErrand, type HostAnswer }
