import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { GOSSIP } from '../src/content/gossip'
import { createSettlements } from '../src/economy'
import type { Talk } from '../src/gossip'
import { alive, gossipLedger, gossipOf, heardAt, stepped, talkWords, twisted } from '../src/gossip'
import { PLAYER } from '../src/holding'
import { knownTo, spreadWords, truthOf, wordsTo } from '../src/known'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 101: молва.
 *
 * Третий источник знания: дешёвый, быстрый и почти всегда неточный. Молва ходит
 * по местам, искажается на каждом переходе, стихает сама — и иногда приносит то,
 * чего не принесёт никто.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const oneDay = (state: GameState): GameState =>
  ok(
    applyCommand(ok(applyCommand(state, { type: 'rest', hours: 12 })), {
      type: 'rest',
      hours: 12,
    }),
  )

function townsman(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 8000 }), 1, world)
  const here = Object.values(settlements)
    .filter((one) => one.population > 2000)
    .sort((a, b) => b.population - a.population)[0]
  return {
    ...game,
    politics,
    settlements,
    locationId: here?.locationId ?? game.locationId,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
  }
}

/** Чужое место подальше: о нём и будет молва. */
function faraway(state: GameState): string {
  const found = Object.values(state.settlements).find(
    (one) => one.locationId !== state.locationId && one.population > 400,
  )
  if (!found) throw new Error('нет места')
  return found.locationId
}

describe('М1 и М2: молва ходит и искажается', () => {
  it('шаг за шагом расходится по соседям, а число сдвигается', () => {
    const state = townsman()
    const about = faraway(state)
    const talk: Talk = {
      id: 'talk:test',
      kind: 'garrison' as const,
      about,
      value: 100,
      sooth: true,
      bornDay: day,
      places: [about],
      by: null,
    }
    let moved = talk
    const sizes: number[] = []
    const values: (number | string)[] = []
    for (let i = 1; i <= 4; i += 1) {
      moved = stepped(moved, world, day + i * GOSSIP.beat)
      sizes.push(moved.places.length)
      values.push(moved.value)
    }
    console.log(
      `молва о гарнизоне (${talkWords(talk)}): мест ${sizes.join(' → ')}, число ${values.join(' → ')}`,
    )
    expect(sizes[sizes.length - 1] ?? 0).toBeGreaterThan(1)
    expect(values[values.length - 1]).not.toBe(100)
    // Искажение считается, а не бросается: то же зерно — тот же сдвиг.
    expect(twisted(100, 3, 42)).toBe(twisted(100, 3, 42))
  })

  it('молва стихает сама', () => {
    const talk: Talk = {
      id: 'talk:old',
      kind: 'purse' as const,
      about: 'robl',
      value: 5000,
      sooth: false,
      bornDay: day,
      places: ['x'],
      by: null,
    }
    console.log(
      `живёт ${GOSSIP.livesDays} сут.: на ${GOSSIP.livesDays - 1}-е — ${alive(talk, day + GOSSIP.livesDays - 1)}, на ${GOSSIP.livesDays + 1}-е — ${alive(talk, day + GOSSIP.livesDays + 1)}`,
    )
    expect(alive(talk, day + GOSSIP.livesDays - 1)).toBe(true)
    expect(alive(talk, day + GOSSIP.livesDays + 1)).toBe(false)
  })
})

describe('М4: пустить молву', () => {
  it('своя молва уходит в мир и живёт сама', () => {
    const state = townsman()
    const about = faraway(state)
    const started = ok(
      applyCommand(state, { type: 'startTalk', kind: 'garrison', about, value: 300 }),
    )
    const mine = gossipOf(started)[0]
    console.log(
      `${started.log[started.log.length - 1]?.text ?? ''} Заплачено ${state.character.money - started.character.money}.`,
    )
    expect(mine?.by).toBe(PLAYER)
    expect(mine?.places).toContain(state.locationId)
    // Дважды об одном не пускают.
    expect(
      applyCommand(started, { type: 'startTalk', kind: 'garrison', about, value: 10 }).ok,
    ).toBe(false)
  })
})

describe('М3 и М5: зерно правды и проверка', () => {
  it('услышанное становится вестью, а проверка сводит его с правдой', () => {
    const state = townsman()
    const about = faraway(state)
    const truth = truthOf(state, world, { kind: 'garrison', about }, day)
    const heard: GameState = {
      ...state,
      gossip: [
        {
          id: 'talk:heard',
          kind: 'garrison',
          about,
          value: 250,
          sooth: false,
          bornDay: day - 1,
          places: [state.locationId],
          by: null,
        },
      ],
    }
    expect(heardAt(gossipOf(heard)[0] as never, state.locationId, day)).toBe(true)

    // С этапа 109 в вестях лежат и донесения о чужих войсках: ждём ту, что о месте.
    let run = heard
    for (
      let i = 0;
      i < 6 && wordsTo(run, PLAYER).filter((one) => one.about === about).length === 0;
      i += 1
    ) {
      run = oneDay(run)
    }
    const known = knownTo(run, world, PLAYER, { kind: 'garrison', about }, day + 6)
    console.log(`услышано на торгу: ${spreadWords(known)} — ${known.says}; на деле ${truth}`)
    expect(known.source).toBe('rumour')

    const checked = ok(applyCommand(run, { type: 'checkTalk', talkId: 'talk:heard' }))
    const after = knownTo(checked, world, PLAYER, { kind: 'garrison', about }, day + 10)
    console.log(
      `${checked.log[checked.log.length - 1]?.text ?? ''} Теперь знаешь: ${spreadWords(after)} (${after.source})`,
    )
    expect(after.source).toBe('own')
    expect(gossipOf(checked)[0]?.exposed).toBe(true)
    expect(alive(gossipOf(checked)[0] as never, day + 10)).toBe(false)
  })
})

describe('М6: молва в числах', () => {
  it('счёт по молве виден числом', () => {
    const state = townsman()
    const empty = gossipLedger(state, day)
    console.log(empty.says)
    const busy: GameState = {
      ...state,
      gossip: [
        {
          id: 'a',
          kind: 'host',
          about: 'b1',
          value: 'x',
          sooth: true,
          bornDay: day - 5,
          places: ['p'],
          by: null,
        },
        {
          id: 'b',
          kind: 'purse',
          about: 'robl',
          value: 10,
          sooth: false,
          bornDay: day - 5,
          places: ['p'],
          by: PLAYER,
        },
        {
          id: 'c',
          kind: 'stores',
          about: 'p',
          value: 3,
          sooth: false,
          bornDay: day - 5,
          places: ['p'],
          by: null,
          exposed: true,
        },
      ],
    }
    const ledger = gossipLedger(busy, day)
    console.log(ledger.says)
    expect(ledger.live).toBe(2)
    expect(ledger.mine).toBe(1)
    expect(ledger.exposed).toBe(1)
    expect(empty.live).toBe(0)
  })
})
