import { crownPlaces } from './company'
import { CURVE, CURVE_WORDS, REASONS, REASON_DEFS, type ReasonId } from './content/curve'
import { sideName } from './dread'
import { PLAYER, holdingsOf } from './holding'
import { reignOf } from './royal'
import type { GameState } from './state'
import { atWar, warsOf } from './war'
import type { Walker } from './way'
import type { World } from './world/types'

/**
 * Долгие процессы (этап 145).
 *
 * Кривая — единственное в этой версии, что нельзя вывести: прошлое не
 * выводится из настоящего. Хранятся редкие замеры (раз в год, двадцать штук), а
 * всё остальное — направление, длительность, причины — считается из них.
 */

export function reasonDef(id: ReasonId) {
  return REASON_DEFS[id]
}

export function samplesOf(state: GameState, who: Walker): readonly number[] {
  return state.curves?.[who] ?? []
}

/** Куда идёт эта держава и сколько лет уже идёт (Дл1 и Дл3). */
export function curveOf(
  state: GameState,
  world: World,
  who: Walker,
  day: number,
): {
  readonly trend: 'rise' | 'fall' | 'still'
  readonly years: number
  readonly from: number
  readonly now: number
  readonly says: string
} {
  const rows = samplesOf(state, who)
  const now =
    who === PLAYER ? holdingsOf(state.settlements, PLAYER).length : crownPlaces(state, who)
  if (rows.length < CURVE.runs) {
    return {
      trend: 'still',
      years: 0,
      from: now,
      now,
      says: `${sideName(world, who)}: ${CURVE_WORDS.still}`,
    }
  }
  // Смотрим назад, пока замеры идут в одну сторону.
  let years = 0
  let dir = 0
  let prev = now
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const one = rows[i] as number
    const step = prev - one
    const way = step > 0 ? 1 : step < 0 ? -1 : 0
    if (way === 0) break
    if (dir === 0) dir = way
    else if (way !== dir) break
    years += 1
    prev = one
  }
  const from = rows[Math.max(0, rows.length - years)] ?? now
  const moved = from === 0 ? 0 : Math.abs(now - from) / from
  const trend = years >= CURVE.runs && moved >= CURVE.moves ? (dir > 0 ? 'rise' : 'fall') : 'still'
  return {
    trend,
    years,
    from,
    now,
    says:
      trend === 'still'
        ? `${sideName(world, who)}: ${CURVE_WORDS.still} Мест ${now}.`
        : `${sideName(world, who)}: ${trend === 'rise' ? CURVE_WORDS.rise : CURVE_WORDS.fall} ${years} год(а) подряд, мест ${from} → ${now}.`,
  }
}

/** Чем объясняется этот упадок или подъём (Дл2). */
export function reasonsFor(
  state: GameState,
  world: World,
  who: Walker,
  day: number,
): readonly ReasonId[] {
  const out: ReasonId[] = []
  if (warsOf(state.politics, who).length > 0) out.push('wars')
  const curve = curveOf(state, world, who, day)
  if (curve.trend === 'fall') {
    if (who !== PLAYER && reignOf(who, day) > 0) out.push('split')
    if (curve.now < curve.from) out.push('trade')
  }
  const people = Object.values(state.settlements).filter((one) => one.population > 0).length
  if (people === 0) out.push('famine')
  return out
}

/** Кривая с причиной, словами (Дл2 и Дл3). */
export function curveSays(state: GameState, world: World, who: Walker, day: number): string {
  const curve = curveOf(state, world, who, day)
  const why = reasonsFor(state, world, who, day)
  return `${curve.says}${why.length > 0 ? ` Причины: ${why.map((id) => REASON_DEFS[id].label).join(', ')}. ${REASON_DEFS[why[0] as ReasonId].says}` : ''}`
}

/** Влияешь ли ты на чужую кривую (Дл4). */
export function yourHand(
  state: GameState,
  world: World,
  who: Walker,
  day: number,
): { readonly touched: boolean; readonly says: string } {
  const touched = who !== PLAYER && atWar(state.politics, PLAYER, who)
  return {
    touched,
    says: touched
      ? `${sideName(world, who)} убывает и твоей рукой: вы воюете, и это входит в его кривую.`
      : `${sideName(world, who)} идёт своим ходом: твоей руки в этом нет.`,
  }
}

/** Процессы в числах (Дл6). */
export function curveLedger(
  state: GameState,
  world: World,
  day: number,
): { readonly rises: number; readonly falls: number; readonly says: string } {
  const rows = [PLAYER as Walker, ...Object.keys(world.kingdoms)].map((who) => ({
    who,
    curve: curveOf(state, world, who, day),
  }))
  const rises = rows.filter((one) => one.curve.trend === 'rise').length
  const falls = rows.filter((one) => one.curve.trend === 'fall').length
  return {
    rises,
    falls,
    says: `${CURVE_WORDS.land} Возвышений ${rises}, упадков ${falls}: ${rows
      .map((one) => `${sideName(world, one.who)} ${one.curve.trend}`)
      .join('; ')}.`,
  }
}

export { CURVE, CURVE_WORDS, REASONS, REASON_DEFS, type ReasonId }
