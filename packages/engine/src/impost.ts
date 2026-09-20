import { TAX_DEFS } from './content/estate'
import { IMPOST, IMPOST_WORDS } from './content/impost'
import { vassalsOf } from './court'
import { lawOf } from './estate'
import { storeDays } from './fort'
import { PLAYER, dailyTax, holdingsOf } from './holding'
import { foodSecurity } from './life'
import { charterOf } from './realm'
import { reporterAt } from './report'
import { grudgeScore, plotAgainst } from './revolt'
import type { GameState } from './state'
import type { World } from './world/types'
import { obeyedAt } from './writ'

/**
 * Подать и недовольство (этап 185).
 *
 * Подать бралась сама: в казну капало число, а сборщики, утечка и недобор
 * считались в разных местах и нигде не сходились. Недовольство жило по частям —
 * память мест, настроение черни, обиды вассалов, — и мятеж вырастал не из него,
 * а из своего отдельного счёта.
 *
 * Здесь сбор становится работой с людьми, а недовольство — одним счётом на всю
 * державу: видно, откуда оно взялось и чем сбивается. Мятеж вырастает из него.
 */

export interface Collection {
  readonly locationId: string
  readonly due: number
  readonly taken: number
  readonly leaked: number
  readonly short: number
  readonly says: string
}

/** Как берут подать в этом месте (Пд1, Пд2). */
export function collectAt(
  state: GameState,
  world: World,
  locationId: string,
  day: number,
): Collection | null {
  const place = state.settlements[locationId]
  if (!place || place.owner !== PLAYER) return null
  const law = lawOf(state)
  const due = dailyTax(place, foodSecurity(place)) * TAX_DEFS[law.tax].take
  // Кто берёт: свой человек, честный или вороватый (0.8, донесения).
  const reporter = reporterAt(state, world, locationId, day)
  const leakShare = reporter?.kind === 'thief' ? IMPOST.leaksThief : IMPOST.leaksPlain
  const leaked = due * leakShare
  // Недобор: голодная и разорённая земля не даёт того, чего на ней нет, а
  // грамоты и обычай урезают ещё (этап 181).
  const hungry = storeDays(place) < 20 ? IMPOST.hungerShort : 0
  const raided = place.banditry >= 0.25 ? IMPOST.banditryShort * place.banditry : 0
  const obeyed = obeyedAt(state, world, locationId, 'tax').share
  const short = due * Math.min(0.9, hungry + raided + (1 - obeyed))
  const taken = Math.max(0, due - leaked - short)
  return {
    locationId,
    due: Math.round(due),
    taken: Math.round(taken),
    leaked: Math.round(leaked),
    short: Math.round(short),
    says: `${world.locations[locationId]?.name ?? locationId}: причиталось ${Math.round(due)}, дошло ${Math.round(taken)}; ${IMPOST_WORDS.leak} (${Math.round(leaked)})${short > 0 ? `; ${IMPOST_WORDS.short} (${Math.round(short)})` : ''}.`,
  }
}

/** Сбор по всей земле (Пд1). */
export function collectAll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly rows: readonly Collection[]
  readonly due: number
  readonly taken: number
  readonly says: string
} {
  const rows: Collection[] = []
  for (const one of holdingsOf(state.settlements, PLAYER)) {
    const row = collectAt(state, world, one.locationId, day)
    if (row) rows.push(row)
  }
  const due = rows.reduce((sum, one) => sum + one.due, 0)
  const taken = rows.reduce((sum, one) => sum + one.taken, 0)
  return {
    rows,
    due,
    taken,
    says:
      rows.length === 0
        ? 'Брать не с кого.'
        : `Причиталось ${due}, дошло ${taken} (${Math.round((taken / Math.max(1, due)) * 100)} из ста). Утекло ${rows.reduce((sum, one) => sum + one.leaked, 0)}, недобор ${rows.reduce((sum, one) => sum + one.short, 0)}.`,
  }
}

/**
 * Один счёт недовольства на державу (Пд3).
 *
 * Не «память мест» и не «настроение черни» отдельно, а одно число с названными
 * частями: от чего оно выросло и чем сбивается. Мятеж растёт из него же.
 */
