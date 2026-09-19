import { describe, expect, it } from 'vitest'
import {
  brotherTitle,
  brothersAt,
  ceilingOf,
  housesOf,
  startSway,
  swayOf,
  tickOrders,
} from '../src/brother'
import { canFound, charterById, ownCharterFeels } from '../src/brotherhood'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { CLASH_CHANCE, FOUND_COST, INTERDICT_DAYS, SEND_COST } from '../src/content/brothers'
import { ORDERS } from '../src/content/orders'
import { createSettlements } from '../src/economy'
import { errandsAt } from '../src/errand'
import { canWield, interdictedAt, orderById, ordersAt, rankOf } from '../src/order'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { speakersAt } from '../src/talk'
import { WORLD_START } from '../src/time'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 59: ордена в деле.
 *
 * Орден перестаёт быть членством с поблажками: у него есть люди с именами, своя
 * служба, власть на верхах и своя жизнь в мире — вражда, которую видно числом
 * века. И его можно завести своё.
 */

const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Где стоит этот орден — и герой, состоящий в нём с таким положением. */
function inOrder(orderId: string, standing: number, money = 5000): GameState {
  const seat = housesOf(world, orderId)[0] ?? ''
  const base = createGame(createCharacter({ name: 'Т', money }), 1, world)
  return {
    ...base,
    locationId: seat,
    quarter: null,
    time: WORLD_START,
    guild: { orderId, standing, since: 0, paidUntil: 9000 },
  }
}

describe('О5: братья по ордену', () => {
  it('у ордена есть люди, и с ними говорят', () => {
    const order = ORDERS[0]
    expect(order).toBeDefined()
    if (!order) return
    const state = inOrder(order.id, 80)
    const brothers = brothersAt(state, order)
    console.log(
      `${order.name} в ${world.locations[state.locationId]?.name}: ${brothers
        .map((one) => `${one.name} (${brotherTitle(order, one.role)})`)
        .join(', ')}`,
    )
    expect(brothers.length).toBeGreaterThan(1)
    // Магистр сидит в главном доме, и он один.
    expect(brothers.filter((one) => one.role === 'master').length).toBeLessThan(2)
    // Свой смотрит на своего по положению: у брата с высоким положением тепло.
    const cold = brothersAt({ ...state, guild: null }, order)
    expect(cold[0]?.mood ?? 0).toBeLessThan(brothers[0]?.mood ?? 0)
    // И они говорят: те же разговоры, что с купцами и придворными (этап 53).
    const speakers = speakersAt(state)
    expect(speakers.some((one) => one.kind === 'brother')).toBe(true)
  })
})

describe('О1: дела ордена', () => {
  it('таких дел нет на рынке, и дают их только своим', () => {
    for (const order of ORDERS) {
      const state = inOrder(order.id, 140)
      const errands = errandsAt(state)
      if (errands.length === 0) continue
      console.log(
        `${order.name}: ${errands.map((one) => `${one.type} → ${world.locations[one.targetLocationId]?.name}`).join('; ')}`,
      )
      // Чужому в том же месте не дают ничего.
      expect(errandsAt({ ...state, guild: null })).toHaveLength(0)
      const taken = ok(applyCommand(state, { type: 'takeQuest', questId: errands[0]?.id ?? '' }))
      expect(taken.quests).toHaveLength(1)
      return
    }
    throw new Error('ни один орден не даёт дел')
  })

  it('дознание делается на месте, а не в доме ордена', () => {
    const church = ORDERS.find((one) => one.kind === 'church')
    expect(church).toBeDefined()
    if (!church) return
    const state = inOrder(church.id, 140)
    const errand = errandsAt(state).find((one) => one.type === 'orderHeresy')
    expect(errand).toBeDefined()
    if (!errand) return
    const taken = ok(applyCommand(state, { type: 'takeQuest', questId: errand.id }))
    // В доме ордена дознавать нечего.
    expect(applyCommand(taken, { type: 'inquire' }).ok).toBe(false)
    let there: GameState = { ...taken, locationId: errand.targetLocationId }
    for (let tries = 0; tries < 8; tries += 1) {
      const result = applyCommand(there, { type: 'inquire' })
      if (!result.ok) break
      there = result.state
      if ((there.quests[0]?.progress ?? 0) > 0) break
    }
    console.log(
      `дознание в ${world.locations[errand.targetLocationId]?.name}: сделано ${there.quests[0]?.progress}`,
    )
    expect(there.quests[0]?.progress).toBe(1)
  })
})

