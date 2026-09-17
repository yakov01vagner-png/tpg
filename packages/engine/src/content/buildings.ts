import type { LocationArchetype } from '../world/types'

/**
 * Постройки (DESIGN.md, п.7).
 *
 * У места есть слоты застройки по его размеру, и владелец решает, чем их
 * занять. Каждая постройка меняет числа, а не выдаёт надпись: амбар держит
 * запас, мельница прибавляет еды, стены считаются в осаде.
 */
export const BUILDING_IDS = ['granary', 'mill', 'walls', 'barracks', 'smithy', 'market'] as const

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
}

/** Сколько всего можно построить в месте такого размера. */
export const BUILDING_SLOTS: Record<LocationArchetype, number> = {
  village: 2,
  town: 3,
  city: 4,
  capital: 5,
  port: 3,
  fortress: 3,
  mine: 2,
  monastery: 2,
}
