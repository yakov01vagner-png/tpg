/**
 * Корабли — данные, а не код (правило репозитория №6).
 *
 * Корабль не «транспорт», а имущество: он стоит как три каравана, ест деньги
 * стоянкой, ветшает в шторм и тонет. Поэтому у него всего четыре числа: во
 * сколько обошёлся, сколько берёт людей, насколько ходок и сколько стоит день
 * его содержания.
 */
export const SHIP_KINDS = ['shnyaka', 'ladya', 'kogg'] as const

export type ShipKind = (typeof SHIP_KINDS)[number]

export interface ShipDef {
  readonly id: ShipKind
  readonly label: string
  readonly description: string
  /** Сколько просят за такое судно в порту. */
  readonly price: number
  /** Сколько человек берёт на борт вместе с хозяином. */
  readonly carries: number
  /**
   * Множитель к часам пути: меньше единицы — ходкое судно.
   * Шняка валкая и тихая, ладья идёт ровно, когг тяжелее, но держит погоду.
   */
  readonly pace: number
  /** Сколько стоит день, пока судно на плаву: смола, канаты, команда. */
  readonly upkeep: number
  /** Насколько шторм треплет именно это судно. */
  readonly sturdy: number
}

export const SHIPS: Record<ShipKind, ShipDef> = {
  shnyaka: {
    id: 'shnyaka',
    label: 'Шняка',
    description:
      'Рыбацкая лодка с одним парусом. Дёшева, берёт немногих и боится большой волны — зато своя.',
    price: 700,
    carries: 8,
    pace: 1.2,
    upkeep: 2,
    sturdy: 0.6,
  },
  ladya: {
    id: 'ladya',
    label: 'Ладья',
    description:
      'Купеческое судно на два десятка вёсел. На таком возят товар и дружину и не жалуются.',
    price: 2600,
    carries: 32,
    pace: 1,
    upkeep: 7,
    sturdy: 1,
  },
  kogg: {
    id: 'kogg',
    label: 'Когг',
    description:
      'Высокий борт, крепкая корма, полсотни человек на палубе. Тяжёл на ходу, но переживает то, чего не переживают другие.',
    price: 6400,
    carries: 80,
    pace: 1.15,
    upkeep: 15,
    sturdy: 1.6,
  },
}

/** Имена для своего судна: своё судно зовут по имени, а не «когг №2». */
export const SHIP_NAMES: readonly string[] = [
  'Чайка',
  'Морянка',
  'Быстрая',
  'Удача',
  'Заря',
  'Вольная',
  'Косатка',
  'Тихая Вода',
  'Кормилица',
  'Ветреница',
  'Голубица',
  'Смелая',
]
