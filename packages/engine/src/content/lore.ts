import type { SpellFamily } from './spells'

/**
 * Магия в мире (этап 60) — содержимое.
 *
 * До 0.6 магия была делом игрока: тридцать заклинаний, которые он творит. Мир
 * при этом обходился без неё — архимаг короны был строкой «занят», и больше о
 * нём не было ничего. Здесь у магии появляется место в мире: у архимага есть
 * имя и дело, у погоды — зов, у чар — цена, у заклинания — ступень мастерства,
 * а у редких вещей — своя сила.
 */

/**
 * Чем занят архимаг (этап 60, А1).
 *
 * «Занят» теперь значит чем-то: он отводит мор, зовёт ветер над полями своей
 * короны, стоит при войске — или ушёл в затвор, и тогда его нет ни для кого.
 */
export const ARCHMAGE_DEEDS = ['court', 'plague', 'wind', 'war', 'retreat'] as const
export type ArchmageDeed = (typeof ARCHMAGE_DEEDS)[number]

export const ARCHMAGE_DEED_LABELS: Record<ArchmageDeed, { label: string; about: string }> = {
  court: {
    label: 'при дворе',
    about: 'Сидит у короны и говорит, когда спросят. Такого можно позвать.',
  },
  plague: {
    label: 'отводит мор',
    about: 'Стоит там, где умирают, и держит смерть вполовину. Пока он там, его нет больше нигде.',
  },
  wind: {
    label: 'зовёт ветер',
    about: 'Ходит по полям короны и говорит с погодой. Год от этого выходит лучше.',
  },
  war: {
    label: 'при войске',
    about: 'Идёт с дружинами. Где он, там в строю есть круг, и это видно по потерям.',
  },
  retreat: {
    label: 'в затворе',
    about: 'Ушёл и не отвечает. Так бывает годами, и корона в это время одна.',
  },
}

/** Сколько суток архимаг держится одного дела. */
export const DEED_DAYS = { min: 40, max: 180 } as const

/** Насколько лучше год там, где архимаг звал ветер. */
export const WIND_HARVEST = 0.08
/** Сколько магов встаёт в дружину, когда архимаг при войске. */
export const WAR_MAGES = 2

export const ARCHMAGE_NAMES: readonly string[] = [
  'Велимир',
  'Гортинский',
  'Дамиан',
  'Евстахий',
  'Иларий',
  'Корнилий',
  'Мелетий',
  'Никандр',
  'Орест',
  'Самсон',
  'Феофан',
  'Эрмий',
]

/**
 * Погода по зову (этап 60, А3).
 *
 * Дождь, оттепель и буря — не украшение: дождь поправляет год, оттепель
 * распускает лёд и дорогу, буря запирает море. Зовут их чарами, и держатся они
 * считанные сутки — иначе погода перестаёт быть погодой.
 */
export const WEATHER_KINDS = ['rain', 'thaw', 'gale'] as const
export type WeatherKind = (typeof WEATHER_KINDS)[number]

export const WEATHER_LABELS: Record<WeatherKind, { label: string; about: string }> = {
  rain: { label: 'дождь', about: 'Тёплый дождь на сухие поля. Год выйдет лучше, чем шёл.' },
  thaw: { label: 'оттепель', about: 'Лёд трещит и расходится: и в море, и на дороге.' },
  gale: { label: 'буря', about: 'Море встаёт. Чужие суда не выйдут, и твои тоже.' },
}

/** Насколько зов дождя поправляет год в этой провинции. */
export const RAIN_HARVEST = 0.12

/**
 * Цена магии (этап 60, А4).
 *
 * Деревня боится, храм не любит, орден следит. Чары творят не в пустоте: чем
 * меньше место, тем страшнее ему то, что оно видит.
 */
export const FEAR_BY_PEOPLE = { small: 1200, bigChill: -2, smallChill: -6 } as const
/** Сколько веры теряет тот, кто колдует на глазах у храма. */
export const FEAR_PIETY = -2
/** Сколько положения теряет брат церковного ордена за то же. */
export const FEAR_STANDING = -2

