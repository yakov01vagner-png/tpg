import type { SkillId } from '../skills'
import { hours } from '../time'
import type { Requirements } from './jobs'

export interface CourseDef {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly skill: SkillId
  readonly durationMinutes: number
  /** Плата наставнику — единственный обязательный сток денег в срезе 1. */
  readonly cost: number
  /** Сырой опыт за занятие: заметно больше, чем даёт смена на работе. */
  readonly xp: number
  /** Выше своего уровня наставник не научит. */
  readonly teacherCap: number
  readonly fatigue: number
  readonly requires?: Requirements
}

export const COURSES: readonly CourseDef[] = [
  {
    id: 'lettersBasics',
    label: 'Уроки грамоты',
    description: 'Писец берёт учеников по утрам. Читать, писать, считать долги.',
    skill: 'scholarship',
    durationMinutes: hours(4),
    cost: 6,
    xp: 70,
    teacherCap: 25,
    fatigue: 8,
  },
  {
    id: 'swordDrill',
    label: 'Занятия с мечом',
    description: 'Отставной наёмник гоняет по кругу во дворе. Синяки в стоимость входят.',
    skill: 'lightWeapons',
    durationMinutes: hours(3),
    cost: 8,
    xp: 65,
    teacherCap: 30,
    fatigue: 25,
  },
  {
    id: 'meditation',
    label: 'Дыхание и сосредоточение',
    description: 'Скучно, дорого и без видимого результата. Без этого магия не даётся.',
    skill: 'concentration',
    durationMinutes: hours(3),
    cost: 5,
    xp: 60,
    teacherCap: 25,
    fatigue: 5,
  },
  {
    id: 'streetCharms',
    label: 'Наговоры за медяки',
    description:
      'Полоумная старуха с окраины берёт дёшево и учит опасно. Школа такого не признаёт.',
    skill: 'magic',
    durationMinutes: hours(3),
    cost: 3,
    xp: 45,
    teacherCap: 12,
    fatigue: 15,
    // Улица выводит на таких людей; выросшему при дворе их просто не покажут.
    requires: { tags: ['street_smart'] },
  },
  {
    id: 'magicIntro',
    label: 'Школа магии: вводный курс',
    description: 'За стенами школы учат тому, за что на улице сожгли бы.',
    skill: 'magic',
    durationMinutes: hours(6),
    cost: 20,
    xp: 85,
    teacherCap: 30,
    fatigue: 20,
    requires: { skills: { scholarship: 8, concentration: 5 } },
  },
]

export const COURSES_BY_ID: Readonly<Record<string, CourseDef>> = Object.fromEntries(
  COURSES.map((course) => [course.id, course]),
)
