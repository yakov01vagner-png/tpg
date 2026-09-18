import { useSyncExternalStore } from 'react'

/**
 * Навигация: дом и стопка листов над ним.
 *
 * Дом — место, где ты стоишь. Всё остальное — лист поверх: намерение (заработать,
 * научиться, рынок, люди, своё), летопись, двор, карта, сводка. Лист закрывается
 * одним нажатием, и ты снова дома. Вкладок нет: игра — это место, а не меню.
 */
export type SheetId =
  | 'earn'
  | 'learn'
  | 'market'
  | 'people'
  | 'own'
  | 'chronicle'
  | 'court'
  | 'map'
  | 'world'
  | 'saves'

export const SHEET_TITLES: Record<SheetId, string> = {
  earn: 'Заработать',
  learn: 'Научиться',
  market: 'Рынок',
  people: 'Люди',
  own: 'Своё',
  chronicle: 'Летопись',
  court: 'Двор',
  map: 'Карта',
  world: 'Сводка мира',
  saves: 'Сейвы',
}

interface NavState {
  readonly stack: readonly SheetId[]
}

let state: NavState = { stack: [] }
const listeners = new Set<() => void>()

function set(next: NavState): void {
  state = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useNav(): NavState {
  return useSyncExternalStore(subscribe, () => state)
}

export function openSheet(sheet: SheetId): void {
  if (state.stack[state.stack.length - 1] === sheet) return
  set({ stack: [...state.stack, sheet] })
}

export function closeSheet(): void {
  set({ stack: state.stack.slice(0, -1) })
}

export function goHome(): void {
  set({ stack: [] })
}
