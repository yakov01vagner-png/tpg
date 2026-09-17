/**
 * Детерминированный ГПСЧ (mulberry32).
 *
 * Состояние сериализуемо и передаётся явно: функция, которой нужна случайность,
 * принимает Rng и возвращает новый Rng вместе с результатом. Причина — п.2
 * дизайн-документа: одна и та же последовательность команд из одного сейва
 * обязана давать один и тот же результат. Иначе не воспроизвести баг по сейву и
 * не перенести симуляцию на сервер.
 */
export interface Rng {
  readonly state: number
}

export function createRng(seed: number): Rng {
  return { state: seed >>> 0 }
}

/** Следующее число в [0, 1) вместе с новым состоянием генератора. */
export function nextFloat(rng: Rng): readonly [number, Rng] {
  const state = (rng.state + 0x6d2b79f5) >>> 0
  let t = state
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return [value, { state }]
}

/** Целое в [min, max] включительно. */
export function nextInt(rng: Rng, min: number, max: number): readonly [number, Rng] {
  const [value, next] = nextFloat(rng)
  return [min + Math.floor(value * (max - min + 1)), next]
}

/** Бросок с вероятностью успеха chance (0..1). */
export function rollChance(rng: Rng, chance: number): readonly [boolean, Rng] {
  const [value, next] = nextFloat(rng)
  return [value < chance, next]
}

/**
 * Множитель разброса вокруг единицы: 1 ± spread.
 * Используется, чтобы одинаковые действия не давали идеально одинаковый результат.
 */
export function variance(rng: Rng, spread: number): readonly [number, Rng] {
  const [value, next] = nextFloat(rng)
  return [1 - spread + value * spread * 2, next]
}
