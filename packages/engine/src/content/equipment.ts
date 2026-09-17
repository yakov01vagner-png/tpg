import type { SkillId } from '../skills'
import type { LocationArchetype } from '../world/types'

/**
 * Личное снаряжение (DESIGN.md, п.12 — «снаряжение и крафт»).
 *
 * Вещь — это данные: урон, защита, вес, требования. Тяжёлый доспех не всегда
 * лучше: он требует силы и выматывает. Снаряжение — то, на что наконец можно
 * тратить деньги, кроме обучения и наёмников.
 */
export interface EquippedItem {
  readonly id: string
  /** Состояние 0..100. Изношенная вещь защищает хуже. */
  readonly condition: number
}

export type Equipment = Readonly<Partial<Record<SlotId, EquippedItem>>>

export const SLOT_IDS = ['weapon', 'shield', 'armor', 'helmet', 'horse'] as const
export type SlotId = (typeof SLOT_IDS)[number]

export const SLOT_LABELS: Record<SlotId, string> = {
  weapon: 'Оружие',
  shield: 'Щит',
  armor: 'Доспех',
  helmet: 'Шлем',
  horse: 'Конь',
}

export interface ItemDef {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly slot: SlotId
  readonly price: number
  /** Прибавка к личной силе удара и к обороне. */
  readonly attack: number
  readonly defense: number
  /** Вес: занимает поклажу и требует силы. */
  readonly weight: number
  /** Ниже этой силы вещь тянет вниз, а не помогает. */
  readonly strength: number
  /** Навык, без которого толку мало. */
  readonly skill?: { readonly id: SkillId; readonly level: number }
  /** Где такое продают. */
  readonly where: readonly LocationArchetype[]
  /** Из чего куётся: железо и инструменты из экономики этапа 3. */
  readonly craft?: { readonly iron: number; readonly tools: number; readonly engineering: number }
}

