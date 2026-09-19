import { TAX_DEFS } from './content/estate'
import {
  CONCESSION_DEFS,
  type ConcessionId,
  GRUDGE_DEFS,
  type GrudgeId,
  REVOLT,
  REVOLT_WORDS,
} from './content/revolt'
import { vassalsOf } from './court'
import { lawOf } from './estate'
import { shamesOf } from './fame'
import { PLAYER, holdingsOf } from './holding'
import { lordBonds, lordMemory } from './lordlife'

import type { GameState } from './state'
import { oathOf } from './vassal'
import type { Lord } from './war'

import type { World } from './world/types'

/**
 * Мятеж против тебя (этап 94).
 *
 * Вассал терял верность и однажды уходил из присяги — молча, одним числом. Ни
 * заговора, ни выбора между уступкой и расправой у власти не было, а значит, не
 * было и самой ноши: держать знать в руках ничего не стоило.
 *
 * Здесь недовольство складывается в счёт из вещей, которые вассал видит у себя
 * во дворе: подать, суд, война без зова, отнятый лен, сосед, с которым тесно, и
 * просьба, оставшаяся без ответа. Счёт растёт — вассалы начинают говорить между
 * собой; заговор зреет — и становится мятежом. На это есть чем ответить:
 * вольность, земля, голова советника или серебро — и сила, которая стоит
 * дороже всего.
 */

export interface Grudge {
  readonly id: GrudgeId
  readonly weight: number
  readonly says: string
}

/**
 * Из чего складывается недовольство этого вассала (Мя1).
 *
 * Всё считается из мира: закон о подати, право суда в присяге, война, в
 * которую его не звали, твой позор, отнятые лены и соседи, которых ты не
 * рассудил.
 */
export function grudgesOf(
  state: GameState,
  world: World,
  lord: Lord,
  day: number,
): readonly Grudge[] {
  const out: Grudge[] = []
  const add = (id: GrudgeId, share: number) => {
    const weight = Math.round(GRUDGE_DEFS[id].weight * share)
    if (weight <= 0) return
    out.push({ id, weight, says: GRUDGE_DEFS[id].says })
  }
  const law = lawOf(state)
  const take = TAX_DEFS[law.tax].take
  if (take > 1) add('tax', take - 1 + 0.5)
  const oath = oathOf(state, lord.id)
  if (!oath?.justice) add('justice', 1)
  const fighting = state.politics.wars.some((war) => war.a === PLAYER || war.b === PLAYER)
  const called = oath?.calledDay !== undefined && day - oath.calledDay <= 120
  if (fighting && !called) add('war', 1)
  add('shame', shamesOf(state).length)
  // Отнятый лен помнят дольше всего (этап 66, Л4): доверие к руке, которая
  // берёт назад, не возвращается.
  if (lordMemory(state, lord.id).includes('robbed')) add('taken', 1)
  const rivals = lordBonds(state.politics, state.settlements, world, lord).rivals.filter(
    (one) => one.kingdomId === PLAYER,
  )
  if (rivals.length > 0) add('crowded', rivals.length)
  const plea = state.pleas?.[lord.id]
  if (plea && day - plea.askedDay > 90) add('slight', 1)
  // Низкая верность сама по себе — не обида, но она множит все прочие.
  return out.sort((a, b) => b.weight - a.weight)
}

/** Общий счёт недовольства: по нему и считается всё остальное. */
export function grudgeScore(state: GameState, world: World, lord: Lord, day: number): number {
  const sum = grudgesOf(state, world, lord, day).reduce((total, one) => total + one.weight, 0)
  const low = Math.max(0, 50 - lord.loyalty) * REVOLT.lowLoyalty
  return Math.round(sum + low)
}

// --- заговор (Мя2) ----------------------------------------------------------

export interface Plot {
  readonly leaderId: string
  readonly leaderName: string
  /** Кто уже в заговоре. */
  readonly members: readonly string[]
  /** Кто выжидает: пойдёт, если дело сладится. */
  readonly waiting: readonly string[]
  /** Насколько он созрел, 0..100. */
  readonly ripeness: number
  /** Видно ли его тебе — и чем именно. */
  readonly seen: boolean
  readonly seenBy: string | null
  readonly says: string
}

/**
 * Кто с кем говорит о тебе (Мя2).
 *
 * Заговор выводится из счёта недовольства: кто перешёл черту — тот в нём, кто
 * близко — тот выжидает. Видно его не всегда: свои люди в должностях (этап 75)
 * и соглядатаи (этап 82) приносят такие вести, а без них узнаёшь last.
 */
