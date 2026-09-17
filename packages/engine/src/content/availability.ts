import type { LocationArchetype, Terrain } from '../world/types'

/**
 * Где встречается дело: работа, наставник или испытание.
 *
 * Пустое поле означает «везде»: в рудничном посёлке не переписывают бумаги, но
 * конюшни есть всюду, где держат лошадей.
 */
export interface Availability {
  /** Виды мест, где это бывает. */
  readonly archetypes?: readonly LocationArchetype[]
  /** Местности, где это бывает. */
  readonly terrains?: readonly Terrain[]
  /** Сколько народу должно жить в месте, чтобы это вообще имело смысл. */
  readonly minPopulation?: number
}

/** Места, где есть городская жизнь: ремесло, лавки, наёмный труд. */
export const TOWNS: readonly LocationArchetype[] = ['town', 'city', 'capital', 'port']
/** Всё, что крупнее деревни. */
export const BIG_PLACES: readonly LocationArchetype[] = ['city', 'capital']
