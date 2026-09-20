import { biasOf } from './bias'
import { DECEIT, DECEIT_DEFS, DECEIT_WORDS, type DeceitKind } from './content/deceit'
import { PLAYER } from './holding'
import type { Word } from './known'
import { crownGame, strengthOf } from './mind'
import type { Pledge } from './overture'
import type { GameState } from './state'
import { atWar, relationOf } from './war'

/**
 * Он обманывает нарочно (этап 121).
 *
 * Обман короны — не отдельная машинерия: это та же весть, что и правда, только
 * с выгодной ей поправкой. Потому её можно раскусить тем же, чем раскусывают
 * всё остальное, — своими людьми там и расхождением вестей; и потому пойманный
 * теряет доверие в общем слое (этап 103), а не в особом счётчике.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

/**
 * Обманывает ли эта корона сейчас и как (Об1–Об3).
 *
 * Слабый прикидывается сильным, чтобы его не тронули; сильный — слабым, чтобы
 * ударили не там; тот, кому нужно время, даёт слово, которого не сдержит.
 * Выводится из её положения, а не из броска.
 */
export function deceitOf(
  state: GameState,
  world: import('./world/types').World,
  side: string,
  day: number,
): { readonly kind: DeceitKind | null; readonly says: string } {
  const mine = strengthOf(state, world, PLAYER, day).score
  const theirs = strengthOf(state, world, side, day).score
  const beat = Math.floor(day / DECEIT.beat)
  const roll = (hashOf(`lie:${side}:${beat}`) % 1000) / 1000
  const weaker = theirs < mine * 0.85
  const stronger = theirs > mine * 1.2
  const plan = crownGame(state, world, side, day)
  // Тому, кто затевает войну, выгодно выиграть время обещанием.
  if ((plan.aim === 'grow' || plan.aim === 'humble') && roll < 0.45) {
    return { kind: 'promise', says: DECEIT_WORDS.promised }
  }
  if (weaker && roll < DECEIT.weakBluffs) return { kind: 'strong', says: DECEIT_WORDS.strong }
  if (stronger && roll < DECEIT.strongHides) return { kind: 'weak', says: DECEIT_WORDS.weak }
  return { kind: null, says: DECEIT_WORDS.held }
}

/** Весть, которую он подкладывает тебе (Об2 и Об3). */
export function deceitWord(
  state: GameState,
  world: import('./world/types').World,
  side: string,
  kind: DeceitKind,
  day: number,
): Word {
  const truth = strengthOf(state, world, side, day).score
  const def = DECEIT_DEFS[kind]
  return {
    id: `lie:${side}:${day}`,
    to: PLAYER,
    kind: 'strength',
    about: side,
    value: Math.max(0, Math.round(truth * def.shows)),
    source: 'envoy',
    from: `посол ${world.kingdoms[side]?.name ?? side}`,
    day,
  }
}

/**
 * Сдержит ли он обещание (Об1).
 *
 * Считается выгодой, а не честностью: если нарушить дешевле, чем исполнить, он
 * нарушит. Нрав только меняет порог.
 */
export function willBreak(
  state: GameState,
  world: import('./world/types').World,
  pledge: Pledge,
  day: number,
): { readonly breaks: boolean; readonly gain: number; readonly says: string } {
  const bias = biasOf(pledge.kingdomId)
  const relation = relationOf(state.politics, PLAYER, pledge.kingdomId)
  const warring = atWar(state.politics, PLAYER, pledge.kingdomId)
  // Выгода: чем хуже отношение и чем он надменнее, тем дешевле нарушить.
  const gain =
    Math.round(
      ((warring ? 0.4 : 0) + (relation < 0 ? 0.25 : 0) + (bias === 'proud' ? 0.25 : 0.1)) * 100,
    ) / 100
  const breaks = gain >= 0.45
  return {
    breaks,
    gain,
    says: breaks
      ? `${DECEIT_WORDS.promised} Нарушить ему выгоднее на ${Math.round(gain * 100)} из ста.`
      : `Слово он, скорее всего, сдержит: нарушить стоит дороже (выгода ${Math.round(gain * 100)} из ста).`,
  }
}

/**
 * Раскрыт ли обман (Об4).
 *
 * Раскрывает то же, что и всё прочее: свои люди при их дворе и расхождение
 * вестей. Не бросок: один и тот же взгляд даёт один и тот же ответ.
 */
export function seeThrough(
  state: GameState,
  world: import('./world/types').World,
  side: string,
  day: number,
): { readonly seen: boolean; readonly chance: number; readonly says: string } {
  const eyes =
    (state.spies ?? []).some((one) => one.kingdomId === side) ||
    (state.residents ?? []).some((one) => one.at === side && !one.bought)
  const about = (state.words ?? []).filter(
    (one) => one.to === PLAYER && one.about === side && one.kind === 'strength',
  )
  const values = about.map((one) => Number(one.value)).filter((one) => Number.isFinite(one))
  const clash =
    values.length > 1 && Math.max(...values) > Math.min(...values) * 1.4 ? DECEIT.seenByClash : 0
  const wits = Math.max(0, state.character.attributes.mind - 6) * 0.05
  const chance =
    Math.round(Math.min(0.95, (eyes ? DECEIT.seenByEyes : 0) + clash + wits) * 100) / 100
  const roll = (hashOf(`unmask:${side}:${Math.floor(day / DECEIT.beat)}`) % 1000) / 1000
  return {
    seen: roll < chance,
    chance,
    says:
      roll < chance
        ? `${DECEIT_WORDS.seen}${clash > 0 ? ` ${DECEIT_WORDS.clash}` : ''} (${Math.round(chance * 100)} из ста)`
        : `${DECEIT_WORDS.held} (раскрыл бы в ${Math.round(chance * 100)} случаях из ста)`,
  }
}

/** Насколько дешевеет слово пойманного (Об5). */
export function wordWorth(
  state: Pick<GameState, 'trust'>,
  side: string,
  world: import('./world/types').World,
): number {
  const name = `посол ${world.kingdoms[side]?.name ?? side}`
  const row = state.trust?.[name]
  if (!row || row.lied === 0) return 1
  return Math.max(DECEIT.wordWorth, 1 - row.lied * 0.25)
}

export interface DeceitLedger {
  readonly made: number
  readonly worked: number
  readonly caught: number
  readonly says: string
}

/** Обман в числах (Об6). */
export function deceitLedger(state: Pick<GameState, 'deceitLog'>): DeceitLedger {
  const log = state.deceitLog ?? { made: 0, worked: 0, caught: 0 }
  return {
    ...log,
    says:
      log.made === 0
        ? 'Обманов от корон век пока не записал.'
        : `Чужих обманов ${log.made}: удалось ${log.worked}, раскрыто ${log.caught}.`,
  }
}

export { DECEIT, DECEIT_DEFS, DECEIT_WORDS, type DeceitKind }