export function plotAgainst(state: GameState, world: World, day: number): Plot | null {
  const vassals = vassalsOf(state)
  if (vassals.length === 0) return null
  const scored = vassals
    .map((lord) => ({ lord, score: grudgeScore(state, world, lord, day) }))
    .sort((a, b) => b.score - a.score)
  const angry = scored.filter((one) => one.score >= REVOLT.plotLine)
  const leader = angry[0]
  if (!leader) return null
  const members = angry.map((one) => one.lord.id)
  const waiting = scored
    .filter((one) => one.score >= REVOLT.plotLine * 0.7 && one.score < REVOLT.plotLine)
    .map((one) => one.lord.id)
  const ripeness = Math.min(100, Math.round(leader.score + members.length * 6 + waiting.length * 2))
  // Свои люди в должностях и соглядатаи слышат раньше прочих.
  const officers = Object.values(state.offices ?? {}).filter((one) => one !== undefined).length
  const spies = (state.spies ?? []).length
  const seen = officers > 0 || spies > 0 || ripeness >= REVOLT.riseLine
  return {
    leaderId: leader.lord.id,
    leaderName: `${leader.lord.title} ${leader.lord.name}`,
    members,
    waiting,
    ripeness,
    seen,
    seenBy: officers > 0 ? 'свои люди при дворе' : spies > 0 ? 'соглядатай' : null,
    says: `${ripeness >= REVOLT.riseLine ? REVOLT_WORDS.rising : REVOLT_WORDS.plot} Во главе ${leader.lord.title} ${leader.lord.name} (счёт ${leader.score}); с ним ${members.length - 1}, выжидают ${waiting.length}. Зрелость ${ripeness} при черте ${REVOLT.riseLine}.`,
  }
}

/** Насколько твоя знать спокойна — одним словом. */
export function courtMood(state: GameState, world: World, day: number): string {
  const plot = plotAgainst(state, world, day)
  if (!plot) {
    const vassals = vassalsOf(state)
    const murmur = vassals.some((lord) => grudgeScore(state, world, lord, day) >= 25)
    return murmur ? REVOLT_WORDS.murmur : REVOLT_WORDS.calm
  }
  return plot.says
}

// --- уступки (Мя4) ----------------------------------------------------------

export interface ConcessionOffer {
  readonly id: ConcessionId
  readonly label: string
  readonly calms: number
  readonly costs: string
  /** Можно ли это дать сейчас. */
  readonly can: boolean
  readonly why: string
}

/**
 * Чем можно унять заговор (Мя4).
 *
 * Каждая уступка платится не тем же самым: вольность — властью навсегда, земля
 * — местом из державы, голова советника — своим человеком, серебро — казной и
 * недолго.
 */
export function concessionsFor(state: GameState, plot: Plot): readonly ConcessionOffer[] {
  const places = holdingsOf(state.settlements, PLAYER).length
  const officers = Object.values(state.offices ?? {}).filter((one) => one !== undefined).length
  const price = REVOLT.goldPerLord * plot.members.length
  const out: ConcessionOffer[] = []
  for (const id of Object.keys(CONCESSION_DEFS) as ConcessionId[]) {
    const def = CONCESSION_DEFS[id]
    const can =
      id === 'land'
        ? places > 1
        : id === 'head'
          ? officers > 0
          : id === 'gold'
            ? state.character.money >= price
            : true
    out.push({
      id,
      label: def.label,
      calms: def.calms,
      costs: def.costs,
      can,
      why:
        id === 'gold'
          ? `${def.about} Просят ${price}.`
          : id === 'head' && officers === 0
            ? 'Советников у тебя нет: выдавать некого.'
            : def.about,
    })
  }
  return out
}

/** Во что обойдётся откуп серебром. */
export function bribePriceFor(plot: Plot): number {
  return REVOLT.goldPerLord * plot.members.length
}

// --- расправа и уроки (Мя5, Мя6) --------------------------------------------

export interface Reprisal {
  /** Насколько упадёт верность остальных. */
  readonly fear: number
  /** И слава среди знати. */
  readonly fame: number
  readonly says: string
}

export function reprisalCost(state: GameState, plot: Plot): Reprisal {
  const others = vassalsOf(state).length - plot.members.length
  return {
    fear: REVOLT.reprisalFear,
    fame: REVOLT.reprisalFame,
    says: `${REVOLT_WORDS.crushed} Остальные ${others} вассалов станут бояться тебя на ${Math.abs(REVOLT.reprisalFear)} и верить на столько же меньше; знать запомнит это славой ${REVOLT.reprisalFame}.`,
  }
}

export function mercyGain(): { readonly bond: number; readonly says: string } {
  return {
    bond: REVOLT.mercyBond,
    says: `${REVOLT_WORDS.spared} Прочие вассалы прибавят ${REVOLT.mercyBond} верности: с тобой можно договариваться.`,
  }
}

/** Чужие вассалы тоже смотрят: как ты обошёлся со своими (Мя6). */
export function lessonWords(harsh: boolean): string {
  return harsh
    ? 'В чужих землях говорят, что ты крут со своими: к тебе пойдут за страхом, а не за правдой.'
    : 'В чужих землях говорят, что с тобой можно договориться: к тебе пойдут те, кому нужен сюзерен, а не хозяин.'
}

export { REVOLT, REVOLT_WORDS, CONCESSION_DEFS, GRUDGE_DEFS, type ConcessionId, type GrudgeId }
