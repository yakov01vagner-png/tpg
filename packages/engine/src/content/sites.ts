import type { SiteKind, Terrain } from '../world/types'

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
  },
  ford: {
    id: 'ford',
    noun: 'Брод',
    gender: 'm',
    description: 'Мелкое место, где реку переходят вброд. В половодье его нет вовсе.',
    terrains: ['plains', 'forest', 'marsh', 'steppe', 'hills'],
    danger: 0.3,
    slow: 1.3,
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
  },
  grove: {
    id: 'grove',
    noun: 'Бор',
    gender: 'm',
    description: 'Корабельный лес. Сухо, светло, и слышно далеко.',
    terrains: ['forest', 'hills', 'plains'],
    danger: 0.2,
    slow: 1.1,
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
  },
  barrow: {
    id: 'barrow',
    noun: 'Курган',
    gender: 'm',
    description: 'Насыпь в рост человека. Кто под ней лежит, не помнят даже старики.',
    terrains: ['steppe', 'plains', 'hills'],
    danger: 0.35,
    slow: 1,
  },
  ruins: {
    id: 'ruins',
    noun: 'Развалины',
    gender: 'p',
    description:
      'Камни, из которых окрестные деревни возят себе фундаменты. Раньше тут стояло что-то большое.',
    danger: 0.4,
    slow: 1,
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
  },
  shrine: {
    id: 'shrine',
    noun: 'Святилище',
    gender: 'n',
    description:
      'Камень, столб или крест на развилке. Проезжие оставляют монету, и не все из вежливости.',
    danger: 0.05,
    slow: 1,
  },
  spring: {
    id: 'spring',
    noun: 'Ключ',
    gender: 'm',
    description: 'Вода бьёт из-под камня и не замерзает. Здесь останавливаются все, кто идёт мимо.',
    terrains: ['forest', 'hills', 'mountains', 'plains'],
    danger: 0.1,
    slow: 1,
  },
  causeway: {
    id: 'causeway',
    noun: 'Гать',
    gender: 'f',
    description: 'Брёвна, уложенные поперёк топи. Кладут каждый год, и каждый год их засасывает.',
    terrains: ['marsh'],
    danger: 0.4,
    slow: 1.7,
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
