import type { Content, CourseDef, ExamDef, JobDef } from './content'
import { CONTENT } from './content'
import type { Availability } from './content/availability'
import type { GameState } from './state'
import type { Location } from './world/types'
import { isSettlement } from './world/types'

/**
 * Что можно делать в конкретном месте.
 *
 * Содержимое города — не список «всего, что есть в игре», а то, что бывает в
 * таком месте: в деревне нет школы магии, в столице некому кайлить породу.
 * Ради этого и нужна дорога.
 */
export function isAvailableAt(
  where: Availability | undefined,
  location: Location,
  population = location.population,
): boolean {
  // Дело без людей не делается: на перевале нет ни конюшен, ни наставника, ни
  // ярмарки. Поэтому в месте без жителей не бывает ничего, пока это место не
  // названо прямо — тогда и дело там появится (этап 21).
  if (!isSettlement(location.archetype)) {
    return where?.archetypes?.includes(location.archetype) ?? false
  }
  if (!where) return true
  if (where.archetypes && !where.archetypes.includes(location.archetype)) return false
  if (where.terrains && !where.terrains.includes(location.terrain)) return false
  if (where.minPopulation !== undefined && population < where.minPopulation) return false
  return true
}

function at<T extends { readonly where?: Availability }>(
  items: Readonly<Record<string, T>>,
  state: GameState,
  locationId: string,
): readonly T[] {
  const location = state.world.locations[locationId]
  if (!location) return []
  // Население берём живое: вымирающая деревня перестаёт быть городком.
  const population = state.settlements[locationId]?.population ?? location.population
  return Object.values(items).filter((item) => isAvailableAt(item.where, location, population))
}

export function jobsAt(
  state: GameState,
  locationId: string = state.locationId,
  content: Content = CONTENT,
): readonly JobDef[] {
  return at(content.jobs, state, locationId)
}

export function coursesAt(
  state: GameState,
  locationId: string = state.locationId,
  content: Content = CONTENT,
): readonly CourseDef[] {
  return at(content.courses, state, locationId)
}

export function examsAt(
  state: GameState,
  locationId: string = state.locationId,
  content: Content = CONTENT,
): readonly ExamDef[] {
  return at(content.exams, state, locationId)
}
