import { SCARS, SCARS_WORDS } from './content/scars'
import type { TroopId } from './content/troops'
import { TROOPS } from './content/troops'
import { rememberedOf } from './folk'
import { PLAYER, holdingsOf } from './holding'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Потери, раненые и ветераны (этап 174).
 *
 * Раненые возвращались в строй в тот же день: доля павших просто прибавлялась
 * обратно. Война не оставляла следа — ни лазарета, ни выплат семьям, ни
 * разницы между дружиной, вышедшей из войны, и набранной заново.
 *
 * Здесь у потерь появляется срок. Раненый — не убитый, но и не строевой: он
 * лежит столько, сколько лежит, и часть его товарищей не встанет вовсе. В
 * состоянии от этого прибавляется только лазарет (кто лежит и до какого дня):
 * вывести его из мира нельзя — это история этого боя.
 */

/** Раненый: кто, чем был и когда встанет. */
export interface Hurt {
  readonly name: string
  readonly troop: TroopId
  readonly sinceDay: number
  readonly untilDay: number
  /** Где лечится: это решает срок. */
  readonly where: 'field' | 'healer' | 'monastery' | 'home'
}

export function hurtOf(state: Pick<GameState, 'hurt'>): readonly Hurt[] {
  return (state.hurt ?? []) as readonly Hurt[]
}

/** Сколько суток встаёт раненый в таком месте (Пт2). */
export function healDays(where: Hurt['where']): number {
  const pace =
    where === 'healer'
      ? SCARS.healer
      : where === 'monastery'
        ? SCARS.monastery
        : where === 'home'
          ? SCARS.home
          : 1
  return Math.round(SCARS.healDays * pace)
}

/**
 * Кто из павших на самом деле ранен (Пт1).
 *
 * Держащий поле подбирает своих; бежавший оставляет их там, где они легли.
 * Ранены — не значит спасены: часть не встанет.
 */
export function woundedFrom(
  fallen: Readonly<Partial<Record<TroopId, number>>>,
  held: boolean,
): Partial<Record<TroopId, number>> {
  const share = held ? SCARS.woundedShare : SCARS.lostFieldShare
  const back: Partial<Record<TroopId, number>> = {}
  for (const [id, count] of Object.entries(fallen)) {
    const saved = Math.floor((count ?? 0) * share)
    if (saved > 0) back[id as TroopId] = saved
  }
  return back
}

/** Положить раненых в лазарет: они не в строю и встанут не сразу (Пт1, Пт2). */
export function toHospital(
  hurt: readonly Hurt[],
  wounded: Readonly<Partial<Record<TroopId, number>>>,
  names: readonly string[],
  day: number,
  where: Hurt['where'],
): readonly Hurt[] {
  const rows: Hurt[] = [...hurt]
  let at = 0
  for (const [troop, count] of Object.entries(wounded)) {
    for (let i = 0; i < (count ?? 0); i += 1) {
      rows.push({
        name: names[at] ?? `${TROOPS[troop as TroopId].label} без имени`,
        troop: troop as TroopId,
        sinceDay: day,
        untilDay: day + healDays(where),
        where,
      })
      at += 1
    }
  }
  return rows.slice(-SCARS.remembers)
}

/** Кто встал, кто не встал и кто ещё лежит (Пт2). */
export function hospitalAt(
  hurt: readonly Hurt[],
  day: number,
): {
  readonly back: readonly Hurt[]
  readonly died: readonly Hurt[]
  readonly lying: readonly Hurt[]
} {
  const back: Hurt[] = []
  const died: Hurt[] = []
  const lying: Hurt[] = []
  for (const one of hurt) {
    if (day < one.untilDay) {
      lying.push(one)
      continue
    }
    // Не всякая рана заживает: решает не кубик, а сама рана — тот, кто лежал
    // дольше срока, и есть тот, кто не встал.
    const dies = hashOf(`wound|${one.name}|${one.sinceDay}`) % 100 < SCARS.diesOfWounds * 100
    if (dies) died.push(one)
    else back.push(one)
  }
  return { back, died, lying }
}

/** Ветеран виден (Пт3): числами и словами. */
export function veteranSays(state: GameState, day: number): string {
  const veterans = state.party.veterans ?? 0
  const size = Object.values(state.party.units).reduce((sum, one) => sum + (one ?? 0), 0)
  if (size === 0) return 'Отряда нет.'
  const share = Math.round((Math.min(veterans, size) / size) * 100)
  return `В строю ${size}, из них прошедших бой ${Math.min(veterans, size)} (${share} из ста). ${
    share >= 60 ? SCARS_WORDS.veteran : 'Больше половины ещё не видели строя напротив.'
  }`
}

/**
 * Память о павших (Пт4).
 *
 * За павшего платят семье, и земля это помнит. Не заплатил — помнит тоже, и
 * тогда это ложится на места, из которых их брали.
 */
export function bloodDue(
  state: GameState,
  day: number,
): { readonly fallen: number; readonly due: number; readonly says: string } {
  const fallen = rememberedOf(state).filter((one) => one.how === 'fell').length
  const due = fallen * SCARS.bloodMoney
  return {
    fallen,
    due,
    says:
      fallen === 0
        ? 'Павших за тобой нет.'
        : `Павших ${fallen}; за них причитается ${due} серебра. ${
            (state.bloodPaid ?? 0) >= due ? SCARS_WORDS.paid : SCARS_WORDS.unpaid
          }`,
  }
}

/** Что осталось от дружины через год после войны (Пт5). */
export function hostAfter(
  state: GameState,
  world: World,
  day: number,
): {
  readonly men: number
  readonly lying: number
  readonly veterans: number
  readonly places: number
  readonly says: string
} {
  const men = Object.values(state.party.units).reduce((sum, one) => sum + (one ?? 0), 0)
  const lying = hospitalAt(hurtOf(state), day).lying.length
  const veterans = Math.min(state.party.veterans ?? 0, men)
  const places = holdingsOf(state.settlements, PLAYER).length
  return {
    men,
    lying,
    veterans,
    places,
    says: `${SCARS_WORDS.after} В строю ${men}, в лазарете ${lying}, ветеранов ${veterans}; мест под рукой ${places}.`,
  }
}

/** Потери в числах (Пт6). */
export function scarsRoll(
  state: GameState,
  day: number,
): {
  readonly fell: number
  readonly hurt: number
  readonly back: number
  readonly died: number
  readonly says: string
} {
  const fell = rememberedOf(state).filter((one) => one.how === 'fell').length
  const rows = hurtOf(state)
  const { back, died, lying } = hospitalAt(rows, day)
  return {
    fell,
    hurt: rows.length,
    back: back.length,
    died: died.length,
    says: `Пало ${fell}, ранено ${rows.length}: встало в строй ${back.length}, не встало ${died.length}, лежит ${lying.length}.`,
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
