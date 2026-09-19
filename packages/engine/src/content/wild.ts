import type { Climate } from '../world/climate'
import type { SiteKind, Terrain } from '../world/types'
import type { GoodId } from './goods'

/**
 * Глушь изнутри (этап 63) — содержимое.
 *
 * До 0.6 место без жителей было расстоянием с одной находкой: осмотрелся —
 * взял — больше сюда незачем. Здесь в глуши кто-то живёт: логово, схрон,
 * отшельник, — и через год всё иначе. Плюс охота, стоянка и следы на дороге.
 */

/** Кто в этой глуши (Ш1). */
export const DENIZENS = ['none', 'lair', 'cache', 'hermit'] as const
export type Denizen = (typeof DENIZENS)[number]

export const DENIZEN_DEFS: Record<Denizen, { readonly label: string; readonly about: string }> = {
  none: { label: 'пусто', about: 'Ни следа, ни дыма. Только ветер и то, что было здесь до людей.' },
  lair: {
    label: 'логово',
    about: 'Кости у входа обглоданы начисто. Кто-то живёт здесь и считает эту землю своей.',
  },
  cache: {
    label: 'схрон',
    about:
      'Свежая земля под камнем и веревка, затянутая не по-крестьянски. Тут кто-то что-то прячет.',
  },
  hermit: {
    label: 'отшельник',
    about: 'Дым без деревни. Кто-то живёт один — и, значит, знает эту землю лучше всех.',
  },
}

/** Сколько суток держится одно и то же состояние глуши. */
export const WILD_ERA = 240
/** Через сколько суток выведенное логово заводится снова. */
export const LAIR_RETURNS = 480
/** Через сколько суток схрон наполняют заново. */
export const CACHE_RETURNS = 360
/** Через сколько суток на пустое место приходит новый отшельник. */
export const HERMIT_RETURNS = 720

/** Что лежит в схроне: разбойничья доля. */
export const CACHE_MONEY = [60, 240] as const
export const CACHE_GOODS: readonly GoodId[] = ['weapons', 'cloth', 'wine', 'silver']

/** Сила зверя в логове: по земле, а не по случаю. */
export const LAIR_STRENGTH: Partial<Record<Terrain, number>> = {
  forest: 10,
  mountains: 14,
  marsh: 9,
  hills: 8,
  plains: 6,
  steppe: 7,
  desert: 8,
  coast: 6,
}

/** Что отшельник даёт тому, кто до него дошёл. */
export const HERMIT_GIFTS = ['healing', 'lore', 'road', 'blessing'] as const
export type HermitGift = (typeof HERMIT_GIFTS)[number]

export const HERMIT_GIFT_DEFS: Record<
  HermitGift,
  { readonly label: string; readonly says: string }
> = {
  healing: {
    label: 'травы',
    says: 'Сядь. Рану твою я видел трижды и трижды залечивал — своей и чужую.',
  },
  lore: {
    label: 'знание',
    says: 'Мир велик, а я в нём сидел долго. Слушай, если пришёл слушать.',
  },
  road: {
    label: 'тропа',
    says: 'Есть путь короче того, по которому ты шёл. Он не на картах, и правильно.',
  },
  blessing: {
    label: 'слово',
    says: 'Я никого не благословляю. Но тебе скажу: иди и не оглядывайся.',
  },
}

export const HERMIT_NAMES: readonly string[] = [
  'Пахомий',
  'Варлаам',
  'Сысой',
  'Агафон',
  'Кирилл',
  'Нил',
  'Феодул',
  'Зотик',
]

/**
 * Охота (Ш2).
 *
 * Лес, степь и горы кормят по-разному, и зима кормит хуже лета. Охота — дело со
 * временем, добычей и риском: зверь, который кормит, бывает и тем, кто калечит.
 */
export const HUNT_HOURS = 5
export const HUNT_FATIGUE = 20

export interface HuntDef {
  /** Насколько здесь вообще есть на кого охотиться. */
  readonly game: number
  /** Что приносят с охоты в этой земле. */
  readonly spoils: readonly GoodId[]
  readonly about: string
}

