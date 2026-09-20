import type { CrownWantId } from './content/plans'
import {
  CROWN_REASONS,
  CROWN_RULES,
  CROWN_RULE_DEFS,
  type CrownRuleId,
  REASON_WORDS,
} from './content/reasons'
import { overgrown } from './diplomacy'
import { sideName } from './dread'
import { PLAYER } from './holding'
import { crownOf, crownWarlust } from './lordlife'
import { crownGame, gambitWords } from './mind'
import { canSeePicture } from './picture'
import { type CrownPlan, crownBestRelation, crownPlan, crownWars } from './plans'
import type { GameState } from './state'
import { pairOf } from './war'
import type { World } from './world/types'

/**
 * Решение, которое объясняется (этап 197).
 *
 * Корона решает с этапа 72, и строка «почему» была при решении с самого начала.
 * Но она писалась рядом с решением, а не была им: нигде не сказано, какое
 * правило сработало, какие не сработали и почему именно это стоит первым.
 *
 * Здесь правила вынесены в `content/reasons.ts` и читаются тем же условием, по
 * которому решает `plans.ts`: `ruleOf` обязана совпадать с `crownPlan` на любой
 * короне в любой день — это и есть честность объяснения (Рш4), и это
 * проверяется веком.
 */

export interface Reason {
  readonly id: CrownRuleId
  readonly fired: boolean
  readonly want: CrownWantId
  readonly targetId: string | null
  readonly says: string
}

/**
 * Все правила короны разом: какое сработало и почему не сработали прочие
 * (Рш1, Рш3).
 *
 * Условия те же и в том же порядке, что в `crownPlan`. Ни одного своего: где
 * объяснение считало бы по-своему, оно врало бы складно.
 */
export function reasonsOf(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): readonly Reason[] {
  const politics = state.politics
  const crown = crownOf(kingdomId)
  const name = (id: string | null) => (id === null ? '—' : sideName(world, id))
  const enemies = crownWars(politics, kingdomId)
  const foe = enemies[0] ?? null
  const owes = politics.tributes.find((one) => one.from === kingdomId) ?? null
  const giant = overgrown(world, state.settlements)
  const lusty = crownWarlust(kingdomId) >= CROWN_REASONS.lustGoesAlone
  const versusGiant = giant !== null && giant !== kingdomId
  const helper = versusGiant ? crownBestRelation(world, politics, kingdomId, [giant]) : null
  const friend = crownBestRelation(world, politics, kingdomId, [])
  const warm =
    friend !== null && (politics.relations[pairOf(kingdomId, friend)] ?? 0) > CROWN_REASONS.warmWeds

  const rows: {
    id: CrownRuleId
    on: boolean
    want: CrownWantId
    target: string | null
    why: string
  }[] = [
    {
      id: 'atWar',
      on: foe !== null,
      want: 'foe',
      target: foe,
      why: foe ? `война с ${name(foe)} идёт` : 'войны нет',
    },
    {
      id: 'owes',
      on: owes !== null,
      want: 'tribute',
      target: owes?.to ?? null,
      why: owes ? `платит ${name(owes.to)} ${owes.perDay} в сутки` : 'дани не платит',
    },
    {
      id: 'fearsGiant',
      on: versusGiant && lusty,
      want: 'foe',
      target: giant,
      why: !versusGiant
        ? 'никто не вырос настолько'
        : lusty
          ? `${name(giant)} вырос, и нрав велит идти самому`
          : `${name(giant)} вырос, но нрава на это не хватает`,
    },
    {
      id: 'seeksHelp',
      on: versusGiant && !lusty && helper !== null,
      want: 'ally',
      target: helper,
      why: !versusGiant
        ? 'никто не вырос настолько'
        : lusty
          ? 'пойдёт сама, союзник не нужен'
          : helper
            ? `против ${name(giant)} одной не встать, ближе всех ${name(helper)}`
            : 'союзника не нашлось',
    },
    {
      id: 'holds',
      on: giant === kingdomId,
      want: 'rest',
      target: null,
      why: giant === kingdomId ? 'взято много, удержать бы' : 'не она выросла',
    },
    {
      id: 'weds',
      on: warm,
      want: 'marry',
      target: friend,
      why: warm
        ? `с ${name(friend)} отношение ${politics.relations[pairOf(kingdomId, friend as string)] ?? 0}`
        : 'ни с кем не настолько в ладу',
    },
    { id: 'quiet', on: true, want: 'rest', target: null, why: 'ничего не подвернулось' },
  ]

  // Сработавшим считается первое: череда, а не голосование, — как в `plans.ts`.
  const first = rows.findIndex((row) => row.on)
  return rows.map((row, index) => ({
    id: row.id,
    fired: index === first,
    want: row.want,
    targetId: row.target,
    says:
      index === first
        ? `${crown.title} ${crown.name}: ${CROWN_RULE_DEFS[row.id].does} — ${row.why}. ${CROWN_RULE_DEFS[row.id].before}`
        : `не ${CROWN_RULE_DEFS[row.id].label}: ${row.why}`,
  }))
}

