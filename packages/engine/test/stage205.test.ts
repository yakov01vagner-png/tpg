import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import { serialize } from '../src/save'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, dayOf } from '../src/time'
import { offeredTo, stuckAt, trialRoll, unclearIn } from '../src/trial'
import { createPolitics, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 205: проверка и итог версии.
 *
 * Живого человека подменить нельзя — но можно отнять у проверяющего всё, кроме
 * того, что игра сказала сама. Здесь прогон идёт только по предложенному, и
 * всякое место, где предложить нечего, записывается.
 */

function ms(work: () => void, times = 10): number {
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < times; i += 1) {
    const start = performance.now()
    work()
    best = Math.min(best, performance.now() - start)
  }
  return best
}

/**
 * Полчаса игры вслепую: ходов столько, сколько человек успевает за полчаса,
 * и ни одного хода, о котором игра не сказала сама.
 */
function blindRun(seed: number, name: string, money: number) {
  const world = generateWorld(seed)
  const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(seed))
  let state: GameState = {
    ...createGame(createCharacter({ name, money }), seed, world),
    politics,
    settlements,
  }
  const stalls: string[] = []
  const unclear = new Set<string>()
  let moves = 0
  for (let turn = 1; turn <= 60; turn += 1) {
    const day = dayOf(state.time)
    for (const one of unclearIn(state, world, day)) unclear.add(one)
    if (state.journey) {
      const waited = applyCommand(state, { type: 'tick', minutes: 6 * 60 })
      if (waited.ok) state = waited.state
      continue
    }
    const here = stuckAt(state, world, day)
    if (here.stuck) {
      stalls.push(here.says)
      const waited = applyCommand(state, { type: 'tick', minutes: 60 })
      if (!waited.ok) break
      state = waited.state
      continue
    }
    const offer = offeredTo(state, world, day).find((one) => one.command !== null)
    if (!offer?.command) break
    const result = applyCommand(state, offer.command)
    if (!result.ok) {
      // Предложили то, чего нельзя сделать: это тот же затык, только хуже.
      stalls.push(`${day} сут: «${offer.label}» — ${result.message}`)
      const waited = applyCommand(state, { type: 'tick', minutes: 60 })
      if (!waited.ok) break
      state = waited.state
      continue
    }
    state = result.state
    moves += 1
  }
  return { state, stalls, unclear: [...unclear], moves, world }
}

// Прогон дорог: считается один раз и читается дважды — как и живой сеанс.
const first = blindRun(1, 'Ратша', 60)

describe('Пр1–Пр2: прогон вслепую и список непонятного', () => {
  it('игрок, знающий только сказанное игрой, никуда не встаёт', () => {
    const run = first
    console.log(`ходов сделано ${run.moves}, затыков ${run.stalls.length}`)
    for (const one of run.stalls.slice(0, 5)) console.log(one)
    for (const one of run.unclear) console.log(`без причины: ${one}`)
    expect(run.moves).toBeGreaterThan(10)
    // Затык — это место, где игра ничего не предложила. Их быть не должно.
    expect(run.stalls).toEqual([])
    // И всякое предложенное объяснено: непонятного не осталось.
    expect(run.unclear).toEqual([])
  })
})

describe('Пр3–Пр4: второй прогон другим человеком', () => {
  it('другой мир и другой герой проходят так же', () => {
    const second = blindRun(7, 'Вышата', 200)
    console.log(`второй прогон: ходов ${second.moves}, затыков ${second.stalls.length}`)
    console.log(trialRoll(second.state, second.world, dayOf(second.state.time)).says)
    expect(second.moves).toBeGreaterThan(10)
    expect(second.stalls).toEqual([])
    expect(second.unclear).toEqual([])
  })
})

describe('Пр5: век и бюджет 1.0', () => {
  it('век мира считается, и сейв с тактом в границах', { retry: 2 }, () => {
    const world = generateWorld(1)
    const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(3))
    const century = performance.now()
    const ticked = tickPolitics(world, politics, settlements, 100 * DAYS_PER_YEAR, createRng(3))
    const spent = performance.now() - century
    const game: GameState = {
      ...createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world),
      politics: ticked.politics,
      settlements: ticked.settlements,
    }
    const raw = serialize(game)
    let current = game
    const day = ms(() => {
      const next = applyCommand(current, { type: 'tick', minutes: 24 * 60 })
      if (next.ok) current = next.state
    }, 20)
    console.log(
      `век за ${(spent / 1000).toFixed(1)} с: войн ${ticked.politics.wars.length}, союзов ${
        ticked.politics.alliances.length
      }, даней ${ticked.politics.tributes.length}; сейв ${(raw.length / 1024).toFixed(0)} КБ, сутки ${day.toFixed(2)} мс`,
    )
    // Век считается за минуту: столько человек готов ждать разовый прогон.
    expect(spent).toBeLessThan(60_000)
    expect(raw.length).toBeLessThan(1024 * 1024)
    expect(day * 5).toBeLessThan(100)
    // Мир за век пришёл к чему-то, а не замер.
    expect(
      ticked.politics.wars.length +
        ticked.politics.alliances.length +
        ticked.politics.tributes.length,
    ).toBeGreaterThan(0)
  })
})

describe('Пр6: итог версии', () => {
  it('каждая обязательная линия 1.0 отвечает числом', () => {
    const rolled = trialRoll(first.state, first.world, dayOf(first.state.time))
    console.log(rolled.says)
    // Дипломатия и ИИ — две обязательные линии всякой версии (правило версий).
    // Обе отвечают из состояния, а не из описания.
    expect(rolled.offers).toBeGreaterThan(0)
    expect(rolled.doable).toBeGreaterThan(0)
    expect(rolled.unclear).toBe(0)
  })
})
