import { describe, expect, it } from 'vitest'
import {
  MINUTES_PER_DAY,
  WORLD_START,
  dayOf,
  formatDuration,
  formatTime,
  hourOf,
  hours,
  isNight,
  nextTimeOfDay,
} from '../src/time'

describe('игровое время', () => {
  it('начинается утром первого дня', () => {
    expect(dayOf(WORLD_START)).toBe(1)
    expect(hourOf(WORLD_START)).toBe(6)
    expect(formatTime(WORLD_START)).toBe('День 1, 06:00')
  })

  it('считает дни через полночь', () => {
    expect(dayOf(WORLD_START + MINUTES_PER_DAY)).toBe(2)
    expect(formatTime(WORLD_START + hours(20))).toBe('День 2, 02:00')
  })

  it('ищет ближайшее утро строго в будущем', () => {
    const evening = WORLD_START + hours(15)
    const morning = nextTimeOfDay(evening, 6)
    expect(morning).toBeGreaterThan(evening)
    expect(hourOf(morning)).toBe(6)
    expect(dayOf(morning)).toBe(2)
  })

  it('не считает текущий момент наступлением того же часа', () => {
    expect(nextTimeOfDay(WORLD_START, 6)).toBe(WORLD_START + MINUTES_PER_DAY)
  })

  it('знает, когда ночь', () => {
    expect(isNight(WORLD_START)).toBe(false)
    expect(isNight(WORLD_START + hours(17))).toBe(true)
    expect(isNight(WORLD_START + hours(20))).toBe(true)
  })

  it('пишет длительность по-человечески', () => {
    expect(formatDuration(30)).toBe('30 мин')
    expect(formatDuration(480)).toBe('8 ч')
    expect(formatDuration(90)).toBe('1 ч 30 мин')
  })
})
