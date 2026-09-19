import { type Band, bandSize } from './band'
import { WARMIND } from './content/warmind'
import type { Settlement } from './economy'
import { garrisonSize } from './holding'
import type { Politics } from './war'
import { atWar } from './war'
import { neighbourSettlements } from './world/queries'
import type { World } from './world/types'

/**
 * Война как замысел войска (этап 90).
 *
 * До 0.7 дружина решала за себя: вышла со двора, дошла до ближайшего чужого
 * села, разорила, вернулась. Отсюда войны, которые ничего не меняли: сорок
 * человек не берут крепость, а ближайшее село не решает войны.
 *
 * Здесь появляется то, чего не было: сбор в кулак, выбор цели по кампании, а не
 * по расстоянию, отказ от боя, который не выиграть, и выручка своим. Всё
 * считается числами из мира — без броска, чтобы из одного сейва выходил один и
 * тот же поход.
 */

/** Чья это земля: корона места или корона его хозяина. */
export function sideOfOwner(politics: Politics, owner: string | null): string | null {
  if (!owner) return null
  if (owner.startsWith('crown:')) return owner.slice('crown:'.length)
  return politics.lords.find((lord) => lord.id === owner)?.kingdomId ?? null
}

/** Своя ли это дружина: одной короны. */
export function sameSide(a: Band, b: Band): boolean {
  if (a.kingdomId && b.kingdomId) return a.kingdomId === b.kingdomId
  return a.lordId === b.lordId
}

/** Сколько людей стоит в этом месте у этой стороны. */
export function forceAt(bands: readonly Band[], locationId: string, side: string | null): number {
  return bands
    .filter((one) => one.locationId === locationId && !one.travel && one.kingdomId === side)
    .reduce((sum, one) => sum + bandSize(one), 0)
}

/** Сколько людей стоит здесь у тех, с кем эта сторона воюет. */
export function foeForceAt(
  politics: Politics,
  bands: readonly Band[],
  locationId: string,
  side: string | null,
): number {
  if (!side) return 0
  return bands
    .filter(
      (one) =>
        one.locationId === locationId &&
        one.kingdomId !== null &&
        one.kingdomId !== side &&
        atWar(politics, side, one.kingdomId),
    )
    .reduce((sum, one) => sum + bandSize(one), 0)
}

// --- сбор сил (Во1) ---------------------------------------------------------

/**
 * Где сходятся (Во1).
 *
 * Место сбора — своё место в досягаемости, где уже стоит больше всего своих.
 * Если таких нет, сходятся у самого крупного своего места поблизости: войско
 * собирается там, где его есть чем кормить.
 */
export function rallyPoint(
  world: World,
  politics: Politics,
  settlements: Readonly<Record<string, Settlement>>,
  bands: readonly Band[],
  band: Band,
): string | null {
  const side = band.kingdomId
  if (!side) return null
  const near = neighbourSettlements(world, band.locationId, WARMIND.rallyReach)
  let best: { id: string; score: number } | null = null
  for (const step of [{ id: band.locationId, hops: 0 }, ...near]) {
    const place = settlements[step.id]
    if (!place || place.population <= 0) continue
    if (sideOfOwner(politics, place.owner) !== side) continue
    const men = forceAt(bands, step.id, side)
    const score = men * 2 + place.population / 400 - step.hops * 3
    if (!best || score > best.score) best = { id: step.id, score }
  }
  return best?.id ?? null
}

/** Пора ли выступать: в кулаке достаточно людей. */
export function fistReady(bands: readonly Band[], band: Band): boolean {
  const here = forceAt(bands, band.locationId, band.kingdomId)
  return here >= WARMIND.fistLine || bandSize(band) >= WARMIND.fistLine
}

/** Идёт ли эта дружина одна и стоит ли ей сперва сойтись со своими. */
export function tooFewAlone(band: Band): boolean {
  return bandSize(band) < WARMIND.aloneLine
}

// --- маневр (Во2) -----------------------------------------------------------

/**
 * Принимать ли бой (Во2).
 *
 * Войско, которое видит перед собой вдвое большее, боя не принимает: это не
 * трусость, а счёт. Считается по тому, что стоит в месте цели.
 */
