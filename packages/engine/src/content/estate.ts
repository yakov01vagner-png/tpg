import type { BuildingId } from './buildings'

/**
 * Своя земля изнутри (этап 61) — содержимое.
 *
 * До 0.6 владение было счётом: подать минус жалованье гарнизону. Люди в нём не
 * жили, просить ничего не могли, законов в нём не было, а постройки работали
 * сами и вечно. Здесь у земли появляются управляющий, просьбы, закон и
 * хозяйство, которое ломается.
 */

/** Нрав управляющего (В1). */
export const SENESCHAL_TEMPERS = ['honest', 'thief', 'lazy', 'zealous', 'old'] as const
export type SeneschalTemper = (typeof SENESCHAL_TEMPERS)[number]

export const SENESCHAL_TEMPER_DEFS: Record<
  SeneschalTemper,
  {
    readonly label: string
    readonly about: string
    /** Какую долю подати он берёт себе, когда хозяина нет рядом. */
    readonly skim: number
    /** Насколько лучше или хуже идут дела в его руках. */
    readonly order: number
  }
> = {
  honest: {
    label: 'честный',
    about: 'Считает до последней меры и ту же меру записывает. Таких мало, и они это знают.',
    skim: 0,
    order: 0.05,
  },
  thief: {
    label: 'вор',
    about: 'Всё сходится, пока не сядешь считать сам. Тогда не сходится ничего.',
    skim: 0.22,
    order: -0.05,
  },
  lazy: {
    label: 'нерадивый',
    about: 'Не крадёт — просто не делает. Подать приходит позже и меньше, а мельница стоит.',
    skim: 0.06,
    order: -0.12,
  },
  zealous: {
    label: 'ретивый',
    about: 'Выжмет всё и ещё немного. Казна довольна, люди — нет.',
    skim: 0,
    order: 0.12,
  },
  old: {
    label: 'старый слуга',
    about: 'Служил ещё прежнему хозяину. Помнит всё и всех, и его слушают.',
    skim: 0.03,
    order: 0.08,
  },
}

export const SENESCHAL_NAMES: readonly string[] = [
  'Прокоп',
  'Демьян',
  'Евсей',
  'Игнат',
  'Кузьма',
  'Лукьян',
  'Меркул',
  'Наум',
  'Потап',
  'Савелий',
  'Трифон',
  'Фрол',
]

/**
 * Чего хотят жители (В2).
 *
 * Просьбы не выдумываются: они читаются из состояния места. Голодной деревне
 * нужен амбар, разбойной — застава, обобранной — снятая подать. Отказ помнят:
 * просьба, оставленная без ответа, через срок сама превращается в обиду.
 */
export const PLEA_IDS = ['granary', 'mill', 'walls', 'watchtower', 'well', 'court', 'tax'] as const
export type PleaId = (typeof PLEA_IDS)[number]

export interface PleaDef {
  readonly id: PleaId
  readonly label: string
  readonly asks: string
  /** Что просят построить, если просят постройку. */
  readonly building?: BuildingId
  /** Сколько суток ждут ответа. */
  readonly patience: number
  /** Что даёт исполнение и чего стоит отказ — сдвигом памяти места. */
  readonly granted: number
  readonly refused: number
}

export const PLEAS: readonly PleaDef[] = [
  {
    id: 'granary',
    label: 'Амбар',
    asks: 'Хлеб не доживает до весны. Поставь амбар, господин, — свой хлеб сберечь дешевле, чем чужой купить.',
    building: 'granary',
    patience: 120,
    granted: 18,
    refused: -14,
  },
  {
    id: 'mill',
    label: 'Мельница',
    asks: 'Мелем ручными жерновами, как при дедах. С мельницы того же зерна выйдет больше.',
    building: 'mill',
    patience: 180,
    granted: 16,
    refused: -10,
  },
  {
    id: 'walls',
    label: 'Стены',
    asks: 'За частоколом не отсидеться. Поставь камень, пока не пришли те, кто ходит по этой дороге.',
    building: 'walls',
    patience: 150,
    granted: 22,
    refused: -18,
  },
  {
    id: 'watchtower',
    label: 'Застава',
    asks: 'По дороге не проехать. Поставь заставу — и обозы вернутся сами.',
    building: 'watchtower',
    patience: 120,
    granted: 18,
    refused: -14,
  },
  {
    id: 'well',
    label: 'Колодец',
    asks: 'Воду носим от реки. Один колодец — и бабы перестанут тебя проклинать.',
    building: 'well',
    patience: 150,
    granted: 12,
    refused: -8,
  },
  {
    id: 'court',
    label: 'Суд',
    asks: 'Ссоры решают кулаками, потому что решать больше некому. Сядь и рассуди, господин.',
    patience: 60,
    granted: 14,
    refused: -12,
  },
  {
    id: 'tax',
    label: 'Снять подать',
    asks: 'Подать не по силам. Сними на время — иначе уйдём туда, где берут меньше.',
    patience: 90,
    granted: 20,
    refused: -16,
  },
]

export const PLEAS_BY_ID: Readonly<Record<string, PleaDef>> = Object.fromEntries(
  PLEAS.map((one) => [one.id, one]),
)

/**
 * Закон (В3).
 *
 * Правила, которые ставишь ты, и мир, который на них отвечает. Подать, пошлина,
 * набор и суд: каждое — три ступени, и у каждой ступени своя цена. Дешёвого
 * выбора здесь нет.
 */
