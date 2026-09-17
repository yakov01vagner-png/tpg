import type { SkillId } from '../skills'
import { hours } from '../time'

/** Требования к персонажу: минимальные уровни навыков и обязательные теги. */
export interface Requirements {
  readonly skills?: Partial<Record<SkillId, number>>
  readonly tags?: readonly string[]
}

export interface JobDef {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly durationMinutes: number
  /** Плата за смену. Единственный источник денег в срезе 1. */
  readonly pay: number
  /** Сколько сырого опыта получает каждый задействованный навык. */
  readonly practice: Partial<Record<SkillId, number>>
  readonly fatigue: number
  readonly requires?: Requirements
}

/**
 * Подработки первого среза (п.11 дизайн-документа).
 * Работа даёт деньги и медленную практику; быстрый рост — только через учёбу.
 */
export const JOBS: readonly JobDef[] = [
  {
    id: 'unloadCarts',
    label: 'Разгружать телеги',
    description: 'Купцам всегда нужны руки у складских ворот. Спину жалеть не станут.',
    durationMinutes: hours(8),
    pay: 12,
    practice: { hardLabour: 26, athletics: 8 },
    fatigue: 35,
  },
  {
    id: 'muckStables',
    label: 'Чистить конюшни',
    description: 'Работа, которой не хвастаются. Зато лошадей узнаёшь быстро.',
    durationMinutes: hours(6),
    pay: 7,
    practice: { hardLabour: 14, riding: 10 },
    fatigue: 25,
  },
  {
    id: 'runErrands',
    label: 'Бегать с поручениями',
    description: 'Отнести, договориться, вернуться с ответом. Полгорода за полдня.',
    durationMinutes: hours(4),
    pay: 5,
    practice: { persuasion: 14, athletics: 6 },
    fatigue: 15,
  },
  {
    id: 'gatherHerbs',
    label: 'Собирать травы за стенами',
    description: 'Лекарь платит за корзину. За стенами города бывает по-разному.',
    durationMinutes: hours(6),
    pay: 9,
    practice: { survival: 20, healing: 10 },
    fatigue: 20,
  },
  {
    id: 'copyPapers',
    label: 'Переписывать бумаги',
    description: 'Писцу нужна вторая рука. Платят не за скорость, а за отсутствие ошибок.',
    durationMinutes: hours(6),
    pay: 14,
    practice: { scholarship: 22 },
    fatigue: 10,
    requires: { skills: { scholarship: 5 } },
  },
  {
    id: 'serveAtSchool',
    label: 'Прислуживать в школе магии',
    description: 'Платят гроши, но ты внутри стен, и до чужих занятий два шага.',
    durationMinutes: hours(6),
    pay: 6,
    practice: { concentration: 14, scholarship: 10 },
    fatigue: 15,
    // Со стороны в школу не берут: нужен кто-то, кто тебя там уже знает.
    requires: { tags: ['school_known'] },
  },
  {
    id: 'guardCaravan',
    label: 'Охранять караван',
    description: 'Сутки при оружии на дороге. Лучшая плата из доступных новичку.',
    durationMinutes: hours(12),
    pay: 30,
    practice: { lightWeapons: 24, archery: 10, riding: 8, fortitude: 6 },
    fatigue: 45,
    requires: { skills: { lightWeapons: 5 } },
  },
]

export const JOBS_BY_ID: Readonly<Record<string, JobDef>> = Object.fromEntries(
  JOBS.map((job) => [job.id, job]),
)
