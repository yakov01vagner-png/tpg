import { PROOF, PROOF_DEFS, PROOF_WORDS, type ProofKind } from './content/proof'
import { PLAYER } from './holding'
import type { GameState } from './state'
import { atWar, relationOf } from './war'
import type { World } from './world/types'

/**
 * Чужие договоры (этап 116).
 *
 * Знать и доказать — разное, и в дипломатии это разница между обидой и
 * поводом. Знание о чужом сговоре приходит слоем этапа 99 и этапа 115; здесь
 * оно обращается в бумагу, которую можно предъявить миру, — или в подделку,
 * за которую отвечают.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

export interface Proof {
  readonly id: string
  readonly kind: ProofKind
  /** О чьём сговоре: две короны через двоеточие. */
  readonly about: string
  readonly against: string
  readonly gotDay: number
  /** Предъявлено ли миру. */
  readonly shown?: boolean
  /** Сличили ли подделку. */
  readonly exposed?: boolean
}

export function proofDef(kind: ProofKind) {
  return PROOF_DEFS[kind]
}

export function proofsOf(state: Pick<GameState, 'proofs'>): readonly Proof[] {
  return state.proofs ?? []
}

/** Сколько такое доказательство весит сегодня (Чд2). */
export function weightOf(proof: Proof, day: number): number {
  const def = PROOF_DEFS[proof.kind]
  const years = Math.max(0, day - proof.gotDay) / 365
  const worn = Math.max(0.1, def.weight - years * PROOF.agesPerYear)
  return Math.round(worn * 100) / 100
}

/**
 * Что ты вообще можешь добыть на этот сговор (Чд1 и Чд2).
 *
 * Не всё доступно всегда: письмо берут там, где у тебя свой человек; свидетеля
 * находят там, где договаривались при третьем; саму грамоту крадут, и это
 * стоит как небольшая война. Подделать можно всегда — и это отдельная цена.
 */
export function proofsAvailable(
  state: GameState,
  world: World,
  a: string,
  b: string,
  day: number,
): readonly { readonly kind: ProofKind; readonly can: boolean; readonly why: string }[] {
  const known = (state.learned?.[`${a}:${b}`] ?? state.learned?.[`${b}:${a}`]) !== undefined
  const spyThere = (state.spies ?? []).some(
    (one) => (one.kingdomId === a || one.kingdomId === b) && one.seat === 'court',
  )
  const witness = Object.keys(world.kingdoms).some(
    (one) =>
      one !== a &&
      one !== b &&
      relationOf(state.politics, PLAYER, one) > 20 &&
      !atWar(state.politics, PLAYER, one),
  )
  return [
    {
      kind: 'letter',
      can: known && spyThere,
      why: known
        ? spyThere
          ? PROOF_DEFS.letter.needs
          : 'Нужен свой человек при их дворе.'
        : PROOF_WORDS.known,
    },
    {
      kind: 'witness',
      can: known && witness,
      why: witness ? PROOF_DEFS.witness.needs : 'Некому свидетельствовать: третьи тебя не любят.',
    },
    {
      kind: 'seal',
      can: known && spyThere,
      why: spyThere ? PROOF_DEFS.seal.needs : 'Украсть грамоту некому.',
    },
    { kind: 'forged', can: true, why: PROOF_DEFS.forged.needs },
  ]
}

/**
 * Предъявить миру (Чд3).
 *
 * Поворачивает третьих ровно на вес бумаги. Без бумаги — на шестую часть от
 * этого: слово против слова мир слушает, но не запоминает.
 */
export function showWorth(
  proof: Proof | null,
  day: number,
): { readonly turn: number; readonly says: string } {
  if (!proof) {
    return {
      turn: Math.round(PROOF.turnsThirds * PROOF.bareWord),
      says: PROOF_WORDS.bare,
    }
  }
  const weight = weightOf(proof, day)
  const stale = weight < PROOF_DEFS[proof.kind].weight * 0.6
  return {
    turn: Math.round(PROOF.turnsThirds * weight),
    says: `${PROOF_WORDS.shown} ${PROOF_DEFS[proof.kind].label}, вес ${weight}.${stale ? ` ${PROOF_WORDS.stale}` : ''}`,
  }
}

/**
 * Сличили ли подделку (Чд4).
 *
 * Не бросок: сличает тот, у кого есть свои люди и свой интерес. Чем больше
 * корон поворачивается от предъявленного, тем внимательнее на него смотрят.
 */
export function forgerySeen(
  state: GameState,
  world: World,
  proof: Proof,
  day: number,
): { readonly seen: boolean; readonly chance: number; readonly says: string } {
  if (proof.kind !== 'forged') return { seen: false, chance: 0, says: 'Это не подделка.' }
  const [a, b] = proof.about.split(':')
  // Те, о ком подделка, смотрят на неё внимательнее всех.
  const sides = [a, b].filter((one): one is string => Boolean(one))
  const wits = sides.reduce(
    (sum, side) => sum + (relationOf(state.politics, PLAYER, side) < 0 ? 0.2 : 0.1),
    0,
  )
  const age = Math.max(0, day - proof.gotDay) / 365
  const chance = Math.round(Math.min(0.9, PROOF.forgerySeen + wits + age * 0.2) * 100) / 100
  const roll = (hashOf(`forge:${proof.id}:${Math.floor(day / 10)}`) % 1000) / 1000
  return {
    seen: roll < chance,
    chance,
    says:
      roll < chance
        ? `${PROOF_WORDS.caught} (сличили бы в ${Math.round(chance * 100)} случаях из ста)`
        : `${PROOF_WORDS.forged} Пока не сличили (${Math.round(chance * 100)} из ста).`,
  }
}

/** Насколько доказательство помогает на съезде (Чд5). */
export function congressWeight(proof: Proof | null, day: number): number {
  if (!proof) return 0
  return Math.round(weightOf(proof, day) * PROOF.atCongress * 100) / 100
}

export interface ProofLedger {
  readonly got: number
  readonly shown: number
  readonly forged: number
  readonly caught: number
  readonly live: number
  readonly says: string
}

/** Чужое в числах (Чд6). */
export function proofLedger(
  state: Pick<GameState, 'proofs' | 'proofLog'>,
  day: number,
): ProofLedger {
  const log = state.proofLog ?? { got: 0, shown: 0, forged: 0, caught: 0 }
  const live = proofsOf(state).filter((one) => !one.exposed).length
  return {
    ...log,
    live,
    says:
      log.got === 0 && log.forged === 0
        ? 'Чужих договоров ты пока не собирал.'
        : `Доказательств добыто ${log.got} (из них подделок ${log.forged}), предъявлено ${log.shown}, сличено ${log.caught}. На руках ${live}.`,
  }
}

export { PROOF, PROOF_DEFS, PROOF_WORDS, type ProofKind }
