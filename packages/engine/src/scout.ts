import { type Band, bandSize } from './band'
import { HOST_ROLES, type HostRole, ROLE_DEFS, SCOUT, SCOUT_WORDS } from './content/scout'
import { foeBands, roadHops, sightingWord } from './fog'
import { PLAYER } from './holding'
import type { Word } from './known'
import { placeRep } from './reputation'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Дозоры и завеса (этап 110).
 *
 * Туман этапа 109 сказал, чего не видно. Здесь появляется цена того, чтобы
 * видеть: часть, посланная смотреть, видит на полкрая вперёд и хуже дерётся;
 * конный заслон закрывает своих от чужих дозоров и стоит дороже всех; местные
 * рассказывают тем больше, чем лучше тебя помнят.
 *
 * Ничего из этого не бесплатно, и в этом смысл: глаза — такой же расход, как
 * хлеб, и потому их всегда меньше, чем хотелось бы.
 */

export function roleDef(role: HostRole) {
  return ROLE_DEFS[role]
}

export function roleOf(state: Pick<GameState, 'roles'>, bandId: string): HostRole | null {
  return state.roles?.[bandId] ?? null
}

/** Части, посланные смотреть. */
export function scoutsOf(state: GameState): readonly Band[] {
  const roles = state.roles ?? {}
  return state.bands.filter((one) => one.lordId === PLAYER && roles[one.id] === 'scout')
}

/** Части, поставленные завесой. */
export function screensOf(state: GameState): readonly Band[] {
  const roles = state.roles ?? {}
  return state.bands.filter((one) => one.lordId === PLAYER && roles[one.id] === 'screen')
}

/**
 * Во сколько раз такая часть хуже в бою (Дз1).
 *
 * Дозор идёт налегке и врассыпную: он для того и послан, чтобы видеть, а не
 * держать строй. Это не штраф за ошибку — это цена другого решения.
 */
export function fightsAs(state: Pick<GameState, 'roles'>, bandId: string): number {
  const role = roleOf(state, bandId)
  return role ? ROLE_DEFS[role].fights : 1
}

/** Сколько стоит держать глаза в сутки (Дз5). */
export function eyesCost(state: GameState): number {
  const roles = state.roles ?? {}
  let cost = 0
  for (const band of state.bands) {
    const role = roles[band.id]
    if (!role || band.lordId !== PLAYER) continue
    cost += bandSize(band) * ROLE_DEFS[role].perManDay
  }
  return Math.round(cost)
}

/** Сколько людей дозор теряет за сутки: кони бьются, люди отстают. */
export function wearOf(band: Band, role: HostRole | null): number {
  if (role !== 'scout') return 0
  return bandSize(band) * SCOUT.wearPerDay
}

/**
 * Что расскажут местные (Дз4).
 *
 * Продолжение этапа 61: округа, которая тебя помнит добром, говорит сама.
 * Холодная молчит — и это честный ответ, а не пустой бросок.
 */
export function askLocals(
  state: GameState,
  world: World,
  locationId: string,
  day: number,
): { readonly told: readonly Word[]; readonly says: string } {
  const rep = placeRep(state.reputation, locationId)
  if (rep < SCOUT.askRep) return { told: [], says: SCOUT_WORDS.askedCold }
  // Чем теплее память, тем дальше округа и тем вернее весть.
  const warm = rep >= SCOUT.askWarmRep
  const reach = warm ? SCOUT.askHops : Math.max(1, SCOUT.askHops - 2)
  const told: Word[] = []
  for (const band of foeBands(state, PLAYER)) {
    const hops = roadHops(world, locationId, band.locationId, reach)
    if (hops === null) continue
    told.push({
      ...sightingWord(PLAYER, band, warm ? 'trader' : 'peasant', day, locationId),
      id: `asked:${band.id}:${day}`,
    })
  }
  return {
    told,
    says:
      told.length === 0
        ? 'Говорят, чужих в округе не видели.'
        : `${warm ? SCOUT_WORDS.askedWarm : 'Говорят неохотно, но говорят.'} Про ${told.length} чужих отряда в ${reach} переходах.`,
  }
}

/**
 * Разведка боем (Дз3).
 *
 * Самый точный способ узнать чужую силу — ударить по ней. Платишь людьми и
 * духом, получаешь число, которое не врёт: увиденное своими глазами.
 */
export function probeCost(party: { readonly morale: number }, men: number) {
  return {
    men: Math.max(1, Math.round(men * SCOUT.probeLoss)),
    morale: SCOUT.probeMorale,
  }
}

export function probeWord(band: Band, day: number): Word {
  return {
    id: `probe:${band.id}:${day}`,
    to: PLAYER,
    kind: 'host',
    about: band.id,
    value: band.locationId,
    source: 'eyes',
    from: null,
    day,
  }
}

export interface ScoutLedger {
  readonly scouts: number
  readonly screens: number
  readonly perDay: number
  readonly learned: number
  readonly spent: number
  readonly says: string
}

/** Разведка в числах (Дз6). */
export function scoutLedger(state: GameState): ScoutLedger {
  const log = state.scoutLog ?? { learned: 0, spent: 0 }
  const scouts = scoutsOf(state).length
  const screens = screensOf(state).length
  const perDay = eyesCost(state)
  return {
    scouts,
    screens,
    perDay,
    learned: log.learned,
    spent: log.spent,
    says:
      scouts + screens === 0 && log.spent === 0
        ? 'Глаз у тебя нет: воюешь по слухам.'
        : `Дозоров ${scouts}, завес ${screens}; в сутки это ${perDay} серебра. Всего узнано ${log.learned} вестей, потрачено ${log.spent}.`,
  }
}

export { SCOUT, SCOUT_WORDS, ROLE_DEFS, HOST_ROLES, type HostRole }
