import type { Companion } from './companion'
import { TAX_DEFS } from './content/estate'
import { FACTIONS, FACTION_DEFS, type FactionId } from './content/lords'
import {
  COURT_MOOD,
  ERRAND_COST,
  OFFICES,
  OFFICE_DEFS,
  OFFICE_ERRANDS,
  OFFICE_FIT,
  OFFICE_POWER,
  type OfficeDef,
  type OfficeErrandDef,
  type OfficeErrandId,
  type OfficeId,
} from './content/offices'
import { vassalsOf } from './court'
import { seneschalOf } from './estate'
import { lawOf } from './estate'
import { PLAYER, holdingsOf } from './holding'
import type { GameState } from './state'
import type { Lord } from './war'
import { warsOf } from './war'

/**
 * Двор и совет (этап 75).
 *
 * Вассалы держат землю, двор держит дела. Должность — работа: у неё есть
 * умение, по которому человека выбирают, жалованье, которое он ест каждый день,
 * и то, что он и правда меняет в числах державы. Пустая должность — не беда, а
 * решение: сэкономил жалованье, потерял то, что она даёт.
 *
 * В состоянии лежит только назначение: кто и с какого дня. Умение и имя берутся
 * у самого человека — спутника, вассала или человека со стороны, который и так
 * выводится из места (`seneschalOf`, этап 61).
 */

/** Назначение: кто держит должность и с какого дня. */
export interface Appointment {
  /** Кто: спутник, вассал или человек со стороны. */
  readonly holderId: string
  readonly kind: 'companion' | 'vassal' | 'hired'
  readonly sinceDay: number
  /** Если он в отъезде — с каким поручением и до какого дня. */
  readonly errand?: { readonly id: OfficeErrandId; readonly untilDay: number }
}

export type Offices = Readonly<Partial<Record<OfficeId, Appointment>>>

export function officeDef(id: OfficeId): OfficeDef {
  return OFFICE_DEFS[id]
}

export function appointmentOf(state: Pick<GameState, 'offices'>, id: OfficeId): Appointment | null {
  return state.offices?.[id] ?? null
}

/** Кто это и что он умеет. Имя и умение — у человека, а не у должности. */
export interface Officer {
  readonly id: string
  readonly name: string
  readonly kind: Appointment['kind']
  /** Умение, по которому его выбирали. */
  readonly skill: number
  /** В отъезде — до какого дня. */
  readonly awayUntil?: number
  readonly errand?: OfficeErrandId
}

export function officerAt(state: GameState, id: OfficeId): Officer | null {
  const seat = appointmentOf(state, id)
  if (!seat) return null
  const def = officeDef(id)
  if (seat.kind === 'companion') {
    const companion = state.companions.find((one) => one.id === seat.holderId)
    if (!companion) return null
    return {
      id: companion.id,
      name: companion.name,
      kind: 'companion',
      skill: companion.skills[def.skill] ?? 0,
      ...(seat.errand ? { awayUntil: seat.errand.untilDay, errand: seat.errand.id } : {}),
    }
  }
  if (seat.kind === 'vassal') {
    const lord = state.politics.lords.find((one) => one.id === seat.holderId)
    if (!lord) return null
    return {
      id: lord.id,
      name: `${lord.title} ${lord.name}`,
      kind: 'vassal',
      // Вассал силён не умением, а людьми и опытом: его сила и есть его вес.
      skill: Math.min(8, Math.round(lord.strength / 12)),
      ...(seat.errand ? { awayUntil: seat.errand.untilDay, errand: seat.errand.id } : {}),
    }
  }
  const hired = hiredCandidates(state).find((one) => one.id === seat.holderId)
  if (!hired) return null
  return {
    ...hired,
    ...(seat.errand ? { awayUntil: seat.errand.untilDay, errand: seat.errand.id } : {}),
  }
}

/** В отъезде ли он сейчас: уехавший своей должности не держит. */
export function isAway(officer: Officer | null, day: number): boolean {
  return officer?.awayUntil !== undefined && officer.awayUntil > day
}

/**
 * Насколько он годен, 0..1.
 *
 * Ниже `OFFICE_FIT` человек только ест жалованье: должность при нём числится, а
 * дела не делаются. Выше — тем лучше, чем выше умение, и потолок держится на
 * восьмёрке: людей сильнее в мире просто нет.
 */
export function fitness(state: GameState, id: OfficeId, day: number): number {
  const officer = officerAt(state, id)
  if (!officer || isAway(officer, day)) return 0
  if (officer.skill < OFFICE_FIT) return 0
  return Math.max(0, Math.min(1, (officer.skill - OFFICE_FIT) / (8 - OFFICE_FIT)))
}

