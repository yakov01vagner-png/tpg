import { COURT_TEMPER_DEFS } from './content/courtier'
import { type CourtPerson, courtiersOf } from './courtier'
import { PLAYER, holdingsOf } from './holding'
import type { Word } from './known'
import { reporterAt, skimAt, skimTotal, truthAt } from './report'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Что от тебя скрывают (этап 105).
 *
 * Отчёт уже врёт в мелочах (этап 100), а у людей двора уже есть свой интерес
 * (этап 104). Здесь эти две вещи сходятся: двор решает не только что тебе
 * сказать, но и когда. Хорошее доходит первым и целиком, дурное — позже и
 * мягче; свои прикрывают своих; и всегда находится тот, кто за плату расскажет
 * о другом — не из любви к правде, а из своей выгоды.
 *
 * Ничего не прячется молча: у всякой утайки есть след — расхождение, задержка
 * или донос. Найти его можно, и это стоит денег или отношений.
 */

export const HIDDEN = {
  /** На сколько суток дурная весть отстаёт от доброй у угодливого двора. */
  badNewsDays: 12,
  /** Насколько двор смягчает дурное, прежде чем доложить. */
  softens: 0.7,
  /** Сколько просит доносчик. */
  denounceSilver: 700,
  /** Насколько донос верен, если доносит дошлый. */
  slyTruth: 0.55,
  /** И если ревностный. */
  zealousTruth: 0.9,
  /** Насколько принятый донос роняет верность оболганного. */
  denouncedAnger: -18,
} as const

export const HIDDEN_WORDS = {
  good: 'Доброе доходит первым.',
  bad: 'Дурное доходит позже и мягче, чем оно есть.',
  covers: 'Свои прикрывают своих: об этом тебе не скажут.',
  denounce: 'Доносят своим шёпотом и за свою цену.',
  clean: 'Прятать нечего: двор чист.',
} as const

/** Насколько эта весть отстанет и насколько смягчится. */
export function shading(
  courtier: CourtPerson | null,
  good: boolean,
): { readonly days: number; readonly soften: number } {
  if (!courtier || good) return { days: 0, soften: 1 }
  const def = COURT_TEMPER_DEFS[courtier.temper]
  // Угодливый и дошлый тянут с дурным; ревностный несёт как есть.
  const drag = courtier.temper === 'kindly' || courtier.temper === 'sly' ? 1 : 0.4
  const zeal = def.work >= 1.2 ? 0 : 1
  return {
    days: Math.round(HIDDEN.badNewsDays * drag * zeal),
    soften: 1 - (1 - HIDDEN.softens) * drag * zeal,
  }
}

/** Кто кого прикрывает (С3). */
export function coversFor(
  state: GameState,
  day: number,
): readonly { readonly who: string; readonly whom: string; readonly why: string }[] {
  const people = courtiersOf(state, day)
  const out: { who: string; whom: string; why: string }[] = []
  for (const one of people) {
    for (const other of people) {
      if (one.id === other.id) continue
      const both =
        COURT_TEMPER_DEFS[one.temper].hand >= 1.2 && COURT_TEMPER_DEFS[other.temper].hand >= 1.2
      if (!both) continue
      out.push({
        who: one.name,
        whom: other.name,
        why: 'Оба берут своё: рука руку моет, и о второй тебе не скажет первая.',
      })
    }
  }
  return out
}

export interface Denounce {
  /** Кто доносит. */
  readonly from: string
  /** На кого. */
  readonly about: string
  readonly locationId: string
  readonly silver: number
  /** Насколько он вероятно прав. */
  readonly truth: number
  readonly says: string
}

/**
 * Донос (С5).
 *
 * Доносит тот, кому это выгодно: ревностный — из усердия и почти всегда верно,
 * дошлый — чтобы убрать соперника, и правда ему не обязательна. Донос стоит
 * серебра, а принятый — верности того, на кого донесли.
 */
export function denounceOffer(state: GameState, world: World, day: number): Denounce | null {
  const people = courtiersOf(state, day)
  const teller = people.find(
    (one) => one.temper === 'zealous' || one.temper === 'sly' || one.temper === 'proud',
  )
  if (!teller) return null
  const thief = holdingsOf(state.settlements, PLAYER).find(
    (one) => skimAt(state, world, one.locationId, day) > 0,
  )
  if (!thief) return null
  const reporter = reporterAt(state, world, thief.locationId, day)
  const truth =
    teller.temper === 'zealous'
      ? HIDDEN.zealousTruth
      : teller.temper === 'sly'
        ? HIDDEN.slyTruth
        : 0.75
  return {
    from: teller.name,
    about: reporter?.name ?? 'наместник',
    locationId: thief.locationId,
    silver: HIDDEN.denounceSilver,
    truth,
    says: `${teller.name} шепчет: «${reporter?.name ?? 'наместник'} в ${world.locations[thief.locationId]?.name} кладёт твоё себе». Просит ${HIDDEN.denounceSilver} за слово.`,
  }
}

/** Весть от доносчика: она не «видел сам», а «донесли свои» (С5). */
export function denounceWord(offer: Denounce, value: number, day: number): Word {
  return {
    id: `word:denounce:${offer.locationId}`,
    to: PLAYER,
    kind: 'purse',
    about: offer.locationId,
    value,
    source: 'own',
    from: offer.from,
    day,
  }
}

export interface LossLedger {
  readonly skim: number
  readonly hidden: number
  readonly covers: number
  readonly says: string
}

/** Сколько державы утекает мимо тебя (С6). */
export function lossLedger(state: GameState, world: World, day: number): LossLedger {
  const skim = skimTotal(state, world, day)
  let hidden = 0
  for (const one of holdingsOf(state.settlements, PLAYER)) {
    const said = truthAt(state, one.locationId, 'banditry')
    hidden += Math.round(said * (1 - HIDDEN.softens))
  }
  const covers = coversFor(state, day).length
  return {
    skim,
    hidden,
    covers,
    says:
      skim === 0 && covers === 0
        ? HIDDEN_WORDS.clean
        : `Мимо казны уходит ${skim} в месяц; дурного в отчётах смягчено на ${hidden} из ста по всем местам; прикрывают друг друга ${covers} пар.`,
  }
}
