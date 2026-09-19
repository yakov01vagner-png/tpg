import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import {
  chaptersOf,
  closeGeneration,
  houseOf,
  markWord,
  marksAt,
  ownChronicle,
  rememberedPlaces,
  withMark,
  worldChronicle,
} from '../src/chronicle'
import { applyCommand } from '../src/commands'
import { withDeed } from '../src/fame'
import type { GameState, LogEntry } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, MINUTES_PER_DAY, WORLD_START, yearOf } from '../src/time'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 69: летопись как история.
 *
 * Журнал был лентой: сто строк подряд, и чем дальше, тем меньше смысла.
 * Прожитое — это главы: год, названный тем, чем он был занят, и две книги —
 * своя и мировая.
 */

const world = generateWorld(1)

const line = (day: number, kind: LogEntry['kind'], text: string): LogEntry => ({
  time: WORLD_START + (day - 1) * MINUTES_PER_DAY,
  text,
  kind,
})

describe('И1: главы, а не лента', () => {
  it('год складывается в главу и называется тем, чем был занят', () => {
    const log: LogEntry[] = [
      line(10, 'war', 'Война: Ре-Эстиз и Бохарут.'),
      line(30, 'war', 'Взят Овражий Брод.'),
      line(60, 'war', 'Мир заключён.'),
      line(80, 'trade', 'Продано сукно.'),
      line(DAYS_PER_YEAR + 20, 'trade', 'Караван вернулся с прибылью.'),
      line(DAYS_PER_YEAR + 40, 'trade', 'Открыт рынок.'),
      line(DAYS_PER_YEAR + 60, 'money', 'Подати с владений.'),
    ]
    const chapters = chaptersOf({ log })
    console.log(
      chapters.map((one) => `${one.year}: ${one.title} (${one.lines.length} строк)`).join('; '),
    )
    expect(chapters).toHaveLength(2)
    expect(chapters[0]?.title).toBe('Год войны')
    expect(chapters[1]?.title).toBe('Год торга')
    expect(chapters[0]?.year).toBe(yearOf(10))
    // Пустых глав нет: год, в который ничего не случилось, не помнят.
    expect(chapters.every((one) => one.lines.length > 0)).toBe(true)
  })
})

describe('И2 и И6: две книги — своя и мировая', () => {
  it('что случилось без тебя, записано отдельно от того, что делал ты', () => {
    const log: LogEntry[] = [
      line(5, 'war', 'Война: Ре-Эстиз и Бохарут.'),
      line(6, 'plague', 'В Ре-Эстизе мор.'),
      line(7, 'world', 'Архимаг короны отводит мор.'),
      line(8, 'money', 'Заработано на жатве: 20.'),
      line(9, 'people', 'Спутник ушёл своей дорогой.'),
    ]
    const world_ = worldChronicle({ log })
    const own = ownChronicle({ log })
    console.log(`мировая книга: ${world_[0]?.lines.length} строк, своя: ${own[0]?.lines.length}`)
    expect(world_[0]?.lines).toHaveLength(3)
    expect(own[0]?.lines).toHaveLength(2)
    // В главе видно, чего в ней было больше.
    const both = chaptersOf({ log })
    expect(both[0]?.world).toBe(3)
    expect(both[0]?.own).toBe(2)
  })
})

describe('И4: летопись рода', () => {
  it('колено закрывается тем, чем человек был', () => {
    const base = createGame(createCharacter({ name: 'Ратша' }), 1, world)
    const warlike: GameState = { ...base, battlesWon: 12, renown: 20 }
    const soldier = closeGeneration(warlike, -7000, 500, 0)
    console.log(`${soldier.name}: «${soldier.said}» (побед ${soldier.battles})`)
    expect(soldier.said).toContain('войне')
    const landed = closeGeneration({ ...base, battlesWon: 1 }, -7000, 9000, 4)
    expect(landed.said).toContain('землю')
    const quiet = closeGeneration({ ...base, battlesWon: 0 }, -7000, 3000, 0)
    expect(quiet.said.length).toBeGreaterThan(5)
    // Прозвище записывается вместе с именем: под ним и запомнят.
    const bloody = closeGeneration(
      { ...base, fame: withDeed(withDeed(withDeed({}, 'sack'), 'sack'), 'sack') },
      -7000,
      5000,
      0,
    )
    console.log(`${bloody.name} ${bloody.byname ?? ''}: «${bloody.said}»`)
    expect(bloody.byname).toBe('Кровавый')
    expect(houseOf({ house: [soldier, landed] })).toHaveLength(2)
  })

  it('уходя на покой, герой оставляет колено в летописи', () => {
    const base = createGame(createCharacter({ name: 'Т', age: 56 }), 1, world)
    // Наследник должен быть взрослым: без него на покой не уходят.
    const withHeir: GameState = {
      ...base,
      time: WORLD_START + 40 * DAYS_PER_YEAR * MINUTES_PER_DAY,
      character: {
        ...base.character,
        age: 56,
        family: {
          ...base.character.family,
          children: [{ name: 'Добрыня', bornDay: 1, heir: true }],
        },
      },
    }
    const result = applyCommand(withHeir, { type: 'retire' })
    if (!result.ok) {
      console.log(`на покой не вышло: ${result.message}`)
      return
    }
    console.log(
      `колен в роду: ${houseOf(result.state).length}, первое — ${houseOf(result.state)[0]?.name}`,
    )
    expect(houseOf(result.state)).toHaveLength(1)
    expect(result.state.character.name).toBe('Добрыня')
  })
})

describe('И5: карта памяти', () => {
  it('места с историей отмечаются сами', () => {
    expect(markWord(0)).toBe('')
    expect(markWord(1)).toContain('было')
    expect(markWord(5)).toContain('жизни')
    let marks = withMark(undefined, 'a')
    marks = withMark(marks, 'a')
    marks = withMark(marks, 'b')
    expect(marksAt({ marks }, 'a')).toBe(2)
    expect(rememberedPlaces({ marks })).toEqual(['a', 'b'])

    // И в игре это набирается само: заметное дело метит место.
    const village = Object.values(world.locations).find((one) => one.archetype === 'village')
    if (!village) return
    const state: GameState = {
      ...createGame(createCharacter({ name: 'Т', money: 900 }), 1, world),
      locationId: village.id,
      quarter: null,
      time: WORLD_START,
    }
    expect(marksAt(state, village.id)).toBe(0)
  })
})
