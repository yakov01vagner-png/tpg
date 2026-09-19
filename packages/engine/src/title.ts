import {
  ARMS_CHARGES,
  ARMS_TINCTURES,
  CORONATION,
  RECOGNITION,
  SERVICE_DRAW,
  TITLES,
  TITLE_DEFS,
  type TitleDef,
  type TitleId,
} from './content/titles'
import { vassalsOf } from './court'
import { fameOf, shamesOf } from './fame'
import { PLAYER, holdingsOf } from './holding'
import type { GameState } from './state'
import { relationOf } from './war'

/**
 * Титул и признание (этап 78).
 *
 * «Вольное владение» из 0.5 было флагом: поставил — и ты сила. Здесь титул
 * перестаёт быть тем, что ты о себе объявил: он растёт от земли, людей и
 * вассалов, а признают его или нет — решают соседи, и решают по своим причинам.
 *
 * Ничего нового в состоянии, кроме венчания: титул, герб, признание и претензии
 * выводятся из мира.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Венчание на царство: единственное, что тут нужно помнить. */
export interface Crowning {
  readonly day: number
  readonly titleId: TitleId
  /** Кто приехал. */
  readonly guests: readonly string[]
  /** И кто не приехал. */
  readonly absent: readonly string[]
}

export function titleDef(id: TitleId): TitleDef {
  return TITLE_DEFS[id]
}

/** Сколько земли, людей и вассалов под тобой — то, из чего растёт титул. */
export function realmSize(state: GameState): {
  readonly places: number
  readonly people: number
  readonly vassals: number
} {
  const own = holdingsOf(state.settlements, PLAYER)
  const vassals = vassalsOf(state)
  let places = own.length
  let people = own.reduce((sum, one) => sum + one.population, 0)
  for (const lord of vassals) {
    const held = holdingsOf(state.settlements, lord.id)
    places += held.length
    people += held.reduce((sum, one) => sum + one.population, 0)
  }
  return { places, people: Math.round(people), vassals: vassals.length }
}

/**
 * Какой титул у тебя сейчас (Т1).
 *
 * Титул не дают и не берут — он и есть то, чем ты владеешь: земля, люди и те,
 * кто держит землю за тебя. Поэтому его нельзя объявить, а можно только
 * дорасти — и можно потерять вместе с землёй.
 */
export function titleOf(state: GameState): TitleId {
  if (!state.realm) return 'freeholder'
  const size = realmSize(state)
  let best: TitleId = 'freeholder'
  for (const id of TITLES) {
    const def = TITLE_DEFS[id]
    if (size.places >= def.places && size.people >= def.people && size.vassals >= def.vassals) {
      best = id
    }
  }
  return best
}

/** Как тебя называют: титул плюс имя державы. */
export function styleOf(state: GameState): string {
  const def = titleDef(titleOf(state))
  return state.realm ? `${def.label} ${state.realm.name}` : def.label
}

// --- герб и род (Т3) --------------------------------------------------------

export interface Arms {
  readonly charge: string
  readonly tincture: string
  readonly words: string
}

/**
 * Герб рода.
 *
 * Выводится из имени рода: один род — один герб, всегда тот же, и наследник
 * несёт его дальше. Ничего не хранится: имя рода уже лежит в семье (этап 56).
 */
