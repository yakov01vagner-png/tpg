import { HEARTH, HEARTH_WORDS } from './content/hearth'
import { CHILD_BENTS } from './content/home'
import type { WayId } from './content/way'
import type { Child } from './dynasty'
import { PLAYER } from './holding'
import { childBent, spouseMood, spouseSays, spouseTemper, upbringingOf } from './home'
import { royalHouse } from './royal'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Семья, с которой говорят (этап 170).
 *
 * С 0.5 у героя есть жена и дети: у жены нрав и мерило, у детей — склонность, с
 * 0.9 детей ещё и воспитывают. Не хватало разговора. Жена встречала одной и той
 * же строкой, дети росли долей умения, наследник не мог быть против тебя, а
 * родня в чужих домах была строкой в политике.
 *
 * Здесь дом начинает говорить — и снова без новых величин: мнение жены берётся
 * из её мерила и твоих дел, человек в ребёнке — из склонности и воспитания,
 * разлад — из того, что наследник хочет не того, чего ты, а родня при чужих
 * дворах — из браков, которые уже заключены.
 */

/** Лад в доме, 0..100: не новое число, а счёт по тому, что в доме есть. */
export function accordOf(state: GameState, day: number): number {
  const talked: Readonly<Record<string, number>> = state.homeTalk ?? {}
  const fresh = Object.values(talked).filter((when) => day - when <= HEARTH.holds).length
  const mood = spouseTemper(state.character.family) ? spouseMood(state) : 50
  const raised = Object.values(state.upbringing ?? {}).reduce((sum, one) => sum + one, 0)
  const shames = (state.shames ?? []).length
  return Math.max(
    0,
    Math.min(100, Math.round(mood * 0.6 + fresh * 6 + Math.min(20, raised * 2) - shames * 8)),
  )
}

/** Что думает жена и что она может (Сем1). */
export function spouseView(
  state: GameState,
  world: World,
  day: number,
): {
  readonly name: string
  readonly mood: number
  readonly house: string | null
  readonly can: string
  readonly says: string
} | null {
  const spouse = state.character.family.spouse
  if (!spouse) return null
  const mood = spouseMood(state)
  // Её род — не строка: за ней стоит двор, и её слово там слышат.
  const house = spouse.kingdomId ?? spouse.lordId ?? null
  const can =
    spouse.kingdomId !== null
      ? `сказать слово при дворе ${world.kingdoms[spouse.kingdomId]?.name ?? spouse.kingdomId}`
      : spouse.lordId !== null
        ? 'говорить с роднёй мужнина дома'
        : 'держать дом, пока ты в походе'
  return {
    name: spouse.name,
    mood,
    house,
    can,
    says: `${spouse.name}: «${spouseSays(state)}» ${HEARTH_WORDS.spouse} Расположение ${mood}; может ${can}.`,
  }
}

/** Человек в ребёнке (Сем2): склонность, воспитание и то, кем он выйдет. */
export function childNow(
  state: GameState,
  child: Child,
  day: number,
): {
  readonly name: string
  readonly age: number
  readonly bent: string
  readonly raised: number
  readonly heir: boolean
  readonly says: string
} {
  const age = Math.max(0, Math.floor((day - child.bornDay) / 365))
  const bent = childBent(child)
  const raised = upbringingOf(state, child)
  const def = CHILD_BENTS[bent]
  return {
    name: child.name,
    age,
    bent,
    raised,
    heir: child.heir,
    says: `${child.name}, ${age} лет${child.heir ? ' (наследник)' : ''}: ${def.label}. ${def.about} Вложено ${raised}.`,
  }
}

/** К какому пути тянет эта склонность: из неё и выходит согласие или спор. */
const BENT_WAY: Readonly<Record<string, WayId>> = {
  sword: 'crown',
  book: 'might',
  coin: 'trade',
  land: 'house',
  faith: 'faith',
}

/**
 * Разлад в доме (Сем4).
 *
 * Наследник, который вырос, хочет не того, чего ты: это видно по его
 * склонности и по тому, каким путём идёшь ты. Это не смута — с ним нельзя
 * воевать, с ним можно только говорить.
 */
export function houseRift(
  state: GameState,
  world: World,
  day: number,
  mine: WayId,
): { readonly who: string | null; readonly why: string; readonly accord: number } {
  const accord = accordOf(state, day)
  const heir = state.character.family.children.find((one) => one.heir)
  if (!heir) {
    return { who: null, why: 'Наследника нет: спорить о твоём пути некому.', accord }
  }
  const grown = childNow(state, heir, day)
  const wants = BENT_WAY[childBent(heir)] ?? 'house'
  if (grown.age < HEARTH.ownMindAt) {
    return { who: null, why: `${heir.name} ещё мал: своего мнения у него нет.`, accord }
  }
  if (wants === mine && accord >= HEARTH.rift) {
    return { who: null, why: `${HEARTH_WORDS.accord} ${heir.name} идёт за тобой.`, accord }
  }
  return {
    who: heir.name,
    why: `${HEARTH_WORDS.heir} Ты идёшь ${mine}, он тянет ${wants} (${CHILD_BENTS[childBent(heir)].label}). Лад в доме ${accord}.`,
    accord,
  }
}

/** Родня при чужих дворах (Сем5): живые люди, а не строка в политике. */
export function kinAbroad(
  state: GameState,
  world: World,
  day: number,
): readonly {
  readonly kingdomId: string
  readonly who: string
  readonly can: string
  readonly says: string
}[] {
  const rows: { kingdomId: string; who: string; can: string; says: string }[] = []
  for (const one of state.marriages ?? []) {
    const house = royalHouse(world, one.kingdomId, day)
    const who = house.spouse ?? house.name
    rows.push({
      kingdomId: one.kingdomId,
      who,
      can: 'замолвить слово перед своей короной',
      says: `${world.kingdoms[one.kingdomId]?.name ?? one.kingdomId}: твоя родня там — ${who} (${house.title} ${house.name}). ${HEARTH_WORDS.kin}`,
    })
  }
  return rows
}

/** Дом в числах (Сем6). */
export function hearthRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly children: number
  readonly raised: number
  readonly accord: number
  readonly kin: number
  readonly says: string
} {
  const children = state.character.family.children.map((one) => childNow(state, one, day))
  const raised = children.reduce((sum, one) => sum + one.raised, 0)
  const accord = accordOf(state, day)
  const kin = kinAbroad(state, world, day).length
  const spouse = spouseView(state, world, day)
  return {
    children: children.length,
    raised,
    accord,
    kin,
    says: `Дом: ${spouse ? `${spouse.name} (${spouse.mood})` : 'без жены'}, детей ${children.length}${
      children.length > 0
        ? ` (${children.map((one) => `${one.name} ${one.age} — ${CHILD_BENTS[childBent({ name: one.name, bornDay: day - one.age * 365, heir: one.heir })].label}`).join(', ')})`
        : ''
    }; вложено ${raised}, лад ${accord}, родня при чужих дворах ${kin}.`,
  }
}

export const PLAYER_HOUSE = PLAYER
