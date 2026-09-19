import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import {
  GUARD_HIRE,
  GUARD_WAGE,
  INN_COST,
  MUTINY_MOOD,
  PIRATE_NAMES,
  SAILOR_HIRE,
  SAILOR_WAGE,
} from '../src/content/road'
import { CARAVAN_COST, tickEnterprises } from '../src/enterprise'
import type { Enterprise } from '../src/enterprise'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import {
  bountyFor,
  caravanMaster,
  crewMood,
  crewNeeded,
  crewOf,
  crewPace,
  guardLimit,
  guardWages,
  guardsOf,
  innIncome,
  moodWord,
  mutinous,
  ownRoads,
  patrolCost,
  patrolEffect,
  pirateLords,
  pirateNear,
  raidRisk,
  shipsAt,
  skipperOf,
  travellersAt,
  wagonsOf,
} from '../src/road'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START, dayOf } from '../src/time'
import { generateWorld } from '../src/world/generate'
import { isHarbour } from '../src/world/lanes'

/**
 * Этап 62: дела и дороги.
 *
 * Дорога перестаёт быть расстоянием, а море — расходом. У обоза есть караванщик
 * и охрана, у судна — шкипер и команда, у пристани — суда, у пиратов — имена.
 */

const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function hero(locationId: string, money = 6000): GameState {
  const base = createGame(createCharacter({ name: 'Т', money }), 1, world)
  return { ...base, locationId, quarter: null, time: WORLD_START }
}

const caravan = (invested = CARAVAN_COST, guards = 0): Enterprise => ({
  id: 'caravan:test',
  kind: 'caravan',
  locationId: 'a',
  homeId: 'a',
  awayId: 'b',
  travel: null,
  travelTarget: null,
  invested,
  managerId: null,
  cargo: {},
  earned: 0,
  guards,
})

describe('К1: караван как люди', () => {
  it('у обоза есть караванщик, повозки и охрана, и охрана меняет цену разбоя', () => {
    const master = caravanMaster('caravan:test')
    expect(master.name.length).toBeGreaterThan(2)
    // Он один на всю жизнь дела.
    expect(caravanMaster('caravan:test').temper).toBe(master.temper)
    expect(wagonsOf(caravan(1000))).toBeGreaterThan(wagonsOf(caravan(200)))
    const bare = raidRisk(caravan(400, 0), 0.5)
    const guarded = raidRisk(caravan(400, 4), 0.5)
    console.log(
      `${master.name}: повозок ${wagonsOf(caravan(400))}, риск без охраны ${bare.toFixed(2)}, с четырьмя ${guarded.toFixed(2)}`,
    )
    expect(guarded).toBeLessThan(bare)
    expect(guardWages(caravan(400, 4))).toBe(4 * GUARD_WAGE)
    expect(guardsOf(caravan(400, 99))).toBe(guardLimit(caravan(400)))
  })

  it('охрану нанимают, и обоз можно встретить в пути', () => {
    const village = Object.values(world.locations).find((one) => one.archetype === 'village')
    expect(village).toBeDefined()
    if (!village) return
    const road = world.roads[village.id]?.[0]
    expect(road).toBeDefined()
    if (!road) return
    const state = hero(village.id)
    const founded = ok(applyCommand(state, { type: 'foundCaravan', awayId: road.to }))
    const mine = founded.enterprises[0]
    expect(mine).toBeDefined()
    if (!mine) return
    const hired = ok(applyCommand(founded, { type: 'hireGuards', enterpriseId: mine.id, count: 2 }))
    expect(guardsOf(hired.enterprises[0] ?? mine)).toBe(2)
    expect(hired.character.money).toBe(founded.character.money - 2 * GUARD_HIRE)
    // Обоз стоит здесь же: к нему можно подойти.
    const met = ok(applyCommand(hired, { type: 'meetCaravan', enterpriseId: mine.id }))
    expect(met.log[met.log.length - 1]?.text).toContain('Повозок')
    // Охрана ест каждый день, идёт обоз или стоит.
    const fed = tickEnterprises(
      world,
      hired.settlements,
      hired.enterprises,
      () => 0,
      createRng(1),
      1,
    )
    expect(fed.income).toBeLessThanOrEqual(0)
  })
})

