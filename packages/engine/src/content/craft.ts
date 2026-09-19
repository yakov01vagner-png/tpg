/**
 * Ремесло — данные, а не код (этап 50).
 *
 * До 0.6 работа была строкой: отстоял смену, получил монеты. Ступени, мастера
 * и цехи превращают её в ремесло: у работы есть выучка, у выучки — тот, кто
 * учит, а у ремесла — цех, который держит цену и не пускает чужих.
 */

/** Ступень выучки в одной работе. */
export interface CraftRankDef {
  readonly id: string
  readonly label: string
  /** Со скольких смен начинается ступень. */
  readonly shifts: number
  /** Во сколько раз платят против первой ступени. */
  readonly pay: number
  /** И во сколько раз быстрее растут навыки: мастер учится у самого дела. */
  readonly practice: number
}

export const CRAFT_RANKS: readonly CraftRankDef[] = [
  { id: 'hand', label: 'подёнщик', shifts: 0, pay: 1, practice: 1 },
  { id: 'apprentice', label: 'подмастерье', shifts: 12, pay: 1.35, practice: 1.15 },
  { id: 'worker', label: 'работник', shifts: 40, pay: 1.8, practice: 1.3 },
  { id: 'master', label: 'мастер', shifts: 100, pay: 2.5, practice: 1.45 },
]

/**
 * Нрав мастера, у которого работаешь.
 *
 * `demand` — насколько он разборчив: строгий не возьмёт незнакомого, `teach` —
 * во сколько раз лучше у него учатся, `pay` — как он платит.
 */
export type MasterTemperId = 'strict' | 'fair' | 'drunk' | 'greedy' | 'old'

export interface CraftMasterDef {
  readonly id: MasterTemperId
  readonly label: string
  readonly demand: number
  readonly teach: number
  readonly pay: number
  readonly hires: readonly string[]
  readonly refuses: readonly string[]
  readonly praises: readonly string[]
}

export const CRAFT_MASTERS: Record<MasterTemperId, CraftMasterDef> = {
  strict: {
    id: 'strict',
    label: 'строгий',
    demand: 0.7,
    teach: 1.3,
    pay: 1,
    hires: ['Станешь у верстака. Руки покажешь — говорить будем после.'],
    refuses: ['Незнакомых не беру. Поработай у других, потом приходи.'],
    praises: ['Вот теперь похоже на работу.'],
  },
  fair: {
    id: 'fair',
    label: 'справедливый',
    demand: 0.2,
    teach: 1.1,
    pay: 1.1,
    hires: ['Берись. Сделаешь — заплачу, как договорились.'],
    refuses: ['Сегодня работы нет. Не обессудь.'],
    praises: ['Добро. С тобой дело идёт.'],
  },
  drunk: {
    id: 'drunk',
    label: 'пьющий',
    demand: 0,
    teach: 0.8,
    pay: 0.9,
    hires: ['А? Ну вставай, чего стоишь. Только не мешай.'],
    refuses: ['Иди... иди отсюда, сегодня не работаем.'],
    praises: ['Э, а ты ничего. Выпьем?'],
  },
  greedy: {
    id: 'greedy',
    label: 'прижимистый',
    demand: 0.35,
    teach: 0.9,
    pay: 0.85,
    hires: ['Работа есть. Платить много не буду, не обессудь.'],
    refuses: ['Мне лишний рот у горна ни к чему.'],
    praises: ['Ладно. Прибавлю. Немного.'],
  },
  old: {
    id: 'old',
    label: 'старый',
    demand: 0.45,
    teach: 1.45,
    pay: 0.95,
    hires: ['Ну, смотри и делай, как я. Слов от меня не жди.'],
    refuses: ['Стар я чужих учить. Ступай.'],
    praises: ['Руки помнят. Значит, не зря.'],
  },
}

export const MASTER_TEMPER_IDS: readonly MasterTemperId[] = [
  'strict',
  'fair',
  'drunk',
  'greedy',
  'old',
]

/** Имена мастеров: ремесленный люд. */
export const CRAFT_MASTER_NAMES: readonly string[] = [
  'Вакула',
  'Мирон',
  'Клим',
  'Савелий',
  'Первуша',
  'Ефим',
  'Потап',
  'Гаврила',
  'Сысой',
  'Нестер',
  'Анфиса',
  'Ирина',
  'Марфа',
  'Аксинья',
  'Хабиб',
  'Рустам',
  'Ингвар',
  'Торбьёрн',
]

/**
 * Цех: ремесленники места, держащиеся вместе.
 *
 * Не орден (этап 42) и не гильдия купцов: цех местный, он есть в каждом
 * ремесленном городе и распространяется только на своё место.
 */
export interface CechDef {
  readonly id: string
  readonly label: string
  /** Какие работы он держит. */
  readonly skills: readonly string[]
}

export const CECHS: readonly CechDef[] = [
  { id: 'smiths', label: 'Кузнечный цех', skills: ['engineering', 'hardLabour'] },
  { id: 'weavers', label: 'Ткацкий цех', skills: ['sleight', 'trade'] },
  { id: 'scribes', label: 'Цех писцов', skills: ['scholarship', 'persuasion'] },
]

/** Взнос в цех: раз в месяц, как и у орденов. */
export const CECH_DUES = 25
export const CECH_DUES_DAYS = 30
/** Во сколько раз цеховому платят больше на своей работе. */
export const CECH_PAY = 1.25
/** С какого населения в месте есть цех. */
export const CECH_POPULATION = 2500

/** Клеймо мастера: чья вещь и какова. */
export const QUALITY_LABELS: readonly string[] = [
  'грубая работа',
  'простая работа',
  'добрая работа',
  'отличная работа',
  'работа мастера',
]
