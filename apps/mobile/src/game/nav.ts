import { useSyncExternalStore } from 'react'

/**
 * Навигация: пять вкладок и один лист поверх.
 *
 * Дом — «Здесь»: место, где ты стоишь. Вкладки — то, к чему возвращаются
 * десятки раз за игру и до чего дотягивается большой палец. Лист поверх — то,
 * что открывают на минуту и закрывают: рынок, сводка мира, подробности. Своя
 * маленькая навигация вместо библиотеки: два состояния не стоят зависимости.
 */
export type TabId = 'here' | 'map' | 'people' | 'hero' | 'journal'
export type SheetId = 'trade' | 'world' | null

interface NavState {
  readonly tab: TabId
  readonly sheet: SheetId
}

let state: NavState = { tab: 'here', sheet: null }
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

export function goTab(tab: TabId): void {
  set({ tab, sheet: null })
}

export function openSheet(sheet: Exclude<SheetId, null>): void {
  set({ ...state, sheet })
}

export function closeSheet(): void {
  set({ ...state, sheet: null })
}
