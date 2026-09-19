/**
 * Посольства (этап 79) — содержимое.
 *
 * Дипломатия 0.6 была чужой: к тебе приезжал посол и о чём-то просил (этап 65).
 * Своего хода у тебя не было — говорить можно было только в ответ. Здесь
 * появляется собственное посольство: своего человека снаряжают, посылают и ждут
 * ответа, который придёт не сегодня.
 *
 * Здесь лежит то, с чем посылают, чего это стоит и какими словами отвечают.
 */

export const EMBASSY_ERRANDS = [
  'alliance',
  'marriage',
  'tribute',
  'passage',
  'ransom',
  'threat',
  'mediation',
] as const
export type EmbassyErrand = (typeof EMBASSY_ERRANDS)[number]

export interface EmbassyErrandDef {
  readonly id: EmbassyErrand
  readonly label: string
  readonly about: string
  /** Во что обходятся дары и дорога. */
  readonly cost: number
  /**
   * Насколько трудно согласиться: вычитается из веса посольства. Союз и брак
   * — дело долгое, проход по земле — дело пустяковое.
   */
  readonly hard: number
  /** Что это меняет в отношении, когда получилось. */
  readonly warms: number
  /** И когда не получилось. */
  readonly chills: number
  /** С чем посол приходит — его слова. */
  readonly says: string
}

export const EMBASSY_DEFS: Record<EmbassyErrand, EmbassyErrandDef> = {
  alliance: {
    id: 'alliance',
    label: 'союз',
    about: 'Стоять вместе, если на одного из вас пойдут. Договор, который переживает обоих.',
    cost: 300,
    hard: 0.55,
    warms: 15,
    chills: -4,
    says: 'Мой государь предлагает стоять вместе: ваши враги — наши враги.',
  },
  marriage: {
    id: 'marriage',
    label: 'брак',
    about: 'Дом за дом: союз, у которого есть залог. Держится дольше слова.',
    cost: 800,
    hard: 0.7,
    warms: 25,
    chills: -8,
    says: 'Мой государь говорит о родстве: дом за дом, и мир между ними.',
  },
  tribute: {
    id: 'tribute',
    label: 'дань',
    about: 'Пусть платят за спокойствие. Унизительно для них и выгодно для тебя.',
    cost: 150,
    hard: 0.85,
    warms: -5,
    chills: -12,
    says: 'Мой государь ждёт от вас дани — и ждёт недолго.',
  },
  passage: {
    id: 'passage',
    label: 'проход',
    about: 'Право провести войско или обоз через чужую землю, не воюя за каждый брод.',
    cost: 120,
    hard: 0.35,
    warms: 6,
    chills: -3,
    says: 'Мой государь просит дороги: мы пройдём и не тронем ничего.',
  },
  ransom: {
    id: 'ransom',
    label: 'выкуп',
    about: 'Выкупить своего человека из чужого плена — или продать чужого.',
    cost: 100,
    hard: 0.4,
    warms: 4,
    chills: -2,
    says: 'Мой государь пришёл за своим человеком и платит за него.',
  },
  threat: {
    id: 'threat',
    label: 'угроза',
    about: 'Сказать вслух, чем кончится упрямство. Слабый уступит, сильный запомнит.',
    cost: 60,
    hard: 0.6,
    warms: -10,
    chills: -20,
    says: 'Мой государь велел передать: он умеет считать до одного.',
  },
  mediation: {
    id: 'mediation',
    label: 'посредничество',
    about: 'Помирить двух воюющих и взять своё — не землёй, так именем.',
    cost: 250,
    hard: 0.6,
    warms: 12,
    chills: -2,
    says: 'Мой государь предлагает сесть и кончить эту войну.',
  },
}

/** Сколько суток идёт посольство в один конец. */
export const EMBASSY_DAYS = 14

/** Во сколько раз письмо слабее живого посла — и насколько дольше идёт. */
export const LETTER = {
  weight: 0.6,
  cost: 0.25,
  days: 1.6,
} as const

/** Что говорят, отвечая. */
export const EMBASSY_ANSWERS = {
  yes: 'Согласны. Так и передай своему государю.',
  no: 'Нет. Передай это слово в слово.',
  haughty: 'С кем ты говоришь? Иди туда, откуда пришёл.',
  counted: 'Мы подумаем. Подумаем ровно столько, сколько нам удобно.',
} as const

/** Как отвечают чужому послу и во что это обходится (П4). */
export const HOST_ANSWERS = ['yes', 'no', 'delay', 'humiliate'] as const
export type HostAnswer = (typeof HOST_ANSWERS)[number]

export const HOST_DEFS: Record<
  HostAnswer,
  { readonly label: string; readonly about: string; readonly relation: number }
> = {
  yes: { label: 'Согласиться', about: 'Дать то, о чём просят.', relation: 10 },
  no: { label: 'Отказать', about: 'Ровно и без обид — насколько это возможно.', relation: -8 },
  delay: {
    label: 'Тянуть',
    about: 'Не отказать и не согласиться: пусть ждёт. Иногда этого довольно.',
    relation: -3,
  },
  humiliate: {
    label: 'Унизить',
    about: 'Выгнать со двора при всех. Об этом будут помнить и через колено.',
    relation: -30,
  },
}
