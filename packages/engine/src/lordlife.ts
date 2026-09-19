import { lordTemper } from './castle'
import {
  CROWN_NAMES,
  CROWN_TEMPERS,
  CROWN_TEMPER_DEFS,
  CROWN_TITLES,
  type CrownTemper,
  FACTIONS,
  FACTION_DEFS,
  type FactionId,
  LORD_DEED_DEFS,
  type LordDeedId,
  MEMORY_DEPTH,
  TEMPER_DEEDS,
} from './content/lords'
import type { Settlement } from './economy'
import { lordRep } from './reputation'
import type { GameState } from './state'
import type { Lord, Politics } from './war'

/**
 * Лорды как люди (этап 66).
 *
 * Нрав выходит из приёмной в мир: от него зависит, как часто лорд воюет, что он
 * делает со взятым и крепко ли держится короны. Рядом появляются корона как
 * человек, партии при дворе, друзья и соперники — и память лорда о тебе.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

// --- нрав в делах (Л1) ------------------------------------------------------

export function temperDeeds(lord: Lord) {
  return TEMPER_DEEDS[lordTemper(lord)]
}

/** Что о нём говорят за глаза. */
export function lordSaidOf(lord: Lord): string {
  return temperDeeds(lord).said
}

// --- корона как человек (Л5) ------------------------------------------------

export interface Crown {
  readonly kingdomId: string
  readonly title: string
  readonly name: string
  readonly temper: CrownTemper
}

/**
 * Кто сидит на этой короне.
 *
 * Выводится из самой короны: имя, титул по земле и нрав власти. «Корона» была
 * строкой в списке войн — теперь у неё есть человек, и он объясняет, почему эта
 * корона воюет чаще соседней.
 */
export function crownOf(kingdomId: string): Crown {
  const hash = hashOf(`crown|${kingdomId}`)
  // Перемешиваем прежде, чем брать остаток: на коротких именах корон младшие
  // разряды повторяются, и четыре короны из восьми звались одинаково.
  const mixed = (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
  return {
    kingdomId,
    title: CROWN_TITLES[kingdomId] ?? 'государь',
    name: CROWN_NAMES[mixed % CROWN_NAMES.length] ?? 'Безымянный',
    temper: CROWN_TEMPERS[(hash >>> 7) % CROWN_TEMPERS.length] ?? 'thrifty',
  }
}

export function crownTemperDef(temper: CrownTemper) {
  return CROWN_TEMPER_DEFS[temper]
}

/** Насколько эта корона охотнее прочих объявляет войну. */
export function crownWarlust(kingdomId: string): number {
  return crownTemperDef(crownOf(kingdomId).temper).war
}

// --- партии при дворе (Л6) --------------------------------------------------

export interface Faction {
  readonly id: FactionId
  readonly kingdomId: string
  /** Как она к тебе. */
  readonly mood: number
}

export function factionDef(id: FactionId) {
  return FACTION_DEFS[id]
}

/**
 * Какие партии при этой короне.
 *
 * Их всегда две пары: война и мир, старая кровь и новые люди. Настроение к тебе
 * лежит в состоянии — это единственное, что о них надо помнить.
 */
export function factionsAt(
  state: Pick<GameState, 'factions'>,
  kingdomId: string,
): readonly Faction[] {
  return FACTIONS.map((id) => ({
    id,
    kingdomId,
    mood: state.factions?.[`${kingdomId}|${id}`] ?? 0,
  }))
}

export function factionMood(
  state: Pick<GameState, 'factions'>,
  kingdomId: string,
  id: FactionId,
): number {
  return state.factions?.[`${kingdomId}|${id}`] ?? 0
}

export function factionKey(kingdomId: string, id: FactionId): string {
  return `${kingdomId}|${id}`
}

/** Что партия скажет тому, кто к ней пришёл. */
export function factionSays(faction: Faction): string {
  const def = factionDef(faction.id)
  if (faction.mood < -20) return `${def.label}: с тобой у нас разговора нет.`
  if (faction.mood > 25) return `${def.label}: «${def.asks}» Своим мы не отказываем.`
  return `${def.label}: «${def.asks}»`
}

// --- дружба и вражда лордов (Л2) --------------------------------------------

/**
 * Кто ему свой и кто соперник.
 *
 * Свои — соседи по короне, с которыми он не делит землю; соперники — те, с кем
 * делит: в одной провинции двум хозяевам тесно. Выводится из карты, а не из
 * списка: так вражда сама следует за войной.
 */
export function lordBonds(
  politics: Politics,
  settlements: Readonly<Record<string, Settlement>>,
  world: { provinces: Readonly<Record<string, { locationIds: readonly string[] }>> },
  lord: Lord,
): { readonly friends: readonly Lord[]; readonly rivals: readonly Lord[] } {
  const rivals = new Set<string>()
  for (const province of Object.values(world.provinces)) {
    const owners = new Set<string>()
    for (const id of province.locationIds) {
      const settlement = settlements[id]
      if (!settlement || settlement.population <= 0 || !settlement.owner) continue
      owners.add(settlement.owner)
    }
    if (!owners.has(lord.id)) continue
    for (const owner of owners) {
      if (owner !== lord.id && !owner.startsWith('crown:')) rivals.add(owner)
    }
  }
  const friends = politics.lords.filter(
    (one) =>
      one.id !== lord.id &&
      one.kingdomId !== null &&
      one.kingdomId === lord.kingdomId &&
      !rivals.has(one.id),
  )
  return {
    friends: friends.slice(0, 3),
    rivals: politics.lords.filter((one) => rivals.has(one.id)),
  }
}

// --- лорд помнит тебя (Л4) --------------------------------------------------

export function lordMemory(
  state: Pick<GameState, 'lordDeeds'>,
  lordId: string,
): readonly LordDeedId[] {
  return state.lordDeeds?.[lordId] ?? []
}

export function lordDeedDef(deed: LordDeedId) {
  return LORD_DEED_DEFS[deed]
}

/** Что лорд помнит о тебе — словами, а не числом. */
export function lordRecalls(state: Pick<GameState, 'lordDeeds'>, lordId: string): string | null {
  const deeds = lordMemory(state, lordId)
  const last = deeds[deeds.length - 1]
  return last ? lordDeedDef(last).recalls : null
}

/** Записать дело в память лорда: помнит он немного и последнее. */
export function withLordDeed(
  deeds: Readonly<Record<string, readonly LordDeedId[]>>,
  lordId: string,
  deed: LordDeedId,
): Readonly<Record<string, readonly LordDeedId[]>> {
  const now = deeds[lordId] ?? []
  return { ...deeds, [lordId]: [...now, deed].slice(-MEMORY_DEPTH) }
}

/** Во что память лорда обходится милости. */
export function deedWeight(deed: LordDeedId): number {
  return lordDeedDef(deed).weight
}

// --- династии (Л3) ----------------------------------------------------------

/**
 * Что наследник помнит о тебе.
 *
 * Сын не отец: милость к нему начинается не с нуля и не с отцовой — с её
 * половины, и это работает в обе стороны. Зато дела отца он знает по рассказам,
 * и дурное помнится лучше доброго.
 */
export function heirRegard(state: GameState, fatherId: string): number {
  const father = lordRep(state.reputation, fatherId)
  const deeds = lordMemory(state, fatherId)
  const worst = deeds.reduce((sum, deed) => sum + Math.min(0, deedWeight(deed)), 0)
  return Math.round(father / 2 + worst / 2)
}
