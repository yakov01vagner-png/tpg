/**
 * Путь как состояние мира (этап 130) — содержимое.
 *
 * С этапа 70 у героя есть личная цель с вехами: она называет, ради чего он
 * живёт, и отмечается галочками. Путь — другое. Он называет, чем кончится мир,
 * если ты дойдёшь, и потому измеряется не тем, что игрок сделал, а тем, в каком
 * состоянии мир оказался. Отсюда правило всей версии: никаких новых величин —
 * пути считаются по землям, присягам, поколениям, деньгам, рангам и признанию,
 * которые в состоянии уже есть.
 */

/** Пять путей, у каждого свой конец. */
export const WAYS = ['crown', 'house', 'trade', 'might', 'faith'] as const
export type WayId = (typeof WAYS)[number]

/** Чем меряется веха пути. Всё это считается из состояния и для любой стороны. */
export const WAY_MEASURES = [
  'recognised',
  'places',
  'crowned',
  'realm',
  'vassals',
  'generations',
  'heir',
  'kin',
  'purse',
  'ventures',
  'debtors',
  'magicRank',
  'magicSkill',
  'artifacts',
  'piety',
  'churchCalm',
  'crusade',
] as const
export type WayMeasure = (typeof WAY_MEASURES)[number]

export interface WayStep {
  readonly id: string
  readonly measure: WayMeasure
  readonly need: number
  /** Как веха называется в списке. */
  readonly label: string
  /** Чем она берётся — словами, а не подсказкой. */
  readonly about: string
}

export interface WayDef {
  readonly id: WayId
  readonly label: string
  readonly about: string
  /** Как называется конец, если дойти. */
  readonly ends: string
  /** Чем этот путь платится. */
  readonly costs: string
  /** Могут ли идти этим путём короны. */
  readonly forCrowns: boolean
  /** Вехи по порядку: последняя — и есть конец. */
  readonly steps: readonly WayStep[]
}

