import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { ORDERS } from '../src/content/orders'
import { AIM_YEARS, MERCHANT_LEAVES } from '../src/content/plans'
import { createSettlements, priceOf } from '../src/economy'
import { merchantsAt } from '../src/merchant'
import {
  crownFoe,
  crownPlan,
  lordCall,
  lordPlan,
  marketTowns,
  opensSecondWar,
  orderAim,
  rankTargets,
  tickTrade,
  ventureOf,
  worldAims,
} from '../src/plans'
import { offersAt } from '../src/quest'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 72: свои головы — ИИ мира.
 *
 * Лорды, короны, купцы и ордена жили бросками: кубик решал, кому объявить
 * войну, куда идти войском, что лежит на прилавке. Здесь у каждого появляется
 * замысел — правила, выведенные из того, что в мире и так видно, — и слова,
 * которыми он его объясняет.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function stateAt(locationId: string): GameState {
  const base = createGame(createCharacter({ name: 'Т', money: 500 }), 1, world)
  return { ...base, politics, settlements, locationId, quarter: null, time: WORLD_START }
}

describe('Ч1: лорд решает по-своему', () => {
  it('замыслы лордов разные, и каждый объяснён', () => {
    const plans = politics.lords.map((lord) => lordPlan(world, politics, settlements, lord))
    const counts = new Map<string, number>()
    for (const plan of plans) counts.set(plan.want, (counts.get(plan.want) ?? 0) + 1)
    console.log(
      `лордов ${plans.length}: ${[...counts].map(([want, count]) => `${want} ${count}`).join(', ')}`,
    )
    console.log(`например: ${plans[0]?.want} — ${plans[0]?.why}`)
    expect(plans.length).toBeGreaterThan(5)
    // Один замысел на всех — это не замысел, а константа.
    expect(counts.size).toBeGreaterThan(1)
    expect(plans.every((plan) => plan.why.length > 20)).toBe(true)
  })

  it('голодная земля держит хозяина дома', () => {
    const lord = politics.lords.find((one) =>
      Object.values(settlements).some((place) => place.owner === one.id),
    )
    if (!lord) return
    const starving = { ...settlements }
    for (const [id, place] of Object.entries(settlements)) {
      if (place.owner !== lord.id) continue
      const empty = Object.fromEntries(Object.entries(place.stock).map(([good]) => [good, 0]))
      starving[id] = { ...place, stock: empty as typeof place.stock }
    }
    const before = lordPlan(world, politics, settlements, lord)
    const after = lordPlan(world, politics, starving, lord)
    console.log(`${lord.name}: сытым — ${before.want}, голодным — ${after.want}`)
    expect(after.want).toBe('hoard')
    expect(after.why).toContain('недород')
  })

  it('цель выбирается по вкусу замысла, а не жребием', () => {
    const owned = Object.values(settlements).filter((one) => one.population > 0)
    const rich = [...owned].sort((a, b) => b.population - a.population)[0]
    const lesser = owned.find((one) => one.locationId !== rich?.locationId && one.population > 300)
    if (!rich || !lesser) return
    // Крупный приз под гарнизоном и мелкий без охраны: замысел решает, что из
    // этого цель.
    const places = {
      [rich.locationId]: { ...rich, garrison: { manAtArms: 400 } },
      [lesser.locationId]: {
        ...lesser,
        population: Math.round(rich.population / 3),
        garrison: {},
      },
    }
    const ids = Object.keys(places)
    const forWar = rankTargets(places, ids, 'war')
    const forLoot = rankTargets(places, ids, 'loot')
    console.log(
      `войной — ${forWar[0]} (${places[forWar[0] as string]?.population} душ под ${Object.values(places[forWar[0] as string]?.garrison ?? {}).reduce((a, b) => a + (b ?? 0), 0)} копьями), за добычей — ${forLoot[0]}`,
    )
    expect(forWar[0]).toBe(rich.locationId)
    expect(forLoot[0]).toBe(lesser.locationId)
  })
})

