import {
  REPORT,
  REPORTED_DEFS,
  REPORTER_DEFS,
  REPORT_WORDS,
  type ReportedKind,
  type ReporterKind,
} from './content/report'
import { dailyTax } from './holding'
import { PLAYER, garrisonSize, holdingsOf } from './holding'
import { foodSecurity } from './life'
import type { GameState } from './state'
import { neighbourSettlements } from './world/queries'
import type { World } from './world/types'

/**
 * Донесения своих (этап 100).
 *
 * Своя земля отчитывалась мгновенно и точно: подать капала ровным числом, беда
 * появлялась в журнале в тот же день. Отсюда странность, которую до 0.8 никто не
 * замечал: у государя были самые точные сведения именно о том, чего он не видел
 * своими глазами.
 *
 * Здесь между землёй и тобой встаёт человек. Он пишет отчёт, отчёт идёт столько,
 * сколько идёт гонец, и в нём стоят его числа: угодливый пишет добрее, чем есть,
 * с рукой — оставляет себе часть и пишет ровно столько, чтобы не поймали. Узнать
 * правду можно — ревизией, но она стоит серебра, суток и отношений.
 *
 * Ничего лишнего не хранится: кто пишет, выводится из места, его хозяина и дня;
 * в состоянии остаются только сами отчёты — как вести (этап 99).
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

export function reporterDef(kind: ReporterKind) {
  return REPORTER_DEFS[kind]
}

export function reportedDef(kind: ReportedKind) {
  return REPORTED_DEFS[kind]
}

export interface Reporter {
  readonly locationId: string
  readonly name: string
  readonly kind: ReporterKind
  /** Сколько суток идёт его отчёт. */
  readonly days: number
  /** Проверяли ли его и когда. */
  readonly auditedDay: number | null
  readonly says: string
}

const NAMES = [
  'Лукьян',
  'Прокоп',
  'Гордей',
  'Севастьян',
  'Афанасий',
  'Пантелей',
  'Игнат',
  'Мирон',
] as const

/**
 * Кто отчитывается из этого места (Д1 и Д5).
 *
 * Выводится, а не хранится: имя и нрав — из места, а склонность к руке — из
 * того, далеко ли оно от твоего двора. Чем дальше место, тем чаще у него
 * заводится свой человек с собственным счётом.
 */
export function reporterAt(
  state: GameState,
  world: World,
  locationId: string,
  day: number,
): Reporter | null {
  const place = state.settlements[locationId]
  if (!place || place.owner !== PLAYER) return null
  const seed = hashOf(`reporter:${locationId}`)
  const hops = hopsFrom(state, world, locationId)
  const far = hops >= 4
  const kind: ReporterKind =
    seed % 9 === 0
      ? 'honest'
      : far && seed % 3 === 0
        ? 'thief'
        : seed % 4 === 0
          ? 'flatterer'
          : 'plain'
  const audited = state.audits?.[locationId] ?? null
  return {
    locationId,
    name: NAMES[seed % NAMES.length] ?? 'Лукьян',
    kind,
    days: Math.max(1, Math.round(hops * REPORT.daysPerHop)),
    auditedDay: audited,
    says: `${NAMES[seed % NAMES.length] ?? 'Лукьян'} — ${REPORTER_DEFS[kind].label}: ${REPORTER_DEFS[kind].about}`,
  }
}

function hopsFrom(state: GameState, world: World, locationId: string): number {
  if (locationId === state.locationId) return 0
  const near = neighbourSettlements(world, state.locationId, 8)
  return near.find((one) => one.id === locationId)?.hops ?? 9
}

/** Как есть: те же числа, но без чужой руки. */
export function truthAt(state: GameState, locationId: string, kind: ReportedKind): number {
  const place = state.settlements[locationId]
  if (!place) return 0
  if (kind === 'tax') return Math.round(dailyTax(place, foodSecurity(place)) * 30)
  if (kind === 'grain') return Math.round(place.stock.grain)
  if (kind === 'banditry') return Math.round(place.banditry * 100)
  return place.population
}

/**
 * Что будет написано в отчёте (Д2 и Д3).
 *
 * Доброе приукрашивается, дурное мельчает, часть подати не доходит. Учёность
 * хозяина сужает приукрашивание: тот, кто умеет считать, хуже поддаётся на
 * круглые числа.
 */
export function reportedAt(
  state: GameState,
  world: World,
  locationId: string,
  kind: ReportedKind,
  day: number,
): number {
  const reporter = reporterAt(state, world, locationId, day)
  const truth = truthAt(state, locationId, kind)
  if (!reporter) return truth
  const def = REPORTER_DEFS[reporter.kind]
  const learned = state.character.skills.scholarship.level * REPORT.scholarship
  const gilds = Math.max(1, def.gilds - learned)
  const hides = Math.min(1, def.hides + learned)
  // Недавняя ревизия держит руку при себе: проверенный пишет честнее.
  const watched =
    reporter.auditedDay !== null && day - reporter.auditedDay <= REPORT.auditMemoryYears * 365
  if (watched) return truth
  if (kind === 'tax') return Math.round(truth * (1 - def.skims) * gilds)
  if (REPORTED_DEFS[kind].good) return Math.round(truth * gilds)
  return Math.round(truth * hides)
}

