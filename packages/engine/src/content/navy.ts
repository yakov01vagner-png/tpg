/**
 * Флот и десант (этап 87) — содержимое.
 *
 * Море в 0.5 было дорогой: судно возило людей и товар. Военного флота не было
 * ни у игрока, ни у корон — гавань нельзя было запереть, берег нельзя было
 * взять с воды, а торговлю нельзя было душить. Здесь у моря появляется война.
 */

/** Виды боевых судов (Ф1). */
export const WARSHIPS = ['ushkuy', 'battleLadya', 'nasad'] as const
export type WarshipKind = (typeof WARSHIPS)[number]

export interface WarshipDef {
  readonly id: WarshipKind
  readonly label: string
  readonly about: string
  /** Во что обходится постройка. */
  readonly price: number
  /** Сколько суток строят. */
  readonly days: number
  /** Сколько рук нужно на борт. */
  readonly crew: number
  /** Сколько воинов берёт сверх команды. */
  readonly carries: number
  /** Сила в морском бою. */
  readonly fight: number
  /** Ход: меньше единицы — ходкое судно. */
  readonly pace: number
  /** Сколько стоят сутки на плаву. */
  readonly upkeep: number
}

export const WARSHIP_DEFS: Record<WarshipKind, WarshipDef> = {
  ushkuy: {
    id: 'ushkuy',
    label: 'Ушкуй',
    about: 'Лёгкое судно для набега: догонит купца, уйдёт от дромона, в строю бесполезно.',
    price: 1400,
    days: 25,
    crew: 20,
    carries: 20,
    fight: 6,
    pace: 0.85,
    upkeep: 5,
  },
  battleLadya: {
    id: 'battleLadya',
    label: 'Боевая ладья',
    about: 'Основа всякого флота: держит строй, берёт на абордаж, возит дружину.',
    price: 3800,
    days: 45,
    crew: 45,
    carries: 50,
    fight: 12,
    pace: 1,
    upkeep: 12,
  },
  nasad: {
    id: 'nasad',
    label: 'Насад',
    about: 'Высокий борт и помост для стрелков: медленный, дорогой, страшный в сражении.',
    price: 9000,
    days: 80,
    crew: 80,
    carries: 90,
    fight: 26,
    pace: 1.25,
    upkeep: 26,
  },
}

/** Что ветер делает с боем (Ф2). */
export const WIND = ['fair', 'cross', 'foul'] as const
export type WindId = (typeof WIND)[number]

export const WIND_DEFS: Record<WindId, { readonly label: string; readonly edge: number }> = {
  fair: { label: 'ветер в спину', edge: 1.25 },
  cross: { label: 'ветер вбок', edge: 1 },
  foul: { label: 'ветер в лицо', edge: 0.8 },
}

/** Чем кончился морской бой. */
export const SEA_ENDS = ['sunk', 'boarded', 'fled', 'lost'] as const
export type SeaEnd = (typeof SEA_ENDS)[number]

export const SEA_END_DEFS: Record<SeaEnd, { readonly label: string; readonly about: string }> = {
  sunk: { label: 'потоплен', about: 'Чужие суда на дне, своих потеряно меньше.' },
  boarded: { label: 'взят на абордаж', about: 'Палубы взяты: судно и то, что на нём, — твоё.' },
  fled: { label: 'ушёл', about: 'Догнать не вышло: у моря длинные края.' },
  lost: { label: 'разбит', about: 'Своих потоплено больше: море не прощает счёта на глаз.' },
}

export const NAVY = {
  /** Сколько десант теряет при высадке на чужой берег. */
  landingLoss: 0.05,
  /** Сколько переходов от гавани флот ещё снабжает берег. */
  supplyReach: 2,
  /** Какую долю подвоза съедает блокада за сутки. */
  blockadeTrade: 0.2,
  /** Что блокада делает с памятью запертого места за сутки. */
  blockadeMood: -0.4,
  /** И сколько серебра в сутки теряет его хозяин. */
  blockadeToll: 12,
  /** Какую долю добычи берёт корсар с чужой торговли. */
  prize: 0.3,
  /** Насколько падают отношения с короной, чью торговлю грабят без грамоты. */
  piracyRelations: -6,
  /** И с грамотой — тоже падают, но вдвое меньше. */
  letterRelations: -3,
  /** Сколько суток действует корсарская грамота. */
  letterDays: 180,
} as const

export const NAVY_WORDS = {
  noHarbour: 'Флот строят в гавани, а не в поле.',
  noFleet: 'Флота нет: ни одного судна на плаву.',
  blockaded: 'Гавань заперта: в неё не входит никто.',
  cutOff: 'Десант отрезан: с моря не везут ничего.',
  supplied: 'Берег кормится с моря: пока гавань за тобой, войско сыто.',
} as const
