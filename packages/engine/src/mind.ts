import { bandSize } from './band'
import { crownPlaces } from './company'
import {
  GAMBIT_DEFS,
  type GambitAim,
  MIND,
  MIND_WORDS,
  STEP_DEFS,
  type StepId,
  TONE_DEFS,
  type ToneId,
} from './content/mind'
import { PLAYER } from './holding'
import { crownWarlust } from './lordlife'
import { crownFleet, fleetForce } from './navy'
import { seenBy } from './picture'
import type { GameState } from './state'
import { allied, atWar, warsOf } from './war'
import { neighbourSettlements } from './world/queries'
import type { World } from './world/types'

/**
 * ИИ, который играет (этап 89).
 *
 * Замысел 0.6 был на один шаг: чего корона хочет сегодня. Этого хватало, чтобы
 * мир не стоял, и не хватало, чтобы в нём было с кем играть: сила без памяти о
 * собственной цели ведёт себя как погода. Партия — это цель на годы, дорога к
 * ней из понятных шагов и честный счёт: по силам или нет.
 *
 * Три вещи держат всё остальное. Первая — сила считается одинаково для всех, и
 * держава игрока считается тем же счётом, что чужая. Вторая — корона видит
 * чужую силу с ошибкой: соседа почти точно, дальнего — как придётся, и ошибка
 * идёт от нрава, а не от кубика. Третья — всякое решение объяснимо словами.
 */

// --- сила (И2, И5) ----------------------------------------------------------

export interface Strength {
  readonly side: string
  readonly places: number
  readonly men: number
  readonly ships: number
  readonly allies: number
  /** Общий счёт силы. */
  readonly score: number
  readonly says: string
}

/**
 * Чем располагает эта сила (И2).
 *
 * Считается одним правилом для всех: земля, люди в поле, суда на плаву и
 * союзники. Держава игрока считается так же, как чужая (И5), — иначе ИИ не
 * может играть против неё всерьёз.
 */
export function strengthOf(state: GameState, world: World, side: string, day: number): Strength {
  const places =
    side === PLAYER
      ? Object.values(state.settlements).filter((one) => one.owner === PLAYER && one.population > 0)
          .length
      : crownPlaces(state, side)
  const men = state.bands
    .filter((band) => (side === PLAYER ? band.lordId === PLAYER : band.kingdomId === side))
    .reduce((sum, band) => sum + bandSize(band), 0)
  const ships =
    side === PLAYER
      ? (state.navy ?? []).filter((one) => one.readyDay <= day).length
      : crownFleet(state, world, side, day).length
  const fleet =
    side === PLAYER
      ? fleetForce((state.navy ?? []).filter((one) => one.readyDay <= day))
      : fleetForce(crownFleet(state, world, side, day))
  const allies = Object.keys(world.kingdoms).filter(
    (one) => one !== side && allied(state.politics, side, one),
  ).length
  const base = places * MIND.placeWeight + men * MIND.manWeight + (fleet / 10) * MIND.shipWeight
  const score = Math.round(base * (1 + allies * MIND.allyWeight))
  return {
    side,
    places,
    men,
    ships,
    allies,
    score,
    says: `${side}: мест ${places}, людей в поле ${men}, судов ${ships}, союзников ${allies} — сила ${score}.`,
  }
}

// --- чего он не видит (И4) --------------------------------------------------

/**
 * Какой эта сила кажется той короне (И4).
 *
 * Корона не всевидящая: соседа она знает почти точно, о дальней земле судит по
 * слухам. Ошибка не случайна — она от нрава: воинственный склонен считать
 * чужое войско меньше, чем оно есть, осторожный — больше. Из одного сейва одна
 * и та же ошибка.
 */
export function seenStrength(
  state: GameState,
  world: World,
  watcher: string,
  about: string,
  day: number,
): { readonly score: number; readonly error: number; readonly says: string } {
  const truth = strengthOf(state, world, about, day)
  const near = isNeighbour(state, world, watcher, about)
  const span = near ? MIND.nearError : MIND.farError
  // Нрав решает, в какую сторону ошибаться: воинственный преуменьшает чужое.
  const lust = crownWarlust(watcher)
  const lean = lust >= 1.2 ? -1 : lust <= 0.9 ? 1 : 0
  const jitter = ((hashOf(`${watcher}:${about}:${Math.floor(day / 180)}`) % 100) / 100 - 0.5) * 2
  const error = Math.round(span * (lean * 0.6 + jitter * 0.4) * 100) / 100
  const guess = Math.max(0, Math.round(truth.score * (1 + error)))
  // С 0.8 догадка — только основа: если короне что-то принесли, она считает по
  // принесённому (этап 118). Оттого твой обман попадает в её решения.
  const row = seenBy(state, world, watcher, about, day, { score: guess, error })
  if (row.from === 'words') {
    return {
      score: row.value,
      error: Math.round(((row.value - truth.score) / Math.max(1, truth.score)) * 100) / 100,
      says: row.says,
    }
  }
  return {
    score: guess,
    error,
    says: `${watcher} считает силу ${about} равной ${guess} (на деле ${truth.score}${near ? '' : `, ${MIND_WORDS.blind}`}).`,
  }
}

