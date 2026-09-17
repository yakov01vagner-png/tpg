import type { GameState } from './state'
import { SCHEMA_VERSION } from './state'

/**
 * Сохранение и загрузка.
 *
 * Сейв — это JSON состояния со своей версией схемы. Миграции заведены с первого
 * дня (п.2 дизайн-документа): баланс и структура будут меняться каждую неделю, и
 * без миграций каждое изменение ломало бы чужие сейвы.
 */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>

/**
 * Миграции с версии N на N+1. Ключ — версия, С которой мигрируем.
 * Пока пусто: первая версия схемы.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {}

export type LoadResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly error: string }

export function serialize(state: GameState): string {
  return JSON.stringify(state)
}

export function deserialize(json: string): LoadResult {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { ok: false, error: 'Файл сохранения повреждён.' }
  }
  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: 'Файл сохранения повреждён.' }
  }

  let record = data as Record<string, unknown>
  let version = record['schemaVersion']
  if (typeof version !== 'number') {
    return { ok: false, error: 'В сохранении не указана версия схемы.' }
  }
  if (version > SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Сохранение сделано более новой версией игры (${version} > ${SCHEMA_VERSION}).`,
    }
  }
  while (version < SCHEMA_VERSION) {
    const migration = MIGRATIONS[version]
    if (!migration) {
      return { ok: false, error: `Нет миграции сейва с версии ${version}.` }
    }
    record = migration(record)
    version += 1
    record['schemaVersion'] = version
  }

  const problem = validate(record)
  if (problem) return { ok: false, error: problem }
  return { ok: true, state: record as unknown as GameState }
}

/** Грубая проверка формы: ловит чужой JSON, а не опечатки в балансе. */
function validate(record: Record<string, unknown>): string | null {
  if (typeof record['time'] !== 'number') return 'В сохранении нет игрового времени.'
  const rng = record['rng']
  if (typeof rng !== 'object' || rng === null || typeof (rng as { state?: unknown }).state !== 'number') {
    return 'В сохранении нет состояния генератора случайных чисел.'
  }
  const character = record['character']
  if (typeof character !== 'object' || character === null) return 'В сохранении нет персонажа.'
  if (!Array.isArray(record['log'])) return 'В сохранении нет журнала.'
  return null
}