/** Кого можно взять со стороны: люди при твоём дворе, выведенные из места. */
export function hiredCandidates(state: GameState): readonly Officer[] {
  const seats = holdingsOf(state.settlements, PLAYER)
  return seats.slice(0, 3).map((settlement) => {
    const man = seneschalOf(settlement.locationId)
    return {
      id: `hired:${settlement.locationId}`,
      name: man.name,
      kind: 'hired' as const,
      // Человек со стороны середняк: он не хуже и не лучше того, что есть под
      // рукой, — зато его не надо отрывать от своих дел.
      skill: 3 + (settlement.population % 3),
    }
  })
}

/** Кого можно назначить на эту должность. */
export function candidatesFor(state: GameState, id: OfficeId): readonly Officer[] {
  const def = officeDef(id)
  const taken = new Set(
    OFFICES.map((one) => appointmentOf(state, one)?.holderId).filter(
      (holder): holder is string => holder !== undefined,
    ),
  )
  const own: Officer[] = state.companions
    .filter((one) => !one.captive && !taken.has(one.id))
    .map((one: Companion) => ({
      id: one.id,
      name: one.name,
      kind: 'companion' as const,
      skill: one.skills[def.skill] ?? 0,
    }))
  const vassals: Officer[] = vassalsOf(state)
    .filter((lord: Lord) => !taken.has(lord.id))
    .map((lord: Lord) => ({
      id: lord.id,
      name: `${lord.title} ${lord.name}`,
      kind: 'vassal' as const,
      skill: Math.min(8, Math.round(lord.strength / 12)),
    }))
  const hired = hiredCandidates(state).filter((one) => !taken.has(one.id))
  return [...own, ...vassals, ...hired].sort((a, b) => b.skill - a.skill)
}

/** Жалованье двора в сутки: должность стоит денег, даже когда молчит. */
export function courtWages(state: Pick<GameState, 'offices'>): number {
  let wages = 0
  for (const id of OFFICES) if (state.offices?.[id]) wages += OFFICE_DEFS[id].wage
  return wages
}

// --- что должность делает с числами державы --------------------------------

/** Во сколько раз меньше ворует управляющий при сенешале. */
export function skimGuard(state: GameState, day: number): number {
  return 1 - fitness(state, 'seneschal', day) * OFFICE_POWER.seneschal
}

/** Насколько больше людей приводят вассалы при маршале. */
export function musterBonus(state: GameState, day: number): number {
  return 1 + fitness(state, 'marshal', day) * OFFICE_POWER.marshal
}

/** Насколько больше берёт казна при казначее. */
export function treasuryBonus(state: GameState, day: number): number {
  return 1 + fitness(state, 'treasurer', day) * OFFICE_POWER.treasurer
}

/** Сколько верности в сутки добавляет канцлер. */
export function chancellorCalm(state: GameState, day: number): number {
  return fitness(state, 'chancellor', day) * OFFICE_POWER.chancellor
}

// --- совет (Д3) -------------------------------------------------------------

export interface Advice {
  readonly officeId: OfficeId
  /** Кто говорит. */
  readonly who: string
  /** Что он говорит — с числом, а не «всё плохо». */
  readonly says: string
  /** Чего он хочет сам. */
  readonly wants: string
}

/**
 * Что говорит совет.
 *
 * Совет — не подсказчик и не кнопка «сделать хорошо»: каждый говорит о своём
 * деле и числом. Пустая должность молчит — и в этом её цена: ты не знаешь того,
 * что знал бы твой человек.
 */
