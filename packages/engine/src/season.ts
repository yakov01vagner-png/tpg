import {
  ANNIVERSARY_DEFS,
  type AnniversaryId,
  FAIR_FOLK,
  FAIR_FOLK_DEFS,
  type FairFolk,
  SKY_DEFS,
  SKY_ODDS,
  type Sky,
} from './content/year'
import { fairAt, feastAt } from './fair'
import type { GameState } from './state'
import { DAYS_PER_YEAR, dayOfYear, seasonOf } from './time'
import type { World } from './world/types'

/**
 * Год как жизнь (этап 67).
 *
 * Год был временем года: зимой земля не родит, осенью жнут. Здесь у года
 * появляется день: погода этого дня, ярмарочная толпа этого дня, годовщина
 * этого дня — и календарь, по которому видно, что будет дальше.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

// --- погода дня (Я4) --------------------------------------------------------

/**
 * Какая погода стоит сегодня над этим местом.
 *
 * Выводится из дня и места, а не хранится: погода — не состояние мира, а его
 * свойство. Время года решает, что вероятно; день — что выпало. Соседние места
 * получают своё небо, но в один день и в одном поясе оно чаще совпадает, чем
 * нет: погода идёт полосами.
 */
export function skyOf(world: World, locationId: string, day: number): Sky {
  const place = world.locations[locationId]
  if (!place) return 'clear'
  const season = seasonOf(day)
  const odds = SKY_ODDS[season] ?? SKY_ODDS.spring
  if (!odds) return 'clear'
  // Полоса шириной примерно в область: место делится небом с соседями.
  const band = `${Math.round(place.x / 220)}|${Math.round(place.y / 220)}`
  const roll = hashOf(`sky|${band}|${day}`) % 100
  let sum = 0
  for (const [sky, chance] of Object.entries(odds)) {
    sum += chance
    if (roll < sum) return sky as Sky
  }
  return 'clear'
}

export function skyDef(sky: Sky) {
  return SKY_DEFS[sky]
}

/** Во сколько раз дольше идти в такую погоду. */
export function skyRoad(sky: Sky): number {
  return skyDef(sky).road
}

/** Насколько хуже видно цель: стрелкам это решает всё. */
export function skySight(sky: Sky): number {
  return skyDef(sky).sight
}

// --- ярмарочный люд (Я3) ----------------------------------------------------

export interface FairPerson {
  readonly kind: FairFolk
  readonly label: string
  readonly about: string
}

/**
 * Кто на ярмарке кроме торговых рядов.
 *
 * Выводится из места и дня ярмарки: купцы бывают всегда, прочие — как
 * повезёт. Ярмарка от этого перестаёт быть прибавкой к цене и становится
 * толпой, в которой что-то происходит.
 */
export function fairFolkAt(world: World, locationId: string, day: number): readonly FairPerson[] {
  if (!fairAt(world, locationId, day)) return []
  const hash = hashOf(`fair|${locationId}|${day}`)
  const out: FairPerson[] = []
  for (const [index, kind] of FAIR_FOLK.entries()) {
    // Купец на ярмарке есть всегда; прочие — через одного.
    const present = kind === 'merchant' || ((hash >>> (index * 3)) & 3) !== 0
    if (!present) continue
    out.push({ kind, label: FAIR_FOLK_DEFS[kind].label, about: FAIR_FOLK_DEFS[kind].about })
  }
  return out
}

export function hasFairFolk(
  world: World,
  locationId: string,
  day: number,
  kind: FairFolk,
): boolean {
  return fairFolkAt(world, locationId, day).some((one) => one.kind === kind)
}

// --- годовщины (Я5) ---------------------------------------------------------

export interface Anniversary {
  readonly id: AnniversaryId
  readonly label: string
  readonly says: string
  /** Сколько лет исполнилось. */
  readonly years: number
}

export function anniversaryDef(id: AnniversaryId) {
  return ANNIVERSARY_DEFS[id]
}

/**
 * Что за день сегодня лично для тебя.
 *
 * Годовщина — это тот же день года, что и событие, но не в тот же год.
 * Считается из того, что уже лежит в состоянии: день рождения, свадьба,
 * потеря, своё имя на карте.
 */
export function anniversariesOf(state: GameState, day: number): readonly Anniversary[] {
  const out: Anniversary[] = []
  const today = dayOfYear(day)
  const mark = (id: AnniversaryId, since: number) => {
    // День рождения героя лежит до начала мира: возраст отсчитан назад от
    // первого дня (dynasty.ts). Отрицательный день — такой же день года, как
    // всякий другой, и годовщина у него есть.
    if (since >= day) return
    if (dayOfYear(since) !== today) return
    const years = Math.floor((day - since) / DAYS_PER_YEAR)
    if (years < 1) return
    out.push({ id, label: ANNIVERSARY_DEFS[id].label, says: ANNIVERSARY_DEFS[id].says, years })
  }
  const family = state.character.family
  mark('birthday', state.character.bornDay ?? 0)
  if (family.spouse) mark('wedding', family.spouse.sinceDay)
  const fallen = state.fallen ?? []
  for (const one of fallen) mark('mourning', one.day)
  // Своё имя на карте: день, когда оно появилось, лежит в самом владении.
  if (state.realm?.sinceDay !== undefined) mark('realm', state.realm.sinceDay)
  return out
}

// --- календарь (Я6) ---------------------------------------------------------

export interface CalendarEntry {
  readonly day: number
  readonly kind: 'feast' | 'fair' | 'deadline' | 'season'
  readonly label: string
  readonly where?: string
}

/**
 * Что будет в этом году.
 *
 * Праздники, ярмарки, сроки взятых дел и повороты года — одним списком, по
 * дням вперёд. Ничего нового не считается: всё это уже есть в мире, просто до
 * сих пор было негде увидеть сразу.
 */
export function calendarOf(state: GameState, day: number, span = 120): readonly CalendarEntry[] {
  const out: CalendarEntry[] = []
  for (const quest of state.quests) {
    if (quest.deadlineDay < day || quest.deadlineDay > day + span) continue
    out.push({
      day: quest.deadlineDay,
      kind: 'deadline',
      label: 'срок дела',
      where: state.world.locations[quest.targetLocationId]?.name ?? '',
    })
  }
  const here = state.locationId
  for (let ahead = 0; ahead <= span; ahead += 1) {
    const when = day + ahead
    const feast = feastAt(state.world, here, when)
    if (feast && (ahead === 0 || !feastAt(state.world, here, when - 1))) {
      out.push({ day: when, kind: 'feast', label: feast.name })
    }
    const fair = fairAt(state.world, here, when)
    if (fair && (ahead === 0 || !fairAt(state.world, here, when - 1))) {
      out.push({ day: when, kind: 'fair', label: fair.name })
    }
    if (ahead > 0 && seasonOf(when) !== seasonOf(when - 1)) {
      out.push({ day: when, kind: 'season', label: seasonOf(when) })
    }
  }
  return out.sort((a, b) => a.day - b.day)
}
