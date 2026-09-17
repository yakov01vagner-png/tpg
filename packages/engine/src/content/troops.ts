import type { LocationArchetype } from '../world/types'

/**
 * Виды воинов (DESIGN.md, п.5, п.6).
 *
 * Именных спутников в игре нет: это безымянные наёмные специалисты. Поэтому
 * воин — это данные, а отряд — просто счётчик по видам.
 */
export const TROOP_IDS = ['militia', 'spearman', 'archer', 'manAtArms', 'horseman', 'mage'] as const

export type TroopId = (typeof TROOP_IDS)[number]

export interface TroopDef {
  readonly id: TroopId
  readonly label: string
  readonly description: string
  /** Ступень выучки: чем выше, тем реже такие водятся. */
  readonly tier: number
  readonly hireCost: number
  /** Жалованье в сутки. */
  readonly wage: number
  /** Сила в ближнем бою и в обороне строя. */
  readonly attack: number
  readonly defense: number
  /** Стрельба. Ноль — стрелять нечем. */
  readonly ranged: number
  /** Верховые обходят с фланга и уходят от погони. */
  readonly mounted: boolean
  /** Где таких вообще нанимают. */
  readonly where: readonly LocationArchetype[]
  /** Сколько народу должно жить в месте, чтобы такие нашлись. */
  readonly minPopulation: number
}

export const TROOPS: Record<TroopId, TroopDef> = {
  militia: {
    id: 'militia',
    label: 'Ополченец',
    description: 'Мужик с копьём, взятый от сохи. Дёшев, и этим хорош.',
    tier: 1,
    hireCost: 12,
    wage: 1,
    attack: 4,
    defense: 4,
    ranged: 0,
    mounted: false,
    where: ['village', 'town', 'city', 'capital', 'port', 'fortress', 'mine'],
    minPopulation: 0,
  },
  spearman: {
    id: 'spearman',
    label: 'Копейщик',
    description: 'Держит строй и знает, зачем он нужен. Основа любой стены щитов.',
    tier: 2,
    hireCost: 28,
    wage: 2,
    attack: 7,
    defense: 9,
    ranged: 0,
    mounted: false,
    where: ['town', 'city', 'capital', 'port', 'fortress'],
    minPopulation: 800,
  },
  archer: {
    id: 'archer',
    label: 'Лучник',
    description: 'Бьёт издали и бесполезен, когда до него добежали.',
    tier: 2,
    hireCost: 30,
    wage: 2,
    attack: 3,
    defense: 4,
    ranged: 10,
    mounted: false,
    where: ['village', 'town', 'city', 'capital', 'fortress'],
    minPopulation: 300,
  },
  manAtArms: {
    id: 'manAtArms',
    label: 'Латник',
    description: 'Броня, выучка и цена, от которой болит кошель.',
    tier: 3,
    hireCost: 75,
    wage: 4,
    attack: 13,
    defense: 15,
    ranged: 0,
    mounted: false,
    where: ['city', 'capital', 'fortress'],
    minPopulation: 3000,
  },
  mage: {
    id: 'mage',
    label: 'Маг',
    description:
      'Адепт школы, готовый идти за деньги. В строю бесполезен, но то, что он делает, строем не сделать.',
    tier: 3,
    hireCost: 160,
    wage: 9,
    attack: 2,
    defense: 3,
    ranged: 0,
    mounted: false,
    where: ['capital', 'city'],
    minPopulation: 5000,
  },
  horseman: {
    id: 'horseman',
    label: 'Всадник',
    description: 'Заходит во фланг и уходит от погони. В строю бесполезен.',
    tier: 3,
    hireCost: 90,
    wage: 5,
    attack: 15,
    defense: 9,
    ranged: 0,
    mounted: true,
    where: ['city', 'capital', 'town'],
    minPopulation: 2000,
  },
}

/** Сколько еды съедает один воин в сутки. */
export const TROOP_FOOD_PER_DAY = 0.6
/** Сколько поклажи несёт на себе каждый воин — своё и общее. */
export const TROOP_CARRY = 8
