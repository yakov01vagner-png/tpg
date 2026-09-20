/**
 * Донесение с поля (этап 111) — содержимое.
 *
 * Приказ этапа 108 шёл в своё место, где его ждали. На войне ждать некому:
 * пока гонец едет, война двигается, и приказ приходит к другой обстановке.
 * Тогда за него отвечает тот, кто его получил, — и он решает сам.
 */

/** Нрав того, кто водит часть. */
export const CAPTAIN_TEMPERS = ['bold', 'careful', 'dutiful', 'willful'] as const
export type CaptainTemper = (typeof CAPTAIN_TEMPERS)[number]

export const CAPTAIN_DEFS: Record<
  CaptainTemper,
  {
    readonly label: string
    readonly about: string
    /** Как часто он делает по-своему, когда обстановка разошлась с приказом. */
    readonly ownWay: number
    /** Насколько он привирает в донесении: доля, на которую расходится число. */
    readonly gilds: number
    /** Что он выберет сам, если приказ устарел. */
    readonly falls: 'attack' | 'hold' | 'back'
  }
> = {
  bold: {
    label: 'горячий',
    about: 'Видит случай — идёт. Приказ для него — прошлогодний снег.',
    ownWay: 0.8,
    gilds: 0.2,
    falls: 'attack',
  },
  careful: {
    label: 'осторожный',
    about: 'Бережёт людей: где не уверен, там стоит.',
    ownWay: 0.5,
    gilds: -0.15,
    falls: 'back',
  },
  dutiful: {
    label: 'исполнительный',
    about: 'Сделает как велено, даже если велено вчерашнее.',
    ownWay: 0.1,
    gilds: 0.05,
    falls: 'hold',
  },
  willful: {
    label: 'своевольный',
    about: 'У него своя война. Слушает, когда совпадает.',
    ownWay: 0.95,
    gilds: 0.3,
    falls: 'attack',
  },
}

/** Замысел: то, что не стареет в дороге (По3). */
export const INTENTS = ['holdEdge', 'pressThem', 'saveMen', 'takePlace'] as const
export type IntentId = (typeof INTENTS)[number]

export const INTENT_DEFS: Record<
  IntentId,
  { readonly label: string; readonly about: string; readonly falls: 'attack' | 'hold' | 'back' }
> = {
  holdEdge: {
    label: 'держи этот край',
    about: 'Не пускай чужих в эту землю. Куда идти — решай сам.',
    falls: 'hold',
  },
  pressThem: {
    label: 'дави их',
    about: 'Не давай им стоять: жги, гони, не дай собраться.',
    falls: 'attack',
  },
  saveMen: {
    label: 'сбереги людей',
    about: 'Людей мне дороже земли: не лезь, где положат.',
    falls: 'back',
  },
  takePlace: {
    label: 'возьми это место',
    about: 'Всё остальное неважно. Возьми и держи.',
    falls: 'attack',
  },
}

export const DISPATCH = {
  /** Суток на переход для гонца. */
  daysPerHop: 0.8,
  /** Насколько быстрее там, где по дороге стоят свои места. */
  ownRoadSpeeds: 0.7,
  /** И насколько — там, где стоят сторожевые башни: огонь идёт за день. */
  towerSpeeds: 0.35,
  /** Насколько расходится донесение с полем за каждый переход. */
  driftPerHop: 0.02,
  /** Дальше этого донесение не расходится: враньё тоже имеет предел. */
  maxOff: 0.3,
  /** Приказ, которому больше стольких суток, считается устаревшим. */
  staleDays: 5,
  /** Насколько обстановка должна разойтись, чтобы полководец решал сам. */
  changed: 0.2,
} as const

export const DISPATCH_WORDS = {
  sent: 'Гонец послан.',
  late: 'Приказ застал другую войну.',
  obeyed: 'Исполнено как велено.',
  ownWay: 'Полководец рассудил по-своему.',
  intent: 'Замысел не стареет: он знает, чего ты хочешь, а не куда идти.',
  fire: 'Сигнальные огни: весть идёт за день, а не за неделю.',
  wrong: 'Донесение разошлось с тем, что было на поле.',
} as const
