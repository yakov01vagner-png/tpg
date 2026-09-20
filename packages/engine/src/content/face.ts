/**
 * Место, у которого есть лицо (этап 176) — содержимое.
 *
 * Праздников здесь нет нарочно: год людской считается с 0.5 (`content/year.ts`,
 * `fair.ts`), и заводить второй список было бы ложью — в одном месте гуляли бы
 * по одному календарю, в другом по другому.
 *
 * Место считалось честно: жители, запасы, разбой, усталость земли, постройки.
 * Смотреть на него было нечем — строка с числами и название. Здесь лежит то,
 * из чего складывается лицо: занятия, порядки, праздники и люди, с которыми в
 * этом месте говорят.
 */

export const TRADES = ['plough', 'herd', 'net', 'ore', 'forge', 'ware', 'prayer', 'road'] as const
export type TradeId = (typeof TRADES)[number]

export const TRADE_DEFS: Record<TradeId, { readonly label: string; readonly about: string }> = {
  plough: { label: 'пашня', about: 'Живут с поля: год родит — живут, не родит — уходят.' },
  herd: { label: 'скот', about: 'Держат стада: здесь считают головы, а не меры зерна.' },
  net: { label: 'лов', about: 'Кормит вода: сети, соль и запах рыбы на три улицы.' },
  ore: { label: 'руда', about: 'Живут под землёй больше, чем над ней.' },
  forge: { label: 'кузни', about: 'Стучит с рассвета: здесь делают то, чем воюют другие.' },
  ware: { label: 'торг', about: 'Всё, что везут мимо, здесь взвешивают и перепродают.' },
  prayer: { label: 'молитва', about: 'Живут при обители и с обители же кормятся.' },
  road: { label: 'дорога', about: 'Живут с проезжих: постой, корм, перевоз.' },
}

export const CUSTOMS = ['elders', 'charter', 'lord', 'abbot', 'guild', 'clan'] as const
export type CustomId = (typeof CUSTOMS)[number]

export const CUSTOM_DEFS: Record<CustomId, { readonly label: string; readonly about: string }> = {
  elders: { label: 'сход', about: 'Решают миром: кто громче и кто старше.' },
  charter: { label: 'хартия', about: 'Живут по грамоте, и грамоту знают наизусть.' },
  lord: { label: 'воля владетеля', about: 'Как сказал хозяин, так и будет.' },
  abbot: { label: 'слово настоятеля', about: 'Мирское здесь решают после церковного.' },
  guild: { label: 'цех', about: 'Кто не в цеху, тот здесь не работает.' },
  clan: { label: 'род', about: 'Чужому не продадут и своего не выдадут.' },
}

export const LOCALS = ['headman', 'smith', 'priest', 'trader', 'carter'] as const
export type LocalId = (typeof LOCALS)[number]

export const LOCAL_DEFS: Record<
  LocalId,
  { readonly label: string; readonly about: string; readonly needs: string }
> = {
  headman: { label: 'староста', about: 'Знает всех и должен всем.', needs: '' },
  smith: {
    label: 'кузнец',
    about: 'Чинит то, что ломают, и молчит о том, кому ковал.',
    needs: 'smithy',
  },
  priest: {
    label: 'священник',
    about: 'Отпевает, венчает и помнит, кто чего не донёс.',
    needs: 'chapel',
  },
  trader: { label: 'купец', about: 'Знает цены за три перехода отсюда.', needs: 'market' },
  carter: {
    label: 'возчик',
    about: 'Возит всё и рассказывает всё, что видел в дороге.',
    needs: '',
  },
}

export const FACE_NAMES: readonly string[] = [
  'Онисим',
  'Богдан',
  'Некрас',
  'Третьяк',
  'Смирной',
  'Любим',
  'Истома',
  'Меньшик',
  'Порфирий',
  'Агафон',
  'Кондрат',
  'Лука',
  'Ермил',
  'Пров',
  'Аким',
  'Наум',
]

export const FACE = {
  /** Насколько должно просесть место, чтобы это назвали упадком. */
  fallsBy: 0.85,
  /** И насколько вырасти, чтобы ростом. */
  growsBy: 1.15,
  /** С какого разбоя место считается неспокойным. */
  uneasyAt: 0.25,
} as const

export const FACE_WORDS = {
  own: 'Это твоё место: здесь распоряжаешься ты.',
  guest: 'Здесь ты гость: смотреть можно, распоряжаться — нет.',
  grew: 'Место поднялось с тех пор, как его завели.',
  fell: 'Место просело: людей меньше, чем было.',
  uneasy: 'В округе неспокойно, и это видно по заставам у въезда.',
  remembers: 'Тебя здесь помнят.',
  new: 'Тебя здесь видят впервые.',
} as const