export function avoidsBattle(
  politics: Politics,
  bands: readonly Band[],
  band: Band,
  targetId: string,
): boolean {
  const ours = bandSize(band) + forceAt(bands, band.locationId, band.kingdomId) - bandSize(band)
  const mine = Math.max(bandSize(band), ours)
  const theirs = foeForceAt(politics, bands, targetId, band.kingdomId)
  if (theirs <= 0) return false
  return theirs > mine * WARMIND.avoidLine
}

/** Отступать ли от того, кто уже стоит рядом. */
export function retreats(politics: Politics, bands: readonly Band[], band: Band): boolean {
  const theirs = foeForceAt(politics, bands, band.locationId, band.kingdomId)
  if (theirs <= 0) return false
  const mine = forceAt(bands, band.locationId, band.kingdomId)
  return theirs > Math.max(mine, bandSize(band)) * WARMIND.retreatLine
}

// --- выручка своим (Во4) ----------------------------------------------------

/**
 * Кого выручать (Во4).
 *
 * Осаждённое своё место в досягаемости важнее любой добычи: пока его держат,
 * его можно спасти. Выбирается ближайшее из осаждённых.
 */
export function relieveTarget(
  world: World,
  politics: Politics,
  settlements: Readonly<Record<string, Settlement>>,
  bands: readonly Band[],
  band: Band,
): string | null {
  const side = band.kingdomId
  if (!side) return null
  const near = neighbourSettlements(world, band.locationId, WARMIND.reliefReach)
  for (const step of near) {
    const place = settlements[step.id]
    if (!place || place.population <= 0) continue
    if (sideOfOwner(politics, place.owner) !== side) continue
    const besiegers = bands.filter(
      (one) =>
        one.locationId === step.id &&
        one.goal.type === 'siege' &&
        one.kingdomId !== side &&
        one.kingdomId !== null &&
        atWar(politics, side, one.kingdomId),
    )
    if (besiegers.length === 0) continue
    // Выручают, если есть чем: под стены с горстью людей не ходят.
    const theirs = besiegers.reduce((sum, one) => sum + bandSize(one), 0)
    if (theirs > bandSize(band) * WARMIND.avoidLine) continue
    return step.id
  }
  return null
}

// --- цель кампании и слабые места (Во3, Во5) --------------------------------

/**
 * Насколько место слабо (Во5).
 *
 * Пустой гарнизон, разорённая округа и голод видны всякому, кто подошёл
 * близко. Против игрока это работает так же, как против коронных земель: у ИИ
 * нет отдельного правила для него.
 */
export function weakness(settlement: Settlement): number {
  const garrison = garrisonSize(settlement)
  const guarded = garrison / Math.max(1, settlement.population / 400)
  return Math.round((2 - Math.min(2, guarded) + settlement.banditry) * 100) / 100
}

/**
 * Как дружина выбирает цель (Во3 и Во5).
 *
 * Прежде брали ближайшее. Теперь считают: земля той короны, против которой
 * идёт война короны-хозяйки, весит больше; слабое место весит больше крепкого;
 * дальнее — меньше ближнего. Ближайшее село перестаёт быть целью само по себе.
 */
export function pickTarget(
  settlements: Readonly<Record<string, Settlement>>,
  politics: Politics,
  targets: readonly string[],
  hops: ReadonlyMap<string, number>,
  aimSide: string | null,
): string | null {
  let best: { id: string; score: number } | null = null
  for (const id of targets) {
    const place = settlements[id]
    if (!place || place.population <= 0) continue
    const side = sideOfOwner(politics, place.owner)
    const aimed = aimSide !== null && side === aimSide ? WARMIND.aimWeight : 0
    const score =
      aimed +
      weakness(place) * WARMIND.weakWeight +
      Math.min(3, place.population / 2500) -
      (hops.get(id) ?? 9) * 0.35
    if (!best || score > best.score) best = { id, score }
  }
  return best?.id ?? null
}

/** Против кого воюет эта сторона: цель кампании, а не ближайший сосед. */
export function aimSideOf(politics: Politics, side: string | null): string | null {
  if (!side) return null
  const war = politics.wars.find((one) => one.a === side || one.b === side)
  if (!war) return null
  return war.a === side ? war.b : war.a
}

export { WARMIND }
