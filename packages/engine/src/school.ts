import type { MasterStance, MasterTemper } from './content/schools'
import { MASTER_LINES, MASTER_NAMES, TRADITIONS } from './content/schools'
import type { MagicRankId } from './magic'
import { MAGIC_RANKS, rankTier, unrecognizedGap } from './magic'
import { lordRep } from './reputation'
import type { GameState } from './state'
import { kingdomOf } from './world/queries'
import type { World } from './world/types'

/**
 * Школы магии (этап 40).
 *
 * До сих пор ранг был строкой в листе: испытание принимали в любой столице, а
 * кто принимал — не спрашивалось. Теперь школа — место в мире, учитель — человек,
 * а экзамен — событие с тем, кто его помнит. Лестница из DESIGN.md п.4 наконец
 * стоит на земле: академия при каждом престоле, школа в большом городе, и одно
 * место на весь свет, где сидит Архон.
 *
 * Школы, как ярмарки, не лежат в состоянии: они выводятся из мира. Меняется
 * только то, что и должно меняться, — память главы о тебе (в репутации) и то,
 * на месте ли он (архимаг короны бывает в отъезде, `politics.archmages`).
 */
export interface School {
  readonly id: string
  readonly locationId: string
  readonly name: string
  readonly tradition: string
  /** Выше этого ранга здесь не присваивают: некому. */
  readonly topRank: MagicRankId
  readonly master: Master
}

export interface Master {
  readonly id: string
  readonly name: string
  readonly rank: MagicRankId
  readonly temper: MasterTemper
}

/** Сколько народу нужно городу, чтобы в нём завелась школа. */
const SCHOOL_TOWN = 9000

function hashOf(id: string): number {
  let hash = 2166136261
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const TEMPERS: readonly MasterTemper[] = ['strict', 'kind', 'proud', 'venal']

function schoolAtPlace(world: World, locationId: string, topRank: MagicRankId): School {
  const hash = hashOf(locationId)
  const tradition = TRADITIONS[hash % TRADITIONS.length] ?? TRADITIONS[0]
  const place = world.locations[locationId]
  const name =
    place?.archetype === 'capital'
      ? `${tradition?.name ?? 'Школа'} при престоле`
      : (tradition?.name ?? 'Школа')
  return {
    id: `school:${locationId}`,
    locationId,
    name,
    tradition: tradition?.flavor ?? '',
    topRank,
    master: {
      id: `master:${locationId}`,
      name: MASTER_NAMES[(hash >>> 4) % MASTER_NAMES.length] ?? 'Наставник',
      rank: topRank,
      temper: TEMPERS[(hash >>> 9) % TEMPERS.length] ?? 'strict',
    },
  }
}

/**
 * Все школы мира.
 *
 * Академия — при каждом престоле, и её глава — архимаг короны. Архон один на
 * весь свет: он сидит в самой людной столице, и только там присваивают верхнюю
 * ступень. Городская школа — в городе от девяти тысяч душ, и выше магистра там
 * не учат: магистров на весь мир столько, сколько таких городов.
 */
export function schoolsOf(world: World): readonly School[] {
  const capitals = Object.values(world.kingdoms)
    .map((kingdom) => world.locations[kingdom.capitalId])
    .filter((place): place is NonNullable<typeof place> => place !== undefined)
    .sort((a, b) => b.population - a.population || a.id.localeCompare(b.id))
  const schools: School[] = []
  for (const [index, capital] of capitals.entries()) {
    schools.push(schoolAtPlace(world, capital.id, index === 0 ? 'archon' : 'archmage'))
  }
  for (const place of Object.values(world.locations)) {
    if (place.archetype !== 'city' || place.population < SCHOOL_TOWN) continue
    schools.push(schoolAtPlace(world, place.id, 'magister'))
  }
  return schools
}

/** Школа в этом месте, если есть. */
export function schoolAt(world: World, locationId: string): School | null {
  return schoolsOf(world).find((school) => school.locationId === locationId) ?? null
}

/** Где сидит Архон: единственное место, где лестница проходима до конца. */
export function archonSeat(world: World): School | null {
  return schoolsOf(world).find((school) => school.topRank === 'archon') ?? null
}

/**
 * На месте ли глава.
 *
 * Глава академии — архимаг короны, а архимаг своеволен (DESIGN.md, п.8): он
 * бывает занят при войске или вовсе отказался. Без него ранги выше мастера не
 * присваивают — некому. Городскую школу корона не зовёт, её глава всегда дома.
 */
export function masterPresent(state: GameState, school: School): boolean {
  const kingdom = kingdomOf(state.world, school.locationId)
  if (!kingdom) return true
  if (state.world.locations[school.locationId]?.archetype !== 'capital') return true
  return (state.politics.archmages[kingdom.id]?.state ?? 'free') === 'free'
}

/** Ранги, которые здесь вообще присваивают. */
export function canGrantHere(state: GameState, school: School, rank: MagicRankId): boolean {
  if (rankTier(rank) > rankTier(school.topRank)) return false
  // Младшие ранги примут и без главы: на то есть наставники.
  if (rankTier(rank) <= MAGIC_RANKS.master.tier) return true
  return masterPresent(state, school)
}

/**
 * Самоучка (DESIGN.md, п.4): сила обгоняет титул на две ступени и больше.
 *
 * Не ошибка и не запрет — социальный разрыв. Школа такого примет, но спросит
 * строже и возьмёт вдвое: тот, кто учился сам, для школы — чужак, чьи руки
 * никто не ставил.
 */
export const SELF_TAUGHT_GAP = 2

export function isSelfTaught(state: GameState): boolean {
  return (
    unrecognizedGap(state.character.skills.magic.level, state.character.magicRank) >=
    SELF_TAUGHT_GAP
  )
}

/** Во сколько раз дороже испытание для самоучки. */
export const SELF_TAUGHT_FEE = 2

/**
 * Как глава к тебе относится: память о твоих испытаниях, нрав и то, откуда ты.
 *
 * Строгий и надменный самоучек не жалуют — с ними разрыв стоит расположения.
 * Сребролюбивый смотрит только на кошель. Ниже `REFUSED` глава не принимает
 * вовсе: провалов было слишком много.
 */
export const REFUSED = -30

export function masterAttitude(state: GameState, master: Master): number {
  let value = lordRep(state.reputation, master.id)
  if (isSelfTaught(state)) {
    if (master.temper === 'proud') value -= 25
    else if (master.temper === 'strict') value -= 12
  }
  return value
}

export function masterStance(state: GameState, school: School): MasterStance {
  if (!masterPresent(state, school)) return 'absent'
  const value = masterAttitude(state, school.master)
  if (value <= REFUSED && school.master.temper !== 'venal') return 'refuses'
  if (isSelfTaught(state) && school.master.temper !== 'kind') return 'selfTaught'
  if (value < -10) return 'cold'
  if (value >= 20) return 'warm'
  return 'even'
}

export function masterSays(state: GameState, school: School, day: number): string {
  const lines = MASTER_LINES[masterStance(state, school)]
  return lines[day % lines.length] ?? lines[0] ?? '…'
}
