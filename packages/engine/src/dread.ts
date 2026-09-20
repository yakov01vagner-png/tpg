import { DREAD, DREAD_WORDS, FEARS, FEAR_DEFS, type FearId } from './content/dread'
import { PLAYER, holdingsOf } from './holding'
import { type Known, knownTo } from './known'
import type { GameState } from './state'
import { relationOf } from './war'
import { type Walker, nearestWay, recognises } from './way'
import { neighbourSettlements } from './world/queries'
import type { World } from './world/types'

/**
 * Кто чего боится (этап 135).
 *
 * Равновесие сил начинается с того, что страх становится числом. Число это
 * считается не по войску, а по пути: опасен тот, кому осталось меньше всех.
 * Считается оно одинаково для всех — и для корон друг о друге, и для тебя.
 *
 * И считается оно **не по правде, а по вестям**: своё продвижение ты знаешь
 * точно, чужое — со слов. Оттого мир и ошибается в том, кого бояться.
 */

export function fearDef(id: FearId) {
  return FEAR_DEFS[id]
}

/** Насколько далеко зашёл тот, о ком речь, — правда состояния. */
export function wayTruth(state: GameState, world: World, who: Walker, day: number): number {
  const way = nearestWay(state, world, who, day)
  return way ? Math.round(way.share * 100) : 0
}

/** Из чего сложился страх: причина с весом (Бо1). */
export interface FearPart {
  readonly fear: FearId
  readonly part: number
  readonly says: string
}

export interface Dread {
  readonly who: Walker
  readonly of: Walker
  readonly score: number
  readonly scared: boolean
  readonly parts: readonly FearPart[]
  readonly says: string
}

/**
 * Насколько продвижение `of` опасно для `who` (Бо1, Бо2, Бо5).
 *
 * Доля — то, из чего считается страх: доля пройденного пути, нужда в этом
 * соседе для чужого конца, соседство и холод между ними. Войска в этом счёте
 * нет вовсе — в этом и смысл.
 */
export function dreadOf(
  state: GameState,
  world: World,
  who: Walker,
  of: Walker,
  day: number,
  heard?: number,
): Dread {
  if (who === of) {
    return { who, of, score: 0, scared: false, parts: [], says: 'Себя не боятся.' }
  }
  // Путь считается один раз на пару: он же даёт и долю, и то, мешаешь ли ты ему.
  const way = nearestWay(state, world, of, day)
  const near = nearTo(state, world, who, of)
  const share = heard ?? (way ? way.share : 0)
  const blocks = !way
    ? 0
    : way.way === 'crown'
      ? recognises(state, world, of, who, day)
        ? 0
        : 1
      : near > 0
        ? 0.5
        : 0
  // Стоять на дороге у того, кто только вышел, — ещё не повод бояться: вес
  // этой причины берётся по тому, как далеко он зашёл.
  const need = blocks * share
  const cold = relationOf(state.politics, who, of) < 0 ? 1 : 0
  const have: Record<FearId, number> = { share, need, near, cold }
  const parts = FEARS.filter((id) => have[id] > 0).map((id) => ({
    fear: id,
    part: Math.round(FEAR_DEFS[id].weight * have[id]),
    says: FEAR_DEFS[id].about,
  }))
  const score = parts.reduce((sum, one) => sum + one.part, 0)
  const name = sideName(world, of)
  return {
    who,
    of,
    score,
    scared: score >= DREAD.scares,
    parts,
    says:
      score >= DREAD.scares
        ? `${sideName(world, who)} боится: ${name} прошёл ${Math.round(share * 100)} из ста своего пути${way ? ` (${way.way})` : ''}. Страх ${score} из ста — ${parts.map((one) => FEAR_DEFS[one.fear].label).join(', ')}.`
        : `${sideName(world, who)} пока не боится ${name}: страх ${score} из ${DREAD.scares}.`,
  }
}

/**
 * Соседство: до дальнего ещё надо дойти, и не первому.
 *
 * Сосед — не тот, чья столица рядом, а тот, чья земля рядом: считается по
 * ближайшему его месту от твоего стола.
 */
export function nearTo(state: GameState, world: World, who: Walker, of: Walker): number {
  // Соседство — свойство пары, а не направления: считается с обеих сторон и
  // берётся ближайшее. Иначе тот, у кого земли больше, оказывался бы соседом
  // всем, а ему — никто.
  return Math.max(oneWayNear(state, world, who, of), oneWayNear(state, world, of, who))
}

function oneWayNear(state: GameState, world: World, who: Walker, of: Walker): number {
  const mine = seatOf(state, who)
  if (!mine) return 0
  if (ownedBy(state, mine, of)) return 1
  let best = 0
  for (const one of neighbourSettlements(world, mine, DREAD.nearHops)) {
    if (!ownedBy(state, one.id, of)) continue
    best = Math.max(best, 1 - one.hops / (DREAD.nearHops + 1))
  }
  return Math.round(best * 100) / 100
}

