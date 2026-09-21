import { KEY_SHUFFLED, KEY_WORDS } from './content/keys'
import { deserialize, serialize } from './save'
import type { GameState } from './state'

/**
 * Порядок ключей, который не должен решать (этап 208).
 *
 * Состояние полно словарей: поселения, отношения корон, метки, дела. Порядок
 * ключей в них — не данные: он такой, каким его оставила запись. После сейва,
 * миграции или другого пути он может выйти иным, и всё, что решает по этому
 * порядку, решает по случайности, которой нет в правилах.
 *
 * Здесь появляются две вещи: приведённый вид состояния, по которому можно
 * сверять миры с разным порядком ключей, и перемешивание — способ этот порядок
 * нарочно сломать и посмотреть, изменится ли мир.
 */

/**
 * Приведённый вид: то же состояние, но ключи всех словарей отсортированы.
 *
 * Отпечаток из `replay.ts` меняется от любой разницы в сейве, включая разницу
 * порядка. Здесь разница порядка нарочно стирается: остаётся суть.
 */
export function canonical(state: GameState): string {
  return JSON.stringify(sortedDeep(JSON.parse(serialize(state)) as unknown))
}

/** Отпечаток, который не видит порядка ключей. */
export function stableMark(state: GameState): number {
  return hashOf(canonical(state))
}

function sortedDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedDeep)
  if (typeof value !== 'object' || value === null) return value
  const row = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  // Массивы не трогаем: там порядок — данные. Словари приводим.
  for (const key of Object.keys(row).sort()) out[key] = sortedDeep(row[key])
  return out
}

/**
 * То же состояние с перемешанными ключами словарей (Пр5).
 *
 * Перемешивание детерминированное — от зерна, тем же хэшем, что во всём ядре:
 * проверка, которая сама бросает кубик, не повторяется.
 */
export function reordered(state: GameState, seed: number): GameState {
  // Через `deserialize`, а не через `JSON.parse`: маска моря в сейве лежит
  // отрезками, и состояние с упакованной маской — уже не то состояние. Сырой
  // разбор давал бы мир, который при следующей записи упакует упакованное.
  const mixed = JSON.stringify(shuffleDeep(JSON.parse(serialize(state)) as unknown, seed, ''))
  const back = deserialize(mixed)
  if (!back.ok) throw new Error(`перемешивание сломало состояние: ${back.error}`)
  return back.state
}

function shuffleDeep(value: unknown, seed: number, path: string): unknown {
  if (Array.isArray(value)) return value.map((one, i) => shuffleDeep(one, seed, `${path}.${i}`))
  if (typeof value !== 'object' || value === null) return value
  // Скелет мира не мешаем: он рождается из зерна, никогда не пересобирается, и
  // порядок его ключей — такие же данные, как порядок в массиве. Мешать его —
  // значит проверять не устойчивость, а то, что мир от зерна не зависит.
  if (path === 'world' || path.startsWith('world.')) return value
  const row = value as Record<string, unknown>
  // Ключи переставляются по хэшу от зерна и пути: то же зерно — та же
  // перестановка, и разошедшийся прогон можно повторить.
  const order = Object.keys(row)
    .map((key) => ({ key, mark: hashOf(`${seed}|${path}|${key}`) }))
    .sort((a, b) => a.mark - b.mark || (a.key < b.key ? -1 : 1))
  const out: Record<string, unknown> = {}
  for (const one of order) {
    out[one.key] = shuffleDeep(row[one.key], seed, path ? `${path}.${one.key}` : one.key)
  }
  return out
}

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

/** Сошлись ли два мира по сути, а не по порядку ключей (Пр1, Пр5). */
export function sameWorld(
  mine: GameState,
  theirs: GameState,
): { readonly same: boolean; readonly says: string } {
  const left = stableMark(mine)
  const right = stableMark(theirs)
  return {
    same: left === right,
    says:
      left === right
        ? `${KEY_WORDS.same} ${KEY_WORDS.canon} Отпечаток ${left}.`
        : `${KEY_WORDS.drift} ${left} против ${right}.`,
  }
}

/** Порядок в числах (Пр6). */
export function keyRoll(
  state: GameState,
  seed: number,
): {
  readonly watched: number
  readonly moved: number
  readonly places: number
  readonly says: string
} {
  const before = Object.keys(state.settlements)
  const after = Object.keys(reordered(state, seed).settlements)
  let moved = 0
  for (let i = 0; i < before.length; i += 1) if (before[i] !== after[i]) moved += 1
  return {
    watched: KEY_SHUFFLED.length,
    moved,
    places: before.length,
    says: `${KEY_WORDS.same} Словарей под присмотром ${KEY_SHUFFLED.length}; при перемешивании с места сошло ${moved} поселений из ${before.length}.`,
  }
}
