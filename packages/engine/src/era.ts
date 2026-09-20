import { ERA, ERAS, ERA_DEFS, ERA_WORDS, type EraId } from './content/era'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Событие эпохи (этап 146).
 *
 * Эпоха — не число, а правило: пока она идёт, мир считается иначе. Какая и
 * когда — выводится из дня и зерна мира, а не бросается кубиком, и потому одна
 * и та же игра даёт одну и ту же историю.
 */

export function eraDef(id: EraId) {
  return ERA_DEFS[id]
}

function hashOf(text: string): number {
  let hash = 2166136261
  for (const ch of text) {
    hash ^= ch.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

/** Какая эпоха придёт в это окно и когда (Эп2 и Эп3). */
export function eraFor(world: World, window: number): { readonly id: EraId; readonly day: number } {
  // Зерна в самом мире нет, но есть то, что из него выросло: имена столиц.
  // Одна и та же карта даёт одну и ту же историю эпох.
  const seed = Object.keys(world.kingdoms).join('|')
  const hash = hashOf(`era|${seed}|${window}`)
  const id = ERAS[hash % ERAS.length] ?? 'schism'
  // День внутри окна: эпохи не приходят по расписанию, но и не по кубику.
  const day = window * ERA.apartYears * 365 + (hash % (ERA.apartYears * 365))
  return { id, day }
}

/** Идёт ли эпоха сейчас (Эп1). */
export function eraNow(
  state: GameState,
  world: World,
  day: number,
): { readonly id: EraId | null; readonly left: number; readonly says: string } {
  const row = state.era ?? null
  if (!row || day >= row.untilDay) {
    return { id: null, left: 0, says: 'Эпохи сейчас нет: мир играется по обычным правилам.' }
  }
  const def = ERA_DEFS[row.id as EraId]
  return {
    id: row.id as EraId,
    left: row.untilDay - day,
    says: `${def.label}: ${def.rule} Осталось ${Math.round((row.untilDay - day) / 365)} лет. ${def.about}`,
  }
}

/** Приметы того, что идёт (Эп3). */
export function eraSigns(
  state: GameState,
  world: World,
  day: number,
): { readonly id: EraId | null; readonly years: number; readonly says: string } {
  const window = Math.floor(day / (ERA.apartYears * 365))
  for (const one of [window, window + 1]) {
    const next = eraFor(world, one)
    const away = next.day - day
    if (away <= 0 || away > ERA.signYears * 365) continue
    const def = ERA_DEFS[next.id]
    return {
      id: next.id,
      years: Math.round(away / 365),
      says: `${ERA_WORDS.coming} ${def.signs.join(', ')} — лет через ${Math.max(1, Math.round(away / 365))}.`,
    }
  }
  return { id: null, years: 0, says: 'Примет не видно: мир идёт как шёл.' }
}

/** Чем ответить на эпоху (Эп5). */
export function answersTo(id: EraId) {
  return ERA_DEFS[id].answers
}

/** Что эпоха делает с миром, числами (Эп1). */
export function eraTweaks(
  state: GameState,
  world: World,
  day: number,
): {
  readonly warPressure: number
  readonly churchAnger: number
  readonly people: number
  readonly loyalty: number
} {
  const now = eraNow(state, world, day)
  if (!now.id) return { warPressure: 1, churchAnger: 0, people: 0, loyalty: 0 }
  if (now.id === 'schism') return { warPressure: 1, churchAnger: 2, people: 0, loyalty: 0 }
  if (now.id === 'plague') return { warPressure: 0.6, churchAnger: 0, people: -0.01, loyalty: 0 }
  if (now.id === 'powder') return { warPressure: 1.5, churchAnger: 0, people: 0, loyalty: 0 }
  if (now.id === 'order') return { warPressure: 1.3, churchAnger: 0, people: 0, loyalty: -2 }
  if (now.id === 'famine') return { warPressure: 0.8, churchAnger: 0, people: -0.005, loyalty: -1 }
  return { warPressure: 1, churchAnger: 0, people: 0, loyalty: 0 }
}

/** Эпохи в числах (Эп6). */
export function eraLedger(
  state: GameState,
  world: World,
  day: number,
): { readonly past: number; readonly says: string } {
  const log = state.eraLog ?? []
  const now = eraNow(state, world, day)
  const signs = eraSigns(state, world, day)
  return {
    past: log.length,
    says: `Эпох прошло ${log.length}${log.length > 0 ? `: ${log.map((one) => `${ERA_DEFS[one.id as EraId].label} (${one.from}–${one.to})`).join(', ')}` : ''}. ${now.id ? now.says : signs.says}`,
  }
}

export { ERA, ERAS, ERA_DEFS, ERA_WORDS, type EraId }
