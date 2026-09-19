import {
  ARTIFACTS_BY_ID,
  type ArtifactDef,
  FEAR_BY_PEOPLE,
  FORGET_DAYS,
  MASTERY_LABELS,
  MASTERY_LUCK,
  MASTERY_POWER,
  MASTERY_STEPS,
  RAIN_HARVEST,
  type WeatherKind,
} from './content/lore'
import type { SpellDef, SpellFamily } from './content/spells'
import type { GameState } from './state'

/**
 * Магия в мире (этап 60): ремесло, цена, погода и вещи.
 *
 * Что здесь считается: насколько заклинание твоё (мастерство), чего стоит
 * колдовать на людях (страх), что делает с землёй позванная погода и что даёт
 * вещь с чарами.
 */

// --- заклинание как ремесло (А5) -------------------------------------------

/** Сколько раз творили и когда в последний раз. */
export interface Craftwork {
  readonly uses: number
  readonly day: number
}

export type Spellcraft = Readonly<Record<string, Craftwork>>

export function craftOf(state: Pick<GameState, 'spellcraft'>, spellId: string): Craftwork {
  return state.spellcraft?.[spellId] ?? { uses: 0, day: 0 }
}

/**
 * Ступень мастерства по числу повторений — с поправкой на забвение.
 *
 * Заклинание, которое не творили восемь месяцев, помнится хуже: за каждый такой
 * срок ступень садится на одну. Потому «своё» — это не то, чему научился, а то,
 * что делаешь.
 */
export function masteryOf(work: Craftwork, day: number): number {
  let step = 0
  for (const [index, needed] of MASTERY_STEPS.entries()) {
    if (work.uses >= needed) step = index
  }
  if (work.day > 0 && day > work.day) {
    step -= Math.floor((day - work.day) / FORGET_DAYS)
  }
  return Math.max(0, Math.min(MASTERY_STEPS.length - 1, step))
}

export function masteryWord(step: number): string {
  return MASTERY_LABELS[Math.max(0, Math.min(MASTERY_LABELS.length - 1, step))] ?? 'наугад'
}

/** Насколько мастерство прибавляет к удаче. Высшая ступень — четверть. */
export function masteryLuck(step: number): number {
  return (step / (MASTERY_STEPS.length - 1)) * MASTERY_LUCK
}

/** Насколько мастерство прибавляет к силе. */
export function masteryPower(step: number): number {
  return 1 + (step / (MASTERY_STEPS.length - 1)) * MASTERY_POWER
}

/** Заклинание с повторением: одно творение — одна засечка. */
export function withUse(craft: Spellcraft | undefined, spellId: string, day: number): Spellcraft {
  const now = craft?.[spellId] ?? { uses: 0, day: 0 }
  return { ...(craft ?? {}), [spellId]: { uses: now.uses + 1, day } }
}

export function withUses(
  craft: Spellcraft | undefined,
  spellId: string,
  times: number,
  day: number,
): Spellcraft {
  const now = craft?.[spellId] ?? { uses: 0, day: 0 }
  return { ...(craft ?? {}), [spellId]: { uses: now.uses + times, day } }
}

// --- цена магии (А4) --------------------------------------------------------

/**
 * Чего стоит колдовать на людях.
 *
 * Деревня видит то, чего не понимает, и запоминает это надолго; город видел
 * всякое. Возвращается сдвиг к памяти места — тем больший, чем место меньше.
 */
export function fearOf(population: number): number {
  return population < FEAR_BY_PEOPLE.small ? FEAR_BY_PEOPLE.smallChill : FEAR_BY_PEOPLE.bigChill
}

// --- погода по зову (А3) ----------------------------------------------------

export interface Weather {
  readonly locationId: string
  readonly kind: WeatherKind
  readonly untilDay: number
}

export function weatherAt(
  state: Pick<GameState, 'weather'>,
  locationId: string,
  day: number,
): readonly Weather[] {
  return (state.weather ?? []).filter((one) => one.locationId === locationId && one.untilDay >= day)
}

export function hasWeather(
  state: Pick<GameState, 'weather'>,
  locationId: string,
  kind: WeatherKind,
  day: number,
): boolean {
  return weatherAt(state, locationId, day).some((one) => one.kind === kind)
}

/** Насколько позванный дождь поправляет год. */
export function rainBonus(): number {
  return RAIN_HARVEST
}

// --- артефакты (А6) ---------------------------------------------------------

/** Вещь с чарами: то, что у тебя на руках. */
export interface Artifact {
  readonly id: string
  readonly defId: string
  /** Где взята: в глуши или сделана. */
  readonly found: 'wild' | 'made'
  readonly day: number
}

export function artifactDef(defId: string): ArtifactDef | null {
  return ARTIFACTS_BY_ID[defId] ?? null
}

/**
 * Что вещи прибавляют к этому роду чар.
 *
 * Складывается: два перстня огня — полторы силы. Но вещь ничего не открывает:
 * тому, кто не дорос до заклинания, она его не даст.
 */
export function artifactPower(state: Pick<GameState, 'artifacts'>, family: SpellFamily): number {
  let power = 1
  for (const one of state.artifacts ?? []) {
    const def = artifactDef(one.defId)
    if (def?.family === family) power += def.power
  }
  return power
}

export function artifactsOf(state: Pick<GameState, 'artifacts'>): readonly Artifact[] {
  return state.artifacts ?? []
}

/** Полная сила заклинания: мастерство и вещи вместе. */
export function spellPower(
  state: Pick<GameState, 'spellcraft' | 'artifacts'>,
  spell: SpellDef,
  day: number,
): number {
  return masteryPower(masteryOf(craftOf(state, spell.id), day)) * artifactPower(state, spell.family)
}
