import {
  MISHAP_DEFS,
  type MishapId,
  YEARLAND,
  YEARLAND_WORDS,
  YEAR_DEFS,
  type YearKind,
} from './content/yearland'
import type { Settlement } from './economy'
import { PLAYER, holdingsOf } from './holding'
import { landHealth } from './life'
import type { GameState } from './state'
import { dayOfYear, seasonOf } from './time'
import { isFlood } from './world/rivers'
import type { World } from './world/types'

/**
 * Год, погода и земля (этап 180).
 *
 * Времена года с 0.5 меняют урожай и скорость дороги, погода дня — видимость.
 * Всё это проценты, и потому год был штрафом, а не временем: он ничего не
 * разрешал и ничего не запрещал, и год от года отличался только цифрой.
 *
 * Здесь год начинает менять правила. Зимой реки встают — и там, где летом
 * брод, зимой дорога; весной половодье закрывает те же броды; земля устаёт и
 * отдыхает, и это видно словами; бедствие приходит не броском, а из того, что
 * в мире сошлось.
 */

/** Каким вышел год у этого места (Гд5). */
export function yearKind(place: Settlement): YearKind {
  const harvest = place.harvest ?? 1
  if (harvest <= YEARLAND.leanAt) return 'lean'
  if (harvest >= YEARLAND.fatAt) return 'fat'
  return 'even'
}

/** Год словами (Гд5). */
export function yearSays(state: GameState, world: World, day: number): string {
  const mine = holdingsOf(state.settlements, PLAYER)
  if (mine.length === 0) {
    return `${YEAR_DEFS.even.says} Своей земли у тебя нет, и год этот не твой.`
  }
  const lean = mine.filter((one) => yearKind(one) === 'lean').length
  const fat = mine.filter((one) => yearKind(one) === 'fat').length
  const kind: YearKind = lean > fat ? 'lean' : fat > lean ? 'fat' : 'even'
  const tired = mine.filter((one) => (one.strain ?? 0) >= YEARLAND.tiredAt).length
  return `${YEAR_DEFS[kind].says}${tired > 0 ? ` ${YEARLAND_WORDS.tired} Устало мест: ${tired}.` : ` ${YEARLAND_WORDS.rested}`}`
}

/**
 * Встали ли реки (Гд2).
 *
 * Это не штраф и не прибавка: зимой через реку можно идти там, где летом
 * нельзя, — брод перестаёт быть узким местом, а лёд становится дорогой.
 */
export function riversFrozen(day: number): boolean {
  // Считается по времени года, а не по числам: календарь один на всю игру
  // (`time.ts`), и заводить в нём второй отсчёт значило бы получить зиму,
  // которая не совпадает с зимой.
  return seasonOf(day) === 'winter'
}

/** Что год делает с правилами сегодня (Гд1, Гд2). */
export function yearRules(
  state: GameState,
  world: World,
  day: number,
): readonly { readonly what: string; readonly says: string }[] {
  const rows: { what: string; says: string }[] = []
  const season = seasonOf(day)
  if (riversFrozen(day)) rows.push({ what: 'реки', says: YEARLAND_WORDS.frozen })
  if (isFlood(day)) rows.push({ what: 'броды', says: YEARLAND_WORDS.flood })
  if (season === 'winter') {
    rows.push({
      what: 'поход',
      says: 'Зимой войско ест вдвое и идёт медленнее: поход зимой — решение, а не время года.',
    })
  }
  if (season === 'autumn') {
    rows.push({
      what: 'жатва',
      says: 'Идёт жатва: поднятое сейчас ополчение оставит поле несжатым.',
    })
  }
  if (season === 'spring') {
    rows.push({ what: 'сев', says: 'Сев: что посеяно сейчас, тем и будут жить весь год.' })
  }
  return rows
}