function isNeighbour(state: GameState, world: World, side: string, other: string): boolean {
  const seat = seatOfSide(state, side)
  if (!seat) return false
  const near = neighbourSettlements(world, seat, MIND.nearHops)
  for (const step of near) {
    const place = state.settlements[step.id]
    if (!place?.owner) continue
    if (sideOfOwner(state, place.owner) === other) return true
  }
  return false
}

function seatOfSide(state: GameState, side: string): string | null {
  let best: { id: string; population: number } | null = null
  for (const one of Object.values(state.settlements)) {
    if (!one.owner || one.population <= 0) continue
    if (sideOfOwner(state, one.owner) !== side) continue
    if (!best || one.population > best.population) {
      best = { id: one.locationId, population: one.population }
    }
  }
  return best?.id ?? null
}

function sideOfOwner(state: GameState, owner: string): string | null {
  if (owner === PLAYER) return PLAYER
  if (owner.startsWith('crown:')) return owner.slice('crown:'.length)
  return state.politics.lords.find((lord) => lord.id === owner)?.kingdomId ?? null
}

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

// --- сильный и слабый (И3) --------------------------------------------------

/**
 * Каким тоном эта корона говорит с той (И3).
 *
 * Считается не по правде, а по тому, какой она эту силу видит: со слабым не
 * торгуются, с сильным не спорят. Отсюда же берётся, сколько она запросит.
 */
export function toneToward(
  state: GameState,
  world: World,
  speaker: string,
  other: string,
  day: number,
): { readonly tone: ToneId; readonly ratio: number; readonly says: string } {
  const mine = strengthOf(state, world, speaker, day).score
  const seen = seenStrength(state, world, speaker, other, day).score
  const ratio = mine > 0 ? Math.round((seen / mine) * 100) / 100 : 9
  const tone: ToneId =
    ratio >= MIND.strongLine ? 'defer' : ratio <= MIND.weakLine ? 'demand' : 'deal'
  return {
    tone,
    ratio,
    says: `${speaker} говорит с ${other} ${TONE_DEFS[tone].label}: ${TONE_DEFS[tone].about} (их сила к своей — ${ratio})`,
  }
}

/** Во сколько раз больше обычного запросит корона таким тоном. */
export function asksFactor(tone: ToneId): number {
  return TONE_DEFS[tone].asks
}

// --- партия (И1, И6) --------------------------------------------------------

export interface Gambit {
  readonly kingdomId: string
  readonly aim: GambitAim
  readonly targetId: string | null
  /** Дорога: то, что уже сделано, и то, что осталось. */
  readonly steps: readonly StepId[]
  readonly done: readonly StepId[]
  readonly next: StepId
  /** По силам ли задуманное. */
  readonly able: boolean
  readonly sinceEra: number
  readonly why: string
}

/**
 * Партия короны (И1).
 *
 * Выводится, а не хранится: из положения короны, её нрава и пятилетия, в
 * котором она живёт. Одно и то же положение даёт одну и ту же партию, и партия
 * не меняется каждые сутки — она пересматривается раз в несколько лет.
 */
export function crownGame(state: GameState, world: World, kingdomId: string, day: number): Gambit {
  const era = Math.floor(day / (365 * MIND.reviewYears))
  const mine = strengthOf(state, world, kingdomId, day)
  const lust = crownWarlust(kingdomId)
  const wars = warsOf(state.politics, kingdomId).length
  const owes = state.politics.tributes.some((one) => one.from === kingdomId)

  // Кого она вообще видит целью: соседей и того, кто вырос.
  const others = [PLAYER, ...Object.keys(world.kingdoms)].filter((one) => one !== kingdomId)
  const seen = others
    .map((one) => ({ id: one, score: seenStrength(state, world, kingdomId, one, day).score }))
    .filter((one) => one.score > 0)
    .sort((a, b) => b.score - a.score)
  const biggest = seen[0] ?? null
  const weakest = seen[seen.length - 1] ?? null

  let aim: GambitAim
  let targetId: string | null
  let why: string
  const crowded = biggest && biggest.score > mine.score * 1.5
  if (owes) {
    aim = 'coin'
    targetId = state.politics.tributes.find((one) => one.from === kingdomId)?.to ?? null
    why = `${kingdomId} платит дань и первым делом считает серебро: войной такой долг не снять.`
  } else if (crowded && lust >= 1.1) {
    aim = 'humble'
    targetId = biggest?.id ?? null
    why = `${biggest?.id} вырос слишком сильно; ${kingdomId} считает, что дальше будет хуже.`
  } else if (crowded) {
    aim = 'wed'
    targetId = biggest?.id ?? null
    why = `${biggest?.id} сильнее; ${kingdomId} ищет родства, а не войны.`
  } else if (wars > 0) {
    aim = 'hold'
    targetId = warsOf(state.politics, kingdomId)[0]
      ? (warsOf(state.politics, kingdomId)[0] as { a: string; b: string }).a === kingdomId
        ? (warsOf(state.politics, kingdomId)[0] as { a: string; b: string }).b
        : (warsOf(state.politics, kingdomId)[0] as { a: string; b: string }).a
      : null
    why = `${kingdomId} уже воюет и не затевает второй партии, пока эта не кончена.`
  } else if (lust >= 1.05 && weakest && weakest.score < mine.score * 0.8) {
    aim = 'grow'
    targetId = weakest.id
    why = `${weakest.id} слабее всех вокруг; ${kingdomId} считает его землю своей будущей.`
  } else if (lust <= 0.95) {
    // Осторожная корона растёт серебром и ни на кого не смотрит как на добычу.
    aim = 'coin'
    targetId = null
    why = `${kingdomId} не видит, за что воевать сейчас, и растёт тем, что растёт само.`
  } else {
    // Родство ищут с сильным: слабый родством ничего не прибавит.
    aim = 'wed'
    targetId = biggest?.id ?? null
    why = `${kingdomId} не хочет воевать и ищет родства с тем, кто крепче.`
  }

  const steps = roadFor(aim)
  const done = walkedSteps(state, world, kingdomId, targetId, steps, day)
  const next = steps.find((one) => !done.includes(one)) ?? 'wait'
  const able = ableFor(state, world, kingdomId, targetId, aim, day)
  return {
    kingdomId,
    aim,
    targetId,
    steps,
    done,
    next,
    able,
    sinceEra: era,
    why,
  }
}

