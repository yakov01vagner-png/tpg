/**
 * Церковь как сила (этап 183) — содержимое.
 *
 * С этапа 96 у церкви есть земля обителей, десятина, замыслы и счёт
 * недовольства. Чего нет — людей: обители безымянны, епископов не существует,
 * а спор с церковью решается одной кнопкой «уступить». Здесь лежит то, из чего
 * церковь делается людьми.
 */

export const CLERGY_RANKS = ['abbot', 'bishop', 'preacher', 'legate'] as const
export type ClergyRank = (typeof CLERGY_RANKS)[number]

export const CLERGY_DEFS: Record<
  ClergyRank,
  { readonly label: string; readonly about: string; readonly weight: number }
> = {
  abbot: {
    label: 'настоятель',
    about: 'Хозяин обители: земля, хлеб и три десятка братьев, которые слушают его, а не тебя.',
    weight: 1,
  },
  bishop: {
    label: 'епископ',
    about: 'Держит округу: венчает, отпевает, судит по вере и знает о твоей земле больше тебя.',
    weight: 2,
  },
  preacher: {
    label: 'проповедник',
    about: 'Ничего не держит и потому говорит что хочет. Слушают его больше, чем епископа.',
    weight: 1.5,
  },
  legate: {
    label: 'легат',
    about: 'Приехал не к тебе, а по твою душу: у него грамота и срок.',
    weight: 3,
  },
}

export const CLERGY_TEMPERS = ['strict', 'worldly', 'meek', 'zealot'] as const
export type ClergyTemper = (typeof CLERGY_TEMPERS)[number]

export const CLERGY_TEMPER_DEFS: Record<
  ClergyTemper,
  {
    readonly label: string
    readonly about: string
    readonly takes: number
    readonly forgives: number
  }
> = {
  strict: {
    label: 'строгий',
    about: 'Служит по уставу и другим спуску не даёт.',
    takes: 0.8,
    forgives: 0.6,
  },
  worldly: {
    label: 'мирской',
    about: 'Знает цену вещам и не стесняется её называть.',
    takes: 1.4,
    forgives: 1.3,
  },
  meek: {
    label: 'кроткий',
    about: 'Просит мало и прощает многое — пока его не трогают.',
    takes: 0.7,
    forgives: 1.5,
  },
  zealot: {
    label: 'ревнитель',
    about: 'Видит вокруг одно нечестие и готов назвать его вслух.',
    takes: 1,
    forgives: 0.3,
  },
}

export const CLERGY = {
  /** Сколько земли церковь прибавляет за век, долей от мест мира. */
  growsPerCentury: 0.08,
  /** Сколько серебра приносит обитель в сутки. */
  perHouse: 22,
  /** Насколько благочестивое место платит охотнее. */
  devoutPays: 1.2,
  /** С какого благочестия место считается благочестивым. */
  devoutAt: 20,
  /** Насколько уступка сбивает счёт недовольства у кроткого. */
  meekSoothes: 1.4,
  /** Сколько суток идёт собор. */
  councilDays: 40,
  /** Сколько стоит покаяние в серебре за очко гнева. */
  penancePerAnger: 90,
} as const

export const CLERGY_WORDS = {
  own: 'У церкви свои люди, и они не твои.',
  grows: 'Церковь прирастает землёй тихо и не отдаёт назад ничего.',
  council: 'Собор: спорят не с тобой, а о тебе.',
  penance: 'Покаяние: дёшево для гордости, дорого для казны.',
  legate: 'Приехал легат. Это не разговор — это срок.',
  devout: 'Благочестивое место платит охотнее и слушает не тебя.',
} as const
