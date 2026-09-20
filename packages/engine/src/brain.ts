import { biasDef, biasOf } from './bias'
import { BRAIN_WORDS, WEIGHT_TABLES } from './content/brain'
import { CROWN_RULE_DEFS } from './content/reasons'
import { sideName } from './dread'
import { PLAYER } from './holding'
import { aimedAtPlayer, crownGame } from './mind'
import { ruleOf } from './reasons'
import { changedBy, sovereignOf } from './sovereign'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * ИИ в числах (этап 200).
 *
 * К 1.0 у корон есть человек (этап 196), объяснимое решение (197), учение (198)
 * и партия против игрока (199). Чего не было — общего взгляда: проверить, что
 * все они не одно и то же с разными именами, было нечем.
 *
 * Здесь ум мира сводится в одно место и меряется числом: чем короны
 * расходятся, к чему мир приходит сам и что в нём меняет игрок.
 */

export interface MindRow {
  readonly kingdomId: string
  readonly rule: string
  readonly aim: string
  readonly next: string
  readonly taste: number
  readonly bias: string
  readonly says: string
}

/** Весь ум мира на одном месте (Ии1). */
export function worldMind(state: GameState, world: World, day: number): readonly MindRow[] {
  return Object.keys(world.kingdoms)
    .filter((one) => one !== PLAYER)
    .map((kingdomId) => {
      const rule = ruleOf(state, world, kingdomId, day)
      const gambit = crownGame(state, world, kingdomId, day)
      const taste = changedBy(state, world, kingdomId, day).taste
      const bias = biasDef(biasOf(kingdomId))
      const one = sovereignOf(state, world, kingdomId, day)
      return {
        kingdomId,
        rule: rule.id,
        aim: gambit.aim,
        next: gambit.next,
        taste,
        bias: bias.label,
        says: `${sideName(world, kingdomId)} (${one.house.name}, ${one.age} лет): ${CROWN_RULE_DEFS[rule.id].does}; дорога «${gambit.aim}», шаг «${gambit.next}»; охота воевать ${taste}, смотрит ${bias.label}.`,
      }
    })
}

/** Чем короны расходятся — числом (Ии2). */
export function crownsDiffer(
  state: GameState,
  world: World,
  day: number,
): {
  readonly aims: number
  readonly rules: number
  readonly spread: number
  readonly says: string
} {
  const rows = worldMind(state, world, day)
  const aims = new Set(rows.map((one) => one.aim)).size
  const rules = new Set(rows.map((one) => one.rule)).size
  const tastes = rows.map((one) => one.taste)
  const spread =
    tastes.length > 0 ? Math.round((Math.max(...tastes) - Math.min(...tastes)) * 100) / 100 : 0
  return {
    aims,
    rules,
    spread,
    says: `${BRAIN_WORDS.differ} Корон ${rows.length}: разных дорог ${aims}, разных правил ${rules}, охота воевать расходится на ${spread}.`,
  }
}

/** Ум мира в числах (Ии3, Ии4, Ии6). */
export function mindRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly wars: number
  readonly alliances: number
  readonly tributes: number
  readonly aims: Readonly<Record<string, number>>
  readonly rules: Readonly<Record<string, number>>
  readonly againstPlayer: number
  readonly learned: number
  readonly says: string
} {
  const rows = worldMind(state, world, day)
  const aims: Record<string, number> = {}
  const rules: Record<string, number> = {}
  for (const row of rows) {
    aims[row.aim] = (aims[row.aim] ?? 0) + 1
    rules[row.rule] = (rules[row.rule] ?? 0) + 1
  }
  // Научившимся считается тот, кто уже платил за свою ошибку: уступивший.
  const learned = new Set(
    (state.peaces ?? []).filter((one) => one.yielded !== PLAYER).map((one) => one.yielded),
  ).size
  const differ = crownsDiffer(state, world, day)
  return {
    wars: state.politics.wars.length,
    alliances: state.politics.alliances.length,
    tributes: state.politics.tributes.length,
    aims,
    rules,
    againstPlayer: aimedAtPlayer(state, world, day).length,
    learned,
    says: `${BRAIN_WORDS.one} Войн ${state.politics.wars.length}, союзов ${state.politics.alliances.length}, даней ${state.politics.tributes.length}. Дороги: ${Object.entries(
      aims,
    )
      .map(([id, count]) => `${id} ${count}`)
      .join(
        ', ',
      )}. Партий против тебя ${aimedAtPlayer(state, world, day).length}, научившихся на своих ошибках ${learned}. ${differ.says}`,
  }
}

/** Все веса решений — в содержимом (Ии5). */
export function weightsUsed(): {
  readonly tables: readonly string[]
  readonly says: string
} {
  return {
    tables: WEIGHT_TABLES.map((one) => one.file),
    says: `${BRAIN_WORDS.open} Таблиц ${WEIGHT_TABLES.length}: ${WEIGHT_TABLES.map(
      (one) => `${one.file} — ${one.holds}`,
    ).join('; ')}.`,
  }
}
