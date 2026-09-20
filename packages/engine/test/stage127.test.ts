import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import { growthScreen, powerScreens } from '../src/screens'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 127: экран роста.
 *
 * Лист героя перестаёт быть списком чисел: против каждой строки её дело, под
 * ней — что даст следующий уровень и чем его брать. Правило этапа 97 держится:
 * экран кончается действием, а не таблицей.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const day = 400

function ruler(skills: Record<string, number> = {}): GameState {
  const character = createCharacter({
    name: 'Ратша',
    money: 30000,
    skills: skills as never,
  })
  const game = createGame(character, 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 900)
    .slice(0, 3)
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
  }
}

describe('Э1, Э2 и Э5: что есть, что даёт и куда я иду', () => {
  it('одним взглядом: строки с делами и склад', () => {
    const state = ruler({ heavyWeapons: 45, command: 40, fortitude: 35, riding: 30 })
    const screen = growthScreen(state, world)
    console.log(screen.says)
    for (const line of screen.lines.slice(0, 9)) {
      console.log(`${line.label}: ${line.value} — ${line.hint}`)
    }
    expect(screen.id).toBe('growth')
    expect(screen.lines.length).toBeGreaterThan(6)
    // Каждая строка объясняет себя: числа без пояснения — не решение (этап 97).
    expect(screen.lines.every((one) => (one.hint ?? '').length > 0)).toBe(true)
    expect(screen.says).toContain('воин')
  })
})

describe('Э3: что дальше', () => {
  it('видно, сколько стоит следующий уровень и что держит', () => {
    const state = ruler({ trade: 35 })
    const line = growthScreen(state, world).lines.find((one) => one.label === 'Торговля')
    console.log(`${line?.label}: ${line?.value} — ${line?.hint}`)
    expect(line?.hint).toContain('Следующий уровень')

    // У того, кто упёрся в потолок, сказано и это.
    const capped = ruler({ trade: 45 })
    const wall = growthScreen(capped, world).lines.find((one) => one.label === 'Торговля')
    console.log(`${wall?.label}: ${wall?.value} — ${wall?.hint}`)
    expect(wall?.value).toContain('потолок')
  })
})

describe('Э4 и Э6: решение прямо с экрана', () => {
  it('экран кончается действием, а не таблицей', () => {
    const ready = ruler({ heavyWeapons: 45, command: 40, survival: 30, trade: 40 })
    const screen = growthScreen(ready, world)
    for (const deed of screen.deeds.slice(0, 5)) {
      console.log(`${deed.label}: ${deed.can ? 'можно' : 'нельзя'} — ${deed.why}`)
    }
    expect(screen.deeds.length).toBeGreaterThan(0)
    const open = screen.deeds.filter((one) => one.can)
    console.log(`доступно прямо сейчас: ${open.length} из ${screen.deeds.length}`)
    expect(open.length).toBeGreaterThan(0)

    // И оно в самом деле исполняется.
    const first = open[0]
    if (!first) return
    const done = applyCommand(ready, first.command)
    console.log(`${first.label}: ${done.ok ? 'сделано' : `нельзя — ${done.message}`}`)
    expect(done.ok).toBe(true)
  })

  it('экран роста стоит в ряду прочих экранов власти', () => {
    const screens = powerScreens(ruler(), world)
    console.log(`экраны: ${screens.map((one) => one.title).join(', ')}`)
    expect(screens.some((one) => one.id === 'growth')).toBe(true)
  })
})