export const HUNTS: Partial<Record<Terrain, HuntDef>> = {
  forest: {
    game: 1,
    spoils: ['fish', 'furs', 'leather', 'honey'],
    about: 'Лес кормит того, кто умеет ждать: тетерев, кабан, лось у водопоя.',
  },
  hills: {
    game: 0.8,
    spoils: ['fish', 'leather', 'herbs'],
    about: 'По склонам ходят козы, а над ними — те, кто ходит за козами.',
  },
  mountains: {
    game: 0.6,
    spoils: ['furs', 'leather', 'herbs'],
    about: 'Здесь мало живого и много камня. Зато шкура горного зверя дорога.',
  },
  marsh: {
    game: 0.7,
    spoils: ['fish', 'herbs', 'leather'],
    about: 'Птица и рыба, и под каждым шагом вода. Дичи много, хода нет.',
  },
  plains: {
    game: 0.7,
    spoils: ['fish', 'leather', 'honey'],
    about: 'Заяц, дрофа, кабан на межах. Охота простая и небогатая.',
  },
  steppe: {
    game: 0.9,
    spoils: ['leather', 'furs', 'honey'],
    about: 'Сайгак и сурок, и видно на три версты. Здесь охотятся верхом.',
  },
  desert: {
    game: 0.4,
    spoils: ['leather', 'herbs'],
    about: 'Днём здесь нет никого. Охотятся в сумерках и недолго.',
  },
  coast: {
    game: 0.8,
    spoils: ['fish', 'leather', 'salt'],
    about: 'Птичьи базары, тюлень на камнях и то, что выносит прибой.',
  },
}

/** Что делает с охотой время года. */
export const HUNT_SEASON: Record<string, number> = {
  spring: 0.9,
  summer: 1.1,
  autumn: 1.2,
  winter: 0.6,
}

/** Что делает с охотой климат (Ш6). */
export const HUNT_CLIMATE: Record<Climate, number> = { cold: 0.85, temperate: 1, dry: 0.8 }

/** Насколько вероятно, что зверь ответит. */
export const HUNT_HURT = 0.12

/**
 * Стоянка (Ш3).
 *
 * Ночь в поле не одинакова: можно спать, можно выставить дозор, можно сидеть у
 * огня и говорить. Спящий отдыхает лучше всех и просыпается не всегда.
 */
export const CAMP_MANNERS = ['sleep', 'watch', 'talk'] as const
export type CampManner = (typeof CAMP_MANNERS)[number]

export const CAMP_MANNER_DEFS: Record<
  CampManner,
  {
    readonly label: string
    readonly about: string
    /** Во сколько раз лучше или хуже отдыхается. */
    readonly rest: number
    /** Во сколько раз вероятнее засада. */
    readonly risk: number
  }
> = {
  sleep: {
    label: 'спать',
    about: 'Свалиться и не вставать до света. Отдых полный, а кто вышел к огню — узнаешь утром.',
    rest: 1,
    risk: 1,
  },
  watch: {
    label: 'выставить дозор',
    about: 'Очередь у огня всю ночь. Спят вполглаза, зато к спящим не подходят.',
    rest: 0.6,
    risk: 0.25,
  },
  talk: {
    label: 'сидеть у огня',
    about: 'Разговоры, каких днём не бывает. Отдыха меньше, а идти вместе — легче.',
    rest: 0.75,
    risk: 0.8,
  },
}

/** Что даёт ночь разговоров у костра. */
export const FIRE_MORALE = 8
export const FIRE_BOND = 4

/**
 * Следы (Ш5).
 *
 * По дороге видно, кто прошёл: войско оставляет колею и кострища, обоз —
 * колею и навоз, беглецы — брошенное. Читает следы выживание, и чем оно
 * выше, тем дальше видно.
 */
export const TRACK_KINDS = ['host', 'wagons', 'refugees', 'beast', 'none'] as const
export type TrackKind = (typeof TRACK_KINDS)[number]

export const TRACK_DEFS: Record<TrackKind, { readonly label: string; readonly about: string }> = {
  host: {
    label: 'войско',
    about: 'Трава выбита в две сажени шириной, кострища в ряд. Прошли не купцы.',
  },
  wagons: {
    label: 'обоз',
    about: 'Колея глубокая, навоз свежий, у обочины — выброшенная рогожа.',
  },
  refugees: {
    label: 'беглецы',
    about: 'Босые следы, брошенный узел, детский башмак. Шли не туда, где хорошо.',
  },
  beast: {
    label: 'зверь',
    about: 'Крупный след поперёк дороги, и в нём стоит вода. Прошёл недавно.',
  },
  none: { label: 'ничего', about: 'Дорога пустая, следы старые, дождь их сгладил.' },
}

export const TRACK_HOURS = 2
/** С какого выживания следы читаются вообще. */
export const TRACK_SKILL = 4
