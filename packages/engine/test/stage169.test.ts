import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { LIEGE, TROUBLE_DEFS } from '../src/content/liege'
import { vassalsOf } from '../src/court'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import {
  askOpen,
  bargainFor,
  heirMemory,
  letterFrom,
  liegeRoll,
  lordLifeOf,
  loyaltySays,
  troubleDrift,
} from '../src/liege'
import { createRng } from '../src/rng'
import { SCHEMA_VERSION } from '../src/state'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import type { Lord } from '../src/war'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 169: вассал как человек.
 *
 * С 0.6 у него есть имя, нрав, годы и верность, с 0.7 — присяга с условиями.
 * Не хватало его собственной жизни: он не судился с соседом, не беднел, не
 * растил сына и ничего не просил — и оставался строкой «верность 62».
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

/** Держава с тремя вассалами: лорды короны переписаны под руку игрока. */
function liege(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 60000 }), 1, world)
  const theirs = politics.lords.filter((one) => one.kingdomId !== null).slice(0, 3)
  const mine = theirs.map((one) => ({ ...one, kingdomId: PLAYER }))
  const lords: Lord[] = politics.lords.map((one) => mine.find((row) => row.id === one.id) ?? one)
  const map = { ...settlements }
  const oaths: Record<string, never> = {}
  return {
    ...game,
    politics: { ...politics, lords },
    settlements: map,
    time: WORLD_START,
    quarter: null,
    realm: { name: 'Заречье', sinceDay: 1 },
    oaths: {
      ...oaths,
      ...Object.fromEntries(
        mine.map((one) => [
          one.id,
          { gives: 'both', share: 0.3, justice: false, levy: 0.5, sinceDay: 1 },
        ]),
      ),
    },
  } as GameState
}

function ok(result: ReturnType<typeof applyCommand>): GameState {
  if (!result.ok) throw new Error(result.message)
  return result.state
}

describe('Вл1 и Вл2: у него своя жизнь, и он о ней пишет', () => {
  it('беды выводятся из его земли, а письмо — из самой больной', () => {
    const state = liege()
    const day = 400
    const mine = vassalsOf(state)
    expect(mine.length).toBe(3)
    for (const lord of mine) {
      const life = lordLifeOf(state, world, lord, day)
      console.log(life.says)
      const letter = letterFrom(state, world, lord, day)
      if (letter) console.log(`  ${letter.says}`)
    }
    const troubled = mine.filter((one) => lordLifeOf(state, world, one, day).troubles.length > 0)
    expect(troubled.length).toBeGreaterThan(0)
    // Беды считаются, а не хранятся: то же состояние — те же беды.
    const first = mine[0] as Lord
    expect(lordLifeOf(state, world, first, day).troubles).toEqual(
      lordLifeOf(state, world, first, day).troubles,
    )
    // И они тянут верность, пока стоят.
    if (lordLifeOf(state, world, first, day).troubles.length > 0) {
      expect(troubleDrift(state, world, first, day)).toBeLessThanOrEqual(0)
    }
  })

  it('письмо доходит тактом, а ответ стоит своего', () => {
    let state = liege()
    for (let i = 0; i < 40; i += 1) {
      state = ok(applyCommand(state, { type: 'rest', hours: 12 }))
      state = ok(applyCommand(state, { type: 'rest', hours: 12 }))
    }
    const waiting = Object.keys(state.lordAsks ?? {})
    console.log(`писем пришло: ${waiting.length}`)
    expect(waiting.length).toBeGreaterThan(0)
    const lordId = waiting[0] as string
    const before = state.politics.lords.find((one) => one.id === lordId)?.loyalty ?? 0
    const asked = askOpen(state, lordId)
    console.log(`просит: ${asked ? TROUBLE_DEFS[asked.trouble].asks : '—'}`)
    const after = ok(applyCommand(state, { type: 'answerLord', lordId, answer: 'yes' }))
    const now = after.politics.lords.find((one) => one.id === lordId)?.loyalty ?? 0
    console.log(
      `верность ${Math.round(before)} → ${Math.round(now)}; письмо закрыто: ${askOpen(after, lordId) === null}`,
    )
    expect(now).toBeGreaterThan(before)
    expect(askOpen(after, lordId)).toBe(null)
  })
})

describe('Вл3 и Вл4: верность объяснена, присяга обсуждаема', () => {
  it('вместо «верность 62» — счёт того, что между вами было', () => {
    const state = liege()
    const lord = vassalsOf(state)[0] as Lord
    const says = loyaltySays(state, world, lord, 400)
    console.log(says)
    expect(says).toContain('верность')
    expect(says.length).toBeGreaterThan(40)
  })

  it('суд, доля подати и число людей — предмет торга', () => {
    const state = liege()
    const lord = vassalsOf(state)[0] as Lord
    const deal = bargainFor(state, lord, 'justice')
    console.log(deal.says)
    expect(deal.accepts).toBe(true)
    const after = ok(
      applyCommand(state, { type: 'bargainOath', lordId: lord.id, gives: 'justice' }),
    )
    expect(after.oaths?.[lord.id]?.justice).toBe(true)
    const now = after.politics.lords.find((one) => one.id === lord.id)?.loyalty ?? 0
    console.log(`после уступки суда: верность ${Math.round(lord.loyalty)} → ${Math.round(now)}`)
    expect(now).toBeGreaterThan(lord.loyalty)
    // Дважды одно и то же не уступают.
    expect(
      bargainFor(after, after.politics.lords.find((one) => one.id === lord.id) as Lord, 'justice')
        .accepts,
    ).toBe(false)
  })
})

describe('Вл5 и Вл6: сын помнит, и вассалы считаны', () => {
  it('наследник помнит, как ты обошёлся с отцом', () => {
    const state = liege()
    const lord = vassalsOf(state)[0] as Lord
    const empty = heirMemory(state, lord.id)
    console.log(empty.says)
    expect(empty.deeds).toHaveLength(0)
    const remembered: GameState = { ...state, lordDeeds: { [lord.id]: ['robbed', 'served'] } }
    const memory = heirMemory(remembered, lord.id)
    console.log(memory.says)
    expect(memory.deeds.length).toBe(2)
    expect(LIEGE.heirKeeps).toBeLessThan(1)
  })

  it('вассалы в числах: сколько с бедой и сколько ждут ответа', () => {
    const state = liege()
    const rolled = liegeRoll(state, world, 400)
    console.log(rolled.says)
    expect(rolled.vassals).toBe(3)
    // Схема растёт с каждой версией: проверяется, что поле этого этапа
    // в ней уже есть, а не точное число — иначе следующий этап ломает
    // чужую проверку.
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(30)
  })
})