describe('О2 и О4: ступень — власть', () => {
  it('на верхах орденом двигают, снизу — нет', () => {
    const order = ORDERS[0]
    if (!order) return
    const low = inOrder(order.id, 0)
    expect(canWield(low, 'send').can).toBe(false)
    expect(applyCommand(low, { type: 'orderSend', locationId: low.locationId }).ok).toBe(false)

    const top = inOrder(order.id, 200)
    expect(rankOf(order, 200)).toBe(order.ranks.length - 1)
    expect(canWield(top, 'send').can).toBe(true)
    const seat = top.settlements[top.locationId]
    expect(seat).toBeDefined()
    if (!seat) return
    const troubled: GameState = {
      ...top,
      settlements: { ...top.settlements, [top.locationId]: { ...seat, banditry: 0.6 } },
    }
    const sent = ok(applyCommand(troubled, { type: 'orderSend', locationId: top.locationId }))
    console.log(
      `братья посланы: разбой 0.6 → ${sent.settlements[top.locationId]?.banditry}, казны ${top.character.money} → ${sent.character.money}`,
    )
    expect(sent.settlements[top.locationId]?.banditry ?? 1).toBeLessThan(0.6)
    expect(sent.character.money).toBe(top.character.money - SEND_COST)
    // Положение на это тратится: чужими людьми даром не распоряжаются.
    expect(sent.guild?.standing ?? 0).toBeLessThan(top.guild?.standing ?? 0)
  })

  it('запрет закрывает месту обряды, помилование — открывает', () => {
    const church = ORDERS.find((one) => one.kind === 'church')
    if (!church) return
    const top = inOrder(church.id, 300)
    expect(canWield(top, 'interdict').can).toBe(true)
    const banned = ok(applyCommand(top, { type: 'orderInterdict', locationId: top.locationId }))
    const ban = interdictedAt(banned, top.locationId, 1)
    expect(ban?.orderId).toBe(church.id)
    expect(ban?.untilDay).toBeGreaterThanOrEqual(INTERDICT_DAYS)
    // Под запретом не служат.
    const rites = applyCommand(banned, { type: 'rite', riteId: 'blessing' })
    if (!rites.ok) expect(rites.message).toContain('запрет')
    const pardoned = ok(applyCommand(banned, { type: 'orderPardon', locationId: top.locationId }))
    expect(interdictedAt(pardoned, top.locationId, 1)).toBeNull()
    console.log(
      `${world.locations[top.locationId]?.name}: запрет ${INTERDICT_DAYS} сут., память места ${banned.reputation.places[top.locationId]} → ${pardoned.reputation.places[top.locationId]}`,
    )
    expect(pardoned.reputation.places[top.locationId] ?? 0).toBeGreaterThan(
      banned.reputation.places[top.locationId] ?? 0,
    )
  })
})

