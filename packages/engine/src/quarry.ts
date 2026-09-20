import {
  QUARRY,
  QUARRY_WORDS,
  SPOTS,
  SPOT_DEFS,
  type SpotId,
  USES,
  USE_DEFS,
  type UseId,
} from './content/quarry'
import { vassalsOf } from './court'
import { sideName } from './dread'
import { ageOf } from './dynasty'
import { PLAYER, garrisonSize, holdingsOf } from './holding'
import { aimedAtPlayer, crownGame } from './mind'
import { canSeePicture } from './picture'
import type { GameState } from './state'
import { debtsOf } from './treasury'
import { relationOf, warsOf } from './war'
import type { World } from './world/types'

/**
 * Игрок в их партии (этап 199).
 *
 * Партия у короны есть с 0.7, и игрок в неё попадает — но попадает как
 * королевство с числом силы. Того, чем он отличается от короны, чужой расчёт не
 * видел: долгов, пустых стен, вассала, смотрящего на сторону, бездетной
 * старости. Оттого против игрока нельзя было играть — на него можно было
 * только пойти войной.
 *
 * Здесь всё это считается — из того же состояния, без единого нового поля, — и
 * попадает в чужой замысел через слой знания: узнать, что против тебя ведут
 * партию, можно, но не даром.
 */

export interface Spot {
  readonly id: SpotId
  readonly weight: number
  readonly says: string
}

/** Чем ты слаб — теми же глазами, какими на тебя смотрят (Иг3). */
export function weakSpots(state: GameState, world: World, day: number): readonly Spot[] {
  const owed = debtsOf(state).reduce((sum, one) => sum + one.owed, 0)
  const mine = holdingsOf(state.settlements, PLAYER)
  const bare = mine.filter((one) => garrisonSize(one) < QUARRY.bareGarrison).length
  const restless = vassalsOf(state).filter((one) => one.loyalty < QUARRY.restlessAt).length
  const age = ageOf(state.character.bornDay, day)
  const heirs = state.character.family.children.length
  const scores: Record<SpotId, number> = {
    // Чем больше долг, тем раньше за него берутся: мелкий помнят, крупным ведут.
    debt: owed > 0 ? Math.min(2, 1 + owed / QUARRY.debtBites) : 0,
    bare: mine.length > 0 ? bare / mine.length : 0,
    restless: restless > 0 ? 1 : 0,
    old: age >= QUARRY.oldAt ? 1 : 0,
    alone: mine.length > 0 && heirs === 0 ? 1 : 0,
  }
  const counted: Record<SpotId, string> = {
    debt: `должен ${owed}`,
    bare: `мест без гарнизона ${bare} из ${mine.length}`,
    restless: `вассалов, смотрящих на сторону, ${restless}`,
    old: `тебе ${age}`,
    alone: `наследников ${heirs}, земель ${mine.length}`,
  }
  return SPOTS.map((id) => ({
    id,
    weight: Math.round(scores[id] * SPOT_DEFS[id].weight * 100) / 100,
    says: `${SPOT_DEFS[id].label} (${counted[id]}): ${SPOT_DEFS[id].about} Делают так: ${SPOT_DEFS[id].used}.`,
  }))
    .filter((one) => one.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, QUARRY.shows)
}

/**
 * Партия против тебя (Иг1, Иг2).
 *
 * Замысел берётся тот же, каким корона смотрит на всех (`crownGame`): игрок
 * входит в него теми же правилами. Своё здесь только одно — за что именно
 * берутся, и это твои же слабости.
 */
export function gameAgainst(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): {
  readonly aimed: boolean
  readonly aim: string
  readonly next: string
  readonly spots: readonly Spot[]
  readonly years: number
  readonly says: string
} {
  const gambit = crownGame(state, world, kingdomId, day)
  const aimed = gambit.targetId === PLAYER
  const spots = weakSpots(state, world, day)
  const first = spots[0]
  return {
    aimed,
    aim: gambit.aim,
    next: gambit.next,
    spots,
    years: QUARRY.years,
    says: aimed
      ? `${QUARRY_WORDS.long} ${sideName(world, kingdomId)}: дорога «${gambit.aim}», следующий шаг «${gambit.next}», лет на ${QUARRY.years}. ${
          first ? `Берут за то, что ${first.says}` : 'Слабого места пока не видно.'
        }`
      : `${sideName(world, kingdomId)} целит не в тебя: дорога «${gambit.aim}» ведёт к ${sideName(world, gambit.targetId ?? '—')}. ${QUARRY_WORDS.piece}`,
  }
}

/** Как тобой пользуются, не воюя с тобой (Иг4). */
export function usedBy(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): readonly { readonly id: UseId; readonly says: string }[] {
  const gambit = crownGame(state, world, kingdomId, day)
  const yourWars = warsOf(state.politics, PLAYER)
  const theirWars = warsOf(state.politics, kingdomId)
  const relation = relationOf(state.politics, PLAYER, kingdomId)
  const rows: { id: UseId; on: boolean; why: string }[] = [
    {
      id: 'set',
      // Натравливают тогда, когда твоя война — их выгода: ты воюешь того, кого
      // они и так хотели ослабить.
      on: yourWars.some((war) => gambit.targetId === (war.a === PLAYER ? war.b : war.a)),
      why: 'твоя война идёт против того, кого они сами метят ослабить',
    },
    {
      id: 'shield',
      on: yourWars.length > 0 && theirWars.length === 0 && relation >= 0,
      why: 'ты воюешь, они нет, и на них никто не смотрит',
    },
    {
      id: 'pay',
      on: gambit.aim === 'wed' || gambit.aim === 'coin',
      why: 'обещают то, чего у них нет: чужую землю и чужую дань',
    },
  ]
  return rows
    .filter((row) => row.on)
    .map((row) => ({
      id: row.id,
      says: `${USE_DEFS[row.id].label}: ${USE_DEFS[row.id].about} Здесь — ${row.why}.`,
    }))
}

/** Что из этого ты можешь знать (Иг5). */
export function gameSeen(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): { readonly can: boolean; readonly says: string } {
  const gate = canSeePicture(state, kingdomId)
  const game = gameAgainst(state, world, kingdomId, day)
  if (!gate.can) {
    return {
      can: false,
      says: `${sideName(world, kingdomId)}: ${QUARRY_WORDS.blind} ${gate.why} Видно только сделанное.`,
    }
  }
  const uses = usedBy(state, world, kingdomId, day)
  return {
    can: true,
    says: `${QUARRY_WORDS.seen} ${gate.why}. ${game.says} ${uses.length > 0 ? `${QUARRY_WORDS.used} ${uses.map((one) => one.says).join(' ')}` : 'Тобой сейчас не пользуются.'}`,
  }
}

/** Партии против тебя в числах (Иг6). */
export function quarryRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly against: number
  readonly spots: number
  readonly uses: number
  readonly says: string
} {
  const against = aimedAtPlayer(state, world, day)
  const spots = weakSpots(state, world, day)
  const uses = Object.keys(world.kingdoms).filter(
    (one) => one !== PLAYER && usedBy(state, world, one, day).length > 0,
  ).length
  return {
    against: against.length,
    spots: spots.length,
    uses,
    says: `${QUARRY_WORDS.piece} Партий против тебя ${against.length}, тобой пользуются ${uses} корон; твоих слабых мест видно ${spots.length}: ${
      spots.map((one) => SPOT_DEFS[one.id].label).join(', ') || '—'
    }. ${USES.length > 0 ? QUARRY_WORDS.used : ''}`,
  }
}
