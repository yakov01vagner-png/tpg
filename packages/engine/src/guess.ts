import { bandSize } from './band'
import {
  GUESS,
  GUESS_WORDS,
  PLAYER_AIM_DEFS,
  type PlayerAim,
  TELL_DEFS,
  type TellKind,
} from './content/guess'
import { PLAYER } from './holding'
import { strengthOf } from './mind'
import type { GameState } from './state'
import { atWar, relationOf } from './war'
import { neighbourSettlements } from './world/queries'
import type { World } from './world/types'

/**
 * Он делает выводы (этап 119).
 *
 * Картина мира (этап 118) сказала, что корона знает о числах. Здесь она выводит
 * из этого замысел: не «сколько у него людей», а «чего он хочет». Вывод
 * называется вслух, бывает неверным, меняет её поведение заранее — и сбивается
 * ходами, которые ничего не значат.
 *
 * Приметы не хранятся: они выводятся из мира. Хранится только то, чего вывести
 * нельзя, — сколько раз корона уже видела эту примету (она учится) и к какому
 * выводу пришла (она по нему готовится).
 */

export interface Tell {
  readonly kind: TellKind
  readonly weight: number
  readonly says: string
}

/** Что видно со стороны (Вы1). */
export function tellsOf(
  state: GameState,
  world: World,
  watcher: string,
  day: number,
): readonly Tell[] {
  const out: Tell[] = []
  // Видно и отряд при государе, и его отдельные части: со стороны это одно
  // войско.
  const men =
    state.bands
      .filter((one) => one.lordId === PLAYER)
      .reduce((sum, one) => sum + bandSize(one), 0) +
    Object.values(state.party.units).reduce((sum, one) => sum + (one ?? 0), 0)
  const places = Object.values(state.settlements).filter((one) => one.owner === PLAYER).length
  if (men > places * 25 + 40) {
    out.push({ kind: 'muster', weight: TELL_DEFS.muster.weight, says: TELL_DEFS.muster.about })
  }
  // Части у их границы: то, откуда ходят не домой.
  const theirs = Object.values(state.settlements).filter((one) => {
    if (!one.owner) return false
    if (one.owner === `crown:${watcher}`) return true
    return state.politics.lords.some((lord) => lord.id === one.owner && lord.kingdomId === watcher)
  })
  const nearThem = new Set<string>()
  for (const place of theirs.slice(0, 8)) {
    for (const step of neighbourSettlements(world, place.locationId, 3)) nearThem.add(step.id)
  }
  if (state.bands.some((one) => one.lordId === PLAYER && nearThem.has(one.locationId))) {
    out.push({ kind: 'border', weight: TELL_DEFS.border.weight, says: TELL_DEFS.border.about })
  }
  if ((state.embassies ?? []).length > 0 || (state.residents ?? []).length > 0) {
    out.push({ kind: 'envoys', weight: TELL_DEFS.envoys.weight, says: TELL_DEFS.envoys.about })
  }
  if (state.character.money > 20000) {
    out.push({ kind: 'purse', weight: TELL_DEFS.purse.weight, says: TELL_DEFS.purse.about })
  }
  if (
    state.siege ||
    state.bands.some((one) => one.lordId === PLAYER && one.goal.type === 'siege')
  ) {
    out.push({ kind: 'sieges', weight: TELL_DEFS.sieges.weight, says: TELL_DEFS.sieges.about })
  }
  // Пустые ходы: обманы, которые ничего за собой не имеют (этап 112).
  const noise = (state.ruses ?? []).filter((one) => day < one.untilDay).length
  for (let i = 0; i < Math.min(3, noise); i += 1) {
    out.push({ kind: 'noise', weight: TELL_DEFS.noise.weight, says: TELL_DEFS.noise.about })
  }
  return out
}

/** Чего игрок в самом деле добивается: с этим и сличается вывод. */
export function trueAim(state: GameState, world: World, day: number): PlayerAim {
  if (state.campaign) {
    const aim = state.campaign.aim
    if (aim === 'takeLand') return 'takeLand'
    if (aim === 'forceTribute') return 'tribute'
    return 'hold'
  }
  if (state.politics.wars.some((one) => one.a === PLAYER || one.b === PLAYER)) return 'takeLand'
  if ((state.embassies ?? []).some((one) => one.errand === 'marriage')) return 'marry'
  if (state.character.money > 60000) return 'trade'
  if ((state.embassies ?? []).length > 0) return 'marry'
  return 'hold'
}