export const ITEMS: readonly ItemDef[] = [
  {
    id: 'club',
    label: 'Дубина',
    description: 'Палка с гвоздём. Оружие тех, кому больше нечем.',
    slot: 'weapon',
    price: 8,
    attack: 2,
    defense: 0,
    weight: 3,
    strength: 1,
    where: ['village', 'town', 'city', 'capital', 'port', 'fortress', 'mine'],
  },
  {
    id: 'shortSword',
    label: 'Короткий меч',
    description: 'Городская работа: не красив, но делает своё.',
    slot: 'weapon',
    price: 70,
    attack: 6,
    defense: 1,
    weight: 2,
    strength: 3,
    skill: { id: 'lightWeapons', level: 5 },
    where: ['town', 'city', 'capital', 'port', 'fortress'],
    craft: { iron: 6, tools: 2, engineering: 10 },
  },
  {
    id: 'longSword',
    label: 'Длинный клинок',
    description: 'Оружие того, кто привык, что за ним идут.',
    slot: 'weapon',
    price: 260,
    attack: 12,
    defense: 2,
    weight: 3,
    strength: 5,
    skill: { id: 'lightWeapons', level: 20 },
    where: ['city', 'capital'],
    craft: { iron: 14, tools: 5, engineering: 25 },
  },
  {
    id: 'warAxe',
    label: 'Боевой топор',
    description: 'Не спрашивает про выучку — спрашивает про плечи.',
    slot: 'weapon',
    price: 180,
    attack: 14,
    defense: 0,
    weight: 5,
    strength: 7,
    skill: { id: 'heavyWeapons', level: 15 },
    where: ['town', 'city', 'capital', 'fortress', 'mine'],
    craft: { iron: 12, tools: 4, engineering: 18 },
  },
  {
    id: 'bow',
    label: 'Лук',
    description: 'Бьёт издали. Вблизи от него толку нет.',
    slot: 'weapon',
    price: 90,
    attack: 7,
    defense: 0,
    weight: 2,
    strength: 4,
    skill: { id: 'archery', level: 10 },
    where: ['village', 'town', 'city', 'capital', 'fortress'],
  },
  {
    id: 'woodShield',
    label: 'Деревянный щит',
    description: 'Доска с умбоном. Держит первый удар и ломается на третьем.',
    slot: 'shield',
    price: 35,
    attack: 0,
    defense: 5,
    weight: 4,
    strength: 3,
    where: ['village', 'town', 'city', 'capital', 'port', 'fortress'],
    craft: { iron: 2, tools: 2, engineering: 6 },
  },
  {
    id: 'ironShield',
    label: 'Окованный щит',
    description: 'Железо по краю и по центру. Тяжелее, но и держит дольше.',
    slot: 'shield',
    price: 140,
    attack: 0,
    defense: 10,
    weight: 7,
    strength: 5,
    where: ['town', 'city', 'capital', 'fortress'],
    craft: { iron: 8, tools: 3, engineering: 14 },
  },
  {
    id: 'gambeson',
    label: 'Стёганка',
    description: 'Толстая ткань в несколько слоёв. Дешёвая жизнь, но жизнь.',
    slot: 'armor',
    price: 60,
    attack: 0,
    defense: 7,
    weight: 6,
    strength: 3,
    where: ['village', 'town', 'city', 'capital', 'port', 'fortress'],
  },
  {
    id: 'mail',
    label: 'Кольчуга',
    description: 'Работа не одного месяца. Носится годами, если чинить.',
    slot: 'armor',
    price: 340,
    attack: 0,
    defense: 16,
    weight: 14,
    strength: 6,
    where: ['city', 'capital', 'fortress'],
    craft: { iron: 20, tools: 6, engineering: 30 },
  },
  {
    id: 'plate',
    label: 'Латы',
    description: 'То, за чем идут в первый ряд. И то, в чём тонут в болоте.',
    slot: 'armor',
    price: 900,
    attack: 0,
    defense: 28,
    weight: 24,
    strength: 8,
    skill: { id: 'athletics', level: 20 },
    where: ['capital'],
    craft: { iron: 45, tools: 14, engineering: 50 },
  },
  {
    id: 'cap',
    label: 'Шапель',
    description: 'Железная шляпа. Некрасиво и спасает.',
    slot: 'helmet',
    price: 45,
    attack: 0,
    defense: 5,
    weight: 3,
    strength: 2,
    where: ['town', 'city', 'capital', 'fortress', 'mine'],
    craft: { iron: 4, tools: 2, engineering: 8 },
  },
  {
    id: 'greatHelm',
    label: 'Глухой шлем',
    description: 'В нём плохо слышно и почти ничего не видно. Зато голова цела.',
    slot: 'helmet',
    price: 190,
    attack: 0,
    defense: 12,
    weight: 6,
    strength: 5,
    where: ['city', 'capital'],
    craft: { iron: 10, tools: 4, engineering: 20 },
  },
  {
    id: 'packHorse',
    label: 'Вьючная лошадь',
    description: 'Не для боя. Зато на ней едет то, что иначе тащил бы сам.',
    slot: 'horse',
    price: 120,
    attack: 0,
    defense: 0,
    weight: 0,
    strength: 1,
    where: ['village', 'town', 'city', 'capital', 'steppe' as LocationArchetype],
  },
  {
    id: 'warHorse',
    label: 'Боевой конь',
    description: 'Обучен не бояться железа. Стоит как небольшая деревня.',
    slot: 'horse',
    price: 420,
    attack: 8,
    defense: 4,
    weight: 0,
    strength: 5,
    skill: { id: 'riding', level: 15 },
    where: ['city', 'capital', 'town'],
  },
]

export const ITEMS_BY_ID: Readonly<Record<string, ItemDef>> = Object.fromEntries(
  ITEMS.map((item) => [item.id, item]),
)

/** Сколько поклажи везёт вьючная лошадь. */
export const HORSE_CARRY = 60
