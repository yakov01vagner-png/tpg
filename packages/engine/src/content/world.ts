import type { LocationArchetype, SiteKind, Terrain } from '../world/types'

/**
 * Авторские таблицы мира.
 *
 * Руками пишутся не локации, а виды локаций и материал для имён: шестьдесят
 * поселений невозможно ни написать, ни потом править. Генератор собирает из
 * этого конкретный мир (см. `world/generate.ts`).
 */

export interface RegionBlueprint {
  readonly name: string
  readonly terrain: Terrain
  /** Сколько провинций в области: генератор выберет число из этого отрезка. */
  readonly provinces: readonly [number, number]
}

export interface KingdomBlueprint {
  readonly id: string
  readonly name: string
  readonly flavor: string
  readonly capitalName: string
  readonly regions: readonly RegionBlueprint[]
  /** Местности, которые встречаются в провинциях этого королевства. */
  readonly terrains: readonly Terrain[]
}

export const KINGDOM_BLUEPRINTS: readonly KingdomBlueprint[] = [
  {
    id: 'reEstiz',
    name: 'Королевство Ре-Эстиз',
    flavor: 'Обычное средневековое королевство: король, герцоги, графы и вечные тяжбы между ними.',
    capitalName: 'Ре-Эстиз',
    regions: [
      { name: 'Северная область', terrain: 'forest', provinces: [3, 4] },
      { name: 'Южная область', terrain: 'plains', provinces: [3, 4] },
      { name: 'Западный Край', terrain: 'hills', provinces: [3, 4] },
      { name: 'Заречный Удел', terrain: 'marsh', provinces: [3, 4] },
    ],
    terrains: ['plains', 'forest', 'hills', 'marsh'],
  },
  {
    id: 'robl',
    name: 'Святое королевство Робл',
    flavor:
      'Светская власть и церковная иерархия делят королевство пополам, и обе считают себя главной.',
    capitalName: 'Престол Робла',
    regions: [
      { name: 'Пресвятая область', terrain: 'plains', provinces: [3, 4] },
      { name: 'Западный Предел', terrain: 'coast', provinces: [2, 3] },
      { name: 'Полуденные Земли', terrain: 'hills', provinces: [3, 4] },
      { name: 'Северный Удел', terrain: 'plains', provinces: [3, 4] },
    ],
    terrains: ['plains', 'coast', 'hills'],
  },
  {
    id: 'boharut',
    name: 'Империя Бохарут',
    flavor:
      'Наместники вместо наследной знати: меньше феодальной вольницы, больше бумаг и доносов.',
    capitalName: 'Бохарут',
    regions: [
      { name: 'Внутренние земли', terrain: 'plains', provinces: [3, 4] },
      { name: 'Восточные провинции', terrain: 'steppe', provinces: [3, 4] },
      { name: 'Приморские Владения', terrain: 'coast', provinces: [2, 3] },
      { name: 'Закатные Сатрапии', terrain: 'hills', provinces: [3, 4] },
    ],
    terrains: ['plains', 'steppe', 'hills', 'coast'],
  },
  {
    id: 'durHazad',
    name: 'Подгорное королевство Дор-Хазад',
    flavor: 'Кланы держат чертоги и штольни. Земля здесь мерится не полями, а жилами руды.',
    capitalName: 'Дор-Хазад',
    regions: [
      { name: 'Верхние чертоги', terrain: 'mountains', provinces: [2, 3] },
      { name: 'Нижние штольни', terrain: 'mountains', provinces: [2, 3] },
      { name: 'Внешние Отроги', terrain: 'hills', provinces: [3, 4] },
      { name: 'Глубокие Копи', terrain: 'mountains', provinces: [3, 4] },
    ],
    terrains: ['mountains', 'hills'],
  },
  {
    id: 'tribes',
    name: 'Единые племена',
    flavor: 'Конфедерация вождеств полулюдей. Границы здесь меняются вместе с пастбищами.',
    capitalName: 'Стойбище Совета',
    regions: [
      { name: 'Великая степь', terrain: 'steppe', provinces: [3, 4] },
      { name: 'Дальние кочевья', terrain: 'forest', provinces: [2, 3] },
      { name: 'Речные Кочевья', terrain: 'marsh', provinces: [3, 4] },
      { name: 'Полуденные Кочевья', terrain: 'steppe', provinces: [3, 4] },
    ],
    terrains: ['steppe', 'forest', 'marsh', 'hills'],
  },
  // --- три короны дальних земель (этап 44): не три копии, а три уклада ---------
  {
    id: 'hlad',
    name: 'Княжество Хладь',
    flavor:
      'Север: князь в детинце, бояре по погостам, а кормит всех не поле, а лес и мех. Зима здесь не время года, а половина жизни.',
    capitalName: 'Хладень',
    regions: [
      { name: 'Княжий Погост', terrain: 'forest', provinces: [3, 4] },
      { name: 'Мёрзлые Увалы', terrain: 'hills', provinces: [3, 4] },
      { name: 'Студёное Поморье', terrain: 'coast', provinces: [2, 3] },
      { name: 'Заволочье', terrain: 'mountains', provinces: [3, 4] },
    ],
    terrains: ['forest', 'hills', 'mountains', 'coast'],
  },
  {
    id: 'rahim',
    name: 'Султанат Рахим',
    flavor:
      'Юг: султан в белом городе, эмиры по оазисам, а власть меряется водой — кто держит колодцы, тот держит всё.',
    capitalName: 'Аль-Рахим',
    regions: [
      { name: 'Белогородье', terrain: 'plains', provinces: [3, 4] },
      { name: 'Великие Пески', terrain: 'desert', provinces: [3, 4] },
      { name: 'Караванные Холмы', terrain: 'hills', provinces: [2, 3] },
      { name: 'Полуденный Берег', terrain: 'coast', provinces: [3, 4] },
    ],
    terrains: ['desert', 'steppe', 'hills', 'coast'],
  },
  {
    id: 'league',
    name: 'Лига Вольных Городов',
    flavor:
      'Восточное побережье: не корона, а хартия. Бургомистры судят, гильдии платят, а флот стоит больше, чем войско.',
    capitalName: 'Гавань Хартии',
    regions: [
      { name: 'Города Хартии', terrain: 'coast', provinces: [3, 4] },
      { name: 'Пригородные Поля', terrain: 'plains', provinces: [3, 4] },
      { name: 'Лесная Сторона', terrain: 'forest', provinces: [2, 3] },
      { name: 'Дальний Берег', terrain: 'coast', provinces: [3, 4] },
    ],
    terrains: ['coast', 'plains', 'forest', 'hills'],
  },
]

