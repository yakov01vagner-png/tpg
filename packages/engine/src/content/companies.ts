/**
 * Вольные роты (этап 86) — содержимое.
 *
 * Войско до 0.7 бывало только своё: ополчение, набор, дружина. Рота — третий
 * род войск и первый, у которого есть своя воля: она приходит с именем, славой
 * и нравом, служит тому, кто платит, и уходит к тому, кто платит больше.
 */

/** Нрав роты (Н1): по нему считается и цена, и терпение, и измена. */
export const COMPANY_TEMPERS = ['faithful', 'greedy', 'cruel', 'proud'] as const
export type CompanyTemper = (typeof COMPANY_TEMPERS)[number]

export const TEMPER_DEFS: Record<
  CompanyTemper,
  {
    readonly label: string
    readonly about: string
    /** Во сколько раз дороже обычного. */
    readonly price: number
    /** Сколько суток недоимки терпят. */
    readonly patience: number
    /** Насколько охотнее поворачивают оружие против хозяина. */
    readonly treachery: number
  }
> = {
  faithful: {
    label: 'верные слову',
    about: 'Дороже прочих и стоят того: такие дослуживают срок даже в недоимку.',
    price: 1.25,
    patience: 45,
    treachery: 0.25,
  },
  greedy: {
    label: 'жадные',
    about: 'Служат кошельку, а не знамени. Пока платишь — лучше не найти.',
    price: 0.9,
    patience: 12,
    treachery: 1.4,
  },
  cruel: {
    label: 'лютые',
    about: 'Хороши в поле и страшны в округе: где они прошли, там помнят.',
    price: 1,
    patience: 20,
    treachery: 1.1,
  },
  proud: {
    label: 'гордые',
    about: 'Помнят обиды и цену себе. Обидишь — уйдут, даже если заплатишь.',
    price: 1.1,
    patience: 25,
    treachery: 0.8,
  },
}

export interface CompanyDef {
  readonly id: string
  readonly name: string
  readonly temper: CompanyTemper
  /** Сколько человек в роте, когда она полна. */
  readonly men: number
  /** Из кого она состоит. */
  readonly make: Readonly<Record<string, number>>
  readonly about: string
}

/** Роты мира. Их немного, и каждую узнают по имени. */
export const COMPANIES: readonly CompanyDef[] = [
  {
    id: 'blackSpears',
    name: 'Чёрные копья',
    temper: 'faithful',
    men: 120,
    make: { spearman: 80, archer: 25, manAtArms: 15 },
    about: 'Старая рота, пережившая трёх нанимателей и две войны подряд.',
  },
  {
    id: 'redHands',
    name: 'Красные руки',
    temper: 'cruel',
    men: 90,
    make: { militia: 40, spearman: 35, archer: 15 },
    about: 'Берут дёшево и берут своё: жалованьем и всем, что попадётся.',
  },
  {
    id: 'wolvesOfLim',
    name: 'Лимские волки',
    temper: 'greedy',
    men: 70,
    make: { horseman: 30, archer: 20, spearman: 20 },
    about: 'Конная рота: догонят, обойдут и уйдут раньше, чем подойдёт помощь.',
  },
  {
    id: 'ironBrothers',
    name: 'Железные братья',
    temper: 'proud',
    men: 60,
    make: { manAtArms: 40, archer: 20 },
    about: 'Малая рота в хорошем железе. Просят много и не торгуются.',
  },
  {
    id: 'ashenRiders',
    name: 'Пепельные всадники',
    temper: 'greedy',
    men: 50,
    make: { horseman: 35, archer: 15 },
    about: 'Пришли с юга, служат любому и не помнят, кому служили вчера.',
  },
  {
    id: 'oldGuard',
    name: 'Старая стража',
    temper: 'faithful',
    men: 80,
    make: { spearman: 45, manAtArms: 20, archer: 15 },
    about: 'Бывший гарнизон павшей крепости: воюют вместе двадцать лет.',
  },
]

export const COMPANY = {
  /** Плата за человека в сутки — с этого считается всё остальное. */
  wagePerMan: 2.4,
  /** Задаток: сколько суток платят вперёд при найме. */
  upfront: 10,
  /** Доля добычи, которую рота берёт сверх жалованья. */
  share: 0.25,
  /** Самый короткий и самый длинный срок найма. */
  shortest: 30,
  longest: 360,
  /** Насколько дороже рота, у которой есть слава. */
  famePrice: 0.004,
  /** Сколько славы даёт роте выигранное дело. */
  fameWin: 3,
  /** На сколько перебивают цену, чтобы переманить роту. */
  outbid: 1.35,
  /** Во сколько раз меньше корона даёт за каждую следующую роту. */
  crowded: 0.55,
  /** Что делает с округой рота без нанимателя, за сутки. */
  idleMood: -0.5,
  idleBanditry: 0.02,
  /** Сколько людей рота теряет в сутки, когда ей не платят. */
  melt: 0.03,
} as const

export const COMPANY_WORDS = {
  free: 'Рота свободна и слушает предложения.',
  served: 'Рота в службе: срок идёт, жалованье капает.',
  owed: 'Роте должны. Капитан считает дни.',
  gone: 'Рота ушла: слово нарушил не капитан.',
  turned: 'Рота повернула оружие: неоплаченный наёмник — враг, который знает твой лагерь.',
} as const
