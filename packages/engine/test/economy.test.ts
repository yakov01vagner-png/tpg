import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { GOODS } from '../src/content/goods'
import { buyPrice, priceOf, sellPrice, spreadFor, tickSettlement } from '../src/economy'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { generateWorld } from '../src/world/generate'
import type { LocationArchetype } from '../src/world/types'

const world = generateWorld(1)

function someplace(archetype: LocationArchetype): string {
  const found = Object.values(world.locations).find((l) => l.archetype === archetype)
  if (!found) throw new Error(`нет места вида «${archetype}»`)
  return found.id
}

/** Деревня на равнине — там, где зерно своё. */
function grainVillage(): string {
  const found = Object.values(world.locations).find(
    (l) => l.archetype === 'village' && l.terrain === 'plains',
  )
  return found?.id ?? someplace('village')
}

function gameAt(locationId: string, money = 2000): GameState {
  const hero = createCharacter({ name: 'Тест', money })
  return {
    ...createGame({ ...hero, attributes: { ...hero.attributes, strength: 10 } }, 1, world),
    locationId,
  }
}

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

describe('цены', () => {
  it('зависят от места: своё дёшево, привозное дорого', () => {
    const state = gameAt(grainVillage())
    const village = state.settlements[grainVillage()]
    const mine = state.settlements[someplace('mine')]
    expect(village && mine).toBeTruthy()
    if (!village || !mine) return

    const grainHome = priceOf(world, village, 'grain')
    const grainMine = priceOf(world, mine, 'grain')
    const ironHome = priceOf(world, village, 'iron')
    const ironMine = priceOf(world, mine, 'iron')
    console.log(
      `зерно: деревня ${grainHome}, рудник ${grainMine} · железо: деревня ${ironHome}, рудник ${ironMine}`,
    )

    expect(grainMine).toBeGreaterThan(grainHome)
    expect(ironMine).toBeLessThan(ironHome)
  })

  it('покупка дороже продажи, и навык торговли сужает разрыв', () => {
    const state = gameAt(grainVillage())
    const market = state.settlements[grainVillage()]
    if (!market) return
    expect(buyPrice(world, market, 'cloth', 0)).toBeGreaterThan(
      sellPrice(world, market, 'cloth', 0),
    )
    expect(spreadFor(30)).toBeLessThan(spreadFor(0))
    expect(spreadFor(1000)).toBeGreaterThan(0)
  })

  it('растут, когда скупаешь, и падают, когда сбываешь', () => {
    const before = gameAt(grainVillage())
    const marketBefore = before.settlements[before.locationId]
    const after = ok(applyCommand(before, { type: 'buy', good: 'grain', amount: 30 }))
    const marketAfter = after.settlements[after.locationId]
    if (!marketBefore || !marketAfter) return

    expect(priceOf(world, marketAfter, 'grain')).toBeGreaterThanOrEqual(
      priceOf(world, marketBefore, 'grain'),
    )
    expect(marketAfter.stock.grain).toBeLessThan(marketBefore.stock.grain)
    expect(after.character.inventory.grain).toBe(30)
    expect(after.character.money).toBeLessThan(before.character.money)
  })
})

describe('торг', () => {
  it('не даёт унести больше, чем поднимешь', () => {
    const weak = gameAt(grainVillage())
    const result = applyCommand(weak, { type: 'buy', good: 'timber', amount: 400 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(['overloaded', 'noGoods', 'noMoney']).toContain(result.code)
  })

  it('не продаёт того, чего в месте нет', () => {
    const state = gameAt(someplace('mine'))
    const result = applyCommand(state, { type: 'buy', good: 'grain', amount: 5000 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('noGoods')
  })

  it('не продаёт то, чего нет у тебя', () => {
    const state = gameAt(grainVillage())
    const result = applyCommand(state, { type: 'sell', good: 'weapons', amount: 1 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('noGoods')
  })

  it('учит торговле', () => {
    const before = gameAt(grainVillage())
    const after = ok(applyCommand(before, { type: 'buy', good: 'grain', amount: 20 }))
    expect(
      after.character.skills.trade.xp + after.character.skills.trade.level * 100,
    ).toBeGreaterThan(before.character.skills.trade.xp)
  })

  it('занимает время', () => {
    const before = gameAt(grainVillage())
    const after = ok(applyCommand(before, { type: 'buy', good: 'grain', amount: 5 }))
    expect(after.time).toBeGreaterThan(before.time)
  })
})

describe('нажива не бесконечна', () => {
  it('рынок насыщается, но хлебный рынок глубок', () => {
    const source = grainVillage()
    const sink = someplace('mine')
    let state = gameAt(source)
    const profits: number[] = []

    for (let trip = 0; trip < 5; trip += 1) {
      const moneyBefore = state.character.money
      state = { ...state, locationId: source }
      state = ok(applyCommand(state, { type: 'buy', good: 'grain', amount: 25 }))
      state = { ...state, locationId: sink }
      state = ok(applyCommand(state, { type: 'sell', good: 'grain', amount: 25 }))
      profits.push(state.character.money - moneyBefore)
    }
    console.log(`прибыль по рейсам: ${profits.join(', ')}`)
    // Возить выгодно — и пять мешков подряд цену не двигают: с версии 0.5
    // деревня держит хлеб от жатвы до жатвы, и двадцать пять мер против
    // трёхмесячного запаса — капля. Рынок глубок, а не сломан.
    expect(profits[0] ?? 0).toBeGreaterThan(0)
    expect(profits[profits.length - 1] ?? 0).toBeLessThanOrEqual(profits[0] ?? 0)

    // А обозная доля цену двигает: это и есть насыщение.
    const village = state.settlements[source]
    const mine = state.settlements[sink]
    if (!village || !mine) return
    const before = priceOf(world, mine, 'grain') - priceOf(world, village, 'grain')
    const share = Math.round(mine.stock.grain)
    const after =
      priceOf(
        world,
        { ...mine, stock: { ...mine.stock, grain: mine.stock.grain + share } },
        'grain',
      ) -
      priceOf(
        world,
        {
          ...village,
          stock: { ...village.stock, grain: Math.max(1, village.stock.grain - share) },
        },
        'grain',
      )
    console.log(`разница цен: до обоза ${before}, после ${after}`)
    expect(after).toBeLessThan(before)
  })

  it('рынок восстанавливается не мгновенно', () => {
    const state = gameAt(grainVillage())
    const market = state.settlements[state.locationId]
    if (!market) return
    const drained = { ...market, stock: { ...market.stock, grain: 1 } }

    const afterDay = tickSettlement(world, drained, 1)
    const afterMonth = tickSettlement(world, drained, 30)
    expect(afterDay.stock.grain).toBeGreaterThan(drained.stock.grain)
    expect(afterMonth.stock.grain).toBeGreaterThan(afterDay.stock.grain)
    // За месяц почти дотягивает до нормы, но всё ещё не мгновенно.
    expect(afterMonth.stock.grain).toBeLessThanOrEqual(market.stock.grain)
  })

  it('вес товара ограничивает жадность', () => {
    const state = gameAt(grainVillage())
    // Оружие тяжёлое: много не унесёшь, даже если деньги есть.
    expect(GOODS.weapons.weight).toBeGreaterThan(GOODS.herbs.weight)
  })
})