function roadFor(aim: GambitAim): readonly StepId[] {
  if (aim === 'grow') return ['friend', 'money', 'arms', 'claim', 'strike']
  if (aim === 'humble') return ['friend', 'claim', 'arms', 'strike']
  if (aim === 'wed') return ['friend', 'marry', 'wait']
  if (aim === 'coin') return ['money', 'friend', 'wait']
  return ['money', 'wait']
}

/** Какие шаги уже пройдены: считается по миру, а не по памяти. */
function walkedSteps(
  state: GameState,
  world: World,
  kingdomId: string,
  targetId: string | null,
  steps: readonly StepId[],
  day: number,
): readonly StepId[] {
  const done: StepId[] = []
  const mine = strengthOf(state, world, kingdomId, day)
  for (const step of steps) {
    if (step === 'friend' && mine.allies > 0) done.push(step)
    if (step === 'money' && crownPlaces(state, kingdomId) >= 6) done.push(step)
    if (step === 'arms' && mine.men >= 200) done.push(step)
    if (step === 'marry' && targetId && allied(state.politics, kingdomId, targetId)) done.push(step)
    if (step === 'claim' && targetId && atWar(state.politics, kingdomId, targetId)) done.push(step)
  }
  return done
}

/**
 * По силам ли эта партия (И2).
 *
 * Корона сравнивает свою силу с той, какой она видит чужую, и делит на
 * смелость цели: осторожная партия не начинается, пока перевес не станет явным,
 * дерзкая — начинается и при равенстве.
 */
export function ableFor(
  state: GameState,
  world: World,
  kingdomId: string,
  targetId: string | null,
  aim: GambitAim,
  day: number,
): boolean {
  if (!targetId) return true
  const mine = strengthOf(state, world, kingdomId, day).score
  const seen = seenStrength(state, world, kingdomId, targetId, day).score
  if (seen <= 0) return true
  return mine / seen >= GAMBIT_DEFS[aim].daring
}

/** Партия словами: то, что попадёт в сводку мира (И6). */
export function gambitWords(gambit: Gambit, world: World): string {
  const def = GAMBIT_DEFS[gambit.aim]
  const name = (id: string | null) =>
    id === null ? 'никого' : id === PLAYER ? 'тебя' : (world.kingdoms[id]?.name ?? id)
  const step = STEP_DEFS[gambit.next]
  const warlike = gambit.aim === 'grow' || gambit.aim === 'humble'
  const short = warlike ? MIND_WORDS.beyond : MIND_WORDS.unequal
  return `${name(gambit.kingdomId)}: ${def.label} (${def.years} лет). Цель — ${name(gambit.targetId)}. ${gambit.why} Следующий шаг: ${step.label} — ${step.about} ${gambit.able ? MIND_WORDS.ready : short}.`
}

/** Кто из корон держит тебя целью своей партии (И5). */
export function aimedAtPlayer(state: GameState, world: World, day: number): readonly Gambit[] {
  // Родня в счёт не идёт (этап 132, Дм4): корона, с которой у тебя брак, тебя
  // целью не выбирает. Это не запрет воевать — это то, что война в родне дороже
  // и потому в замысел не попадает.
  const kin = new Set((state.marriages ?? []).map((one) => one.kingdomId))
  return Object.keys(world.kingdoms)
    .filter((one) => !kin.has(one))
    .map((one) => crownGame(state, world, one, day))
    .filter((one) => one.targetId === PLAYER)
}

export { MIND, type GambitAim, type StepId, type ToneId, GAMBIT_DEFS, STEP_DEFS, TONE_DEFS }
