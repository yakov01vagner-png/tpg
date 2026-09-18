import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { ORDERS, ORDERS_BY_ID } from '../src/content/orders'
import { EXPELLED, feudChill, ordersAt, rankLabel, rankOf } from '../src/order'
import { offersAt } from '../src/quest'
import { lordRep } from '../src/reputation'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { MINUTES_PER_DAY } from '../src/time'
import { generateWorld } from '../src/world/generate'
import { kingdomOf } from '../src/world/queries'

/**
 * Этап 42: церковь, ордена и гильдии.
 *
 * Силы, не привязанные к короне: у них своя земля, свои люди, свои поручения и
 * своя вражда — и в них можно вступить.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Место, где стоит орден. */
function seatOf(orderId: string): string {
  const place = Object.values(world.locations).find((one) =>
    ordersAt(world, one.id).some((order) => order.id === orderId),
  )
  if (!place) throw new Error(`${orderId} нигде не стоит`)
  return place.id
}

function at(locationId: string, money = 3000): GameState {
  return { ...createGame(createCharacter({ name: 'Т', money }), 1, world), locationId }
}

describe('шесть орденов как данные', () => {
  it('у каждого устав, земля, враги и ступени', () => {
    expect(ORDERS).toHaveLength(6)
    for (const order of ORDERS) {
      expect(Object.keys(order.charter).length).toBeGreaterThan(2)
      expect(order.seats.length).toBeGreaterThan(0)
      expect(order.ranks.length).toBe(4)
      expect(order.ranks[0]?.standing).toBe(0)
      expect(order.feud.kingdoms.length + order.feud.orders.length).toBeGreaterThan(0)
      // И каждый где-то стоит.
      expect(() => seatOf(order.id), order.name).not.toThrow()
    }
    const kinds = new Set(ORDERS.map((order) => order.kind))
    expect(kinds.has('church') && kinds.has('guild') && kinds.has('order')).toBe(true)
  })

  it('орден стоит на своей земле, а не везде', () => {
    const lantern = ORDERS_BY_ID.lantern
    if (!lantern) return
    const seats = Object.values(world.locations).filter((one) =>
      ordersAt(world, one.id).some((order) => order.id === 'lantern'),
    )
    expect(seats.length).toBeGreaterThan(0)
    for (const seat of seats) expect(kingdomOf(world, seat.id)?.id).toBe('robl')
  })
})

describe('членство и ступени', () => {
  it('вступают там, где орден стоит, и в одном', () => {
    const seat = seatOf('guests')
    const away = Object.values(world.locations).find(
      (one) => !ordersAt(world, one.id).some((order) => order.id === 'guests'),
    )
    expect(applyCommand(at(away?.id ?? ''), { type: 'joinOrder', orderId: 'guests' }).ok).toBe(
      false,
    )
    const joined = ok(applyCommand(at(seat), { type: 'joinOrder', orderId: 'guests' }))
    expect(joined.guild?.orderId).toBe('guests')
    expect(rankLabel(ORDERS_BY_ID.guests as never, joined.guild?.standing ?? 0)).toBe('гость')
    const second = applyCommand(
      { ...joined, locationId: seatOf('blades') },
      { type: 'joinOrder', orderId: 'blades' },
    )
    expect(second.ok).toBe(false)
    const left = ok(applyCommand(joined, { type: 'leaveOrder' }))
    expect(left.guild).toBeNull()
  })

  it('служат и растут: поручение в месте ордена поднимает положение и платит больше', () => {
    const seat = seatOf('wayfarers')
    const guests = ORDERS_BY_ID.wayfarers
    if (!guests) return
    const member = ok(applyCommand(at(seat), { type: 'joinOrder', orderId: 'wayfarers' }))
    const withStanding: GameState = {
      ...member,
      guild: member.guild ? { ...member.guild, standing: 29 } : null,
    }
    // Готовое дело: бродячее поручение, у которого всё уже сделано.
    const offer = offersAt(withStanding).find(
      (quest) => quest.type === 'clearBandits' || quest.type === 'bringFood',
    )
    if (!offer) return
    const done: GameState = {
      ...withStanding,
      quests: [{ ...offer, progress: offer.amount }],
      settlements: {
        ...withStanding.settlements,
        [offer.targetLocationId]: {
          ...(withStanding.settlements[offer.targetLocationId] as NonNullable<
            GameState['settlements'][string]
          >),
          banditry: 0,
        },
      },
    }
    const paid = ok(applyCommand(done, { type: 'finishQuest', questId: offer.id }))
    expect(paid.character.money - done.character.money).toBe(Math.round(offer.reward * 1.2))
    expect(paid.guild?.standing).toBe(41)
    expect(rankOf(guests, 41)).toBe(1)
  })

  it('вылетают: не платишь — положение падает, пока не выгонят', () => {
    const seat = seatOf('blades')
    let member = ok(applyCommand(at(seat, 15), { type: 'joinOrder', orderId: 'blades' }))
    expect(member.guild).not.toBeNull()
    member = { ...member, character: { ...member.character, money: 0 } }
    // Полгода сутками: взнос снимает мир, а мир идёт только командой.
    for (let day = 0; day < 31 * 6 && member.guild; day += 1) {
      member = ok(applyCommand(member, { type: 'tick', minutes: MINUTES_PER_DAY }))
      member = { ...member, character: { ...member.character, money: 0 } }
    }
    expect(member.guild).toBeNull()
    // И обратно не берут: помнят.
    expect(lordRep(member.reputation, 'order:blades')).toBeLessThanOrEqual(-20)
    expect(
      applyCommand(
        { ...member, character: { ...member.character, money: 500 } },
        { type: 'joinOrder', orderId: 'blades' },
      ).ok,
    ).toBe(false)
    expect(EXPELLED).toBeLessThan(0)
  })
})

