/**
 * Свои головы (этап 72) — содержимое.
 *
 * До этого мир двигали броски и пороги: корона объявляла войну случайному
 * соседу, лорд шёл на случайное место, купец стоял за прилавком. Здесь у
 * каждого появляется то, чего он добивается, и слова, которыми он это
 * объясняет. Это не разум: это правила, по которым видно, чего он хочет.
 *
 * Содержимое — данные (правило 6): здесь лежат виды замыслов и слова к ним,
 * а кто чего хочет, считает `plans.ts`.
 */

import type { BuildingId } from './buildings'
import type { LordTemper } from './castle'

/** Чего хочет лорд (Ч1). */
export const LORD_WANTS = ['war', 'loot', 'hoard', 'build', 'wed', 'guard'] as const
export type LordWantId = (typeof LORD_WANTS)[number]

export const LORD_WANT_DEFS: Record<
  LordWantId,
  {
    readonly label: string
    /** Чего он ищет в походе: во сколько раз охотнее берёт место осадой. */
    readonly siege: number
    /** Пойдёт ли он вообще со двора. */
    readonly marches: boolean
  }
> = {
  war: { label: 'воевать', siege: 1, marches: true },
  loot: { label: 'взять добычу', siege: 0.8, marches: true },
  hoard: { label: 'копить', siege: 0, marches: false },
  build: { label: 'строить', siege: 0, marches: false },
  wed: { label: 'свататься', siege: 0, marches: false },
  guard: { label: 'держать своё', siege: 0, marches: false },
}

/**
 * Чего лорд хочет, когда не воюет.
 *
 * Мира лорд не сидит без дела, и дело у него по нраву: гордец не отдаст и
 * вершка своей земли, мрачный строит стены, потому что не верит в мир,
 * расчётливый и жадный копят, а весёлый ищет родства. Без этой таблицы все
 * лорды мира в первый же день хотели одного и того же — и замысел был не
 * замыслом, а константой.
 */
export const TEMPER_PEACE: Record<LordTemper, LordWantId> = {
  proud: 'guard',
  shrewd: 'hoard',
  jovial: 'wed',
  grim: 'build',
  pious: 'build',
  greedy: 'hoard',
}

/** И что он строит, когда строит: нрав виден и в стройке. */
export const TEMPER_BUILDS: Record<LordTemper, readonly BuildingId[]> = {
  proud: ['walls', 'market'],
  shrewd: ['market', 'warehouse'],
  jovial: ['tavern', 'bathhouse'],
  grim: ['walls', 'barracks'],
  pious: ['chapel', 'granary'],
  greedy: ['granary', 'warehouse'],
}

/** Чего хочет корона (Ч2). */
export const CROWN_WANTS = ['foe', 'ally', 'marry', 'tribute', 'rest'] as const
export type CrownWantId = (typeof CROWN_WANTS)[number]

export const CROWN_WANT_DEFS: Record<CrownWantId, { readonly label: string }> = {
  foe: { label: 'выбрать врага' },
  ally: { label: 'искать союза' },
  marry: { label: 'женить наследника' },
  tribute: { label: 'сбросить дань' },
  rest: { label: 'держать взятое' },
}

/** Чего добивается орден (Ч4). */
export const ORDER_AIMS = ['house', 'purge', 'relic', 'feud', 'alms'] as const
export type OrderAimId = (typeof ORDER_AIMS)[number]

export const ORDER_AIM_DEFS: Record<
  OrderAimId,
  { readonly label: string; readonly about: string }
> = {
  house: {
    label: 'поставить дом',
    about: 'Хочет свой дом там, где его ещё нет: братьев больше, чем стен.',
  },
  purge: {
    label: 'дознание',
    about: 'Ищет, где завелось чужое учение, и шлёт туда своих.',
  },
  relic: {
    label: 'найти святыню',
    about: 'Говорят, в тех местах лежит то, что братству дороже золота.',
  },
  feud: {
    label: 'сжить соперника',
    about: 'Считает, что в этой земле места на два братства нет.',
  },
  alms: {
    label: 'кормить нищих',
    about: 'Тратит своё на тех, кому нечего есть, — и об этом знают все.',
  },
}

/** Сколько лет орден держится одного замысла: смена целей — раз в колено. */
export const AIM_YEARS = 5

/**
 * Ниже этой памяти купец не торгуется, а уезжает (Ч5).
 *
 * Отказ (−60) — это ещё разговор: он не хочет с тобой дела. Уехал — это конец:
 * его прилавок пуст, и в ряду стоят другие.
 */
export const MERCHANT_LEAVES = -75

/** С какой памяти лорд не просто помнит доброе, а зовёт тебя к себе (Ч5). */
export const LORD_CALLS = 8

/** Сколько дней ходит обоз купца от торга до торга (Ч3). */
export const VENTURE_DAYS = 20

/** Какую долю запаса купец берёт с собой. */
export const VENTURE_SHARE = 0.03

/** И сколько мер самое большое влезает в его обоз. */
export const VENTURE_LOAD = 45
