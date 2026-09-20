/**
 * Знание как вещь (этап 99) — содержимое.
 *
 * До 0.8 всякое число доходило до игрока мгновенно и точным: казна соседа,
 * войско за горизонтом, замысел лорда. Здесь у знания появляются три свойства —
 * откуда, когда и насколько верно, — и они лежат здесь, а не в коде.
 */

/** Три рода знания (З1). */
export const SOURCES = ['eyes', 'own', 'envoy', 'rumour'] as const
export type SourceKind = (typeof SOURCES)[number]

export const SOURCE_DEFS: Record<
  SourceKind,
  {
    readonly label: string
    readonly about: string
    /** Насколько источнику верят: 1 — как своим глазам. */
    readonly trust: number
    /** Какая вилка у свежей вести от такого источника, долей. */
    readonly spread: number
    /** Насколько быстро весть от него стареет, долей за год. */
    readonly ages: number
  }
> = {
  eyes: {
    label: 'видел сам',
    about: 'Своими глазами: точнее не бывает, но увидеть можно только то, до чего дошёл.',
    trust: 1,
    spread: 0,
    ages: 0.5,
  },
  own: {
    label: 'донесли свои',
    about: 'Наместник, советник, свой человек на месте: близко к правде и с чужой рукой.',
    trust: 0.8,
    spread: 0.12,
    ages: 0.7,
  },
  envoy: {
    label: 'привёз посол',
    about: 'Тот, кто был там и говорил с теми, кто знает. Видел не всё и понял по-своему.',
    trust: 0.65,
    spread: 0.25,
    ages: 0.9,
  },
  rumour: {
    label: 'ходит молва',
    about: 'Говорят на торгу. Иногда правда, и почти никогда не точно.',
    trust: 0.3,
    spread: 0.6,
    ages: 1.4,
  },
}

/** О чём вообще бывает знание (З5): закрытый список вопросов. */
export const QUESTIONS = ['strength', 'garrison', 'stores', 'host', 'aim', 'purse'] as const
export type QuestionKind = (typeof QUESTIONS)[number]

export const ASKED_DEFS: Record<
  QuestionKind,
  { readonly label: string; readonly about: string; readonly unit: string }
> = {
  strength: { label: 'сила', about: 'Чего стоит эта сторона целиком.', unit: '' },
  garrison: { label: 'гарнизон', about: 'Сколько людей за стенами.', unit: 'человек' },
  stores: { label: 'запас', about: 'На сколько суток хлеба за стенами.', unit: 'сут.' },
  host: { label: 'войско', about: 'Где видели чужую дружину.', unit: '' },
  aim: { label: 'замысел', about: 'Чего эта сторона добивается.', unit: '' },
  purse: { label: 'казна', about: 'Сколько у неё серебра.', unit: '' },
}

export const KNOWN = {
  /** Насколько вилка растёт за год от старости вести. */
  agePerYear: 0.35,
  /** И за каждый переход расстояния. */
  perHop: 0.04,
  /** Шире этой вилки знание считается негодным: лучше честно сказать «не знаю». */
  useless: 1.2,
  /** Сколько суток весть вообще живёт, прежде чем о ней забывают. */
  keepDays: 1080,
  /** Насколько учёность снижает порог расхождения за очко (этап 123). */
  perLearned: 0.005,
  /** Насколько разум сужает вилку за очко сверх шести (этап 122). */
  perWit: 0.05,
  /** Насколько расходятся два источника, чтобы это назвать расхождением. */
  clash: 0.25,
} as const

export const KNOWN_WORDS = {
  unknown: 'Об этом ты ничего не знаешь.',
  stale: 'Весть старая: с тех пор многое могло перемениться.',
  fresh: 'Весть свежая.',
  clash: 'Источники расходятся: верить придётся кому-то одному.',
  eyes: 'Ты видел это сам.',
} as const