export const WAY_DEFS: Record<WayId, WayDef> = {
  crown: {
    id: 'crown',
    label: 'путь короны',
    about: 'Не «взять сорок мест», а не оставить короны, которая тебя не признала.',
    ends: 'Единая держава',
    costs: 'войнами: каждый следующий признавший дороже предыдущего',
    forCrowns: true,
    steps: [
      {
        id: 'realm',
        measure: 'realm',
        need: 1,
        label: 'своё имя на карте',
        about: 'Держава объявлена: без имени тебя не с чем признавать.',
      },
      {
        id: 'places',
        measure: 'places',
        need: 12,
        label: 'двенадцать мест под рукой',
        about: 'Земля берётся мечом, браком, судом и серебром.',
      },
      {
        id: 'crowned',
        measure: 'crowned',
        need: 1,
        label: 'венчан',
        about: 'Коронация — то, после чего с тобой говорят иначе.',
      },
      {
        id: 'vassals',
        measure: 'vassals',
        need: 4,
        label: 'четверо своих владетелей',
        about: 'Держава стоит на присяге, а не на числе мест.',
      },
      {
        id: 'recognised',
        measure: 'recognised',
        need: 8,
        label: 'все короны признали',
        about: 'Последние трое держатся крепче первых пяти: их берут не силой.',
      },
    ],
  },
  house: {
    id: 'house',
    label: 'путь дома',
    about: 'Провести род через три смерти, ничего не потеряв.',
    ends: 'Дом, который стоит',
    costs: 'осторожностью: дому дорого всё, чем рискуют другие',
    forCrowns: true,
    steps: [
      {
        id: 'realm',
        measure: 'realm',
        need: 1,
        label: 'есть что передать',
        about: 'Дом без державы — фамилия, а не дом.',
      },
      {
        id: 'heir',
        measure: 'heir',
        need: 1,
        label: 'наследник',
        about: 'Тот, кому останется имя.',
      },
      {
        id: 'kin',
        measure: 'kin',
        need: 2,
        label: 'два родства с коронами',
        about: 'Дом держится тем, с кем он в родстве.',
      },
      {
        id: 'generations',
        measure: 'generations',
        need: 3,
        label: 'три колена',
        about: 'Три смерти, после которых имя на месте.',
      },
    ],
  },
  trade: {
    id: 'trade',
    label: 'путь торга',
    about: 'Дойти до того, что без твоего серебра мир начинает считаться с тобой.',
    ends: 'Дом, который кормит королевства',
    costs: 'годами: серебро копится медленнее, чем берутся города',
    forCrowns: true,
    steps: [
      {
        id: 'ventures',
        measure: 'ventures',
        need: 4,
        label: 'четыре своих дела',
        about: 'Обозы, мастерские, суда и двор: доход, который идёт сам.',
      },
      {
        id: 'purse',
        measure: 'purse',
        need: 120000,
        label: 'сто двадцать тысяч в казне',
        about: 'Столько, чтобы нанять войну, а не участвовать в ней.',
      },
      {
        id: 'places',
        measure: 'places',
        need: 6,
        label: 'шесть мест под рукой',
        about: 'Торг стоит на своих городах, а не на чужих рынках.',
      },
      {
        id: 'debtors',
        measure: 'debtors',
        need: 2,
        label: 'две короны в долгу',
        about: 'Долг короны — то, чем с ней говорят без войска.',
      },
    ],
  },
  might: {
    id: 'might',
    label: 'путь силы',
    about: 'Дойти до ранга, с которым корона считается как с короной.',
    ends: 'Тот, кого боятся короны',
    costs: 'жизнью: ранг берут годами, книгами и тем, что перестаёшь быть только человеком',
    forCrowns: false,
    steps: [
      {
        id: 'magicSkill',
        measure: 'magicSkill',
        need: 70,
        label: 'магия семидесятой ступени',
        about: 'Умение, дальше которого по книгам не уходят.',
      },
      {
        id: 'magicRank',
        measure: 'magicRank',
        need: 5,
        label: 'ступень архимага',
        about: 'Ранг присваивают люди, а не уровень.',
      },
      {
        id: 'artifacts',
        measure: 'artifacts',
        need: 3,
        label: 'три вещи с чарами',
        about: 'То, что делает силу видимой другим.',
      },
      {
        id: 'realm',
        measure: 'realm',
        need: 1,
        label: 'своя земля под рукой',
        about: 'Архимага без земли зовут, а не боятся.',
      },
    ],
  },
  faith: {
    id: 'faith',
    label: 'путь веры',
    about: 'Стать тем, кого церковь называет своим государем.',
    ends: 'Государь по воле церкви',
    costs: 'свободой: признанному церковью нельзя то, что можно прочим',
    forCrowns: true,
    steps: [
      {
        id: 'piety',
        measure: 'piety',
        need: 60,
        label: 'благочестие',
        about: 'Обряды, дары и паломничество — то, что видно церкви.',
      },
      {
        id: 'churchCalm',
        measure: 'churchCalm',
        need: 1,
        label: 'церковь не в гневе',
        about: 'Ни интердикта, ни кары: с гневной церковью пути нет.',
      },
      {
        id: 'crusade',
        measure: 'crusade',
        need: 1,
        label: 'поход по её слову',
        about: 'Один поход, объявленный не тобой, а ею.',
      },
      {
        id: 'places',
        measure: 'places',
        need: 8,
        label: 'восемь мест под рукой',
        about: 'Церкви нужен государь, а не богомолец.',
      },
    ],
  },
}

export const WAY = {
  /** Насколько дороже каждый следующий шаг у конца пути. */
  lastStepsHarder: 1.35,
  /** Со скольких шагов путь считается начатым. */
  startedAt: 1,
  /** Раз во сколько суток пересчитываются пути всех сторон. */
  beat: 10,
  /** Насколько два пути разом мешают друг другу. */
  bothSlower: 0.7,
} as const

export const WAY_WORDS = {
  none: 'Пути ты не объявлял: живёшь, а не идёшь.',
  started: 'Путь начат.',
  left: 'Осталось:',
  done: 'Путь пройден.',
  costs: 'Платится это так:',
  both: 'Два пути разом идут медленнее каждого: часть дел годится только для одного.',
  worldState: 'Путь — это состояние мира, а не список твоих дел.',
} as const
