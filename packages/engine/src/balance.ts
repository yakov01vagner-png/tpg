import { BALANCE, BALANCE_WORDS } from './content/balance'
import { dreadSeen, sideName } from './dread'
import { eraTweaks } from './era'
import { boundTo } from './league'
import { crownWarlust } from './lordlife'
import type { GameState } from './state'
import { theirWay } from './theirway'
import type { World } from './world/types'

/**
 * ИИ и равновесие (этап 143).
 *
 * Два дела: союз рвётся, когда союзник вырвался вперёд, и война объявляется
 * расчётом, а не броском. Считают короны то же, что считает мир вокруг игрока,
 * и той же меркой — по вестям, а не по правде.
 */

/** Кого бросают союзники за то, что он вырвался вперёд (Рв1 и Рв3). */
export function betrayers(
  state: GameState,
  world: World,
  day: number,
): readonly { readonly by: string; readonly of: string; readonly says: string }[] {
  const out: { by: string; of: string; says: string }[] = []
  for (const pact of state.politics.alliances) {
    for (const [by, of] of [
      [pact.a, pact.b],
      [pact.b, pact.a],
    ]) {
      if (!by || !of || !world.kingdoms[by] || !world.kingdoms[of]) continue
      // Доля берётся из такта гонки (этап 141): её уже посчитали.
      const share = state.raceLog?.shares?.[of] ?? theirWay(state, world, of, day).share
      if (share < BALANCE.betrayAt) continue
      out.push({
        by,
        of,
        says: `${BALANCE_WORDS.betrayed} ${sideName(world, by)} бросает ${sideName(world, of)}: тот прошёл ${Math.round(share * 100)} из ста.`,
      })
    }
  }
  return out
}

/**
 * Давление равновесия на объявление войны (Рв0).
 *
 * Множитель к низовому броску `war.ts`: опасающийся идёт охотнее, связанный —
 * почти никогда. Считается по тому, что дошло до `a`, а не по правде: ошибаться
 * в равновесии они тоже умеют.
 */
export function warPressure(
  state: GameState,
  world: World,
  a: string,
  b: string,
  day: number,
): number {
  if (a === b) return 0
  if (boundTo(state, world, b, a, day).bound) return BALANCE.bound
  // Берётся то, что уже посчитано тактом гонки (этап 141), а не считается
  // заново: давление спрашивают каждые сутки, и своих путей тут не осилить.
  const share = state.raceLog?.shares?.[b] ?? 0
  const balance = BALANCE.least + share * BALANCE.perShare
  // Нрав входит и сюда (этап 66): иначе расчётливая корона, которую часто
  // задевают, проводит в войне больше лет, чем воинственная, — а это было
  // правилом мира с 0.6.
  // Эпоха меняет правило для всех (этап 146): при порохе воюют охотнее, при
  // море — неохотнее.
  const era = eraTweaks(state, world, day).warPressure
  return Math.max(BALANCE.least, Math.min(1, balance * crownWarlust(a) * era))
}

/** Кто против кого и почему — сводка равновесия (Рв5). */
export function balanceSays(state: GameState, world: World, day: number): string {
  const rows = Object.keys(world.kingdoms).map((id) => {
    const worst = Object.keys(world.kingdoms)
      .filter((other) => other !== id)
      .map((other) => ({ other, score: dreadSeen(state, world, id, other, day).dread.score }))
      .sort((a, b) => b.score - a.score)[0]
    return `${sideName(world, id)} → ${worst ? `${sideName(world, worst.other)} (${worst.score})` : '—'}`
  })
  return `${BALANCE_WORDS.counted} ${BALANCE_WORDS.wrong} ${rows.join('; ')}.`
}

/** Равновесие в числах (Рв6). */
export function balanceLedger(
  state: GameState,
  world: World,
  day: number,
): { readonly betrayals: number; readonly wars: number; readonly says: string } {
  const log = state.balanceLog ?? { betrayals: 0, wars: 0 }
  return {
    betrayals: log.betrayals,
    wars: log.wars,
    says: `${BALANCE_WORDS.dice} Союзов брошено по расчёту ${log.betrayals}; войн начато равновесием ${log.wars}.`,
  }
}

export { BALANCE, BALANCE_WORDS }
