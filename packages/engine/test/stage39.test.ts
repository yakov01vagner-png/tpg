import { describe, expect, it } from 'vitest'
import { musterBands, tickBands } from '../src/band'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { CONTENT } from '../src/content'
import { FEASTS } from '../src/content/year'
import { buyPrice, createSettlements, sellPrice } from '../src/economy'
import { FAIR_DAYS, daysToFair, fairAt, fairOf, feastAt } from '../src/fair'
import { offersAt } from '../src/quest'
import { createRng } from '../src/rng'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { DAYS_PER_YEAR, MINUTES_PER_DAY, seasonOf } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { kingdomOf } from '../src/world/queries'

/**
 * Этап 39: год человеческий.
 *
 * Год у земли уже есть (этап 37): она родит и не родит. Здесь появляется год у
 * людей — ярмарки, праздники, сезон войны и сроки, к которым можно не успеть.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Город с ярмаркой. */
const market = (() => {
  const place = Object.values(world.locations).find(
    (one) => one.archetype === 'city' && fairOf(world, one.id) !== null,
  )
  if (!place) throw new Error('в мире нет города с ярмаркой')
  return place.id
})()

function at(locationId: string, day: number, money = 3000): GameState {
  return {
    ...createGame(createCharacter({ name: 'Т', money }), 1, world),
    locationId,
    time: (day - 1) * MINUTES_PER_DAY + 9 * 60,
  }
}

describe('ярмарка', () => {
  it('у каждого города своя, осенью, и её можно дождаться', () => {
    const fair = fairOf(world, market)
    expect(fair).not.toBeNull()
    if (!fair) return
    expect(seasonOf(fair.fromDay)).toBe('autumn')
    expect(fair.days).toBe(FAIR_DAYS)
    // Ярмарка идёт свои дни и не идёт в остальные.
    expect(fairAt(world, market, fair.fromDay)).not.toBeNull()
    expect(fairAt(world, market, fair.fromDay + FAIR_DAYS)).toBeNull()
    expect(fairAt(world, market, fair.fromDay + DAYS_PER_YEAR)).not.toBeNull()
    // Досюда — ждать; на ней — ноль.
    expect(daysToFair(world, market, fair.fromDay - 10)).toBe(10)
    expect(daysToFair(world, market, fair.fromDay + 2)).toBe(0)
    // У деревни ярмарки нет: туда не съезжаются.
    const village = Object.values(world.locations).find((one) => one.archetype === 'village')
    expect(fairOf(world, village?.id ?? '')).toBeNull()
  })

  it('на ярмарке торгуются как свои: купить дешевле, продать дороже', () => {
    const fair = fairOf(world, market)
    if (!fair) return
    const before = at(market, fair.fromDay - 20)
    const during = at(market, fair.fromDay + 1)
    const place = before.settlements[market]
    if (!place) return
    // Одно и то же место, тот же запас, другой день: цены сходятся к середине.
    const skill = 0
    const plainBuy = buyPrice(world, place, 'cloth', skill)
    const plainSell = sellPrice(world, place, 'cloth', skill)
    const bought = ok(applyCommand(before, { type: 'buy', good: 'cloth', amount: 4 }))
    const boughtAtFair = ok(applyCommand(during, { type: 'buy', good: 'cloth', amount: 4 }))
    const paid = before.character.money - bought.character.money
    const paidAtFair = during.character.money - boughtAtFair.character.money
    console.log(
      `сукно: обычно ${plainBuy}/${plainSell}, за четыре куска ${paid} против ${paidAtFair} на ярмарке`,
    )
    expect(paidAtFair).toBeLessThan(paid)
    expect(plainBuy).toBeGreaterThan(plainSell)
  })

  it('на ярмарку приходят наёмники, которых здесь обычно нет', () => {
    const fair = fairOf(world, market)
    if (!fair) return
    // Городок без латников: латников нанимают в городе, столице и крепости, не
    // в городке — а на ярмарке в городке они есть.
    const town = Object.values(world.locations).find(
      (one) =>
        (one.archetype === 'town' || one.archetype === 'port') &&
        one.population >= 3000 &&
        fairOf(world, one.id) !== null,
    )
    if (!town) return
    const townFair = fairOf(world, town.id)
    if (!townFair) return
    const plain = applyCommand(at(town.id, townFair.fromDay - 30, 5000), {
      type: 'hire',
      troop: 'manAtArms',
      count: 1,
    })
    const during = applyCommand(at(town.id, townFair.fromDay + 1, 5000), {
      type: 'hire',
      troop: 'manAtArms',
      count: 1,
    })
    expect(plain.ok).toBe(false)
    expect(during.ok, during.ok ? '' : during.message).toBe(true)
  })
})

