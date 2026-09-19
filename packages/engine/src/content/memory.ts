/**
 * ИИ помнит (этап 92) — содержимое.
 *
 * Мир до 0.7 помнил дела игрока местами (память места) и лордами (память
 * лорда). Короны не помнили ничего: вчерашняя война не меняла завтрашнего
 * разговора. Здесь появляется память сил — и то, что из неё следует: стиль
 * игрока, общее мнение о нём и прощение, которое приходит не ко всем.
 */

/** Что корона помнит о тебе (Па1). */
export const CROWN_DEEDS = [
  'warred',
  'sacked',
  'broke',
  'took',
  'spied',
  'paid',
  'helped',
  'wed',
  'traded',
] as const
export type CrownDeedId = (typeof CROWN_DEEDS)[number]

export const CROWN_DEED_DEFS: Record<
  CrownDeedId,
  {
    readonly label: string
    readonly recalls: string
    /** Вес в мнении: минус — против тебя. */
    readonly weight: number
    /** За сколько лет забывается половина. */
    readonly halfLife: number
  }
> = {
  warred: {
    label: 'воевал',
    recalls: 'Мы воевали. Такое помнят дольше, чем длилась сама война.',
    weight: -18,
    halfLife: 12,
  },
  sacked: {
    label: 'разорял',
    recalls: 'Наши сёла жгли твои люди. Это помнят не в столице, а в этих сёлах.',
    weight: -26,
    halfLife: 20,
  },
  broke: {
    label: 'нарушил слово',
    recalls: 'Ты подписал и не исполнил. С такими говорят через стол пошире.',
    weight: -30,
    halfLife: 25,
  },
  took: {
    label: 'обложил данью',
    recalls: 'Мы платим тебе. Каждый день платим.',
    weight: -22,
    halfLife: 8,
  },
  spied: {
    label: 'держал соглядатая',
    recalls: 'Твоего человека взяли у нас во дворе. Он много рассказал.',
    weight: -14,
    halfLife: 6,
  },
  paid: {
    label: 'платил дань',
    recalls: 'Ты платишь нам. Пока платишь — ты нам полезен.',
    weight: 8,
    halfLife: 6,
  },
  helped: {
    label: 'помогал',
    recalls: 'Твой хлеб пришёл, когда своего не было. Это помнят.',
    weight: 20,
    halfLife: 10,
  },
  wed: {
    label: 'породнился',
    recalls: 'В твоём доме наша кровь. Это меняет разговор.',
    weight: 25,
    halfLife: 30,
  },
  traded: {
    label: 'торговал',
    recalls: 'Твои караваны кормят наши пошлины. Ссориться невыгодно.',
    weight: 12,
    halfLife: 5,
  },
}

/** Каким тебя считают (Па2). */
export const STYLES = ['warlike', 'trader', 'schemer', 'builder'] as const
export type StyleId = (typeof STYLES)[number]

export const STYLE_DEFS: Record<
  StyleId,
  {
    readonly label: string
    readonly about: string
    /** Чем мир отвечает такому игроку. */
    readonly answer: string
  }
> = {
  warlike: {
    label: 'воитель',
    about: 'Твоё имя приходит раньше твоего войска.',
    answer: 'Границы с тобой держат под гарнизоном, а союзы против тебя ищут заранее.',
  },
  trader: {
    label: 'торговый человек',
    about: 'Ты берёшь не землёй, а серебром.',
    answer: 'Тебя давят пошлиной: в чужих землях тебе всё дороже.',
  },
  schemer: {
    label: 'человек тайных дел',
    about: 'Соглядатаи, слухи и чужие дворы — твой способ воевать.',
    answer: 'За твоими людьми смотрят, а слову твоему верят вполовину.',
  },
  builder: {
    label: 'хозяин',
    about: 'Ты растёшь тем, что строишь и держишь.',
    answer: 'С тобой говорят о деле: тебе предлагают дороги и родство.',
  },
}

export const MEMORY = {
  /** Насколько слабеет память при смене государя (Па4). */
  heirShare: 0.5,
  /** Ниже этого мнения тебя держат за врага. */
  foeLine: -35,
  /** Выше этого — за своего. */
  friendLine: 30,
  /** Насколько дороже покупает тот, кого здесь не любят. */
  spiteBite: 0.35,
  /** И насколько дешевле — тот, кого любят. */
  favourGift: 0.12,
  /** Во сколько раз сильнее давят пошлиной торгового человека. */
  tollOnTrader: 1.5,
} as const

export const MEMORY_WORDS = {
  blank: 'О тебе здесь ничего не помнят.',
  foe: 'Тебя здесь держат за врага.',
  friend: 'Тебя здесь считают своим.',
  wary: 'О тебе здесь знают и присматриваются.',
} as const