/**
 * К какому выводу пришла эта корона (Вы2, Вы4 и Вы5).
 *
 * Вывод складывается из примет: война и войско у границы тянут к «идёт за
 * землёй», серебро — к «торгует», послы — к «ищет родства». Пустые ходы
 * вычитают уверенность, повторение прибавляет.
 */
export function guessAim(
  state: GameState,
  world: World,
  watcher: string,
  day: number,
): {
  readonly aim: PlayerAim
  readonly confidence: number
  readonly right: boolean
  readonly says: string
} {
  const tells = tellsOf(state, world, watcher, day)
  const seen = state.tellSeen?.[watcher] ?? 0
  let land = 0
  let coin = 0
  let kin = 0
  let noise = 0
  for (const tell of tells) {
    if (tell.kind === 'border' || tell.kind === 'muster' || tell.kind === 'sieges') {
      land += tell.weight
    }
    if (tell.kind === 'purse') coin += tell.weight
    if (tell.kind === 'envoys') kin += tell.weight
    if (tell.kind === 'noise') noise += GUESS.noiseCuts
  }
  // Война сама по себе — самая громкая примета.
  if (atWar(state.politics, PLAYER, watcher)) land += 0.5
  if (relationOf(state.politics, PLAYER, watcher) > 35) kin += 0.15
  const best = Math.max(land, coin, kin)
  const aim: PlayerAim =
    best <= 0 ? 'none' : best === land ? 'takeLand' : best === coin ? 'trade' : 'marry'
  const confidence =
    Math.round(Math.max(0, Math.min(GUESS.sure, best + seen * GUESS.learnsPerSeen - noise)) * 100) /
    100
  const truth = trueAim(state, world, day)
  const guessed: PlayerAim = confidence < GUESS.acts ? 'none' : aim
  const def = PLAYER_AIM_DEFS[guessed]
  return {
    aim: guessed,
    confidence,
    right: guessed === truth,
    says:
      guessed === 'none'
        ? `${noise > 0 ? GUESS_WORDS.confused : GUESS_WORDS.reads} ${def.label}: ${def.about} (уверенность ${Math.round(confidence * 100)} из ста)`
        : `${GUESS_WORDS.named} «${def.label}»: ${def.about} (уверенность ${Math.round(confidence * 100)} из ста)${guessed === truth ? '' : ` — ${GUESS_WORDS.wrong}`}`,
  }
}

/** Приготовился ли он — и к чему (Вы3). */
export function readyFor(
  state: Pick<GameState, 'guesses'>,
  watcher: string,
): { readonly aim: PlayerAim; readonly sinceDay: number } | null {
  const had = state.guesses?.[watcher]
  if (!had) return null
  return { aim: had.aim, sinceDay: had.sinceDay }
}

/** Насколько крепче гарнизоны того, кто ждёт удара (Вы3). */
export function readyShare(state: Pick<GameState, 'guesses'>, watcher: string): number {
  const ready = readyFor(state, watcher)
  if (!ready || ready.aim !== 'takeLand') return 1
  return GUESS.readyGarrison
}

export interface GuessLedger {
  readonly made: number
  readonly right: number
  readonly wrong: number
  readonly confused: number
  readonly says: string
}

/** Выводы в числах (Вы6). */
export function guessLedger(state: Pick<GameState, 'guessLog'>): GuessLedger {
  const log = state.guessLog ?? { made: 0, right: 0, wrong: 0, confused: 0 }
  const share = log.made === 0 ? 0 : Math.round((log.right / log.made) * 100)
  return {
    ...log,
    says:
      log.made === 0
        ? 'Выводов о тебе короны пока не делали.'
        : `Выводов о твоём замысле ${log.made}: верных ${log.right} (${share} из ста), неверных ${log.wrong}, сбитых пустыми ходами ${log.confused}.`,
  }
}

export { GUESS, GUESS_WORDS, PLAYER_AIM_DEFS, TELL_DEFS, type PlayerAim, type TellKind }
