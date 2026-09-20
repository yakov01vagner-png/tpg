import { HOLY_WORDS, MAGE_WORDS, THEIRS, THEIRS_WORDS, TRADE_WORDS } from './content/theirs'
import { PLAYER } from './holding'
import { reignOf, royalHouse } from './royal'
import type { GameState } from './state'
import { warsOf } from './war'
import type { World } from './world/types'

/**
 * Что есть у чужой стороны (этап 162).
 *
 * Пути мерятся одной меркой на всех (этап 130), но мерить у корон было нечего:
 * благочестие, дела, казна, родня и ранг считались только у игрока, а короне
 * возвращался ноль. Оттого три пути из пяти были ей закрыты, а на открытых она
 * стояла на полудороге и не двигалась.
 *
 * Здесь у неё появляется то же самое — и **ни одной новой величины в
 * состоянии**: всё выводится из того, что в мире уже есть. Обители в её земле —
 * благочестие; порты, рудники и города — дела и серебро; колено и нрав —
 * родство; уклад и колено — придворный чародей. Из одного сейва выходит одно и
 * то же.
 */

/** Что у неё за земля: один проход по местам, из него всё остальное. */
export interface CrownLand {
  readonly places: number
  readonly monasteries: number
  readonly ports: number
  readonly mines: number
  readonly cities: number
  readonly people: number
}

/**
 * Память о земле стороны (этап 165).
 *
 * `crownLand` — чистая функция от состояния и стороны, и спрашивают её по
 * многу раз за одни сутки: благочестие, дела, казна, приход и расход. Память
 * живёт на самом объекте состояния и умирает вместе с ним: в сейв она не
 * попадает, а состояние неизменно — значит, посчитанное для него однажды верно
 * для него всегда.
 */
const landByState = new WeakMap<GameState, Map<string, CrownLand>>()

export function crownLand(state: GameState, world: World, side: string): CrownLand {
  let mine = landByState.get(state)
  if (mine) {
    const known = mine.get(side)
    if (known) return known
  } else {
    mine = new Map()
    landByState.set(state, mine)
  }
  const counted = countLand(state, world, side)
  mine.set(side, counted)
  return counted
}

function countLand(state: GameState, world: World, side: string): CrownLand {
  const owners = new Set<string>()
  if (side === PLAYER) owners.add(PLAYER)
  else {
    owners.add(`crown:${side}`)
    for (const lord of state.politics.lords) {
      if (lord.kingdomId === side) owners.add(lord.id)
    }
  }
  let places = 0
  let monasteries = 0
  let ports = 0
  let mines = 0
  let cities = 0
  let people = 0
  for (const one of Object.values(state.settlements)) {
    if (!one.owner || one.population <= 0) continue
    if (!owners.has(one.owner)) continue
    places += 1
    people += one.population
    const kind = world.locations[one.locationId]?.archetype
    if (kind === 'monastery') monasteries += 1
    else if (kind === 'port') ports += 1
    else if (kind === 'mine') mines += 1
    else if (kind === 'city' || kind === 'capital') cities += 1
  }
  return { places, monasteries, ports, mines, cities, people }
}

function flavourHas(world: World, side: string, words: readonly string[]): boolean {
  const text =
    `${world.kingdoms[side]?.flavor ?? ''} ${world.kingdoms[side]?.name ?? ''}`.toLowerCase()
  return words.some((word) => text.includes(word))
}

/** Благочестие короны (Пк1): обители в её земле, уклад и войны, которые она ведёт. */
export function crownPiety(state: GameState, world: World, side: string, day: number): number {
  const land = crownLand(state, world, side)
  const wars = warsOf(state.politics, side).length
  const base =
    land.monasteries * THEIRS.perMonastery +
    (flavourHas(world, side, HOLY_WORDS) ? THEIRS.holyFlavour : 0) -
    wars * THEIRS.warSin
  return Math.max(0, Math.round(base))
}

/** Спокойна ли к ней церковь (Пк1). */
export function crownCalm(state: GameState, world: World, side: string, day: number): boolean {
  return crownPiety(state, world, side, day) >= THEIRS.calmAt
}

/**
 * Ходит ли она войной по слову церкви (Пк1).
 *
 * У игрока это поручение; у короны — то же самое, выведенное из положения:
 * благочестивая корона, которая сейчас воюет, воюет за веру. Кроткая и мирная
 * похода не ведёт — ей его и не с кем вести.
 */
export function crownCrusade(state: GameState, world: World, side: string, day: number): boolean {
  return (
    crownPiety(state, world, side, day) >= THEIRS.crusadeAt &&
    warsOf(state.politics, side).length > 0
  )
}