/** Какое правило решило (Рш1, Рш4). */
export function ruleOf(state: GameState, world: World, kingdomId: string, day: number): Reason {
  const rows = reasonsOf(state, world, kingdomId, day)
  return (rows.find((row) => row.fired) ?? rows[rows.length - 1]) as Reason
}

/** То же решение, каким его вернёт `plans.ts` (Рш4). */
export function planOf(state: GameState, world: World, kingdomId: string): CrownPlan {
  return crownPlan(world, state.politics, state.settlements, kingdomId)
}

/** Чей это шаг: ход внутри долгой партии (Рш2). */
export function chainOf(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): { readonly says: string; readonly next: string; readonly able: boolean } {
  const gambit = crownGame(state, world, kingdomId, day)
  const rule = ruleOf(state, world, kingdomId, day)
  return {
    next: gambit.next,
    able: gambit.able,
    says: `${REASON_WORDS.chain} ${gambitWords(gambit, world)} Сегодняшний ход: ${CROWN_RULE_DEFS[rule.id].does}.`,
  }
}

/** Почему не сделано прочее (Рш3). */
export function refusalsOf(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): readonly string[] {
  return reasonsOf(state, world, kingdomId, day)
    .filter((row) => !row.fired)
    .map((row) => row.says)
}

/**
 * Объяснение, какое доступно игроку (Рш5).
 *
 * Слой знания тот же, что у картины мира (этап 115): без соглядатая и без
 * посольства игрок видит ход, но не череду за ним, и знает об этом.
 */
export function reasonSeen(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): { readonly can: boolean; readonly says: string } {
  const rule = ruleOf(state, world, kingdomId, day)
  const gate = canSeePicture(state, kingdomId)
  if (!gate.can) {
    return {
      can: false,
      says: `${sideName(world, kingdomId)}: видно только сделанное — ${CROWN_RULE_DEFS[rule.id].does}. ${REASON_WORDS.guessed} ${gate.why}`,
    }
  }
  return {
    can: true,
    says: `${REASON_WORDS.seen} ${gate.why}. ${rule.says} ${refusalsOf(state, world, kingdomId, day).join('; ')}.`,
  }
}

/** Решения в числах (Рш6). */
export function reasonRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly byRule: Readonly<Record<string, number>>
  readonly wrong: number
  readonly says: string
} {
  const byRule: Record<string, number> = {}
  for (const id of Object.keys(world.kingdoms)) {
    if (id === PLAYER) continue
    const rule = ruleOf(state, world, id, day)
    byRule[rule.id] = (byRule[rule.id] ?? 0) + 1
  }
  // Ошибкой считается то, что мир назвал ошибкой: пошёл войной и уступил.
  const wrong = (state.peaces ?? []).filter(
    (one) => one.yielded !== PLAYER && one.yielded === one.against,
  ).length
  return {
    byRule,
    wrong,
    says: `${REASON_WORDS.named} Сейчас решают так: ${CROWN_RULES.filter((id) => byRule[id])
      .map((id) => `${CROWN_RULE_DEFS[id].label} — ${byRule[id]}`)
      .join(', ')}. Решений, вышедших ошибкой: ${wrong}. ${REASON_WORDS.honest}`,
  }
}
