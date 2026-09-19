/**
 * Вера — данные, а не код (этап 51).
 *
 * До 0.6 храм был видом места, а праздник — днём, когда не работают. Здесь
 * лежит то, что у веры авторского: обряды, сан, слова священника и то, чем
 * отзывается праздник. Кто служит в этом храме, решает мир (`temple.ts`).
 */

/** Обряд: что делают в храме и чего это стоит. */
export interface RiteDef {
  readonly id: string
  readonly label: string
  readonly description: string
  /** Сколько просят на храм. */
  readonly offering: number
  readonly minutes: number
  /** Сколько прибавляет благочестия. */
  readonly piety: number
  /** Нужен ли сан выше приходского: молебен служат везде, венчают не везде. */
  readonly needsBishop?: boolean
  /**
   * Что обряд даёт кроме благочестия (этап 73, Б6).
   *
   * До двенадцати обрядов это были три ветки `if` в команде: исповедь добавляла
   * месту доброе слово, отпевание — духу отряду. На двенадцати обрядах ветки
   * стали таблицей: обряд — данные, а команда их читает (правило 6).
   */
  readonly gives?: {
    /** Духу отряда. */
    readonly morale?: number
    /** Доброго слова в месте. */
    readonly place?: number
    /** Славы. */
    readonly renown?: number
  }
}

export const RITES: readonly RiteDef[] = [
  {
    id: 'prayer',
    label: 'Молебен',
    description: 'Свечи, слова и полчаса тишины. За себя, за дорогу, за тех, кто не вернулся.',
    offering: 5,
    minutes: 40,
    piety: 3,
  },
  {
    id: 'confession',
    label: 'Исповедь',
    description: 'Сказать вслух то, что тянет вниз. Священник выслушает и назовёт цену.',
    offering: 12,
    minutes: 60,
    piety: 8,
    gives: { place: 4 },
  },
  {
    id: 'funeral',
    label: 'Отпевание',
    description: 'По тем, кто остался в поле. Отряд стоит молча — и наутро идёт ровнее.',
    offering: 25,
    minutes: 90,
    piety: 6,
    gives: { morale: 8 },
  },
  {
    id: 'blessing',
    label: 'Благословение в путь',
    description: 'Владыка кладёт руку на голову. Люди видят, кого благословили, и это помнят.',
    offering: 60,
    minutes: 60,
    piety: 12,
    needsBishop: true,
    gives: { place: 8, renown: 1 },
  },
  // Ещё восемь обрядов (этап 73, Б6): храм должен уметь больше, чем молебен и
  // исповедь, — иначе вера в игре кончается на второй день.
  {
    id: 'naming',
    label: 'Крещение',
    description: 'Имя новорождённому при свидетелях. В малом месте на это сходятся все.',
    offering: 10,
    minutes: 90,
    piety: 6,
    gives: { place: 3 },
  },
  {
    id: 'blessingArms',
    label: 'Освящение оружия',
    description: 'Клинки кладут на камень, и священник говорит над ними. Люди идут в бой веселее.',
    offering: 18,
    minutes: 60,
    piety: 5,
    gives: { morale: 6 },
  },
  {
    id: 'vigil',
    label: 'Ночное бдение',
    description: 'Ночь на ногах, со свечой и без слов. Наутро голова пустая и тихая.',
    offering: 6,
    minutes: 480,
    piety: 12,
  },
  {
    id: 'penance',
    label: 'Епитимья',
    description: 'Не деньгами, а делом: поклоны, пост и работа при храме. Дорого не платой.',
    offering: 0,
    minutes: 600,
    piety: 16,
  },
  {
    id: 'oath',
    label: 'Присяга на святыне',
    description: 'Слово, данное при мощах. Такое помнят и те, кто его слышал, и тот, кто дал.',
    offering: 20,
    minutes: 60,
    piety: 5,
    gives: { renown: 1 },
  },
  {
    id: 'consecration',
    label: 'Освящение дома',
    description: 'Обход с водой и дымом по всем углам: у дома появляется тот, к кому в нём ходят.',
    offering: 45,
    minutes: 120,
    piety: 8,
    gives: { place: 6 },
  },
  {
    id: 'requiem',
    label: 'Поминовение рода',
    description: 'По всем, кто был до тебя, — с именами. В месте это замечают.',
    offering: 30,
    minutes: 120,
    piety: 9,
    gives: { place: 2 },
  },
  {
    id: 'anointing',
    label: 'Помазание на землю',
    description: 'Владыка признаёт твоё право на землю вслух. Дороже всего и весит больше всего.',
    offering: 140,
    minutes: 120,
    piety: 14,
    needsBishop: true,
    gives: { renown: 2, place: 4 },
  },
]

