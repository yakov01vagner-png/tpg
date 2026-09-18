import type { LocationArchetype } from '../world/types'

/**
 * Постройки (DESIGN.md, п.7).
 *
 * У места есть слоты застройки по его размеру, и владелец решает, чем их
 * занять. Каждая постройка меняет числа, а не выдаёт надпись: амбар держит
 * запас, мельница прибавляет еды, стены считаются в осаде.
 */
export const BUILDING_IDS = [
  'granary',
  'mill',
  'walls',
  'barracks',
  'smithy',
  'market',
  'well',
  'chapel',
  'tavern',
  'watchtower',
  'warehouse',
  'bathhouse',
] as const

export type BuildingId = (typeof BUILDING_IDS)[number]

export interface BuildingDef {
  readonly id: BuildingId
  readonly label: string
  readonly description: string
  readonly cost: number
  /** Сколько суток строится. */
  readonly days: number
  /** Где вообще имеет смысл. Пусто — везде. */
  readonly where?: readonly LocationArchetype[]
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  granary: {
    id: 'granary',
    label: 'Амбар',
    description: 'Держит запас на голодный год. Не прибавляет хлеба, но не даёт его потерять.',
    cost: 220,
    days: 20,
  },
  mill: {
    id: 'mill',
    label: 'Мельница',
    description: 'Из того же зерна выходит больше хлеба. Земля начинает кормить больше ртов.',
    cost: 320,
    days: 30,
  },
  walls: {
    id: 'walls',
    label: 'Стены',
    description: 'Камень вместо частокола. В осаде стоит больше, чем сотня копий.',
    cost: 600,
    days: 60,
    where: ['town', 'city', 'capital', 'fortress', 'port'],
  },
  barracks: {
    id: 'barracks',
    label: 'Казармы',
    description: 'Где живут те, кто держит место. Людей идёт больше, и гарнизон помещается.',
    cost: 280,
    days: 25,
  },
  smithy: {
    id: 'smithy',
    label: 'Кузница',
    description: 'Из чужого железа — свои инструменты и оружие.',
    cost: 260,
    days: 25,
    where: ['town', 'city', 'capital', 'fortress', 'mine'],
  },
  market: {
    id: 'market',
    label: 'Торговые ряды',
    description: 'Товар оборачивается быстрее, и подати с него тоже.',
    cost: 240,
    days: 20,
    where: ['village', 'town', 'city', 'capital', 'port'],
  },
  well: {
    id: 'well',
    label: 'Колодец',
    description: 'Чистая вода. Мор, придя, уносит меньше.',
    cost: 120,
    days: 10,
  },
  chapel: {
    id: 'chapel',
    label: 'Часовня',
    description:
      'Есть куда прийти в голодный год. Люди терпят дольше, прежде чем взяться за кистень.',
    cost: 200,
    days: 20,
  },
  tavern: {
    id: 'tavern',
    label: 'Корчма',
    description: 'Проезжие оставляют деньги, а молодые — слушают байки и идут в отряд.',
    cost: 180,
    days: 15,
    where: ['village', 'town', 'city', 'capital', 'port'],
  },
  watchtower: {
    id: 'watchtower',
    label: 'Сторожевая башня',
    description: 'Дозор видит далеко: разбой в округе унимается быстрее, набег берёт вдвое меньше.',
    cost: 200,
    days: 20,
  },
  warehouse: {
    id: 'warehouse',
    label: 'Склад',
    description: 'Товар лежит и ждёт покупателя. Запасы больше, и пополняются они быстрее.',
    cost: 300,
    days: 25,
    where: ['town', 'city', 'capital', 'port'],
  },
  bathhouse: {
    id: 'bathhouse',
    label: 'Бани',
    description: 'Чистый город болеет меньше: мор уносит втрое меньше, чем в грязном.',
    cost: 380,
    days: 30,
    where: ['town', 'city', 'capital', 'port'],
  },
}

/** Сколько всего можно построить в месте такого размера. */
export const BUILDING_SLOTS: Record<LocationArchetype, number> = {
  village: 3,
  town: 4,
  city: 5,
  capital: 6,
  port: 4,
  fortress: 4,
  mine: 3,
  monastery: 3,
}
