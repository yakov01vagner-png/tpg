import {
  CROWN_DEED_DEFS,
  type CrownDeedId,
  MEMORY,
  MEMORY_WORDS,
  STYLE_DEFS,
  type StyleId,
} from './content/memory'
import { PLAYER } from './holding'
import { placeRep } from './reputation'
import { reignOf } from './royal'
import type { GameState } from './state'
import { allied, atWar, relationOf } from './war'
import type { World } from './world/types'

/**
 * Память сил (этап 92).
 *
 * Места помнили тебя с этапа 6, лорды — с 66-го. Короны не помнили ничего:
 * вчерашняя война не меняла завтрашнего разговора, и мир каждый раз знакомился
 * с тобой заново. Здесь память появляется у сил — и вместе с ней три вещи,
 * которых не было: мир видит, каким способом ты играешь; складывает о тебе
 * общее мнение; и прощает — не всё и не одинаково.
 *
 * Память не хранится: она выводится из того, что и так есть в мире, — войн,
 * миров, договоров, дани, разорённых сёл и взятых соглядатаев. Оттого её нельзя
 * рассогласовать с миром, и оттого же она честна: корона помнит ровно то, что
 * с ней было.
 */

export interface Recollection {
  readonly deed: CrownDeedId
  /** Когда это было. */
  readonly day: number
  /** Сколько от этого осталось сегодня. */
  readonly weight: number
  readonly says: string
}

function decay(deed: CrownDeedId, years: number): number {
  const def = CROWN_DEED_DEFS[deed]
  return 0.5 ** (Math.max(0, years) / def.halfLife)
}

/**
 * Что эта корона помнит о тебе (Па1 и Па5).
 *
 * Дела выводятся из мира, а вес каждого стареет по-своему: нарушенное слово
 * держится четверть века, взятый соглядатай — шесть лет. Прощение приходит,
 * но не ко всем одинаково.
 */
export function crownMemory(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): readonly Recollection[] {
  const out: Recollection[] = []
  const add = (deed: CrownDeedId, since: number) => {
    const years = Math.max(0, (day - since) / 365)
    const share = decay(deed, years) * heirShare(kingdomId, since, day)
    const weight = Math.round(CROWN_DEED_DEFS[deed].weight * share * 10) / 10
    if (Math.abs(weight) < 0.5) return
    out.push({ deed, day: since, weight, says: CROWN_DEED_DEFS[deed].recalls })
  }

  // Война — та, что идёт, и те, что были.
  const war = state.politics.wars.find(
    (one) => (one.a === PLAYER && one.b === kingdomId) || (one.b === PLAYER && one.a === kingdomId),
  )
  if (war) add('warred', war.since)
  for (const peace of state.peaces ?? []) {
    if (peace.against !== kingdomId) continue
    add('warred', peace.day)
  }

  // Нарушенный договор: бумага помнит, кто его порвал.
  for (const treaty of state.treaties ?? []) {
    if (treaty.brokenBy !== PLAYER) continue
    if (treaty.a !== kingdomId && treaty.b !== kingdomId) continue
    add('broke', treaty.sinceDay)
  }

  // Дань в обе стороны.
  for (const tribute of state.politics.tributes) {
    if (tribute.from === PLAYER && tribute.to === kingdomId) add('paid', tribute.untilDay - 1800)
    if (tribute.to === PLAYER && tribute.from === kingdomId) add('took', tribute.untilDay - 1800)
  }

  // Родство.
  const bond = state.politics.alliances.find(
    (one) => (one.a === PLAYER && one.b === kingdomId) || (one.b === PLAYER && one.a === kingdomId),
  )
  if (bond) add(bond.byMarriage ? 'wed' : 'traded', bond.since)

  // Разорённые и накормленные сёла: память их мест — это и память короны.
  let sacked = 0
  let helped = 0
  const mine = new Set(
    state.politics.lords.filter((lord) => lord.kingdomId === kingdomId).map((lord) => lord.id),
  )
  for (const place of Object.values(state.settlements)) {
    if (!place.owner) continue
    if (place.owner !== `crown:${kingdomId}` && !mine.has(place.owner)) continue
    const rep = placeRep(state.reputation, place.locationId)
    if (rep <= -25) sacked += 1
    if (rep >= 25) helped += 1
  }
  if (sacked > 0) add('sacked', day - 365)
  if (helped > 0) add('helped', day - 365)

  // Взятый соглядатай: своего человека во дворе помнят долго.
  for (const spy of state.spies ?? []) {
    if (spy.kingdomId !== kingdomId || !spy.caught) continue
    add('spied', spy.sinceDay)
  }
  return out.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
}

/**
 * Насколько память слабеет со сменой государя (Па4).
 *
 * Новый государь помнит дела прежнего вполовину: это была не его война и не
 * его обида. Колено считается по правлению (этап 81).
 */
function heirShare(kingdomId: string, since: number, day: number): number {
  // Колено считается тем же счётом, что и в этапе 81: если дело было при
  // прежнем государе, новый помнит его вполовину.
  return reignOf(kingdomId, since) < reignOf(kingdomId, day) ? MEMORY.heirShare : 1
}

