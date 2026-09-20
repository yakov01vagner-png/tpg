import { CROWN_TEMPER_DEFS, type CrownTemper } from './content/lords'
import {
  SOVEREIGN,
  SOVEREIGN_WORDS,
  WEAKNESSES,
  WEAKNESS_DEFS,
  type WeaknessId,
} from './content/sovereign'
import { sideName } from './dread'
import { PLAYER } from './holding'
import { peacesOf } from './peace'
import { type RoyalHouse, reignOf, reignYears, royalHouse } from './royal'
import type { GameState } from './state'
import { DAYS_PER_YEAR } from './time'
import { treatiesOf } from './treaty'
import type { World } from './world/types'

/**
 * Государь как человек (этап 196).
 *
 * У короны есть нрав (этап 66) и дом (этап 81), но играют все одинаково: нрав
 * только множил числа. Человека за короной не было — некого было переждать,
 * не за что было взять, и смена колена ничего не меняла.
 *
 * Здесь у государя появляются годы, своя история, слабости и то, как он от
 * всего этого меняется. Ничего не хранится: колено, имя и нрав считаются из
 * короны и дня (этап 81), история — из миров, бумаг и съездов, которые уже
 * записаны.
 */

export interface Sovereign {
  readonly kingdomId: string
  readonly house: RoyalHouse
  readonly temper: CrownTemper
  /** Сколько ему лет в этот день. */
  readonly age: number
  /** Сколько лет он уже правит. */
  readonly reigned: number
  /** День, с которого он на короне. */
  readonly since: number
  readonly says: string
}

/** Кто сидит на короне — человеком, а не числом (Гс1). */
export function sovereignOf(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): Sovereign {
  const house = royalHouse(world, kingdomId, day)
  const since = reignOf(kingdomId, day) * reignYears(kingdomId) * DAYS_PER_YEAR
  const reigned = Math.floor((day - since) / DAYS_PER_YEAR)
  const age = SOVEREIGN.crownedAt + reigned
  const def = CROWN_TEMPER_DEFS[house.temper]
  return {
    kingdomId,
    house,
    temper: house.temper,
    age,
    reigned,
    since,
    says: `${house.title} ${house.name}, ${age} лет, правит ${reigned}: ${def.label}. ${def.about}`,
  }
}

/**
 * Что он помнит о своём правлении (Гс2).
 *
 * Память — не новое поле, а то же, что записано в мире: чем кончались его
 * войны, какие бумаги он рвал, о чём при нём судили на съезде.
 */
export function pastOf(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): readonly string[] {
  const one = sovereignOf(state, world, kingdomId, day)
  const out: string[] = []
  for (const peace of peacesOf(state)) {
    if (peace.day < one.since) continue
    const his = peace.against === kingdomId || peace.yielded === kingdomId
    if (!his) continue
    out.push(
      peace.yielded === kingdomId
        ? `Уступил на ${peace.day} сут, и тяжесть была ${peace.harshness}.`
        : `Взял своё на ${peace.day} сут: уступил ${sideName(world, peace.yielded)}.`,
    )
  }
  for (const paper of treatiesOf(state)) {
    if (paper.brokenBy !== kingdomId || paper.sinceDay < one.since) continue
    out.push(`Порвал бумагу с ${sideName(world, paper.a === kingdomId ? paper.b : paper.a)}.`)
  }
  for (const seat of state.congresses ?? []) {
    if (seat.day < one.since || seat.about !== kingdomId) continue
    out.push(`На съезде ${seat.day} сут решали о нём — и ${seat.passed ? 'решили' : 'не решили'}.`)
  }
  for (const due of state.politics.tributes) {
    if (due.from === kingdomId)
      out.push(`Платит дань ${sideName(world, due.to)} до ${due.untilDay} сут.`)
  }
  return out
}

/** Чем его берут (Гс3). */
export function weaknessesOf(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): readonly { readonly id: WeaknessId; readonly weight: number; readonly says: string }[] {
  const one = sovereignOf(state, world, kingdomId, day)
  const yielded = peacesOf(state).filter(
    (peace) => peace.day >= one.since && peace.yielded === kingdomId,
  ).length
  const takes = state.politics.tributes.some((due) => due.to === kingdomId)
  const scores: Record<WeaknessId, number> = {
    // Скупость — от нрава и от привычки брать серебром вместо крови.
    greed: (one.temper === 'thrifty' ? 1 : 0) + (takes ? 0.5 : 0),
    // Гордость — от нрава и от того, что он ни разу не уступал.
    pride: (one.temper === 'warlike' ? 1 : 0) + (yielded === 0 ? 0.5 : 0),
    // Страх — от слабого нрава и от каждого поражения.
    fear: (one.temper === 'weak' ? 1 : 0) + yielded * 0.5,
    piety: one.temper === 'pious' ? 1 : 0,
    // Годы — слабость, которая приходит ко всякому.
    age: one.age >= SOVEREIGN.oldAt ? 1 : 0,
  }
  return WEAKNESSES.map((id) => ({
    id,
    weight: Math.round(scores[id] * WEAKNESS_DEFS[id].weight * 100) / 100,
    says: `${WEAKNESS_DEFS[id].label}: ${WEAKNESS_DEFS[id].about} Берут так: ${WEAKNESS_DEFS[id].used}.`,
  }))
    .filter((row) => row.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, SOVEREIGN.shows)
}

