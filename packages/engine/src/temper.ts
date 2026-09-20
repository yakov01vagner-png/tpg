import { skillLevel } from './character'
import { TEMPER, TEMPER_WORDS, TRAITS, TRAIT_DEFS, type TraitId } from './content/temper'
import { fameOf } from './fame'
import { PLAYER, holdingsOf } from './holding'
import { playStyle } from './memory'
import { SKILLS, type SkillId } from './skills'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Нрав и привычки (этап 187).
 *
 * Герой не имел нрава: он был суммой навыков и списком дел. Мир складывал о нём
 * мнение (0.9), но сам человек от своих дел не менялся — ни в разговоре, ни в
 * том, что ему даётся легче.
 *
 * Здесь нрав вырастает из сделанного, и ничего нового для этого не хранится:
 * черты считаются из войн, судов, обманов, даров, казны и дорог, которые уже
 * записаны.
 */

export interface Trait {
  readonly id: TraitId
  readonly weight: number
  readonly says: string
}

/** Каким ты стал (Нр1). */
export function traitsOf(state: GameState, world: World, day: number): readonly Trait[] {
  const wars = state.politics.wars.filter((one) => one.a === PLAYER || one.b === PLAYER).length
  const battles = state.battlesWon
  const heard = state.courtLog?.heard ?? 0
  const sold = state.courtLog?.sold ?? 0
  const tricks =
    (state.spies ?? []).length + (state.rumours ?? []).length + (state.ruses ?? []).length
  const gifts = Object.keys(state.deeds ?? {}).length
  const piety = state.piety ?? 0
  const coin = Math.round(state.character.money / 2000)
  const seen = Object.keys(state.marks ?? {}).length
  const kept = (state.vows ?? []).filter((one) => one.keptDay !== undefined).length
  const broken = (state.vows ?? []).filter((one) => one.brokenDay !== undefined).length
  const scores: Record<TraitId, number> = {
    hard: wars * 2 + battles,
    just: Math.max(0, heard - sold * 2) + kept * 2,
    sly: tricks * 2 + broken,
    open: kept + wars,
    greedy: coin,
    pious: gifts * 2 + Math.round(piety / 10),
    restless: Math.round(seen / 2),
  }
  return TRAITS.map((id) => ({
    id,
    weight: scores[id],
    says: `${TRAIT_DEFS[id].label}: ${TRAIT_DEFS[id].from}. ${TRAIT_DEFS[id].says}`,
  }))
    .filter((one) => one.weight >= TEMPER.needs)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, TEMPER.shows)
}

/** Нрав словами — и то же самое со стороны (Нр1, Нр2). */
export function temperSays(state: GameState, world: World, day: number): string {
  const traits = traitsOf(state, world, day)
  if (traits.length === 0) return TEMPER_WORDS.none
  const style = playStyle(state, day)
  return `${TEMPER_WORDS.grew} Ты ${traits.map((one) => TRAIT_DEFS[one.id].label).join(', ')}. ${
    traits[0]?.says ?? ''
  } ${TEMPER_WORDS.seen} Со стороны: ${style.says}`
}

/** Привычка и ржавчина (Нр3). */
export function habitsOf(
  state: GameState,
  day: number,
): {
  readonly habits: readonly SkillId[]
  readonly rusty: readonly SkillId[]
  readonly says: string
} {
  const rows = (Object.keys(SKILLS) as SkillId[])
    .map((id) => ({ id, level: skillLevel(state.character, id) }))
    .sort((a, b) => b.level - a.level)
  // Привычка — то, что делают, а не то, что стоит первым в пустом списке: у
  // новичка все умения по нулям, и называть их привычками было бы враньём.
  const habits = rows
    .filter((one) => one.level > 0)
    .slice(0, TEMPER.habits)
    .map((one) => one.id)
  const rusty = rows.filter((one) => one.level === 0).map((one) => one.id)
  return {
    habits,
    rusty,
    says: `${TEMPER_WORDS.habit} Привычное: ${habits.join(', ')} (×${TEMPER.habitEases}); нетронутое: ${rusty.length} умений.`,
  }
}

/** Во сколько раз дело даётся легче или тяжелее (Нр3). */
export function easeOf(state: GameState, skill: SkillId, day: number): number {
  const rows = habitsOf(state, day)
  if (rows.habits.includes(skill)) return TEMPER.habitEases
  if (rows.rusty.includes(skill)) return TEMPER.rustCosts
  return 1
}

/** Как это звучит в разговоре (Нр4). */
export function voiceOfTemper(state: GameState, world: World, day: number, plain: string): string {
  const first = traitsOf(state, world, day)[0]
  if (!first) return plain
  return `Ты говоришь ${TRAIT_DEFS[first.id].voice}: «${plain}»`
}

/** Перемена жизни (Нр5). */
export function breakTemper(
  state: GameState,
  world: World,
  day: number,
): { readonly fame: number; readonly years: number; readonly says: string } {
  const fame = Math.round(fameOf(state, 'noble') * TEMPER.breaksFame)
  return {
    fame,
    years: TEMPER.breaksYears,
    says: `${TEMPER_WORDS.break} Славы у знати ${fame}, лет ${TEMPER.breaksYears}: столько нужно, чтобы о тебе заговорили иначе.`,
  }
}

/** Нрав в числах (Нр6). */
export function temperRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly traits: readonly TraitId[]
  readonly places: number
  readonly says: string
} {
  const traits = traitsOf(state, world, day).map((one) => one.id)
  return {
    traits,
    places: holdingsOf(state.settlements, PLAYER).length,
    says: `Черт видно ${traits.length}: ${traits.map((one) => TRAIT_DEFS[one].label).join(', ') || '—'}. ${habitsOf(state, day).says}`,
  }
}