/** Общее число: во что складывается вся память. */
export function memoryScore(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): number {
  const memory = crownMemory(state, world, kingdomId, day)
  const relation = relationOf(state.politics, PLAYER, kingdomId)
  return Math.round(memory.reduce((sum, one) => sum + one.weight, 0) + relation * 0.5)
}

/** Как это звучит в людях (Па6). */
export function crownRecalls(
  state: GameState,
  world: World,
  kingdomId: string,
  day: number,
): string {
  const memory = crownMemory(state, world, kingdomId, day)
  if (memory.length === 0) return MEMORY_WORDS.blank
  const score = memoryScore(state, world, kingdomId, day)
  const mood =
    score <= MEMORY.foeLine
      ? MEMORY_WORDS.foe
      : score >= MEMORY.friendLine
        ? MEMORY_WORDS.friend
        : MEMORY_WORDS.wary
  return `${mood} ${memory
    .slice(0, 2)
    .map((one) => one.says)
    .join(' ')}`
}

// --- твой стиль (Па2) -------------------------------------------------------

export interface Style {
  readonly id: StyleId
  readonly label: string
  /** Чем мир отвечает. */
  readonly answer: string
  readonly wars: number
  readonly coin: number
  readonly tricks: number
  readonly built: number
  readonly says: string
}

/**
 * Каким способом ты играешь (Па2).
 *
 * Считается по делам, а не по словам: сколько войн ты вёл, сколько мест
 * держишь и строишь, сколько соглядатаев у тебя во дворах и сколько денег в
 * казне. Мир отвечает на то, что видит.
 */
export function playStyle(state: GameState, day: number): Style {
  const wars = state.politics.wars.filter((one) => one.a === PLAYER || one.b === PLAYER).length
  const fought = (state.peaces ?? []).length
  const tricks = (state.spies ?? []).length + (state.rumours ?? []).length
  const mine = Object.values(state.settlements).filter((one) => one.owner === PLAYER)
  const built = mine.reduce((sum, one) => sum + one.buildings.length, 0)
  const coin = Math.round(state.character.money / 1000)
  const scores: Record<StyleId, number> = {
    warlike: (wars + fought) * 3,
    trader: coin,
    schemer: tricks * 3,
    builder: built,
  }
  let best: StyleId = 'builder'
  for (const id of Object.keys(scores) as StyleId[]) {
    if (scores[id] > scores[best]) best = id
  }
  const def = STYLE_DEFS[best]
  return {
    id: best,
    label: def.label,
    answer: def.answer,
    wars: wars + fought,
    coin,
    tricks,
    built,
    says: `${def.label}: ${def.about} ${def.answer} (войн ${wars + fought}, серебра ${coin} тысяч, тайных дел ${tricks}, построек ${built})`,
  }
}

// --- общее мнение (Па3) -----------------------------------------------------

export interface Opinion {
  readonly friends: readonly string[]
  readonly foes: readonly string[]
  readonly wary: readonly string[]
  readonly style: Style
  readonly says: string
}

/**
 * Что о тебе думает мир (Па3).
 *
 * Не одно число, а расклад: кто считает тебя своим, кто врагом, кто
 * присматривается. Мнение складывается из памяти каждой короны и из того, как
 * ты играешь.
 */
export function worldOpinion(state: GameState, world: World, day: number): Opinion {
  const friends: string[] = []
  const foes: string[] = []
  const wary: string[] = []
  for (const kingdomId of Object.keys(world.kingdoms)) {
    const score = memoryScore(state, world, kingdomId, day)
    if (score <= MEMORY.foeLine || atWar(state.politics, PLAYER, kingdomId)) foes.push(kingdomId)
    else if (score >= MEMORY.friendLine || allied(state.politics, PLAYER, kingdomId)) {
      friends.push(kingdomId)
    } else wary.push(kingdomId)
  }
  const style = playStyle(state, day)
  return {
    friends,
    foes,
    wary,
    style,
    says: `Своим тебя считают ${friends.length}, врагом — ${foes.length}, присматриваются ${wary.length}. ${style.says}`,
  }
}

// --- видно в цене (Па6) -----------------------------------------------------

/**
 * Во сколько раз дороже тебе здесь торговать (Па6).
 *
 * Мнение читается не числом на экране, а ценой в лавке: там, где тебя держат
 * за врага, тебе всё дороже, а торгового человека давят пошлиной охотнее
 * прочих — с него есть что взять.
 */
export function opinionPrice(
  state: GameState,
  world: World,
  locationId: string,
  day: number,
): number {
  const place = state.settlements[locationId]
  if (!place?.owner || place.owner === PLAYER) return 1
  const side = place.owner.startsWith('crown:')
    ? place.owner.slice('crown:'.length)
    : (state.politics.lords.find((lord) => lord.id === place.owner)?.kingdomId ?? null)
  if (!side) return 1
  const score = memoryScore(state, world, side, day)
  if (score <= MEMORY.foeLine) {
    const style = playStyle(state, day)
    const squeeze = style.id === 'trader' ? MEMORY.tollOnTrader : 1
    return Math.round((1 + MEMORY.spiteBite * squeeze) * 100) / 100
  }
  if (score >= MEMORY.friendLine) return Math.round((1 - MEMORY.favourGift) * 100) / 100
  return 1
}

export { MEMORY, MEMORY_WORDS, CROWN_DEED_DEFS, STYLE_DEFS, type CrownDeedId, type StyleId }