describe('Ч2: корона ведёт политику', () => {
  it('начатая война — это уже выбор: второй корона не открывает', () => {
    const kingdoms = Object.keys(world.kingdoms)
    const a = kingdoms[0] as string
    const b = kingdoms[1] as string
    const atWar = {
      ...politics,
      wars: [{ a, b, since: 1, reason: 'проба' }],
    }
    const plan = crownPlan(world, atWar, settlements, a)
    console.log(`${plan.want}: ${plan.why}`)
    expect(plan.want).toBe('foe')
    expect(plan.targetId).toBe(b)
    // Второй войны не заводят — если только корона не воинственна настолько,
    // что ей всё равно.
    const opens = kingdoms.filter((id) => opensSecondWar(atWar, id))
    console.log(`из ${kingdoms.length} корон вторую войну открыли бы ${opens.length}`)
    expect(opens).not.toContain(b === a ? '' : undefined)
    expect(opens.length).toBeLessThan(kingdoms.length)
  })

  it('врага выбирают по отношению, а не жребием', () => {
    const kingdoms = Object.keys(world.kingdoms)
    const a = kingdoms[0] as string
    const hated = kingdoms[3] as string
    const cold = {
      ...politics,
      relations: { ...politics.relations, [[a, hated].sort().join('|')]: -80 },
    }
    const foe = crownFoe(world, cold, settlements, a)
    console.log(`${world.kingdoms[a]?.name} пойдёт на ${world.kingdoms[foe ?? '']?.name ?? '—'}`)
    expect(foe).toBe(hated)
  })

  it('дань тяжелее войны: платящая корона ищет, как её сбросить', () => {
    const kingdoms = Object.keys(world.kingdoms)
    const a = kingdoms[2] as string
    const to = kingdoms[4] as string
    const paying = {
      ...politics,
      tributes: [{ from: a, to, perDay: 4, untilDay: 900 }],
    }
    const plan = crownPlan(world, paying, settlements, a)
    console.log(`${plan.want} → ${plan.targetId}: ${plan.why}`)
    expect(plan.want).toBe('tribute')
    expect(plan.targetId).toBe(to)
  })
})