/**
 * Заклинание как ремесло (этап 60, А5).
 *
 * У каждого из тридцати есть ступень мастерства: она растёт от того, что
 * заклинание творят, и садится от того, что его не творят. Мастерство добавляет
 * к удаче и к силе — но ничего не открывает: открывает по-прежнему навык.
 */
export const MASTERY_STEPS = [0, 3, 8, 18, 35, 60] as const
export const MASTERY_LABELS = ['наугад', 'с грехом', 'твёрдо', 'легко', 'без слов', 'своё'] as const
/** Через сколько суток без повторения заклинание начинает забываться. */
export const FORGET_DAYS = 240
/** Что мастерство даёт к удаче на высшей ступени. */
export const MASTERY_LUCK = 0.25
/** Что мастерство даёт к силе на высшей ступени. */
export const MASTERY_POWER = 0.4
/** Сколько повторений даёт упражнение в школе. */
export const HONE_USES = 4
export const HONE_HOURS = 6

/**
 * Артефакты (этап 60, А6).
 *
 * Вещь с чарами: она не делает магом того, кто магом не был, но тому, кто был,
 * даёт больше, чем он сам. Их находят в глуши, делают в школе — и теряют в бою,
 * потому что взявший поле берёт и то, что на нём осталось.
 */
export interface ArtifactDef {
  readonly id: string
  readonly label: string
  readonly about: string
  readonly family: SpellFamily
  /** Насколько сильнее становится эта семья чар. */
  readonly power: number
  /** Во что встаёт работа в школе. */
  readonly price: number
  /** Сколько суток её делают. */
  readonly days: number
  /** С какого навыка магии за такое берутся. */
  readonly needsMagic: number
}

export const ARTIFACTS: readonly ArtifactDef[] = [
  {
    id: 'emberRing',
    label: 'Перстень уголька',
    about: 'Тёплый даже в мороз. Огонь из руки, носящей его, идёт охотнее.',
    family: 'fire',
    power: 0.35,
    price: 900,
    days: 12,
    needsMagic: 25,
  },
  {
    id: 'boneCharm',
    label: 'Костяной оберег',
    about: 'Кость чего-то, чего лучше не знать. Порча с него сходит легче.',
    family: 'curse',
    power: 0.35,
    price: 1100,
    days: 14,
    needsMagic: 30,
  },
  {
    id: 'graveShield',
    label: 'Щит с могильника',
    about: 'Старое железо из курганов. Держит не столько удар, сколько то, что за ним.',
    family: 'ward',
    power: 0.4,
    price: 1300,
    days: 16,
    needsMagic: 35,
  },
  {
    id: 'saltPhial',
    label: 'Склянка соли',
    about: 'Соль, взятая с семи берегов. Море слушает того, кто её держит.',
    family: 'sea',
    power: 0.3,
    price: 700,
    days: 9,
    needsMagic: 20,
  },
  {
    id: 'healersStone',
    label: 'Камень лекаря',
    about: 'Гладкий, тёплый, в жилках. Рана под ним закрывается быстрее.',
    family: 'heal',
    power: 0.3,
    price: 800,
    days: 10,
    needsMagic: 22,
  },
  {
    id: 'seeingGlass',
    label: 'Зрячее стекло',
    about: 'Смотреть сквозь него неприятно: видно чуть больше, чем есть.',
    family: 'sight',
    power: 0.35,
    price: 950,
    days: 11,
    needsMagic: 28,
  },
]

export const ARTIFACTS_BY_ID: Readonly<Record<string, ArtifactDef>> = Object.fromEntries(
  ARTIFACTS.map((one) => [one.id, one]),
)

/** Насколько вероятно найти вещь с чарами в глуши — у того, кто знает, что искать. */
export const FIND_CHANCE = 0.18
/** Насколько вероятно потерять её на проигранном поле. */
export const LOSE_CHANCE = 0.4