/** Сколько подати не доходит до казны вовсе (Д3). */
export function skimAt(state: GameState, world: World, locationId: string, day: number): number {
  const reporter = reporterAt(state, world, locationId, day)
  if (!reporter) return 0
  const watched =
    reporter.auditedDay !== null && day - reporter.auditedDay <= REPORT.auditMemoryYears * 365
  if (watched) return 0
  return Math.round(truthAt(state, locationId, 'tax') * REPORTER_DEFS[reporter.kind].skims)
}

/** Сколько утекает со всей державы за месяц. */
export function skimTotal(state: GameState, world: World, day: number): number {
  return holdingsOf(state.settlements, PLAYER).reduce(
    (sum, one) => sum + skimAt(state, world, one.locationId, day),
    0,
  )
}

export interface PlaceReport {
  readonly locationId: string
  readonly name: string
  readonly reporter: Reporter
  readonly lines: readonly {
    readonly kind: ReportedKind
    readonly said: number
    readonly truth: number
  }[]
  /** День, когда отчёт был составлен, и когда он дойдёт. */
  readonly writtenDay: number
  readonly comesDay: number
  readonly says: string
}

/** Отчёт с места целиком: что написано, когда написано и когда дойдёт (Д1). */
export function reportFrom(
  state: GameState,
  world: World,
  locationId: string,
  day: number,
): PlaceReport | null {
  const reporter = reporterAt(state, world, locationId, day)
  const place = state.settlements[locationId]
  const here = world.locations[locationId]
  if (!reporter || !place || !here) return null
  const lines = (['tax', 'grain', 'banditry', 'people'] as ReportedKind[]).map((kind) => ({
    kind,
    said: reportedAt(state, world, locationId, kind, day),
    truth: truthAt(state, locationId, kind),
  }))
  const gilded = lines.some((one) => REPORTED_DEFS[one.kind].good && one.said > one.truth)
  const hidden = lines.some((one) => !REPORTED_DEFS[one.kind].good && one.said < one.truth)
  return {
    locationId,
    name: here.name,
    reporter,
    lines,
    writtenDay: day,
    comesDay: day + reporter.days,
    says: `${here.name}, рукой ${reporter.name}: ${lines
      .map(
        (one) =>
          `${REPORTED_DEFS[one.kind].label} ${one.said}${REPORTED_DEFS[one.kind].unit ? ` ${REPORTED_DEFS[one.kind].unit}` : ''}`,
      )
      .join(
        ', ',
      )}. Идти ${reporter.days} сут.${gilded ? ` ${REPORT_WORDS.gilded}` : ''}${hidden ? ` ${REPORT_WORDS.hidden}` : ''}`,
  }
}

// --- ревизия (Д4) -----------------------------------------------------------

export interface Audit {
  readonly locationId: string
  readonly silver: number
  readonly days: number
  /** Что она найдёт: сколько утаено за месяц. */
  readonly finds: number
  readonly clean: boolean
  readonly says: string
}

/**
 * Ревизия: узнать правду о своём месте (Д4).
 *
 * Стоит серебра и суток, а главное — отношений: проверенный помнит это годы.
 * Зато после неё он пишет как есть, и рука убирается из подати.
 */
export function auditOf(
  state: GameState,
  world: World,
  locationId: string,
  day: number,
): Audit | null {
  const reporter = reporterAt(state, world, locationId, day)
  if (!reporter) return null
  const finds = skimAt(state, world, locationId, day)
  const clean = finds <= 0
  return {
    locationId,
    silver: REPORT.auditSilver,
    days: REPORT.auditDays,
    finds,
    clean,
    says: clean
      ? `${REPORT_WORDS.clean} ${reporter.name} писал честно, и он это запомнит.`
      : `${REPORT_WORDS.caught} ${reporter.name} оставлял себе ${finds} в месяц.`,
  }
}

/** Казна по отчётам против казны как есть (Д6). */
export function purseAsReported(
  state: GameState,
  world: World,
  day: number,
): { readonly said: number; readonly truth: number; readonly says: string } {
  const mine = holdingsOf(state.settlements, PLAYER)
  let said = 0
  let truth = 0
  for (const one of mine) {
    said += reportedAt(state, world, one.locationId, 'tax', day)
    truth += truthAt(state, one.locationId, 'tax')
  }
  const gap = truth - said
  return {
    said,
    truth,
    says: `По отчётам с ${mine.length} мест подати ${said} в месяц; земля даёт ${truth}. Разница ${gap} — чужая рука и круглые числа.`,
  }
}

export { REPORT, REPORT_WORDS, REPORTER_DEFS, REPORTED_DEFS, type ReporterKind, type ReportedKind }
