import { lordTemper } from './castle'
import type { Companion } from './companion'
import type { LordTemper } from './content/castle'
import { TAX_DEFS } from './content/estate'
import {
  CALLED_DAYS,
  LOYALTY_DRIFT,
  OATH_BREAKS,
  OATH_GIVES_DEFS,
  OATH_TEMPERS,
  type OathGives,
  VASSAL_TITLES,
} from './content/vassals'
import type { Settlement } from './economy'
import { lawOf } from './estate'
import { fameOf, shamesOf } from './fame'
import { PLAYER, holdingsOf } from './holding'
import { deedWeight, lordBonds, lordMemory } from './lordlife'
import { lordRep } from './reputation'
import type { GameState } from './state'
import type { Lord } from './war'
import { atWar } from './war'
import type { World } from './world/types'

/**
 * Присяга и вассалы (этап 74).
 *
 * До 0.7 у игрока было владение: место, управляющий и подать. Держава начинается
 * там, где землю держат за тебя другие люди, — и держат по договору, у которого
 * две стороны. Присяга здесь не флаг «он мой», а условия: чем он платит, что ему
 * оставлено и сколько людей он обязан привести.
 *
 * Сам вассал — обычный `Lord` с `kingdomId === PLAYER`: тот же нрав, род,
 * соседи, память и замысел, что у чужих лордов (этапы 66, 72). В состоянии
 * лежит только присяга; всё прочее выводится, как и раньше.
 */

/** Условия присяги. Живут в состоянии: это договор, а не свойство человека. */
export interface Oath {
  readonly gives: OathGives
  /** Какую долю подати он отдаёт. */
  readonly share: number
  /** Оставлен ли ему свой суд. */
  readonly justice: boolean
  /** Какую долю своих людей он обязан приводить на войну. */
  readonly levy: number
  readonly sinceDay: number
  /** Когда его звали в последний раз. */
  readonly calledDay?: number
}

export function oathOf(state: Pick<GameState, 'oaths'>, lordId: string): Oath | null {
  return state.oaths?.[lordId] ?? null
}

export function oathGivesDef(gives: OathGives) {
  return OATH_GIVES_DEFS[gives]
}

/** Земли, которые он держит от тебя. */
export function fiefsOf(
  settlements: Readonly<Record<string, Settlement>>,
  lordId: string,
): readonly Settlement[] {
  return holdingsOf(settlements, lordId)
}

/** Титул по числу держаний: земля делает титул, а не наоборот. */
export function titleForFiefs(fiefs: number): string {
  let title = VASSAL_TITLES[0]?.title ?? 'барон'
  for (const step of VASSAL_TITLES) if (fiefs >= step.fiefs) title = step.title
  return title
}

/**
 * Чего стоит земля в глазах того, кому её предлагают.
 *
 * Не подать и не население, а то, что человек с неё получит: сколько людей она
 * кормит, сыта ли она и спокойно ли вокруг. Разорённое место — не дар, а обуза,
 * и присягать за него никто не станет.
 */
export function fiefWorth(settlement: Settlement): number {
  const people = Math.min(1, settlement.population / 8000)
  const quiet = 1 - settlement.banditry
  return Math.max(0, people * quiet)
}

/** С чего начинается вес того, кто зовёт: имя, за которым ещё ничего нет. */
const STANDING_FLOOR = 0.35

export interface OathOffer {
  /** Условия, на которых он согласен. */
  readonly terms: Oath
  readonly accepts: boolean
  /** Чего он просит словами. */
  readonly asks: string
  /** Что скажет в ответ. */
  readonly says: string
  /** Насколько он к этому близок: 0..1 против своего порога. */
  readonly weight: number
}

/**
 * На каких условиях он присягнёт — и присягнёт ли.
 *
 * Вассал смотрит на три вещи: на тебя (слава, титул, позор), на себя (нрав и
 * память о тебе) и на землю (чего она стоит). Ни одна из них не решает одна:
 * безымянному не служат за богатую землю, но и знаменитому не служат за
 * разорённую.
 */
