import type { GoodId } from './goods'

/**
 * Мор, раны и лекари (этап 64) — содержимое.
 *
 * До 0.6 рана была числом суток, лекарь — множителем к этому числу, а мор —
 * погодой, которую видно только по убыли. Здесь у раны появляется история, у
 * лекаря — имя и цена, у мора — карантин, а у отряда — свои болезни.
 */

/** Нрав и выучка лекаря (Ж1). */
export const HEALER_KINDS = ['physician', 'herbwife', 'barber', 'charlatan'] as const
export type HealerKind = (typeof HEALER_KINDS)[number]

export const HEALER_KIND_DEFS: Record<
  HealerKind,
  {
    readonly label: string
    readonly about: string
    /** Во сколько раз быстрее у него заживает. */
    readonly speed: number
    /** Во что встаёт его труд за сутки лечения. */
    readonly price: number
    /** Насколько он умеет не дать ране загноиться. */
    readonly clean: number
  }
> = {
  physician: {
    label: 'лекарь',
    about: 'Учился по книгам и держит инструмент в чистоте. Берёт как за учёность.',
    speed: 2.2,
    price: 14,
    clean: 0.8,
  },
  herbwife: {
    label: 'знахарка',
    about: 'Травы, отвары и слова над водой. Половина помогает, и никто не знает которая.',
    speed: 1.6,
    price: 6,
    clean: 0.55,
  },
  barber: {
    label: 'цирюльник',
    about: 'Брил, рвал зубы, а теперь шьёт раны тем же, чем брил. Зато берёт немного.',
    speed: 1.4,
    price: 4,
    clean: 0.3,
  },
  charlatan: {
    label: 'знающий человек',
    about: 'Говорит уверенно и дорого. Помогает то, что заживает само.',
    speed: 1,
    price: 10,
    clean: 0.1,
  },
}

export const HEALER_NAMES: readonly string[] = [
  'Аглая',
  'Ефросинья',
  'Лукерья',
  'Мавра',
  'Пелагея',
  'Ульяна',
  'Аристарх',
  'Вениамин',
  'Гервасий',
  'Иларион',
  'Клавдий',
  'Прохор',
]

/** С какого числа жителей в месте есть кому лечить. */
export const HEALER_POPULATION = 700

/**
 * Рана как история (Ж2).
 *
 * У раны есть род: резаная, ломаная, жжёная, горячка. От рода зависит, чем её
 * лечат, сколько она лежит и что оставляет после себя.
 */
export const WOUND_KINDS = ['cut', 'break', 'burn', 'fever'] as const
export type WoundKind = (typeof WOUND_KINDS)[number]

export const WOUND_KIND_DEFS: Record<
  WoundKind,
  {
    readonly label: string
    readonly about: string
    /** Насколько охотно гноится без ухода. */
    readonly fester: number
    /** Что остаётся, если зажило плохо. */
    readonly scar: string
  }
> = {
  cut: {
    label: 'резаная',
    about: 'Чистый край, много крови. Заживает быстро, если её вымыли.',
    fester: 0.06,
    scar: 'рубец через бровь',
  },
  break: {
    label: 'ломаная',
    about: 'Кость. Лежать долго, и срастётся так, как срастётся.',
    fester: 0.03,
    scar: 'рука сгибается не до конца',
  },
  burn: {
    label: 'жжёная',
    about: 'Хуже всех: болит долго, тянет кожу и любит загноиться.',
    fester: 0.1,
    scar: 'стянутая кожа на руке',
  },
  fever: {
    label: 'горячка',
    about: 'Не рана, а то, что после неё. Лечится покоем и отваром, а не иглой.',
    fester: 0.08,
    scar: 'сердце сбивается на подъёме',
  },
}

/** Насколько гноящаяся рана тяжелее. */
export const FESTER_HARM = 0.3
/** Во сколько раз дольше лежит загноившаяся. */
export const FESTER_SLOW = 1.8
/** Насколько вероятно, что плохо заживший оставит увечье. */
export const MAIM_CHANCE = 0.35

/**
 * Травы и зелья (Ж4).
 *
 * Травничество — ремесло: собрать, сварить, продать. Варят из трав, а трав на
 * зелье уходит больше, чем кажется.
 */
