import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { type Command, applyCommand } from '../src/commands'
import { REPLAY } from '../src/content/replay'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { fingerprint, firstDifference, replayOf, replayRoll } from '../src/replay'
import { createRng } from '../src/rng'
import { deserialize, serialize } from '../src/save'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START, dayOf } from '../src/time'
import { offeredTo } from '../src/trial'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 206: один сейв — один мир.
 *
 * Правило №4 обещало повтор, но проверялось оно на отдельных тактах. За 1.0 в
 * такт вошли четыре подсказки со стороны, и каждая была новой возможностью
 * утечь.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

/** Держава со всем, чем 1.0 нагрузила такт: война, союз, дань, двор. */
function start(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
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
      alliances: [
        { a: PLAYER, b: Object.keys(world.kingdoms)[1] as string, since: 50, byMarriage: true },
      ],
      tributes: [{ from: them, to: PLAYER, perDay: 12, untilDay: 9000 }],
    },
    settlements: map,
    time: WORLD_START,
    locationId: mine[0]?.locationId ?? game.locationId,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

/**
 * Цепь команд пишется так же, как её пишет игра: по состоянию, а не наугад.
 *
 * Цепь из отказов повтора не доказывает — она доказывает только, что отказы
 * повторяются. Поэтому команда каждый раз берётся исполнимая: в пути — ждать,
 * на месте — работать, расспрашивать и идти дальше.
 */
function chain(from: GameState, length: number): readonly Command[] {
  const out: Command[] = []
  let state = from
  for (let i = 0; i < length; i += 1) {
    const command = nextFor(state, i)
    const result = applyCommand(state, command)
    if (result.ok) state = result.state
    else if (process.env.TPG_DEBUG) console.log(`отказ ${command.type}: ${result.message}`)
    out.push(command)
  }
  return out
}

function nextFor(state: GameState, turn: number): Command {
  if (state.journey) return { type: 'tick', minutes: 6 * 60 }
  // Каждый четвёртый ход — просто время: мир должен идти, а не только герой.
  if (turn % 4 === 0) return { type: 'tick', minutes: 24 * 60 }
  // Остальные берутся из того же, что игра предлагает игроку (этап 205): она
  // предлагает исполнимое, и цепь выходит из дел, а не из отказов.
  const offers = offeredTo(state, world, dayOf(state.time)).filter((one) => one.command !== null)
  const chosen = offers[turn % Math.max(1, offers.length)]
  return chosen?.command ?? { type: 'tick', minutes: 8 * 60 }
}

describe('Пв1, Пв3: повтор насквозь, со всеми подсказками такта', () => {
  it('сто команд дважды дают побайтно одно состояние', () => {
    const from = start()
    const links = chain(from, REPLAY.chain)
    const first = replayOf(from, links)
    const second = replayOf(from, links)
    const rolled = replayRoll(first, second)
    console.log(rolled.says)
    const parted = firstDifference(first.state, second.state)
    if (parted) console.log(parted.says)
    expect(rolled.parted).toBe(null)
    // Цепь исполнимая: повтор отказов ничего не доказывает.
    expect(first.refused).toBeLessThan(REPLAY.chain / 10)
    expect(serialize(first.state)).toBe(serialize(second.state))
    expect(fingerprint(first.state)).toBe(fingerprint(second.state))
    // Цепь и правда что-то сделала: повтор пустоты ничего не доказывает.
    expect(first.marks[0]).not.toBe(first.marks[first.marks.length - 1])
  })
})

describe('Пв2: запись посередине ничего не меняет', () => {
  it('сейв, поднятый на середине цепи, продолжается тем же миром', () => {
    const from = start()
    const links = chain(from, REPLAY.chain)
    const whole = replayOf(from, links)
    const head = replayOf(from, links.slice(0, REPLAY.savesAt))
    const written = deserialize(serialize(head.state))
    expect(written.ok).toBe(true)
    if (!written.ok) return
    const tail = replayOf(written.state, links.slice(REPLAY.savesAt))
    const parted = firstDifference(whole.state, tail.state)
    if (parted) console.log(parted.says)
    console.log(
      `цепь ${links.length}, запись на ${REPLAY.savesAt}-й: отпечаток ${fingerprint(whole.state)} против ${fingerprint(tail.state)}`,
    )
    expect(parted).toBe(null)
  })
})

describe('Пв4: расхождение называется', () => {
  it('видно поле, а не только сам факт', () => {
    const from = start()
    const other: GameState = { ...from, character: { ...from.character, money: 39999 } }
    const found = firstDifference(from, other)
    console.log(found?.says)
    expect(found?.path).toBe('character.money')
    expect(found?.mine).toBe('40000')
    expect(found?.theirs).toBe('39999')
    // Поле, появившееся только с одной стороны, — тоже расхождение.
    const extra: GameState = { ...from, realm: null }
    expect(firstDifference(from, extra)?.path).toContain('realm')
  })

  it('видно, на каком ходу цепь разошлась', () => {
    const from = start()
    const links = chain(from, 20)
    const mine = replayOf(from, links)
    const theirs = replayOf({ ...from, character: { ...from.character, money: 39999 } }, links)
    const rolled = replayRoll(mine, theirs)
    console.log(rolled.says)
    expect(rolled.parted).toBe(0)
  })
})

describe('Пв5: часы машины в мир не входят', () => {
  it('в ядре нет ни случайности снаружи, ни времени снаружи', () => {
    const found: string[] = []
    const look = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = `${dir}/${entry.name}`
        if (entry.isDirectory()) {
          look(full)
          continue
        }
        if (!entry.name.endsWith('.ts')) continue
        // `replay.ts` меряет повтор, а не мир: отпечаток берут и до, и после.
        const text = readFileSync(full, 'utf8')
        for (const bad of ['Math.random', 'Date.now', 'performance.now', 'new Date(']) {
          if (text.includes(bad)) found.push(`${full}: ${bad}`)
        }
      }
    }
    look('packages/engine/src')
    for (const one of found) console.log(one)
    expect(found).toEqual([])
  })
})

describe('Пв6: повтор в числах', () => {
  it('длина цепи, число сверок, размер расхождения', () => {
    const from = start()
    const links = chain(from, REPLAY.chain)
    const rolled = replayRoll(replayOf(from, links), replayOf(from, links))
    console.log(rolled.says)
    expect(rolled.length).toBe(REPLAY.chain)
    expect(rolled.checks).toBe(REPLAY.chain)
    expect(rolled.parted).toBe(null)
  })
})