describe('К2: постоялый двор', () => {
  it('двор живёт проезжими, а на глухой дороге стоит пустым', () => {
    const busy = Object.values(world.locations)
      .filter((one) => (world.roads[one.id]?.length ?? 0) > 0)
      .sort((a, b) => (world.roads[b.id]?.length ?? 0) - (world.roads[a.id]?.length ?? 0))[0]
    expect(busy).toBeDefined()
    if (!busy) return
    const state = hero(busy.id)
    const traffic = travellersAt(world, state.settlements, busy.id)
    console.log(
      `${busy.name}: дорог ${world.roads[busy.id]?.length}, проезжих ${Math.round(traffic)} в сутки, двор берёт ${innIncome(world, state.settlements, busy.id)}`,
    )
    expect(traffic).toBeGreaterThan(4)
    const built = ok(applyCommand(state, { type: 'foundInn' }))
    expect(built.enterprises[0]?.kind).toBe('inn')
    expect(built.character.money).toBe(state.character.money - INN_COST)
    // Двор приносит сам, без игрока.
    const lived = ok(applyCommand(built, { type: 'tick', minutes: MINUTES_PER_DAY }))
    console.log(`двор за сутки принёс ${lived.enterprises[0]?.earned}`)
    expect(lived.enterprises[0]?.earned ?? 0).toBeGreaterThan(0)
    // Второй двор здесь же не ставят.
    expect(applyCommand(built, { type: 'foundInn' }).ok).toBe(false)
    // В разбойной округе не ездят.
    const troubled: GameState = {
      ...state,
      settlements: Object.fromEntries(
        Object.entries(state.settlements).map(([id, one]) => [id, { ...one, banditry: 1 }]),
      ),
    }
    expect(travellersAt(world, troubled.settlements, busy.id)).toBe(0)
  })
})

describe('К3: дорога с хозяином', () => {
  it('своя дорога — та, у которой твои оба конца, и её держат людьми', () => {
    // Нужны два соседних места с жителями: дорога к урочищу ничьей быть не
    // может, потому что у урочища нет хозяина.
    const base = hero('')
    const village = Object.values(world.locations).find(
      (one) =>
        base.settlements[one.id] !== undefined &&
        (world.roads[one.id] ?? []).some((road) => base.settlements[road.to] !== undefined),
    )
    if (!village) return
    const road = (world.roads[village.id] ?? []).find(
      (one) => base.settlements[one.to] !== undefined,
    )
    if (!road) return
    const state = hero(village.id)
    // Пока твой один конец — дорога не твоя.
    const here = state.settlements[village.id]
    const neighbour = state.settlements[road.to]
    expect(here).toBeDefined()
    expect(neighbour).toBeDefined()
    if (!here || !neighbour) return
    const half: GameState = {
      ...state,
      settlements: { ...state.settlements, [village.id]: { ...here, owner: PLAYER } },
    }
    expect(ownRoads(half)).toHaveLength(0)
    const both: GameState = {
      ...half,
      settlements: {
        ...half.settlements,
        [road.to]: { ...neighbour, owner: PLAYER, banditry: 0.5 },
      },
    }
    const mine = ownRoads(both)
    expect(mine.length).toBeGreaterThan(0)
    const patrolled = ok(applyCommand(both, { type: 'patrolRoad', toId: road.to, riders: 6 }))
    console.log(
      `разъезд до ${world.locations[road.to]?.name}: стоил ${patrolCost(mine[0] as never, 6)}, разбой 0.5 → ${patrolled.settlements[road.to]?.banditry}`,
    )
    expect(patrolled.settlements[road.to]?.banditry ?? 1).toBeLessThan(0.5)
    expect(patrolEffect(12)).toBeGreaterThan(patrolEffect(2))
    expect(patrolled.character.money).toBeLessThan(both.character.money)
    // Чужую дорогу не держат.
    expect(applyCommand(half, { type: 'patrolRoad', toId: road.to, riders: 6 }).ok).toBe(false)
  })
})

