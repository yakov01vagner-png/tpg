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
  readonly locationIds: readonly string[]
}

export interface Location {
  readonly id: string
  readonly provinceId: string
  readonly name: string
  readonly archetype: LocationArchetype
  readonly terrain: Terrain
  /** Точное число жителей, а не абстрактный уровень (DESIGN.md, п.7). */
  readonly population: number
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
}