export function oathFor(state: GameState, lord: Lord, locationId: string, day: number): OathOffer {
  const temper = OATH_TEMPERS[lordTemper(lord)]
  const settlement = state.settlements[locationId]
  const worth = settlement ? fiefWorth(settlement) : 0
  // Слава у знати и своё имя на карте — то, из-за чего вообще идут под руку.
  const noble = fameOf(state, 'noble') / 100
  const renown = Math.min(0.4, state.renown / 60)
  const favour = lordRep(state.reputation, lord.id) / 120
  const memory = lordMemory(state, lord.id).reduce((sum, deed) => sum + deedWeight(deed), 0) / 60
  const shame = shamesOf(state).length * 0.08
  const crowned = state.realm ? 0.1 : 0
  // Ни одна сторона не решает одна: землёй умножается то, чего стоит сам
  // сюзерен. Пока это складывалось, богатая земля покупала присягу безымянному
  // — а за безымянным идут не из-за земли, а вопреки ей.
  const standing = Math.max(0, STANDING_FLOOR + noble + renown + favour + memory + crowned - shame)
  const weight = standing * (0.4 + worth * 0.8)
  const accepts = weight >= temper.demand
  return {
    terms: {
      gives: temper.gives,
      share: temper.share,
      justice: temper.justice,
      levy: temper.levy,
      sinceDay: day,
    },
    accepts,
    asks: temper.asks,
    says: accepts ? temper.agrees : temper.refuses,
    weight: Math.round((weight / Math.max(0.01, temper.demand)) * 100) / 100,
  }
}

/**
 * Сколько людей он приведёт, если позвать.
 *
 * Обязан он по присяге (`levy` от своей силы), а приведёт по верности: тот, кто
 * тебя не любит, придёт с половиной и опоздает. Ниже `OATH_BREAKS` не придёт
 * вовсе — и это не бросок, а решение, которое видно заранее.
 */
export function serviceOf(lord: Lord, oath: Oath | null): number {
  if (!oath || oath.gives === 'tax') return 0
  if (lord.loyalty < OATH_BREAKS) return 0
  const owed = lord.strength * oath.levy
  return Math.max(0, Math.round(owed * (0.5 + (lord.loyalty / 100) * 0.7)))
}

/** Пойдёт ли он на зов вообще. */
export function answersCall(lord: Lord, oath: Oath | null): boolean {
  return serviceOf(lord, oath) > 0
}

/** Сколько подати он отдаёт с пожалованной земли. */
export function shareOf(oath: Oath | null): number {
  if (!oath) return 0
  return oath.gives === 'service' ? 0 : oath.share
}

/**
 * Куда за сутки идёт его верность.
 *
 * Всё, что здесь считается, вассал видит у себя во дворе: твою подать, свой
 * суд, твою войну, твой позор и соседа, с которым ему тесно. Числа малые:
 * верность набирается годами, а теряется за один суд.
 */
export function loyaltyDrift(
  state: GameState,
  world: World,
  lord: Lord,
  oath: Oath | null,
  day: number,
): number {
  const law = lawOf(state)
  let drift = 0
  const take = TAX_DEFS[law.tax].take
  if (take > 1) drift += LOYALTY_DRIFT.heavyTax * take
  else if (take < 1) drift += LOYALTY_DRIFT.lightTax
  drift += oath?.justice ? LOYALTY_DRIFT.ownJustice : LOYALTY_DRIFT.noJustice
  // Твоя война, в которой его не звали: люди сидят дома, пока сосед воюет.
  const fighting = state.politics.wars.some(
    (war) => war.a === PLAYER || war.b === PLAYER || atWar(state.politics, PLAYER, war.a),
  )
  const called = oath?.calledDay !== undefined && day - oath.calledDay <= CALLED_DAYS
  if (fighting && !called) drift += LOYALTY_DRIFT.warIdle
  if (!fighting) drift += LOYALTY_DRIFT.peace
  drift += shamesOf(state).length * LOYALTY_DRIFT.shame
  // Соседи по державе, с которыми он делит провинцию, тянут верность вниз: не
  // на тебя обида, а на то, что ты их не рассудил.
  const rivals = lordBonds(state.politics, state.settlements, world, lord).rivals.filter(
    (one) => one.kingdomId === PLAYER,
  )
  drift += rivals.length * LOYALTY_DRIFT.rival
  return drift
}

