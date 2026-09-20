import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { RUMOUR } from '../src/content/spies'
import { TIDINGS } from '../src/content/tidings'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { knownTo, wordsTo } from '../src/known'
import { strengthOf } from '../src/mind'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { caresAbout, sourceBetween, theyThink, tidingsAt, tidingsRoll } from '../src/tidings'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 164: короны видят друг друга.
 *
 * Слой знания 0.8 работал в одну сторону: вести заводил игрок, а за его спиной
 * короны смотрели на мир догадкой — она не старела, не ходила по карте и не
 * бывала чужой ошибкой. Здесь вести ходят сами, тем же слоем и тем же `words`.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)

function ruler(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
  const taken = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, 4)
  const map = { ...settlements }
  for (const one of taken) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    politics,
    settlements: map,
    time: WORLD_START,
    locationId: taken[0]?.locationId ?? game.locationId,
    quarter: null,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

function ok(result: ReturnType<typeof applyCommand>): GameState {
  if (!result.ok) throw new Error(result.message)
  return result.state
}

describe('Зн1 и Зн2: вести ходят без игрока, и у каждой короны свои глаза', () => {
  it('короны узнают друг о друге тем же слоем, и точность зависит от того, кто принёс', () => {
    const state = ruler()
    const said = tidingsAt(state, world, TIDINGS.beat)
    for (const word of said.slice(0, 6)) {
      console.log(`${word.to} ← о ${word.about}: ${word.value} (${word.source})`)
    }
    expect(said.length).toBeGreaterThan(0)
    // Ни одна весть не адресована игроку: это мир говорит сам с собой.
    expect(said.every((one) => one.to !== PLAYER)).toBe(true)
    // Источники разные, и они берутся из положения, а не из кубика.
    const sources = new Set(said.map((one) => one.source))
    console.log(`источников вестей: ${[...sources].join(', ')}`)
    expect(sources.size).toBeGreaterThan(1)
    const watcher = kingdoms[0] as string
    const about = caresAbout(state, world, watcher, 1)
    expect(sourceBetween(state, world, watcher, about)).toBe(
      sourceBetween(state, world, watcher, about),
    )
  })
})

describe('Зн3 и Зн4: ошибка живёт и ходит по карте', () => {
  it('корона держится принесённого числа, а молва несёт его дальше', () => {
    const state = ruler()
    const day = TIDINGS.beat
    const said = tidingsAt(state, world, day)
    const heard: GameState = { ...state, words: [...(state.words ?? []), ...said] }
    const first = said[0]
    expect(first).toBeTruthy()
    if (!first) return
    const known = knownTo(heard, world, first.to, { kind: 'strength', about: first.about }, day)
    console.log(`${first.to} о ${first.about}: ${known.value} — ${known.says}`)
    expect(known.value).toBe(first.value)
    expect(known.source).toBe(first.source)
    // Решает корона по знанию, а не по правде.
    const думает = theyThink(heard, world, first.to, first.about, day)
    console.log(думает.says)
    expect(думает.from).toBe('words')
    // Через такт молва понесла то, во что уже поверили, соседу — с ошибкой.
    const next = tidingsAt(heard, world, day + TIDINGS.beat)
    const passed = next.filter((one) => one.id.startsWith('word:molva:'))
    for (const one of passed) console.log(`молва: ${one.to} ← о ${one.about}: ${one.value}`)
    expect(passed.length).toBeGreaterThan(0)
    expect(passed.every((one) => one.source === 'rumour')).toBe(true)
  })
})

describe('Зн5: игрок вмешивается в чужие пары', () => {
  it('пущенный слух ложится в счёт корон, а не только в отношения', () => {
    const state = ruler()
    const target = kingdoms[1] as string
    const after = ok(applyCommand(state, { type: 'spreadRumour', kingdomId: target }))
    const day = 1
    const truth = strengthOf(after, world, target, day).score
    const listener = kingdoms[0] as string
    const told = wordsTo(after, listener).filter((one) => one.about === target)
    console.log(
      `${listener} услышал о ${target}: ${told.map((one) => one.value).join(', ')} (на деле ${truth})`,
    )
    expect(told.length).toBeGreaterThan(0)
    expect(told[0]?.value).toBeLessThan(truth)
    expect(after.character.money).toBe(state.character.money - RUMOUR.cost)
    // И это меняет то, что они о нём думают, а не только их отношение.
    const думают = theyThink(after, world, listener, target, day)
    console.log(думают.says)
    expect(думают.value).toBeLessThan(truth)
  })
})

describe('Зн6: знание мира в числах', () => {
  it('за полгода вести расходятся, и часть решений идёт по неверной', () => {
    let state = ruler()
    for (let i = 0; i < 180; i += 1) {
      state = ok(applyCommand(state, { type: 'rest', hours: 12 }))
      state = ok(applyCommand(state, { type: 'rest', hours: 12 }))
    }
    const roll = tidingsRoll(state, world, 180)
    console.log(roll.says)
    expect(roll.between).toBeGreaterThan(0)
    expect(roll.words).toBeGreaterThan(0)
  })
})
