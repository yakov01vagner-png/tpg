import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { type Command, applyCommand } from '../src/commands'
import { KEY_ORDER, KEY_SHUFFLED } from '../src/content/keys'
import { type Settlement, createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { canonical, keyRoll, reordered, sameWorld, stableMark } from '../src/keys'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START, dayOf } from '../src/time'
import { offeredTo } from '../src/trial'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 208: порядок, который не плавает.
 *
 * Порядок ключей в словарях состояния — не данные: он такой, каким его
 * оставила запись. Всё, что решает по нему, решает по случайности, которой нет
 * в правилах.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function start(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, 6)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  const them = Object.keys(world.kingdoms)[0] as string
  return {
    ...game,
    politics: {
      ...politics,
      wars: [{ a: PLAYER, b: them, since: 100, reason: 'спор о марке' }],
      tributes: [{ from: them, to: PLAYER, perDay: 12, untilDay: 9000 }],
    },
    settlements: map,
    time: WORLD_START,
    locationId: mine[0]?.locationId ?? game.locationId,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

function nextFor(state: GameState, turn: number): Command {
  if (state.journey) return { type: 'tick', minutes: 6 * 60 }
  if (turn % 4 === 0) return { type: 'tick', minutes: 24 * 60 }
  const offers = offeredTo(state, world, dayOf(state.time)).filter((one) => one.command !== null)
  return offers[turn % Math.max(1, offers.length)]?.command ?? { type: 'tick', minutes: 8 * 60 }
}

/**
 * Цепь пишется по исходному состоянию и потом играется на перемешанном: иначе
 * сравнивались бы два разных набора ходов, а не два порядка ключей.
 */
function chain(from: GameState, length: number): readonly Command[] {
  const out: Command[] = []
  let state = from
  for (let i = 0; i < length; i += 1) {
    const command = nextFor(state, i)
    const result = applyCommand(state, command)
    if (result.ok) state = result.state
    out.push(command)
  }
  return out
}

function play(from: GameState, commands: readonly Command[]): GameState {
  let state = from
  for (const command of commands) {
    const result = applyCommand(state, command)
    if (result.ok) state = result.state
  }
  return state
}

describe('Пр1: приведённый вид не видит порядка', () => {
  it('перемешанные ключи дают тот же приведённый вид', () => {
    const state = start()
    const mixed = reordered(state, 4)
    // Порядок и правда сломан, а не оставлен как был.
    expect(Object.keys(mixed.settlements)).not.toEqual(Object.keys(state.settlements))
    // А суть — та же.
    expect(canonical(mixed)).toBe(canonical(state))
    expect(stableMark(mixed)).toBe(stableMark(state))
    console.log(keyRoll(state, 4).says)
  })
})

describe('Пр3–Пр5: мир от перемешивания не меняется', () => {
  it('одна цепь на пяти перемешиваниях даёт один мир', () => {
    const from = start()
    const links = chain(from, KEY_ORDER.chain)
    const straight = play(from, links)
    console.log(`прямой прогон: отпечаток ${stableMark(straight)} на ${links.length} командах`)
    for (let seed = 1; seed <= KEY_ORDER.shuffles; seed += 1) {
      const mixed = play(reordered(from, seed), links)
      const same = sameWorld(straight, mixed)
      if (!same.same) console.log(`зерно ${seed}: ${same.says}`)
      expect(same.same, `перемешивание ${seed}`).toBe(true)
    }
    console.log(sameWorld(straight, play(reordered(from, 1), links)).says)
  })

  it('перемешивание не меняет ни поток случайности, ни ход времени', () => {
    const from = start()
    const links = chain(from, 20)
    const straight = play(from, links)
    const mixed = play(reordered(from, 3), links)
    expect(mixed.rng.state).toBe(straight.rng.state)
    expect(mixed.time).toBe(straight.time)
    expect(mixed.character.money).toBe(straight.character.money)
  })
})

describe('Пр2, Пр4: сортировки полные, числа сравниваются числами', () => {
  it('равные в сортировке упорядочены явно, а не порядком ключей', () => {
    // Два поселения с одинаковым населением: если сортировка неполная, порядок
    // выдачи зависит от того, в каком порядке лежат ключи.
    const state = start()
    const ids = Object.keys(state.settlements).slice(0, 2)
    const same: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [ids[0] as string]: {
          ...(state.settlements[ids[0] as string] as Settlement),
          population: 900,
        },
        [ids[1] as string]: {
          ...(state.settlements[ids[1] as string] as Settlement),
          population: 900,
        },
      },
    }
    const straight = Object.values(same.settlements)
      .filter((one) => one.population === 900)
      .map((one) => one.locationId)
    const mixed = Object.values(reordered(same, 8).settlements)
      .filter((one) => one.population === 900)
      .map((one) => one.locationId)
    console.log(
      `равные при прямом порядке ${straight.join(', ')}, при перемешанном ${mixed.join(', ')}`,
    )
    // Порядок выдачи и правда плавает — потому мир и не должен на него смотреть.
    expect(new Set(straight)).toEqual(new Set(mixed))
    expect(stableMark(same)).toBe(stableMark(reordered(same, 8)))
  })
})

describe('Пр6: порядок в числах', () => {
  it('сколько словарей под присмотром и сколько ключей сошло с места', () => {
    const rolled = keyRoll(start(), 2)
    console.log(rolled.says)
    expect(rolled.watched).toBe(KEY_SHUFFLED.length)
    expect(rolled.moved).toBeGreaterThan(rolled.places / 2)
  })
})
