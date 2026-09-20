/**
 * Люди двора (этап 104) — содержимое.
 *
 * Должность в 0.7 была числом пригодности: имя бралось у человека, а человек —
 * у списка. Здесь у того, кто держит должность, появляется своё: нрав, возраст,
 * цель и голос, которым он говорит.
 */

/** Нрав человека двора. */
export const COURT_TEMPERS = ['zealous', 'sly', 'weary', 'proud', 'kindly'] as const
export type CourtTemper = (typeof COURT_TEMPERS)[number]

export const COURT_TEMPER_DEFS: Record<
  CourtTemper,
  {
    readonly label: string
    readonly about: string
    /** Насколько он усерден в деле. */
    readonly work: number
    /** Насколько склонен к своей руке. */
    readonly hand: number
    /** Насколько верен тебе лично. */
    readonly loyal: number
  }
> = {
  zealous: {
    label: 'ревностный',
    about: 'Делает больше, чем велено, и обижается, когда этого не замечают.',
    work: 1.2,
    hand: 0.4,
    loyal: 1.1,
  },
  sly: {
    label: 'дошлый',
    about: 'Знает, где что лежит, и берёт своё аккуратно.',
    work: 1.05,
    hand: 1.6,
    loyal: 0.8,
  },
  weary: {
    label: 'усталый',
    about: 'Служил многим. Делает ровно столько, чтобы не было упрёка.',
    work: 0.8,
    hand: 0.9,
    loyal: 0.9,
  },
  proud: {
    label: 'гордый',
    about: 'Служит не тебе, а месту: место высокое, а ты — какой достался.',
    work: 1.1,
    hand: 0.7,
    loyal: 0.7,
  },
  kindly: {
    label: 'добрый',
    about: 'Хорош с людьми и мягок к их недоимкам — иногда в ущерб казне.',
    work: 0.95,
    hand: 0.6,
    loyal: 1.15,
  },
}

/** Чего он хочет для себя (Дв2). */
export const COURT_WANTS = ['coin', 'land', 'name', 'kin', 'quiet'] as const
export type CourtWant = (typeof COURT_WANTS)[number]

export const COURT_WANT_DEFS: Record<
  CourtWant,
  { readonly label: string; readonly says: string; readonly costs: string }
> = {
  coin: {
    label: 'серебро',
    says: 'Жалованье моё не по месту, господин. Место высокое, а кошель лёгкий.',
    costs: 'прибавка к жалованью',
  },
  land: {
    label: 'земля',
    says: 'Служу тебе третий год. У людей поплоше моего есть свой угол.',
    costs: 'лен из твоей руки',
  },
  name: {
    label: 'имя',
    says: 'Пусть скажут при всех, чьей рукой это сделано. Больше мне не надо.',
    costs: 'слово при дворе и доля славы',
  },
  kin: {
    label: 'своих пристроить',
    says: 'У меня племянник — толковый малый. Ему бы место.',
    costs: 'должность или двор для его родни',
  },
  quiet: {
    label: 'покой',
    says: 'Мне бы дослужить без потрясений, господин.',
    costs: 'меньше поручений и меньше перемен',
  },
}

export const COURTIER = {
  /** С какого возраста человек двора начинает проситься на покой. */
  tiredAge: 58,
  /** И в каком его уносит своим чередом. */
  endAge: 74,
  /** Насколько исполненное желание поднимает его верность. */
  granted: 14,
  /** И насколько роняет отказ. */
  refused: -10,
  /** Как часто он просит: раз в столько суток. */
  asksEvery: 180,
  /** Насколько нрав меняет умение в деле. */
  workSpread: 0.25,
} as const

export const COURTIER_WORDS = {
  serves: 'служит',
  asks: 'просит',
  tired: 'просится на покой: годы.',
  gone: 'оставил двор.',
  died: 'умер на службе.',
} as const