export function councilAdvice(state: GameState, day: number): readonly Advice[] {
  const out: Advice[] = []
  const mine = holdingsOf(state.settlements, PLAYER)
  const vassals = vassalsOf(state)
  for (const id of OFFICES) {
    const officer = officerAt(state, id)
    if (!officer) continue
    const def = officeDef(id)
    if (isAway(officer, day)) {
      out.push({
        officeId: id,
        who: `${def.label} ${officer.name}`,
        says: 'В отъезде: вернётся и доложит.',
        wants: def.speaks,
      })
      continue
    }
    if (id === 'seneschal') {
      const grain = mine.reduce((sum, one) => sum + one.stock.grain, 0)
      const people = mine.reduce((sum, one) => sum + one.population, 0)
      out.push({
        officeId: id,
        who: `${def.label} ${officer.name}`,
        says: `Мест ${mine.length}, людей ${Math.round(people)}, хлеба в амбарах ${Math.round(grain)}.`,
        wants:
          fitness(state, id, day) > 0
            ? 'Просит не поднимать подать выше обычая: соберём меньше, а не больше.'
            : 'Сам говорит, что в счёте не силён.',
      })
    }
    if (id === 'marshal') {
      const men = vassals.reduce((sum, lord) => sum + lord.strength, 0)
      out.push({
        officeId: id,
        who: `${def.label} ${officer.name}`,
        says: `У вассалов под рукой ${men} человек; на зов придёт меньше.`,
        wants: 'Просит держать гарнизоны полными: пустая крепость хуже, чем никакой.',
      })
    }
    if (id === 'treasurer') {
      out.push({
        officeId: id,
        who: `${def.label} ${officer.name}`,
        says: `В казне ${state.character.money}; двор ест ${courtWages(state)} в сутки.`,
        wants: 'Просит не заводить того, чего не прокормишь.',
      })
    }
    if (id === 'chancellor') {
      const worst = [...vassals].sort((a, b) => a.loyalty - b.loyalty)[0]
      out.push({
        officeId: id,
        who: `${def.label} ${officer.name}`,
        says: worst
          ? `Хуже всех к тебе ${worst.title} ${worst.name}: верность ${Math.round(worst.loyalty)}.`
          : `Вассалов у тебя ${vassals.length}: жаловаться на тебя пока некому.`,
        wants: 'Просит судить самому: суд, отданный на сторону, помнят.',
      })
    }
  }
  return out
}

// --- партии при своём дворе (Д4) --------------------------------------------

export interface CourtParty {
  readonly id: FactionId
  readonly label: string
  /** Как она к тебе: −100..100. */
  readonly mood: number
  readonly says: string
}

/**
 * Что думают о тебе при твоём же дворе.
 *
 * Те же четыре партии, что при коронах (этап 66): война и мир, старая кровь и
 * новые люди. Настроение не хранится — оно выводится из того, что ты сделал:
 * кого назначил, воюешь ли, как берёшь подать.
 */
export function courtParties(state: GameState, day: number): readonly CourtParty[] {
  const law = lawOf(state)
  const atWar = warsOf(state.politics, PLAYER).length > 0
  let own = 0
  let hired = 0
  for (const id of OFFICES) {
    const seat = appointmentOf(state, id)
    if (!seat) continue
    if (seat.kind === 'hired') hired += 1
    else own += 1
  }
  return FACTIONS.map((id) => {
    const def = FACTION_DEFS[id]
    let mood = 0
    if (id === 'hawks') mood += atWar ? COURT_MOOD.war : -COURT_MOOD.war / 2
    if (id === 'doves') mood += atWar ? -COURT_MOOD.war : COURT_MOOD.war / 2
    if (id === 'oldBlood') mood += own * COURT_MOOD.ownAppointed - hired * COURT_MOOD.hiredAppointed
    if (id === 'newMen') mood += hired * COURT_MOOD.hiredAppointed - own * COURT_MOOD.ownAppointed
    if (id === 'newMen' && TAX_DEFS[law.tax].take > 1) mood += COURT_MOOD.heavyTax
    if (id === 'doves' && TAX_DEFS[law.tax].take > 1) mood += COURT_MOOD.heavyTax / 2
    mood += chancellorCalm(state, day) * 100
    const bounded = Math.max(-100, Math.min(100, Math.round(mood)))
    return {
      id,
      label: def.label,
      mood: bounded,
      says:
        bounded > 20
          ? `${def.label}: «${def.asks}» И мы этого от тебя дождёмся.`
          : bounded < -20
            ? `${def.label}: «${def.asks}» А ты делаешь обратное.`
            : `${def.label}: «${def.asks}»`,
    }
  })
}

/** Насколько партии давят на верность вассалов: разлад при дворе слышен всем. */
export function courtPressure(state: GameState, day: number): number {
  const parties = courtParties(state, day)
  const angry = parties.filter((one) => one.mood < -20).length
  const happy = parties.filter((one) => one.mood > 20).length
  return (happy - angry) * COURT_MOOD.pressure
}

// --- поручения своим (Д5) ---------------------------------------------------

export function errandsFor(id: OfficeId): readonly OfficeErrandDef[] {
  return OFFICE_ERRANDS.filter((one) => one.office === id)
}

export function officeErrandDef(id: OfficeErrandId): OfficeErrandDef | null {
  return OFFICE_ERRANDS.find((one) => one.id === id) ?? null
}

export { ERRAND_COST, OFFICES, type OfficeId, type OfficeErrandId }
