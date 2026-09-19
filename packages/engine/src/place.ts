import type { Content, CourseDef, ExamDef, JobDef } from './content'
import { CONTENT } from './content'
import type { Availability } from './content/availability'
import { rankTier } from './magic'
import { canGrantHere, schoolAt } from './school'
import type { GameState } from './state'
import { dayOf, seasonOf } from './time'
import type { Season } from './time'
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
  season: Season | null = null,
): boolean {
  // Дело без людей не делается: на перевале нет ни конюшен, ни наставника, ни
  // ярмарки. Поэтому в месте без жителей не бывает ничего, пока это место не
  // названо прямо — тогда и дело там появится (этап 21).
  if (!isSettlement(location.archetype)) {
    return where?.archetypes?.includes(location.archetype) ?? false
  }
  if (!where) return true
  // Время года — такое же условие, как место (этап 67, Я1): сев бывает весной,
  // и в декабре его нет ни в одной деревне мира. Без дня не проверяем: старые
  // вызовы спрашивают «бывает ли здесь вообще».
  if (season !== null && where.seasons && !where.seasons.includes(season)) return false
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
  // Время года — такое же условие, как место (этап 67, Я1): сев бывает весной,
  // и в декабре его нет ни в одной деревне мира.
  const season = seasonOf(dayOf(state.time))
  const location = state.world.locations[locationId]
  if (!location) return []
  // Население берём живое: вымирающая деревня перестаёт быть городком.
  const population = state.settlements[locationId]?.population ?? location.population
  // Школа — не вид места, а место в мире (этап 40): дело, которому она нужна,
  // бывает только там, где она есть, и не выше её ранга.
  const school = schoolAt(state.world, locationId)
  return Object.values(items).filter(
    (item) =>
      isAvailableAt(item.where, location, population, season) &&
      (item.where?.school === undefined ||
        (school !== null && rankTier(school.topRank) >= rankTier(item.where.school))),
  )
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

/**
 * Испытания, которые здесь принимают.
 *
 * Неофита принимают везде, где есть школа хоть какая; выше — только та школа,
 * чей глава сам не ниже (этап 40). Глава в отъезде — старшие ступени ждут.
 */
export function examsAt(
  state: GameState,
  locationId: string = state.locationId,
  content: Content = CONTENT,
): readonly ExamDef[] {
  const school = schoolAt(state.world, locationId)
  if (!school) return []
  return at(content.exams, state, locationId).filter((exam) =>
    canGrantHere(state, school, exam.rank),
  )
}
