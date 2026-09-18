import type { SiteKind, Terrain } from '../world/types'
import type { GoodId } from './goods'

/**
 * Места без жителей — данные, а не код (правило репозитория №6).
 *
 * У каждого вида своя земля, своя опасность и своя цена в часах: дорога через
 * гать длиннее дороги через бор, и это свойство места, а не дороги.
 */
export interface SiteDef {
  readonly id: SiteKind
  /** Существительное имени и его род: из них собирается название. */
  readonly noun: string
  readonly gender: 'm' | 'f' | 'n' | 'p'
  readonly description: string
  /** Где такое встречается. Пусто — везде. */
  readonly terrains?: readonly Terrain[]
  /** Насколько здесь опаснее обычной дороги, 0..1. */
  readonly danger: number
  /** Во сколько раз дольше идти через это место. */
  readonly slow: number
  /**
   * Что здесь можно найти, если не проходить мимо. Находка одна на место за всю
   * игру: иначе курган превращается в станок для денег.
   */
  readonly find?: SiteFind
}

export interface SiteFind {
  /** Ступень выживания или ловкости рук, ниже которой ищут впустую. */
  readonly need: number
  readonly money?: readonly [number, number]
  readonly good?: GoodId
  readonly amount?: readonly [number, number]
  /** Что рассказать игроку, когда нашёл. */
  readonly text: string
  /** Могилу разрыли. Округа это запоминает, и не с благодарностью. */
  readonly grim?: boolean
}

export const SITES: Record<SiteKind, SiteDef> = {
  pass: {
    id: 'pass',
    noun: 'Перевал',
    gender: 'm',
    description:
      'Единственный путь через хребет. Зимой его закрывает снегом, летом — теми, кто ждёт наверху.',
    terrains: ['mountains', 'hills'],
    danger: 0.45,
    slow: 1.8,
    find: {
      need: 6,
      money: [30, 90],
      text: 'Под камнем — обледеневшая котомка. Хозяин её не хватится.',
    },
  },
  ford: {
    id: 'ford',
    noun: 'Брод',
    gender: 'm',
    description: 'Мелкое место, где реку переходят вброд. В половодье его нет вовсе.',
    terrains: ['plains', 'forest', 'marsh', 'steppe', 'hills'],
    danger: 0.3,
    slow: 1.3,
    find: {
      need: 4,
      good: 'cloth',
      amount: [4, 10],
      text: 'В корягах застрял тюк сукна: кто-то не довёз и не вернулся искать.',
    },
  },
  crossing: {
    id: 'crossing',
    noun: 'Переправа',
    gender: 'f',
    description:
      'Паром на канате и мужик, который берёт за перевоз. Без него — в обход трое суток.',
    terrains: ['coast', 'marsh', 'plains'],
    danger: 0.15,
    slow: 1.2,
    find: {
      need: 3,
      money: [15, 40],
      text: 'Под настилом — кошель, обронённый с телеги ещё в прошлом году.',
    },
  },
  grove: {
    id: 'grove',
    noun: 'Бор',
    gender: 'm',
    description: 'Корабельный лес. Сухо, светло, и слышно далеко.',
    terrains: ['forest', 'hills', 'plains'],
    danger: 0.2,
    slow: 1.1,
    find: {
      need: 3,
      good: 'honey',
      amount: [5, 12],
      text: 'Борть в старой сосне полна: хозяин её давно не приходил.',
    },
  },
  wilds: {
    id: 'wilds',
    noun: 'Урочище',
    gender: 'n',
    description:
      'Место, про которое в округе говорят вполголоса. Дорога здесь есть, но ходят другой.',
    terrains: ['forest', 'marsh', 'steppe', 'hills'],
    danger: 0.55,
    slow: 1.4,
    find: {
      need: 7,
      good: 'furs',
      amount: [3, 8],
      text: 'Чей-то схрон под выворотнем: шкуры, увязанные на совесть.',
    },
  },
  barrow: {
    id: 'barrow',
    noun: 'Курган',
    gender: 'm',
    description: 'Насыпь в рост человека. Кто под ней лежит, не помнят даже старики.',
    terrains: ['steppe', 'plains', 'hills'],
    danger: 0.35,
    slow: 1,
    find: {
      need: 8,
      money: [120, 380],
      text: 'В насыпи — лаз. Внутри темно, тесно и есть что взять.',
      grim: true,
    },
  },
  ruins: {
    id: 'ruins',
    noun: 'Развалины',
    gender: 'p',
    description:
      'Камни, из которых окрестные деревни возят себе фундаменты. Раньше тут стояло что-то большое.',
    danger: 0.4,
    slow: 1,
    find: {
      need: 5,
      good: 'iron',
      amount: [4, 12],
      text: 'Под завалом — кованые скобы и петли: железо тут доброе, старое.',
    },
  },
  outpost: {
    id: 'outpost',
    noun: 'Застава',
    gender: 'f',
    description:
      'Полдюжины служилых, сарай и шлагбаум. Досматривают всех, берут с каждого второго.',
    danger: 0.1,
    slow: 1.15,
  },
  quarry: {
    id: 'quarry',
    noun: 'Каменоломня',
    gender: 'f',
    description: 'Отсюда возят камень на стены и на храмы. Пыль, грохот и вечная нехватка рук.',
    terrains: ['hills', 'mountains'],
    danger: 0.25,
    slow: 1.1,
    find: {
      need: 4,
      good: 'iron',
      amount: [3, 9],
      text: 'В отвале — недобранная жила: её бросили, когда обвалился свод.',
    },
  },
  shrine: {
    id: 'shrine',
    noun: 'Святилище',
    gender: 'n',
    description:
      'Камень, столб или крест на развилке. Проезжие оставляют монету, и не все из вежливости.',
    danger: 0.05,
    slow: 1,
    find: {
      need: 4,
      money: [25, 70],
      text: 'В расщелине камня — монеты, оставленные проезжими. Все до одной чужие.',
      grim: true,
    },
  },
  spring: {
    id: 'spring',
    noun: 'Ключ',
    gender: 'm',
    description: 'Вода бьёт из-под камня и не замерзает. Здесь останавливаются все, кто идёт мимо.',
    terrains: ['forest', 'hills', 'mountains', 'plains'],
    danger: 0.1,
    slow: 1,
    find: {
      need: 2,
      good: 'herbs',
      amount: [4, 9],
      text: 'У воды растёт то, за чем лекари посылают учеников за десять вёрст.',
    },
  },
  causeway: {
    id: 'causeway',
    noun: 'Гать',
    gender: 'f',
    description: 'Брёвна, уложенные поперёк топи. Кладут каждый год, и каждый год их засасывает.',
    terrains: ['marsh'],
    danger: 0.4,
    slow: 1.7,
    find: {
      need: 3,
      good: 'timber',
      amount: [5, 14],
      text: 'В стороне от гати — сложенные брёвна: заготовили и не вывезли.',
    },
  },
}

