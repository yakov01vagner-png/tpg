import type { Cloth, PriestTemper, RiteDef } from './content/faith'
import {
  BLESSED,
  EXCOMMUNICATED,
  FEAST_DOINGS,
  HOLY_SITES,
  PILGRIM_DAYS,
  PRIEST_NAMES,
  PRIEST_TEMPERS,
  PRIEST_TEMPER_IDS,
  RITES,
} from './content/faith'
import type { Settlement } from './economy'
import { feastAt } from './fair'
import type { GameState } from './state'
import { kingdomOf } from './world/queries'
import type { World } from './world/types'

/**
 * Храм и вера (этап 51).
 *
 * До 0.6 храм был архетипом места, а праздник — днём, когда не работают.
 * Теперь в храме кто-то есть: священник с именем, саном и нравом; у него
 * служат обряды, у него же исповедуются и просят благословения.
 *
 * Как купцы (этап 49) и мастера (этап 50), служители выводятся из места. В
 * состоянии — только благочестие героя (`GameState.piety`) и день последнего
 * паломничества.
 */
export interface Priest {
  readonly id: string
  readonly name: string
  readonly cloth: Cloth
  readonly temper: PriestTemper
  readonly locationId: string
}

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** С какого населения в месте есть храм с постоянным служителем. */
export const TEMPLE_POPULATION = 1200

/**
 * Кто служит в этом месте.
 *
 * В обители — настоятель, в столице и большом городе — владыка, в прочих
 * местах — приходской священник. Ниже порога людности постоянного храма нет:
 * там служат наездом.
 */
export function priestAt(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  locationId: string,
): Priest | null {
  const place = world.locations[locationId]
  if (!place) return null
  const population = settlements[locationId]?.population ?? place.population
  const monastery = place.archetype === 'monastery'
  if (!monastery && population < TEMPLE_POPULATION) return null
  const hash = hashOf(locationId)
  const cloth: Cloth = monastery
    ? 'abbot'
    : place.archetype === 'capital' || (place.archetype === 'city' && population >= 9000)
      ? 'bishop'
      : 'priest'
  return {
    id: `priest:${locationId}`,
    name: PRIEST_NAMES[hash % PRIEST_NAMES.length] ?? 'священник',
    cloth,
    temper: PRIEST_TEMPER_IDS[(hash >>> 7) % PRIEST_TEMPER_IDS.length] ?? 'meek',
    locationId,
  }
}

/** Какие обряды здесь служат: венчает и благословляет не всякий. */
export function ritesAt(priest: Priest | null): readonly RiteDef[] {
  if (!priest) return []
  return RITES.filter((rite) => !rite.needsBishop || priest.cloth === 'bishop')
}

/** Сколько просят на храм: обряд, нрав служителя и сан. */
export function offeringFor(priest: Priest, rite: RiteDef): number {
  const temper = PRIEST_TEMPERS[priest.temper].offering
  const cloth = priest.cloth === 'bishop' ? 1.4 : priest.cloth === 'abbot' ? 0.9 : 1
  return Math.max(1, Math.round(rite.offering * temper * cloth))
}

/** И сколько даёт благочестия. */
export function graceFor(priest: Priest, rite: RiteDef): number {
  return Math.max(1, Math.round(rite.piety * PRIEST_TEMPERS[priest.temper].grace))
}

/** Пустят ли тебя к обряду: отлучённого не пустят никуда, кроме покаяния. */
export function templeAccepts(
  priest: Priest,
  piety: number,
  rite: RiteDef,
  churchFame = 0,
): { readonly accepts: boolean; readonly says: string } {
  // Слава у церкви открывает и закрывает (этап 68, Ф4): «Благочестивому»
  // служат и со малой верой, «Безбожному» откажут и с изрядной.
  const standing = piety + churchFame / 3
  if (standing <= EXCOMMUNICATED && rite.id !== 'confession') {
    return { accepts: false, says: PRIEST_TEMPERS[priest.temper].refuses[0] ?? '' }
  }
  // Ревностный не служит тому, кто ходит в храм раз в жизни и с кровью на руках.
  if (PRIEST_TEMPERS[priest.temper].grace > 1.1 && standing < -25 && rite.needsBishop) {
    return { accepts: false, says: PRIEST_TEMPERS[priest.temper].refuses[0] ?? '' }
  }
  return { accepts: true, says: PRIEST_TEMPERS[priest.temper].greets[0] ?? '' }
}

/** Благочестие героя. Старые сейвы веры не знают — и живут как все. */
export function pietyOf(state: Pick<GameState, 'piety'>): number {
  return state.piety ?? 0
}

