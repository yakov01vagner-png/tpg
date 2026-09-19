import {
  BRIBE,
  CAUGHT,
  RUMOUR,
  SPY_FINDS,
  SPY_FIND_DEFS,
  SPY_SEAT_DEFS,
  type SpyFind,
  type SpySeat,
} from './content/spies'
import { PLAYER } from './holding'
import { crownPlan } from './plans'
import { royalHouse, yearsToSuccession } from './royal'
import type { GameState } from './state'
import { liveTreaties, secretDef } from './treaty'
import { relationOf } from './war'
import type { World } from './world/types'

/**
 * Соглядатаи (этап 82).
 *
 * Открытая дипломатия — половина дела: вторая половина в том, чтобы знать, чего
 * тебе не скажут. Свой человек при чужом дворе видит казну, войско и замысел;
 * он же однажды попадётся, и тогда об этом узнают все.
 *
 * В состоянии лежат только сами люди — кто где сидит и с какого дня. Что он
 * видит, считается из мира в день, когда спросили: донесение не хранится, как
 * не хранится и сводка казны.
 */

export interface Spy {
  readonly id: string
  readonly kingdomId: string
  readonly seat: SpySeat
  readonly sinceDay: number
  /** Раскрыт ли он. */
  readonly caught?: boolean
}

export function spiesOf(state: Pick<GameState, 'spies'>): readonly Spy[] {
  return (state.spies ?? []).filter((one) => one.caught !== true)
}

export function spyIn(state: Pick<GameState, 'spies'>, kingdomId: string): Spy | null {
  return spiesOf(state).find((one) => one.kingdomId === kingdomId) ?? null
}

export function seatDef(seat: SpySeat) {
  return SPY_SEAT_DEFS[seat]
}

export function findDef(find: SpyFind) {
  return SPY_FIND_DEFS[find]
}

/** Во что обходится человек и сколько он ест в сутки. */
export function spyCost(seat: SpySeat): number {
  return SPY_SEAT_DEFS[seat].cost
}

export function spyWages(state: Pick<GameState, 'spies'>): number {
  return spiesOf(state).reduce((sum, one) => sum + SPY_SEAT_DEFS[one.seat].wage, 0)
}

/**
 * Насколько он глубоко сидит.
 *
 * Чем дольше человек на месте, тем больше видит: за год при дворе он узнаёт
 * почти всё, что там знают. Заодно растёт и опасность — и это одна и та же
 * причина.
 */
export function depth(spy: Spy, day: number): number {
  const years = Math.max(0, day - spy.sinceDay) / 365
  return Math.round(SPY_SEAT_DEFS[spy.seat].sees * (1 + Math.min(2, years)))
}

/** Насколько вероятно, что его возьмут за сутки. */
export function catchChance(spy: Spy, day: number): number {
  const years = Math.max(0, day - spy.sinceDay) / 365
  return SPY_SEAT_DEFS[spy.seat].risk * (1 + Math.min(3, years))
}

export interface Report {
  readonly find: SpyFind
  readonly says: string
}

/**
 * Донесение (С2).
 *
 * Считается из мира, а не хранится: всё, что видит соглядатай, и так есть в
 * состоянии — только игроку это не показывают. Чем глубже человек сидит, тем
 * больше пунктов ему доступно.
 */
