import type { SkillId } from '../skills'
import type { TimeWindow } from '../time'
import { hours } from '../time'
import type { Availability } from './availability'
import { BIG_PLACES, TOWNS } from './availability'
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
  /** Часы, в которые дело можно начать. По умолчанию — дневные. */
  readonly window?: TimeWindow
  /** Где это вообще бывает. Без указания — везде. */
  readonly where?: Availability
}

export const COURSES: readonly CourseDef[] = [
  {
    id: 'lettersBasics',
    where: { archetypes: ['town', 'city', 'capital', 'monastery'] },
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
    where: { archetypes: ['town', 'city', 'capital', 'fortress'] },
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
    where: { archetypes: ['monastery', 'city', 'capital'] },
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
    where: { archetypes: ['village', 'town', 'port'] },
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
    where: { archetypes: ['capital', 'city'] },
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
  {
    id: 'archeryRange',
    where: { archetypes: ['fortress', 'town', 'city', 'capital'] },
    label: 'Стрельбище у стены',
    description: 'Сотня выстрелов в день и мозоли, которые потом уже не сойдут.',
    skill: 'archery',
    durationMinutes: hours(3),
    cost: 7,
    xp: 60,
    teacherCap: 30,
    fatigue: 20,
  },
  {
    id: 'ridingSchool',
    where: { archetypes: ['town', 'city', 'capital'] },
    label: 'Выездка',
    description: 'Конюший берёт за час столько, сколько конюх получает за день.',
    skill: 'riding',
    durationMinutes: hours(3),
    cost: 10,
    xp: 60,
    teacherCap: 30,
    fatigue: 18,
  },
  {
    id: 'shopApprentice',
    where: { archetypes: TOWNS },
    label: 'При лавке',
    description: 'Хозяин показывает, где в счёте прячется прибыль, и берёт за это долю.',
    skill: 'trade',
    durationMinutes: hours(4),
    cost: 12,
    xp: 70,
    teacherCap: 30,
    fatigue: 10,
  },
  {
    id: 'bonesetter',
    where: { archetypes: ['town', 'city', 'capital', 'monastery'] },
    label: 'У костоправа',
    description: 'Кровь, крик и руки, которые перестают дрожать к третьему разу.',
    skill: 'healing',
    durationMinutes: hours(4),
    cost: 9,
    xp: 65,
    teacherCap: 30,
    fatigue: 15,
  },
  {
    id: 'lawAndNumbers',
    where: { archetypes: BIG_PLACES },
    label: 'Законы и счёт',
    description: 'Городской стряпчий берёт дорого и смотрит на тебя как на мебель.',
    skill: 'scholarship',
    durationMinutes: hours(5),
    cost: 18,
    xp: 130,
    teacherCap: 45,
    fatigue: 10,
    requires: { skills: { scholarship: 15 } },
  },
  {
    id: 'bladeMaster',
    where: { archetypes: BIG_PLACES },
    label: 'Мастер клинка',
    description: 'Берёт только тех, кто уже умеет. Учит тому, что убивает, а не тому, что красиво.',
    skill: 'lightWeapons',
    durationMinutes: hours(4),
    cost: 28,
    xp: 150,
    teacherCap: 55,
    fatigue: 35,
    requires: { skills: { lightWeapons: 20 } },
  },
  {
    id: 'magicAdeptCourse',
    where: { archetypes: ['capital'] },
    label: 'Школа магии: курс адепта',
    description: 'Настоящее обучение начинается здесь — и стоит настоящих денег.',
    skill: 'magic',
    durationMinutes: hours(7),
    cost: 55,
    xp: 175,
    teacherCap: 55,
    fatigue: 30,
    window: { fromHour: 8, toHour: 16 },
    requires: { skills: { magic: 14, concentration: 10 } },
  },
]

export const COURSES_BY_ID: Readonly<Record<string, CourseDef>> = Object.fromEntries(
  COURSES.map((course) => [course.id, course]),
)
