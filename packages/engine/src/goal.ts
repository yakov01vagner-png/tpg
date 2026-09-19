import { skillLevel } from './character'
import { CRAFT_RANKS } from './content/craft'
import { GOALS, GOALS_BY_ID, type GoalDef, type GoalStep } from './content/goals'
import { fameOf } from './fame'
import { PLAYER, holdingsOf } from './holding'
import { rankTier } from './magic'
import { orderById, rankOf } from './order'
import type { GameState } from './state'

/**
 * Ради чего (этап 70).
 *
 * Цель не ограничивает и ничего не запрещает: она называет, ради чего всё это, —
 * и по ней видно, куда следующий шаг. Считается целиком из состояния: у вехи
 * нет своего счётчика, есть только то, что в мире и правда есть.
 */

export function goalDef(id: string): GoalDef | null {
  return GOALS_BY_ID[id] ?? null
}

export function goalOf(state: Pick<GameState, 'goal'>): GoalDef | null {
  return state.goal ? goalDef(state.goal) : null
}

/** Сколько у тебя того, чем меряется эта веха. */
export function measureOf(state: GameState, step: GoalStep): number {
  switch (step.measure) {
    case 'money':
      return state.character.money
    case 'holdings':
      return holdingsOf(state.settlements, PLAYER).length
    case 'battles':
      return state.battlesWon
    case 'renown':
      return state.renown
    case 'magicRank':
      return rankTier(state.character.magicRank)
    case 'orderRank': {
      const order = state.guild ? orderById(state.guild.orderId) : null
      return order && state.guild ? rankOf(order, state.guild.standing) : 0
    }
    case 'skill':
      return step.skill ? skillLevel(state.character, step.skill) : 0
    case 'spouse':
      return state.character.family.spouse ? 1 : 0
    case 'heir':
      return state.character.family.children.length > 0 ? 1 : 0
    case 'realm':
      return state.realm ? 1 : 0
    case 'books':
      return Object.values(state.books ?? {}).filter((one) => one.read).length
    case 'artifacts':
      return (state.artifacts ?? []).length
    case 'fame':
      return step.circle ? fameOf(state, step.circle) : 0
    case 'ventures':
      return state.enterprises.length
    case 'craftRank': {
      let best = 0
      for (const shifts of Object.values(state.craft ?? {})) {
        for (const [index, rank] of CRAFT_RANKS.entries()) {
          if (shifts >= rank.shifts) best = Math.max(best, index)
        }
      }
      return best
    }
    case 'student':
      return state.student ? 1 : 0
    case 'pilgrim':
      return state.pilgrimDay !== undefined ? 1 : 0
    case 'brotherhood':
      return state.brotherhood ? 1 : 0
    case 'home':
      return state.home ? 1 : 0
    case 'ship':
      return state.ship ? 1 : 0
    case 'vassals':
      return state.politics.lords.filter((one) => one.kingdomId === PLAYER).length
    case 'places':
      return Object.keys(state.marks ?? {}).length
  }
}

/**
 * Взята ли веха. Для страха у люда и подобного счёт идёт вниз.
 *
 * Имя своё: `stepDone` в chain.ts считает шаг поручения руками, а это — веху
 * жизни. Одно слово на два разных дела путало бы оба.
 */
export function goalStepDone(state: GameState, step: GoalStep): boolean {
  const have = measureOf(state, step)
  return step.need >= 0 ? have >= step.need : have <= step.need
}

export interface GoalProgress {
  readonly goal: GoalDef
  readonly steps: readonly {
    readonly step: GoalStep
    readonly done: boolean
    readonly have: number
  }[]
  readonly done: number
  readonly total: number
  /** Что делать дальше: первая невзятая веха. */
  readonly next: GoalStep | null
}

export function goalProgress(state: GameState): GoalProgress | null {
  const goal = goalOf(state)
  if (!goal) return null
  const steps = goal.steps.map((step) => ({
    step,
    done: goalStepDone(state, step),
    have: measureOf(state, step),
  }))
  const done = steps.filter((one) => one.done).length
  return {
    goal,
    steps,
    done,
    total: steps.length,
    next: steps.find((one) => !one.done)?.step ?? null,
  }
}

/**
 * Что сделать дальше (Ц4).
 *
 * Подсказка знает цель: она называет ближайшую невзятую веху и то, сколько до
 * неё осталось. Не ведёт за руку — говорит, куда ты сам шёл.
 */
export function nextStepWords(state: GameState): string | null {
  const progress = goalProgress(state)
  if (!progress?.next) return null
  const step = progress.next
  const have = measureOf(state, step)
  if (step.need >= 0 && step.need > 1) return `${step.label}: ${have} из ${step.need}`
  if (step.need < 0) return `${step.label}: ${have} при нужных ${step.need}`
  return step.label
}

/** Все вехи, взятые за жизнь (Ц2). */
export function milestonesOf(state: Pick<GameState, 'milestones'>): readonly string[] {
  return state.milestones ?? []
}

export function milestoneKey(goalId: string, index: number): string {
  return `${goalId}:${index}`
}

/**
 * Итог жизни (Ц3).
 *
 * К концу человек знает, чего достиг: цель, взятые вехи и то, чем его
 * запомнят. Одной сводкой, а не поиском по журналу.
 */
export interface LifeSummary {
  readonly goal: string | null
  readonly done: number
  readonly total: number
  readonly milestones: number
  readonly said: string
}

export function lifeSummary(state: GameState): LifeSummary {
  const progress = goalProgress(state)
  const done = progress?.done ?? 0
  const total = progress?.total ?? 0
  const said =
    total === 0
      ? 'Ты жил без цели — и, может быть, это тоже цель.'
      : done >= total
        ? 'Ты дошёл туда, куда шёл. Такое случается реже, чем думают.'
        : done === 0
          ? 'Ты собирался, но так и не начал.'
          : `Полпути — это больше, чем у большинства: взято ${done} из ${total}.`
  return {
    goal: progress?.goal.label ?? null,
    done,
    total,
    milestones: milestonesOf(state).length,
    said,
  }
}

export const ALL_GOALS = GOALS
