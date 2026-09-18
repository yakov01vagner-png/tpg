import type { GoodId } from './content/goods'
import { GOODS } from './content/goods'
import { daysToFair, fairOf } from './fair'
import { foodSecurity } from './life'
import type { GameState } from './state'
import { lanesFrom } from './world/lanes'
import { regionOf } from './world/queries'

/**
 * Поручения (этап 6, блок Q).
 *
 * Поручение не выдумывается генератором заданий, а вырастает из состояния
 * мира: там, где и правда голодно, просят привезти хлеб; там, где и правда
 * шалят, просят разобраться с шайкой. Поэтому у них нет отдельной жизни —
 * они просто читаются из мира, пока не взяты.
 */
export type QuestType = 'clearBandits' | 'bringFood' | 'freight' | 'fairGoods'

export interface Quest {
  readonly id: string
  readonly type: QuestType
  /** Кто просит. */
  readonly issuerLocationId: string
  /** С чем разобраться. */
  readonly targetLocationId: string
  /** Сколько надо привезти (для хлеба). */
  readonly amount: number
  readonly reward: number
  /** До какого дня. */
  readonly deadlineDay: number
  /** Сколько уже сделано. */
  readonly progress: number
  /** Какой товар везти — у поручений «к ярмарке» (этап 39). */
  readonly good?: GoodId
}

/** Разбой ниже этого считается выведенным. */
export const BANDITRY_CLEARED = 0.15
/** Выше этого начинают искать, кому заплатить за шайку. */
export const BANDITRY_TROUBLE = 0.4
/** Ниже этой сытости просят хлеба. */
export const HUNGRY = 0.45

/**
 * Что здесь просят сделать.
 *
 * Список выводится из мира, а не хранится: пока поручение не взято, его нет в
 * состоянии — значит, нечему и рассинхронизироваться.
 */
export function offersAt(
  state: GameState,
  locationId: string = state.locationId,
): readonly Quest[] {
  const here = state.world.locations[locationId]
  if (!here) return []
  const region = regionOf(state.world, locationId)
  if (!region) return []

  const nearby = region.provinceIds
    .flatMap((provinceId) => state.world.provinces[provinceId]?.locationIds ?? [])
    .map((id) => state.settlements[id])
    .filter((settlement): settlement is NonNullable<typeof settlement> => Boolean(settlement))

  const taken = new Set(state.quests.map((quest) => quest.id))
  const day = Math.floor(state.time / 1440) + 1
  const offers: Quest[] = []

  for (const settlement of nearby) {
    if (settlement.population <= 0) continue

    if (settlement.banditry > BANDITRY_TROUBLE) {
      const id = `bandits:${settlement.locationId}`
      if (!taken.has(id)) {
        offers.push({
          id,
          type: 'clearBandits',
          issuerLocationId: locationId,
          targetLocationId: settlement.locationId,
          amount: 0,
          reward: Math.round(60 + settlement.banditry * 220),
          deadlineDay: day + 30,
          progress: 0,
        })
      }
    }

    if (foodSecurity(settlement) < HUNGRY) {
      const id = `food:${settlement.locationId}`
      if (!taken.has(id)) {
        // Просят столько, сколько один человек способен довезти, а не сколько
        // нужно городу: иначе награда у столиц улетает в тысячи.
        const amount = Math.min(120, Math.max(20, Math.round(settlement.population * 0.05)))
        offers.push({
          id,
          type: 'bringFood',
          issuerLocationId: locationId,
          targetLocationId: settlement.locationId,
          amount,
          reward: Math.round(amount * 4),
          deadlineDay: day + 25,
          progress: 0,
        })
      }
    }
  }
  // Фрахт: возить чужое (этап 36). Просят в гавани и только там, где есть
  // куда плыть; платят по приходе и на том берегу, а не по возвращении — в
  // этом и смысл: судно окупает себя дорогой в один конец.
  for (const lane of lanesFrom(state.world, locationId).slice(0, FREIGHT_OFFERS)) {
    const id = `freight:${locationId}:${lane.to}`
    if (taken.has(id)) continue
    const there = state.settlements[lane.to]
    if (!there || there.population <= 0) continue
    const amount = 30 + Math.round(lane.hours * 1.5)
    offers.push({
      id,
      type: 'freight',
      issuerLocationId: locationId,
      targetLocationId: lane.to,
      amount,
      // Платят за путь и за груз: дальний фрахт стоит дороже ближнего, и
      // судно окупается не с первого раза, но окупается.
      reward: Math.round(lane.hours * 14 + amount * 2),
      deadlineDay: day + 25,
      progress: 0,
    })
  }

  // К ярмарке (этап 39): за месяц-полтора до торга место просит привезти то,
  // чего ему к ярмарке не хватит. Срок здесь — условие: после ярмарки товар
  // никому не нужен, и опоздавший остаётся с ним.
  const fair = fairOf(state.world, locationId)
  const untilFair = daysToFair(state.world, locationId, day)
  const host = state.settlements[locationId]
  if (fair && host && untilFair !== null && untilFair >= 7 && untilFair <= 50) {
    for (const good of FAIR_GOODS) {
      const id = `fair:${locationId}:${good}`
      if (taken.has(id)) continue
      const amount = Math.min(40, Math.max(8, Math.round(host.population * 0.01)))
      offers.push({
        id,
        type: 'fairGoods',
        issuerLocationId: locationId,
        targetLocationId: locationId,
        amount,
        reward: Math.round(amount * GOODS[good].basePrice * 2.2 + 40),
        deadlineDay: day + untilFair + fair.days - 1,
        progress: 0,
        good,
      })
    }
  }

  return offers
}

/** Что просят к ярмарке: не хлеб, а то, ради чего на неё едут. */
const FAIR_GOODS: readonly GoodId[] = ['wine', 'cloth', 'spices']

/** Сколько фрахтов предлагают в одной гавани разом. */
const FREIGHT_OFFERS = 2

/** Выполнено ли поручение — решает состояние мира, а не счётчик нажатий. */
export function isComplete(state: GameState, quest: Quest): boolean {
  if (quest.type === 'clearBandits') {
    const target = state.settlements[quest.targetLocationId]
    return (target?.banditry ?? 1) < BANDITRY_CLEARED
  }
  // Фрахт считается доставленным, когда судно с грузом пришло в ту гавань. Без
  // судна груза нет: он ушёл на дно вместе с ним.
  if (quest.type === 'freight') {
    return state.locationId === quest.targetLocationId && state.ship !== null
  }
  return quest.progress >= quest.amount
}

export function describeQuest(state: GameState, quest: Quest): string {
  const target = state.world.locations[quest.targetLocationId]?.name ?? 'где-то рядом'
  if (quest.type === 'clearBandits') return `Извести шайку у ${target}`
  if (quest.type === 'freight') return `Довезти чужой груз в ${target}: ${quest.amount} мер`
  if (quest.type === 'fairGoods') {
    const good = quest.good ? GOODS[quest.good].label.toLowerCase() : 'товар'
    return `К ярмарке в ${target}: ${good}, ${quest.amount} мер`
  }
  return `Привезти хлеб в ${target}: ${quest.amount} мер`
}
