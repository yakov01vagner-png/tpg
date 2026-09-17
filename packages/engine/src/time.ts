/**
 * Игровое время.
 *
 * Хранится как целое число минут от начала мира — одно число, которое просто
 * сериализуется и не страдает от часовых поясов и високосных лет.
 *
 * Время двигают действия (п.11.1 дизайн-документа): непрерывно тикающих часов
 * нет, клок сдвигается только тогда, когда игрок что-то сделал.
 */
export type GameTime = number

export const MINUTES_PER_HOUR = 60
export const HOURS_PER_DAY = 24
export const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY

/** Мир начинается в 6 утра первого дня. */
export const WORLD_START: GameTime = 6 * MINUTES_PER_HOUR

export function hours(count: number): number {
  return Math.round(count * MINUTES_PER_HOUR)
}

/** Номер дня, начиная с 1. */
export function dayOf(time: GameTime): number {
  return Math.floor(time / MINUTES_PER_DAY) + 1
}

export function hourOf(time: GameTime): number {
  return Math.floor((time % MINUTES_PER_DAY) / MINUTES_PER_HOUR)
}

export function minuteOf(time: GameTime): number {
  return time % MINUTES_PER_HOUR
}

/** Ближайшее наступление указанного часа строго в будущем. */
export function nextTimeOfDay(time: GameTime, hour: number): GameTime {
  const startOfDay = time - (time % MINUTES_PER_DAY)
  const candidate = startOfDay + hour * MINUTES_PER_HOUR
  return candidate > time ? candidate : candidate + MINUTES_PER_DAY
}

/** Ночь — когда работать и учиться нельзя, а спать самое время. */
export function isNight(time: GameTime): boolean {
  const hour = hourOf(time)
  return hour >= 22 || hour < 6
}

/** «День 3, 14:30» — для лога и шапки экрана. */
export function formatTime(time: GameTime): string {
  const hh = String(hourOf(time)).padStart(2, '0')
  const mm = String(minuteOf(time)).padStart(2, '0')
  return `День ${dayOf(time)}, ${hh}:${mm}`
}

/** «8 ч», «30 мин», «1 ч 30 мин» — для описания цены действия. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / MINUTES_PER_HOUR)
  const m = minutes % MINUTES_PER_HOUR
  if (h === 0) return `${m} мин`
  if (m === 0) return `${h} ч`
  return `${h} ч ${m} мин`
}

/**
 * Окно доступности: с какого по какой час дела можно начать.
 * Проверяется только начало — начатую смену не прерывает наступление ночи.
 */
export interface TimeWindow {
  readonly fromHour: number
  readonly toHour: number
}

/** Дневное окно по умолчанию: работают и учатся при свете. */
export const DAY_WINDOW: TimeWindow = { fromHour: 6, toHour: 22 }
/** Ночное окно — для дел, которые днём не делают. */
export const NIGHT_WINDOW: TimeWindow = { fromHour: 22, toHour: 6 }

export function isWithinWindow(time: GameTime, window: TimeWindow): boolean {
  const hour = hourOf(time)
  return window.fromHour < window.toHour
    ? hour >= window.fromHour && hour < window.toHour
    : hour >= window.fromHour || hour < window.toHour
}

/** «с 06:00 до 22:00» — для причины отказа и для подписи в списке. */
export function formatWindow(window: TimeWindow): string {
  const pad = (hour: number) => `${String(hour % 24).padStart(2, '0')}:00`
  return `с ${pad(window.fromHour)} до ${pad(window.toHour)}`
}

/** «22:00–06:00» — компактная подпись для списка дел. */
export function formatWindowShort(window: TimeWindow): string {
  const pad = (hour: number) => `${String(hour % 24).padStart(2, '0')}:00`
  return `${pad(window.fromHour)}–${pad(window.toHour)}`
}
