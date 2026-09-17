import type { SkillId } from '../skills'
import type { TimeWindow } from '../time'
import { NIGHT_WINDOW, hours } from '../time'
import type { Availability } from './availability'
import { TOWNS } from './availability'

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
  /** Часы, в которые дело можно начать. По умолчанию — дневные. */
  readonly window?: TimeWindow
  /** Где это вообще бывает. Без указания — везде. */
  readonly where?: Availability
}

/**
 * Подработки первого среза (п.11 дизайн-документа).
 * Работа даёт деньги и медленную практику; быстрый рост — только через учёбу.
 */
export const JOBS: readonly JobDef[] = [
  {
    id: 'unloadCarts',
    where: { archetypes: TOWNS, minPopulation: 1000 },
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
    where: { archetypes: TOWNS },
    label: 'Бегать с поручениями',
    description: 'Отнести, договориться, вернуться с ответом. Полгорода за полдня.',
    durationMinutes: hours(4),
    pay: 5,
    practice: { persuasion: 14, athletics: 6 },
    fatigue: 15,
  },
  {
    id: 'gatherHerbs',
    where: { archetypes: ['village', 'town', 'fortress', 'monastery', 'mine', 'port'] },
    label: 'Собирать травы за стенами',
    description: 'Лекарь платит за корзину. За стенами города бывает по-разному.',
    durationMinutes: hours(6),
    pay: 9,
    practice: { survival: 20, healing: 10 },
    fatigue: 20,
  },
  {
    id: 'copyPapers',
    where: { archetypes: ['city', 'capital', 'monastery'] },
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
    where: { archetypes: ['capital'] },
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
    where: { archetypes: TOWNS, minPopulation: 1500 },
    label: 'Охранять караван',
    description: 'Сутки при оружии на дороге. Лучшая плата из доступных новичку.',
    durationMinutes: hours(12),
    pay: 30,
    practice: { lightWeapons: 24, archery: 10, riding: 8, fortitude: 6 },
    fatigue: 45,
    requires: { skills: { lightWeapons: 5 } },
  },
  {
    id: 'tavernHand',
    where: { archetypes: TOWNS },
    label: 'Подавать в таверне',
    description: 'Шум, чужие ссоры и монета за вечер. Языком работаешь не меньше, чем руками.',
    durationMinutes: hours(5),
    pay: 8,
    practice: { persuasion: 16, trade: 8 },
    fatigue: 18,
    window: { fromHour: 16, toHour: 24 },
  },
  {
    id: 'nightWatch',
    where: { archetypes: ['town', 'city', 'capital', 'port', 'fortress'] },
    label: 'Ночной сторож',
    description: 'Обходить склады до рассвета. Платят за бессонницу, а не за храбрость.',
    durationMinutes: hours(8),
    pay: 15,
    practice: { fortitude: 16, lightWeapons: 8 },
    fatigue: 40,
    window: NIGHT_WINDOW,
  },
  {
    id: 'huntGame',
    where: {
      archetypes: ['village', 'fortress', 'monastery', 'mine'],
      terrains: ['forest', 'hills', 'steppe', 'mountains', 'marsh'],
    },
    label: 'Бить дичь на продажу',
    description: 'Лес кормит того, кто умеет ждать. Мясник берёт всё, о чём не спрашивает.',
    durationMinutes: hours(9),
    pay: 18,
    practice: { archery: 26, survival: 14 },
    fatigue: 35,
    requires: { skills: { archery: 8 } },
  },
  {
    id: 'healerHand',
    where: { archetypes: ['town', 'city', 'capital', 'monastery'] },
    label: 'Помогать лекарю',
    description: 'Держать, перевязывать и не падать в обморок. Учит быстрее, чем хотелось бы.',
    durationMinutes: hours(7),
    pay: 13,
    practice: { healing: 26, scholarship: 6 },
    fatigue: 22,
    requires: { skills: { healing: 6 } },
  },
  {
    id: 'quarryShift',
    where: { archetypes: ['mine'] },
    label: 'Смена в каменоломне',
    description: 'Камень, пыль и десятник, который считает вынутые корзины, а не людей.',
    durationMinutes: hours(10),
    pay: 22,
    practice: { hardLabour: 30, athletics: 12, fortitude: 6 },
    fatigue: 55,
    requires: { skills: { hardLabour: 10 } },
  },
  {
    id: 'countLedgers',
    where: { archetypes: ['city', 'capital', 'port'] },
    label: 'Считать чужие долги',
    description: 'Купеческие книги. Ошибёшься в свою пользу — заметят; в чужую — не заметят.',
    durationMinutes: hours(6),
    pay: 24,
    practice: { trade: 22, scholarship: 12 },
    fatigue: 12,
    requires: { skills: { trade: 10, scholarship: 8 } },
  },
  {
    id: 'fieldWork',
    label: 'Работа в поле',
    description: 'Сев, жатва, прополка — смотря какой месяц. Спина не спрашивает.',
    where: { archetypes: ['village', 'town'], terrains: ['plains', 'steppe', 'coast', 'hills'] },
    durationMinutes: hours(9),
    pay: 6,
    practice: { hardLabour: 22, survival: 8 },
    fatigue: 38,
  },
  {
    id: 'haulNets',
    label: 'Тянуть сети',
    description: 'Холодная вода до пояса и улов, который делят прежде тебя.',
    where: { archetypes: ['port', 'village'], terrains: ['coast', 'marsh'] },
    durationMinutes: hours(7),
    pay: 10,
    practice: { hardLabour: 16, survival: 14, athletics: 8 },
    fatigue: 32,
  },
  {
    id: 'loadShips',
    label: 'Грузить корабли',
    description: 'Сходни, мешки и боцман, который считает время в мешках.',
    where: { archetypes: ['port'] },
    durationMinutes: hours(8),
    pay: 16,
    practice: { hardLabour: 26, athletics: 10 },
    fatigue: 42,
    requires: { skills: { hardLabour: 5 } },
  },
  {
    id: 'washOre',
    label: 'Промывать руду',
    description: 'Сидеть над корытом и выбирать блеск из грязи. Берут кого угодно.',
    where: { archetypes: ['mine'] },
    durationMinutes: hours(7),
    pay: 9,
    practice: { hardLabour: 14, engineering: 10 },
    fatigue: 24,
  },
  {
    id: 'standWatch',
    label: 'Стоять в карауле',
    description: 'Стена, ветер и десятник, который проверяет, не спишь ли ты стоя.',
    where: { archetypes: ['fortress'] },
    durationMinutes: hours(10),
    pay: 11,
    practice: { fortitude: 18, lightWeapons: 12, heavyWeapons: 6 },
    fatigue: 36,
  },
  {
    id: 'copyPsalter',
    label: 'Переписывать псалтырь',
    description: 'Обитель кормит и даёт кров, а платит скупо и с укором.',
    where: { archetypes: ['monastery'] },
    durationMinutes: hours(8),
    pay: 8,
    practice: { scholarship: 24, concentration: 10 },
    fatigue: 14,
    requires: { skills: { scholarship: 3 } },
  },
]

export const JOBS_BY_ID: Readonly<Record<string, JobDef>> = Object.fromEntries(
  JOBS.map((job) => [job.id, job]),
)
