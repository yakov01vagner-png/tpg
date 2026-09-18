import type { ChainDef, ChainStep } from './content/chains'
import { CHAINS, CHAINS_BY_ID } from './content/chains'
import { PLAYER, holdingsOf } from './holding'
import { isAvailableAt } from './place'
import type { GameState } from './state'
import { kingdomOf } from './world/queries'

/** Идущая цепочка: какая, на каком шаге, сколько побед было в начале. */
export interface ChainProgress {
  readonly chainId: string
  readonly step: number
  readonly startedDay: number
  readonly winsAtStart: number
  /** Где взяли: сюда возвращаются за наградой в рассказе, но не в правилах. */
  readonly givenAt: string
}

export function chainDef(id: string): ChainDef | null {
  return CHAINS_BY_ID[id] ?? null
}

/** Что предлагают здесь: по виду места, короне и тому, что за плечами. */
export function chainsOfferedAt(
  state: GameState,
  locationId: string = state.locationId,
): readonly ChainDef[] {
  const location = state.world.locations[locationId]
  if (!location) return []
  const population = state.settlements[locationId]?.population ?? location.population
  if (population <= 0) return []
  const kingdom = kingdomOf(state.world, locationId)?.id ?? null
  const active = new Set(state.chains.map((one) => one.chainId))
  const done = new Set(state.doneChains)
  return CHAINS.filter(
    (chain) =>
      !active.has(chain.id) &&
      !done.has(chain.id) &&
      isAvailableAt(chain.where, location, population) &&
      (!chain.kingdomId || chain.kingdomId === kingdom) &&
      (chain.requiresTags ?? []).every((tag) => state.character.tags.includes(tag)),
  )
}

/** Выполнен ли шаг — решает состояние мира. Доставка ещё и забирает товар. */
export function stepDone(state: GameState, step: ChainStep, progress: ChainProgress): boolean {
  const here = state.world.locations[state.locationId]
  switch (step.type) {
    case 'visit':
      return (
        here?.archetype === step.archetype &&
        (!step.kingdomId || kingdomOf(state.world, state.locationId)?.id === step.kingdomId)
      )
    case 'deliver':
      return (
        here?.archetype === step.archetype &&
        (state.character.inventory[step.good] ?? 0) >= step.amount
      )
    case 'win':
      return state.battlesWon - progress.winsAtStart >= step.battles
    case 'skill':
      return state.character.skills[step.skill].level >= step.level
    case 'recruit':
      return state.companions.some((one) => one.id === step.companionId && !one.captive)
    case 'hold':
      return holdingsOf(state.settlements, PLAYER).length > 0
    case 'money':
      return state.character.money >= step.amount
    default:
      return false
  }
}

export function currentStep(progress: ChainProgress): ChainStep | null {
  return chainDef(progress.chainId)?.steps[progress.step] ?? null
}
