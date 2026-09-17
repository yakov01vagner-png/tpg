import {
  type CharacterDraft,
  type Command,
  type GameState,
  applyCommand,
  createCharacter,
  createGame,
  deserialize,
  serialize,
} from '@tpg/engine'
import { useSyncExternalStore } from 'react'
import { clearSave, readSave, writeSave } from './storage'

/**
 * Состояние приложения поверх состояния игры.
 *
 * Своё маленькое хранилище вместо Redux и подобного: вся игра уже живёт одним
 * сериализуемым объектом в ядре, и задача UI — только показать его и отправить
 * команду обратно.
 */
export type AppState =
  | { readonly phase: 'loading' }
  | { readonly phase: 'create'; readonly error: string | null }
  | { readonly phase: 'play'; readonly game: GameState; readonly notice: string | null }

let state: AppState = { phase: 'loading' }
const listeners = new Set<() => void>()

function set(next: AppState): void {
  state = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function snapshot(): AppState {
  return state
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, snapshot)
}

/** Поднять сохранённую игру при запуске. Нет сейва или он битый — создаём заново. */
export async function bootstrap(): Promise<void> {
  const raw = await readSave()
  if (raw === null) {
    set({ phase: 'create', error: null })
    return
  }
  const loaded = deserialize(raw)
  set(
    loaded.ok
      ? { phase: 'play', game: loaded.state, notice: null }
      : { phase: 'create', error: loaded.error },
  )
}

export function startGame(draft: CharacterDraft): void {
  const game = createGame(createCharacter(draft), Math.floor(Math.random() * 2 ** 31))
  set({ phase: 'play', game, notice: null })
  void writeSave(serialize(game))
}

/**
 * Отправить команду в ядро. Отказ — не ошибка приложения: показываем игроку
 * причину теми же словами, что вернул движок.
 */
export function dispatch(command: Command): void {
  if (state.phase !== 'play') return
  const result = applyCommand(state.game, command)
  if (!result.ok) {
    set({ phase: 'play', game: state.game, notice: result.message })
    return
  }
  set({ phase: 'play', game: result.state, notice: null })
  void writeSave(serialize(result.state))
}

export function dismissNotice(): void {
  if (state.phase !== 'play') return
  set({ phase: 'play', game: state.game, notice: null })
}

export async function abandonGame(): Promise<void> {
  await clearSave()
  set({ phase: 'create', error: null })
}
