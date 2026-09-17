import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { PLAYER } from '../src/holding'
import { offersAt } from '../src/quest'
import { attitudeWord, isShunned, placeRep } from '../src/reputation'
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

function at(locationId: string, money = 1000): GameState {
  return { ...createGame(createCharacter({ name: 'Тест', money }), 1, world), locationId }
}

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

describe('имя', () => {
  it('хлеб в голодный город помнят дольше, чем в сытый', () => {
    const id = someplace('town')
    const base = at(id)
    const withGrain: GameState = {
      ...base,
      character: { ...base.character, inventory: { grain: 100 } },
    }
    const settlement = withGrain.settlements[id]
    if (!settlement) return

    const hungry: GameState = {
      ...withGrain,
      settlements: {
        ...withGrain.settlements,
        [id]: { ...settlement, stock: { ...settlement.stock, grain: 0, fish: 0 } },
      },
    }
    const toHungry = ok(applyCommand(hungry, { type: 'giveFood', amount: 40 }))
    const toFed = ok(applyCommand(withGrain, { type: 'giveFood', amount: 40 }))
    console.log(
      `за 40 мер хлеба: голодному городу ${placeRep(toHungry.reputation, id)}, ` +
        `сытому ${placeRep(toFed.reputation, id)}`,
    )
    expect(placeRep(toHungry.reputation, id)).toBeGreaterThan(placeRep(toFed.reputation, id))
  })

  it('ненавидящий город не пускает на порог', () => {
    const id = someplace('town')
    const hated: GameState = {
      ...at(id),
      reputation: { places: { [id]: -70 }, lords: {} },
    }
    expect(isShunned(placeRep(hated.reputation, id))).toBe(true)
    expect(attitudeWord(-70)).toBe('ненавидят')

    const result = applyCommand(hated, { type: 'work', jobId: 'unloadCarts' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('shunned')
  })

  it('своим уступают в цене', () => {
    const id = someplace('town')
    const stranger = at(id)
    const friend: GameState = { ...stranger, reputation: { places: { [id]: 80 }, lords: {} } }
    const buy = { type: 'buy', good: 'grain', amount: 20 } as const
    const spentBy = (state: GameState) =>
      state.character.money - ok(applyCommand(state, buy)).character.money
    console.log(`двадцать мер зерна: чужаку ${spentBy(stranger)}, своему ${spentBy(friend)}`)
    expect(spentBy(friend)).toBeLessThanOrEqual(spentBy(stranger))
  })
})

describe('поручения', () => {
  /** Место, у соседей которого неспокойно и голодно. */
  function troubled(): GameState {
    const id = someplace('town')
    const base = at(id)
    const settlements = { ...base.settlements }
    for (const [key, settlement] of Object.entries(settlements)) {
      settlements[key] = {
        ...settlement,
        banditry: 0.8,
        stock: { ...settlement.stock, grain: 0, fish: 0 },
      }
    }
    return { ...base, settlements }
  }

  it('рождаются из того, что в мире и правда происходит', () => {
    const quiet = at(someplace('town'))
    const bad = troubled()
    const offers = offersAt(bad)
    console.log(
      `поручений в спокойной округе: ${offersAt(quiet).length}, в неспокойной: ${offers.length}`,
    )
    expect(offers.length).toBeGreaterThan(offersAt(quiet).length)
    expect(offers.some((quest) => quest.type === 'clearBandits')).toBe(true)
    expect(offers.some((quest) => quest.type === 'bringFood')).toBe(true)
  })

  it('берутся, выполняются и оплачиваются', () => {
    const state = troubled()
    const offer = offersAt(state).find((quest) => quest.type === 'bringFood')
    if (!offer) return

    let current = ok(applyCommand(state, { type: 'takeQuest', questId: offer.id }))
    expect(current.quests.length).toBe(1)

    // Везём хлеб туда, куда просили.
    current = {
      ...current,
      locationId: offer.targetLocationId,
      character: { ...current.character, inventory: { grain: offer.amount } },
    }
    current = ok(applyCommand(current, { type: 'giveFood', amount: offer.amount }))
    current = { ...current, locationId: offer.issuerLocationId }

    const before = current.character.money
    const after = ok(applyCommand(current, { type: 'finishQuest', questId: offer.id }))
    console.log(`награда за хлеб: ${after.character.money - before}, слава ${after.renown}`)
    expect(after.character.money).toBeGreaterThan(before)
    expect(after.quests.length).toBe(0)
    expect(placeRep(after.reputation, offer.issuerLocationId)).toBeGreaterThan(0)
  })

  it('недоделанное не оплачивают', () => {
    const state = troubled()
    const offer = offersAt(state).find((quest) => quest.type === 'clearBandits')
    if (!offer) return
    const taken = ok(applyCommand(state, { type: 'takeQuest', questId: offer.id }))
    const early = applyCommand(taken, { type: 'finishQuest', questId: offer.id })
    expect(early.ok).toBe(false)
  })

  it('брошенное дело портит имя', () => {
    const state = troubled()
    const offer = offersAt(state)[0]
    if (!offer) return
    const taken = ok(applyCommand(state, { type: 'takeQuest', questId: offer.id }))
    const dropped = ok(applyCommand(taken, { type: 'abandonQuest', questId: offer.id }))
    expect(placeRep(dropped.reputation, offer.issuerLocationId)).toBeLessThan(0)
  })
})

describe('своё имя на карте', () => {
  function withHoldings(count: number): GameState {
    const base = at(someplace('town'), 500)
    const settlements = { ...base.settlements }
    const ids = Object.keys(settlements).slice(0, count)
    for (const id of ids) {
      const settlement = settlements[id]
      if (settlement) settlements[id] = { ...settlement, owner: PLAYER }
    }
    return { ...base, settlements, service: 'reEstiz' }
  }

  it('без земли провозглашать нечего', () => {
    const result = applyCommand(withHoldings(1), { type: 'proclaimRealm', name: 'Вольный край' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('requirements')
  })

  it('провозглашение ссорит с прежним сюзереном', () => {
    const state = ok(applyCommand(withHoldings(2), { type: 'proclaimRealm', name: 'Вольный край' }))
    expect(state.realm?.name).toBe('Вольный край')
    expect(state.service).toBe(null)
    expect(state.politics.wars.some((war) => war.b === PLAYER || war.a === PLAYER)).toBe(true)
  })

  it('лорда принимают, когда он не верен своим и знает тебя', () => {
    const realm = ok(applyCommand(withHoldings(2), { type: 'proclaimRealm', name: 'Вольный край' }))
    const lord = realm.politics.lords[0]
    if (!lord) return

    const tooLoyal = applyCommand(realm, { type: 'inviteLord', lordId: lord.id })
    expect(tooLoyal.ok).toBe(false)

    const ready: GameState = {
      ...realm,
      politics: {
        ...realm.politics,
        lords: realm.politics.lords.map((candidate) =>
          candidate.id === lord.id ? { ...candidate, loyalty: 20 } : candidate,
        ),
      },
      reputation: { ...realm.reputation, lords: { [lord.id]: 50 } },
    }
    const joined = ok(applyCommand(ready, { type: 'inviteLord', lordId: lord.id }))
    expect(joined.politics.lords.find((c) => c.id === lord.id)?.kingdomId).toBe(PLAYER)
  })
})