/** Чего он просит за присягу: нрав говорит за него. */
export function oathAsks(lord: Lord): string {
  return OATH_TEMPERS[lordTemper(lord)].asks
}

/** Придёт ли он на зов — словами (`loyaltyWord` в `court.ts` говорит о верности). */
export function callWord(lord: Lord, oath: Oath | null): string {
  if (oath?.gives === 'tax') return 'платит, но не воюет'
  if (lord.loyalty < OATH_BREAKS) return 'на зов не придёт'
  const men = serviceOf(lord, oath)
  return men > 0 ? `приведёт ${men}` : 'людей не даст'
}

/** Чем он обязан — одной строкой для двора. */
export function oathWords(oath: Oath | null, lord: Lord): string {
  if (!oath) return 'присяга без условий: по обычаю'
  const parts: string[] = [OATH_GIVES_DEFS[oath.gives].label]
  if (shareOf(oath) > 0) parts.push(`${Math.round(shareOf(oath) * 100)}% подати`)
  const men = Math.round(lord.strength * oath.levy)
  if (oath.gives !== 'tax') parts.push(`до ${men}人`.replace('人', ' человек'))
  parts.push(oath.justice ? 'суд свой' : 'суд твой')
  return parts.join(', ')
}

/**
 * Кого здесь можно взять под руку.
 *
 * Присягают не всякие: тот, у кого нет земли (разорённый или взятый в бою), и
 * тот, кто своей короне больше не верен. Остальным присяга не нужна — у них
 * есть своя.
 */
export function swearCandidates(state: GameState): readonly Lord[] {
  return state.politics.lords.filter((lord) => {
    if (lord.kingdomId === PLAYER) return false
    const landless = fiefsOf(state.settlements, lord.id).length === 0
    return landless || lord.loyalty <= LORD_DOUBTS
  })
}

/** Выше этой верности своей короне лорд о чужой присяге и слушать не станет. */
export const LORD_DOUBTS = 35

/**
 * Свой человек, которого можно поднять в лорды (этап 74, В1).
 *
 * Первый вассал у начинающего государя — не перебежчик с чужой земли, а тот,
 * кто с ним ходил. Спутник, которому дают лен, перестаёт быть спутником: у него
 * появляется земля, люди и свой счёт к тебе.
 */
export function raisable(state: GameState): readonly Companion[] {
  return state.companions.filter((one) => !one.captive && one.mood >= RAISE_MOOD)
}

/** С каким расположением спутник согласен сесть на землю. */
export const RAISE_MOOD = 40

/** Лорд, сделанный из спутника: имя его, нрав — по имени, сила — по земле. */
export function lordFromCompanion(
  companion: Companion,
  settlement: Settlement,
  index: number,
  day: number,
): Lord {
  return {
    id: `lord:${PLAYER}:${index}`,
    name: companion.name,
    title: titleForFiefs(1),
    kingdomId: PLAYER,
    // Свой человек начинает не с середины: он шёл с тобой и знает, кому служит.
    loyalty: Math.max(50, Math.min(90, companion.mood)),
    strength: Math.max(8, Math.round(settlement.population / 60)),
    age: 25 + (day % 15),
  }
}

/** Годна ли эта земля в лен: своя, живая и не столица державы. */
export function grantable(state: GameState, locationId: string): boolean {
  const settlement = state.settlements[locationId]
  return settlement !== undefined && settlement.owner === PLAYER && settlement.population > 0
}

export { OATH_BREAKS, type LordTemper }
