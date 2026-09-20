import { COMEBACK, COMEBACK_WORDS, ROADS, ROAD_DEFS, type RoadId } from './content/comeback'
import { vassalsOf } from './court'
import { sideName } from './dread'
import { PLAYER, holdingsOf } from './holding'
import type { GameState } from './state'
import { relationOf } from './war'
import type { World } from './world/types'

/**
 * Путь обратно (этап 152).
 *
 * Дороги назад не назначаются: каждая открыта настолько, насколько её условия
 * есть в мире. Оттого и выбор настоящий — у безземельного открыта не всякая.
 */

export function roadDef(id: RoadId) {
  return ROAD_DEFS[id]
}

/** Утраченный титул — это право (Об2). */
export function oldClaim(
  state: GameState,
  world: World,
  day: number,
): { readonly has: boolean; readonly name: string; readonly years: number; readonly says: string } {
  const last = (state.fallenLog ?? [])[(state.fallenLog ?? []).length - 1]
  if (!last)
    return { has: false, name: '', years: 0, says: 'Терять тебе пока нечего: держава при тебе.' }
  const years = Math.round(((day - last.day) / 365) * 10) / 10
  return {
    has: true,
    name: last.name,
    years,
    says: `${COMEBACK_WORDS.claim} ${last.name} потеряна ${years} года назад, и это право помнят.`,
  }
}

/** Какие дороги назад открыты сейчас (Об1). */
export function roadsBack(
  state: GameState,
  world: World,
  day: number,
): readonly { readonly road: RoadId; readonly open: boolean; readonly says: string }[] {
  const court = state.exile?.at ?? null
  const kin = (state.marriages ?? []).length > 0
  const loyal = vassalsOf(state).filter((one) => one.loyalty >= COMEBACK.revoltLoyalty).length
  const can: Record<RoadId, boolean> = {
    service: court !== null,
    hire: state.character.money >= COMEBACK.hireSilver,
    marriage:
      kin || Object.keys(world.kingdoms).some((id) => relationOf(state.politics, PLAYER, id) >= 25),
    revolt: loyal > 0,
  }
  return ROADS.map((road) => ({
    road,
    open: can[road],
    says: `${ROAD_DEFS[road].label}: ${can[road] ? 'открыта' : 'закрыта'} — нужно ${ROAD_DEFS[road].needs}; ${ROAD_DEFS[road].years} лет, платится ${ROAD_DEFS[road].costs}.`,
  }))
}

/** Кому выгоден твой возврат (Об3). */
export function whoHelps(
  state: GameState,
  world: World,
  day: number,
): readonly { readonly who: string; readonly why: string }[] {
  const out: { who: string; why: string }[] = []
  for (const id of Object.keys(world.kingdoms)) {
    if (relationOf(state.politics, PLAYER, id) >= 20) {
      out.push({ who: id, why: 'ты ему не чужой, а твой возврат ослабит того, кто взял твоё' })
    }
  }
  for (const lord of vassalsOf(state)) {
    if (lord.loyalty >= COMEBACK.revoltLoyalty) {
      out.push({ who: lord.name, why: 'бывший вассал: при тебе ему было лучше' })
    }
  }
  return out
}

/** Чего стоит вернуться во второй раз (Об4). */
export function secondTime(
  state: GameState,
  world: World,
  day: number,
): { readonly unrest: number; readonly recognition: number; readonly says: string } {
  const times = (state.fallenLog ?? []).length
  return {
    unrest: COMEBACK.secondTime * times,
    recognition: COMEBACK.secondRecognition * times,
    says: `${COMEBACK_WORDS.worse} Потерь за тобой ${times}: недовольства ${COMEBACK.secondTime * times}, признания ${COMEBACK.secondRecognition * times}.`,
  }
}

/** Возврат в числах (Об6). */
export function comebackLedger(
  state: GameState,
  world: World,
  day: number,
): { readonly open: number; readonly says: string } {
  const roads = roadsBack(state, world, day).filter((one) => one.open)
  const claim = oldClaim(state, world, day)
  const helps = whoHelps(state, world, day)
  return {
    open: roads.length,
    says: `${COMEBACK_WORDS.roads} Открыто ${roads.length} из ${ROADS.length}${roads.length > 0 ? `: ${roads.map((one) => ROAD_DEFS[one.road].label).join(', ')}` : ''}. ${claim.says} ${COMEBACK_WORDS.helps} Таких ${helps.length}${helps.length > 0 ? `: ${helps.map((one) => sideName(world, one.who)).join(', ')}` : ''}. ${holdingsOf(state.settlements, PLAYER).length === 0 ? COMEBACK_WORDS.stay : ''}`,
  }
}

export { COMEBACK, COMEBACK_WORDS, ROADS, ROAD_DEFS, type RoadId }
