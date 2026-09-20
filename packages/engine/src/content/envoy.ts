/**
 * Посол как глаза (этап 114) — содержимое.
 *
 * Посольство 0.7 привозило одно: да или нет. Всё остальное о чужой короне игрок
 * и так знал точно, и оттого посол был кнопкой, а не человеком. Здесь он
 * привозит картину чужого двора — и картина эта его, а не мира.
 */

/** Каким глазом посол смотрит. */
export const ENVOY_EYES = ['timid', 'bold', 'keen', 'venal'] as const
export type EnvoyEye = (typeof ENVOY_EYES)[number]

export const ENVOY_EYE_DEFS: Record<
  EnvoyEye,
  {
    readonly label: string
    readonly about: string
    /** Как он врёт о чужой силе: доля, на которую расходится его число. */
    readonly onStrength: number
    /** И о чужой казне. */
    readonly onPurse: number
    /** Насколько верно он передаёт замысел: 1 — как есть. */
    readonly onAim: number
  }
> = {
  timid: {
    label: 'робкий',
    about: 'Привозит преувеличенный страх: у них всего больше, чем есть.',
    onStrength: 0.35,
    onPurse: 0.3,
    onAim: 0.5,
  },
  bold: {
    label: 'дерзкий',
    about: 'Привозит преуменьшенную силу: он их не испугался и тебе не советует.',
    onStrength: -0.3,
    onPurse: -0.25,
    onAim: 0.6,
  },
  keen: {
    label: 'приметливый',
    about: 'Считает коней в конюшне и людей у дверей. Привозит почти правду.',
    onStrength: 0.08,
    onPurse: 0.1,
    onAim: 0.9,
  },
  venal: {
    label: 'падкий',
    about: 'Его угостили, и он привёз то, что ему рассказали за столом.',
    onStrength: 0.2,
    onPurse: -0.4,
    onAim: 0.3,
  },
}

/** Что можно показать чужому послу у себя. */
export const SHOWS = ['plain', 'strong', 'poor'] as const
export type ShowKind = (typeof SHOWS)[number]

export const SHOW_DEFS: Record<
  ShowKind,
  {
    readonly label: string
    readonly about: string
    /** Во сколько раз он увидит твою силу против правды. */
    readonly strength: number
    /** И казну. */
    readonly purse: number
    readonly cost: number
  }
> = {
  plain: {
    label: 'как есть',
    about: 'Пусть смотрит. Правда иногда лучший из доводов.',
    strength: 1,
    purse: 1,
    cost: 0,
  },
  strong: {
    label: 'показать силу',
    about: 'Гарнизон на стенах, кони под седлом, стол ломится. Дорого и убедительно.',
    strength: 1.45,
    purse: 1.6,
    cost: 900,
  },
  poor: {
    label: 'прибедниться',
    about: 'Пустая казна, тощие люди, худые стены. Пусть считают тебя слабым.',
    strength: 0.65,
    purse: 0.45,
    cost: 150,
  },
}

export const ENVOY = {
  /** Насколько умение посла сужает его же поправку. */
  skillNarrows: 0.06,
  /** Раз во сколько суток к тебе приезжают смотреть. */
  guestBeat: 25,
  /** Сколько суток чужой посол гостит. */
  guestDays: 8,
  /** Насколько чужая корона верит своему послу. */
  theyTrust: 0.8,
} as const

export const ENVOY_WORDS = {
  brought: 'Посол вернулся не только с ответом.',
  eye: 'Что он привёз — зависит от того, чьими глазами он смотрел.',
  guest: 'К тебе приехали смотреть.',
  shown: 'Гостю показали то, что решили показать.',
  saw: 'Он уехал с тем, что увидел.',
  caught: 'Гость не поверил: показное видно, когда перестараешься.',
} as const
