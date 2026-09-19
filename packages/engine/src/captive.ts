import { lordTemper } from './castle'
import type { CaptiveFate } from './content/field'
import { lordRep } from './reputation'
import type { GameState } from './state'
import { lordById } from './war'

/**
 * Пленный лорд (этап 58, Б6).
 *
 * До сих пор победа над дружиной лорда кончалась строкой «пленных: столько-то».
 * Но взять в бою самого хозяина — дело другого разряда: за него платят, ему
 * можно навязать присягу, его можно отпустить и можно повесить. Каждое из
 * четырёх решений мир помнит по-своему, и это единственное, что делает плен
 * плохим или хорошим.
 */
export interface Captive {
  readonly id: string
  readonly name: string
  readonly title: string
  readonly kingdomId: string | null
  /** С какого дня сидит. */
  readonly since: number
  /** Чего стоит его выкуп. */
  readonly ransom: number
}

/** Насколько вероятно, что в разбитой дружине оказался сам лорд. */
export const LORD_CAPTURE_CHANCE = 0.35
/** Выкуп: сила дружины на это число. */
export const RANSOM_PER_STRENGTH = 14

export function ransomFor(strength: number): number {
  return Math.max(150, Math.round(strength * RANSOM_PER_STRENGTH))
}

/**
 * Кого можно было взять в этом бою.
 *
 * Только того, кто и правда стоял напротив: разбойники лордов не рождают, а
 * корона в бой сама не выходит.
 */
export function captiveFrom(state: GameState, foeId: string | null, day: number): Captive | null {
  if (!foeId) return null
  const lord = lordById(state.politics, foeId)
  if (!lord) return null
  if (state.captives?.some((one) => one.id === lord.id)) return null
  return {
    id: lord.id,
    name: lord.name,
    title: lord.title,
    kingdomId: lord.kingdomId,
    since: day,
    ransom: ransomFor(lord.strength),
  }
}

/**
 * Что решение с пленным делает с миром.
 *
 * Серебро, милость самого пленного, милость прочих лордов его короны и слава.
 * Гордый нрав присягу помнит как обиду, покладистый — как долг: потому одна и
 * та же милость ложится по-разному.
 */
export function fateOutcome(
  state: GameState,
  captive: Captive,
  fate: CaptiveFate,
): {
  readonly money: number
  readonly ownFavour: number
  readonly kinFavour: number
  readonly renown: number
  readonly word: string
} {
  const lord = lordById(state.politics, captive.id)
  const temper = lord ? lordTemper(lord) : 'shrewd'
  const proud = temper === 'proud' || temper === 'grim'
  switch (fate) {
    case 'ransom':
      return {
        money: captive.ransom,
        ownFavour: proud ? -12 : -6,
        kinFavour: -2,
        renown: 0,
        word: `${captive.name} выкуплен. Серебро взято, обида записана.`,
      }
    case 'oath':
      return {
        money: 0,
        // Гордому присяга под стражей — унижение, которое он не забудет.
        ownFavour: proud ? -20 : 18,
        kinFavour: -6,
        renown: 1,
        word: proud
          ? `${captive.name} дал слово сквозь зубы. Такое слово держат до первой возможности.`
          : `${captive.name} дал слово и, кажется, сам этому рад.`,
      }
    case 'release':
      return {
        money: 0,
        ownFavour: 25,
        kinFavour: 8,
        renown: 0,
        word: `${captive.name} отпущен даром. Об этом расскажут раньше, чем о бое.`,
      }
    case 'execute':
      return {
        money: 0,
        ownFavour: 0,
        kinFavour: -35,
        renown: 2,
        word: `${captive.name} повешен у дороги. Его короне это передадут к вечеру.`,
      }
  }
}

/** Помнит ли пленный старое добро: по милости к нему до боя. */
export function captiveKnowsYou(state: GameState, captive: Captive): boolean {
  return lordRep(state.reputation, captive.id) > 20
}
