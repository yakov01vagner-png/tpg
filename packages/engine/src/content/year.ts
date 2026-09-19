/**
 * Год человеческий: праздники корон (этап 39).
 *
 * Хлебный год у всех один — его считает земля. А вот год людской у каждой короны
 * свой: в Ре-Эстизе жнивной пир, в Робле пост и крестный ход, у племён — конский
 * праздник в начале кочевья. Праздник не украшение: в этот день не работают, и
 * тот, кто пришёл нанимать людей или садиться за работу, услышит, что сегодня не
 * до того.
 *
 * День назначен числом года (1..365), а не месяцем с числом: так его видно в
 * одном месте и не нужно пересчитывать календарь.
 */
export interface Feast {
  readonly kingdomId: string
  readonly name: string
  /** День года, на который он приходится. */
  readonly day: number
  /** Сколько дней гуляют. */
  readonly days: number
  readonly flavor: string
}

export const FEASTS: readonly Feast[] = [
  {
    kingdomId: 'reEstiz',
    name: 'Красная горка',
    day: 24,
    days: 2,
    flavor: 'Первый настоящий тёплый день: свадьбы, хороводы и драки на кулаках.',
  },
  {
    kingdomId: 'reEstiz',
    name: 'Жнивный пир',
    day: 196,
    days: 3,
    flavor: 'Сжали — гуляют. Столы выносят на улицу, и король в этот день никому не король.',
  },
  {
    kingdomId: 'robl',
    name: 'Седмица Покаяния',
    day: 66,
    days: 7,
    flavor: 'Ни мяса, ни вина, ни работы: неделя, которую церковь отняла у поля.',
  },
  {
    kingdomId: 'robl',
    name: 'Вынос Светоча',
    day: 214,
    days: 2,
    flavor: 'Крестный ход через весь город. Кто не вышел — тот заметен.',
  },
  {
    kingdomId: 'boharut',
    name: 'День Наместников',
    day: 140,
    days: 2,
    flavor: 'Смотр, парад и оглашение указов. Из тех праздников, на которых стоят навытяжку.',
  },
  {
    kingdomId: 'durHazad',
    name: 'Ночь Первой Жилы',
    day: 305,
    days: 3,
    flavor: 'В самый тёмный месяц в чертогах жгут огни и поминают тех, кто копал первым.',
  },
  {
    kingdomId: 'hlad',
    name: 'Ночь Долгого Огня',
    day: 322,
    days: 3,
    flavor: 'Самая длинная ночь года: жгут костры до утра и не ложатся, чтобы солнце вернулось.',
  },
  {
    kingdomId: 'rahim',
    name: 'Праздник Первой Воды',
    day: 52,
    days: 2,
    flavor:
      'Открывают колодцы после сухого сезона. Эмиры пьют первыми, и все смотрят, кто после кого.',
  },
  {
    kingdomId: 'league',
    name: 'День Хартии',
    day: 150,
    days: 2,
    flavor:
      'Читают хартию с ратушного крыльца, и каждый бургомистр клянётся заново. Пьют за счёт гильдий.',
  },
  {
    kingdomId: 'tribes',
    name: 'Конский праздник',
    day: 40,
    days: 3,
    flavor: 'Табуны выгоняют на новую траву. Скачки, мена невест и разговор старших.',
  },
]

/**
 * Имена ярмарок.
 *
 * Ярмарка называется по месту и по времени: «осенняя в Бохаруте». Список нужен
 * затем, чтобы у крупных торгов было своё имя, а не «ярмарка №3».
 */
export const FAIR_NAMES: readonly string[] = [
  'Большой торг',
  'Хлебная ярмарка',
  'Конная ярмарка',
  'Соляной торг',
  'Меховая ярмарка',
  'Рыбный торг',
  'Оружейная ярмарка',
  'Гостиный торг',
]

/**
 * Погода дня (этап 67, Я4).
 *
 * Не время года, а день: дождь, туман, жара, мороз. Время года решает, какая
 * погода вероятна, а день — какая выпала. Меняет дорогу, охоту и бой.
 */
export const SKIES = ['clear', 'rain', 'fog', 'heat', 'frost', 'storm'] as const
export type Sky = (typeof SKIES)[number]

export interface SkyDef {
  readonly id: Sky
  readonly label: string
  readonly about: string
  /** Во сколько раз дольше идти. */
  readonly road: number
  /** Что делает со стрельбой: видно цель или нет. */
  readonly sight: number
  /** Насколько тяжелее день: прибавка к усталости за переход. */
  readonly toll: number
}