/** Её дела (Пк2): порты, рудники и города кормят корону без войны. */
export function crownVentures(state: GameState, world: World, side: string): number {
  const land = crownLand(state, world, side)
  return (
    land.ports * THEIRS.perPort +
    land.mines * THEIRS.perMine +
    land.cities * THEIRS.perCity +
    (flavourHas(world, side, TRADE_WORDS) ? THEIRS.tradeFlavour : 0)
  )
}

/**
 * Её казна (Пк2).
 *
 * С этапа 165 это настоящее число: сколько у неё серебра сейчас. Пока такт его
 * не свёл (первый день игры, сейв до 1.0), считается по земле и дани — тем же
 * счётом, каким казну оценивали до 1.0. Место одно нарочно: менять пришлось
 * только его.
 */
export function crownPurse(state: GameState, world: World, side: string, day: number): number {
  const kept = state.crownCoin?.[side]
  if (kept !== undefined) return kept
  const land = crownLand(state, world, side)
  let coin =
    land.places * THEIRS.coinPerPlace +
    land.cities * THEIRS.coinPerCity +
    land.ports * THEIRS.coinPerPort +
    land.mines * THEIRS.coinPerMine
  for (const one of state.politics.tributes) {
    if (one.untilDay < day) continue
    if (one.to === side) coin += one.perDay * THEIRS.tributeDays
    if (one.from === side) coin -= one.perDay * THEIRS.tributeDays
  }
  return Math.max(0, Math.round(coin))
}

/**
 * С кем она в родстве (Пк3).
 *
 * Браки между коронами — не запись в сейве, а положение дел: их считают по
 * коленам обеих сторон, и со сменой государя родство пересчитывается. Брак
 * игрока (0.6) считается здесь же — той же роднёй, что и прочие.
 */
export function crownKin(
  state: GameState,
  world: World,
  side: string,
  day: number,
): readonly string[] {
  const kin: string[] = []
  if ((state.marriages ?? []).some((one) => one.kingdomId === side)) kin.push(PLAYER)
  for (const other of Object.keys(world.kingdoms)) {
    if (other === side) continue
    const [a, b] = side < other ? [side, other] : [other, side]
    const seed = `kin|${a}|${b}|${reignOf(a, day) + reignOf(b, day)}`
    if (hashOf(seed) % 100 < THEIRS.kinChance) kin.push(other)
  }
  return kin
}

/** Есть ли у неё наследник (Пк3): по настоящему дому, а не по заглушке. */
export function crownHeir(world: World, side: string, day: number): boolean {
  return royalHouse(world, side, day).children.some((one) => one.heir)
}

/**
 * Сила без войска у чужих (Пк4).
 *
 * Архимаг бывает не только игроком: при дворе сидит чародей, и ступень у него
 * выводится из уклада земли и колена — со сменой государя двор меняется тоже.
 * Вещи с чарами заводятся там, где ступень высока: их не покупают, их наживают.
 */
export function crownMight(
  world: World,
  side: string,
  day: number,
): { readonly tier: number; readonly skill: number; readonly artifacts: number } {
  const lean = flavourHas(world, side, MAGE_WORDS) ? THEIRS.mageFlavour : 0
  const roll = hashOf(`mage|${side}|${reignOf(side, day)}`) % (THEIRS.mageTiers + 1)
  const tier = Math.max(
    0,
    Math.min(THEIRS.mageTiers, Math.round((roll + lean) / 2) + (lean > 0 ? 1 : 0)),
  )
  const artifacts = Math.max(0, tier - THEIRS.artifactsFrom + 1)
  return { tier, skill: tier * THEIRS.skillPerTier, artifacts }
}

/** Всё, что у неё есть, одной строкой (Пк5). */
export interface Theirs {
  readonly side: string
  readonly piety: number
  readonly calm: boolean
  readonly crusade: boolean
  readonly ventures: number
  readonly purse: number
  readonly kin: readonly string[]
  readonly heir: boolean
  readonly tier: number
  readonly artifacts: number
  readonly says: string
}

export function theirsOf(state: GameState, world: World, side: string, day: number): Theirs {
  const piety = crownPiety(state, world, side, day)
  const might = crownMight(world, side, day)
  const kin = crownKin(state, world, side, day)
  return {
    side,
    piety,
    calm: piety >= THEIRS.calmAt,
    crusade: crownCrusade(state, world, side, day),
    ventures: crownVentures(state, world, side),
    purse: crownPurse(state, world, side, day),
    kin,
    heir: crownHeir(world, side, day),
    tier: might.tier,
    artifacts: might.artifacts,
    says: `${side}: благочестие ${piety}, дел ${crownVentures(state, world, side)}, казна ${crownPurse(state, world, side, day)}, родни ${kin.length}, ступень ${might.tier}, вещей с чарами ${might.artifacts}.${might.tier >= THEIRS.artifactsFrom ? ` ${THEIRS_WORDS.mage}` : ''}`,
  }
}

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}
