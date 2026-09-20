import { INSIDE_DEFS, type InsideId, LEAGUER, LEAGUER_WORDS } from './content/leaguer'
import type { Settlement } from './economy'
import { fortOf, storeDays } from './fort'
import { garrisonSize } from './holding'
import { foodSecurity } from './life'
import { type Siege, enginesOf, sapLeft } from './siege'
import type { GameState } from './state'
import { seasonOf } from './time'
import type { World } from './world/types'

/**
 * Осада, которая читается (этап 172).
 *
 * Осада считалась по частям: запас отдельно, стены отдельно, подкоп отдельно,
 * вылазки отдельно, а шанс сдачи — своей формулой поверх всего. Из-за этого под
 * стенами шли сутки, а не осада: нельзя было сказать, сколько она ещё
 * простоит и чем кончится.
 *
 * Здесь всё считается одним счётом — и **одинаково для обеих сторон**: тот же
 * `siegeTally` отвечает и осаждающему, и осаждённому, потому что считает он не
 * чью-то сторону, а положение под стенами.
 */

export interface SiegeTally {
  readonly locationId: string
  readonly days: number
  /** На сколько суток в городе хлеба. */
  readonly stores: number
  /** Сытость 0..1: по ней говорят все трое внутри. */
  readonly fed: number
  /** Во сколько раз стены ещё помогают. */
  readonly walls: number
  /** Сколько машин стоит у стен. */
  readonly engines: number
  /** Сколько суток осталось копать. */
  readonly sap: number
  /** Мор в лагере и в городе, 0..1. */
  readonly sickness: number
  /** Через сколько суток город падёт, если ничего не менять. */
  readonly falls: number
  readonly says: string
}

/** Один счёт осады на обе стороны (Ос1, Ос2). */
export function siegeTally(state: GameState, world: World, siege: Siege, day: number): SiegeTally {
  const settlement = state.settlements[siege.locationId]
  const here = world.locations[siege.locationId]
  if (!settlement || !here) {
    return {
      locationId: siege.locationId,
      days: siege.days,
      stores: 0,
      fed: 0,
      walls: 1,
      engines: 0,
      sap: 0,
      sickness: 0,
      falls: 0,
      says: 'Осаждать нечего.',
    }
  }
  const stores = storeDays(settlement)
  const fed = foodSecurity(settlement)
  const fort = fortOf(state, world, siege.locationId)
  const walls = siege.breached ? 1 : (fort?.walls ?? 1)
  const engines = enginesOf(siege).length
  const sap = sapLeft(siege)
  const sickness = sicknessOf(settlement, siege, day)
  // Срок: хлеб, воля и стены против машин, подкопа и мора. Это и есть та
  // единственная величина, ради которой всё остальное считается.
  const falls = Math.max(
    0,
    Math.round(
      (stores + LEAGUER.willDays * (siege.breached ? 0.3 : 1)) * (1 - sickness) -
        engines * LEAGUER.enginesWorth -
        (siege.breached ? LEAGUER.breachWorth : 0),
    ),
  )
  return {
    locationId: siege.locationId,
    days: siege.days,
    stores,
    fed: Math.round(fed * 100) / 100,
    walls,
    engines,
    sap,
    sickness: Math.round(sickness * 100) / 100,
    falls,
    says: `${here.name}: ${siege.days}-е сутки. Хлеба на ${stores} сут., стены ×${Math.round(walls * 10) / 10}${
      siege.breached ? ' (пролом)' : ''
    }, машин ${engines}, подкопа ${sap} сут., мор ${Math.round(sickness * 100)} из ста. Падёт через ${falls} сут., если ничего не менять.`,
  }
}

/** Мор под стенами: растёт от времени, тесноты и времени года. */
export function sicknessOf(settlement: Settlement, siege: Siege, day: number): number {
  if (siege.days < LEAGUER.sicknessFrom) return 0
  const over = (siege.days - LEAGUER.sicknessFrom) / 10
  const crowd =
    garrisonSize(settlement) > 0 && settlement.population > 0
      ? 1 +
        Math.min(1, garrisonSize(settlement) / Math.max(1, settlement.population / 40)) *
          (LEAGUER.crowding - 1)
      : 1
  const season = seasonOf(day) === 'summer' ? 1.3 : seasonOf(day) === 'winter' ? 0.8 : 1
  return Math.max(0, Math.min(0.6, over * LEAGUER.sicknessPer10 * crowd * season))
}

/**
 * Город внутри (Ос3).
 *
 * Трое за одними стенами переносят осаду по-разному: горожанам всё равно, чей
 * герб над башней, если дети едят; гарнизону платят и им есть чем гордиться;
 * владетелю терять больше всех. Сдаются они в этом же порядке.
 */