/** Слово, с которого начинается имя провинции, — по местности. */
export const PROVINCE_PREFIXES: Record<Terrain, readonly string[]> = {
  plains: ['Долина', 'Поля'],
  forest: ['Лес', 'Чаща'],
  hills: ['Холмы', 'Кряж'],
  mountains: ['Отроги', 'Перевал'],
  marsh: ['Топи', 'Гати'],
  coast: ['Побережье', 'Берег'],
  steppe: ['Степь', 'Пустоши'],
  desert: ['Пески', 'Пустошь'],
}

export const PROVINCE_NAMES: readonly string[] = [
  'Эшоран',
  'Беглой Реки',
  'Вороньего Камня',
  'Седой Воды',
  'Трёх Сосен',
  'Горелого Дуба',
  'Тихого Брода',
  'Волчьей Пади',
  'Медного Ручья',
  'Стылой Гати',
  'Чёрного Ельника',
  'Ржавого Лога',
  'Дальнего Ключа',
  'Кривого Яра',
  'Соляной Балки',
  'Гнилого Мыса',
  'Синего Камня',
  'Львиной Гривы',
  'Старого Кургана',
  'Пепельной Гряды',
  'Мёртвой Излучины',
  'Ясеневой Сечи',
  'Полой Горы',
  'Ледяной Заводи',
  'Ковыльной Межи',
  'Змеиного Брода',
  'Разбитых Телег',
  'Последнего Колодца',
  'Тощего Скота',
  'Птичьего Крика',
  'Солёного Ветра',
  'Немой Пустоши',
]

