/**
 * Дом и семья — данные, а не код (этап 56).
 *
 * До 0.6 брак был записью, дети — счётчиком, а дома не было вовсе. Здесь
 * лежит то, что у дома авторского: чем он бывает, что даёт, каковы нравы
 * супругов и склонности детей.
 */

/** Какой у тебя дом. */
export interface HomeDef {
  readonly id: string
  readonly label: string
  readonly about: string
  readonly price: number
  /** Насколько лучше в нём отдыхается: доля к восстановлению сил. */
  readonly comfort: number
  /** Сколько поклажи можно оставить дома. */
  readonly storage: number
  /** Где такой дом бывает. */
  readonly minPopulation: number
}

export const HOMES: readonly HomeDef[] = [
  {
    id: 'hut',
    label: 'Изба на окраине',
    about: 'Сруб, печь и сени. Не хоромы, но своё — и дверь запирается изнутри.',
    price: 900,
    comfort: 0.15,
    storage: 60,
    minPopulation: 0,
  },
  {
    id: 'townhouse',
    label: 'Дом в посаде',
    about: 'Две горницы, двор и погреб. Соседи знают, чей это дом, и здороваются.',
    price: 2600,
    comfort: 0.3,
    storage: 160,
    minPopulation: 2000,
  },
  {
    id: 'manor',
    label: 'Усадьба',
    about: 'Дом с людьми: повар, конюх, сторож. Тут можно принимать, а не только ночевать.',
    price: 7000,
    comfort: 0.5,
    storage: 400,
    minPopulation: 6000,
  },
]

export const HOMES_BY_ID: Readonly<Record<string, HomeDef>> = Object.fromEntries(
  HOMES.map((home) => [home.id, home]),
)

/** Нрав супруга: как он относится к тому, чем ты занят. */
export type SpouseTemper = 'steady' | 'ambitious' | 'devout' | 'tender' | 'sharp'

export interface SpouseTemperDef {
  readonly id: SpouseTemper
  readonly label: string
  /** Что одобряет: слава, деньги, дом, вера, покой. */
  readonly values: 'renown' | 'money' | 'home' | 'faith' | 'peace'
  readonly greets: readonly string[]
  readonly complains: readonly string[]
  readonly praises: readonly string[]
}

export const SPOUSE_TEMPERS: Record<SpouseTemper, SpouseTemperDef> = {
  steady: {
    id: 'steady',
    label: 'ровного нрава',
    values: 'home',
    greets: ['Вернулся. Садись, ешь.'],
    complains: ['Тебя опять не было. Дом без хозяина стоит, как без крыши.'],
    praises: ['С тобой спокойно. Это больше, чем кажется.'],
  },
  ambitious: {
    id: 'ambitious',
    label: 'честолюбивого нрава',
    values: 'renown',
    greets: ['Ну? Что о тебе говорят нынче?'],
    complains: ['О тебе не говорят ничего. Я не за тем шла.'],
    praises: ['Про тебя теперь и при дворе слыхали. Вот это — по мне.'],
  },
  devout: {
    id: 'devout',
    label: 'богобоязненного нрава',
    values: 'faith',
    greets: ['Слава небу, живой. Я молилась.'],
    complains: ['На тебе кровь и грех. Я за это отвечаю тоже.'],
    praises: ['Ты стал ближе к небу. И к дому.'],
  },
  tender: {
    id: 'tender',
    label: 'мягкого нрава',
    values: 'peace',
    greets: ['Ты устал. Ничего не говори, сначала поешь.'],
    complains: ['Ты приходишь раненый, уходишь раненый. Я так не могу.'],
    praises: ['Уже полгода без крови. Я и забыла, как это.'],
  },
  sharp: {
    id: 'sharp',
    label: 'крутого нрава',
    values: 'money',
    greets: ['Деньги принёс? Тогда здравствуй.'],
    complains: ['В доме пусто, а ты опять с пустыми руками.'],
    praises: ['Вот теперь видно, что ты чего-то стоишь.'],
  },
}

export const SPOUSE_TEMPER_IDS: readonly SpouseTemper[] = [
  'steady',
  'ambitious',
  'devout',
  'tender',
  'sharp',
]

/** Склонность ребёнка: к чему он тянется сам. */
export type ChildBent = 'sword' | 'book' | 'coin' | 'land' | 'faith'

export const CHILD_BENTS: Record<ChildBent, { readonly label: string; readonly about: string }> = {
  sword: { label: 'к железу', about: 'Дерётся палкой во дворе и не плачет, когда бьют.' },
  book: { label: 'к книгам', about: 'Спрашивает больше, чем отвечают, и запоминает всё.' },
  coin: { label: 'к счёту', about: 'Считает чужие деньги вслух. Взрослые смеются и проверяют.' },
  land: { label: 'к земле', about: 'Знает, когда сеять, лучше старосты. Любит скотину.' },
  faith: { label: 'к вере', about: 'Ходит в храм сам, без напоминаний, и слушает, а не стоит.' },
}

export const CHILD_BENT_IDS: readonly ChildBent[] = ['sword', 'book', 'coin', 'land', 'faith']

/** Сколько раз можно вложиться в ребёнка и что это даёт наследнику. */
export const UPBRINGING_MAX = 10
export const UPBRINGING_MINUTES = 240

/** Сколько родни бывает у дома. */
export const KIN_NAMES: readonly string[] = [
  'брат Стоян',
  'брат Милован',
  'сестра Веселина',
  'дядя Горазд',
  'дядя Жихарь',
  'тётка Олисава',
  'племянник Некрас',
  'шурин Богдан',
]

/** Что родня просит и что предлагает. */
export const KIN_ASK = 300
export const KIN_GIFT = 200

/** С какого возраста можно уйти на покой. */
export const RETIRE_AGE = 55