export const TAX_LEVELS = ['light', 'plain', 'heavy'] as const
export type TaxLevel = (typeof TAX_LEVELS)[number]

export const TAX_DEFS: Record<
  TaxLevel,
  { readonly label: string; readonly take: number; readonly mood: number; readonly about: string }
> = {
  light: {
    label: 'малая подать',
    take: 0.6,
    mood: 6,
    about: 'Берёшь меньше, чем принято. Люди это помнят, соседи считают тебя мягким.',
  },
  plain: {
    label: 'по обычаю',
    take: 1,
    mood: 0,
    about: 'Как берут везде. Ни благодарности, ни обиды.',
  },
  heavy: {
    label: 'тяжёлая подать',
    take: 1.45,
    mood: -10,
    about: 'Берёшь всё, что земля даёт. Казна полна, люди уходят.',
  },
}

export const TOLL_LEVELS = ['none', 'plain', 'greedy'] as const
export type TollLevel = (typeof TOLL_LEVELS)[number]

export const TOLL_DEFS: Record<
  TollLevel,
  { readonly label: string; readonly take: number; readonly trade: number; readonly about: string }
> = {
  none: {
    label: 'без пошлин',
    take: 0,
    trade: 0.1,
    about: 'Проезд свободен. Обозы идут через тебя, и рынок это чувствует.',
  },
  plain: { label: 'по обычаю', take: 1, trade: 0, about: 'Берёшь у заставы столько, сколько все.' },
  greedy: {
    label: 'двойная пошлина',
    take: 2,
    trade: -0.15,
    about: 'Берёшь вдвое. Часть обозов пойдёт в объезд, остальные заплатят.',
  },
}

export const LEVY_LEVELS = ['none', 'plain', 'full'] as const
export type LevyLevel = (typeof LEVY_LEVELS)[number]

export const LEVY_DEFS: Record<
  LevyLevel,
  {
    readonly label: string
    readonly recruits: number
    readonly mood: number
    readonly about: string
  }
> = {
  none: {
    label: 'без набора',
    recruits: 0,
    mood: 4,
    about: 'Никого не забираешь от сохи. Гарнизон придётся набирать за деньги.',
  },
  plain: {
    label: 'по обычаю',
    recruits: 1,
    mood: 0,
    about: 'Каждый десятый двор даёт человека, когда нужно.',
  },
  full: {
    label: 'полный набор',
    recruits: 2.2,
    mood: -12,
    about: 'Забираешь всех, кто держит копьё. Поля останутся без рук.',
  },
}

export const JUSTICE_LEVELS = ['mild', 'plain', 'harsh'] as const
export type JusticeLevel = (typeof JUSTICE_LEVELS)[number]

export const JUSTICE_DEFS: Record<
  JusticeLevel,
  {
    readonly label: string
    readonly banditry: number
    readonly mood: number
    readonly about: string
  }
> = {
  mild: {
    label: 'милостивый суд',
    banditry: 0.0002,
    mood: 5,
    about: 'Вешать не спешишь. Людям это по душе, а разбою — тем более.',
  },
  plain: {
    label: 'суд по обычаю',
    banditry: 0,
    mood: 0,
    about: 'Как заведено: вора — плетьми, разбойника — на сук.',
  },
  harsh: {
    label: 'суд без пощады',
    banditry: -0.0006,
    mood: -8,
    about: 'На дорогах тихо, и на площади тоже. Тихо по-разному.',
  },
}

/** Что ставят по умолчанию: как берут везде. */
export const PLAIN_LAW = {
  tax: 'plain' as TaxLevel,
  toll: 'plain' as TollLevel,
  levy: 'plain' as LevyLevel,
  justice: 'plain' as JusticeLevel,
}

/**
 * Постройки с людьми (В4).
 *
 * Мельница мелет, пока её крутят; кузня без кузнеца — сарай. У каждой постройки
 * есть жалованье работникам и своя вероятность встать. Пока она стоит, она не
 * даёт ничего — и это заметно по казне и по хлебу.
 */
export const BUILDING_WORK: Partial<
  Record<BuildingId, { readonly wages: number; readonly breaks: number; readonly repair: number }>
> = {
  granary: { wages: 1, breaks: 0.0004, repair: 60 },
  mill: { wages: 3, breaks: 0.0018, repair: 110 },
  walls: { wages: 2, breaks: 0.0006, repair: 180 },
  barracks: { wages: 2, breaks: 0.0008, repair: 90 },
  smithy: { wages: 4, breaks: 0.0016, repair: 120 },
  market: { wages: 3, breaks: 0.0008, repair: 90 },
  well: { wages: 1, breaks: 0.0006, repair: 40 },
  chapel: { wages: 2, breaks: 0.0004, repair: 70 },
  tavern: { wages: 3, breaks: 0.0012, repair: 80 },
  watchtower: { wages: 2, breaks: 0.001, repair: 70 },
  warehouse: { wages: 2, breaks: 0.0008, repair: 90 },
  bathhouse: { wages: 2, breaks: 0.0014, repair: 60 },
}

/**
 * Несколько владений (В5).
 *
 * Три места держать иначе, чем одно. Хозяин не может быть везде, и там, где его
 * давно не было, подать садится, а управляющий смелеет.
 */
export const VISIT_FRESH = 60
export const VISIT_STALE = 240
/** Насколько меньше приходит с места, где хозяина не видели давно. */
export const ARREARS_MAX = 0.45
/** Сколько занимает объезд одного владения. */
export const TOUR_HOURS = 6
