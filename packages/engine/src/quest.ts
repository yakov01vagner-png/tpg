import { foodSecurity } from './life'
import type { GameState } from './state'
import { regionOf } from './world/queries'

/**
 * Поручения (этап 6, блок Q).
 *
 * Поручение не выдумывается генератором заданий, а вырастает из состояния
 * мира: там, где и правда голодно, просят привезти хлеб; там, где и правда
 * шалят, просят разобраться с шайкой. Поэтому у них нет отдельной жизни —
 * они просто читаются из мира, пока не взяты.
 */
export type QuestType = 'clearBandits' | 'bringFood'

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
  return offers
}

/** Выполнено ли поручение — решает состояние мира, а не счётчик нажатий. */
export function isComplete(state: GameState, quest: Quest): boolean {
  if (quest.type === 'clearBandits') {
    const target = state.settlements[quest.targetLocationId]
    return (target?.banditry ?? 1) < BANDITRY_CLEARED
  }
  return quest.progress >= quest.amount
}

export function describeQuest(state: GameState, quest: Quest): string {
  const target = state.world.locations[quest.targetLocationId]?.name ?? 'где-то рядом'
  if (quest.type === 'clearBandits') return `Извести шайку у ${target}`
  return `Привезти хлеб в ${target}: ${quest.amount} мер`
}