export function unrestOf(
  state: GameState,
  world: World,
  day: number,
): {
  readonly score: number
  readonly parts: readonly { readonly what: string; readonly weight: number }[]
  readonly says: string
} {
  const mine = holdingsOf(state.settlements, PLAYER)
  const law = lawOf(state)
  const parts: { what: string; weight: number }[] = []
  if (TAX_DEFS[law.tax].take > 1) {
    parts.push({ what: 'тяжёлая подать', weight: IMPOST.heavyAnger * TAX_DEFS[law.tax].take })
  }
  if (TAX_DEFS[law.tax].take < 1) parts.push({ what: 'малая подать', weight: IMPOST.reliefCalm })
  const hungry = mine.filter((one) => storeDays(one) < 20).length
  if (hungry > 0)
    parts.push({ what: `голод в ${hungry} местах`, weight: hungry * IMPOST.hungerAnger })
  const raided = mine.filter((one) => one.banditry >= 0.25).length
  if (raided > 0) {
    parts.push({ what: `разбой в ${raided} местах`, weight: raided * IMPOST.banditryAnger })
  }
  const sulky = vassalsOf(state).filter((one) => one.loyalty < 45).length
  if (sulky > 0)
    parts.push({ what: `обиженных вассалов ${sulky}`, weight: sulky * IMPOST.sulkyAnger })
  const charters = mine.filter((one) => charterOf(state, one.locationId, day) !== null).length
  if (charters > 0) {
    parts.push({ what: `грамот дано ${charters}`, weight: charters * IMPOST.justiceCalm })
  }
  const score = Math.max(0, Math.round(parts.reduce((sum, one) => sum + one.weight, 0)))
  return {
    score,
    parts,
    says: `Недовольство ${score}: ${parts.map((one) => `${one.what} ${one.weight > 0 ? '+' : ''}${Math.round(one.weight)}`).join(', ') || 'ничего не гнетёт'}. ${
      score >= IMPOST.risesAt
        ? IMPOST_WORDS.rises
        : score > 30
          ? IMPOST_WORDS.heavy
          : IMPOST_WORDS.calm
    }`,
  }
}

/** Мятеж как последствие (Пд4, Пд5). */
export function risingNow(
  state: GameState,
  world: World,
  day: number,
): {
  readonly rising: boolean
  readonly leader: string | null
  readonly withThem: readonly string[]
  readonly withYou: readonly string[]
  readonly says: string
} {
  const unrest = unrestOf(state, world, day)
  const plot = plotAgainst(state, world, day)
  const rising = unrest.score >= IMPOST.risesAt && plot !== null
  const withThem: string[] = []
  const withYou: string[] = []
  for (const lord of vassalsOf(state)) {
    const grudge = grudgeScore(state, world, lord, day)
    ;(grudge >= 40 ? withThem : withYou).push(
      `${lord.title} ${lord.name} (обида ${Math.round(grudge)}, верность ${Math.round(lord.loyalty)})`,
    )
  }
  return {
    rising,
    leader: plot?.leaderName ?? null,
    withThem,
    withYou,
    says: rising
      ? `${IMPOST_WORDS.rises} Ведёт ${plot?.leaderName}. С ними: ${withThem.join('; ') || 'никого'}. С тобой: ${withYou.join('; ') || 'никого'}. ${IMPOST_WORDS.sides}`
      : unrest.score >= IMPOST.risesAt
        ? // Счёт дошёл, а вожака нет: роптать ропщут, а поднять некому. Это не
          // милость судьбы, а отсрочка — вожак заводится сам, как только
          // найдётся обиженный вассал.
          `${unrest.says} Счёт дошёл, но вожака нет: роптать ропщут, а поднять некому.`
        : `${unrest.says} До мятежа ${Math.max(0, IMPOST.risesAt - unrest.score)} по счёту.`,
  }
}

/** Подать и недовольство в числах (Пд6). */
export function impostRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly due: number
  readonly taken: number
  readonly leaked: number
  readonly unrest: number
  readonly says: string
} {
  const all = collectAll(state, world, day)
  const unrest = unrestOf(state, world, day)
  return {
    due: all.due,
    taken: all.taken,
    leaked: all.rows.reduce((sum, one) => sum + one.leaked, 0),
    unrest: unrest.score,
    says: `${all.says} ${unrest.says}`,
  }
}
