import { BEHEST, BEHEST_DEFS, BEHEST_WORDS, type BehestKind } from './content/behest'
import { COURT_TEMPER_DEFS } from './content/courtier'
import { type CourtPerson, courtiersOf } from './courtier'
import type { GameState } from './state'
import { neighbourSettlements } from './world/queries'
import type { World } from './world/types'

/**
 * Приказ и исполнение (этап 108).
 *
 * Между словом государя и делом на земле всегда есть человек. До 0.8 его не
 * было: команда исполнялась в тот же миг и ровно так, как задумано. Здесь
 * приказ идёт дорогой, исполняется чужими руками и возвращается отчётом — и
 * каждая из трёх частей может пойти не так.
 *
 * Нрав исполнителя решает, что выйдет: ревностный сделает больше велённого,
 * дошлый оставит себе, усталый сделает вполовину, гордый — по-своему. Это не
 * случайность: это тот же нрав, по которому он говорит и просит (этап 104).
 */

export interface Behest {
  readonly id: string
  readonly kind: BehestKind
  /** Куда послан. */
  readonly locationId: string
  /** Чьей рукой: должность, которой поручено. */
  readonly byOffice: string | null
  readonly sentDay: number
  /** Когда дойдёт, когда сделают и когда об этом доложат. */
  readonly arrivesDay: number
  readonly doneDay: number
  readonly backDay: number
  /** Что вышло, когда дело сделано. */
  readonly outcome?: 'full' | 'own' | 'short' | 'none'
  readonly share?: number
}

export function behestDef(kind: BehestKind) {
  return BEHEST_DEFS[kind]
}

export function behestsOf(state: Pick<GameState, 'behests'>): readonly Behest[] {
  return state.behests ?? []
}

function hopsTo(world: World, from: string, to: string): number {
  if (from === to) return 0
  const near = neighbourSettlements(world, from, 9)
  return near.find((one) => one.id === to)?.hops ?? 9
}

/** Сколько займёт весь круг: дорога, дело и отчёт обратно (Пр1). */
export function behestPlan(
  world: World,
  from: string,
  to: string,
  kind: BehestKind,
  day: number,
  /** Насколько быстрее едет гонец: дело командования (этап 123, Н1). */
  speed = 1,
): Behest {
  const hops = hopsTo(world, from, to)
  const road = Math.max(1, Math.round(hops * BEHEST.daysPerHop * speed))
  const def = BEHEST_DEFS[kind]
  const arrives = day + road
  const done = arrives + def.days
  return {
    id: `behest:${kind}:${to}:${day}`,
    kind,
    locationId: to,
    byOffice: null,
    sentDay: day,
    arrivesDay: arrives,
    doneDay: done,
    backDay: done + Math.max(1, Math.round(hops * BEHEST.backDaysPerHop * speed)),
  }
}

/**
 * Что выйдет из приказа в этих руках (Пр2 и Пр3).
 *
 * Считается нравом, а не броском: у одного и того же человека один и тот же
 * приказ выходит одинаково. Оттого исполнителя выбирают, а не надеются.
 */
export function outcomeOf(one: CourtPerson | null): {
  readonly outcome: 'full' | 'own' | 'short' | 'none'
  readonly share: number
  readonly says: string
} {
  if (!one) {
    return {
      outcome: 'short',
      share: BEHEST.weary,
      says: 'Некому было поручить: сделали как смогли.',
    }
  }
  const def = COURT_TEMPER_DEFS[one.temper]
  if (one.temper === 'zealous') {
    return {
      outcome: 'full',
      share: BEHEST.zealous,
      says: `${one.name} сделал больше велённого: ${BEHEST_WORDS.done}`,
    }
  }
  if (one.temper === 'sly') {
    return {
      outcome: 'short',
      share: 1 - BEHEST.slyTakes,
      says: `${one.name} исполнил, но часть осела по дороге.`,
    }
  }
  if (one.temper === 'weary') {
    return {
      outcome: 'short',
      share: BEHEST.weary,
      says: `${one.name}: ${BEHEST_WORDS.short}`,
    }
  }
  if (one.temper === 'proud') {
    return {
      outcome: 'own',
      share: BEHEST.proudOwnWay + def.work / 4,
      says: `${one.name}: ${BEHEST_WORDS.ownWay} Он считает, что знает лучше.`,
    }
  }
  return {
    outcome: 'full',
    share: 1,
    says: `${one.name}: ${BEHEST_WORDS.done}`,
  }
}

/** Кто возьмётся за такой приказ. */
export function handFor(state: GameState, kind: BehestKind, day: number): CourtPerson | null {
  const people = courtiersOf(state, day)
  if (people.length === 0) return null
  const wanted =
    kind === 'collect'
      ? 'treasurer'
      : kind === 'muster'
        ? 'marshal'
        : kind === 'punish'
          ? 'marshal'
          : 'seneschal'
  return people.find((one) => one.office === wanted) ?? people[0] ?? null
}

/** Можно ли ещё отозвать (Пр5). */
export function recallable(behest: Behest, day: number): boolean {
  return day < behest.arrivesDay
}

export function behestWords(behest: Behest, day: number): string {
  const def = BEHEST_DEFS[behest.kind]
  if (day < behest.arrivesDay)
    return `${def.label}: ${BEHEST_WORDS.road} Дойдёт на ${behest.arrivesDay}-й день.`
  if (day < behest.doneDay)
    return `${def.label}: ${BEHEST_WORDS.doing} Кончат на ${behest.doneDay}-й.`
  if (day < behest.backDay) return `${def.label}: сделано, отчёт в пути до ${behest.backDay}-го.`
  return `${def.label}: ${BEHEST_WORDS.done}`
}

export interface BehestLedger {
  readonly sent: number
  readonly onRoad: number
  readonly full: number
  readonly twisted: number
  readonly says: string
}

/** Исполнение в числах (Пр6). */
export function behestLedger(state: Pick<GameState, 'behests' | 'behestLog'>): BehestLedger {
  const live = behestsOf(state)
  const log = state.behestLog ?? { sent: 0, full: 0, twisted: 0, none: 0 }
  return {
    sent: log.sent,
    onRoad: live.length,
    full: log.full,
    twisted: log.twisted + log.none,
    says:
      log.sent === 0
        ? 'Приказов ты пока не посылал.'
        : `Приказов послано ${log.sent}: исполнено как велено ${log.full}, по-своему или вполовину ${log.twisted}, не исполнено ${log.none}. В дороге сейчас ${live.length}.`,
  }
}

export { BEHEST, BEHEST_DEFS, BEHEST_WORDS, type BehestKind }
