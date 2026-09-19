/**
 * Соглядатаи (этап 82) — содержимое.
 *
 * Дипломатия до сих пор велась в открытую: посольство, договор, родство. Но
 * половина дипломатии — это знать то, чего тебе не говорят: пуста ли у соседа
 * казна, кого он считает врагом, о чём он договорился не вслух.
 *
 * Здесь лежит то, что можно узнать, чего это стоит и чем кончается, когда
 * твоего человека берут за руку.
 */

/** Что можно узнать (С2). */
export const SPY_FINDS = ['purse', 'host', 'plan', 'paper', 'house'] as const
export type SpyFind = (typeof SPY_FINDS)[number]

export const SPY_FIND_DEFS: Record<
  SpyFind,
  { readonly label: string; readonly about: string; readonly needs: number }
> = {
  purse: {
    label: 'казна',
    about: 'Сколько у них земли, людей и чем они это кормят.',
    needs: 0,
  },
  host: {
    label: 'войско',
    about: 'Сколько людей под рукой у короны и её вассалов.',
    needs: 0,
  },
  plan: {
    label: 'замысел',
    about: 'Чего корона добивается сейчас и кого считает врагом (этап 72).',
    needs: 20,
  },
  paper: {
    label: 'тайная статья',
    about: 'То, о чём они договорились не вслух (этап 80).',
    needs: 45,
  },
  house: {
    label: 'дом',
    about: 'Наследник, ветви и то, сколько лет до смены колена (этап 81).',
    needs: 10,
  },
}

/** Где сидит человек: при дворе или в городе. */
export const SPY_SEATS = ['court', 'city'] as const
export type SpySeat = (typeof SPY_SEATS)[number]

export const SPY_SEAT_DEFS: Record<
  SpySeat,
  {
    readonly label: string
    readonly about: string
    readonly cost: number
    /** Сколько он платит за себя в сутки. */
    readonly wage: number
    /** Насколько вероятно, что его возьмут, за сутки. */
    readonly risk: number
    /** Насколько он видит больше. */
    readonly sees: number
  }
> = {
  court: {
    label: 'при дворе',
    about: 'Человек в чужой приёмной: слышит то, что говорят вслух при своих.',
    cost: 600,
    wage: 3,
    risk: 0.0035,
    sees: 40,
  },
  city: {
    label: 'в городе',
    about: 'Человек на торгу: видит обозы, гарнизоны и цену хлеба — и его труднее заметить.',
    cost: 250,
    wage: 1.5,
    risk: 0.0012,
    sees: 15,
  },
}

/** Подкуп чужого советника (С3). */
export const BRIBE = {
  /** Цена: с каждого места той короны. */
  perPlace: 90,
  /** Насколько дороже берёт верный. */
  loyal: 2.5,
  /** Сколько суток он потом говорит тебе то, что знает. */
  days: 180,
}

/** Что бывает, когда соглядатая берут (С4). */
export const CAUGHT = {
  /** Отношение с той короной. */
  relation: -35,
  /** Насколько вероятно, что за этим будет война. */
  war: 0.25,
  /** И во что это обходится имени. */
  shame: true,
} as const

/** Слух против соседа (С6). */
export const RUMOUR = {
  cost: 400,
  days: 45,
  /** Насколько портит его отношения с каждой другой короной. */
  spoils: -10,
  /** И насколько роняет его признание в глазах прочих. */
  fame: -12,
} as const
