import type { LocationArchetype, Terrain } from '../world/types'

/**
 * Товары (DESIGN.md, п.7).
 *
 * Список нарочно короткий: десяти товаров хватало, чтобы места отличались друг
 * от друга. Пятнадцать — предел, при котором экран торга ещё читается с
 * телефона; пять добавленных даны редким землям: мёд лесу и монастырю, кожа
 * степи, меха северному лесу, серебро горам, пряности портам.
 */
export const GOOD_IDS = [
  'grain',
  'fish',
  'salt',
  'timber',
  'iron',
  'herbs',
  'cloth',
  'wine',
  'tools',
  'weapons',
  'honey',
  'leather',
  'furs',
  'silver',
  'spices',
] as const

export type GoodId = (typeof GOOD_IDS)[number]

export interface GoodDef {
  readonly id: GoodId
  readonly label: string
  /** Цена в месте, где товара ровно столько, сколько нужно. */
  readonly basePrice: number
  /** Вес единицы: определяет, сколько получится унести на себе. */
  readonly weight: number
  /** Еда нужна всем и каждый день — на ней потом вырастет голод. */
  readonly food: boolean
}

export const GOODS: Record<GoodId, GoodDef> = {
  grain: { id: 'grain', label: 'Зерно', basePrice: 2, weight: 1, food: true },
  fish: { id: 'fish', label: 'Рыба', basePrice: 3, weight: 1, food: true },
  salt: { id: 'salt', label: 'Соль', basePrice: 8, weight: 1, food: false },
  timber: { id: 'timber', label: 'Лес', basePrice: 3, weight: 3, food: false },
  iron: { id: 'iron', label: 'Железо', basePrice: 14, weight: 2, food: false },
  herbs: { id: 'herbs', label: 'Травы', basePrice: 9, weight: 0.5, food: false },
  cloth: { id: 'cloth', label: 'Ткань', basePrice: 12, weight: 1, food: false },
  wine: { id: 'wine', label: 'Вино', basePrice: 10, weight: 2, food: false },
  tools: { id: 'tools', label: 'Инструменты', basePrice: 20, weight: 2, food: false },
  weapons: { id: 'weapons', label: 'Оружие', basePrice: 45, weight: 3, food: false },
  honey: { id: 'honey', label: 'Мёд', basePrice: 7, weight: 1, food: false },
  leather: { id: 'leather', label: 'Кожа', basePrice: 11, weight: 1.5, food: false },
  furs: { id: 'furs', label: 'Меха', basePrice: 18, weight: 1, food: false },
  silver: { id: 'silver', label: 'Серебро', basePrice: 60, weight: 0.5, food: false },
  spices: { id: 'spices', label: 'Пряности', basePrice: 40, weight: 0.3, food: false },
}

/** Сколько единиц товара нужно одному жителю, чтобы жизнь шла своим чередом. */
export const DEMAND_PER_CAPITA: Record<GoodId, number> = {
  grain: 0.5,
  fish: 0.15,
  salt: 0.05,
  timber: 0.2,
  iron: 0.03,
  herbs: 0.03,
  cloth: 0.08,
  wine: 0.06,
  tools: 0.04,
  weapons: 0.02,
  honey: 0.03,
  leather: 0.05,
  furs: 0.02,
  silver: 0.005,
  spices: 0.005,
}

/**
 * Насколько место производит товар сверх собственной нужды.
 *
 * Больше единицы — производитель, товар лежит с избытком и стоит дёшево.
 * Меньше — потребитель: своего нет, всё привозное и дорогое. Отсюда и берётся
 * разница цен, ради которой имеет смысл возить.
 */
export const ARCHETYPE_SUPPLY: Record<LocationArchetype, Partial<Record<GoodId, number>>> = {
  village: {
    grain: 2.2,
    timber: 1.4,
    herbs: 1.4,
    tools: 0.5,
    cloth: 0.6,
    weapons: 0.3,
    salt: 0.5,
    honey: 1.6,
    leather: 1.5,
    furs: 1.2,
    silver: 0.3,
    spices: 0.2,
  },
  town: { grain: 1.1, cloth: 1.2, tools: 1.1, timber: 1.1, leather: 1.2, spices: 0.5 },
  city: {
    cloth: 1.7,
    tools: 1.8,
    weapons: 1.6,
    wine: 1.3,
    grain: 0.5,
    timber: 0.7,
    herbs: 0.8,
    leather: 0.7,
    furs: 0.6,
    silver: 0.8,
    spices: 0.7,
  },
  capital: {
    cloth: 1.8,
    tools: 1.9,
    weapons: 1.8,
    wine: 1.5,
    grain: 0.4,
    timber: 0.6,
    herbs: 0.7,
    leather: 0.7,
    furs: 0.5,
    silver: 0.9,
    spices: 0.8,
  },
  port: {
    fish: 3,
    salt: 2.2,
    cloth: 1.4,
    wine: 1.5,
    grain: 0.7,
    timber: 0.8,
    spices: 2.6,
    silver: 1.2,
  },
  mine: {
    iron: 4,
    tools: 0.8,
    grain: 0.3,
    cloth: 0.5,
    fish: 0.4,
    herbs: 0.6,
    silver: 3,
    honey: 0.4,
  },
  fortress: { weapons: 1.4, grain: 0.4, timber: 0.7, cloth: 0.6, wine: 0.8, leather: 0.8 },
  monastery: {
    herbs: 2.4,
    wine: 1.8,
    grain: 0.6,
    iron: 0.4,
    weapons: 0.2,
    tools: 0.6,
    honey: 2.2,
    spices: 0.4,
  },
}

/** Что даёт сама земля: на побережье рыба дешева, в горах — железо. */
export const TERRAIN_SUPPLY: Record<Terrain, Partial<Record<GoodId, number>>> = {
  plains: { grain: 1.4, timber: 0.7, honey: 1.1 },
  forest: { timber: 1.8, herbs: 1.3, grain: 0.8, furs: 2, honey: 1.4 },
  hills: { iron: 1.4, grain: 0.9, silver: 1.2 },
  mountains: { iron: 1.8, grain: 0.4, timber: 0.6, silver: 1.6, furs: 1.3 },
  marsh: { herbs: 1.4, grain: 0.5, fish: 1.2, honey: 1.2 },
  coast: { fish: 1.8, salt: 1.6, grain: 0.9, spices: 1.3 },
  steppe: { grain: 0.8, cloth: 1.3, fish: 0.5, leather: 2, furs: 0.7 },
}
