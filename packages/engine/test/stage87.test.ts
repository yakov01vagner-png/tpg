import { describe, expect, it } from 'vitest'
import { bandSize } from '../src/band'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { NAVY, WARSHIPS, WARSHIP_DEFS, WIND_DEFS } from '../src/content/navy'
import { PLAYER } from '../src/holding'
import {
  afloat,
  blockadeBite,
  blockadesOf,
  crownFleet,
  fleetCarries,
  fleetForce,
  fleetUpkeep,
  landingLoss,
  landingSites,
  navyOf,
  prizeAt,
  seaFight,
  seaLedger,
  seaSupplied,
  shipForce,
  windAt,
} from '../src/navy'
import { placeRep } from '../src/reputation'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { generateWorld } from '../src/world/generate'
import { isHarbour } from '../src/world/lanes'

/**
 * Этап 87: флот и десант.
 *
 * Море было дорогой: судно возило людей и товар. Войны на воде не было — а
 * значит, не было и того, что она делает с сушей: запертой гавани, берега,
 * взятого с моря, и торговли, которую душат, не переходя границы.
 */

const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const day = (state: GameState): GameState =>
  ok(
    applyCommand(ok(applyCommand(state, { type: 'rest', hours: 12 })), {
      type: 'rest',
      hours: 12,
    }),
  )

/** Своя гавань: без неё флот не заложить. */
function harbourOf(state: GameState): string {
  const found = Object.values(state.settlements).find(
    (one) => isHarbour(world, one.locationId) && one.population > 0,
  )
  if (!found) throw new Error('нет гавани')
  return found.locationId
}

function admiral(money = 80000): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money }), 1, world)
  const port = harbourOf(game)
  const settlement = game.settlements[port]
  if (!settlement) throw new Error('нет гавани')
  return {
    ...game,
    time: WORLD_START,
    locationId: port,
    quarter: null,
    character: { ...game.character, money },
    settlements: { ...game.settlements, [port]: { ...settlement, owner: PLAYER } },
    party: { ...game.party, units: { spearman: 60, archer: 20 }, morale: 70 },
  }
}

/** Флот на воде сразу: тестам незачем ждать восемьдесят суток стапеля. */
function withFleet(state: GameState, kinds: readonly ('ushkuy' | 'battleLadya' | 'nasad')[]) {
  const port = state.locationId
  return {
    ...state,
    navy: kinds.map((kind, index) => ({
      id: `ship:${index}`,
      kind,
      name: `Судно-${index}`,
      condition: 1,
      crew: WARSHIP_DEFS[kind].crew,
      portId: port,
      readyDay: 0,
    })),
  }
}

describe('Ф1: военный флот', () => {
  it('судно закладывают в своей гавани, и оно строится сутками', () => {
    const state = admiral()
    for (const kind of WARSHIPS) {
      const def = WARSHIP_DEFS[kind]
      console.log(
        `${def.label}: ${def.price} серебром, ${def.days} сут. стапеля, ${def.crew} рук, поднимает ${def.carries}, сила ${def.fight}, содержание ${def.upkeep} в сутки`,
      )
    }
    const laid = ok(applyCommand(state, { type: 'buildWarship', kind: 'ushkuy' }))
    const ship = navyOf(laid)[0]
    console.log(
      `${laid.log[laid.log.length - 1]?.text ?? ''} На плаву сейчас: ${afloat(laid, 1).length}`,
    )
    expect(ship?.readyDay).toBe(1 + WARSHIP_DEFS.ushkuy.days)
    expect(afloat(laid, 1)).toHaveLength(0)
    expect(laid.character.money).toBe(state.character.money - WARSHIP_DEFS.ushkuy.price)

    // В чужой гавани и в поле верфи нет.
    const inland = Object.values(world.locations).find((one) => !isHarbour(world, one.id))
    if (inland) {
      expect(
        applyCommand({ ...state, locationId: inland.id }, { type: 'buildWarship', kind: 'ushkuy' })
          .ok,
      ).toBe(false)
    }
  })

  it('флот считается силой, вместимостью и содержанием', () => {
    const fleet = withFleet(admiral(), ['ushkuy', 'battleLadya', 'nasad'])
    const ships = afloat(fleet, 1)
    const ledger = seaLedger(fleet, 1)
    console.log(ledger.says)
    expect(fleetForce(ships)).toBe(
      shipForce(ships[0] as never) + shipForce(ships[1] as never) + shipForce(ships[2] as never),
    )
    expect(fleetCarries(ships)).toBe(20 + 50 + 90)
    expect(fleetUpkeep(ships)).toBe(5 + 12 + 26)
  })
})

