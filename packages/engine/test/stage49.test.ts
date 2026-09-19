import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { GOODS } from '../src/content/goods'
import { MERCHANT_TEMPERS, ROWS } from '../src/content/merchants'
import { priceHistory } from '../src/market'
import {
  MERCHANT_POPULATION,
  dealingWith,
  haggle,
  merchantBuyPrice,
  merchantsAt,
  orderFrom,
  rowsAt,
  standingWord,
  talesOf,
} from '../src/merchant'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { MINUTES_PER_DAY, dayOf } from '../src/time'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 49: рынок как люди.
 *
 * Рынок 0.5 был таблицей: место, товар, цена. Теперь за прилавком стоит
 * человек — с именем, рядом, нравом, своей ценой и своей памятью о тебе.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const capital = world.kingdoms.reEstiz?.capitalId ?? ''
const village =
  Object.values(world.locations).find(
    (one) => one.archetype === 'village' && one.population < MERCHANT_POPULATION,
  )?.id ?? ''

function at(locationId: string, money = 5000): GameState {
  const base = createGame(createCharacter({ name: 'Т', money }), 1, world)
  return { ...base, locationId, quarter: 'market' }
}

describe('Р1 и Р5: купцы с именами, в своих рядах', () => {
  it('на рынке столицы пять купцов, у каждого имя, нрав, ряд и своя цена', () => {
    const state = at(capital)
    const merchants = merchantsAt(world, state.settlements, capital)
    console.log(
      merchants
        .map(
          (one) =>
            `${one.name} (${MERCHANT_TEMPERS[one.temper].label}, ${one.rowId}, ×${one.markup})`,
        )
        .join('; '),
    )
    expect(merchants.length).toBeGreaterThanOrEqual(4)
    expect(new Set(merchants.map((one) => one.name)).size).toBe(merchants.length)
    expect(new Set(merchants.map((one) => one.rowId)).size).toBe(merchants.length)
    // У каждого свой товар: два купца одного рынка не торгуют одним и тем же.
    const goods = merchants.flatMap((one) => one.goods)
    expect(new Set(goods).size).toBe(goods.length)
    // И своя цена: надбавки разные.
    expect(new Set(merchants.map((one) => one.markup)).size).toBeGreaterThan(1)
    // Ряды — от людности: в столице все, в городке не все.
    expect(rowsAt(world, state.settlements, capital).length).toBe(ROWS.length)
    const town = Object.values(world.locations).find(
      (one) => one.archetype === 'town' && one.population >= MERCHANT_POPULATION,
    )
    if (town) {
      const rows = rowsAt(world, state.settlements, town.id)
      expect(rows.length).toBeGreaterThan(0)
      expect(rows.length).toBeLessThan(ROWS.length)
    }
  })

  it('в деревне купцов нет: торгуют с воза, как раньше', () => {
    const state = at(village)
    expect(merchantsAt(world, state.settlements, village)).toHaveLength(0)
    const bought = applyCommand(state, { type: 'buy', good: 'grain', amount: 2 })
    expect(bought.ok, bought.ok ? '' : bought.message).toBe(true)
  })

  it('чужим товаром купец не торгует', () => {
    const state = at(capital)
    const grain = merchantsAt(world, state.settlements, capital).find(
      (one) => one.rowId === 'grain',
    )
    if (!grain) return
    const wrong = applyCommand(state, {
      type: 'buyFrom',
      merchantId: grain.id,
      good: 'weapons',
      amount: 1,
    })
    expect(wrong.ok).toBe(false)
    if (!wrong.ok) expect(wrong.message).toContain('ряд')
  })
})

