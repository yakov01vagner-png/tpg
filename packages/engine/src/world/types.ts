import type { Lane } from './lanes'
import type { River } from './rivers'
import type { Sea } from './sea'

/**
 * Скелет мира (DESIGN.md, п.3.1): королевство → область → провинция → локация.
 *
 * Области и провинции неизменны: завоевания меняют владельца, а не географию.
 * Локации — динамический слой, они могут вымирать и основываться заново, поэтому
 * лежат отдельным словарём, а провинция хранит только их идентификаторы.
 *
 * Всё здесь — простые сериализуемые данные: мир целиком уходит в сейв.
 */

export type Terrain = 'plains' | 'forest' | 'hills' | 'mountains' | 'marsh' | 'coast' | 'steppe'

export const TERRAIN_LABELS: Record<Terrain, string> = {
  plains: 'равнины',
  forest: 'леса',
  hills: 'холмы',
  mountains: 'горы',
  marsh: 'топи',
  coast: 'побережье',
  steppe: 'степь',
}

export type LocationArchetype =
  | 'capital'
  | 'city'
  | 'town'
  | 'village'
  | 'port'
  | 'fortress'
  | 'mine'
  | 'monastery'

export const ARCHETYPE_LABELS: Record<LocationArchetype, string> = {
  capital: 'столица',
  city: 'город',
  town: 'городок',
  village: 'деревня',
  port: 'порт',
  fortress: 'крепость',
  mine: 'рудник',
  monastery: 'обитель',
}

/**
 * Места без жителей (DESIGN.md, п.3.1.1).
 *
 * До 0.3 всякая локация была поселением: у неё были жители, запасы и хозяин.
 * Из-за этого между деревнями не могло быть ничего — ни перевала, ни брода, ни
 * кургана, — и дорога была числом часов. Место без жителей — это та же локация
 * на той же карте, но без людей и без экономики: у него есть местность,
 * опасность и то, ради чего туда идут.
 */
export const SITE_KINDS = [
  'pass',
  'ford',
  'crossing',
  'bridge',
  'grove',
  'wilds',
  'barrow',
  'ruins',
  'outpost',
  'quarry',
  'shrine',
  'spring',
  'causeway',
] as const

export type SiteKind = (typeof SITE_KINDS)[number]

export const SITE_LABELS: Record<SiteKind, string> = {
  pass: 'перевал',
  ford: 'брод',
  crossing: 'переправа',
  bridge: 'мост',
  grove: 'бор',
  wilds: 'урочище',
  barrow: 'курган',
  ruins: 'развалины',
  outpost: 'застава',
  quarry: 'каменоломня',
  shrine: 'святилище',
  spring: 'ключ',
  causeway: 'гать',
}

/** Что вообще может стоять на карте: поселение либо место без жителей. */
export type PlaceKind = LocationArchetype | SiteKind

export const PLACE_LABELS: Record<PlaceKind, string> = { ...ARCHETYPE_LABELS, ...SITE_LABELS }

/**
 * Поселение ли это. Проверка нужна повсюду, где раньше можно было считать, что
 * у локации есть жители: экономика, политика, расселение, работы.
 */
export function isSettlement(kind: PlaceKind): kind is LocationArchetype {
  return kind in ARCHETYPE_LABELS
}

export function isSite(kind: PlaceKind): kind is SiteKind {
  return kind in SITE_LABELS
}

/**
 * Пограничье вместо короны. Область с таким `kingdomId` не принадлежит никому:
 * в `world.kingdoms` его нет нарочно, и всё, что спрашивает корону, честно
 * отвечает «ничья».
 */
export const FRONTIER = 'frontier'

export interface Kingdom {
  readonly id: string
  readonly name: string
  /** Короткая характеристика уклада — пока флавор, позже основа для политики. */
  readonly flavor: string
  readonly capitalId: string
  readonly regionIds: readonly string[]
}

export interface Region {
  readonly id: string
  readonly kingdomId: string
  readonly name: string
  readonly terrain: Terrain
  readonly provinceIds: readonly string[]
}

export interface Province {
  readonly id: string
  readonly regionId: string
  readonly name: string
  readonly terrain: Terrain
  /** Плодородие 0..1: сколько еды провинция способна дать со своей земли. */
  readonly fertility: number
  /** Поселения провинции. Пополняется с конца и ничего не теряет (п.3.1). */
  readonly locationIds: readonly string[]
  /** Места без жителей: перевалы, броды, курганы. Земля между поселениями. */
  readonly siteIds: readonly string[]
  /**
   * Остров: земля, до которой не доходит дорога (этап 35).
   *
   * Лежит в скелете, потому что это свойство земли, а не следствие расчёта:
   * по нему и цены, и власть, и то, что сюда нельзя привести обоз.
   */
  readonly island?: boolean
}

export interface Location {
  readonly id: string
  readonly provinceId: string
  readonly name: string
  /** Вид места: поселение либо место без жителей. */
  readonly archetype: PlaceKind
  readonly terrain: Terrain
  /** Точное число жителей, а не абстрактный уровень (DESIGN.md, п.7). Ноль у мест без жителей. */
  readonly population: number
  /**
   * Где место стоит на карте.
   *
   * Координата лежит в скелете, а не выводится из номера в списке: от неё
   * считаются дороги. Пока положение было следствием списков, а дороги —
   * следствием тех же списков, но по другому правилу, карта и дорога говорили
   * разное: из 229 отрезков 131 проходил мимо чужих мест, а часы пути были
   * связаны с расстоянием лишь наполовину (r = 0.51).
   */
  readonly x: number
  readonly y: number
  /**
   * Место стоит на берегу: до воды полдня ходу (этап 36).
   *
   * Лежит в скелете, а не считается каждый раз: берег неизменен, как и
   * координата, а спрашивают его и цены, и еда, и порт. Необязательно —
   * сейвы до 0.5 моря не знают вовсе.
   */
  readonly shore?: boolean
}

/** Дорога от локации к соседней. Хранится с обеих сторон. */
export interface Road {
  readonly to: string
  /** Часы пути пешком. */
  readonly hours: number
}

export interface World {
  readonly kingdoms: Readonly<Record<string, Kingdom>>
  readonly regions: Readonly<Record<string, Region>>
  readonly provinces: Readonly<Record<string, Province>>
  readonly locations: Readonly<Record<string, Location>>
  /** Список дорог по идентификатору локации. */
  readonly roads: Readonly<Record<string, readonly Road[]>>
  /**
   * Вода: где кончается земля (sea.ts, версия 0.5).
   *
   * Лежит в скелете, как и координаты мест: мир целиком уходит в сейв и не
   * меняется, значит берег обязан быть одним и тем же при каждом запуске.
   * Необязательна затем, что сейвы версии 0.4 её не знают.
   */
  readonly sea?: Sea
  /**
   * Реки: чем разрезана суша (rivers.ts, версия 0.5).
   *
   * Лежат в скелете вместе с берегом и по той же причине. Необязательны затем,
   * что сейвы версии 0.4 их не знают: в том мире реки не было, был только брод
   * с дурной репутацией.
   */
  readonly rivers?: readonly River[]
  /**
   * Морские пути между гаванями (lanes.ts, этап 35).
   *
   * Тот же список, что и дороги, только по воде и только между портами. Лежит
   * в скелете рядом с ними и необязателен по той же причине: в мире версии 0.4
   * моря не было, а значит не было и пути по нему.
   */
  readonly lanes?: Readonly<Record<string, readonly Lane[]>>
}