export const RITES_BY_ID: Readonly<Record<string, RiteDef>> = Object.fromEntries(
  RITES.map((rite) => [rite.id, rite]),
)

/** Сан: приходской священник, настоятель, владыка. */
export type Cloth = 'priest' | 'abbot' | 'bishop'

export const CLOTH_LABELS: Record<Cloth, string> = {
  priest: 'священник',
  abbot: 'настоятель',
  bishop: 'владыка',
}

/** Нрав служителя: как он встречает и чего требует. */
export type PriestTemper = 'stern' | 'meek' | 'worldly' | 'zealous'

export interface PriestTemperDef {
  readonly id: PriestTemper
  readonly label: string
  /** Во сколько раз просит больше или меньше на храм. */
  readonly offering: number
  /** И во сколько раз щедрее на благочестие. */
  readonly grace: number
  readonly greets: readonly string[]
  readonly refuses: readonly string[]
}

export const PRIEST_TEMPERS: Record<PriestTemper, PriestTemperDef> = {
  stern: {
    id: 'stern',
    label: 'суровый',
    offering: 1.2,
    grace: 0.9,
    greets: ['Пришёл — стой и молчи. Говорить будешь, когда спрошу.'],
    refuses: ['С таким, как ты, я служить не стану. Ступай и подумай.'],
  },
  meek: {
    id: 'meek',
    label: 'тихий',
    offering: 0.8,
    grace: 1.2,
    greets: ['Заходи, сын мой. Тут тепло, и свечи ещё есть.'],
    refuses: ['Не сейчас. Приходи, когда на душе будет иначе.'],
  },
  worldly: {
    id: 'worldly',
    label: 'мирской',
    offering: 1.35,
    grace: 0.85,
    greets: ['А, путник. На храм жертвуют по силам, но не меньше, чем по совести.'],
    refuses: ['Храм не богадельня. Приходи с деньгами.'],
  },
  zealous: {
    id: 'zealous',
    label: 'ревностный',
    offering: 1,
    grace: 1.15,
    greets: ['Вовремя. Нынче как раз читают о тех, кто ходит по дорогам.'],
    refuses: ['Ты отлучён. Пока не покаешься — на порог не пущу.'],
  },
}

export const PRIEST_TEMPER_IDS: readonly PriestTemper[] = ['stern', 'meek', 'worldly', 'zealous']

export const PRIEST_NAMES: readonly string[] = [
  'отец Макарий',
  'отец Илия',
  'отец Зосима',
  'отец Варлаам',
  'отец Паисий',
  'отец Нифонт',
  'мать Феодора',
  'мать Евпраксия',
  'мать Сергия',
  'брат Анастасий',
  'брат Мефодий',
  'шейх Ибрагим',
  'шейх Тахир',
  'жрец Вёльв',
  'жрец Хёгни',
]

/** Что бывает на празднике: он не выходной, а день, в который что-то случается. */
export interface FeastDoing {
  readonly id: string
  readonly label: string
  readonly description: string
  /** Сколько стоит участие. */
  readonly cost: number
  readonly minutes: number
}

export const FEAST_DOINGS: readonly FeastDoing[] = [
  {
    id: 'procession',
    label: 'Идти в шествии',
    description: 'Хоругви, пение и полгорода на улице. Тебя видят рядом со святыней.',
    cost: 0,
    minutes: 180,
  },
  {
    id: 'feastTable',
    label: 'Сесть за общий стол',
    description: 'Столы вынесли на улицу. Пьют за короля, за урожай и за тех, кого нет.',
    cost: 15,
    minutes: 240,
  },
  {
    id: 'fistfight',
    label: 'Выйти на кулачный бой',
    description: 'Стенка на стенку, до первой крови и без железа. Смотрит весь посад.',
    cost: 0,
    minutes: 120,
  },
]

/** Святые места глуши: куда ходят за благодатью (этап 51, Х5). */
export const HOLY_SITES: readonly string[] = ['shrine', 'grove', 'spring']

/** Сколько благочестия даёт паломничество и сколько суток оно помнится. */
export const PILGRIM_PIETY = 25
export const PILGRIM_DAYS = 120

/** Границы благочестия: отлучение и святость. */
export const EXCOMMUNICATED = -50
export const BLESSED = 60

/** Словами: как церковь на тебя смотрит. */
export function pietyWord(piety: number): string {
  if (piety <= EXCOMMUNICATED) return 'отлучён'
  if (piety < -15) return 'в нерадении'
  if (piety < 15) return 'как все'
  if (piety < BLESSED) return 'благочестив'
  return 'угоден небу'
}