/**
 * Как его изменили годы и поражения (Гс4).
 *
 * Охота воевать начинается от нрава и дальше двигается делом: за поражение —
 * вниз, за победу — вверх, а старость сама тянет к покою.
 */
export function changedBy(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): { readonly taste: number; readonly was: number; readonly says: string } {
  const one = sovereignOf(state, world, kingdomId, day)
  const was = CROWN_TEMPER_DEFS[one.temper].war
  const mine = peacesOf(state).filter(
    (peace) =>
      peace.day >= one.since && (peace.against === kingdomId || peace.yielded === kingdomId),
  )
  const lost = mine.filter((peace) => peace.yielded === kingdomId).length
  const won = mine.length - lost
  let taste = was * SOVEREIGN.loseSoftens ** lost * SOVEREIGN.winHardens ** won
  if (one.age >= SOVEREIGN.oldAt) taste *= SOVEREIGN.loseSoftens
  taste = Math.round(taste * 100) / 100
  const parts = [
    lost > 0 ? `проигранных ${lost}` : null,
    won > 0 ? `выигранных ${won}` : null,
    one.age >= SOVEREIGN.oldAt ? `лет ${one.age}` : null,
  ].filter((part): part is string => part !== null)
  return {
    taste,
    was,
    says:
      parts.length === 0
        ? `${SOVEREIGN_WORDS.same} Охота воевать ${taste}.`
        : `${SOVEREIGN_WORDS.changed} Охота воевать была ${was}, стала ${taste}: ${parts.join(', ')}.`,
  }
}

/** Государь словами (Гс5). */
export function sovereignSays(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): string {
  const one = sovereignOf(state, world, kingdomId, day)
  const weak = weaknessesOf(state, world, kingdomId, day)
  const past = pastOf(state, world, kingdomId, day)
  const heir = one.house.heir
  return [
    `${SOVEREIGN_WORDS.man} ${one.says}`,
    heir ? `Наследник: ${heir.name}, ${heir.age} лет.` : 'Наследника нет, и это знают все.',
    past.length > 0 ? `${SOVEREIGN_WORDS.history} ${past.slice(0, 3).join(' ')}` : '',
    weak.length > 0 ? `${SOVEREIGN_WORDS.weak} ${weak.map((row) => row.says).join(' ')}` : '',
    changedBy(state, world, kingdomId, day).says,
  ]
    .filter((part) => part !== '')
    .join(' ')
}

/** Государи в числах (Гс6). */
export function sovereignRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly changed: number
  readonly tempers: Readonly<Record<string, number>>
  readonly hottest: string
  readonly coolest: string
  readonly says: string
} {
  const crowns = Object.keys(world.kingdoms).filter((one) => one !== PLAYER)
  const tempers: Record<string, number> = {}
  let changed = 0
  let hottest = { id: '', taste: -1 }
  let coolest = { id: '', taste: Number.POSITIVE_INFINITY }
  for (const id of crowns) {
    changed += reignOf(id, day)
    const one = sovereignOf(state, world, id, day)
    tempers[one.temper] = (tempers[one.temper] ?? 0) + 1
    const taste = changedBy(state, world, id, day).taste
    if (taste > hottest.taste) hottest = { id, taste }
    if (taste < coolest.taste) coolest = { id, taste }
  }
  return {
    changed,
    tempers,
    hottest: hottest.id,
    coolest: coolest.id,
    says: `Колен сменилось ${changed} на ${crowns.length} коронах; нравы: ${Object.entries(tempers)
      .map(([id, count]) => `${CROWN_TEMPER_DEFS[id as CrownTemper].label} ${count}`)
      .join(
        ', ',
      )}. Горячее всех ${sideName(world, hottest.id)} (${hottest.taste}), тише всех ${sideName(world, coolest.id)} (${coolest.taste}).`,
  }
}
