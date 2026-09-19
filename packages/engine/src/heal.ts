import {
  AILMENTS,
  AILMENT_DEFS,
  type Ailment,
  type AilmentCause,
  FESTER_HARM,
  FESTER_SLOW,
  HEALER_KINDS,
  HEALER_KIND_DEFS,
  HEALER_NAMES,
  HEALER_POPULATION,
  type HealerKind,
  MAIM_CHANCE,
  POTIONS_BY_ID,
  QUARANTINE_DAYS,
  WOUND_KINDS,
  WOUND_KIND_DEFS,
  type WoundKind,
} from './content/heal'
import type { Settlement } from './economy'
import type { GameState } from './state'
import type { Season } from './time'
import type { PlaceKind, Terrain, World } from './world/types'
import type { Wound } from './wounds'

/**
 * Мор, раны и лекари (этап 64).
 *
 * Лекарь выводится из места, как купец из рынка: в состоянии — только рана и то,
 * что с ней сделали. У раны есть род и своя история: она заживает, гноится и
 * оставляет след, — а у отряда есть болезни, которые держатся, пока держится
 * причина.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

// --- лекарь (Ж1) ------------------------------------------------------------

export interface Healer {
  readonly id: string
  readonly name: string
  readonly kind: HealerKind
  /** Умение 0..30: от него и скорость, и цена. */
  readonly skill: number
}

/**
 * Кто здесь лечит.
 *
 * В селе — знахарка, в городе бывает и учёный лекарь. Чем больше место, тем
 * вероятнее, что тебя будут лечить книгой, а не наговором.
 */
export function healerAt(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  locationId: string,
): Healer | null {
  const settlement = settlements[locationId]
  const place = world.locations[locationId]
  if (!settlement || !place || settlement.population < HEALER_POPULATION) return null
  const hash = hashOf(`healer|${locationId}`)
  // Учёный лекарь садится там, где есть кому платить.
  const big = settlement.population > 4000
  const pool: readonly HealerKind[] = big
    ? HEALER_KINDS
    : (['herbwife', 'barber', 'charlatan'] as const)
  const kind = pool[hash % pool.length] ?? 'herbwife'
  return {
    id: `healer:${locationId}`,
    name: HEALER_NAMES[(hash >>> 5) % HEALER_NAMES.length] ?? 'знахарка',
    kind,
    skill: 4 + ((hash >>> 9) % 24),
  }
}

export function healerDef(kind: HealerKind) {
  return HEALER_KIND_DEFS[kind]
}

/** Во что встанет лечение этой раны у этого лекаря. */
export function healerPrice(healer: Healer, wound: Wound): number {
  const def = healerDef(healer.kind)
  return Math.max(4, Math.round(def.price * (1 + healer.skill / 20) * (1 + wound.severity)))
}

/** Во сколько раз быстрее заживает под его рукой. */
export function healerSpeed(healer: Healer): number {
  return healerDef(healer.kind).speed * (1 + healer.skill / 60)
}

// --- рана как история (Ж2) --------------------------------------------------

export function woundKindDef(kind: WoundKind) {
  return WOUND_KIND_DEFS[kind]
}

export function woundKindOf(wound: Wound): WoundKind {
  return wound.kind ?? 'cut'
}

/** Насколько вероятно, что рана загноится за сутки без ухода. */
export function festerChance(wound: Wound, care: number): number {
  if (wound.festering) return 0
  return Math.max(0, woundKindDef(woundKindOf(wound)).fester * (1 - care))
}

/** Что гноение делает с раной. */
export function festered(wound: Wound): Wound {
  return {
    ...wound,
    festering: true,
    severity: Math.min(1, wound.severity + FESTER_HARM),
    daysLeft: Math.round(wound.daysLeft * FESTER_SLOW),
  }
}

/** Оставит ли эта рана след. */
export function maimChance(wound: Wound): number {
  return wound.festering ? MAIM_CHANCE : MAIM_CHANCE * 0.2
}

