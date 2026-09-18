import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'

/**
 * Какие подсказки уже закрыты. Это про игрока, а не про игру, поэтому живёт
 * рядом с сейвом, а не в нём: новый герой не должен читать подсказки заново.
 */
const KEY = 'tpg.hints'

let dismissed: ReadonlySet<string> = new Set()
let loaded = false
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

async function load(): Promise<void> {
  if (loaded) return
  loaded = true
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (raw) dismissed = new Set(JSON.parse(raw) as string[])
  } catch {
    // Нет — значит, ничего не закрыто.
  }
  emit()
}

export function dismissHint(id: string): void {
  dismissed = new Set([...dismissed, id])
  emit()
  void AsyncStorage.setItem(KEY, JSON.stringify([...dismissed])).catch(() => undefined)
}

export function useDismissedHints(): ReadonlySet<string> {
  void load()
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => dismissed,
  )
}