describe('Р2: торг словом', () => {
  it('уступка держится до конца дня и только у этого купца', () => {
    const state = at(capital)
    const merchants = merchantsAt(world, state.settlements, capital)
    const merchant = merchants[0]
    const other = merchants[1]
    if (!merchant || !other) return
    const market = state.settlements[capital]
    if (!market) return
    const good = [...merchant.goods].sort(
      (a, b) => GOODS[b].basePrice - GOODS[a].basePrice,
    )[0] as 'grain'
    const before = merchantBuyPrice(world, market, merchant, good, 0, 0)

    // Торгуемся, пока не уступит: бросок живёт в состоянии, и каждый день он
    // другой. Больше раза в день с одним купцом не торгуются.
    let current = state
    let cut = 0
    for (let day = 0; day < 30 && cut === 0; day += 1) {
      const said = ok(
        applyCommand(current, { type: 'haggle', merchantId: merchant.id, push: 'firm' }),
      )
      cut = said.dealings?.[merchant.id]?.cut ?? 0
      current = cut > 0 ? said : ok(applyCommand(said, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    expect(cut).toBeGreaterThan(0)
    const dealing = dealingWith(current, merchant.id)
    expect(dealing.haggledDay).toBe(dayOf(current.time))
    const after = merchantBuyPrice(world, market, merchant, good, 0, dealing.standing, dealing.cut)
    console.log(`торг: было ${before}, стало ${after} (уступка ${Math.round(cut * 100)}%)`)
    expect(after).toBeLessThan(before)
    // Сосед по ряду об этом не знает.
    expect(dealingWith(current, other.id).cut ?? 0).toBe(0)
    // И второй раз за день тот же купец не торгуется.
    const again = applyCommand(current, { type: 'haggle', merchantId: merchant.id, push: 'soft' })
    expect(again.ok).toBe(false)
  })

  it('нахальный торг иногда обижает, мягкий — никогда', () => {
    const merchant = merchantsAt(world, at(capital).settlements, capital).find(
      (one) => MERCHANT_TEMPERS[one.temper].hold >= 0.7,
    )
    if (!merchant) return
    const outcomes = (push: 'soft' | 'bold') =>
      Array.from({ length: 21 }, (_, index) => haggle(merchant, 20, 0, push, index / 21).outcome)
    const bold = outcomes('bold')
    const soft = outcomes('soft')
    console.log(`из 21 захода нахально: обид ${bold.filter((one) => one === 'offend').length}`)
    expect(bold.filter((one) => one === 'offend').length).toBeGreaterThan(0)
    expect(soft.filter((one) => one === 'offend').length).toBe(0)
    // Обида — это память, а не отказ: она уходит в минус расположения.
    expect(haggle(merchant, 20, 0, 'bold', 0.999).standing).toBeLessThan(0)
  })
})

describe('Р3: заказы и подряды', () => {
  it('купец платит задаток вперёд, а сдачу принимает по имени', () => {
    const state = at(capital)
    const market = state.settlements[capital]
    if (!market) return
    const merchant = merchantsAt(world, state.settlements, capital).find((one) =>
      Boolean(orderFrom(world, market, one, dayOf(state.time))),
    )
    expect(merchant, 'никто ничего не просит').toBeDefined()
    if (!merchant) return
    const order = orderFrom(world, market, merchant, dayOf(state.time))
    if (!order) return
    expect(order.advance).toBeGreaterThan(0)
    expect(order.reward).toBeGreaterThan(order.advance)

    const taken = ok(applyCommand(state, { type: 'takeOrder', merchantId: merchant.id }))
    expect(taken.character.money).toBe(state.character.money + order.advance)
    const quest = taken.quests.find((one) => one.merchantId === merchant.id)
    expect(quest?.type).toBe('merchantOrder')
    // Дважды один заказ не берут.
    expect(applyCommand(taken, { type: 'takeOrder', merchantId: merchant.id }).ok).toBe(false)

    const stocked: GameState = {
      ...taken,
      character: {
        ...taken.character,
        inventory: { ...taken.character.inventory, [order.good]: order.amount },
      },
    }
    const handed = ok(
      applyCommand(stocked, { type: 'deliverGoods', good: order.good, amount: order.amount }),
    )
    const paid = ok(applyCommand(handed, { type: 'finishQuest', questId: quest?.id ?? '' }))
    expect(paid.character.money).toBe(handed.character.money + order.reward)
    // Привёз в срок — помнят.
    expect(dealingWith(paid, merchant.id).standing).toBeGreaterThan(10)
  })
})

describe('Р4: рынок помнит тебя', () => {
  it('своему дешевле, обманщику дороже, и весь ряд знает', () => {
    const state = at(capital)
    const market = state.settlements[capital]
    const merchants = merchantsAt(world, state.settlements, capital)
    const merchant = merchants[0]
    if (!market || !merchant) return
    // Товар подороже: у зерна по четыре монеты десятая доля не видна в счёте.
    const good = [...merchant.goods].sort(
      (a, b) => GOODS[b].basePrice - GOODS[a].basePrice,
    )[0] as 'grain'
    const plain = merchantBuyPrice(world, market, merchant, good, 0, 0)
    const friend = merchantBuyPrice(world, market, merchant, good, 0, 60)
    const foe = merchantBuyPrice(world, market, merchant, good, 0, -60)
    console.log(`${GOODS[good].label}: чужому ${plain}, своему ${friend}, обманщику ${foe}`)
    expect(friend).toBeLessThan(plain)
    expect(foe).toBeGreaterThan(plain)
    expect(standingWord(60)).not.toBe(standingWord(-60))

    // Взял задаток и не привёз: помнит он и слышит весь ряд.
    const taken = (() => {
      const withOrder = merchants.find((one) =>
        Boolean(orderFrom(world, market, one, dayOf(state.time))),
      )
      if (!withOrder) return null
      return {
        state: ok(applyCommand(state, { type: 'takeOrder', merchantId: withOrder.id })),
        merchant: withOrder,
      }
    })()
    if (!taken) return
    const quest = taken.state.quests.find((one) => one.merchantId === taken.merchant.id)
    const dropped = ok(
      applyCommand(taken.state, { type: 'abandonQuest', questId: quest?.id ?? '' }),
    )
    expect(dealingWith(dropped, taken.merchant.id).standing).toBeLessThan(-30)
    const neighbour = merchants.find((one) => one.id !== taken.merchant.id)
    if (neighbour) expect(dealingWith(dropped, neighbour.id).standing).toBeLessThan(0)
  })
})

describe('Р6: купеческая молва', () => {
  it('купец рассказывает, почём в соседних местах, — и это ложится в книжку цен', () => {
    const state = at(capital)
    const merchant = merchantsAt(world, state.settlements, capital)[0]
    if (!merchant) return
    const tales = talesOf(world, state.settlements, merchant)
    expect(tales.length).toBeGreaterThan(0)
    for (const tale of tales) expect(tale.locationId).not.toBe(capital)

    const heard = ok(applyCommand(state, { type: 'askPrices', merchantId: merchant.id }))
    const tale = tales[0]
    if (!tale) return
    expect(priceHistory(state.priceLog, tale.locationId, tale.good)).toHaveLength(0)
    expect(priceHistory(heard.priceLog, tale.locationId, tale.good).length).toBeGreaterThan(0)
    console.log(
      `молва: ${tales.length} цен из ${new Set(tales.map((one) => one.locationId)).size} мест`,
    )
    // Тому, кого помнят дурно, не рассказывают.
    const foe: GameState = {
      ...state,
      dealings: { [merchant.id]: { standing: -50, deals: 0 } },
    }
    expect(applyCommand(foe, { type: 'askPrices', merchantId: merchant.id }).ok).toBe(false)
  })
})