/**
 * Бедствие как событие (Гд4).
 *
 * Не бросок, а сошедшиеся причины: сухое лето и тесная застройка дают пожар,
 * мокрый год и скученный скот — падёж, весна у реки — половодье, поздняя весна
 * — заморозок. Потому бедствие можно предвидеть, а иногда и предупредить.
 */
export function mishapsAt(
  state: GameState,
  world: World,
  locationId: string,
  day: number,
): readonly { readonly what: MishapId; readonly risk: number; readonly says: string }[] {
  const place = state.settlements[locationId]
  if (!place || place.population <= 0) return []
  const season = seasonOf(day)
  const here = world.locations[locationId]
  const rows: { what: MishapId; risk: number; says: string }[] = []
  // Сухое лето — это лето с добрым урожаем: сухой год родит хорошо и горит
  // хорошо. Осень в счёт тоже идёт: жнивьё горит не хуже.
  const dry = (place.harvest ?? 1) >= 1 && (season === 'summer' || season === 'autumn')
  const crowded = place.population / 1000
  if (dry) {
    const risk = Math.min(1, YEARLAND.droughtFire * Math.min(1, crowded))
    if (risk >= YEARLAND.fireAt) {
      rows.push({
        what: 'fire',
        risk: Math.round(risk * 100) / 100,
        says: `${MISHAP_DEFS.fire.label}: ${MISHAP_DEFS.fire.from}. ${MISHAP_DEFS.fire.costs}`,
      })
    }
  }
  const wet = (place.harvest ?? 1) < 1
  if (wet) {
    const risk = Math.min(1, YEARLAND.wetMurrain * Math.min(1, crowded))
    if (risk >= YEARLAND.murrainAt) {
      rows.push({
        what: 'murrain',
        risk: Math.round(risk * 100) / 100,
        says: `${MISHAP_DEFS.murrain.label}: ${MISHAP_DEFS.murrain.from}. ${MISHAP_DEFS.murrain.costs}`,
      })
    }
  }
  if (isFlood(day) && here?.archetype === 'ford') {
    rows.push({
      what: 'flood',
      risk: 1,
      says: `${MISHAP_DEFS.flood.label}: ${MISHAP_DEFS.flood.from}. ${MISHAP_DEFS.flood.costs}`,
    })
  }
  if (season === 'spring' && dayOfYear(day) <= 60) {
    rows.push({
      what: 'frost',
      risk: 0.3,
      says: `${MISHAP_DEFS.frost.label}: ${MISHAP_DEFS.frost.from}. ${MISHAP_DEFS.frost.costs}`,
    })
  }
  return rows
}

/** Как устала земля под этим местом (Гд3). */
export function landSays(place: Settlement): string {
  const strain = place.strain ?? 0
  const health = landHealth(strain)
  return `Усталость земли ${Math.round(strain * 100)} из ста: поле родит ×${Math.round(health * 100) / 100}. ${
    strain >= YEARLAND.tiredAt ? YEARLAND_WORDS.tired : YEARLAND_WORDS.rested
  }`
}

/** Год в числах (Гд6). */
export function yearRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly places: number
  readonly lean: number
  readonly fat: number
  readonly tired: number
  readonly mishaps: number
  readonly says: string
} {
  let places = 0
  let lean = 0
  let fat = 0
  let tired = 0
  let mishaps = 0
  for (const one of Object.values(state.settlements) as readonly Settlement[]) {
    if (one.population <= 0) continue
    places += 1
    const kind = yearKind(one)
    if (kind === 'lean') lean += 1
    if (kind === 'fat') fat += 1
    if ((one.strain ?? 0) >= YEARLAND.tiredAt) tired += 1
    mishaps += mishapsAt(state, world, one.locationId, day).length
  }
  return {
    places,
    lean,
    fat,
    tired,
    mishaps,
    says: `Год по миру: недород в ${lean} местах, щедро в ${fat}, устало ${tired} из ${places}; бедствий на пороге ${mishaps}. ${YEARLAND_WORDS.rule}`,
  }
}
