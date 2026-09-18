import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import type { Family } from '../src/dynasty'
import {
  NO_FAMILY,
  OLD_AGE,
  PRIME_AGE,
  START_AGE,
  ageOf,
  agedAttributes,
  birthDayFor,
  deathChance,
  heirCharacter,
  heirOf,
  maybeBirth,
} from '../src/dynasty'
import { createRng } from '../src/rng'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { DAYS_PER_YEAR } from '../src/time'
import { generateWorld } from '../src/world/generate'

const world = generateWorld(1)

describe('век человеческий', () => {
  it('герой начинает молодым, и возраст считается от дня рождения', () => {
    const game = createGame(createCharacter({ name: 'Вит' }), 1, world)
    expect(game.character.age).toBe(START_AGE)
    expect(ageOf(game.character.bornDay, 1)).toBe(START_AGE)
  })

  it('стареет тело, а не голова: сила уходит, разум остаётся', () => {
    const young = createCharacter({ name: 'Вит' }).attributes
    const old = agedAttributes(young, 62)
    expect(old.strength).toBeLessThan(young.strength)
    expect(old.agility).toBeLessThan(young.agility)
    expect(old.mind).toBe(young.mind)
    expect(old.will).toBe(young.will)
    // До расцвета ничего не отнимается.
    expect(agedAttributes(young, PRIME_AGE)).toEqual(young)
  })

  it('смерть приходит по возрасту, а не по расписанию', () => {
    expect(deathChance(40)).toBe(0)
    expect(deathChance(OLD_AGE)).toBeGreaterThan(0)
    expect(deathChance(80)).toBeGreaterThan(deathChance(OLD_AGE))
  })

  it('дети рождаются только в браке', () => {
    const [alone] = maybeBirth(NO_FAMILY, 500, createRng(1))
    expect(alone.children.length).toBe(0)

    const married: Family = {
      ...NO_FAMILY,
      spouse: { name: 'Мирава', lordId: null, kingdomId: null, sinceDay: 1 },
    }
    let family: Family = married
    let rng = createRng(3)
    for (let year = 1; year <= 12 && family.children.length === 0; year += 1) {
      const [next, afterRng] = maybeBirth(family, year * DAYS_PER_YEAR, rng)
      family = next
      rng = afterRng
    }
    expect(family.children.length).toBeGreaterThan(0)
  })

  it('наследует только выросший', () => {
    const family: Family = {
      ...NO_FAMILY,
      children: [
        { name: 'Ждана', bornDay: 1, heir: true },
        { name: 'Ратмир', bornDay: 3000, heir: false },
      ],
    }
    expect(heirOf(family, 1000)).toBeNull()
    expect(heirOf(family, 20 * DAYS_PER_YEAR)?.name).toBe('Ждана')
  })

  it('наследнику достаётся имя, но не слава и не умения отца', () => {
    const parent = createCharacter({ name: 'Вит', skills: { command: 9, trade: 6 } })
    const day = 40 * DAYS_PER_YEAR
    const heir = heirCharacter(
      parent,
      { name: 'Ратмир', bornDay: day - 18 * DAYS_PER_YEAR, heir: true },
      day,
    )
    expect(heir.name).toBe('Ратмир')
    expect(heir.age).toBe(18)
    expect(heir.level).toBe(1)
    expect(heir.skills.command.level).toBeLessThan(parent.skills.command.level)
    expect(heir.skills.command.level).toBeGreaterThan(0)
    expect(heir.magicRank).toBeNull()
  })

  it('старик умирает и без наследника игра кончается', () => {
    const base = createGame(createCharacter({ name: 'Старик' }), 1, world)
    // Рождён давно: к нынешнему дню ему далеко за восемьдесят.
    const old: GameState = {
      ...base,
      character: { ...base.character, bornDay: birthDayFor(1, 88), age: 88 },
    }
    let state = old
    for (let i = 0; i < 365 * 12 && !state.over; i += 1) {
      const result = applyCommand(state, { type: 'tick', minutes: 60 * 24 })
      if (!result.ok) break
      state = result.state
    }
    expect(state.over).toBe(true)
  })

  it('со взрослым наследником игра продолжается им', () => {
    const base = createGame(createCharacter({ name: 'Старик' }), 1, world)
    const day = 1
    const old: GameState = {
      ...base,
      character: {
        ...base.character,
        bornDay: birthDayFor(day, 88),
        age: 88,
        family: {
          ...base.character.family,
          children: [{ name: 'Ратмир', bornDay: birthDayFor(day, 30), heir: true }],
        },
      },
    }
    let state = old
    for (let i = 0; i < 365 * 12 && state.character.name === 'Старик'; i += 1) {
      const result = applyCommand(state, { type: 'tick', minutes: 60 * 24 })
      if (!result.ok) break
      state = result.state
    }
    expect(state.over).toBe(false)
    expect(state.character.name).toBe('Ратмир')
  })
})
