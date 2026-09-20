/**
 * Учение (этап 188) — содержимое.
 *
 * Учиться в игре можно с 0.2: наставники, книги, курсы, ордена и испытания.
 * Все они дают одно и то же — очки в навык, — и потому выбор между ними не
 * выбор: бери, что дешевле. Здесь лежит то, чем дороги учения отличаются.
 */

export const LEARN_ROADS = ['master', 'book', 'school', 'doing', 'order'] as const
export type LearnRoadId = (typeof LEARN_ROADS)[number]

export const LEARN_ROAD_DEFS: Record<
  LearnRoadId,
  {
    readonly label: string
    readonly about: string
    /** Во сколько раз быстрее обычного идёт умение. */
    readonly pace: number
    /** До какой доли предела доводит эта дорога. */
    readonly upTo: number
    /** Чего стоит. */
    readonly costs: string
  }
> = {
  master: {
    label: 'наставник',
    about: 'Человек, который умеет больше тебя и берёт за это деньги и терпение.',
    pace: 2.2,
    upTo: 1,
    costs: 'серебро и то, что он о тебе думает',
  },
  book: {
    label: 'книга',
    about: 'Даёт понимание, а не руку: по книге не научишься бить, но научишься считать.',
    pace: 1.3,
    upTo: 0.6,
    costs: 'деньги разом и грамотность',
  },
  school: {
    label: 'школа',
    about: 'Курс с порядком и сроком: медленнее наставника, зато дешевле и с людьми.',
    pace: 1.6,
    upTo: 0.8,
    costs: 'срок и место, где она есть',
  },
  doing: {
    label: 'дело',
    about: 'Учишься тем, что делаешь. Дальше середины так не уйти.',
    pace: 1,
    upTo: 0.5,
    costs: 'время и ошибки',
  },
  order: {
    label: 'орден',
    about: 'Берут не всех и учат не всему — зато доводят до предела.',
    pace: 1.8,
    upTo: 1,
    costs: 'служба и обет',
  },
}

export const LETTERS = ['reading', 'reckoning', 'law', 'tongues', 'scripture'] as const
export type LetterId = (typeof LETTERS)[number]

export const LETTER_DEFS: Record<
  LetterId,
  { readonly label: string; readonly opens: string; readonly needs: number }
> = {
  reading: { label: 'грамота', opens: 'Читать грамоты и не верить писцу на слово.', needs: 10 },
  reckoning: { label: 'счёт', opens: 'Считать подать и видеть, где тебя обсчитали.', needs: 20 },
  law: { label: 'право', opens: 'Говорить в суде своими словами, а не чужими.', needs: 35 },
  tongues: { label: 'языки', opens: 'Понимать посла раньше, чем переведут.', needs: 45 },
  scripture: { label: 'Писание', opens: 'Спорить с церковью на её языке.', needs: 55 },
}

export const TEACHING = {
  /**
   * Сколько очков умения даёт день учения при обычном ходе.
   *
   * Число нарочно мелкое: при 0.8 мастерство бралось за месяц, и все дороги
   * учения сходились в одну точку — «быстро». Двадцать сотых в день значат
   * семь очков в год делом и пятнадцать с наставником: за жизнь мастером
   * становятся в одном ремесле, в двух — если повезло с учителями.
   */
  perDay: 0.02,
  /** Во сколько раз дороже брать наставника выше своего предела. */
  highCosts: 2,
} as const

export const TEACHING_WORDS = {
  ceiling: 'Выше потолка сам не вырастешь: нужен тот, кто выше.',
  roads: 'Дороги учения дают разное и требуют разного.',
  letters: 'Знание — не только удар: оно открывает разговоры.',
} as const