export function isExcommunicated(state: Pick<GameState, 'piety'>): boolean {
  return pietyOf(state) <= EXCOMMUNICATED
}

export function isBlessed(state: Pick<GameState, 'piety'>): boolean {
  return pietyOf(state) >= BLESSED
}

/**
 * Что вера даёт в деле.
 *
 * Не чудо, а то, во что верят люди: благочестивого лучше принимают, за
 * отлучённым идут хуже. Числа малые нарочно — вера здесь не заклинание.
 */
export function pietyMorale(piety: number): number {
  if (piety <= EXCOMMUNICATED) return -8
  if (piety >= BLESSED) return 6
  return Math.round(piety / 15)
}

/**
 * Праздник как событие (этап 51, Х2).
 *
 * Праздник короны — не выходной, а день, в который в городе что-то делается:
 * шествие, общий стол, кулачный бой. Что именно, зависит от дня и места.
 */
export function feastDoingsAt(
  world: World,
  locationId: string,
  day: number,
): readonly (typeof FEAST_DOINGS)[number][] {
  const feast = feastAt(world, locationId, day)
  if (!feast) return []
  const hash = hashOf(`${locationId}|${feast.name}`)
  // Два занятия из трёх: в один праздник шествие с пиром, в другой — стенка.
  return FEAST_DOINGS.filter((_, index) => index !== hash % FEAST_DOINGS.length)
}

/** Идёт ли здесь нынче праздник своей короны. */
export function feastHere(world: World, locationId: string, day: number): string | null {
  return feastAt(world, locationId, day)?.name ?? null
}

/**
 * Паломничество (этап 51, Х5).
 *
 * Святое место в глуши — цель пути: не работа и не поиск, а то, ради чего
 * идут. Даёт благочестие раз в несколько месяцев: ходить к одному роднику
 * каждую неделю — не паломничество.
 */
export function isHolySite(world: World, locationId: string): boolean {
  const place = world.locations[locationId]
  return place ? HOLY_SITES.includes(place.archetype) : false
}

export function canPilgrimage(state: Pick<GameState, 'pilgrimDay'>, day: number): boolean {
  const last = state.pilgrimDay
  return last === undefined || day - last >= PILGRIM_DAYS
}

/**
 * Обитель живёт вкладами (этап 51, Х3).
 *
 * Своей земли под обителью почти нет: две сотни душ — это предел того, что
 * она способна вырастить. Живёт она не землёй, а тем, что ей несут: десятина
 * с округи, вклады проезжих и постой. Поэтому в расчёте хозяйства обитель
 * получает поддержку от своей провинции — как крепость получает жалованье.
 *
 * Двадцатая доля людей провинции, а не сотая: при двух процентах обитель в
 * бедной провинции держалась двух сотен душ и всё равно усыхала за век вдвое.
 * При пяти обители мира за сорок лет не теряют людей вовсе — а хлеб на это
 * берётся у округи, не появляясь из ничего (`collectTithe`).
 */
export const TITHE_SHARE = 0.05

/** Кто платит десятину этой обители: люди её провинции. */
export function titheFor(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  monasteryId: string,
): number {
  const place = world.locations[monasteryId]
  if (!place || place.archetype !== 'monastery') return 0
  const province = world.provinces[place.provinceId]
  if (!province) return 0
  let people = 0
  for (const id of province.locationIds) {
    if (id === monasteryId) continue
    people += settlements[id]?.population ?? 0
  }
  return people * TITHE_SHARE
}

/**
 * Скольких обитель держит сверх своей пашни.
 *
 * Предел обители — не земля под ней, а округа, которая ей несёт: своей пашни
 * там на две сотни душ, а стоит обитель веками. Считается по скелету мира, а
 * не по живому населению: предел — свойство земли и соседства, а не нынешнего
 * года (`carryingCapacity`).
 */
export function titheSupport(world: World, monasteryId: string): number {
  const place = world.locations[monasteryId]
  if (!place || place.archetype !== 'monastery') return 0
  const province = world.provinces[place.provinceId]
  if (!province) return 0
  let people = 0
  for (const id of province.locationIds) {
    if (id === monasteryId) continue
    people += world.locations[id]?.population ?? 0
  }
  return Math.round(people * TITHE_SHARE)
}

/** Кому церковь этого места подчиняется: короне, на чьей земле стоит. */
export function seeOf(world: World, locationId: string): string | null {
  return kingdomOf(world, locationId)?.id ?? null
}
