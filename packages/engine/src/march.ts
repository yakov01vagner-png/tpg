import { MARCH, MARCH_WORDS } from './content/march'
import { TROOP_CARRY } from './content/troops'
import { PLAYER } from './holding'
import type { Party } from './party'
import { partySize } from './party'
import type { GameState } from './state'
import { seasonOf } from './time'
import { hopsBetween, roadsFrom } from './world/queries'
import type { World } from './world/types'

/**
 * Поход и снабжение (этап 173).
 *
 * Поход считался временем: столько-то часов дороги. Всё, что делает поход
 * походом, — хлеб, фураж, обоз, отставшие, разорённая округа, — либо не
 * считалось вовсе, либо считалось врозь и после. Оттого война выходила дешевле,
 * чем она есть: войско доходило куда угодно и в том же числе.
 *
 * Здесь у дороги появляется цена, и она видна **до выхода**: сколько хлеба
 * нужно, сколько суток идти, сколько людей отстанет и когда войско вернётся.
 * Ни одной новой величины: всё считается из отряда, земли и времени года.
 */

export interface MarchPlan {
  readonly from: string
  readonly to: string
  readonly hops: number
  readonly days: number
  /** Сколько хлеба съест войско за дорогу туда. */
  readonly bread: number
  /** И сколько фуража съедят кони. */
  readonly fodder: number
  /** Во сколько обойдётся дорога с поправкой на землю и время года. */
  readonly toll: number
  /** Сколько людей отстанет и сколько сляжет. */
  readonly stragglers: number
  readonly sick: number
  /** Сколько войско унесёт на себе и в обозе. */
  readonly carries: number
  /** На какой день вернётся, если пойдёт туда и обратно. */
  readonly backOn: number
  readonly says: string
}

/** Какова земля по дороге: своя, чужая или разорённая (Пх2). */
export function landAlong(
  state: GameState,
  world: World,
  to: string,
): { readonly kind: 'own' | 'foreign' | 'ravaged'; readonly says: string } {
  const place = state.settlements[to]
  if (place && place.banditry >= MARCH.ravagedAt) {
    return { kind: 'ravaged', says: MARCH_WORDS.ravaged }
  }
  if (place && place.owner === PLAYER) return { kind: 'own', says: MARCH_WORDS.fed }
  return { kind: 'foreign', says: MARCH_WORDS.foreign }
}

/** Что войско несёт с собой (Пх3). */
export function trainOf(party: Party): { readonly carries: number; readonly says: string } {
  const men = partySize(party)
  const carries = men * TROOP_CARRY + men * MARCH.trainCarries
  return {
    carries,
    says: `Обоз и руки: ${carries} веса — это ${Math.floor(carries / Math.max(1, men * MARCH.breadPerMan))} сут. хлеба на ${men} человек.`,
  }
}

/**
 * Что будет стоить поход (Пх1, Пх2, Пх4, Пх5).
 *
 * Считается до выхода: столько-то суток, столько-то хлеба, столько-то отстанет.
 * Ничего не хранится — из одного состояния выходит один и тот же счёт.
 */
export function marchPlan(
  state: GameState,
  world: World,
  to: string,
  day: number,
  party: Party = state.party,
): MarchPlan {
  const from = state.locationId
  const hops = hopsBetween(world, from, to) ?? 6
  const hours = roadsFrom(world, from).find((one) => one.to === to)?.hours ?? hops * 6
  const days = Math.max(1, Math.ceil((hours * Math.max(1, hops)) / MARCH.hoursPerDay))
  const men = partySize(party)
  const horses = party.units.horseman ?? 0
  const winter = seasonOf(day) === 'winter' ? MARCH.winter : 1
  const land = landAlong(state, world, to)
  const ground =
    land.kind === 'own' ? MARCH.ownLand : land.kind === 'ravaged' ? MARCH.ravaged : MARCH.foreign
  const bread = Math.round(men * MARCH.breadPerMan * days * winter * ground)
  const fodder = Math.round(horses * MARCH.fodderPerHorse * days * winter * ground)
  const train = trainOf(party)
  const hungry = bread + fodder > train.carries
  const stragglers = Math.round(
    (men / 100) * MARCH.stragglersPer100 * days * (hungry ? MARCH.hungryStraggles : 1),
  )
  const sick = hungry ? Math.round((men / 100) * MARCH.sickPer100 * days) : 0
  return {
    from,
    to,
    hops,
    days,
    bread,
    fodder,
    toll: Math.round(winter * ground * 100) / 100,
    stragglers,
    sick,
    carries: train.carries,
    backOn: day + days * 2,
    says: `${world.locations[to]?.name ?? to}: ${days} сут. пути, хлеба ${bread}${
      fodder > 0 ? `, фуража ${fodder}` : ''
    } (везёшь ${train.carries}). ${land.says}${winter > 1 ? ` ${MARCH_WORDS.winter}` : ''} Отстанет ${stragglers}${
      sick > 0 ? `, сляжет ${sick}` : ''
    }. Назад — к ${day + days * 2}-му дню.`,
  }
}

/** Что дорога делает с войском (Пх4). */
export function marchToll(
  plan: MarchPlan,
  party: Party,
): { readonly left: number; readonly lost: number; readonly says: string } {
  const men = partySize(party)
  const lost = Math.min(men, plan.stragglers + plan.sick)
  return {
    left: men - lost,
    lost,
    says:
      lost === 0
        ? 'Дошли все: дорога была короткой и сытой.'
        : `Из ${men} дошло ${men - lost}: отстало ${plan.stragglers}, слегло ${plan.sick}. ${MARCH_WORDS.back}`,
  }
}

/** Походы в числах (Пх6). */
export function marchRoll(
  rows: readonly { readonly men: number; readonly left: number; readonly days: number }[],
): {
  readonly marches: number
  readonly went: number
  readonly came: number
  readonly days: number
  readonly says: string
} {
  const went = rows.reduce((sum, one) => sum + one.men, 0)
  const came = rows.reduce((sum, one) => sum + one.left, 0)
  const days = rows.reduce((sum, one) => sum + one.days, 0)
  return {
    marches: rows.length,
    went,
    came,
    days,
    says:
      rows.length === 0
        ? 'Походов не было.'
        : `Походов ${rows.length} за ${days} сут.: вышло ${went}, дошло ${came} (${Math.round((came / Math.max(1, went)) * 100)} из ста).`,
  }
}
