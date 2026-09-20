/**
 * Хозяйство, которое видно (этап 177) — содержимое.
 *
 * Хозяйство считается с 0.1 и считается честно: подать, пошлины, запасы, голод.
 * Видно его плохо — в казну капает число, и почему оно такое, не сказано
 * нигде. Здесь лежит год земли и слова, которыми хозяйство объясняется.
 */

export const FIELD_WORK = [
  'sowing',
  'growing',
  'haymaking',
  'reaping',
  'threshing',
  'rest',
] as const
export type FieldWork = (typeof FIELD_WORK)[number]

export const FIELD_WORK_DEFS: Record<
  FieldWork,
  { readonly label: string; readonly about: string; readonly from: number; readonly to: number }
> = {
  sowing: {
    label: 'сев',
    about: 'В поле выходят все: что посеяно сейчас, тем и будут жить весь год.',
    from: 60,
    to: 110,
  },
  growing: {
    label: 'рост',
    about: 'Работы мало, тревоги много: всё решает небо.',
    from: 111,
    to: 165,
  },
  haymaking: {
    label: 'покос',
    about: 'Косят с ночи: сена не накосишь — зимой резать скотину.',
    from: 166,
    to: 200,
  },
  reaping: {
    label: 'жатва',
    about: 'Самая дорогая неделя года: здесь теряют урожай те, кто воюет.',
    from: 201,
    to: 250,
  },
  threshing: {
    label: 'молотьба',
    about: 'Считают то, что сжали, и только теперь видно, каким был год.',
    from: 251,
    to: 300,
  },
  rest: {
    label: 'зимний покой',
    about: 'Едят запасённое, чинят сбрую и считают дни до сева.',
    from: 301,
    to: 59,
  },
}

export const TILLAGE = {
  /** На сколько суток хлеба считается запасом, ниже которого место голодает. */
  hungryDays: 20,
  /** И выше которого у него излишек. */
  surplusDays: 120,
  /** Насколько сев в войну хуже мирного. */
  warSowing: 0.75,
  /** И жатва. */
  warReaping: 0.6,
  /** Сколько серебра стоит поднять место постройкой: с чего считается нужда. */
  needsWalls: 0.3,
  needsGranary: 30,
  needsMarket: 800,
  needsChapel: 0.2,
} as const

export const TILLAGE_WORDS = {
  hungry: 'Здесь едят запас: до нового хлеба не дотянут.',
  surplus: 'Здесь хлеб лишний: его везут туда, где его нет.',
  war: 'Война пришлась на страду: не сжали и половины.',
  even: 'Год ровный: ни голода, ни излишка.',
  cut: 'Срезать можно вот что',
  why: 'Откуда это число',
} as const
