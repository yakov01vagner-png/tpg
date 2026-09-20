import { houseOf } from './chronicle'
import { LINEAGE, LINEAGE_WORDS, LOSSES, LOSS_DEFS, type LossId } from './content/lineage'
import { TITLES } from './content/titles'
import { heirOf } from './dynasty'
import { shamesOf } from './fame'
import { PLAYER, holdingsOf } from './holding'
import type { GameState } from './state'
import { titleOf } from './title'
import type { World } from './world/types'

/**
 * Путь дома (этап 132).
 *
 * Дом считается не тем, что он приобрёл, а тем, чего не потерял. Поэтому у него
 * есть память о лучшем: сколько мест, какой титул и сколько чести было у дома в
 * лучший его день. Всё, что ниже, — потеря, и она названа.
 *
 * Хранится одна запись — лучшее. Вывести её нельзя: это история, а не состояние.
 * Всё остальное — потери, колена, родство — считается из мира.
 */

export interface HouseBest {
  readonly places: number
  readonly titleTier: number
  readonly shames: number
  readonly day: number
}

/** Лучшее, что у дома было: с этим и сверяется всё дальнейшее. */
export function bestOf(state: GameState): HouseBest {
  return state.houseBest ?? { places: 0, titleTier: 0, shames: 0, day: 0 }
}

/** Каков дом сейчас: те же три мерки, что и в лучшем дне. */
export function houseNow(state: GameState, world: World, day: number): HouseBest {
  return {
    places: holdingsOf(state.settlements, PLAYER).length,
    titleTier: TITLES.indexOf(titleOf(state)),
    shames: shamesOf(state).length,
    day,
  }
}

export interface Loss {
  readonly loss: LossId
  readonly says: string
}

/**
 * Что дом потерял против своего лучшего дня (Дм2).
 *
 * Не «стало хуже», а названная потеря: земля, титул, слово, наследник, имя.
 * Слово считается по нарушенным договорам, имя — по позорам, наследник — по
 * колену, кончившемуся без того, кому передать.
 */
export function lossesOf(state: GameState, world: World, day: number): readonly Loss[] {
  const best = bestOf(state)
  const now = houseNow(state, world, day)
  const out: Loss[] = []
  if (best.places > 0 && now.places < best.places) {
    out.push({
      loss: 'land',
      says: `${LOSS_DEFS.land.label}: было ${best.places} мест, осталось ${now.places}. ${LOSS_DEFS.land.about}`,
    })
  }
  if (best.titleTier > 0 && now.titleTier < best.titleTier) {
    out.push({
      loss: 'title',
      says: `${LOSS_DEFS.title.label}: дом стоял выше. ${LOSS_DEFS.title.about}`,
    })
  }
  const broken = (state.treaties ?? []).filter((one) => one.brokenBy === PLAYER).length
  if (broken > 0) {
    out.push({
      loss: 'word',
      says: `${LOSS_DEFS.word.label}: нарушенных договоров ${broken}. ${LOSS_DEFS.word.about}`,
    })
  }
  if (now.shames > best.shames) {
    out.push({
      loss: 'name',
      says: `${LOSS_DEFS.name.label}: позоров ${now.shames}. ${LOSS_DEFS.name.about}`,
    })
  }
  if (!heirOf(state.character.family, day) && state.character.age >= 45) {
    out.push({
      loss: 'heir',
      says: `${LOSS_DEFS.heir.label}: тебе ${state.character.age}, а передать некому. ${LOSS_DEFS.heir.about}`,
    })
  }
  return out
}

/** Насколько тяжелы потери: тяжёлое не забывается. */
export function lossWeight(losses: readonly Loss[]): number {
  return losses.reduce((sum, one) => sum + LOSS_DEFS[one.loss].weight, 0)
}

export interface HouseWay {
  readonly generations: number
  readonly clean: boolean
  readonly losses: readonly Loss[]
  readonly kin: number
  readonly finished: boolean
  readonly says: string
}

/** Где дом на своём пути (Дм1 и Дм5). */
export function houseWay(state: GameState, world: World, day: number): HouseWay {
  const generations = houseOf(state).length
  const losses = lossesOf(state, world, day)
  const kin = (state.marriages ?? []).length
  const clean = losses.length === 0
  const finished = generations >= LINEAGE.generations && clean && kin >= LINEAGE.kin
  return {
    generations,
    clean,
    losses,
    kin,
    finished,
    says: finished
      ? LINEAGE_WORDS.stands
      : `${LINEAGE_WORDS.three} Колен ${generations} из ${LINEAGE.generations}, родства ${kin} из ${LINEAGE.kin}. ${clean ? LINEAGE_WORDS.clean : `${LINEAGE_WORDS.lost} ${losses.map((one) => LOSS_DEFS[one.loss].label).join(', ')}.`}`,
  }
}

/**
 * Что даёт родство (Дм4).
 *
 * Родня признаёт (этап 131) и родня не воюет: у дома, вошедшего в чужие дома,
 * меньше врагов — не потому, что он сильнее, а потому, что война в родне дороже.
 */
export function kinSupport(
  state: GameState,
  world: World,
  day: number,
): {
  readonly kin: readonly string[]
  readonly calms: number
  readonly says: string
} {
  const kin = (state.marriages ?? []).map((one) => one.kingdomId)
  const names = kin.map((side) => world.kingdoms[side]?.name ?? side)
  return {
    kin,
    calms: LINEAGE.kinCalms,
    says:
      kin.length === 0
        ? `Родства с коронами нет. ${LINEAGE_WORDS.kin}`
        : `${LINEAGE_WORDS.kin} В родстве ${kin.length}: ${names.join(', ')}; охота воевать с роднёй — ${Math.round(LINEAGE.kinCalms * 100)} из ста обычной.`,
  }
}

/**
 * Насколько воспитан наследник (Дм3).
 *
 * Хранится одно число — сколько в него вложено, — потому что вывести его
 * нельзя. Платится оно часами государя: те же шесть часов, из которых состоит
 * его день (этап 107).
 */
export function raisedShare(state: GameState): number {
  return Math.min(LINEAGE.raiseMax, state.raised ?? 0)
}

/** Что достанется наследнику: третья доля отцовских умений плюс воспитание. */
export function heirGets(state: GameState): { readonly share: number; readonly says: string } {
  const raised = raisedShare(state)
  const share = Math.round((1 / 3 + raised) * 100) / 100
  return {
    share,
    says:
      raised === 0
        ? `Наследнику достанется треть твоего умения. ${LINEAGE_WORDS.raise}`
        : `Наследнику достанется ${Math.round(share * 100)} из ста твоего умения: треть сама и ${Math.round(raised * 100)} за воспитание.`,
  }
}

export { LINEAGE, LINEAGE_WORDS, LOSSES, LOSS_DEFS, type LossId }