/** Имена обычных поселений: деревень, городков и городов. */
export const SETTLEMENT_NAMES: readonly string[] = [
  'Мшистый Лог',
  'Вересковая',
  'Кривые Сосны',
  'Сухой Брод',
  'Две Мельницы',
  'Тёплый Ключ',
  'Гнилой Мост',
  'Липовка',
  'Заячья',
  'Вороний Скат',
  'Каменный Двор',
  'Тихий Омут',
  'Дубрава',
  'Рыбий Хвост',
  'Соляной Спуск',
  'Кузнечный Стан',
  'Медвежья Падь',
  'Волчий Ров',
  'Белая Гать',
  'Красный Яр',
  'Овражье',
  'Пыльная',
  'Стрелецкая',
  'Горелая Слобода',
  'Ольховка',
  'Птичий Вырез',
  'Серый Камень',
  'Ржаное',
  'Козий Брод',
  'Долгий Плёс',
  'Тележный Стан',
  'Ветряки',
  'Худая Меж',
  'Сорочье',
  'Бычий Рог',
  'Полынное',
  'Колодезное',
  'Тёмный Скат',
  'Журавли',
  'Студёное',
  'Перекатное',
  'Барсучий Лог',
  'Три Кола',
  'Мокрое',
  'Вдовий Хутор',
]

/** У особых мест имена свои: их видно по названию ещё до входа. */
export const ARCHETYPE_NAMES: Partial<Record<LocationArchetype, readonly string[]>> = {
  fortress: [
    'Волчья Застава',
    'Стылая Крепь',
    'Дозорная Скала',
    'Кабанья Стража',
    'Ржавые Ворота',
    'Последний Дозор',
    'Каменный Заслон',
  ],
  mine: [
    'Чёрный Забой',
    'Медная Штольня',
    'Ржавый Разрез',
    'Глубокий Ход',
    'Соляная Яма',
    'Железный Стан',
    'Оловянный Спуск',
  ],
  port: ['Якорный Спуск', 'Рыбья Пристань', 'Солёный Причал', 'Тресковый Берег', 'Мокрый Затон'],
  monastery: ['Обитель Молчания', 'Скит Семи Свечей', 'Обитель Пепла', 'Тихий Скит'],
}

/** Приставки на случай, если имена в пуле закончились. */
export const NAME_QUALIFIERS: readonly Readonly<Record<'m' | 'f' | 'n' | 'p', string>>[] = [
  { m: 'Малый', f: 'Малая', n: 'Малое', p: 'Малые' },
  { m: 'Новый', f: 'Новая', n: 'Новое', p: 'Новые' },
  { m: 'Старый', f: 'Старая', n: 'Старое', p: 'Старые' },
  { m: 'Дальний', f: 'Дальняя', n: 'Дальнее', p: 'Дальние' },
  { m: 'Верхний', f: 'Верхняя', n: 'Верхнее', p: 'Верхние' },
  { m: 'Нижний', f: 'Нижняя', n: 'Нижнее', p: 'Нижние' },
]

/**
 * Род имени по окончанию: «Белая Гать» — она, «Перекатное» — оно, «Ветряки» —
 * они. Приставка согласуется с ним: «Новая Белая Гать», а не «Новый Белая
 * Гать» — на материке (этап 44) пул имён кончается, и приставки видны.
 */
export function nameGender(name: string): 'm' | 'f' | 'n' | 'p' {
  const last = name.trim().split(' ').pop() ?? ''
  if (last.endsWith('а') || last.endsWith('я') || last.endsWith('ь')) return 'f'
  if (last.endsWith('о') || last.endsWith('е') || last.endsWith('ё')) return 'n'
  if (last.endsWith('ы') || last.endsWith('и')) return 'p'
  return 'm'
}

/**
 * Имена рек (версия 0.5).
 *
 * Река — самое старое имя на карте: короны меняются, а реку зовут так же, как
 * звали до них. Поэтому имена не собираются из приставок, как у поселений, а
 * лежат списком: их немного и каждое на своём месте.
 */
