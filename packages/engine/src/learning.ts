import { biasDef, biasOf } from './bias'
import { LEARN, LEARN_WORDS } from './content/learning'
import { RUSES, RUSE_DEFS, type RuseKind } from './content/ruse'
import { sideName } from './dread'
import { PLAYER } from './holding'
import { crownGame, seenStrength, strengthOf } from './mind'
import { rusesOf, wiseTo } from './ruse'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Ошибка и учение (этап 198).
 *
 * Ошибаться корона умела с 0.8: нрав кривил догадку, вести её поправляли. Но
 * ошибка ничему не учила. Проигравший считал противника так же, как до войны, а
 * приём игрока проходил в десятый раз так же легко, как в первый: против короны
 * можно было играть одну и ту же партию век.
 *
 * Учение живёт там же, где считается ошибка: в `mind.ts` (битый видит вернее),
 * в `ruse.ts` (повтор выдыхается) и в партии (дважды уступивший меняет дорогу).
 * Здесь оно только читается и считается — своего счёта у него нет.
 */

/** Чем ошибается именно он (Ош1). */
export function errsBy(
  state: GameState,
  world: World,
  kingdomId: string,
  about: string,
  day: number,
): {
  readonly off: number
  readonly truth: number
  readonly thought: number
  readonly says: string
} {
  const truth = strengthOf(state, world, about, day).score
  const seen = seenStrength(state, world, kingdomId, about, day)
  const def = biasDef(biasOf(kingdomId))
  return {
    off: seen.error,
    truth,
    thought: seen.score,
    says: `${sideName(world, kingdomId)} о ${sideName(world, about)}: думает ${seen.score} против ${truth} (ошибка ${seen.error}). ${LEARN_WORDS.own} Его перекос: ${def.label} — ${def.about}`,
  }
}

/** Чему научила война (Ош2). */
export function taughtBy(
  state: GameState,
  world: World,
  kingdomId: string,
  about: string,
  day: number,
): {
  readonly beaten: number
  readonly before: number
  readonly after: number
  readonly says: string
} {
  const beaten = (state.peaces ?? []).filter(
    (one) => one.yielded === kingdomId && one.against === about,
  ).length
  const after = Math.abs(errsBy(state, world, kingdomId, about, day).off)
  const clean: GameState = { ...state, peaces: [] }
  const before = Math.abs(errsBy(clean, world, kingdomId, about, day).off)
  return {
    beaten,
    before,
    after,
    says:
      beaten === 0
        ? `${sideName(world, kingdomId)} не уступал ${sideName(world, about)} и считает его как считал: ошибка ${after}.`
        : `${LEARN_WORDS.cost} Уступал ${beaten}: ошибка была ${before}, стала ${after}.`,
  }
}

/** Чему он научился на тебе и с какого дня (Ош3, Ош5). */
export function learnedOn(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): readonly {
  readonly kind: RuseKind
  readonly times: number
  readonly adds: number
  readonly sinceDay: number
  readonly says: string
}[] {
  const rows = RUSES.map((kind) => {
    const wise = wiseTo(state, kind, day)
    const first = rusesOf(state)
      .filter((one) => one.kind === kind && one.sinceDay <= day)
      .map((one) => one.sinceDay)
      .sort((a, b) => a - b)[0]
    return {
      kind,
      times: wise.times,
      adds: wise.adds,
      sinceDay: first ?? 0,
      says: `${RUSE_DEFS[kind].label}: показан ${wise.times} раз с ${first ?? 0} сут, раскусят на ${Math.round(wise.adds * 100)} из ста вернее. ${LEARN_WORDS.fresh}`,
    }
  })
    .filter((one) => one.times > 0)
    .sort((a, b) => b.times - a.times)
  return rows.slice(0, LEARN.shows)
}

/** Какую дорогу он сменил и почему (Ош4). */
export function triesNew(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): { readonly changed: boolean; readonly aim: string; readonly says: string } {
  const now = crownGame(state, world, kingdomId, day)
  const clean = crownGame({ ...state, peaces: [] }, world, kingdomId, day)
  const changed = now.aim !== clean.aim
  return {
    changed,
    aim: now.aim,
    says: changed
      ? `${LEARN_WORDS.anew} Была дорога «${clean.aim}», стала «${now.aim}»: ${now.why}`
      : now.why !== clean.why
        ? // Дорога совпала случайно: он пришёл к ней не тем, чем прежде.
          `${LEARN_WORDS.anew} Дорога та же — «${now.aim}», — но уже не по прежней причине: ${now.why}`
        : `${sideName(world, kingdomId)} идёт прежней дорогой «${now.aim}»: ${now.why}`,
  }
}

/** Учение одним взглядом (Ош5). */
export function crownLearnedSays(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): string {
  const learned = learnedOn(state, world, kingdomId, day)
  return [
    `${LEARN_WORDS.seen} ${sideName(world, kingdomId)}:`,
    learned.length > 0
      ? `${LEARN_WORDS.onYou} ${learned.map((one) => one.says).join(' ')}`
      : 'На тебе он пока ничему не научился: ты не повторялся.',
    triesNew(state, world, kingdomId, day).says,
  ].join(' ')
}

/** Учение в числах (Ош6). */
export function crownLearningRoll(
  state: GameState,
  world: World,
  kingdomId: string,
  kind: RuseKind,
  day: number,
): { readonly times: number; readonly adds: number; readonly says: string } {
  const wise = wiseTo(state, kind, day)
  return {
    times: wise.times,
    adds: wise.adds,
    says: `${RUSE_DEFS[kind].label} против ${sideName(world, kingdomId)}: показан ${wise.times} раз, каждый повтор прибавляет ${LEARN.perRepeat} к зоркости, забудут через ${LEARN.forgetsDays} сут.`,
  }
}
