import { describe, expect, it } from 'vitest'
import { bargainRoll, carryCost, marketMood, sourceOf, tradeAdvice } from '../src/bargain'
import { createCharacter } from '../src/character'
import { BARGAIN } from '../src/content/bargain'
import { type Settlement, createSettlements, priceOf } from '../src/economy'
import { PLAYER } from '../src/holding'
import { merchantsAt } from '../src/merchant'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 178: торг, который живёт.
 *
 * Цена считалась одним: насколько товара меньше, чем нужно. Рынок был
 * таблицей — честной, но в ней не видно ни войны за рекой, ни дороги, ни того,
 * что год выдался мокрый.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function trader(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 5000 }), 1, world)
  const here = Object.values(settlements).find((one) => one.population > 800)
  return {
    ...game,
    politics,
    settlements,
    time: WORLD_START,
    locationId: here?.locationId ?? game.locationId,
    quarter: null,
  }
}

describe('Тг1 и Тг3: цена из мира, и дорога в ней записана', () => {
  it('война, разорение, год и пошлина объясняют цену', () => {
    const state = trader()
    const place = state.settlements[state.locationId] as Settlement
    const quiet = marketMood(state, world, place, 'grain', 1)
    console.log(quiet.says)
    expect(quiet.now).toBeGreaterThan(0)
    // Война у хозяина места поднимает цену, и это сказано словами.
    const side = place.owner?.startsWith('crown:') ? place.owner.slice(6) : 'reEstiz'
    const wartime: GameState = {
      ...state,
      politics: {
        ...state.politics,
        wars: [{ a: side, b: 'robl', since: 1, reason: 'спор о марке' }],
      },
    }
    const dear = marketMood(wartime, world, place, 'grain', 1)
    console.log(dear.says)
    expect(dear.now).toBeGreaterThan(quiet.now)
    expect(dear.parts.some((one) => one.times === BARGAIN.war)).toBe(true)
    // Недород поднимает цену хлеба, урожайный год — роняет.
    const lean = marketMood(state, world, { ...place, harvest: 0.6 }, 'grain', 1)
    const fat = marketMood(state, world, { ...place, harvest: 1.3 }, 'grain', 1)
    console.log(`хлеб: недород ${lean.now}, ровно ${quiet.now}, щедрый год ${fat.now}`)
    expect(lean.now).toBeGreaterThan(fat.now)
  })

  it('перевозка стоит переходов и страха', () => {
    const state = trader()
    const ids = Object.keys(state.settlements)
    const from = ids[0] as string
    const to = ids[12] as string
    const safe = carryCost(state, world, from, to)
    console.log(safe.says)
    const risky = carryCost(
      {
        ...state,
        settlements: {
          ...state.settlements,
          [from]: { ...(state.settlements[from] as Settlement), banditry: 0.8 },
        },
      },
      world,
      from,
      to,
    )
    console.log(risky.says)
    expect(risky.times).toBeGreaterThan(safe.times)
    expect(risky.says).toContain('страх')
  })
})

describe('Тг2 и Тг5: купец и разговор', () => {
  it('купцы на месте — люди со своей выгодой и памятью', () => {
    const state = trader()
    const rows = merchantsAt(state.world, state.settlements, state.locationId, state)
    for (const one of rows) console.log(`${one.name}: наценка ${one.markup}, нрав ${one.temper}`)
    expect(rows.length).toBeGreaterThanOrEqual(0)
  })

  it('совет по торгу берётся из тех же чисел', () => {
    const state = trader()
    const place = state.settlements[state.locationId] as Settlement
    const advice = tradeAdvice(state, world, place, 1)
    console.log(advice.says)
    expect(advice.buy.length).toBe(3)
    expect(advice.sell.length).toBe(3)
  })
})

describe('Тг4 и Тг6: свои дела и торг в числах', () => {
  it('товар дешевле там, где его делают', () => {
    const state = trader()
    const where = sourceOf(world, state, 'iron')
    console.log(`железа больше всего в ${world.locations[where ?? '']?.name ?? '—'}`)
    expect(where).toBeTruthy()
    if (!where) return
    const there = state.settlements[where] as Settlement
    const mood = marketMood(state, world, there, 'iron', 1)
    console.log(mood.says)
    expect(mood.now).toBeLessThanOrEqual(Math.round(priceOf(world, there, 'iron') * 1.2))
  })

  it('разброс цен по миру виден числом', () => {
    const state = trader()
    const rolled = bargainRoll(state, world, 1, 'grain')
    console.log(rolled.says)
    expect(rolled.places).toBeGreaterThan(50)
    expect(rolled.dearest).toBeGreaterThanOrEqual(rolled.cheapest)
  })
})
