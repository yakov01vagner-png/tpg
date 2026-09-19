import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { peopleAt } from '../src/people'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { speakersAt } from '../src/talk'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 71: интерфейс глубины.
 *
 * Каждый экран собирал своих людей сам: рынок — купцов, замок — двор, школа —
 * наставника. Человек выглядел по-разному в зависимости от того, с какой
 * стороны на него смотрят. Теперь список один: кто здесь есть, чем занят, как к
 * тебе и что о тебе помнит.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function at(locationId: string): GameState {
  const base = createGame(createCharacter({ name: 'Т', money: 500 }), 1, world)
  return {
    ...base,
    politics,
    settlements,
    locationId,
    quarter: null,
    time: WORLD_START,
  }
}

describe('У1: экран человека', () => {
  it('в большом месте один список собирает всех, кого прежде собирали по экранам', () => {
    const city = Object.values(world.locations)
      .filter((one) => (settlements[one.id]?.population ?? 0) > 4000)
      .sort(
        (a, b) => (settlements[b.id]?.population ?? 0) - (settlements[a.id]?.population ?? 0),
      )[0]
    expect(city).toBeDefined()
    if (!city) return
    const state = at(city.id)
    const people = peopleAt(state)
    const kinds = new Set(people.map((one) => one.kind))
    console.log(`${city.name}: ${people.length} человек — ${[...kinds].join(', ')}`)
    expect(people.length).toBeGreaterThan(4)
    // Купец, мастер и лекарь — те, к кому приходят по делу.
    expect(kinds.has('merchant')).toBe(true)
    expect(kinds.has('master')).toBe(true)
    // У каждого есть чем он занят, как к тебе и что говорит.
    for (const person of people) {
      expect(person.name.length).toBeGreaterThan(1)
      expect(person.about.length).toBeGreaterThan(2)
      expect(person.attitude.length).toBeGreaterThan(2)
    }
    // Имена не повторяются: один человек — одна карточка.
    expect(new Set(people.map((one) => one.id)).size).toBe(people.length)
  })

  it('в глуши людей нет, а отшельник — есть', () => {
    const wild = Object.values(world.locations).find(
      (one) => settlements[one.id] === undefined && one.archetype === 'wilds',
    )
    if (!wild) return
    const empty = peopleAt(at(wild.id))
    console.log(
      `${wild.name}: ${empty.map((one) => `${one.name} (${one.about})`).join(', ') || 'никого'}`,
    )
    // В глуши бывает только тот, кто там живёт: отшельник да мастер своего
    // промысла, если этой земле есть чем кормить.
    for (const one of empty) expect(['hermit', 'master']).toContain(one.kind)
  })

  it('свой управляющий появляется там, где земля твоя', () => {
    const village = Object.values(world.locations).find((one) => one.archetype === 'village')
    if (!village) return
    const before = peopleAt(at(village.id))
    expect(before.some((one) => one.kind === 'seneschal')).toBe(false)
    const settlement = settlements[village.id]
    if (!settlement) return
    const mine: GameState = {
      ...at(village.id),
      settlements: { ...settlements, [village.id]: { ...settlement, owner: PLAYER } },
    }
    const after = peopleAt(mine)
    const seneschal = after.find((one) => one.kind === 'seneschal')
    console.log(`${village.name}: ${seneschal?.name} — ${seneschal?.about}`)
    expect(seneschal).toBeDefined()
  })
})

describe('список людей и список собеседников — об одном мире', () => {
  it('с кем говорят, того и видно на экране людей', () => {
    const city = Object.values(world.locations)
      .filter((one) => (settlements[one.id]?.population ?? 0) > 3000)
      .sort(
        (a, b) => (settlements[b.id]?.population ?? 0) - (settlements[a.id]?.population ?? 0),
      )[0]
    if (!city) return
    const state = at(city.id)
    const people = new Set(peopleAt(state).map((one) => one.id))
    const speakers = speakersAt(state)
    const missing = speakers.filter((one) => !people.has(one.id))
    console.log(`собеседников ${speakers.length}, из них нет в списке людей ${missing.length}`)
    // Все, с кем можно говорить, есть и в списке людей.
    expect(missing).toHaveLength(0)
  })
})
