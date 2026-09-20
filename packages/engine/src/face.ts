import { marksAt } from './chronicle'
import type { BuildingId } from './content/buildings'
import {
  CUSTOM_DEFS,
  type CustomId,
  FACE,
  FACE_NAMES,
  FACE_WORDS,
  LOCALS,
  LOCAL_DEFS,
  type LocalId,
  TRADE_DEFS,
  type TradeId,
} from './content/face'
import { feastAt } from './fair'
import { PLAYER } from './holding'
import type { GameState } from './state'
import { kingdomOf } from './world/queries'
import type { World } from './world/types'

/**
 * Место, у которого есть лицо (этап 176).
 *
 * Место считалось честно: жители, запасы, разбой, усталость земли, постройки.
 * Смотреть на него было нечем: строка с числами и название. В игре, где ходят
 * по земле, это самая заметная бедность — все деревни одинаковы, и всё равно,
 * в какой ты стоишь.
 *
 * Здесь у места появляется лицо, и **ни одного нового числа**: занятие выводится
 * из того, где место стоит и что в нём построено, порядки — из уклада земли,
 * праздник — из времени года, люди — из построек и имени места. Память о тебе
 * берётся из карты памяти 0.6.
 */

export interface PlaceFace {
  readonly locationId: string
  readonly name: string
  readonly people: number
  readonly trades: readonly TradeId[]
  readonly custom: CustomId
  /** Гуляют ли здесь сегодня: год людской считается с 0.5 (`fair.ts`). */
  readonly feast: string | null
  readonly locals: readonly {
    readonly who: LocalId
    readonly name: string
    readonly says: string
  }[]
  /** Своё ли это место. */
  readonly mine: boolean
  /** Что с ним стало с начала мира. */
  readonly change: 'grew' | 'fell' | 'same'
  readonly uneasy: boolean
  readonly says: string
}

/** Чем это место живёт (Мс1). */
export function tradesAt(state: GameState, world: World, locationId: string): readonly TradeId[] {
  const place = state.settlements[locationId]
  const here = world.locations[locationId]
  if (!place || !here) return []
  const rows: TradeId[] = []
  if (here.archetype === 'port') rows.push('net', 'ware')
  if (here.archetype === 'mine') rows.push('ore')
  if (here.archetype === 'monastery') rows.push('prayer')
  if (here.archetype === 'city' || here.archetype === 'capital') rows.push('ware')
  if (here.archetype === 'village' || here.archetype === 'town') rows.push('plough')
  if (here.terrain === 'hills' || here.terrain === 'mountains') rows.push('herd')
  if (place.buildings.includes('smithy')) rows.push('forge')
  if (place.buildings.includes('market')) rows.push('ware')
  if (place.buildings.includes('tavern')) rows.push('road')
  return [...new Set(rows)].slice(0, 3)
}

/** По какому порядку здесь живут (Мс1). */
export function customAt(state: GameState, world: World, locationId: string): CustomId {
  const here = world.locations[locationId]
  const place = state.settlements[locationId]
  if (!here || !place) return 'elders'
  if (here.archetype === 'monastery') return 'abbot'
  if (state.charters?.[locationId]) return 'charter'
  if (here.archetype === 'city' || here.archetype === 'capital') return 'guild'
  if (place.owner && place.owner !== PLAYER && !place.owner.startsWith('crown:')) return 'lord'
  const flavour = (kingdomOf(world, locationId)?.flavor ?? '').toLowerCase()
  if (flavour.includes('клан') || flavour.includes('плем') || flavour.includes('род')) return 'clan'
  return 'elders'
}

/** С кем здесь говорят (Мс2): не роли, а люди. */
export function localsAt(
  state: GameState,
  world: World,
  locationId: string,
): readonly { readonly who: LocalId; readonly name: string; readonly says: string }[] {
  const place = state.settlements[locationId]
  if (!place) return []
  const rows: { who: LocalId; name: string; says: string }[] = []
  for (const who of LOCALS) {
    const def = LOCAL_DEFS[who]
    if (def.needs && !place.buildings.includes(def.needs as BuildingId)) continue
    if (who === 'carter' && place.population < 300) continue
    const seed = hashOf(`local|${locationId}|${who}`)
    const name = FACE_NAMES[seed % FACE_NAMES.length] ?? 'Безымянный'
    rows.push({ who, name, says: `${def.label} ${name}: ${def.about}` })
  }
  return rows
}

/** Что стало с местом с начала мира (Мс3). */
export function changeAt(
  state: GameState,
  world: World,
  locationId: string,
): 'grew' | 'fell' | 'same' {
  const place = state.settlements[locationId]
  const start = world.locations[locationId]?.population ?? 0
  if (!place || start <= 0) return 'same'
  if (place.population >= start * FACE.growsBy) return 'grew'
  if (place.population <= start * FACE.fallsBy) return 'fell'
  return 'same'
}

/** Лицо места целиком (Мс1–Мс5). */
export function faceOf(state: GameState, world: World, locationId: string, day: number): PlaceFace {
  const place = state.settlements[locationId]
  const here = world.locations[locationId]
  const trades = tradesAt(state, world, locationId)
  const custom = customAt(state, world, locationId)
  const feast = feastAt(world, locationId, day)
  const locals = localsAt(state, world, locationId)
  const mine = place?.owner === PLAYER
  const change = changeAt(state, world, locationId)
  const uneasy = (place?.banditry ?? 0) >= FACE.uneasyAt
  const known = marksAt(state, locationId) > 0
  return {
    locationId,
    name: here?.name ?? locationId,
    people: place?.population ?? 0,
    trades,
    custom,
    feast: feast?.name ?? null,
    locals,
    mine,
    change,
    uneasy,
    says: [
      `${here?.name ?? locationId}: ${place?.population ?? 0} душ.`,
      trades.length > 0
        ? `Живут с того, что ${trades.map((one) => TRADE_DEFS[one].label).join(', ')}. ${TRADE_DEFS[trades[0] as TradeId].about}`
        : 'Живут кто чем.',
      `Порядок — ${CUSTOM_DEFS[custom].label}: ${CUSTOM_DEFS[custom].about}`,
      feast ? `Сегодня ${feast.name}: ${feast.flavor}` : '',
      change === 'grew' ? FACE_WORDS.grew : change === 'fell' ? FACE_WORDS.fell : '',
      uneasy ? FACE_WORDS.uneasy : '',
      mine ? FACE_WORDS.own : FACE_WORDS.guest,
      known ? FACE_WORDS.remembers : FACE_WORDS.new,
    ]
      .filter((one) => one !== '')
      .join(' '),
  }
}

/** Места в числах (Мс6). */
export function faceRoll(
  state: GameState,
  world: World,
  day: number,
  ids: readonly string[],
): {
  readonly places: number
  readonly grew: number
  readonly fell: number
  readonly uneasy: number
  readonly says: string
} {
  const rows = ids.map((id) => faceOf(state, world, id, day))
  const grew = rows.filter((one) => one.change === 'grew').length
  const fell = rows.filter((one) => one.change === 'fell').length
  const uneasy = rows.filter((one) => one.uneasy).length
  return {
    places: rows.length,
    grew,
    fell,
    uneasy,
    says: `Мест ${rows.length}: поднялось ${grew}, просело ${fell}, неспокойно в ${uneasy}.`,
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
