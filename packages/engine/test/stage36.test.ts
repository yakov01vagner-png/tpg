import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements, priceOf } from '../src/economy'
import { SHIPPING_COST } from '../src/enterprise'
import { carryingCapacity, seaCatch, tickDays } from '../src/life'
import { offersAt } from '../src/quest'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { generateWorld } from '../src/world/generate'
import { lanesFrom } from '../src/world/lanes'
import { isSettlement } from '../src/world/types'

/**
 * Этап 36: море кормит.
 *
 * До 0.5 «побережье» было названием местности: деревня в получасе от прибоя и
 * деревня в трёх днях от него кормились и торговали одинаково. Теперь кормит
 * вода: на берегу ловят рыбу, ею живут и её же не могут вывезти — рыба не
 * доезжает. А корабль перестал быть только способом добраться: им возят чужое
 * и им торгуют.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const harbour = (() => {
  for (const place of Object.values(world.locations)) {
    const lanes = lanesFrom(world, place.id)
    if (lanes.length > 0 && lanes[0]) return { id: place.id, lane: lanes[0] }
  }
  throw new Error('в мире нет гаваней')
})()

function atHarbour(money = 20000): GameState {
  return {
    ...createGame(createCharacter({ name: 'Т', money }), 1, world),
    locationId: harbour.id,
  }
}

describe('цена знает про море', () => {
  it('рыба дёшева у воды и дорога в глубине', () => {
    const settlements = createSettlements(world)
    const shore: number[] = []
    const inland: number[] = []
    for (const [id, one] of Object.entries(settlements)) {
      const place = world.locations[id]
      if (!place || !isSettlement(place.archetype) || one.population <= 0) continue
      ;(place.shore ? shore : inland).push(priceOf(world, one, 'fish'))
    }
    const middle = (all: number[]) => all.sort((a, b) => a - b)[Math.floor(all.length / 2)] ?? 0
    console.log(
      `рыба: на берегу ${middle(shore)} (${shore.length} мест), в глубине ${middle(inland)} (${inland.length})`,
    )
    expect(shore.length).toBeGreaterThan(10)
    expect(middle(shore)).toBeLessThan(middle(inland))
  })

  it('берег — это вода рядом, а не название местности', () => {
    // Место может стоять в провинции «побережье» и не выходить к воде — и
    // наоборот. Считается именно вода (этап 36).
    const coastal = Object.values(world.locations).filter((one) => one.terrain === 'coast')
    const dryCoast = coastal.filter((one) => !one.shore)
    const wetInland = Object.values(world.locations).filter(
      (one) => one.terrain !== 'coast' && one.shore,
    )
    console.log(
      `«побережье» без воды: ${dryCoast.length} из ${coastal.length}; вода без «побережья»: ${wetInland.length}`,
    )
    expect(wetInland.length).toBeGreaterThan(0)
  })
})

describe('море кормит берег, а не королевство', () => {
  it('на берегу земля держит больше людей', () => {
    const port = Object.values(world.locations).find((one) => one.archetype === 'port' && one.shore)
    expect(port).toBeDefined()
    if (!port) return
    expect(seaCatch(port.archetype, port.shore)).toBeGreaterThan(1)
    const settlements = createSettlements(world)
    // Ёмкость с морем больше, чем та же земля без моря.
    const withSea = carryingCapacity(world, port.id, settlements[port.id])
    const withoutSea = carryingCapacity(
      { ...world, locations: { ...world.locations, [port.id]: { ...port, shore: false } } },
      port.id,
      settlements[port.id],
    )
    expect(withSea).toBeGreaterThan(withoutSea)
  })

  it('рыбу не развозят по стране: улов кормит тот берег, который его взял', () => {
    const settlements = createSettlements(world)
    // Голодный материк и сытый берег: если бы рыбу возили, за год разница
    // сошлась бы.
    const hungry: Record<string, (typeof settlements)[string]> = {}
    for (const [id, one] of Object.entries(settlements)) {
      const shore = world.locations[id]?.shore === true
      hungry[id] = shore
        ? one
        : { ...one, stock: { ...one.stock, grain: 0, fish: 0 }, harvest: 0.5 }
    }
    const after = tickDays(world, hungry, 60).settlements
    let moved = 0
    for (const [id, one] of Object.entries(after)) {
      if (world.locations[id]?.shore) continue
      moved += one.stock.fish
    }
    console.log(`рыбы в глубине страны через 60 суток голода: ${moved.toFixed(0)}`)
    expect(moved).toBeLessThan(1)
  })
})

describe('корабль кормит хозяина', () => {
  it('в гавани дают фрахт, и без судна его не взять', () => {
    const state = atHarbour()
    const freight = offersAt(state).find((quest) => quest.type === 'freight')
    expect(freight, 'фрахта не предлагают').toBeDefined()
    if (!freight) return
    expect(freight.reward).toBeGreaterThan(100)

    const without = applyCommand(state, { type: 'takeQuest', questId: freight.id })
    expect(without.ok).toBe(false)
    if (!without.ok) expect(without.code).toBe('requirements')

    const withShip = ok(applyCommand(state, { type: 'buyShip', kind: 'ladya' }))
    const taken = ok(applyCommand(withShip, { type: 'takeQuest', questId: freight.id }))
    expect(taken.quests).toHaveLength(1)

    // Платят там, где груз ждут: за наградой не возвращаются.
    const back = applyCommand(taken, { type: 'finishQuest', questId: freight.id })
    expect(back.ok).toBe(false)
    const delivered: GameState = { ...taken, locationId: freight.targetLocationId }
    const paid = ok(applyCommand(delivered, { type: 'finishQuest', questId: freight.id }))
    expect(paid.character.money).toBe(delivered.character.money + freight.reward)
  })

  it('судно уходит в дело и возвращается из него', () => {
    const bought = ok(applyCommand(atHarbour(), { type: 'buyShip', kind: 'ladya' }))
    const venture = ok(applyCommand(bought, { type: 'foundShipping', awayId: harbour.lane.to }))
    // Судно ушло в дело: плавать больше не на чем.
    expect(venture.ship).toBeNull()
    expect(venture.enterprises).toHaveLength(1)
    expect(venture.enterprises[0]?.kind).toBe('shipping')
    expect(venture.enterprises[0]?.ship).toBe('ladya')
    expect(venture.character.money).toBe(bought.character.money - SHIPPING_COST)
    const own = applyCommand(venture, {
      type: 'sail',
      toLocationId: harbour.lane.to,
      manner: 'own',
    })
    expect(own.ok).toBe(false)

    const closed = ok(
      applyCommand(venture, {
        type: 'closeEnterprise',
        enterpriseId: venture.enterprises[0]?.id ?? '',
      }),
    )
    expect(closed.ship?.kind).toBe('ladya')
  })

  it('морской торг приносит и однажды тонет', () => {
    let earned = 0
    let sunk = 0
    let raided = 0
    for (let seed = 1; seed <= 12; seed += 1) {
      const bought = ok(
        applyCommand(
          { ...atHarbour(9000), rng: { state: seed * 977 } },
          { type: 'buyShip', kind: 'ladya' },
        ),
      )
      let current = ok(applyCommand(bought, { type: 'foundShipping', awayId: harbour.lane.to }))
      for (let day = 0; day < 200; day += 1) {
        const step = applyCommand(current, { type: 'tick', minutes: 1440 })
        if (!step.ok) break
        current = step.state
        for (const event of step.events) {
          const text = 'text' in event ? String(event.text) : ''
          if (text.includes('не дошло')) sunk += 1
          if (text.includes('обобрали')) raided += 1
        }
        if (current.enterprises.length === 0) break
      }
      earned += current.enterprises[0]?.earned ?? 0
    }
    console.log(
      `за 12 судов по 200 суток: заработано ${earned}, обобрано ${raided}, утонуло ${sunk}`,
    )
    expect(earned).toBeGreaterThan(0)
    expect(sunk).toBeGreaterThan(0)
  })
})

describe('морской разбой', () => {
  it('от пиратов можно откупиться, и это стоит духа', () => {
    // Свести герою пиратов: бой с ними начинается в море.
    let state: GameState = {
      ...atHarbour(4000),
      party: { units: { militia: 8 }, morale: 70, hungryDays: 0, gear: 0.2 },
    }
    let met: GameState | null = null
    for (let seed = 1; seed <= 200 && !met; seed += 1) {
      let current: GameState = { ...state, rng: { state: seed * 613 } }
      const started = applyCommand(current, {
        type: 'sail',
        toLocationId: harbour.lane.to,
        manner: 'hire',
      })
      if (!started.ok) continue
      current = started.state
      for (let hour = 0; hour < 120 && current.journey && !current.battle; hour += 1) {
        const step = applyCommand(current, { type: 'tick', minutes: 60 })
        if (!step.ok) break
        current = step.state
      }
      // С этапа 62 у пирата есть имя: в бою стоит не «пираты», а морской лорд.
      if (current.battle && current.battle.foeId !== null) met = current
    }
    expect(met, 'пираты так и не встретились').not.toBeNull()
    if (!met) return
    state = met
    const paid = ok(applyCommand(state, { type: 'payTribute' }))
    expect(paid.battle).toBeNull()
    expect(paid.character.money).toBeLessThan(state.character.money)
    expect(paid.party.morale).toBeLessThan(state.party.morale)
    // И путь продолжается: откупились, а не вернулись.
    expect(paid.journey).not.toBeNull()
  })

  it('на суше откупаться не у кого', () => {
    const state = atHarbour()
    expect(applyCommand(state, { type: 'payTribute' }).ok).toBe(false)
  })
})