export function armsOf(state: GameState): Arms {
  const house = state.character.family.house || state.realm?.name || state.character.name
  const hash = hashOf(`герб|${house}`)
  const mixed = (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
  const charge = ARMS_CHARGES[mixed % ARMS_CHARGES.length] ?? 'башня'
  const tincture = ARMS_TINCTURES[(hash >>> 7) % ARMS_TINCTURES.length] ?? 'на червлёном поле'
  return { charge, tincture, words: `${charge} ${tincture}` }
}

// --- признание (Т2) ---------------------------------------------------------

export type Standing = 'equal' | 'lesser' | 'pretender'

export interface Recognition {
  readonly kingdomId: string
  readonly value: number
  readonly standing: Standing
  readonly says: string
}

/**
 * Признаёт ли тебя эта корона.
 *
 * Смотрит она на то же, на что смотрели бы люди: сколько под тобой земли,
 * венчан ли ты, что о тебе говорят у знати, много ли за тобой позора и как у вас
 * с отношениями. Ниже порога — самозванец, с которым говорят через губу; выше —
 * равный, с которым говорят как с короной.
 */
export function recognitionOf(state: GameState, kingdomId: string, day: number): Recognition {
  const size = realmSize(state)
  const crowned = state.crowned ? RECOGNITION.crowned : 0
  const noble = fameOf(state, 'noble') * RECOGNITION.fameShare
  const shame = shamesOf(state).length * RECOGNITION.shame
  const relation = relationOf(state.politics, PLAYER, kingdomId) / 3
  const value = Math.round(
    size.places * RECOGNITION.perPlace + crowned + noble + relation - shame + state.renown / 3,
  )
  const standing: Standing =
    value >= RECOGNITION.equal ? 'equal' : value >= RECOGNITION.pretender ? 'lesser' : 'pretender'
  const name = state.world.kingdoms[kingdomId]?.name ?? kingdomId
  return {
    kingdomId,
    value,
    standing,
    says:
      standing === 'equal'
        ? `${name} говорит с тобой как с равным.`
        : standing === 'lesser'
          ? `${name} тебя признаёт, но помнит, кто из вас старше.`
          : `${name} видит в тебе самозванца с мечом.`,
  }
}

export function recognisedBy(state: GameState, day: number): readonly Recognition[] {
  return Object.keys(state.world.kingdoms).map((id) => recognitionOf(state, id, day))
}

// --- коронация (Т4) ---------------------------------------------------------

export interface CoronationPlan {
  readonly cost: number
  /** Кто приедет: те, кто признаёт тебя хотя бы младшим. */
  readonly guests: readonly string[]
  /** И кто не приедет. */
  readonly absent: readonly string[]
  readonly can: boolean
  readonly why: string
}

/**
 * Что будет, если венчаться (Т4).
 *
 * Обряд — не кнопка «стать королём»: венчают того, кто и так дорос, а весь смысл
 * в том, кто приедет. Приехавшие признают тебя навсегда, не приехавшие — это
 * тоже ответ, и его слышат все.
 */
export function coronationPlan(state: GameState, day: number): CoronationPlan {
  const titles = TITLES.indexOf(titleOf(state))
  const needs = TITLES.indexOf(CORONATION.needs)
  const guests: string[] = []
  const absent: string[] = []
  for (const one of recognisedBy(state, day)) {
    const name = state.world.kingdoms[one.kingdomId]?.name ?? one.kingdomId
    if (one.standing === 'pretender') absent.push(name)
    else guests.push(name)
  }
  const cost = CORONATION.rite + guests.length * CORONATION.perGuest
  const can = titles >= needs && !state.crowned && state.character.money >= cost
  return {
    cost,
    guests,
    absent,
    can,
    why: state.crowned
      ? 'Ты уже венчан.'
      : titles < needs
        ? `Венчают не раньше, чем ты станешь ${titleDef(CORONATION.needs).label}ом.`
        : state.character.money < cost
          ? `На обряд и дары нужно ${cost}.`
          : 'Всё готово.',
  }
}

// --- претензии (Т5) ---------------------------------------------------------

/**
 * Своя претензия на чужую землю.
 *
 * Претензия — не желание, а основание: та провинция, где ты и правда держишь
 * землю рядом с чужой (спорная марка), или та, чей владетель умер без
 * наследника. Из неё растёт повод к войне (этап 65) — законный, который
 * признают и соседи.
 */
export interface Claim {
  readonly provinceId: string
  readonly against: string
  readonly kind: 'march' | 'inherit'
  readonly sinceDay: number
}

export function claimsOf(state: Pick<GameState, 'claims'>): readonly Claim[] {
  return state.claims ?? []
}

/** На что можно заявить право прямо сейчас. */
export function claimable(state: GameState): readonly Claim[] {
  const out: Claim[] = []
  const held = new Set(
    Object.values(state.settlements)
      .filter(
        (one) => one.owner === PLAYER || vassalsOf(state).some((lord) => lord.id === one.owner),
      )
      .map((one) => state.world.locations[one.locationId]?.provinceId),
  )
  for (const province of Object.values(state.world.provinces)) {
    if (!held.has(province.id)) continue
    const owners = new Set<string>()
    for (const id of province.locationIds) {
      const settlement = state.settlements[id]
      if (!settlement || settlement.population <= 0 || !settlement.owner) continue
      const owner = settlement.owner
      if (owner === PLAYER) continue
      const side = owner.startsWith('crown:')
        ? owner.slice('crown:'.length)
        : (state.politics.lords.find((lord) => lord.id === owner)?.kingdomId ?? null)
      if (side && side !== PLAYER) owners.add(side)
    }
    for (const against of owners) {
      if (
        claimsOf(state).some((one) => one.provinceId === province.id && one.against === against)
      ) {
        continue
      }
      out.push({ provinceId: province.id, against, kind: 'march', sinceDay: 0 })
    }
  }
  return out
}

/** Есть ли у тебя право на эту землю — то, на что ссылаются, объявляя войну. */
export function claimAgainst(state: Pick<GameState, 'claims'>, kingdomId: string): Claim | null {
  return claimsOf(state).find((one) => one.against === kingdomId) ?? null
}

// --- слава государя (Т6) ----------------------------------------------------

/**
 * Насколько имя облегчает службу.
 *
 * У того, за кем имя, люди нанимаются дешевле и охотнее идут под руку: это и
 * есть то, ради чего слава (этап 68) нужна державе.
 */
export function serviceDraw(state: GameState): number {
  const noble = fameOf(state, 'noble') / 100
  const warriors = fameOf(state, 'warriors') / 100
  const shame = shamesOf(state).length * 0.15
  return Math.max(-0.5, Math.min(1, (noble + warriors) / 2 - shame))
}

/** Во сколько раз дешевле нанимают люди при таком имени. */
export function hirePrice(state: GameState): number {
  return Math.max(0.6, 1 - serviceDraw(state) * SERVICE_DRAW.hire)
}

export { CORONATION, RECOGNITION, SERVICE_DRAW, TITLES, type TitleId }
