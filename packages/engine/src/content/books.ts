import type { SkillId } from '../skills'

/**
 * Книги (этап 55, Н6).
 *
 * Книга — вещь: её покупают в школе или находят в глуши, читают неделями и
 * получают то, чего не даст наставник. Для самоучки это единственная дверь к
 * тому, чему учат за закрытыми дверями.
 */
export interface BookDef {
  readonly id: string
  readonly label: string
  readonly about: string
  /** Сколько стоит в школе. Найденная в глуши достаётся даром. */
  readonly price: number
  /** Сколько суток её читают. */
  readonly days: number
  /** Чему учит: сырой опыт навыкам. */
  readonly teaches: Partial<Record<SkillId, number>>
  /** Какое заклинание открывает, если открывает (этап 41). */
  readonly spellId?: string
  /** Нужен ли ранг, чтобы понять написанное. */
  readonly needsMagic?: number
}

export const BOOKS: readonly BookDef[] = [
  {
    id: 'herbal',
    label: 'Травник брата Ануфрия',
    about: 'Полтораста трав с рисунками и приписками на полях: «не давать беременным».',
    price: 120,
    days: 5,
    teaches: { healing: 180, survival: 60 },
  },
  {
    id: 'ledger',
    label: 'Счётные тетради весовщика',
    about: 'Не книга, а чужая бухгалтерия за двадцать лет. Читается как роман про обман.',
    price: 90,
    days: 4,
    teaches: { trade: 200, scholarship: 40 },
  },
  {
    id: 'fieldcraft',
    label: 'Наставление ротному',
    about: 'Как ставить лагерь, кормить сотню и вести её так, чтобы дошла.',
    price: 160,
    days: 6,
    teaches: { command: 200, survival: 80 },
  },
  {
    id: 'stonework',
    label: 'О камне и железе',
    about: 'Чертежи кладки, расчёты воротов и три способа сварить негодное железо.',
    price: 180,
    days: 7,
    teaches: { engineering: 220 },
  },
  {
    id: 'firstCircle',
    label: 'Первый круг: начала',
    about: 'Школьный свиток для неофитов. Скучен, точен и безопасен.',
    price: 220,
    days: 7,
    teaches: { magic: 200, concentration: 60 },
    needsMagic: 0,
  },
  {
    id: 'windSongs',
    label: 'Песни ветра',
    about: 'Заклинания погоды, записанные стихами: иначе их не удержать в памяти.',
    price: 420,
    days: 9,
    teaches: { magic: 160 },
    spellId: 'wind',
    needsMagic: 15,
  },
  {
    id: 'quietHand',
    label: 'Тихая рука',
    about: 'О том, как лечить чарами, не убив того, кого лечишь.',
    price: 480,
    days: 10,
    teaches: { magic: 150, healing: 100 },
    spellId: 'heal',
    needsMagic: 20,
  },
  {
    id: 'lampBook',
    label: 'Книга светильника',
    about: 'Чары света и того, что свет отгоняет. Пахнет гарью — её уже жгли.',
    price: 360,
    days: 8,
    teaches: { magic: 140, concentration: 80 },
    spellId: 'light',
    needsMagic: 12,
  },
  {
    id: 'blackPages',
    label: 'Чёрные страницы',
    about: 'Без имени и без начала. Школы делают вид, что такой книги нет.',
    price: 700,
    days: 12,
    teaches: { magic: 320 },
    needsMagic: 30,
  },
  {
    id: 'chronicleOld',
    label: 'Старая летопись',
    about: 'Хроника трёх корон до нынешних войн. Половина имён уже ничего не значит.',
    price: 140,
    days: 6,
    teaches: { scholarship: 220, persuasion: 60 },
  },
]

export const BOOKS_BY_ID: Readonly<Record<string, BookDef>> = Object.fromEntries(
  BOOKS.map((book) => [book.id, book]),
)

/** Ученик при тебе (этап 55, Н5): кто идёт следом и чему учится. */
export const STUDENT_NAMES: readonly string[] = [
  'Никша',
  'Обрам',
  'Тишка',
  'Улька',
  'Гаврик',
  'Зорька',
  'Мал',
  'Юста',
]

/** Сколько ученик учится, прежде чем уйдёт своей дорогой. */
export const STUDENT_DAYS = 400
/** И сколько с ним хлопот: он ест, спит и путается под ногами. */
export const STUDENT_UPKEEP = 3

/** Спор в школе (этап 55, Н3): что он даёт и чем рискует. */
export const DEBATE_MINUTES = 180
export const DEBATE_XP = 90
