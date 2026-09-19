import type { CechDef, CraftRankDef, MasterTemperId } from './content/craft'
import {
  CECHS,
  CECH_DUES,
  CECH_DUES_DAYS,
  CECH_PAY,
  CECH_POPULATION,
  CRAFT_MASTERS,
  CRAFT_MASTER_NAMES,
  CRAFT_RANKS,
  MASTER_TEMPER_IDS,
  QUALITY_LABELS,
} from './content/craft'
import type { JobDef } from './content/jobs'
import type { Settlement } from './economy'
import type { SkillId } from './skills'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Ремесло и выучка (этап 50).
 *
 * Работа перестаёт быть строкой «смена окончена». У каждой из полусотни работ
 * есть ступени: подёнщик, подмастерье, работник, мастер. Ступень считается по
 * числу отстоянных смен — их и хранит состояние (`GameState.craft`); всё
 * остальное — мастер у горна, цех в городе, клеймо на вещи — выводится из
 * места, как купцы (этап 49) и школы (этап 40).
 */

/** Сколько смен отстоял на этой работе. */
export function shiftsOf(state: Pick<GameState, 'craft'>, jobId: string): number {
  return state.craft?.[jobId] ?? 0
}

/** Ступень выучки по числу смен. */
export function rankOfShifts(shifts: number): CraftRankDef {
  let best = CRAFT_RANKS[0] as CraftRankDef
  for (const rank of CRAFT_RANKS) if (shifts >= rank.shifts) best = rank
  return best
}

export function craftRank(state: Pick<GameState, 'craft'>, jobId: string): CraftRankDef {
  return rankOfShifts(shiftsOf(state, jobId))
}

/** Следующая ступень и сколько смен до неё. Пусто — выше некуда. */
export function nextCraftRank(shifts: number): { rank: CraftRankDef; left: number } | null {
  for (const rank of CRAFT_RANKS) {
    if (shifts < rank.shifts) return { rank, left: rank.shifts - shifts }
  }
  return null
}

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * Мастер, у которого работаешь (этап 50, М2).
 *
 * У всякой работы в месте есть хозяин: он берёт или гонит, платит по-своему и
 * по-своему учит. Выводится из места и работы — значит, в одном городе у
 * кузни один хозяин, и он там всегда тот же.
 */
export interface CraftMaster {
  readonly id: string
  readonly name: string
  readonly temper: MasterTemperId
  readonly jobId: string
  readonly locationId: string
}