describe('О3: вражда орденов живёт', () => {
  it('за век ордена расходятся весом, и свара стоит людям разбоя', () => {
    const places = createSettlements(world)
    let sway = startSway()
    let settlements = places
    let rng = createRng(5)
    let clashes = 0
    for (let day = 0; day < 36500; day += 1) {
      const result = tickOrders(world, settlements, sway, rng)
      sway = result.sway
      settlements = result.settlements
      rng = result.rng
      clashes += result.clashes.length
    }
    const weights = ORDERS.map((order) => `${order.name} ${swayOf(sway, order.id).toFixed(0)}`)
    console.log(`за век: свар ${clashes}; ${weights.join(', ')}`)
    expect(CLASH_CHANCE).toBeGreaterThan(0)
    expect(clashes).toBeGreaterThan(0)
    // Ордена расходятся: у того, кто стоит везде, вес больше, чем у местного.
    const most = Math.max(...ORDERS.map((order) => swayOf(sway, order.id)))
    const least = Math.min(...ORDERS.map((order) => swayOf(sway, order.id)))
    expect(most).toBeGreaterThan(least)
    // И вражда видна числом: тот, у кого врагов нет, стоит у своего потолка, а
    // враждующий — ниже своего, сколько бы домов у него ни было.
    const peaceful = ORDERS.find((order) => order.feud.orders.length === 0)
    // Берём самого широкого из враждующих: свара видна там, где есть кому
    // сходиться. У ордена в восьми домах и врагов встретить негде.
    const fighting = [...ORDERS]
      .filter((order) => order.feud.orders.length > 0)
      .sort((a, b) => housesOf(world, b.id).length - housesOf(world, a.id).length)[0]
    expect(peaceful).toBeDefined()
    expect(fighting).toBeDefined()
    if (!peaceful || !fighting) return
    console.log(
      `потолки: ${peaceful.name} ${ceilingOf(world, peaceful.id).toFixed(0)} при весе ${swayOf(sway, peaceful.id).toFixed(0)}; ` +
        `${fighting.name} ${ceilingOf(world, fighting.id).toFixed(0)} при весе ${swayOf(sway, fighting.id).toFixed(0)}`,
    )
    expect(swayOf(sway, peaceful.id)).toBeGreaterThan(ceilingOf(world, peaceful.id) * 0.95)
    expect(swayOf(sway, fighting.id)).toBeLessThan(ceilingOf(world, fighting.id) * 0.95)
    // И свара видна на земле: там, где сходились, разбоя прибавилось.
    const troubled = Object.values(settlements).filter(
      (one) => one.banditry > (places[one.locationId]?.banditry ?? 0),
    )
    expect(troubled.length).toBeGreaterThan(0)
  })
})

describe('О6: своё братство', () => {
  it('своё заводят с верха или с чистого места, и свой устав судит так же', () => {
    const order = ORDERS[0]
    if (!order) return
    // Брат средней руки своё не заводит.
    const middling = inOrder(order.id, 40)
    expect(canFound(middling).can).toBe(false)
    // Тот, кто никогда ни в одном не состоял, — заводит.
    const stranger: GameState = { ...middling, guild: null }
    expect(canFound(stranger).can).toBe(true)
    const founded = ok(
      applyCommand(stranger, {
        type: 'foundBrotherhood',
        name: 'Братство Серого Камня',
        charterId: 'mercy',
      }),
    )
    expect(founded.brotherhood?.name).toBe('Братство Серого Камня')
    expect(founded.character.money).toBe(stranger.character.money - FOUND_COST)
    expect(founded.renown).toBeGreaterThan(stranger.renown)
    const hood = founded.brotherhood
    expect(hood).toBeDefined()
    if (!hood) return
    // Устав милосердия: накормить — по уставу, разорить — нет.
    expect(ownCharterFeels(hood, 'feedHungry')).toBeGreaterThan(0)
    expect(ownCharterFeels(hood, 'sack')).toBeLessThan(0)
    console.log(
      `${hood.name}: ${charterById(hood.charterId).label}, братьев ${hood.brothers}, слава ${founded.renown}`,
    )
    // И дважды своё не заводят.
    expect(
      applyCommand(founded, {
        type: 'foundBrotherhood',
        name: 'Второе братство',
        charterId: 'steel',
      }).ok,
    ).toBe(false)
  })
})

describe('орден остался орденом', () => {
  it('дома ордена на месте, и чужой орден в них не стоит', () => {
    for (const order of ORDERS) {
      const houses = housesOf(world, order.id)
      expect(houses.length).toBeGreaterThan(0)
      const first = houses[0]
      if (!first) continue
      expect(ordersAt(world, first).some((one) => one.id === order.id)).toBe(true)
      expect(orderById(order.id)?.name).toBe(order.name)
    }
  })
})