/** Чья это земля: игрока, короны или её лорда. */
function ownedBy(state: GameState, locationId: string, side: Walker): boolean {
  const owner = state.settlements[locationId]?.owner ?? null
  if (!owner) return false
  if (side === PLAYER) return owner === PLAYER
  return (
    owner === `crown:${side}` ||
    state.politics.lords.some((lord) => lord.id === owner && lord.kingdomId === side)
  )
}

function seatOf(state: GameState, side: Walker): string | null {
  if (side === PLAYER) {
    const mine = [...holdingsOf(state.settlements, PLAYER)].sort(
      (a, b) => b.population - a.population,
    )[0]
    return mine?.locationId ?? state.locationId ?? null
  }
  let best: { id: string; population: number } | null = null
  for (const one of Object.values(state.settlements)) {
    if (!one.owner || one.population <= 0) continue
    const theirs =
      one.owner === `crown:${side}` ||
      state.politics.lords.some((lord) => lord.id === one.owner && lord.kingdomId === side)
    if (!theirs) continue
    if (!best || one.population > best.population) {
      best = { id: one.locationId, population: one.population }
    }
  }
  return best?.id ?? null
}

export function sideName(world: World, side: Walker): string {
  return side === PLAYER ? 'Ты' : (world.kingdoms[side]?.name ?? side)
}

/**
 * Чужими глазами (Бо3, Бо4).
 *
 * Корона боится не того, что есть, а того, что до неё дошло: молва
 * преувеличивает, посол опаздывает, а иной не слышал вовсе. Страх считается по
 * этой вести — и потому бывает больше правды и меньше её.
 */
export function dreadSeen(
  state: GameState,
  world: World,
  who: Walker,
  of: Walker,
  day: number,
): { readonly dread: Dread; readonly known: Known; readonly says: string } {
  const known = knownTo(state, world, who, { kind: 'way', about: of }, day)
  const heard = typeof known.value === 'number' ? known.value / 100 : 0
  const dread = dreadOf(state, world, who, of, day, heard)
  const truth = wayTruth(state, world, of, day)
  return {
    dread,
    known,
    says:
      known.value === null
        ? `${sideName(world, who)} о продвижении ${sideName(world, of)} не знает ничего. ${DREAD_WORDS.blind}`
        : `${sideName(world, who)} слышал, что ${sideName(world, of)} прошёл ${known.value} из ста (${known.says}); на деле ${truth}. Страх ${dread.score}.`,
  }
}

/** Кто тебя боится, насколько и с какого дня (Бо6). */
export function whoFears(
  state: GameState,
  world: World,
  of: Walker,
  day: number,
): readonly { readonly who: string; readonly score: number; readonly sinceDay: number }[] {
  return Object.keys(world.kingdoms)
    .filter((id) => id !== of)
    .map((id) => ({
      who: id,
      score: dreadSeen(state, world, id, of, day).dread.score,
      sinceDay: state.dreadLog?.[id]?.sinceDay ?? 0,
    }))
    .filter((one) => one.score >= DREAD.scares)
    .sort((a, b) => b.score - a.score)
}

/** Кто ближе всех к своему концу — по правде состояния. */
export function firstOf(
  state: GameState,
  world: World,
  day: number,
): { readonly who: Walker; readonly share: number; readonly says: string } {
  const sides: Walker[] = [PLAYER, ...Object.keys(world.kingdoms)]
  const rows = sides
    .map((who) => ({ who, share: wayTruth(state, world, who, day) }))
    .sort((a, b) => b.share - a.share)
  const first = rows[0] ?? { who: PLAYER, share: 0 }
  return {
    who: first.who,
    share: first.share,
    says: `Ближе всех к концу ${sideName(world, first.who)}: ${first.share} из ста. ${DREAD_WORDS.notStrength}`,
  }
}

/** Страх в числах: кто кого боится по всему миру (Бо5, Бо6). */
export function dreadLedger(
  state: GameState,
  world: World,
  day: number,
): { readonly pairs: number; readonly most: string; readonly says: string } {
  const sides: Walker[] = [PLAYER, ...Object.keys(world.kingdoms)]
  let pairs = 0
  let most: Dread | null = null
  for (const who of Object.keys(world.kingdoms)) {
    for (const of of sides) {
      if (who === of) continue
      const one = dreadSeen(state, world, who, of, day).dread
      if (one.scared) pairs += 1
      if (!most || one.score > most.score) most = one
    }
  }
  return {
    pairs,
    most: most ? most.says : 'Никто никого не боится.',
    says: `${DREAD_WORDS.each} Считается это по тому, что до них дошло: боятся в ${pairs} парах, сильнее всех — ${most ? `${sideName(world, most.who)} о ${sideName(world, most.of)} (${most.score})` : 'никто'}.`,
  }
}

/** Насколько разнеслась бы молва о продвижении: то, что скажут (Бо3). */
export function rumouredWay(state: GameState, world: World, of: Walker, day: number): number {
  const truth = wayTruth(state, world, of, day)
  // Молва преувеличивает вверх: пугающее пересказывают охотнее скучного.
  return Math.min(100, Math.round(truth * (1 + DREAD.rumourOff)))
}

export { DREAD, DREAD_WORDS, FEARS, FEAR_DEFS, type FearId }
