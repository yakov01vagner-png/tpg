import type { LordTemper } from './castle'

/**
 * Лорды как люди (этап 66) — содержимое.
 *
 * Нрав у лорда был (этап 52), но жил он только в приёмной: решал, примет ли
 * лорд и сколько возьмёт. Здесь нрав выходит в мир — в дела и в слова, — а
 * рядом с лордом появляются те, без кого он не человек: его корона, его партии
 * при дворе, его друзья и соперники, и память о тебе.
 */

/** Что нрав делает в мире (Л1). */
export const TEMPER_DEEDS: Record<
  LordTemper,
  {
    /** Насколько охотнее он идёт войной. */
    readonly warlike: number
    /** Насколько охотнее он разоряет взятое. */
    readonly cruel: number
    /** Насколько крепче он держится короны. */
    readonly loyal: number
    /** Что о нём говорят, когда говорят не при нём. */
    readonly said: string
  }
> = {
  proud: {
    warlike: 1.3,
    cruel: 1,
    loyal: 0.9,
    said: 'Гордец. С таким говорят стоя и коротко.',
  },
  shrewd: {
    warlike: 0.9,
    cruel: 0.8,
    loyal: 1.1,
    said: 'Считает всё, и тебя в том числе. Слово держит, пока оно выгодно.',
  },
  jovial: {
    warlike: 0.8,
    cruel: 0.6,
    loyal: 1,
    said: 'За столом с ним хорошо, а дела с ним — как повезёт.',
  },
  grim: {
    warlike: 1.4,
    cruel: 1.4,
    loyal: 1,
    said: 'Мрачен и скор на расправу. Его земля тиха, и понятно почему.',
  },
  pious: {
    warlike: 0.9,
    cruel: 0.5,
    loyal: 1.2,
    said: 'Молится больше, чем правит. Пощадит и того, кого не стоило.',
  },
  greedy: {
    warlike: 1.1,
    cruel: 1.2,
    loyal: 0.8,
    said: 'Всё считает своим. Подать у него тяжёлая, и это мягко сказано.',
  },
}

/** Как зовётся корона в каждой земле (Л5). */
export const CROWN_TITLES: Readonly<Record<string, string>> = {
  reEstiz: 'король',
  robl: 'святейший владыка',
  boharut: 'султан',
  hlad: 'князь',
  tribes: 'верховный вождь',
  rahim: 'эмир',
  league: 'бургомистр',
  dorHazad: 'подгорный старейшина',
}

/** Нрав самой короны: не нрав лорда, а нрав власти. */
export const CROWN_TEMPERS = ['warlike', 'thrifty', 'pious', 'cunning', 'weak'] as const
export type CrownTemper = (typeof CROWN_TEMPERS)[number]

export const CROWN_TEMPER_DEFS: Record<
  CrownTemper,
  { readonly label: string; readonly about: string; readonly war: number; readonly tax: number }
> = {
  warlike: {
    label: 'воинственный',
    about: 'Держит войско в поле и ищет, куда его девать. Мир при нём — передышка.',
    war: 1.4,
    tax: 1.1,
  },
  thrifty: {
    label: 'расчётливый',
    about: 'Считает казну прежде славы. Воюет редко и с выгодой.',
    war: 0.7,
    tax: 1.2,
  },
  pious: {
    label: 'набожный',
    about: 'Слушает церковь больше, чем советников. Его войны — за веру.',
    war: 1,
    tax: 0.9,
  },
  cunning: {
    label: 'хитрый',
    about: 'Воюет чужими руками и мирится с выгодой. Дань у него всегда в срок.',
    war: 0.9,
    tax: 1.1,
  },
  weak: {
    label: 'слабый',
    about: 'Его вассалы знают, что он слаб, и он знает, что они знают.',
    war: 0.8,
    tax: 0.8,
  },
}

export const CROWN_NAMES: readonly string[] = [
  'Ольгерд',
  'Ираклий',
  'Бертран',
  'Кассим',
  'Вальдемар',
  'Мстислав',
  'Хальдор',
  'Юстин',
  'Теодорик',
  'Селим',
  'Всеволод',
  'Годвин',
  'Джафар',
  'Радомир',
  'Леопольд',
  'Борислав',
]

/**
 * Придворные партии (Л6).
 *
 * При всякой короне их две, и они всегда об одном и том же: воевать или
 * копить, старая кровь или новые люди. Партия просит и партия мстит — потому
 * милость одной стоит немилости другой.
 */
export const FACTIONS = ['hawks', 'doves', 'oldBlood', 'newMen'] as const
export type FactionId = (typeof FACTIONS)[number]

export const FACTION_DEFS: Record<
  FactionId,
  {
    readonly label: string
    readonly about: string
    /** Кто им противен. */
    readonly against: FactionId
    /** Чего они просят у того, кто к ним пришёл. */
    readonly asks: string
  }
> = {
  hawks: {
    label: 'военная партия',
    about: 'Считают, что корона слишком долго терпит. Им нужна война, и желательно завтра.',
    against: 'doves',
    asks: 'Поддержи войну словом при дворе — и мы вспомним об этом.',
  },
  doves: {
    label: 'партия мира',
    about: 'Считают казну и знают, во что обходится поход. Им нужен мир и дороги.',
    against: 'hawks',
    asks: 'Скажи королю то, что он не хочет слышать: воевать не на что.',
  },
  oldBlood: {
    label: 'старая знать',
    about: 'Род их древнее короны, и они не дают об этом забыть.',
    against: 'newMen',
    asks: 'Подтверди старые права — они записаны кровью, а не пером.',
  },
  newMen: {
    label: 'новые люди',
    about: 'Поднялись службой и деньгами. Старую знать считают обузой.',
    against: 'oldBlood',
    asks: 'Помоги нам там, где родовитые не пустят: делом, а не именем.',
  },
}

/** Насколько милость одной партии портит отношения с другой. */
export const FACTION_SPITE = 12
/** Что даёт поддержка партии, когда просишь её о своём. */
export const FACTION_FAVOUR = 15

/**
 * Что лорд помнит о тебе (Л4).
 *
 * Не число, а история: служил, предал, спас, обобрал. Помнится по три дела —
 * ровно столько, сколько человек и правда держит в голове о чужом.
 */
export const LORD_DEEDS = ['served', 'betrayed', 'saved', 'robbed', 'gifted', 'refused'] as const
export type LordDeedId = (typeof LORD_DEEDS)[number]

export const LORD_DEED_DEFS: Record<
  LordDeedId,
  { readonly label: string; readonly recalls: string; readonly weight: number }
> = {
  served: { label: 'служил', recalls: 'Ты служил мне, и служил неплохо.', weight: 8 },
  betrayed: { label: 'предал', recalls: 'Я помню, чем ты мне отплатил.', weight: -25 },
  saved: {
    label: 'спас',
    recalls: 'Ты стоял, когда стоять было некому. Такое не забывают.',
    weight: 25,
  },
  robbed: {
    label: 'обобрал',
    recalls: 'Моё добро у тебя на плечах. Думаешь, я не считал?',
    weight: -18,
  },
  gifted: { label: 'одарил', recalls: 'Твой подарок был к месту. Я это отметил.', weight: 10 },
  refused: {
    label: 'отказал',
    recalls: 'Ты отказал мне, когда я просил. Запомнилось.',
    weight: -10,
  },
}

/** Сколько дел лорд держит в памяти. */
export const MEMORY_DEPTH = 3
