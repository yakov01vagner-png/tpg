import { bandSize } from './band'
import {
  DEFEATS,
  DEFEAT_DEFS,
  type DefeatId,
  HOLDS,
  HOLD_DEFS,
  type HoldId,
  RISK,
  RISK_WORDS,
} from './content/risk'
import { sideName } from './dread'
import { PLAYER, holdingsOf } from './holding'
import { crownDebtsOf } from './lever'
import { partySize } from './party'
import type { GameState } from './state'
import { warsOf } from './war'
import { guaranteesOf } from './ward'
import type { World } from './world/types'

/**
 * Цена риска и старые долги (этап 153).
 *
 * Поражение перестаёт быть двоичным: у него шесть степеней с именами, и видно
 * заранее, на какую именно ты рискуешь. Заодно закрываются два старых долга:
 * свою крепость можно оборонять, а в чужой бой — прийти.
 */

export function defeatDef(id: DefeatId) {
  return DEFEAT_DEFS[id]
}

export function holdDef(id: HoldId) {
  return HOLD_DEFS[id]
}

/** Чем ты рискуешь в этой войне — заранее и по именам (Рс1 и Рс2). */
export function riskOf(
  state: GameState,
  world: World,
  against: string,
  day: number,
): { readonly worst: DefeatId; readonly says: string } {
  const mine = holdingsOf(state.settlements, PLAYER).length
  const wars = warsOf(state.politics, PLAYER).length
  // Чем меньше земли и чем больше войн, тем глубже может зайти поражение.
  const worst: DefeatId =
    mine === 0 ? 'fall' : mine <= 2 ? 'vassal' : mine <= 5 ? 'loss' : wars > 1 ? 'tribute' : 'toll'
  return {
    worst,
    says: `${RISK_WORDS.named} С ${sideName(world, against)} ты рискуешь дойти до «${DEFEAT_DEFS[worst].label}»: ${DEFEAT_DEFS[worst].says} Платится ${DEFEAT_DEFS[worst].costs}. ${RISK_WORDS.degrees}`,
  }
}

/** Что осталось от прошлых поражений (Рс3). */
export function oldDebts(
  state: GameState,
  world: World,
  day: number,
): {
  readonly tributes: number
  readonly debts: number
  readonly bonds: number
  readonly says: string
} {
  const tributes = state.politics.tributes.filter((one) => one.from === PLAYER).length
  const debts = crownDebtsOf(state).length
  const bonds = guaranteesOf(state).filter(
    (one) => one.of === PLAYER && one.brokenDay === undefined,
  ).length
  return {
    tributes,
    debts,
    bonds,
    says: `${RISK_WORDS.debts} Дани с тебя ${tributes}, долгов ${debts}, поручительств за тебя ${bonds}.`,
  }
}

/** Кто стоит под твоими стенами (Рс0). */
export function siegeOnMe(
  state: GameState,
  world: World,
  day: number,
): {
  readonly locationId: string | null
  readonly by: string | null
  readonly men: number
  readonly moves: readonly { readonly move: HoldId; readonly cost: number; readonly says: string }[]
  readonly says: string
} {
  const here = state.settlements[state.locationId]
  const foes = state.bands.filter(
    (one) =>
      one.locationId === state.locationId &&
      one.lordId !== PLAYER &&
      one.kingdomId !== null &&
      warsOf(state.politics, PLAYER).some(
        (war) => war.a === one.kingdomId || war.b === one.kingdomId,
      ),
  )
  const men = foes.reduce((sum, one) => sum + bandSize(one), 0)
  if (!here || here.owner !== PLAYER || men === 0) {
    return {
      locationId: null,
      by: null,
      men: 0,
      moves: [],
      says: `${RISK_WORDS.walls} Под стенами никого.`,
    }
  }
  const by = foes[0]?.kingdomId ?? null
  const mine = Math.round(partySize(state.party) * RISK.wallsWorth)
  const moves = HOLDS.map((move) => ({
    move,
    cost: move === 'pay' ? men * RISK.payPerMan : 0,
    says: `${HOLD_DEFS[move].label}: ${HOLD_DEFS[move].says}${move === 'pay' ? ` Просят ${men * RISK.payPerMan}.` : ''}`,
  }))
  return {
    locationId: here.locationId,
    by,
    men,
    moves,
    says: `${RISK_WORDS.walls} Под стенами ${men} человек${by ? ` (${sideName(world, by)})` : ''}; за стенами твоих ${mine}.`,
  }
}

/** Чужой бой у тебя на глазах (Рс0б). */
export function otherFight(
  state: GameState,
  world: World,
  day: number,
): { readonly sides: readonly string[]; readonly says: string } {
  const here = state.bands.filter(
    (one) => one.locationId === state.locationId && one.kingdomId !== null && one.lordId !== PLAYER,
  )
  const sides = [...new Set(here.map((one) => one.kingdomId as string))]
  const fighting = sides.filter((a) =>
    sides.some(
      (b) => a !== b && warsOf(state.politics, a).some((war) => war.a === b || war.b === b),
    ),
  )
  return {
    sides: fighting,
    says:
      fighting.length >= 2
        ? `${RISK_WORDS.other} Здесь бьются ${fighting.map((id) => sideName(world, id)).join(' и ')}.`
        : 'Чужого боя здесь нет.',
  }
}

/** Двор после поражения (Рс4) и то, что делать с чужим (Рс5). */
export function afterDefeat(
  state: GameState,
  world: World,
  day: number,
): { readonly courtMoves: number; readonly says: string } {
  const debts = oldDebts(state, world, day)
  return {
    courtMoves: RISK.courtAfter,
    says: `${RISK_WORDS.court} Верность двора ${RISK.courtAfter} за проигранную войну. ${debts.says} ${RISK_WORDS.theirs} Добивающего мир холодит на ${RISK.finishing}.`,
  }
}

export { RISK, RISK_WORDS, DEFEATS, DEFEAT_DEFS, HOLDS, HOLD_DEFS, type DefeatId, type HoldId }
