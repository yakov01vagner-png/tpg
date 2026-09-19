import type { GoodId } from './goods'
import type { OrderKind } from './orders'

/**
 * Орден как люди и дела (этап 59).
 *
 * До 0.6 орден был членством: взнос, положение, ступень, поблажки. Люди в нём
 * отсутствовали, дел у него не было, а вражда жила только множителем к приёму.
 * Здесь появляется то, чего не хватало: братья с именами, служба, какой нет на
 * рынке, и власть, которая даётся ступенью.
 */

export const BROTHER_ROLES = ['master', 'treasurer', 'knight', 'scribe'] as const
export type BrotherRole = (typeof BROTHER_ROLES)[number]

export const BROTHER_ROLE_LABELS: Record<OrderKind, Record<BrotherRole, string>> = {
  church: {
    master: 'настоятель',
    treasurer: 'келарь',
    knight: 'брат-рыцарь',
    scribe: 'писец',
  },
  order: {
    master: 'магистр',
    treasurer: 'казначей',
    knight: 'брат-рыцарь',
    scribe: 'письмоводитель',
  },
  guild: {
    master: 'старшина',
    treasurer: 'казначей',
    knight: 'начальник стражи',
    scribe: 'счётчик',
  },
}

export const BROTHER_NAMES: readonly string[] = [
  'Аверкий',
  'Вукол',
  'Гордей',
  'Дементий',
  'Елизар',
  'Зосима',
  'Иринарх',
  'Капитон',
  'Лаврентий',
  'Мардарий',
  'Нифонт',
  'Онисим',
  'Пафнутий',
  'Родион',
  'Сильвестр',
  'Тарасий',
  'Уар',
  'Фотий',
  'Харитон',
  'Яков',
]

/**
 * Дела ордена (этап 59, О1).
 *
 * Таких дел нет на рынке: их дают своим, и они говорят, чем этот орден живёт.
 * Церковь ищет порчу, гильдия — рынки, орден — врагов.
 */
export const ERRAND_KINDS = ['heresy', 'market', 'foe'] as const
export type ErrandKind = (typeof ERRAND_KINDS)[number]

export interface ErrandDef {
  readonly kind: ErrandKind
  readonly label: string
  readonly about: string
  /** Какому укладу такое поручают. */
  readonly forKinds: readonly OrderKind[]
  /** С какой ступени дают. */
  readonly needsRank: number
  /** Сколько суток на это дают. */
  readonly days: number
  /** Награда серебром и положением. */
  readonly pay: number
  readonly standing: number
}

export const ERRANDS: readonly ErrandDef[] = [
  {
    kind: 'heresy',
    label: 'Дознание',
    about:
      'В месте говорят не то, что велено. Съездить, выслушать и решить — своей головой, но перед братьями отвечать тебе.',
    forKinds: ['church'],
    needsRank: 0,
    days: 30,
    pay: 90,
    standing: 16,
  },
  {
    kind: 'market',
    label: 'Открыть рынок',
    about:
      'Гильдия хочет стоять там, где её ещё нет: довези товар и продай его там, где его не брали.',
    forKinds: ['guild'],
    needsRank: 0,
    days: 45,
    pay: 120,
    standing: 14,
  },
  {
    kind: 'foe',
    label: 'Убрать чужих',
    about: 'У ордена есть враги, и у них есть люди. Разбить их там, где они стоят.',
    forKinds: ['order', 'church'],
    needsRank: 1,
    days: 60,
    pay: 180,
    standing: 22,
  },
]

/** Что гильдии просят возить: не хлеб, а то, на чём стоит торг. */
export const MARKET_GOODS: readonly GoodId[] = ['cloth', 'wine', 'iron', 'spices']

/**
 * Ступень — власть (этап 59, О2).
 *
 * С какой ступени орденом можно двигать. Ступени считаются от нуля: третья —
 * высшая у всех шести орденов.
 */
export const POWER_RANKS = {
  /** Послать братьев: они идут и делают. */
  send: 2,
  /** Просить покровительства перед лордом. */
  patronage: 2,
  /** Наложить или снять запрет. */
  interdict: 3,
  /** Помиловать: вернуть изгнанному его место. */
  pardon: 3,
} as const

/** Во что ордену встаёт посылка братьев — и сколько положения на это уходит. */
export const SEND_COST = 140
export const SEND_STANDING = 10
/** На сколько суток братья наводят порядок. */
export const SEND_DAYS = 30
/** Насколько посланные братья сбивают разбой. */
export const SEND_BANDITRY = 0.3

/** Интердикт: сколько суток место живёт без обрядов. */
export const INTERDICT_DAYS = 90
export const INTERDICT_STANDING = 18

/**
 * Свой орден (этап 59, О6).
 *
 * Основать братство можно тому, кто дорос до высшей ступени в чужом, — или
 * тому, кто никогда ни в одном не состоял и потому никому не должен.
 */
export const FOUND_COST = 2000
export const FOUND_RENOWN = 5

/** Уставы, между которыми выбирают при основании. */
export const CHARTERS = [
  {
    id: 'mercy',
    label: 'Устав милосердия',
    about: 'Кормить голодных, щадить пленных, не жечь. Такое братство любят, но боятся мало.',
    charter: { feedHungry: 8, sparePrisoners: 8, sack: -25, raid: -20 },
  },
  {
    id: 'steel',
    label: 'Устав меча',
    about: 'Побеждать и брать. Такому братству не отказывают, но и не открывают дверей.',
    charter: { winBattle: 8, sack: 4, raid: 2, abandonQuest: -12 },
  },
  {
    id: 'coin',
    label: 'Устав счёта',
    about: 'Платить по чести и держать слово в делах. Скучно и надёжно — как всякий хороший торг.',
    charter: { payWell: 8, abandonQuest: -16, feedHungry: 3 },
  },
] as const

export type CharterId = (typeof CHARTERS)[number]['id']

/**
 * Вражда орденов живёт (этап 59, О3).
 *
 * Влияние ордена — число, которое растёт само на его землях и падает, когда
 * его бьют. Враждующие ордена сходятся там, где стоят оба: от этого влияние
 * теряют оба, а разбой на той земле прибавляется — свара братьев людям дорога.
 */
export const SWAY_START = 50
/**
 * К своему потолку орден подходит не спеша: половина пути — примерно за год.
 * Потолок у каждого свой и считается от того, во скольких местах он стоит:
 * братство, стоящее в каждой деревне, весит иначе, чем орден в восьми домах.
 */
export const SWAY_GROWTH = 0.002
export const SWAY_FLOOR = 20
export const SWAY_MAX = 120
/** При скольких домах орден весит в полную силу. */
export const SWAY_REACH = 300
/** Сколько влияния теряет орден за одну свару. */
export const CLASH_SWAY = 3
/** Насколько свара прибавляет разбоя месту. */
export const CLASH_BANDITRY = 0.05
/**
 * Как часто враждующие ордена сходятся в одном месте.
 *
 * Считается на каждую пару «место и два врага» за сутки. Пар в мире под три
 * сотни, и при этом числе свары выходят десятками в год — то есть редкостью, о
 * которой говорят, а не погодой.
 */
export const CLASH_CHANCE = 0.00025
