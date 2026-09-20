import { COURT_TEMPER_DEFS } from './content/courtier'
import { FACTIONS, FACTION_DEFS, type FactionId } from './content/lords'
import { type CourtPerson, courtiersOf } from './courtier'
import { PLAYER, holdingsOf } from './holding'
import { courtParties } from './office'
import type { GameState } from './state'

/**
 * Партии при дворе (этап 106).
 *
 * Партии в 0.7 были настроением: четыре числа, которые двигались от закона и
 * войны. Здесь у каждой появляется то, чем она живёт, и то, чего боится, — и,
 * главное, власть над твоим слухом: партия решает, что до тебя дойдёт.
 *
 * Двор, где одна партия победила, опаснее двора, где их две: победившей больше
 * не нужно с тобой считаться. Это и есть цена равновесия.
 */

export const FACTION = {
  /** Насколько партия придерживает то, что ей невыгодно. */
  filters: 0.6,
  /** Выше этого перевеса партия считается победившей. */
  wonLine: 45,
  /** Насколько победившая партия усиливает утайку. */
  wonHides: 1.6,
  /** Насколько равновесие двух партий её ослабляет. */
  evenHelps: 0.7,
  /** Насколько назначение двигает свою партию. */
  appointMood: 12,
  /** И чужую. */
  rivalMood: -8,
} as const

export const FACTION_WORDS = {
  even: 'Двор в равновесии: партии смотрят друг за другом, и это тебе на руку.',
  won: 'Одна партия взяла двор: тебе будут говорить то, что нужно ей.',
  quiet: 'Партий при дворе нет: некому ни спорить, ни прикрывать.',
} as const

export interface CourtFaction {
  readonly id: FactionId
  readonly label: string
  /** Чем кормится (П1). */
  readonly lives: string
  /** Чего боится. */
  readonly fears: string
  readonly mood: number
  /** Кто из двора её держит. */
  readonly people: readonly string[]
}

/** Чем живёт каждая партия и чего боится (П1). */
export function partiesOf(state: GameState, day: number): readonly CourtFaction[] {
  const moods = courtParties(state, day)
  const people = courtiersOf(state, day)
  return FACTIONS.map((id) => {
    const def = FACTION_DEFS[id]
    const mood = moods.find((one) => one.id === id)?.mood ?? 0
    return {
      id,
      label: def.label,
      lives: livesOn(id),
      fears: fearsOf(id),
      mood,
      people: people.filter((one) => sidesWith(one) === id).map((one) => one.name),
    }
  })
}

function livesOn(id: FactionId): string {
  if (id === 'hawks') return 'война: добыча, лены за службу и чины, которые дают на войне'
  if (id === 'doves') return 'мир: подати, торг и то, что не сгорело'
  if (id === 'oldBlood') return 'земля и род: старые лены и право сидеть ближе всех'
  return 'служба и грамота: место, полученное за умение, а не за кровь'
}

function fearsOf(id: FactionId): string {
  if (id === 'hawks') return 'долгий мир, в котором о них забудут'
  if (id === 'doves') return 'война, которая съест то, что они собрали'
  if (id === 'oldBlood') return 'новые люди без рода на высоких местах'
  return 'старая знать, которая вернёт всё как было'
}

/** С кем он: нрав и род человека двора решают это за него. */
export function sidesWith(one: CourtPerson): FactionId {
  const def = COURT_TEMPER_DEFS[one.temper]
  if (one.temper === 'proud') return 'oldBlood'
  if (one.temper === 'zealous') return 'hawks'
  if (one.temper === 'kindly') return 'doves'
  if (def.hand >= 1.2) return 'newMen'
  return 'doves'
}

export interface Balance {
  readonly top: CourtFaction | null
  readonly second: CourtFaction | null
  readonly won: boolean
  /** Во сколько раз двор сильнее придерживает дурное. */
  readonly hides: number
  readonly says: string
}

/**
 * Кто взял двор (П2 и П5).
 *
 * Пока партии идут вровень, они смотрят друг за другом — и до тебя доходит
 * больше. Как только одна оторвалась, она начинает решать, что тебе слышать.
 */
export function balanceOf(state: GameState, day: number): Balance {
  const sorted = [...partiesOf(state, day)].sort((a, b) => b.mood - a.mood)
  const top = sorted[0] ?? null
  const second = sorted[1] ?? null
  if (!top || !second) {
    return { top, second, won: false, hides: 1, says: FACTION_WORDS.quiet }
  }
  const gap = top.mood - second.mood
  const won = gap >= FACTION.wonLine
  return {
    top,
    second,
    won,
    hides: won ? FACTION.wonHides : FACTION.evenHelps,
    says: won
      ? `${FACTION_WORDS.won} Взяли «${top.label}» (${top.mood} против ${second.mood}): живут тем, что ${top.lives}.`
      : `${FACTION_WORDS.even} «${top.label}» ${top.mood}, «${second.label}» ${second.mood}.`,
  }
}

/**
 * Что будет, если посадить на место этого человека (П3).
 *
 * Назначение — не выбор умения, а ход в чужой игре: одна партия прибавит,
 * другая запомнит. Считается заранее, до того как ты решил.
 */
export function appointCost(
  state: GameState,
  one: CourtPerson,
  day: number,
): { readonly gains: FactionId; readonly loses: FactionId; readonly says: string } {
  const side = sidesWith(one)
  const rivals: Record<FactionId, FactionId> = {
    hawks: 'doves',
    doves: 'hawks',
    oldBlood: 'newMen',
    newMen: 'oldBlood',
  }
  const against = rivals[side]
  return {
    gains: side,
    loses: against,
    says: `${one.name} — из «${FACTION_DEFS[side].label}»: они прибавят ${FACTION.appointMood}, «${FACTION_DEFS[against].label}» запомнят (${FACTION.rivalMood}).`,
  }
}

export interface Intrigue {
  readonly from: FactionId
  readonly against: string
  readonly how: 'denounce' | 'audit' | 'errand'
  readonly says: string
}

/**
 * Интрига против своего (П4).
 *
 * Партии бьют друг друга твоими руками: доносом, ревизией, поручением подальше
 * от двора. Выводится из того, кто сейчас в силе и кто ему мешает.
 */
export function intrigueNow(state: GameState, day: number): Intrigue | null {
  const balance = balanceOf(state, day)
  if (!balance.top || !balance.second) return null
  const people = courtiersOf(state, day)
  const target = people.find((one) => sidesWith(one) === balance.second?.id)
  if (!target) return null
  const how = balance.won ? 'denounce' : balance.top.mood > 0 ? 'audit' : 'errand'
  return {
    from: balance.top.id,
    against: target.name,
    how,
    says:
      how === 'denounce'
        ? `«${balance.top.label}» шепчут на ${target.name}: им нужно его место.`
        : how === 'audit'
          ? `«${balance.top.label}» просят проверить дела ${target.name} — «для порядка».`
          : `«${balance.top.label}» советуют послать ${target.name} с поручением подальше и подольше.`,
  }
}

export type { FactionId }