export const RIVER_NAMES: readonly string[] = [
  'Студёная',
  'Быстрица',
  'Мутная',
  'Лебедянь',
  'Тихвень',
  'Каменка',
  'Чёрная Вода',
  'Медведица',
  'Смородина',
  'Сухона',
  'Голубица',
  'Волчиха',
  'Пустая',
  'Ольховка',
  'Долгая',
  'Серебрянка',
]

/**
 * Насколько население места превышает то, что кормит его собственная земля.
 *
 * Меньше единицы — место кормит себя с запасом и отдаёт излишек соседям.
 * Больше — живёт привозом: рудник и крепость не кормятся вовсе, город немного
 * недоедает своего. Из этих чисел генератор и считает население, поэтому мир
 * начинается в равновесии, а не в состоянии неизбежного голода.
 *
 * Деревня и городок стоят на своей земле малой долей: их излишек и есть тот
 * хлеб, которым живут короны. Мир от этого заводится на четырёх пятых своей
 * еды и весь век растёт, вместо того чтобы век голодать.
 */
export const IMPORT_RELIANCE: Record<LocationArchetype, readonly [number, number]> = {
  village: [0.28, 0.44],
  town: [0.54, 0.74],
  city: [0.9, 1.05],
  // Столица всегда живёт привозом: своей земли на её людей не хватает.
  capital: [1, 1.15],
  port: [0.8, 1],
  mine: [1.5, 3],
  fortress: [1.2, 2.2],
  monastery: [0.9, 1.6],
}

/**
 * Во сколько раз дольше идти по этой земле.
 *
 * Час пути — это не расстояние, а расстояние по чему-то. По степи идут почти
 * как по тракту, по горам — вдвое дольше, по топи — чуть меньше. Пока часы
 * бросал кубик (`roll.int(3, 7)`), сосед в тридцати пяти единицах карты стоил
 * двадцать девять часов, а место в ста восьмидесяти четырёх — семнадцать.
 */
export const TERRAIN_TRAVEL: Record<Terrain, number> = {
  plains: 1,
  steppe: 1.05,
  coast: 1.15,
  forest: 1.3,
  hills: 1.4,
  marsh: 1.7,
  mountains: 2,
  desert: 1.25,
}

/** Плодородие местности: сколько еды земля способна дать. */
export const TERRAIN_FERTILITY: Record<Terrain, readonly [number, number]> = {
  plains: [0.7, 1],
  forest: [0.35, 0.6],
  hills: [0.3, 0.55],
  mountains: [0.05, 0.2],
  marsh: [0.1, 0.3],
  coast: [0.4, 0.7],
  steppe: [0.3, 0.6],
  desert: [0.05, 0.2],
}

/**
 * Титулы держателей земли по королевствам (DESIGN.md, п.3.3).
 *
 * Структура власти у каждого своя, и это должно быть видно хотя бы в том, как
 * человека называют: у Ре-Эстиза бароны, у Бохарута наместники, у дворфов
 * старейшины кланов.
 */
export const LORD_TITLES: Record<string, readonly string[]> = {
  reEstiz: ['барон', 'граф', 'герцог'],
  robl: ['приор', 'епископ', 'магистр ордена'],
  boharut: ['наместник', 'префект', 'легат'],
  durHazad: ['старейшина клана', 'тан', 'хранитель штолен'],
  tribes: ['вождь', 'старший вождь', 'хранитель кочевий'],
  hlad: ['посадник', 'боярин', 'князь-наместник'],
  rahim: ['бей', 'эмир', 'визирь'],
  league: ['ратман', 'бургомистр', 'гроссмейстер лиги'],
}

/** Имена держателей. Пул общий: имена в этом мире не разделены по границам. */
export const LORD_NAMES: readonly string[] = [
  'Эйгар',
  'Ратмир',
  'Вольдер',
  'Сигвальд',
  'Бранн',
  'Гортен',
  'Айвар',
  'Мадрек',
  'Торвальд',
  'Кейдан',
  'Ульрих',
  'Ведран',
  'Хальден',
  'Ормар',
  'Джерек',
  'Свен',
  'Лютвир',
  'Карн',
  'Асмунд',
  'Реймар',
  'Тибор',
  'Гвидон',
  'Эрлан',
  'Мойрен',
  'Бертран',
  'Хродгар',
  'Ярен',
  'Делвин',
  'Сторн',
  'Игнар',
  'Вельд',
  'Крейн',
]

