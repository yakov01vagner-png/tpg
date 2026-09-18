import { PLAYER, holdingsOf } from './holding'
import type { GameState } from './state'
import { dayOf } from './time'
import type { Lord } from './war'

/**
 * Двор (этап 43): суд и решения.
 *
 * Своё владение перестаёт быть строкой «у тебя есть замок»: у земли есть люди,
 * у людей — споры, и спор между своими решает тот, кто держит землю. Дело
 * приходит само, раз в месяц, и не уходит, пока не решено; решение — выбор с
 * последствиями, а не кнопка «выслушать».
 *
 * Дела не лежат в состоянии: они выводятся из земли, вассалов и дня. В
 * состоянии только то, когда суд был в последний раз (`courtDay`).
 */
export type CourtChoice = 'first' | 'second' | 'split' | 'peasants' | 'lord' | 'grant' | 'refuse'

export interface CourtCase {
  readonly id: string
  readonly kind: 'landDispute' | 'complaint' | 'remission'
  readonly title: string
  readonly text: string
  /** Кто замешан: лорды и место. */
  readonly lords: readonly Lord[]
  readonly locationId: string | null
  readonly choices: readonly {
    readonly id: CourtChoice
    readonly label: string
    readonly hint: string
  }[]
}

/** Раз в месяц: чаще двор — не суд, а приёмная. */
export const COURT_DAYS = 30

export function vassalsOf(state: GameState): readonly Lord[] {
  return state.politics.lords.filter((lord) => lord.kingdomId === PLAYER)
}

function hashOf(id: string): number {
  let hash = 2166136261
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Дело, которое ждёт суда сейчас, — если ждёт. */
export function courtCase(state: GameState): CourtCase | null {
  const today = dayOf(state.time)
  if (today - (state.courtDay ?? 0) < COURT_DAYS) return null
  const holdings = holdingsOf(state.settlements, PLAYER)
  if (holdings.length === 0) return null
  const vassals = vassalsOf(state)
  const seed = hashOf(`court:${Math.floor(today / COURT_DAYS)}`)
  const holding = holdings[seed % holdings.length]
  const place = holding ? state.world.locations[holding.locationId] : undefined
  const kind = seed % 3

  if (kind === 0 && vassals.length >= 2) {
    const first = vassals[(seed >>> 3) % vassals.length] as Lord
    const second = vassals.find((lord) => lord.id !== first.id) as Lord
    return {
      id: `case:${seed}`,
      kind: 'landDispute',
      title: 'Спор о меже',
      text: `${first.title} ${first.name} и ${second.title} ${second.name} спорят о пограничной пустоши: каждый показывает свою грамоту. Оба смотрят на тебя.`,
      lords: [first, second],
      locationId: null,
      choices: [
        { id: 'first', label: `Отдать ${first.name}`, hint: 'один благодарен, другой обижен' },
        { id: 'second', label: `Отдать ${second.name}`, hint: 'один благодарен, другой обижен' },
        { id: 'split', label: 'Разделить пополам', hint: 'оба недовольны, но никто не враг' },
      ],
    }
  }
  if (kind === 1 && vassals.length >= 1 && place) {
    const lord = vassals[(seed >>> 5) % vassals.length] as Lord
    return {
      id: `case:${seed}`,
      kind: 'complaint',
      title: 'Жалоба на лорда',
      text: `Крестьяне из ${place.name} жалуются на ${lord.title.toLowerCase()} ${lord.name}: берёт лишнее и судит по-своему. Он стоит тут же и ждёт, чью сторону ты возьмёшь.`,
      lords: [lord],
      locationId: holding?.locationId ?? null,
      choices: [
        {
          id: 'peasants',
          label: 'Взять сторону крестьян',
          hint: 'земля тебя запомнит, лорд — тоже',
        },
        { id: 'lord', label: 'Оставить лорду', hint: 'лорд верен, землю не спросишь' },
      ],
    }
  }
  if (!place) return null
  return {
    id: `case:${seed}`,
    kind: 'remission',
    title: 'Прошение о податях',
    text: `Старшины ${place.name} просят простить подати на месяц: год тяжёлый, и платить нечем. Казна это заметит.`,
    lords: [],
    locationId: holding?.locationId ?? null,
    choices: [
      { id: 'grant', label: 'Простить', hint: 'месяц без податей отсюда; земля благодарна' },
      { id: 'refuse', label: 'Взять своё', hint: 'подати в срок; земля помнит и это' },
    ],
  }
}

/** Насколько вассал верит тому, за кем идёт: словом. */
export function loyaltyWord(loyalty: number): string {
  if (loyalty < 12) return 'на грани мятежа'
  if (loyalty < 30) return 'ропщет'
  if (loyalty < 55) return 'служит'
  if (loyalty < 80) return 'верен'
  return 'предан'
}