/**
 * Прилагательные для имён. Род согласуется с существительным вида места:
 * «Волчий Брод», но «Волчья Гать» и «Волчье Урочище».
 */
export const SITE_EPITHETS: readonly Readonly<Record<'m' | 'f' | 'n' | 'p', string>>[] = [
  { m: 'Волчий', f: 'Волчья', n: 'Волчье', p: 'Волчьи' },
  { m: 'Медвежий', f: 'Медвежья', n: 'Медвежье', p: 'Медвежьи' },
  { m: 'Тихий', f: 'Тихая', n: 'Тихое', p: 'Тихие' },
  { m: 'Чёрный', f: 'Чёрная', n: 'Чёрное', p: 'Чёрные' },
  { m: 'Студёный', f: 'Студёная', n: 'Студёное', p: 'Студёные' },
  { m: 'Кривой', f: 'Кривая', n: 'Кривое', p: 'Кривые' },
  { m: 'Гнилой', f: 'Гнилая', n: 'Гнилое', p: 'Гнилые' },
  { m: 'Дальний', f: 'Дальняя', n: 'Дальнее', p: 'Дальние' },
  { m: 'Вороний', f: 'Воронья', n: 'Вороньё', p: 'Вороньи' },
  { m: 'Сухой', f: 'Сухая', n: 'Сухое', p: 'Сухие' },
  { m: 'Каменный', f: 'Каменная', n: 'Каменное', p: 'Каменные' },
  { m: 'Печальный', f: 'Печальная', n: 'Печальное', p: 'Печальные' },
  { m: 'Старый', f: 'Старая', n: 'Старое', p: 'Старые' },
  { m: 'Заячий', f: 'Заячья', n: 'Заячье', p: 'Заячьи' },
]

/** Какие места без жителей уместны на такой земле. */
export function sitesFor(terrain: Terrain): readonly SiteDef[] {
  return Object.values(SITES).filter((site) => !site.terrains || site.terrains.includes(terrain))
}