describe('К4: морской перевоз глубже', () => {
  it('у судна есть шкипер и команда, недобор рук замедляет ход, неплатёж кончается бунтом', () => {
    const port = Object.values(world.locations).find((one) => isHarbour(world, one.id))
    expect(port).toBeDefined()
    if (!port) return
    const state: GameState = {
      ...hero(port.id, 4000),
      ship: { kind: 'kogg', name: 'Пробный', condition: 1, crew: 0, mood: 60 },
    }
    const ship = state.ship
    if (!ship) return
    const skipper = skipperOf(ship)
    expect(skipper.name.length).toBeGreaterThan(2)
    expect(crewNeeded(ship)).toBeGreaterThan(2)
    // Пустая палуба идёт медленнее полной.
    const empty = crewPace(ship)
    const full = crewPace({ ...ship, crew: crewNeeded(ship) })
    console.log(
      `${skipper.name}: рук нужно ${crewNeeded(ship)}, ход пустым ×${empty.toFixed(2)}, полным ×${full.toFixed(2)}`,
    )
    expect(empty).toBeGreaterThan(full)

    const crewed = ok(applyCommand(state, { type: 'hireCrew', count: 4 }))
    expect(crewOf(crewed.ship as never)).toBe(4)
    expect(crewed.character.money).toBe(state.character.money - 4 * SAILOR_HIRE)
    const paid = ok(applyCommand(crewed, { type: 'payCrew' }))
    expect(crewMood(paid.ship as never)).toBeGreaterThan(crewMood(crewed.ship as never))
    expect(paid.character.money).toBe(crewed.character.money - 4 * SAILOR_WAGE * 30)

    // Без денег палуба ропщет и однажды уходит.
    let broke: GameState = { ...crewed, character: { ...crewed.character, money: 0 } }
    let mutinied = false
    for (let i = 0; i < 90; i += 1) {
      broke = ok(applyCommand(broke, { type: 'tick', minutes: MINUTES_PER_DAY }))
      if (!broke.ship) break
      if (crewOf(broke.ship) === 0) {
        mutinied = true
        break
      }
    }
    console.log(
      `без жалованья: настроение ${broke.ship ? crewMood(broke.ship) : '—'} (${broke.ship ? moodWord(crewMood(broke.ship)) : 'судна нет'}), бунт ${mutinied}`,
    )
    expect(MUTINY_MOOD).toBeGreaterThan(0)
    expect(mutinied || broke.ship === null).toBe(true)
    expect(mutinous({ ...ship, crew: 3, mood: 5 })).toBe(true)
  })
})

describe('К5: порт как место', () => {
  it('у пристани стоят суда, и с попутным шкипером уходят в его гавань', () => {
    const port = Object.values(world.locations).find((one) => isHarbour(world, one.id))
    if (!port) return
    const state = hero(port.id, 2000)
    const day = dayOf(state.time)
    const standing = shipsAt(world, port.id, day)
    expect(standing.length).toBeGreaterThan(1)
    console.log(
      `${port.name} на ${day} день: ${standing.map((one) => `«${one.name}» (${one.skipper}) из ${world.locations[one.fromId]?.name}, место ${one.berth}`).join('; ')}`,
    )
    // Завтра там другие: пристань живёт, но помнить о ней нечего.
    const tomorrow = shipsAt(world, port.id, day + 1)
    expect(tomorrow.map((one) => one.name).join()).not.toBe(standing.map((one) => one.name).join())
    // В деревне без моря никто не стоит.
    const inland = Object.values(world.locations).find((one) => !isHarbour(world, one.id))
    if (inland) expect(shipsAt(world, inland.id, day)).toHaveLength(0)
    const berth = standing[0]
    if (!berth) return
    const sailing = applyCommand(state, { type: 'takeBerth', shipId: berth.id })
    if (sailing.ok) {
      expect(sailing.state.journey?.toId ?? sailing.state.locationId).toBe(berth.fromId)
      expect(sailing.state.character.money).toBeLessThan(state.character.money)
    }
  })
})

describe('К6: пираты с лицом', () => {
  it('у пирата есть имя, гавань и цена за голову', () => {
    const lords = pirateLords(world)
    expect(lords.length).toBeGreaterThan(2)
    expect(lords.length).toBeLessThanOrEqual(PIRATE_NAMES.length)
    console.log(
      lords
        .map(
          (one) =>
            `${one.name} ${one.byname} из ${world.locations[one.lairId]?.name} (сила ${one.strength}, голова ${bountyFor(one)})`,
        )
        .join('; '),
    )
    // Они одни и те же: за головы тех, кто меняется каждый день, цену не дают.
    expect(pirateLords(world)[0]?.id).toBe(lords[0]?.id)
    const port = Object.values(world.locations).find((one) => isHarbour(world, one.id))
    if (!port) return
    expect(pirateNear(world, port.id)).not.toBeNull()
    // Охота: своим судном и не в одиночку.
    const alone = hero(port.id)
    expect(applyCommand(alone, { type: 'huntPirate', pirateId: lords[0]?.id ?? '' }).ok).toBe(false)
    const ready: GameState = {
      ...alone,
      ship: { kind: 'kogg', name: 'Пробный', condition: 1, crew: 6, mood: 70 },
      party: { units: { manAtArms: 12 }, morale: 80, hungryDays: 0, gear: 0.5 },
    }
    const hunting = ok(applyCommand(ready, { type: 'huntPirate', pirateId: lords[0]?.id ?? '' }))
    expect(hunting.battle?.enemy.name).toContain(lords[0]?.name ?? '')
    expect(hunting.battle?.foeId).toBe(lords[0]?.id)
  })
})
