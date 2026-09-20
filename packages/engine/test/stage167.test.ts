import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { type Companion, hireCompanion } from '../src/companion'
import { COMPANIONS } from '../src/content/companions'
import { KITH, KITH_ASK_DEFS } from '../src/content/kith'
import { createSettlements } from '../src/economy'
import {
  askOf,
  kithAge,
  kithAsks,
  kithRoll,
  kithSays,
  kithYears,
  vowsDue,
  vowsOf,
  whoGoes,
} from '../src/kith'
import { createRng } from '../src/rng'
import { SCHEMA_VERSION } from '../src/state'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 167: спутники, у которых своя жизнь.
 *
 * С 0.2 у спутника есть нрав, дело и расположение: он смотрит на твои поступки
 * и уходит, если насмотрелся. Не хватало того, что делает человека человеком, —
 * он ничего не просил вслух. Здесь он говорит: просит долю, место, помощи
 * своему делу или отпустить, помнит обещанное и стареет.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function withKith(money = 8000, since = 1): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money }), 1, world)
  const ids = Object.keys(COMPANIONS).slice(0, 3)
  const companions: Companion[] = ids.map((id) => ({
    ...hireCompanion(COMPANIONS[id] as never, since),
    since,
  }))
  return {
    ...game,
    politics,
    settlements,
    time: WORLD_START,
    quarter: null,
    companions,
  }
}

function ok(result: ReturnType<typeof applyCommand>): GameState {
  if (!result.ok) throw new Error(result.message)
  return result.state
}

describe('Сп1 и Сп3: у него своё, и он об этом говорит', () => {
  it('просьба выводится из лет службы, дела и денег хозяина', () => {
    const state = withKith()
    const day = 1 + 365 * 4
    const asks = kithAsks(state, world, day)
    for (const one of asks) console.log(one.says)
    expect(asks.length).toBeGreaterThan(0)
    // Пока он с тобой без году неделя, он не просит ничего.
    expect(kithAsks(state, world, 30)).toHaveLength(0)
    // Тот, у кого расположение на дне, просит одного — отпустить.
    const sour = {
      ...state,
      companions: state.companions.map((one) => ({ ...one, mood: KITH.leaveMood - 1 })),
    }
    const first = sour.companions[0] as Companion
    expect(askOf(sour, first, day)?.ask).toBe('leave')
  })

  it('ответ стоит своего: да, нет и «погоди» расходятся в числах', () => {
    const state = withKith(8000, 1)
    const who = (state.companions[0] as Companion).id
    const before = state.companions[0]?.mood ?? 0
    // Через год он просит помощи своему делу — это не деньгами, и это обещание.
    let later: GameState = { ...state, time: WORLD_START + 400 * 24 * 60 }
    const asked = askOf(later, later.companions[0] as Companion, 400)
    console.log(asked?.says)
    expect(asked).toBeTruthy()
    later = ok(applyCommand(later, { type: 'answerKith', companionId: who, answer: 'yes' }))
    const vows = vowsOf(later)
    console.log(
      `обещано: ${vows.map((one) => `${one.who} — ${one.ask} до ${one.untilDay}`).join('; ')}`,
    )
    expect(vows).toHaveLength(1)
    expect(later.companions[0]?.mood ?? 0).toBeGreaterThan(before)
    // Отказ стоит расположения — и он честнее пустого обещания.
    const refused = ok(
      applyCommand(later, {
        type: 'answerKith',
        companionId: (later.companions[1] as Companion).id,
        answer: 'no',
      }),
    )
    const second = refused.companions[1] as Companion
    console.log(`${second.name}: расположение ${state.companions[1]?.mood} → ${second.mood}`)
    expect(second.mood).toBeLessThan(state.companions[1]?.mood ?? 0)
  })
})

describe('Сп4 и Сп5: он помнит, стареет и уходит', () => {
  it('нарушенное слово помнится и объясняет уход', () => {
    const state = withKith()
    const who = (state.companions[0] as Companion).id
    const vows = [{ who, ask: 'place' as const, day: 100, untilDay: 200 }]
    const due = vowsDue(vows, 400)
    expect(due.broken).toHaveLength(1)
    const sour: GameState = {
      ...state,
      vows: due.vows,
      companions: state.companions.map((one) =>
        one.id === who ? { ...one, mood: KITH.leaveMood - 5 } : one,
      ),
    }
    const says = kithSays(sour, sour.companions[0] as Companion, 400)
    console.log(says)
    expect(says).toContain('Нарушено')
    const going = whoGoes(sour, world, 400)
    console.log(`уходят: ${going.map((one) => `${one.who.name} — ${one.why}`).join('; ')}`)
    expect(going.some((one) => one.who.id === who)).toBe(true)
  })

  it('годы берут своё: взятый молодым к старости просится на покой', () => {
    const state = withKith()
    const one = state.companions[0] as Companion
    const young = kithAge(one, 1)
    const old = kithAge(one, 1 + 365 * 25)
    console.log(`${one.name}: ${young} лет при найме, ${old} через двадцать пять лет службы`)
    expect(old).toBe(young + 25)
    expect(kithYears(one, 1 + 365 * 25)).toBeCloseTo(25, 0)
    const going = whoGoes(state, world, 1 + 365 * 25)
    console.log(`на покой: ${going.length} из ${state.companions.length}`)
    expect(going.length).toBeGreaterThan(0)
  })
})

describe('Сп6: спутники в числах', () => {
  it('видно, сколько с тобой, сколько просят и чего ты не сдержал', () => {
    const state = withKith()
    const day = 1 + 365 * 4
    const rolled = kithRoll(state, world, day)
    console.log(rolled.says)
    expect(rolled.with).toBe(3)
    expect(rolled.asking).toBeGreaterThan(0)
    expect(rolled.oldest).toBeGreaterThan(25)
    for (const ask of Object.values(KITH_ASK_DEFS)) {
      expect(ask.says.length).toBeGreaterThan(20)
      expect(ask.label.length).toBeGreaterThan(3)
    }
    expect(SCHEMA_VERSION).toBe(28)
  })
})