export const SKY_DEFS: Record<Sky, SkyDef> = {
  clear: {
    id: 'clear',
    label: 'ясно',
    about: 'Погода, о которой не говорят: просто день.',
    road: 1,
    sight: 1,
    toll: 0,
  },
  rain: {
    id: 'rain',
    label: 'дождь',
    about: 'Дорога раскисла, тетива мокнет, костёр не горит.',
    road: 1.25,
    sight: 0.85,
    toll: 6,
  },
  fog: {
    id: 'fog',
    label: 'туман',
    about: 'Дальше трёх шагов — молоко. Стрелять некуда, а выйти можно куда угодно.',
    road: 1.3,
    sight: 0.5,
    toll: 4,
  },
  heat: {
    id: 'heat',
    label: 'зной',
    about: 'Воздух дрожит, вода кончается быстрее, чем дорога.',
    road: 1.15,
    sight: 1,
    toll: 10,
  },
  frost: {
    id: 'frost',
    label: 'мороз',
    about: 'Снег скрипит, железо липнет к рукам, ночевать под небом — испытание.',
    road: 1.2,
    sight: 1,
    toll: 12,
  },
  storm: {
    id: 'storm',
    label: 'буран',
    about: 'Идти нельзя, стоять холодно. Пережидают, у кого есть где.',
    road: 1.6,
    sight: 0.6,
    toll: 18,
  },
}

/** Какая погода вероятна в это время года: доли из ста. */
export const SKY_ODDS: Record<string, Readonly<Record<Sky, number>>> = {
  spring: { clear: 45, rain: 30, fog: 15, heat: 0, frost: 7, storm: 3 },
  summer: { clear: 55, rain: 22, fog: 6, heat: 15, frost: 0, storm: 2 },
  autumn: { clear: 38, rain: 32, fog: 20, heat: 0, frost: 7, storm: 3 },
  winter: { clear: 40, rain: 5, fog: 10, heat: 0, frost: 35, storm: 10 },
}

/**
 * Ярмарочный люд (этап 67, Я3).
 *
 * Ярмарка — не прибавка к торгу, а люди: заезжие купцы, скоморохи, вербовщики
 * и воры. Каждый делает своё, и каждого видно только в ярмарочные дни.
 */
export const FAIR_FOLK = ['merchant', 'jester', 'recruiter', 'thief'] as const
export type FairFolk = (typeof FAIR_FOLK)[number]

export const FAIR_FOLK_DEFS: Record<FairFolk, { readonly label: string; readonly about: string }> =
  {
    merchant: {
      label: 'заезжий купец',
      about: 'Привёз то, чего здесь не видали, и торгуется как у себя дома.',
    },
    jester: {
      label: 'скоморохи',
      about: 'Дудки, медведь и непристойная песня про соседнего барона. Отряд веселеет.',
    },
    recruiter: {
      label: 'вербовщик',
      about: 'Стоит с бочонком и берёт всех. У него дешевле, чем в казарме.',
    },
    thief: {
      label: 'воры',
      about: 'В толпе всегда работают. Кошелёк держи, а лучше не бери с собой.',
    },
  }

/** Насколько скоморохи поднимают дух отряда. */
export const JESTER_MORALE = 10
/** Во сколько раз вербовщик дешевле казармы. */
export const RECRUITER_PRICE = 0.7
/** Какую долю кошелька берут воры в толпе. */
export const THIEF_SHARE = 0.08

/**
 * Годовщины (этап 67, Я5).
 *
 * Год со свадьбы, год со смерти, день рождения. Их помнят — и они что-то дают:
 * не прибавку к числу, а повод.
 */
export const ANNIVERSARIES = ['birthday', 'wedding', 'mourning', 'realm'] as const
export type AnniversaryId = (typeof ANNIVERSARIES)[number]

export const ANNIVERSARY_DEFS: Record<
  AnniversaryId,
  { readonly label: string; readonly says: string }
> = {
  birthday: {
    label: 'день рождения',
    says: 'Тебе сегодня на год больше. Спутники об этом как-то узнали.',
  },
  wedding: {
    label: 'годовщина свадьбы',
    says: 'Год с того дня. Дома это помнят лучше, чем ты.',
  },
  mourning: {
    label: 'поминальный день',
    says: 'Год, как его не стало. В такие дни пьют молча.',
  },
  realm: {
    label: 'годовщина своего имени',
    says: 'Год, как твоё имя на карте. Кто-то ещё помнит, каким оно было первым днём.',
  },
}