/**
 * Где на карте лежит каждое королевство.
 *
 * Координаты авторские, а не случайные: горы дворфов должны быть на севере,
 * степи племён — на юго-востоке, а Ре-Эстиз посередине, потому что именно из
 * него игра начинается. Мир условно 1000 на 1000.
 */
/**
 * Пограничье: земля между коронами, которой не держит никто.
 *
 * До 0.3 королевства сшивались дорогой из столицы в столицу — и это был
 * портал: между двумя странами не лежало ничего. Марка — провинция без короны
 * и без лорда: через неё идёт дорога, по ней ходят войска, и её можно взять,
 * потому что отнимать её не у кого.
 */
export interface MarchBlueprint {
  readonly id: string
  /** Имя марки: она же область на карте. */
  readonly name: string
  readonly provinceNames: readonly [string, string]
  /** Между чьими столицами лежит. */
  readonly between: readonly [string, string]
  readonly terrain: Terrain
  /** Единственное вольное село: живёт с проезжих и ничьих податей не платит. */
  readonly freeTown: string
}

export const MARCHES: readonly MarchBlueprint[] = [
  {
    id: 'porubezhye',
    name: 'Порубежье',
    provinceNames: ['Спорное Поле', 'Ничейный Клин'],
    between: ['reEstiz', 'robl'],
    terrain: 'plains',
    freeTown: 'Развилка',
  },
  {
    id: 'wildField',
    name: 'Дикое Поле',
    provinceNames: ['Ковыльная Межа', 'Полынный Шлях'],
    between: ['reEstiz', 'boharut'],
    terrain: 'steppe',
    freeTown: 'Торжок',
  },
  {
    id: 'scree',
    name: 'Предгорная Межа',
    provinceNames: ['Ничья Осыпь', 'Щербатый Кряж'],
    between: ['reEstiz', 'durHazad'],
    terrain: 'hills',
    freeTown: 'Рудный Стан',
  },
  {
    id: 'mire',
    name: 'Гнилая Межа',
    provinceNames: ['Комариная Топь', 'Чёрная Старица'],
    between: ['reEstiz', 'tribes'],
    terrain: 'marsh',
    freeTown: 'Гатище',
  },
  {
    id: 'saltline',
    name: 'Солёная Межа',
    provinceNames: ['Сухая Балка', 'Солончак'],
    between: ['boharut', 'tribes'],
    terrain: 'steppe',
    freeTown: 'Колодезь',
  },
  // --- пограничья дальних земель (этап 44) ---
  {
    id: 'iceline',
    name: 'Ледяная Межа',
    provinceNames: ['Мёрзлый Волок', 'Снежный Кряж'],
    between: ['durHazad', 'hlad'],
    terrain: 'mountains',
    freeTown: 'Волок',
  },
  {
    id: 'noonline',
    name: 'Полуденная Межа',
    provinceNames: ['Сухое Русло', 'Соляные Ворота'],
    between: ['robl', 'rahim'],
    terrain: 'steppe',
    freeTown: 'Перекрёсток',
  },
  {
    id: 'charterline',
    name: 'Гостиная Межа',
    provinceNames: ['Таможенный Луг', 'Пристанище'],
    between: ['boharut', 'league'],
    terrain: 'plains',
    freeTown: 'Мытница',
  },
]

/**
 * Острова (версия 0.5, этап 35).
 *
 * Остров — не украшение берега, а место, до которого нельзя дойти ногами. Он
 * лежит в стороне от материка, дорога до него не доходит никогда, и потому у
 * него своя цена на хлеб, своя власть и свои люди. Короны ему не хозяева: до
 * острова у них те же полдня морем, что и у всех.
 *
 * Стоят острова по углам полотна — там, где кончается земля корон: от
 * ближайшей середины провинции до острова не меньше четырёх сотен единиц, и
 * между ними вода, а не пролив в один шаг.
 */
