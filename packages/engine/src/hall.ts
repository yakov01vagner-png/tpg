import { HALL, HALL_WORDS, TIE_DEFS, type TieKind } from './content/hall'
import { OFFICES, type OfficeId } from './content/offices'
import { type CourtPerson, askWords, asksNow, courtiersOf } from './courtier'
import { officeDef } from './office'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Двор, который живёт (этап 168).
 *
 * С этапа 104 у должности есть человек: нрав, годы, цель и голос. Чего не было
 * — двора как целого. Люди стояли в столбик и не знали друг о друге: не с кем
 * было сойтись против третьего, некого потерять и не из-за чего.
 *
 * Здесь двор становится связями. И здесь тоже ничего не заводится в состоянии:
 * дружба, вражда, родство и общая выгода **выводятся** из того, кто эти люди —
 * из нравов, целей и имён. Один и тот же двор всегда один и тот же; меняются
 * связи тогда, когда меняются люди.
 */

export interface Tie {
  readonly a: CourtPerson
  readonly b: CourtPerson
  readonly kind: TieKind
  readonly says: string
}

/**
 * Кто с кем (Дв2).
 *
 * Вражда — из нравов и из того, что двоим нужно одно место; дружба — из общего
 * нрава; родство — из имён (свояки бывают и при дворе); общая выгода — из
 * одинаковой цели. Всё считается, и ничего не хранится.
 */
export function tiesOf(state: GameState, day: number): readonly Tie[] {
  const people = courtiersOf(state, day)
  const rows: Tie[] = []
  for (let i = 0; i < people.length; i += 1) {
    for (let j = i + 1; j < people.length; j += 1) {
      const a = people[i] as CourtPerson
      const b = people[j] as CourtPerson
      const kind = tieBetween(a, b)
      if (!kind) continue
      rows.push({
        a,
        b,
        kind,
        says: `${a.name} и ${b.name}: ${TIE_DEFS[kind].label}. ${TIE_DEFS[kind].about}`,
      })
    }
  }
  return rows
}

export function tieBetween(a: CourtPerson, b: CourtPerson): TieKind | null {
  const seed = hashOf(`tie|${[a.id, b.id].sort().join('|')}`)
  // Родство редко и не зависит ни от чего, кроме имён: свояки — это свояки.
  if (seed % 11 === 0) return 'kin'
  // Гордый с гордым и хитрый с прямодушным не уживаются нигде.
  if (a.temper === b.temper && (a.temper === 'proud' || a.temper === 'sly')) return 'foe'
  if (
    (a.temper === 'sly' && b.temper === 'kindly') ||
    (a.temper === 'kindly' && b.temper === 'sly')
  ) {
    return 'foe'
  }
  // Двоим нужно одно и то же — и на обоих этого не хватит.
  if (a.wants === b.wants) return seed % 3 === 0 ? 'foe' : 'party'
  if (a.temper === b.temper) return 'friend'
  return null
}

/** Насколько двор тянет верность этого человека (Дв2). */
export function pullOn(state: GameState, who: OfficeId, day: number): number {
  let pull = 0
  for (const tie of tiesOf(state, day)) {
    if (tie.a.office !== who && tie.b.office !== who) continue
    pull += tie.kind === 'foe' ? HALL.feudCosts : tie.kind === 'friend' ? HALL.friendGives : 0
  }
  return pull
}

/**
 * Что он может сделать для тебя сам (Дв3).
 *
 * Не просьба, а услуга: у каждого места есть то, что оно умеет, и человек
 * предлагает это, когда доволен. Услуга берётся из должности, а охота её
 * оказать — из верности.
 */
export function offerOf(one: CourtPerson): { readonly what: string; readonly says: string } | null {
  if (one.loyalty < 50) return null
  const what = OFFER_BY_OFFICE[one.office] ?? null
  if (!what) return null
  return { what, says: `${one.name} предлагает сам: ${what}` }
}