export function insideVoices(
  state: GameState,
  world: World,
  siege: Siege,
  day: number,
): readonly { readonly who: InsideId; readonly breaking: boolean; readonly says: string }[] {
  const tally = siegeTally(state, world, siege, day)
  const lines: { who: InsideId; breaking: boolean; says: string }[] = []
  const limits: Record<InsideId, number> = {
    townsfolk: LEAGUER.townsfolkAt,
    garrison: LEAGUER.garrisonAt,
    lord: LEAGUER.lordAt,
  }
  for (const who of Object.keys(limits) as InsideId[]) {
    const breaking = tally.fed <= limits[who] || (who !== 'lord' && siege.breached === true)
    lines.push({
      who,
      breaking,
      says: breaking ? INSIDE_DEFS[who].breaks : INSIDE_DEFS[who].holds,
    })
  }
  return lines
}

/** Насколько город готов слушать о сдаче — по тем же троим (Ос1, Ос3). */
export function surrenderNow(state: GameState, world: World, siege: Siege, day: number): number {
  const voices = insideVoices(state, world, siege, day)
  const breaking = voices.filter((one) => one.breaking).length
  const tally = siegeTally(state, world, siege, day)
  return Math.max(
    0,
    Math.min(0.95, breaking / voices.length + (siege.breached ? 0.2 : 0) - tally.fed * 0.2),
  )
}

/**
 * Помощь снаружи (Ос4).
 *
 * Осаду снимают не только приступом: подмога может прийти, обоз — пройти, а
 * свободный выход — стоить победителю половины добычи. Всё это считается из
 * того, кто где стоит.
 */
export function reliefFor(
  state: GameState,
  world: World,
  siege: Siege,
  day: number,
): {
  readonly coming: boolean
  readonly who: string | null
  readonly days: number
  readonly freeExit: string
  readonly says: string
} {
  const settlement = state.settlements[siege.locationId]
  const owner = settlement?.owner ?? null
  const side = owner?.startsWith('crown:') ? owner.slice('crown:'.length) : null
  // Подмога — это чужая дружина той же стороны, стоящая не под этими стенами.
  const band = state.bands.find(
    (one) => one.kingdomId === side && one.locationId !== siege.locationId,
  )
  const coming = band !== undefined
  const days = coming ? LEAGUER.reliefHops * 2 : 0
  return {
    coming,
    who: band?.id ?? null,
    days,
    freeExit: `Свободный выход: они уйдут с оружием, ты возьмёшь место, но потеряешь ${Math.round(LEAGUER.freeExitCosts * 100)} из ста добычи.`,
    says: coming
      ? `${LEAGUER_WORDS.relief} Дружина ${band?.id} в ${days} сутках пути.`
      : 'Подмоги ждать неоткуда: своих у них рядом нет.',
  }
}

/**
 * Неделя осады словами (Ос5).
 *
 * Рассказывается то, что за неделю случилось: голод, мор, вылазки, пролом,
 * подмога. Ничего нового при этом не считается — говорится уже посчитанное.
 */
export function weekSays(
  state: GameState,
  world: World,
  siege: Siege,
  day: number,
): readonly string[] {
  const tally = siegeTally(state, world, siege, day)
  const lines: string[] = []
  if (tally.stores <= 7) lines.push(LEAGUER_WORDS.hungry)
  if (tally.sickness > 0.1) lines.push(LEAGUER_WORDS.sick)
  if (siege.breached) lines.push(LEAGUER_WORDS.breach)
  const relief = reliefFor(state, world, siege, day)
  if (relief.coming) lines.push(LEAGUER_WORDS.relief)
  const voices = insideVoices(state, world, siege, day).filter((one) => one.breaking)
  for (const one of voices) lines.push(one.says)
  if (lines.length === 0) lines.push(LEAGUER_WORDS.quiet)
  return lines
}

/** Осады в числах (Ос6). */
export function leaguerRoll(rows: readonly { readonly days: number; readonly end: string }[]): {
  readonly sieges: number
  readonly days: number
  readonly taken: number
  readonly lifted: number
  readonly says: string
} {
  const taken = rows.filter((one) => one.end === 'taken').length
  const lifted = rows.filter((one) => one.end === 'lifted').length
  const days = rows.reduce((sum, one) => sum + one.days, 0)
  return {
    sieges: rows.length,
    days,
    taken,
    lifted,
    says:
      rows.length === 0
        ? 'Осад не было.'
        : `Осад ${rows.length}, под стенами простояли ${days} сут. (в среднем ${Math.round(days / rows.length)}): взято ${taken}, снято ${lifted}.`,
  }
}
