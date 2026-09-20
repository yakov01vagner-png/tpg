import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { knownTo } from '../src/known'
import { createRng } from '../src/rng'
import { newsScreen, powerScreens, sourceLine, spreadValue } from '../src/screens'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 128: интерфейс неполного знания.
 *
 * Версия сделала знание вещью с источником, возрастом и вилкой. Здесь это
 * доходит до экрана: у каждого числа сказано, откуда оно и когда, неточное
 * показано вилкой, а незнание названо вслух — и тут же сказано, как узнать.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const foe = kingdoms[1] as string
const day = 400

function ruler(extra: Partial<GameState> = {}): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 900)
    .slice(0, 4)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    ...extra,
  }
}

const words = [
  {
    id: 'w1',
    to: PLAYER,
    kind: 'strength' as const,
    about: foe,
    value: 1200,
    source: 'envoy' as const,
    from: 'посол Гюрята',
    day: day - 40,
  },
  {
    id: 'w2',
    to: PLAYER,
    kind: 'purse' as const,
    about: foe,
    value: 8000,
    source: 'rumour' as const,
    from: null,
    day: day - 5,
  },
]

describe('И1 и И2: откуда, когда и вилка вместо точки', () => {
  it('у каждого числа сказано, откуда оно и насколько ему верить', () => {
    const state = ruler({ words })
    const known = knownTo(state, world, PLAYER, { kind: 'strength', about: foe }, day)
    console.log(`сила ${world.kingdoms[foe]?.name}: ${spreadValue(known)} — ${sourceLine(known)}`)
    expect(spreadValue(known)).toContain('–')
    expect(sourceLine(known)).toContain('сут.')

    // Незнание не притворяется числом.
    const blank = knownTo(ruler(), world, PLAYER, { kind: 'purse', about: foe }, day)
    console.log(`о казне без вестей: ${spreadValue(blank)} — ${sourceLine(blank)}`)
    expect(spreadValue(blank)).toBe('неизвестно')
  })
})

describe('И3 и И4: экран вестей', () => {
  it('всё, что принесли, в одном месте — и незнание названо', () => {
    const empty = newsScreen(ruler(), world)
    console.log(`пустой экран: ${empty.says}`)
    expect(empty.says).toContain('не то же самое')

    const state = ruler({ words })
    const screen = newsScreen(state, world)
    console.log(screen.says)
    for (const line of screen.lines) {
      console.log(`${line.label}: ${line.value} — ${line.hint}`)
    }
    expect(screen.lines.length).toBeGreaterThanOrEqual(2)
    expect(screen.lines.every((one) => (one.hint ?? '').length > 0)).toBe(true)
  })
})

describe('И5: решение из экрана', () => {
  it('узнал — и тут же можешь послать, проверить, поручить', () => {
    const state = ruler({ words })
    const screen = newsScreen(state, world)
    for (const deed of screen.deeds) {
      console.log(`${deed.label}: ${deed.can ? 'можно' : 'нельзя'} — ${deed.why}`)
    }
    expect(screen.deeds.length).toBeGreaterThan(0)
    const open = screen.deeds.filter((one) => one.can)
    expect(open.length).toBeGreaterThan(0)
    const first = open[0]
    if (!first) return
    const done = applyCommand(state, first.command)
    console.log(`${first.label}: ${done.ok ? 'сделано' : `нельзя — ${done.message}`}`)
    expect(done.ok).toBe(true)
  })

  it('экран вестей стоит в ряду прочих', () => {
    const screens = powerScreens(ruler(), world)
    console.log(`экраны: ${screens.map((one) => one.title).join(', ')}`)
    expect(screens.some((one) => one.id === 'news')).toBe(true)
  })
})

describe('И6: неполнота читается за один взгляд', () => {
  it('строка о неточности коротка и не превращается в загадку', () => {
    const state = ruler({ words })
    const screen = newsScreen(state, world)
    const longest = screen.lines.reduce((most, one) => Math.max(most, (one.hint ?? '').length), 0)
    console.log(`самая длинная строка пояснения: ${longest} знаков`)
    expect(longest).toBeLessThan(160)
    // И в каждой сказано либо когда это узнали, либо что не узнали вовсе.
    const marks = ['сут.', 'неизвестно', 'Видели', 'ни слова', 'свежее', 'старое']
    for (const line of screen.lines) {
      const hint = line.hint ?? ''
      const has = marks.some((mark) => hint.includes(mark))
      if (!has) console.log(`строка без возраста: ${line.label} — ${hint}`)
      expect(has).toBe(true)
    }
  })
})
