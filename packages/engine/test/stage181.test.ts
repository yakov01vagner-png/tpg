import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { TAX_DEFS } from '../src/content/estate'
import { WRIT } from '../src/content/writ'
import { type Settlement, createSettlements } from '../src/economy'
import { lawOf } from '../src/estate'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { changeCost, lawSays, lawSides, obeyedAll, obeyedAt, writRoll } from '../src/writ'

/**
 * Этап 181: закон, который применяют.
 *
 * Закон был четырьмя ползунками: поставил — и он действует везде одинаково.
 * Никто не сопротивлялся, ничего не стоило переменить, и обычай земли ничего не
 * значил.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function ruler(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 9000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, 5)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    politics,
    settlements: map,
    time: WORLD_START,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

function ok(result: ReturnType<typeof applyCommand>): GameState {
  if (!result.ok) throw new Error(result.message)
  return result.state
}

describe('Зк1 и Зк5: у правила две стороны, и они названы', () => {
  it('всякое правило говорит, что даёт и чего стоит', () => {
    const state = ruler()
    const sides = lawSides(lawOf(state))
    for (const one of sides)
      console.log(`${one.rule} — ${one.is}: даёт ${one.gives}; стоит ${one.costs}`)
    expect(sides).toHaveLength(4)
    for (const one of sides) {
      expect(one.gives.length).toBeGreaterThan(3)
      expect(one.costs.length).toBeGreaterThan(20)
    }
  })

  it('и видно, что закон делает с жизнью места', () => {
    const state = ruler()
    const place = Object.values(state.settlements).find((one) => one.owner === PLAYER) as Settlement
    const says = lawSays(state, world, place.locationId)
    console.log(says)
    expect(says).toContain('из ста')
  })
})

describe('Зк2 и Зк4: закон встречает сопротивление', () => {
  it('грамота, сход и обиженный вассал исполняют указ хуже', () => {
    const state = ruler()
    const place = Object.values(state.settlements).find((one) => one.owner === PLAYER) as Settlement
    const plain = obeyedAt(state, world, place.locationId, 'tax')
    console.log(
      `${world.locations[place.locationId]?.name}: ${Math.round(plain.share * 100)} из ста — ${plain.why}`,
    )
    const chartered: GameState = {
      ...state,
      charters: { [place.locationId]: { since: 1 } } as never,
    }
    const withCharter = obeyedAt(chartered, world, place.locationId, 'tax')
    console.log(`с грамотой: ${Math.round(withCharter.share * 100)} из ста — ${withCharter.why}`)
    expect(withCharter.share).toBeLessThan(plain.share)
    expect(WRIT.chartered).toBeLessThan(1)
    // По всей земле это складывается в одно число.
    const all = obeyedAll(state, world, 'tax')
    console.log(all.says)
    expect(all.share).toBeGreaterThan(0)
  })
})

describe('Зк3 и Зк6: перемена закона — событие, и закон считан', () => {
  it('у перемены есть те, кто за, и те, кто против', () => {
    const state = ruler()
    const before = lawOf(state)
    const harder = changeCost(state, world, before, { ...before, tax: 'heavy' })
    console.log(harder.says)
    expect(harder.steps).toBe(1)
    expect(harder.against.length).toBeGreaterThan(0)
    expect(harder.forIt.length).toBeGreaterThan(0)
    expect(harder.memory).toBeLessThan(0)
    const softer = changeCost(state, world, before, { ...before, tax: 'light' })
    console.log(softer.says)
    expect(softer.memory).toBeGreaterThan(0)
    expect(TAX_DEFS.heavy.take).toBeGreaterThan(TAX_DEFS.light.take)
  })

  it('и всё это доходит до игрока, когда он меняет закон', () => {
    const state = ruler()
    const after = ok(applyCommand(state, { type: 'setLaw', tax: 'heavy' }))
    const said = after.log.map((one) => one.text)
    for (const line of said.slice(-3)) console.log(line)
    expect(said.some((one) => one.includes('Против'))).toBe(true)
    expect(after.law?.tax).toBe('heavy')
  })

  it('закон в числах', () => {
    const state = ruler()
    const rolled = writRoll(state, world)
    console.log(rolled.says)
    expect(rolled.places).toBe(5)
    expect(rolled.tax).toBeGreaterThan(0)
  })
})