export interface PotionDef {
  readonly id: string
  readonly label: string
  readonly about: string
  /** Сколько трав уходит. */
  readonly herbs: number
  /** С какого лекарского умения берутся. */
  readonly needsHealing: number
  readonly minutes: number
  /** За сколько его берут на рынке. */
  readonly price: number
}

export const POTIONS: readonly PotionDef[] = [
  {
    id: 'salve',
    label: 'Мазь',
    about: 'Чистит раны и не даёт им загноиться. Пахнет так, что верят сразу.',
    herbs: 4,
    needsHealing: 4,
    minutes: 180,
    price: 26,
  },
  {
    id: 'brew',
    label: 'Отвар',
    about: 'Сбивает горячку и ставит на ноги раньше срока.',
    herbs: 6,
    needsHealing: 10,
    minutes: 240,
    price: 44,
  },
  {
    id: 'tonic',
    label: 'Крепящее',
    about: 'Снимает усталость, как будто ты спал. Второй раз подряд уже не так.',
    herbs: 5,
    needsHealing: 14,
    minutes: 200,
    price: 52,
  },
  {
    id: 'antidote',
    label: 'Противоядие',
    about: 'От дурной воды, дурной пищи и дурного умысла. В дороге стоит своего веса.',
    herbs: 8,
    needsHealing: 22,
    minutes: 300,
    price: 90,
  },
]

export const POTIONS_BY_ID: Readonly<Record<string, PotionDef>> = Object.fromEntries(
  POTIONS.map((one) => [one.id, one]),
)

export const HERB_GOOD: GoodId = 'herbs'

/**
 * Болезни отряда (Ж5).
 *
 * Отряд болеет от того, где он есть: цинга в море, лихорадка в топи, кровавый
 * понос в осаждённом городе. Болезнь — не урон, а условие: она держится, пока
 * держится причина.
 */
export const AILMENTS = ['scurvy', 'fever', 'flux'] as const
export type Ailment = (typeof AILMENTS)[number]

export const AILMENT_DEFS: Record<
  Ailment,
  {
    readonly label: string
    readonly about: string
    /** Сколько духа отряд теряет за сутки. */
    readonly morale: number
    /** Насколько медленнее идут. */
    readonly pace: number
    /** Чем лечится. */
    readonly cure: string
  }
> = {
  scurvy: {
    label: 'цинга',
    about: 'Кровоточат дёсны, шатаются зубы, ноги не держат. Море не кормит зеленью.',
    morale: 1.5,
    pace: 1.15,
    cure: 'берег и свежая еда',
  },
  fever: {
    label: 'лихорадка',
    about: 'Болотная: бьёт через день, и каждый раз слабее держишься.',
    morale: 2,
    pace: 1.25,
    cure: 'отвар и сухая земля',
  },
  flux: {
    label: 'кровавый понос',
    about: 'Дурная вода и теснота. В осаде убивает больше, чем стрелы.',
    morale: 2.5,
    pace: 1.2,
    cure: 'чистая вода и покой',
  },
}

/** Сколько суток без зелени в море до цинги. */
export const SCURVY_DAYS = 45
/** Насколько вероятна лихорадка за сутки в топях. */
export const FEVER_CHANCE = 0.03
/** Насколько вероятен понос за сутки в осаждённом или голодном месте. */
export const FLUX_CHANCE = 0.02

/**
 * Карантин (Ж3).
 *
 * Запереть место — решение: мор идёт медленнее, а торг и подать встают. Люди
 * это помнят по-разному: те, кто внутри, — плохо, те, кто рядом, — хорошо.
 */
export const QUARANTINE_DAYS = 60
/** Во сколько раз медленнее мор расходится из запертого места. */
export const QUARANTINE_SPREAD = 0.25
/** Какую долю подати и торга теряет запертое место. */
export const QUARANTINE_COST = 0.6

/**
 * Старость лордов (Ж6).
 *
 * Лорды не вечны: они старятся, болеют и умирают, а на их место садятся
 * наследники — с именами, своей силой и своей верностью.
 */
export const LORD_START_AGE = [28, 58] as const
export const LORD_DEATH_AGE = 55
export const HEIR_NAMES_FROM_FATHER = true