/** Какой род раны даёт такая беда. */
export function woundKindFor(cause: 'blade' | 'fall' | 'fire' | 'sick'): WoundKind {
  if (cause === 'fall') return 'break'
  if (cause === 'fire') return 'burn'
  if (cause === 'sick') return 'fever'
  return 'cut'
}

export const ALL_WOUND_KINDS = WOUND_KINDS

// --- зелья (Ж4) -------------------------------------------------------------

export function potionDef(id: string) {
  return POTIONS_BY_ID[id] ?? null
}

export function potionsOf(state: Pick<GameState, 'potions'>): Readonly<Record<string, number>> {
  return state.potions ?? {}
}

export function potionCount(state: Pick<GameState, 'potions'>, id: string): number {
  return potionsOf(state)[id] ?? 0
}

// --- болезни отряда (Ж5) ----------------------------------------------------

export function ailmentDef(ailment: Ailment) {
  return AILMENT_DEFS[ailment]
}

/** Чем болеет отряд сейчас. */
export function ailmentOf(state: Pick<GameState, 'ailment'>): Ailment | null {
  return state.ailment?.kind ?? null
}

/**
 * Где и от чего берутся хвори (этап 73, Б6).
 *
 * Причина болезни — данные (`AILMENT_DEFS`), а логика только сверяет их с тем,
 * где герой стоит. Пока хворей было три, причины лежали тремя ветками в
 * `sicken`; на двенадцати ветки стали таблицей, а код — одной проверкой.
 */
export interface SickWhere {
  /** В море и без свежей еды: со свежей цинги не бывает. */
  readonly atSea: boolean
  readonly terrain: Terrain | null
  readonly archetype: PlaceKind | null
  readonly season: Season
  /** В пути, а не под крышей. */
  readonly onRoad: boolean
  /** В осаде или под мором. */
  readonly besieged: boolean
  /** Отряду нечего есть. */
  readonly hungry: boolean
  /** Тесный город без бани. */
  readonly crowded: boolean
  /** Ночует в глуши. */
  readonly inWilds: boolean
}

export function causeHolds(cause: AilmentCause, where: SickWhere): boolean {
  switch (cause.kind) {
    case 'sea':
      return where.atSea
    case 'terrain':
      return (
        where.terrain === cause.terrain &&
        (cause.season === undefined || cause.season === where.season)
      )
    case 'siege':
      return where.besieged
    case 'road':
      return where.onRoad && where.season === cause.season
    case 'hunger':
      return where.hungry
    case 'crowd':
      return where.crowded
    case 'place':
      return where.archetype === cause.archetype
    case 'wilds':
      return where.inWilds
  }
}

/** Чем здесь можно заболеть и с какой охотой. */
export function ailmentsHere(where: SickWhere): readonly { ailment: Ailment; chance: number }[] {
  return AILMENTS.filter((ailment) => causeHolds(AILMENT_DEFS[ailment].cause, where)).map(
    (ailment) => ({ ailment, chance: AILMENT_DEFS[ailment].chance }),
  )
}

/** Держится ли ещё причина той хвори, которой болеет герой. */
export function ailmentHolds(ailment: Ailment, where: SickWhere): boolean {
  return causeHolds(AILMENT_DEFS[ailment].cause, where)
}

/** Во сколько раз медленнее идут больные. */
export function ailmentPace(state: Pick<GameState, 'ailment'>): number {
  const ailment = ailmentOf(state)
  return ailment ? ailmentDef(ailment).pace : 1
}

// --- карантин (Ж3) ----------------------------------------------------------

/**
 * Карантин остался тем, чем был (этап 41): решением хозяина запереть своё место,
 * пока в нём мор. Здесь, в этапе 64, к нему добавилось то, чего не хватало: мор
 * видно заранее по слухам из округи, и от него бегут — а запертые ворота эти
 * два движения останавливают вместе.
 *
 * Потому отдельного состояния у карантина нет: он лежит в самом поселении
 * (`Settlement.quarantined`), и это правильно — запертое место заперто для всех,
 * а не только для игрока.
 */
export const QUARANTINE_HOLDS = true