export function masterOf(locationId: string, job: JobDef): CraftMaster {
  const hash = hashOf(`${locationId}|${job.id}`)
  // Перемешиваем прежде, чем брать остаток: на близких строках младшие разряды
  // повторяются, и два мастера в одном урочище звались одинаково (этап 71).
  const mixed = (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
  return {
    id: `master:${locationId}:${job.id}`,
    name: CRAFT_MASTER_NAMES[mixed % CRAFT_MASTER_NAMES.length] ?? 'Мастер',
    temper: MASTER_TEMPER_IDS[(hash >>> 9) % MASTER_TEMPER_IDS.length] ?? 'fair',
    jobId: job.id,
    locationId,
  }
}

/**
 * Возьмёт ли он тебя.
 *
 * Строгий не берёт незнакомых: сперва поработай у тех, кто проще. Разборчивость
 * меряется тем, что мастер видит: сколько смен ты вообще отстоял в этом городе
 * и как тебя принимает место.
 */
export function masterHires(
  master: CraftMaster,
  experience: number,
  welcome: number,
): { readonly hires: boolean; readonly says: string } {
  const def = CRAFT_MASTERS[master.temper]
  // Считается вся выучка, а не смены у него: «поработай у других, потом
  // приходи» — это и есть про чужие смены.
  const shown = 0.3 + Math.min(0.6, experience / 30) + Math.max(-0.4, Math.min(0.4, welcome / 100))
  const hires = shown >= def.demand
  return {
    hires,
    says: hires ? (def.hires[0] ?? '') : (def.refuses[0] ?? ''),
  }
}

/** Во сколько раз этот мастер платит и учит. */
export function masterPay(master: CraftMaster): number {
  return CRAFT_MASTERS[master.temper].pay
}

export function masterTeaches(master: CraftMaster): number {
  return CRAFT_MASTERS[master.temper].teach
}

export function masterPraises(master: CraftMaster): string {
  return CRAFT_MASTERS[master.temper].praises[0] ?? ''
}

/**
 * Цех места (этап 50, М6).
 *
 * Ремесленники держатся вместе: цех берёт взнос, держит цену и не пускает
 * чужих выше подмастерья. В каждом ремесленном городе свой; какой именно —
 * решает место.
 */
export function cechAt(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  locationId: string,
): CechDef | null {
  const place = world.locations[locationId]
  if (!place) return null
  const population = settlements[locationId]?.population ?? place.population
  if (population < CECH_POPULATION) return null
  const hash = hashOf(locationId)
  return CECHS[hash % CECHS.length] ?? null
}

/** Членство в цехе: одно на героя, как и орден. */
export interface CechMembership {
  readonly locationId: string
  readonly cechId: string
  readonly since: number
  readonly paidUntil: number
}

/** Держит ли цех эту работу: по навыкам, которые она растит. */
export function cechHolds(cech: CechDef, job: JobDef): boolean {
  return Object.keys(job.practice).some((skill) => cech.skills.includes(skill as SkillId))
}

/**
 * Работа мастера в цеховом городе — только для своих. Это и есть цех: не
 * надбавка, а дверь; до неё расти полторы сотни смен, и тогда выбор встаёт
 * ребром — платить взнос или идти в другой город.
 */
export function cechLets(
  cech: CechDef | null,
  member: CechMembership | null,
  job: JobDef,
  rank: CraftRankDef,
  locationId: string,
): boolean {
  if (!cech || !cechHolds(cech, job)) return true
  // Дверь закрывается на самой верхней ступени: работник работает, а вот
  // работой мастера в цеховом городе распоряжается цех.
  if (rank.shifts < (CRAFT_RANKS[3]?.shifts ?? 100)) return true
  return member !== null && member.locationId === locationId
}

/** Во сколько раз платят цеховому. */
export function cechPay(
  cech: CechDef | null,
  member: CechMembership | null,
  job: JobDef,
  locationId: string,
): number {
  if (!cech || !member || member.locationId !== locationId) return 1
  return cechHolds(cech, job) ? CECH_PAY : 1
}

export { CECH_DUES, CECH_DUES_DAYS }

/**
 * Качество вещи (этап 50, М4).
 *
 * Вещь, сделанная руками, несёт клеймо: чья она, где сделана и какова. Это не
 * украшение — от качества зависит, как вещь бьёт, как держит удар и во сколько
 * обойдётся починка.
 */
export interface Mark {
  /** Кто сделал: имя мастера или героя. */
  readonly maker: string
  /** Где. */
  readonly place: string
  /** Каково, 0..4. */
  readonly quality: number
}

/** Качество по умению и выучке: от грубой работы до работы мастера. */
export function qualityFrom(engineering: number, rank: CraftRankDef, roll: number): number {
  const base = engineering / 40 + (rank.pay - 1) * 0.8 + roll * 0.6
  return Math.max(0, Math.min(4, Math.round(base)))
}

export function qualityLabel(quality: number): string {
  return QUALITY_LABELS[Math.max(0, Math.min(QUALITY_LABELS.length - 1, quality))] ?? ''
}

/** Во сколько раз качество меняет прок от вещи: от трёх четвертей до полутора. */
export function qualityFactor(quality: number | undefined): number {
  if (quality === undefined) return 1
  return 0.75 + quality * 0.1875
}

/** Клеймо словами: «Меч, работа мастера, Вакула из Ре-Эстиза». */
export function markWords(mark: Mark): string {
  return `${qualityLabel(mark.quality)}, ${mark.maker} из ${mark.place}`
}

/** Вся выучка героя: сколько смен отстоял во всех ремёслах вместе. */
export function experienceOf(state: Pick<GameState, 'craft'>): number {
  return Object.values(state.craft ?? {}).reduce((sum, one) => sum + one, 0)
}