export function reportOf(state: GameState, world: World, spy: Spy, day: number): readonly Report[] {
  const deep = depth(spy, day)
  const out: Report[] = []
  const lords = state.politics.lords.filter((one) => one.kingdomId === spy.kingdomId)
  for (const find of SPY_FINDS) {
    if (deep < SPY_FIND_DEFS[find].needs) continue
    if (find === 'purse') {
      const places = Object.values(state.settlements).filter((one) => {
        if (one.population <= 0 || !one.owner) return false
        return one.owner === `crown:${spy.kingdomId}` || lords.some((lord) => lord.id === one.owner)
      })
      const people = places.reduce((sum, one) => sum + one.population, 0)
      out.push({
        find,
        says: `Мест ${places.length}, людей ${Math.round(people)}; с этого они и живут.`,
      })
      continue
    }
    if (find === 'host') {
      const men = lords.reduce((sum, one) => sum + one.strength, 0)
      out.push({ find, says: `Под рукой у короны и вассалов ${men} человек.` })
      continue
    }
    if (find === 'plan') {
      const plan = crownPlan(world, state.politics, state.settlements, spy.kingdomId)
      out.push({ find, says: `${plan.want}: ${plan.why}` })
      continue
    }
    if (find === 'house') {
      const house = royalHouse(world, spy.kingdomId, day)
      out.push({
        find,
        says: `${house.says} До смены колена ${yearsToSuccession(spy.kingdomId, day)} лет; ветвей ${house.branches}.`,
      })
      continue
    }
    // Тайная статья: та, что записана в грамоте с этой короной.
    const paper = liveTreaties(state, day).find(
      (one) =>
        (one.a === spy.kingdomId || one.b === spy.kingdomId) &&
        one.secret !== undefined &&
        one.secret.known !== true,
    )
    if (paper?.secret) {
      out.push({
        find,
        says: `В грамоте есть тайная статья: ${secretDef(paper.secret.id).label}. ${secretDef(paper.secret.id).about}`,
      })
    }
  }
  return out
}

// --- подкуп (С3) ------------------------------------------------------------

export interface BribeTarget {
  readonly id: string
  readonly name: string
  readonly role: string
  readonly price: number
  readonly says: string
}

/**
 * Кого можно купить при чужой короне.
 *
 * Не всякого и не дёшево: цена считается от того, чего стоит его земля, и от
 * того, насколько он верен. Купленный полгода говорит тебе то, что знает.
 */
export function bribeTargets(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): readonly BribeTarget[] {
  const lords = state.politics.lords.filter((one) => one.kingdomId === kingdomId)
  const places = Object.values(state.settlements).filter(
    (one) =>
      one.population > 0 &&
      (one.owner === `crown:${kingdomId}` || lords.some((lord) => lord.id === one.owner)),
  ).length
  const house = royalHouse(world, kingdomId, day)
  return lords
    .slice()
    .sort((a, b) => a.loyalty - b.loyalty)
    .slice(0, 3)
    .map((lord) => ({
      id: lord.id,
      name: `${lord.title} ${lord.name}`,
      role: `вассал ${house.title}а ${house.name}`,
      price: Math.max(
        200,
        Math.round(places * BRIBE.perPlace * (lord.loyalty > 60 ? BRIBE.loyal : 1)),
      ),
      says:
        lord.loyalty > 60
          ? 'Он верен, и потому дорог: такого покупают не серебром, а обидой.'
          : 'Он ропщет: с таким сговориться недорого.',
    }))
}

// --- свои тайны (С5) --------------------------------------------------------

/**
 * Кто смотрит за тобой.
 *
 * Чужие соглядатаи не хранятся: их столько, сколько корон, которым ты интересен
 * — тех, с кем у тебя плохо или кто считает тебя врагом. Чем их больше, тем
 * быстрее твои тайные статьи выходят наружу (этап 80).
 */
export function watchers(state: GameState, world: World, day: number): readonly string[] {
  const out: string[] = []
  for (const kingdomId of Object.keys(world.kingdoms)) {
    const relation = relationOf(state.politics, PLAYER, kingdomId)
    const plan = crownPlan(world, state.politics, state.settlements, kingdomId)
    if (relation < -20 || (plan.want === 'foe' && plan.targetId === PLAYER)) out.push(kingdomId)
  }
  return out
}

/** Во сколько раз быстрее выходит наружу твоё тайное при таком числе глаз. */
export function leakFactor(count: number): number {
  return 1 + count * 0.5
}

export { BRIBE, CAUGHT, RUMOUR, type SpyFind, type SpySeat }
