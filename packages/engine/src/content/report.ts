/**
 * Донесения своих (этап 100) — содержимое.
 *
 * Своя земля до 0.8 отчитывалась мгновенно и точно: подать капала в казну
 * ровным числом, беда появлялась в журнале в тот же день. Здесь между твоей
 * землёй и тобой встаёт человек, который пишет отчёт, — и у него есть свои
 * причины округлить.
 */

/** Кто пишет отчёт и как (Д2, Д5). */
export const REPORTERS = ['honest', 'flatterer', 'thief', 'plain'] as const
export type ReporterKind = (typeof REPORTERS)[number]

export const REPORTER_DEFS: Record<
  ReporterKind,
  {
    readonly label: string
    readonly about: string
    /** Во сколько раз приукрашивает доброе. */
    readonly gilds: number
    /** И во сколько мельчит дурное. */
    readonly hides: number
    /** Какую долю дохода оставляет себе. */
    readonly skims: number
  }
> = {
  honest: {
    label: 'честный',
    about: 'Пишет как есть, даже когда это дурно для него самого.',
    gilds: 1,
    hides: 1,
    skims: 0,
  },
  plain: {
    label: 'обычный',
    about: 'Округляет в свою пользу, как все: не ворует, но и не кается.',
    gilds: 1.08,
    hides: 0.85,
    skims: 0.03,
  },
  flatterer: {
    label: 'угодливый',
    about: 'Пишет то, что тебе приятно читать. Беду узнаешь от соседей.',
    gilds: 1.3,
    hides: 0.45,
    skims: 0.05,
  },
  thief: {
    label: 'с рукой',
    about: 'Считает твою землю отчасти своей и отчитывается ровно настолько, чтобы не поймали.',
    gilds: 0.8,
    hides: 0.7,
    skims: 0.22,
  },
}

/** Что бывает в отчёте (Д1, Д6). */
export const REPORTED = ['tax', 'grain', 'banditry', 'people'] as const
export type ReportedKind = (typeof REPORTED)[number]

export const REPORTED_DEFS: Record<
  ReportedKind,
  { readonly label: string; readonly good: boolean; readonly unit: string }
> = {
  tax: { label: 'подать', good: true, unit: '' },
  grain: { label: 'хлеб в амбарах', good: true, unit: 'мер' },
  banditry: { label: 'разбой', good: false, unit: 'из ста' },
  people: { label: 'жителей', good: true, unit: 'душ' },
}

export const REPORT = {
  /** Сколько суток идёт отчёт за каждый переход. */
  daysPerHop: 1.2,
  /** Как часто отчитываются: раз в столько суток. */
  everyDays: 30,
  /** Сколько стоит ревизия за место. */
  auditSilver: 900,
  /** Сколько суток она отнимает. */
  auditDays: 6,
  /** Насколько ревизия злит проверенного. */
  auditAnger: -12,
  /** И насколько поднимает верность, если он оказался честен. */
  auditTrust: 6,
  /** Сколько лет помнят, что их проверяли. */
  auditMemoryYears: 3,
  /** Насколько учёность хозяина сужает приукрашивание. */
  scholarship: 0.006,
} as const

export const REPORT_WORDS = {
  came: 'Пришёл отчёт.',
  late: 'Отчёт в пути: пока он идёт, всё могло перемениться.',
  gilded: 'Отчёт приукрашен: числа в нём добрее, чем земля.',
  hidden: 'В отчёте недостаёт: беду написали мельче, чем она есть.',
  clean: 'Ревизия ничего не нашла: писали как есть.',
  caught: 'Ревизия нашла руку: часть подати не доходила до тебя.',
} as const
