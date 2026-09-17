import type { Biography } from '../biography'
import { BIOGRAPHY } from './biography'
import type { CourseDef } from './courses'
import { COURSES, COURSES_BY_ID } from './courses'
import type { ExamDef } from './exams'
import { EXAMS, EXAMS_BY_ID } from './exams'
import type { JobDef } from './jobs'
import { JOBS, JOBS_BY_ID } from './jobs'

export type { JobDef, Requirements } from './jobs'
export type { Availability } from './availability'
export { TOWNS, BIG_PLACES } from './availability'
export type { CourseDef } from './courses'
export type { ExamDef } from './exams'
export { JOBS, COURSES, EXAMS, BIOGRAPHY }

/**
 * Весь контент собран в один объект и передаётся в движок параметром.
 * Так тесты могут подсунуть свой набор работ и курсов, а балансные правки
 * не требуют трогать логику.
 */
export interface Content {
  readonly jobs: Readonly<Record<string, JobDef>>
  readonly courses: Readonly<Record<string, CourseDef>>
  readonly exams: Readonly<Record<string, ExamDef>>
  readonly biography: Biography
}

export const CONTENT: Content = {
  jobs: JOBS_BY_ID,
  courses: COURSES_BY_ID,
  exams: EXAMS_BY_ID,
  biography: BIOGRAPHY,
}