describe('праздники корон', () => {
  it('у каждой короны свой праздник, и в этот день не работают', () => {
    for (const kingdom of Object.values(world.kingdoms)) {
      expect(
        FEASTS.some((feast) => feast.kingdomId === kingdom.id),
        kingdom.name,
      ).toBe(true)
    }
    const kingdom = kingdomOf(world, market)
    const feast = FEASTS.find((one) => one.kingdomId === kingdom?.id)
    expect(feast).toBeDefined()
    if (!feast) return
    expect(feastAt(world, market, feast.day)).toEqual(feast)
    expect(feastAt(world, market, feast.day + feast.days + 3)).toBeNull()
    // Берём работу без срока: с этапа 67 есть сезонные (сев, жатва, зимняя
    // подёнщина), и в обычный день их в городе может не быть вовсе.
    const job = Object.values(CONTENT.jobs).find(
      (one) => one.where?.archetypes?.includes('city') && one.where?.seasons === undefined,
    )
    if (!job) return
    const holiday = applyCommand(at(market, feast.day), { type: 'work', jobId: job.id })
    expect(holiday.ok).toBe(false)
    if (!holiday.ok) {
      expect(holiday.code).toBe('closed')
      expect(holiday.message).toContain(feast.name)
    }
    const weekday = applyCommand(at(market, feast.day + feast.days + 3), {
      type: 'work',
      jobId: job.id,
    })
    expect(weekday.ok, weekday.ok ? '' : weekday.message).toBe(true)
  })

  it('праздник чужой короны здесь не празднуют', () => {
    const kingdom = kingdomOf(world, market)
    const foreign = FEASTS.find((one) => one.kingdomId !== kingdom?.id)
    if (!foreign) return
    expect(feastAt(world, market, foreign.day)?.kingdomId ?? kingdom?.id).toBe(kingdom?.id)
  })
})

describe('сезон войны', () => {
  it('весной выступают чаще, чем осенью', () => {
    const settlements = createSettlements(world)
    const [politics, places] = createPolitics(world, settlements, createRng(3))
    const [start] = musterBands(politics, places, createRng(11))
    const marchedOver = (fromDay: number, days: number): number => {
      let bands = start
      let current = places
      let sides = politics
      let rng = createRng(77)
      let marches = 0
      for (let day = 0; day < days; day += 1) {
        const step = tickBands(world, sides, current, bands, rng, fromDay + day)
        marches += step.bands.filter((band) => band.travel).length
        bands = step.bands
        current = step.settlements
        sides = step.politics
        rng = step.rng
      }
      return marches
    }
    const spring = marchedOver(5, 60)
    const autumn = marchedOver(200, 60)
    console.log(`в пути за 60 суток: весна ${spring}, осень ${autumn}`)
    expect(spring).toBeGreaterThan(autumn * 1.5)
  })
})

describe('сроки в поручениях', () => {
  it('к ярмарке просят товар, срок — сама ярмарка, и его можно не успеть', () => {
    const fair = fairOf(world, market)
    if (!fair) return
    const state = at(market, fair.fromDay - 30, 3000)
    const offer = offersAt(state).find((quest) => quest.type === 'fairGoods')
    expect(offer, 'к ярмарке ничего не просят').toBeDefined()
    if (!offer) return
    expect(offer.good).toBeDefined()
    // Срок кончается вместе с ярмаркой, не раньше и не позже.
    expect(offer.deadlineDay).toBe(fair.fromDay - 30 + 30 + fair.days - 1)

    const taken = ok(applyCommand(state, { type: 'takeQuest', questId: offer.id }))
    // Без товара сдавать нечего.
    const empty = applyCommand(taken, {
      type: 'deliverGoods',
      good: offer.good ?? 'wine',
      amount: offer.amount,
    })
    expect(empty.ok).toBe(false)
    // С товаром — сдаётся и засчитывается.
    const stocked: GameState = {
      ...taken,
      character: {
        ...taken.character,
        inventory: { ...taken.character.inventory, [offer.good ?? 'wine']: offer.amount },
      },
    }
    const handed = ok(
      applyCommand(stocked, {
        type: 'deliverGoods',
        good: offer.good ?? 'wine',
        amount: offer.amount,
      }),
    )
    expect(handed.quests[0]?.progress).toBe(offer.amount)
    const paid = ok(applyCommand(handed, { type: 'finishQuest', questId: offer.id }))
    expect(paid.character.money).toBe(handed.character.money + offer.reward)

    // А опоздавший остаётся ни с чем: срок вышел — дело снято.
    let late = taken
    for (let day = 0; day < 40; day += 1) {
      late = ok(applyCommand(late, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    expect(late.quests).toHaveLength(0)
  })

  it('после ярмарки товар к ней не просят', () => {
    const fair = fairOf(world, market)
    if (!fair) return
    const after = at(market, fair.fromDay + FAIR_DAYS + 5)
    expect(offersAt(after).some((quest) => quest.type === 'fairGoods')).toBe(false)
  })
})
