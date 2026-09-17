import { hours } from '../time'
import type { MagicRankId } from '../magic'
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
}

export const EXAMS: readonly ExamDef[] = [
  {
    id: 'examNeophyte',
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
    label: 'Испытание на Адепта',
    description: 'Первый ранг, который что-то значит за пределами школьного двора.',
    rank: 'adept',
    cost: 35,
    durationMinutes: hours(4),
    comfortableMargin: 8,
    fatigue: 20,
  },
]

export const EXAMS_BY_ID: Readonly<Record<string, ExamDef>> = Object.fromEntries(
  EXAMS.map((exam) => [exam.id, exam]),
)
