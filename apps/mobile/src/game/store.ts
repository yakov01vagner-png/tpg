import {
  CLOCK_SPEEDS,
  type CharacterDraft,
  type ClockSpeed,
  type Command,
  type GameState,
  applyCommand,
  createCharacter,
  createGame,
  deserialize,
  serialize,
} from '@tpg/engine'
import { useSyncExternalStore } from 'react'
import { AppState as NativeAppState } from 'react-native'
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
  | {
      readonly phase: 'play'
      readonly game: GameState
      readonly notice: string | null
      readonly speed: ClockSpeed
    }

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
      ? { phase: 'play', game: loaded.state, notice: null, speed: 'normal' }
      : { phase: 'create', error: loaded.error },
  )
  startClock()
}

export function startGame(draft: CharacterDraft): void {
  const game = createGame(createCharacter(draft), Math.floor(Math.random() * 2 ** 31))
  set({ phase: 'play', game, notice: null, speed: 'normal' })
  void writeSave(serialize(game))
  startClock()
}

/**
 * Отправить команду в ядро. Отказ — не ошибка приложения: показываем игроку
 * причину теми же словами, что вернул движок.
 */
export function dispatch(command: Command): void {
  if (state.phase !== 'play') return
  const result = applyCommand(state.game, command)
  if (!result.ok) {
    set({ ...state, notice: result.message })
    return
  }
  set({ ...state, game: result.state, notice: null })
  void writeSave(serialize(result.state))
}

export function setSpeed(speed: ClockSpeed): void {
  if (state.phase !== 'play') return
  set({ ...state, speed })
}

export function dismissNotice(): void {
  if (state.phase !== 'play') return
  set({ ...state, notice: null })
}

export async function abandonGame(): Promise<void> {
  await clearSave()
  set({ phase: 'create', error: null })
}

// --- ход времени ------------------------------------------------------------

/** Как часто часы делают шаг. Раз в секунду — достаточно плавно и дёшево. */
const TICK_INTERVAL_MS = 1000
/** Сейв на каждом тике убил бы хранилище: пишем не чаще раза в пятнадцать секунд. */
const TICK_SAVE_INTERVAL_MS = 15_000

let clock: ReturnType<typeof setInterval> | null = null
let lastTickSave = 0

/**
 * Мир идёт сам, пока открыт экран.
 *
 * Часы останавливаются сами, когда случилось что-то, о чём стоит прочитать, —
 * иначе новость проносится мимо. И останавливаются, когда приложение уходит в
 * фон: мир стоит на паузе, пока игра закрыта (DESIGN.md, п.2).
 */
export function startClock(): void {
  if (clock !== null) return
  clock = setInterval(() => {
    if (state.phase !== 'play') return
    if (state.speed === 'paused' || state.game.battle || state.game.over) return

    const minutes = CLOCK_SPEEDS[state.speed]
    if (minutes <= 0) return

    const result = applyCommand(state.game, { type: 'tick', minutes })
    if (!result.ok) return

    // Что-то произошло — остановиться и дать прочитать.
    const news = result.events.find((event) => event.type === 'notice')
    set({
      phase: 'play',
      game: result.state,
      notice: news && news.type === 'notice' ? news.text : null,
      speed: news ? 'paused' : state.speed,
    })

    const now = Date.now()
    if (now - lastTickSave > TICK_SAVE_INTERVAL_MS) {
      lastTickSave = now
      void writeSave(serialize(result.state))
    }
  }, TICK_INTERVAL_MS)

  NativeAppState.addEventListener('change', (status) => {
    if (status === 'active') return
    // Уходим в фон: замереть и сохраниться.
    if (state.phase === 'play') {
      set({ ...state, speed: 'paused' })
      void writeSave(serialize(state.game))
    }
  })
}