export interface IslandBlueprint {
  readonly id: string
  /** Имя области: остров — это область без короны, как и марка. */
  readonly name: string
  readonly flavor: string
  readonly provinceName: string
  readonly terrain: Terrain
  readonly at: { readonly x: number; readonly y: number }
  /** Порт стоит первым: с него на остров и попадают. */
  readonly places: readonly { readonly name: string; readonly archetype: LocationArchetype }[]
  readonly sites: readonly SiteKind[]
}

export const ISLANDS: readonly IslandBlueprint[] = [
  {
    id: 'whiteStone',
    name: 'Белый Камень',
    flavor: 'Меловые обрывы, тюлени и десяток родов, которые помнят всех своих утопленников.',
    provinceName: 'Меловой Берег',
    terrain: 'coast',
    at: { x: 340, y: 340 },
    places: [
      { name: 'Гавань Белого Камня', archetype: 'port' },
      { name: 'Тюленья', archetype: 'village' },
    ],
    sites: ['ruins', 'shrine'],
  },
  {
    id: 'windy',
    name: 'Ветреный',
    flavor: 'Голый камень, овцы и ветер, который не стихает и в затишье.',
    provinceName: 'Овечья Коса',
    terrain: 'coast',
    at: { x: 3260, y: 340 },
    places: [
      { name: 'Ветреная Пристань', archetype: 'port' },
      { name: 'Рыбий Хвост', archetype: 'village' },
    ],
    sites: ['shrine', 'outpost'],
  },
  {
    id: 'crooked',
    name: 'Кривой',
    flavor: 'Бухты, в которые заходят не спрашивая позволения, и берег, который об этом молчит.',
    provinceName: 'Смоляная Бухта',
    terrain: 'coast',
    at: { x: 340, y: 3260 },
    places: [
      { name: 'Кривая Гавань', archetype: 'port' },
      { name: 'Смоляная', archetype: 'village' },
    ],
    sites: ['outpost', 'ruins'],
  },
]

/**
 * Короткие имена корон: для карты. Полное имя на общем виде не помещается и
 * уезжает за край полотна, а «Ре-Эстиз» читается с одного взгляда.
 */
export const KINGDOM_SHORT: Readonly<Record<string, string>> = {
  reEstiz: 'Ре-Эстиз',
  robl: 'Робл',
  boharut: 'Бохарут',
  durHazad: 'Дор-Хазад',
  tribes: 'Племена',
  hlad: 'Хладь',
  rahim: 'Рахим',
  league: 'Лига',
}

/**
 * Хребет материка (этап 44).
 *
 * Суша — не сумма кругов вокруг корон: между двумя соседними коронами лежит
 * земля, пусть и ничья, и море не заходит в неё языком. Хребет — это пары
 * корон, между которыми материк сплошной; всё, что дальше от него и от мест,
 * чем предел суши, — вода. Пары марок сюда входят сами собой: марка и есть
 * земля между. Остальные — соседи без марки: между Роблом и гномами, между
 * Бохарутом и Хладью, между племенами и Лигой земля есть, а спорной полосы
 * нет.
 */
export const CONTINENT: readonly (readonly [string, string])[] = [
  ['reEstiz', 'robl'],
  ['reEstiz', 'boharut'],
  ['reEstiz', 'durHazad'],
  ['reEstiz', 'tribes'],
  ['boharut', 'tribes'],
  ['durHazad', 'hlad'],
  ['robl', 'rahim'],
  ['boharut', 'league'],
  ['robl', 'durHazad'],
  ['boharut', 'hlad'],
  ['tribes', 'league'],
  ['tribes', 'rahim'],
]

export const KINGDOM_CENTERS: Record<string, { readonly x: number; readonly y: number }> = {
  // Пять корон середины стоят там же, где стояли, — в полтора раза дальше друг
  // от друга: полотно выросло до материка (этап 44), а не сжалось.
  reEstiz: { x: 1575, y: 1575 },
  robl: { x: 610, y: 1395 },
  boharut: { x: 2540, y: 1395 },
  durHazad: { x: 1395, y: 560 },
  tribes: { x: 2210, y: 2500 },
  // Три короны дальних земель: север, юг и восточный берег.
  hlad: { x: 2350, y: 480 },
  rahim: { x: 900, y: 2700 },
  league: { x: 3110, y: 2180 },
}