describe('Ф2: морское сражение', () => {
  it('ветер выводится из дня и места, а не из броска', () => {
    const port = harbourOf(admiral())
    const winds = [0, 1, 2, 3, 4].map((offset) => windAt(1 + offset * 3, port))
    console.log(
      `ветер у ${world.locations[port]?.name} по трёхдневкам: ${winds.map((one) => WIND_DEFS[one].label).join(', ')}`,
    )
    expect(windAt(10, port)).toBe(windAt(10, port))
    expect(new Set(winds).size).toBeGreaterThan(1)
  })

  it('сила, ветер и ход решают, чем кончится встреча', () => {
    const big = withFleet(admiral(), ['nasad', 'nasad', 'battleLadya'])
    const small = withFleet(admiral(), ['ushkuy'])
    const strong = afloat(big, 1)
    const weak = afloat(small, 1)
    const win = seaFight(strong, weak, 'fair', 0.5)
    const lose = seaFight(weak, strong, 'foul', 0.5)
    console.log(`сильный флот: ${win.says}`)
    console.log(`слабый флот: ${lose.says}`)
    expect(win.end === 'sunk' || win.end === 'boarded').toBe(true)
    expect(lose.end === 'lost' || lose.end === 'fled').toBe(true)
    // Ветер стоит своего: тот же бой при встречном ветре выходит хуже.
    const fair = seaFight(strong, strong, 'fair', 0.5)
    const foul = seaFight(strong, strong, 'foul', 0.5)
    console.log(`равные силы: в спину — ${fair.end}, в лицо — ${foul.end}`)
    expect(fair.ours).toBeGreaterThan(foul.ours)
  })

  it('у корон есть флот, и он выводится, а не хранится', () => {
    const state = admiral()
    const kingdoms = Object.keys(world.kingdoms)
    for (const kingdomId of kingdoms.slice(0, 4)) {
      const fleet = crownFleet(state, world, kingdomId, 1)
      console.log(
        `${kingdomId}: судов ${fleet.length}, сила ${fleetForce(fleet)}, гаваней ${new Set(fleet.map((one) => one.portId)).size}`,
      )
    }
    const first = kingdoms[0] as string
    expect(crownFleet(state, world, first, 1)).toEqual(crownFleet(state, world, first, 1))
  })
})

describe('Ф3: десант', () => {
  it('людей высаживают на чужой берег, и высадка стоит людей', () => {
    const fleet = withFleet(admiral(), ['battleLadya', 'nasad'])
    const shore = landingSites(world, fleet.locationId)[0]
    if (!shore) return
    const landedState = ok(applyCommand(fleet, { type: 'landTroops', locationId: shore, men: 40 }))
    const host = landedState.bands.find((one) => one.id.startsWith('landing:'))
    console.log(
      `${landedState.log[landedState.log.length - 1]?.text ?? ''} Потери на урезе: ${landingLoss(40, false)} из 40, на защищённом берегу — ${landingLoss(40, true)}`,
    )
    expect(host).toBeTruthy()
    expect(bandSize(host as never)).toBeLessThan(40)
    expect(landedState.party.units.spearman).toBe(20)
  })

  it('берег кормится с моря, пока гавань за тобой', () => {
    const fleet = withFleet(admiral(), ['battleLadya'])
    const shore = landingSites(world, fleet.locationId)[0]
    if (!shore) return
    const landedState = ok(applyCommand(fleet, { type: 'landTroops', locationId: shore, men: 30 }))
    const host = landedState.bands.find((one) => one.id.startsWith('landing:'))
    if (!host) return
    const fed = seaSupplied(landedState, world, host, 1)
    const sunk = seaSupplied({ ...landedState, navy: [] }, world, host, 1)
    console.log(`с флотом: ${fed.says} Без флота: ${sunk.says}`)
    expect(fed.fed).toBe(true)
    expect(sunk.fed).toBe(false)
  })
})

describe('Ф4: блокада', () => {
  it('запертая гавань беднеет, и это помнят', () => {
    const fleet = withFleet(admiral(), ['battleLadya', 'ushkuy'])
    const foe = Object.values(fleet.settlements).find(
      (one) =>
        isHarbour(world, one.locationId) &&
        one.owner !== PLAYER &&
        one.population > 0 &&
        landingSites(world, fleet.locationId).includes(one.locationId),
    )
    if (!foe) return
    const side = foe.owner?.startsWith('crown:')
      ? foe.owner.slice('crown:'.length)
      : (fleet.politics.lords.find((lord) => lord.id === foe.owner)?.kingdomId ?? null)
    if (!side) return
    const atWarState: GameState = {
      ...fleet,
      politics: {
        ...fleet.politics,
        wars: [{ a: PLAYER, b: side, since: 1, reason: 'война на воде' }],
      },
    }
    const shut = ok(applyCommand(atWarState, { type: 'blockadePort', locationId: foe.locationId }))
    expect(blockadesOf(shut)).toHaveLength(1)
    const bite = blockadeBite(shut, foe.locationId)
    const grainBefore = shut.settlements[foe.locationId]?.stock.grain ?? 0
    let run = shut
    for (let i = 0; i < 10; i += 1) {
      run = day(run)
    }
    const grainAfter = run.settlements[foe.locationId]?.stock.grain ?? 0
    console.log(
      `${world.locations[foe.locationId]?.name} заперт: хлеб ${Math.round(grainBefore)} → ${Math.round(grainAfter)}, память места ${Math.round(placeRep(run.reputation, foe.locationId))}, пошлины хозяину −${bite.toll} в сутки`,
    )
    expect(grainAfter).toBeLessThan(grainBefore)
    expect(placeRep(run.reputation, foe.locationId)).toBeLessThan(0)

    const lifted = ok(applyCommand(run, { type: 'liftBlockade', locationId: foe.locationId }))
    expect(blockadesOf(lifted)).toHaveLength(0)
  })

  it('без судов запор не держится', () => {
    const fleet = withFleet(admiral(), ['ushkuy'])
    const state: GameState = {
      ...fleet,
      blockades: [{ locationId: fleet.locationId, sinceDay: 1, ships: 1 }],
      navy: [],
    }
    const after = day(state)
    console.log(
      `флот потоплен: ${after.log.find((one) => one.text.includes('Запоры'))?.text ?? 'запор держится'}`,
    )
    expect(blockadesOf(after)).toHaveLength(0)
  })
})

