import type { Content, CourseDef, ExamDef, JobDef } from './content'
import { CONTENT } from './content'
import type { Availability } from './content/availability'
import type { Location, World } from './world/types'

/**
 * Что можно делать в конкретном месте.
 *
 * Содержимое города — не список «всего, что есть в игре», а то, что вообще
 * бывает в таком месте: в деревне нет школы магии, в столице некому кайлить
 * породу. Ради этого и нужна дорога.
 */
export function isAvailableAt(where: Availability | undefined, location: Location): boolean {
  if (!where) return true
  if (where.archetypes && !where.archetypes.includes(location.archetype)) return false
  if (where.terrains && !where.terrains.includes(location.terrain)) return false
  if (where.minPopulation !== undefined && location.population < where.minPopulation) return false
  return true
}

function at<T extends { readonly where?: Availability }>(
  items: Readonly<Record<string, T>>,
  location: Location | undefined,
): readonly T[] {
  if (!location) return []
  return Object.values(items).filter((item) => isAvailableAt(item.where, location))
}

export function jobsAt(
  world: World,
  locationId: string,
  content: Content = CONTENT,
): readonly JobDef[] {
  return at(content.jobs, world.locations[locationId])
}

export function coursesAt(
  world: World,
  locationId: string,
  content: Content = CONTENT,
): readonly CourseDef[] {
  return at(content.courses, world.locations[locationId])
}

export function examsAt(
  world: World,
  locationId: string,
  content: Content = CONTENT,
): readonly ExamDef[] {
  return at(content.exams, world.locations[locationId])
}