describe('свои услуги', () => {
  it('гильдия торгует со своими как со своими: дешевле купить', () => {
    const seat = seatOf('guests')
    const outsider = at(seat)
    const member = ok(applyCommand(outsider, { type: 'joinOrder', orderId: 'guests' }))
    const paidOut =
      outsider.character.money -
      ok(applyCommand(outsider, { type: 'buy', good: 'weapons', amount: 3 })).character.money
    const paidIn =
      member.character.money -
      ok(applyCommand(member, { type: 'buy', good: 'weapons', amount: 3 })).character.money
    console.log(`оружие три штуки: чужому ${paidOut}, своему ${paidIn}`)
    expect(paidIn).toBeLessThan(paidOut)
  })

  it('рота нанимает своим дешевле', () => {
    const seat = seatOf('blades')
    const outsider = { ...at(seat), character: { ...at(seat).character } }
    const member = ok(applyCommand(outsider, { type: 'joinOrder', orderId: 'blades' }))
    const hireOut = applyCommand(outsider, { type: 'hire', troop: 'militia', count: 4 })
    const hireIn = applyCommand(member, { type: 'hire', troop: 'militia', count: 4 })
    if (!hireOut.ok || !hireIn.ok) return
    expect(outsider.character.money - hireOut.state.character.money).toBeGreaterThan(
      member.character.money - hireIn.state.character.money,
    )
  })
})

describe('вражда', () => {
  it('орден в ссоре с короной — и на её земле тебя принимают холоднее', () => {
    const seat = seatOf('blades')
    const member = ok(applyCommand(at(seat), { type: 'joinOrder', orderId: 'blades' }))
    const roblPlace = Object.values(world.locations).find(
      (one) => kingdomOf(world, one.id)?.id === 'robl' && one.population > 0,
    )
    const otherPlace = Object.values(world.locations).find(
      (one) => kingdomOf(world, one.id)?.id === 'reEstiz' && one.population > 0,
    )
    if (!roblPlace || !otherPlace) return
    expect(feudChill(member, roblPlace.id)).toBeLessThan(0)
    expect(feudChill(member, otherPlace.id)).toBe(0)
    expect(feudChill(at(seat), roblPlace.id)).toBe(0)
  })

  it('орден судит по уставу: разорение роняет положение у Светоча и поднимает у Клинков', () => {
    const lantern = ORDERS_BY_ID.lantern
    const blades = ORDERS_BY_ID.blades
    if (!lantern || !blades) return
    expect(lantern.charter.sack ?? 0).toBeLessThan(0)
    expect(blades.charter.sack ?? 0).toBeGreaterThan(0)
    expect(lantern.feud.orders).toContain('blades')
  })
})