const OFFER_BY_OFFICE: Partial<Record<OfficeId, string>> = {
  seneschal: 'взять на себя суд по мелким тяжбам, чтобы у тебя было время',
  marshal: 'объехать вассалов и напомнить им о людях к походу',
  treasurer: 'занять у городов под твоё слово, не доводя до грамоты',
  chancellor: 'написать соседу так, чтобы вышло мягче, чем ты сказал',
}

/** Что будет, если это место опустеет (Дв4). */
export function lossOf(state: GameState, office: OfficeId, day: number): string {
  const def = officeDef(office)
  const one = courtiersOf(state, day).find((row) => row.office === office)
  return one
    ? `${one.name} (${def.label.toLowerCase()}): ${HALL_WORDS.costs} ${def.does}`
    : `${def.label}: место и так пусто.`
}

/** Кто при дворе смотрит на сторону и почему (Дв4). */
export function slipping(
  state: GameState,
  day: number,
): readonly { readonly who: CourtPerson; readonly why: string; readonly breaks: boolean }[] {
  const rows: { who: CourtPerson; why: string; breaks: boolean }[] = []
  for (const one of courtiersOf(state, day)) {
    const pull = pullOn(state, one.office, day)
    const feud = tiesOf(state, day).some(
      (tie) => tie.kind === 'foe' && (tie.a.office === one.office || tie.b.office === one.office),
    )
    const worth = one.loyalty + pull - (feud ? HALL.feudTempts : 0)
    if (worth >= HALL.slippery) continue
    rows.push({
      who: one,
      why: feud
        ? `${HALL_WORDS.feud} Верность ${one.loyalty}, при дворе враг.`
        : `${HALL_WORDS.slipping} Верность ${one.loyalty}.`,
      breaks: worth < HALL.breaks,
    })
  }
  return rows
}

/** Двор одним взглядом (Дв5). */
export function hallNow(
  state: GameState,
  world: World,
  day: number,
): {
  readonly people: readonly CourtPerson[]
  readonly ties: readonly Tie[]
  readonly asks: readonly string[]
  readonly offers: readonly string[]
  readonly risky: readonly string[]
  readonly says: string
} {
  const people = courtiersOf(state, day)
  const ties = tiesOf(state, day)
  const asks = people.filter((one) => asksNow(one, day)).map((one) => askWords(one))
  const offers = people
    .map((one) => offerOf(one))
    .filter((one): one is { what: string; says: string } => one !== null)
    .map((one) => one.says)
  const risky = slipping(state, day).map((one) => `${one.who.name}: ${one.why}`)
  const feuds = ties.filter((one) => one.kind === 'foe').length
  return {
    people,
    ties,
    asks,
    offers,
    risky,
    says:
      people.length === 0
        ? 'Двора нет: должности пусты.'
        : `При дворе ${people.length} из ${OFFICES.length}; связей ${ties.length}, из них вражды ${feuds}; просят ${asks.length}, предлагают ${offers.length}, смотрят на сторону ${risky.length}. ${feuds > 0 ? HALL_WORDS.feud : HALL_WORDS.quiet}`,
  }
}

/** Двор в числах (Дв6). */
export function hallRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly seats: number
  readonly risen: number
  readonly feuds: number
  readonly through: number
  readonly lost: number
  readonly says: string
} {
  const people = courtiersOf(state, day)
  const risen = people.filter((one) => one.years >= HALL.risenYears).length
  const feuds = tiesOf(state, day).filter((one) => one.kind === 'foe').length
  const log = state.hallLog ?? { through: 0, lost: 0 }
  return {
    seats: people.length,
    risen,
    feuds,
    through: log.through,
    lost: log.lost,
    says: `Мест занято ${people.length} из ${OFFICES.length}; выслужившихся ${risen}, вражды ${feuds}. Через двор прошло ${log.through}, потеряно ${log.lost}.`,
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
