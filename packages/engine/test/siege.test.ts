import { describe, expect, it } from 'vitest'
import { GROUP_IDS, type GroupId, type OrderId } from '../src/battle'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { NO_POLITICS, createPolitics, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import type { LocationArchetype } from '../src/world/types'

const world = generateWorld(1)

function someplace(archetype: LocationArchetype): string {
  const found = Object.values(world.locations).find((l) => l.archetype === archetype)
  if (!found) throw new Error(`нет места вида «${archetype}»`)
  return found.id
}

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Войско под чужими стенами: игрок служит Ре-Эстизу и воюет с хозяином места. */
function besieger(locationId: string): GameState {
  const base = createGame(createCharacter({ name: 'Тест', money: 2000 }), 1, world)
  const settlement = base.settlements[locationId]
  if (!settlement) throw new Error('нет такого места')
  const ownerKingdom = settlement.owner?.startsWith('crown:')
    ? settlement.owner.slice('crown:'.length)
    : (base.politics.lords.find((lord) => lord.id === settlement.owner)?.kingdomId ?? 'boharut')

  return {
    ...base,
    locationId,
    service: 'reEstiz',
    party: {
      units: { spearman: 30, archer: 10, manAtArms: 6 },
      morale: 80,
      hungryDays: 0,
      gear: 0,
    },
    politics: {
      ...base.politics,
      wars: [{ a: 'reEstiz', b: ownerKingdom, since: 1, reason: 'претензии на землю' }],
    },
  }
}

const allOrders = (order: OrderId): Record<GroupId, OrderId> =>
  Object.fromEntries(GROUP_IDS.map((id) => [id, order])) as Record<GroupId, OrderId>

describe('осада', () => {
  const target = () =>
    Object.values(world.locations).find(
      (l) => l.archetype === 'town' && !l.id.startsWith('reEstiz.'),
    )?.id ?? someplace('town')

  it('нельзя осадить своих и нельзя без войска', () => {
    const peaceful = createGame(createCharacter({ name: 'Тест' }), 1, world)
    expect(applyCommand({ ...peaceful, locationId: target() }, { type: 'besiege' }).ok).toBe(false)
  })

  it('обложить можно того, с кем воюешь', () => {
    const state = ok(applyCommand(besieger(target()), { type: 'besiege' }))
    expect(state.siege?.locationId).toBe(target())
  })

  it('под стенами у осаждённых кончается хлеб', () => {
    const started = ok(applyCommand(besieger(target()), { type: 'besiege' }))
    const before = started.settlements[started.locationId]?.stock.grain ?? 0
    const after = ok(applyCommand(started, { type: 'siegeWait', days: 5 }))
    const left = after.settlements[after.locationId]?.stock.grain ?? 0
    console.log(`хлеб в осаждённом городе: ${Math.round(before)} → ${Math.round(left)}`)
    expect(left).toBeLessThan(before)
    expect(after.siege?.days).toBe(5)
  })

  it('стены дорого обходятся штурмующему', () => {
    const id = target()
    const plain = ok(applyCommand(besieger(id), { type: 'besiege' }))
    const settlement = plain.settlements[id]
    if (!settlement) return
    const walled: GameState = {
      ...plain,
      settlements: { ...plain.settlements, [id]: { ...settlement, buildings: ['walls'] } },
    }

    const fight = (state: GameState) => {
      let current = ok(applyCommand(state, { type: 'siegeAssault' }))
      for (let round = 0; round < 20; round += 1) {
        if (current.battle?.outcome !== 'ongoing') break
        current = ok(applyCommand(current, { type: 'battleOrders', orders: allOrders('charge') }))
      }
      return current
    }

    const withoutWalls = fight(plain)
    const withWalls = fight(walled)
    const losses = (state: GameState) =>
      46 - Object.values(state.party.units).reduce((sum, count) => sum + (count ?? 0), 0)
    console.log(`штурм: без стен потеряно ${losses(withoutWalls)}, со стенами ${losses(withWalls)}`)
    expect(losses(withWalls)).toBeGreaterThan(losses(withoutWalls))
  })

  it('взятие меняет хозяина и дорого обходится месту', () => {
    const id = target()
    let state = ok(applyCommand(besieger(id), { type: 'besiege' }))
    const before = state.settlements[id]
    state = ok(applyCommand(state, { type: 'siegeAssault' }))
    for (let round = 0; round < 20; round += 1) {
      if (state.battle?.outcome !== 'ongoing') break
      state = ok(applyCommand(state, { type: 'battleOrders', orders: allOrders('charge') }))
    }
    if (state.battle?.outcome !== 'won') return
    state = ok(applyCommand(state, { type: 'battleEnd', prisoners: 'release' }))

    const after = state.settlements[id]
    console.log(
      `взят ${world.locations[id]?.name}: людей ${before?.population} → ${after?.population}, ` +
        `разбой ${before?.banditry} → ${after?.banditry}`,
    )
    expect(after?.owner).toBe(PLAYER)
    expect(after?.population ?? 0).toBeLessThan(before?.population ?? 0)
    expect(after?.banditry ?? 0).toBeGreaterThan(before?.banditry ?? 0)
    expect(state.siege).toBe(null)
    expect(state.renown).toBeGreaterThan(0)
  })
})

describe('вассалы и мятеж', () => {
  const [politics, settlements] = createPolitics(
    world,
    createGame(createCharacter({ name: 'Тест' }), 1, world).settlements,
    createRng(5),
  )

  it('верность падает там, где на землях голодно', () => {
    const lord = politics.lords[0]
    if (!lord) return
    const starving: Record<string, (typeof settlements)[string]> = { ...settlements }
    for (const [id, settlement] of Object.entries(settlements)) {
      if (settlement.owner === lord.id) {
        starving[id] = { ...settlement, stock: { ...settlement.stock, grain: 0, fish: 0 } }
      }
    }
    const after = tickPolitics(world, politics, starving, 200, createRng(9))
    const now = after.politics.lords.find((candidate) => candidate.id === lord.id)
    console.log(`верность ${lord.title} ${lord.name}: ${lord.loyalty} → ${now?.loyalty.toFixed(1)}`)
    expect(now?.loyalty ?? 100).toBeLessThan(lord.loyalty)
  })

  it('мятеж поднимают, когда архимаг короны не под рукой', () => {
    const lord = politics.lords[0]
    if (!lord) return
    const angry = {
      ...politics,
      lords: politics.lords.map((candidate) =>
        candidate.id === lord.id ? { ...candidate, loyalty: 5 } : candidate,
      ),
    }
    const busyCrown = {
      ...angry,
      archmages: {
        ...angry.archmages,
        [lord.kingdomId ?? '']: {
          kingdomId: lord.kingdomId ?? '',
          state: 'busy' as const,
          untilDay: 9999,
        },
      },
    }

    // Мятеж — бросок, а не расписание: за два месяца он случается не всегда.
    // Проверяется, что он вообще возможен: на одном из зёрен восстают.
    let rebelled = tickPolitics(world, busyCrown, settlements, 60, createRng(3))
    let rebellions = rebelled.events.filter((event) => event.type === 'rebellion')
    for (let seed = 4; seed < 40 && rebellions.length === 0; seed += 1) {
      rebelled = tickPolitics(world, busyCrown, settlements, 60, createRng(seed))
      rebellions = rebelled.events.filter((event) => event.type === 'rebellion')
    }
    console.log(`мятежей за 60 суток при занятом архимаге: ${rebellions.length}`)
    expect(rebellions.length).toBeGreaterThan(0)

    const rebel = rebelled.politics.lords.find((candidate) => candidate.id === lord.id)
    expect(rebel?.kingdomId).toBe(null)
    // Мятеж — это война, а не заявление.
    expect(rebelled.politics.wars.some((war) => war.b === lord.id || war.a === lord.id)).toBe(true)
  })

  it('при свободном архимаге короны мятежа нет', () => {
    const lord = politics.lords[0]
    if (!lord) return
    const angry = {
      ...politics,
      lords: politics.lords.map((candidate) =>
        candidate.id === lord.id ? { ...candidate, loyalty: 5 } : candidate,
      ),
      archmages: {
        ...politics.archmages,
        [lord.kingdomId ?? '']: {
          kingdomId: lord.kingdomId ?? '',
          state: 'free' as const,
          untilDay: 9999,
        },
      },
    }
    const quiet = tickPolitics(world, angry, settlements, 60, createRng(3))
    expect(quiet.events.filter((event) => event.type === 'rebellion').length).toBe(0)
  })
})
