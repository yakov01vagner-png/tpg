/**
 * Двор лорда — данные, а не код (этап 52).
 *
 * До 0.6 замок был кнопкой «просить землю». Здесь лежит то, что у двора
 * авторского: чин приёма, люди при лорде, нравы и слова. Кто именно сидит в
 * этом замке, решает мир (`castle.ts`).
 */

/** Нрав лорда: по нему он судит, принимает и воюет. */
export type LordTemper = 'proud' | 'shrewd' | 'jovial' | 'grim' | 'pious' | 'greedy'

export interface LordTemperDef {
  readonly id: LordTemper
  readonly label: string
  /** Насколько трудно к нему попасть: 0 пустит всякого, 1 — только по славе. */
  readonly closed: number
  /** Что он ценит в подарке: во сколько раз подарок весомее обычного. */
  readonly gift: number
  /** Как судит: выше нуля — в пользу просителя, ниже — в пользу своих. */
  readonly justice: number
  readonly greets: readonly string[]
  readonly refuses: readonly string[]
}

export const LORD_TEMPERS: Record<LordTemper, LordTemperDef> = {
  proud: {
    id: 'proud',
    label: 'гордый',
    closed: 0.75,
    gift: 0.8,
    justice: -0.2,
    greets: ['Говори коротко. У меня сегодня ещё двое.'],
    refuses: ['Я не принимаю всякого, кто дошёл до ворот. Заслужи.'],
  },
  shrewd: {
    id: 'shrewd',
    label: 'расчётливый',
    closed: 0.5,
    gift: 1.2,
    justice: 0,
    greets: ['Слушаю. И считаю, во что мне это станет.'],
    refuses: ['Сейчас от тебя мне никакой пользы. Приходи с делом.'],
  },
  jovial: {
    id: 'jovial',
    label: 'весёлый',
    closed: 0.2,
    gift: 1,
    justice: 0.2,
    greets: ['А, живая душа! Садись, вина налей себе сам.'],
    refuses: ['Не сегодня, брат. Сегодня я пью, а не правлю.'],
  },
  grim: {
    id: 'grim',
    label: 'суровый',
    closed: 0.65,
    gift: 0.9,
    justice: -0.3,
    greets: ['Ну.'],
    refuses: ['Нет.'],
  },
  pious: {
    id: 'pious',
    label: 'богобоязненный',
    closed: 0.45,
    gift: 0.9,
    justice: 0.3,
    greets: ['С миром. Говори, только не лги — тут слышат не только меня.'],
    refuses: ['Ступай в храм, а после приходи. Там и разберёшься, с чем идёшь.'],
  },
  greedy: {
    id: 'greedy',
    label: 'алчный',
    closed: 0.4,
    gift: 1.6,
    justice: -0.1,
    greets: ['Проходи. С пустыми руками у нас не задерживаются.'],
    refuses: ['Без подарка и разговора нет.'],
  },
}

export const LORD_TEMPER_IDS: readonly LordTemper[] = [
  'proud',
  'shrewd',
  'jovial',
  'grim',
  'pious',
  'greedy',
]

/** Кто при лорде: должность и то, чем этот человек полезен и опасен. */
export type CourtRole = 'seneschal' | 'captain' | 'spouse' | 'heir' | 'chaplain'

export interface CourtRoleDef {
  readonly id: CourtRole
  readonly label: string
  readonly about: string
}

export const COURT_ROLES: Record<CourtRole, CourtRoleDef> = {
  seneschal: {
    id: 'seneschal',
    label: 'сенешаль',
    about: 'Держит счёт и ключи. Через него проходит всё, что лорд подписывает.',
  },
  captain: {
    id: 'captain',
    label: 'капитан дружины',
    about: 'Водит людей лорда. Знает, кто силён на границе, а кто только хвалится.',
  },
  spouse: {
    id: 'spouse',
    label: 'госпожа',
    about: 'Её слово при дворе весит не меньше, а иногда и больше.',
  },
  heir: {
    id: 'heir',
    label: 'наследник',
    about: 'Молод и нетерпелив. Ждёт своего часа и запоминает, кто был с ним добр.',
  },
  chaplain: {
    id: 'chaplain',
    label: 'духовник',
    about: 'Слушает исповеди всего замка. Знает больше сенешаля и говорит меньше.',
  },
}

export const COURT_NAMES: readonly string[] = [
  'Радомир',
  'Витольд',
  'Бранимир',
  'Ярополк',
  'Станислав',
  'Милош',
  'Аделаида',
  'Ярослава',
  'Гертруда',
  'Мирослава',
  'Беатриса',
  'Забава',
  'Кассим',
  'Надира',
  'Эрлинг',
  'Астрид',
]

/** Дела двора: услуга за услугу, донос, покровительство. */
export type IntrigueKind = 'service' | 'denounce' | 'patronage'

export interface IntrigueDef {
  readonly id: IntrigueKind
  readonly label: string
  readonly description: string
  readonly minutes: number
  /** Сколько это стоит просителю. */
  readonly cost: number
}

export const INTRIGUES: readonly IntrigueDef[] = [
  {
    id: 'service',
    label: 'Предложить услугу',
    description: 'Взяться за то, чего лорд не поручит своим: долг, тяжба, дурной сосед.',
    minutes: 90,
    cost: 0,
  },
  {
    id: 'denounce',
    label: 'Донести на соседа',
    description: 'Рассказать то, что лорду приятно услышать о другом. Тот узнает, от кого.',
    minutes: 60,
    cost: 0,
  },
  {
    id: 'patronage',
    label: 'Просить покровительства',
    description: 'Встать под руку: он говорит за тебя, ты отвечаешь за него. Не даром.',
    minutes: 120,
    cost: 150,
  },
]

/** Что бывает при дворе, когда лорд созывает людей. */
export const TOURNEY_FEE = 40
export const TOURNEY_PURSE = 260

/** Пороги милости: с какой её высоты что открывается. */
export const FAVOUR_AUDIENCE = -20
export const FAVOUR_SERVICE = 15
export const FAVOUR_LAND = 45

/** Словами: как лорд к тебе относится. */
export function favourWord(favour: number): string {
  if (favour <= -40) return 'в опале'
  if (favour <= FAVOUR_AUDIENCE) return 'не в милости'
  if (favour < FAVOUR_SERVICE) return 'известен'
  if (favour < FAVOUR_LAND) return 'в милости'
  return 'в чести'
}
