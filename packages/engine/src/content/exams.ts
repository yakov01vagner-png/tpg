import type { MagicRankId } from '../magic'
import type { TimeWindow } from '../time'
import { hours } from '../time'
import type { Availability } from './availability'
import type { Requirements } from './jobs'

/**
 * Экзамен — это «признание», вторая половина гибридной системы рангов (п.4).
 * Навык даёт право прийти на экзамен, но ранг присваивают люди.
 */
export interface ExamDef {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly rank: MagicRankId
  readonly cost: number
  readonly durationMinutes: number
  /**
   * Запас навыка сверх порога ранга, при котором успех практически гарантирован.
   * Пришёл впритык — рискуешь деньгами и временем.
   */
  readonly comfortableMargin: number
  readonly fatigue: number
  readonly requires?: Requirements
  /** Часы, в которые дело можно начать. По умолчанию — дневные. */
  readonly window?: TimeWindow
  /** Где это вообще бывает. Без указания — везде. */
  readonly where?: Availability
}

export const EXAMS: readonly ExamDef[] = [
  {
    id: 'examNeophyte',
    where: { archetypes: ['capital', 'city'] },
    label: 'Испытание на Неофита',
    description: 'Формальность, но без неё в школе с тобой не разговаривают.',
    rank: 'neophyte',
    cost: 10,
    durationMinutes: hours(2),
    comfortableMargin: 5,
    fatigue: 10,
  },
  {
    id: 'examAdept',
    where: { archetypes: ['capital'] },
    label: 'Испытание на Адепта',
    description: 'Первый ранг, который что-то значит за пределами школьного двора.',
    rank: 'adept',
    cost: 35,
    durationMinutes: hours(4),
    comfortableMargin: 8,
    fatigue: 20,
  },
  {
    id: 'examStudent',
    where: { archetypes: ['capital'] },
    label: 'Испытание на Ученика',
    description: 'Здесь спрашивают не слова, а работу. Провалившихся запоминают надолго.',
    rank: 'student',
    cost: 90,
    durationMinutes: hours(6),
    comfortableMargin: 10,
    fatigue: 30,
  },
  {
    id: 'examJourneyman',
    where: { archetypes: ['capital'] },
    label: 'Испытание на Подмастерье',
    description: 'Ранг, после которого тебя нанимают, а не гоняют. Цена соответствует.',
    rank: 'journeyman',
    cost: 180,
    durationMinutes: hours(8),
    comfortableMargin: 12,
    fatigue: 40,
  },
]

/**
 * Верхняя половина лестницы (этап 40).
 *
 * Дальше подмастерья испытание — не экзамен, а событие: дни, а не часы; сотни,
 * а не десятки; и принимает его не «столица», а школа, где есть кому принять
 * (`school.ts`). Цена растёт быстрее ранга нарочно — это третий стопор из
 * DESIGN.md п.4: стена всегда преодолима, вопрос цены.
 */
export const HIGH_EXAMS: readonly ExamDef[] = [
  {
    id: 'examMaster',
    where: { archetypes: ['capital', 'city'] },
    label: 'Испытание на Мастера',
    description: 'Два дня работы на глазах у школы. С этого ранга тебя зовут по имени.',
    rank: 'master',
    cost: 400,
    durationMinutes: hours(48),
    comfortableMargin: 14,
    fatigue: 60,
    requires: { skills: { concentration: 25 } },
  },
  {
    id: 'examGrandMaster',
    where: { archetypes: ['capital', 'city'] },
    label: 'Испытание на Гранд-мастера',
    description: 'Три дня и своя работа, которой прежде не было. Половина уходит ни с чем.',
    rank: 'grandMaster',
    cost: 800,
    durationMinutes: hours(72),
    comfortableMargin: 14,
    fatigue: 70,
    requires: { skills: { concentration: 35, scholarship: 20 } },
  },
  {
    id: 'examMagister',
    where: { archetypes: ['capital', 'city'] },
    label: 'Испытание на Магистра',
    description: 'Неделя. Спрашивают не только тебя, но и о тебе.',
    rank: 'magister',
    cost: 1500,
    durationMinutes: hours(24 * 7),
    comfortableMargin: 15,
    fatigue: 80,
    requires: { skills: { concentration: 45, scholarship: 30 } },
  },
  {
    id: 'examGrandMagister',
    where: { archetypes: ['capital'] },
    label: 'Испытание на Гранд-магистра',
    description: 'Принимает архимаг лично, и только когда он дома. Две недели.',
    rank: 'grandMagister',
    cost: 3000,
    durationMinutes: hours(24 * 14),
    comfortableMargin: 15,
    fatigue: 90,
    requires: { skills: { concentration: 55, scholarship: 40 } },
  },
  {
    id: 'examArchmage',
    where: { archetypes: ['capital'] },
    label: 'Испытание на Архимага',
    description: 'Месяц при академии. Их три-пять на корону — и каждого помнят по имени.',
    rank: 'archmage',
    cost: 6000,
    durationMinutes: hours(24 * 30),
    comfortableMargin: 16,
    fatigue: 100,
    requires: { skills: { concentration: 65, scholarship: 50 } },
  },
  {
    id: 'examArchon',
    where: { archetypes: ['capital'] },
    label: 'Испытание на Архона',
    description: 'Одно место на весь свет, где это принимают. Сезон при Архоне — и его слово.',
    rank: 'archon',
    cost: 12000,
    durationMinutes: hours(24 * 60),
    comfortableMargin: 18,
    fatigue: 100,
    requires: { skills: { concentration: 75, scholarship: 60 } },
  },
]

export const ALL_EXAMS: readonly ExamDef[] = [...EXAMS, ...HIGH_EXAMS]

export const EXAMS_BY_ID: Readonly<Record<string, ExamDef>> = Object.fromEntries(
  ALL_EXAMS.map((exam) => [exam.id, exam]),
)