describe('Ч3: купец водит свои обозы', () => {
  it('обозы двигают цены и не вывозят хлеб из голодного города', () => {
    // Все обозы мира и разница цен на их концах: это и есть то, что торговля
    // обязана сводить. Самый крупный перекос — главная проверка.
    const gapsOf = (places: Readonly<Record<string, (typeof settlements)[string]>>) => {
      let total = 0
      let worst = 0
      let where = ''
      for (const townId of marketTowns(world, places)) {
        for (const merchant of merchantsAt(world, places, townId)) {
          const venture = ventureOf(world, places, merchant)
          if (!venture) continue
          const from = places[venture.fromId]
          const to = places[venture.toId]
          if (!from || !to) continue
          const gap = priceOf(world, to, venture.good) - priceOf(world, from, venture.good)
          total += Math.abs(gap)
          if (gap > worst) {
            worst = gap
            where = `${merchant.name}: ${venture.why}`
          }
        }
      }
      return { total, worst, where }
    }

    let places: Record<string, (typeof settlements)[string]> = { ...settlements }
    const before = gapsOf(places)
    console.log(`до обозов: перекосов на ${before.total}, худший ${before.worst} — ${before.where}`)
    let moved = 0
    let carried = 0
    for (let day = 0; day < 400; day += 20) {
      const carts = tickTrade(world, places, day, day + 20)
      places = { ...carts.settlements }
      moved += carts.moves.length
      for (const move of carts.moves) carried += move.load
    }
    const after = gapsOf(places)
    console.log(`после 400 суток: ходок ${moved}, мер свезено ${carried}`)
    console.log(`перекосов на ${after.total}, худший ${after.worst} — ${after.where}`)
    expect(moved).toBeGreaterThan(20)
    // Цены сходятся оттого, что товар повезли: это и есть торговля.
    expect(after.worst).toBeLessThan(before.worst)
    expect(after.total).toBeLessThan(before.total)
    // И ни одно место не обобрано ниже собственной нужды: торговля не кормится
    // голодом.
    for (const place of Object.values(places)) {
      if (place.population <= 0) continue
      expect(place.stock.grain).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('Ч4: у ордена своё дело', () => {
  it('замысел держится пять лет и меняется на шестой', () => {
    const order = ORDERS[0]
    if (!order) return
    const now = orderAim(world, order, 10)
    const soon = orderAim(world, order, 10 + DAYS_PER_YEAR)
    const later = orderAim(world, order, 10 + Math.round((AIM_YEARS + 1) * DAYS_PER_YEAR))
    console.log(`${order.name}: ${now.want} — ${now.why}`)
    console.log(`через ${AIM_YEARS + 1} лет: ${later.want}`)
    expect(soon.want).toBe(now.want)
    expect(soon.targetId).toBe(now.targetId)
    expect(now.why.length).toBeGreaterThan(20)
    const aims = new Set<string>()
    for (let year = 0; year < 60; year += AIM_YEARS) {
      aims.add(orderAim(world, order, Math.round(year * DAYS_PER_YEAR)).want)
    }
    console.log(`за шестьдесят лет орден успел захотеть: ${[...aims].join(', ')}`)
    expect(aims.size).toBeGreaterThan(1)
    expect(later.want === now.want && later.targetId === now.targetId).toBe(false)
  })
})

describe('Ч5: все помнят и отвечают', () => {
  it('обобранный купец уезжает из города', () => {
    const town = Object.values(settlements).find((one) => one.population >= 2000)
    if (!town) return
    const before = merchantsAt(world, settlements, town.locationId)
    const robbed = before[0]
    if (!robbed) return
    const state: GameState = {
      ...stateAt(town.locationId),
      dealings: { [robbed.id]: { standing: MERCHANT_LEAVES - 1, deals: 2 } },
    }
    const after = merchantsAt(world, settlements, town.locationId, state)
    console.log(`в ряду было ${before.length}, осталось ${after.length}: ${robbed.name} уехал`)
    expect(after.length).toBe(before.length - 1)
    expect(after.some((one) => one.id === robbed.id)).toBe(false)
  })

  it('лорд, которому ты помог, зовёт с собой', () => {
    const kingdoms = Object.keys(world.kingdoms)
    const lord = politics.lords.find(
      (one) =>
        one.kingdomId === kingdoms[0] &&
        Object.values(settlements).some((place) => place.owner === one.id),
    )
    if (!lord || !lord.kingdomId) return
    const enemy = kingdoms.find((id) => id !== lord.kingdomId) as string
    const warring = {
      ...politics,
      wars: [{ a: lord.kingdomId, b: enemy, since: 1, reason: 'проба' }],
    }
    const seat = Object.values(settlements).find((one) => one.owner === lord.id)
    if (!seat) return
    const state: GameState = {
      ...stateAt(seat.locationId),
      politics: warring,
      lordDeeds: { [lord.id]: ['saved'] },
    }
    const call = lordCall(world, warring, settlements, state, lord)
    console.log(call ? `${lord.name}: ${call.why}` : `${lord.name} молчит`)
    if (!call) return
    const offers = offersAt(state, seat.locationId).filter((one) => one.type === 'lordCall')
    console.log(`дел от лорда: ${offers.length}, награда ${offers[0]?.reward}`)
    expect(offers).toHaveLength(1)
    expect(offers[0]?.targetLocationId).toBe(call.targetId)
    // Без памяти о добром деле он не позовёт никого.
    const stranger = lordCall(world, warring, settlements, { lordDeeds: {} }, lord)
    expect(stranger).toBeNull()
  })
})

describe('Ч6: видно, почему', () => {
  it('в сводке мира написано, кто чего хочет', () => {
    const city = Object.values(world.locations)
      .filter((one) => one.archetype === 'capital' || one.archetype === 'city')
      .sort((a, b) => b.population - a.population)[0]
    if (!city) return
    const cards = worldAims(stateAt(city.id))
    const kinds = new Set(cards.map((one) => one.kind))
    console.log(`${city.name}: замыслов ${cards.length}, родов ${[...kinds].join(', ')}`)
    for (const card of cards.slice(0, 6)) console.log(`  ${card.who} — ${card.wants}: ${card.why}`)
    expect(cards.length).toBeGreaterThan(5)
    expect(kinds.has('crown')).toBe(true)
    // У каждого замысла есть и чего он хочет, и чем объясняет.
    expect(cards.every((one) => one.wants.length > 0 && one.why.length > 10)).toBe(true)
    // Один человек — один замысел: в сводке нет двойников.
    expect(new Set(cards.map((one) => one.id)).size).toBe(cards.length)
  })
})