describe('Ф4: чужой запор', () => {
  it('сильный чужой флот запирает твою гавань, и пошлина не идёт', () => {
    const game = createGame(createCharacter({ name: 'Ратша', money: 20000 }), 1, world)
    // Нужна своя гавань, у которой сосед по воде — чужая корона с флотом.
    let mineId: string | null = null
    let foe: string | null = null
    for (const one of Object.values(game.settlements)) {
      if (!isHarbour(world, one.locationId) || one.population <= 0) continue
      for (const neighbour of landingSites(world, one.locationId)) {
        const place = game.settlements[neighbour]
        const side = place?.owner?.startsWith('crown:')
          ? place.owner.slice('crown:'.length)
          : (game.politics.lords.find((lord) => lord.id === place?.owner)?.kingdomId ?? null)
        if (!side) continue
        if (crownFleet(game, world, side, 1).some((ship) => ship.portId === neighbour)) {
          mineId = one.locationId
          foe = side
          break
        }
      }
      if (mineId) break
    }
    if (!mineId || !foe) return
    const settlement = game.settlements[mineId] as never as { locationId: string }
    const war: GameState = {
      ...game,
      time: WORLD_START,
      locationId: mineId,
      quarter: null,
      navy: [],
      settlements: {
        ...game.settlements,
        [mineId]: { ...(settlement as never as object), owner: PLAYER } as never,
      },
      politics: {
        ...game.politics,
        wars: [{ a: PLAYER, b: foe, since: 1, reason: 'война на воде' }],
      },
    }
    const peace: GameState = { ...war, politics: { ...war.politics, wars: [] } }
    let run = war
    let quiet = peace
    for (let i = 0; i < 10; i += 1) {
      run = day(run)
      quiet = day(quiet)
    }
    const memory = placeRep(run.reputation, mineId)
    console.log(
      `своя гавань ${world.locations[mineId]?.name} против ${foe}: за десять суток казна ${run.character.money} против ${quiet.character.money} в мирное время, память места ${Math.round(memory)}`,
    )
    expect(memory).toBeLessThan(0)
    expect(run.character.money).toBeLessThan(quiet.character.money)
  })
})

describe('Ф5: корсары', () => {
  it('добыча одна, а имя разное: с грамотой это служба, без — разбой', () => {
    const fleet = withFleet(admiral(), ['ushkuy', 'ushkuy'])
    const target = Object.values(fleet.settlements).find(
      (one) =>
        isHarbour(world, one.locationId) &&
        one.owner !== PLAYER &&
        one.population > 0 &&
        landingSites(world, fleet.locationId).includes(one.locationId),
    )
    if (!target) return
    const prize = prizeAt(fleet, target.locationId)
    const raided = ok(applyCommand(fleet, { type: 'huntTrade', locationId: target.locationId }))
    console.log(
      `${world.locations[target.locationId]?.name}: добыча ${prize}, слава ${fleet.renown} → ${raided.renown}; отношения падают на ${NAVY.piracyRelations} без грамоты и на ${NAVY.letterRelations} с ней`,
    )
    expect(raided.character.money).toBe(fleet.character.money + prize)
    expect(raided.renown).toBeLessThanOrEqual(fleet.renown)
  })
})

describe('Ф6: море в отчёте', () => {
  it('счёт по флоту виден числом', () => {
    const empty = seaLedger(admiral(), 1)
    const fleet = seaLedger(withFleet(admiral(), ['ushkuy', 'battleLadya']), 1)
    console.log(`без флота: ${empty.says}`)
    console.log(`с флотом: ${fleet.says}`)
    expect(empty.ships).toBe(0)
    expect(fleet.ships).toBe(2)
    expect(fleet.upkeep).toBe(WARSHIP_DEFS.ushkuy.upkeep + WARSHIP_DEFS.battleLadya.upkeep)
  })
})
