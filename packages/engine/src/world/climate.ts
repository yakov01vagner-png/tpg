import type { Point } from './layout'
import { MAP_SIZE } from './layout'
import type { Terrain } from './types'

/**
 * Климат (этап 44).
 *
 * Пока корон было пять и стояли они кругом, местность была свойством
 * чертежа: «Северная область» — леса, потому что так написано. На материке
 * это перестаёт работать: север холоден оттого, что он север, а юг сух оттого,
 * что он юг, и провинция, которую чертёж назвал равниной, у полярного круга
 * становится лесом, а у южного края — степью и песком.
 *
 * Пояс выводится из широты — положения по полотну сверху вниз — с неровным
 * краем, чтобы граница холода не шла линейкой. Это единственное место, где
 * положение на карте рождает землю; всё остальное читает результат.
 */
export type Climate = 'cold' | 'temperate' | 'dry'

export const CLIMATE_LABELS: Record<Climate, string> = {
  cold: 'север',
  temperate: 'средние земли',
  dry: 'юг',
}

/** Докуда с севера идёт холод и откуда с юга — сушь, долями полотна. */
const COLD_BELT = 0.28
const DRY_BELT = 0.7

function wobble(x: number, salt: number): number {
  let hash = 2166136261 ^ salt
  hash = Math.imul(hash ^ Math.floor(x / 180), 16777619)
  hash = Math.imul(hash ^ (hash >>> 13), 16777619)
  return (((hash >>> 8) % 1000) / 1000 - 0.5) * 0.08
}

export function climateAt(point: Point): Climate {
  const share = point.y / MAP_SIZE
  if (share < COLD_BELT + wobble(point.x, 3)) return 'cold'
  if (share > DRY_BELT + wobble(point.x, 11)) return 'dry'
  return 'temperate'
}

/**
 * Какой становится земля чертежа в этом поясе.
 *
 * На севере поле не родит — там лес и увалы; на юге оно выгорает в степь и
 * песок. Море, топь и горы климату не подвластны: они то, что они есть.
 * Бросок (0..1) даёт разнообразие, чтобы весь север не стал одним лесом.
 */
export function climateTerrain(terrain: Terrain, climate: Climate, roll: number): Terrain {
  if (climate === 'cold') {
    if (terrain === 'plains') return roll < 0.6 ? 'forest' : 'hills'
    if (terrain === 'steppe') return roll < 0.7 ? 'forest' : 'hills'
    if (terrain === 'desert') return 'steppe'
    return terrain
  }
  if (climate === 'dry') {
    if (terrain === 'plains') return roll < 0.55 ? 'steppe' : 'desert'
    if (terrain === 'forest') return roll < 0.6 ? 'hills' : 'steppe'
    if (terrain === 'marsh') return 'steppe'
    if (terrain === 'steppe') return roll < 0.35 ? 'desert' : 'steppe'
    return terrain
  }
  // В средних землях пустыни не бывает: чертёж мог её просить, но не здесь.
  return terrain === 'desert' ? 'steppe' : terrain
}

/** Во сколько раз климат урезает плодородие: север короток, юг сух. */
export const CLIMATE_FERTILITY: Record<Climate, number> = {
  cold: 0.75,
  temperate: 1,
  dry: 0.6,
}
