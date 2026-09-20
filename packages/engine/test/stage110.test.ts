import { describe, expect, it } from 'vitest'
import { bandSize } from '../src/band'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { ROLE_DEFS, SCOUT } from '../src/content/scout'
import { createSettlements } from '../src/economy'
import { lastSeen, visibleTo, whoSees } from '../src/fog'
import { PLAYER } from '../src/holding'
import { withPlaceRep } from '../src/reputation'
import { createRng } from '../src/rng'
import {
  askLocals,
  eyesCost,
  fightsAs,
  roleOf,
  scoutLedger,
  scoutsOf,
  screensOf,
} from '../src/scout'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 110: дозоры и завеса.
 *
 * Туман этапа 109 сказал, чего не видно. Здесь появляется цена того, чтобы
 * видеть: часть, посланная смотреть, видит дальше и хуже дерётся; заслон
 * закрывает своих; местные говорят тем больше, чем лучше тебя помнят.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const foe = kingdoms[1] as string
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function warlord(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 900)
    .slice(0, 4)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  const here = mine[0]?.locationId ?? game.locationId
  const theirLord = politics.lords.find((one) => one.kingdomId === foe)
  const far =
    Object.values(world.locations).find(
      (one) => one.id !== here && !mine.some((own) => own.locationId === one.id),
    )?.id ?? here
  return {
    ...game,
    politics: { ...politics, wars: [{ a: PLAYER, b: foe, since: 100, reason: 'марка' }] },
    settlements: map,
    locationId: here,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    party: { ...game.party, units: { militia: 80, spearman: 30 }, morale: 70 },
    bands: [
      {
        id: 'band:foe',
        lordId: theirLord?.id ?? 'lord:x',
        kingdomId: foe,
        units: { militia: 60 },
        morale: 60,
        locationId: far,
        travel: null,
        goal: { type: 'muster' },
        siegeDays: 0,
      },
    ],
  }
}

describe('Дз1: дозор видит дальше и дерётся хуже', () => {
  it('часть, посланная смотреть, меняет глаза на строй', () => {
    const state = warlord()
    const formed = ok(applyCommand(state, { type: 'formHost', troop: 'militia', count: 30 }))
    const host = formed.bands.find((one) => one.lordId === PLAYER)
    if (!host) throw new Error('части нет')

    const plainSight = visibleTo(formed, world, PLAYER).size
    const scouting = ok(applyCommand(formed, { type: 'setRole', hostId: host.id, role: 'scout' }))
    const scoutSight = visibleTo(scouting, world, PLAYER).size
    console.log(
      `обычная часть: видно ${plainSight} мест; дозор (${ROLE_DEFS.scout.hops} переходов): ${scoutSight}`,
    )
    expect(scoutSight).toBeGreaterThan(plainSight)
    expect(roleOf(scouting, host.id)).toBe('scout')

    console.log(
      `в бою дозор стоит ${Math.round(fightsAs(scouting, host.id) * 100)} из ста, обычная часть — ${Math.round(fightsAs(formed, host.id) * 100)}`,
    )
    expect(fightsAs(scouting, host.id)).toBeLessThan(1)
    expect(scoutsOf(scouting)).toHaveLength(1)

    // И решение отменяемо: часть возвращается в строй.
    const back = ok(applyCommand(scouting, { type: 'setRole', hostId: host.id, role: null }))
    expect(roleOf(back, host.id)).toBeNull()
  })
})

describe('Дз2: завеса', () => {
  it('заслон закрывает своих от чужих дозоров', () => {
    const state = warlord()
    // Своя часть стоит там, где её видит чужой город.
    const theirSeat = Object.values(state.settlements).find(
      (one) =>
        one.owner === `crown:${foe}` ||
        state.politics.lords.some((lord) => lord.id === one.owner && lord.kingdomId === foe),
    )
    if (!theirSeat) return
    const mine = {
      id: 'band:mine',
      lordId: PLAYER,
      kingdomId: PLAYER,
      units: { militia: 40 },
      morale: 70,
      locationId: theirSeat.locationId,
      travel: null,
      goal: { type: 'muster' } as const,
      siegeDays: 0,
    }
    const open: GameState = { ...state, bands: [...state.bands, mine] }
    const seen = whoSees(open, world, foe, mine, day)

    const screened: GameState = {
      ...open,
      bands: [...open.bands, { ...mine, id: 'band:screen', locationId: theirSeat.locationId }],
      roles: { 'band:screen': 'screen' },
    }
    const hidden = whoSees(screened, world, foe, mine, day)
    console.log(
      `без завесы их глаз: ${seen ? seen.eye : 'нет'}; под завесой: ${hidden ? hidden.eye : 'нет'}`,
    )
    expect(seen).not.toBeNull()
    expect(hidden).toBeNull()
    expect(screensOf(screened)).toHaveLength(1)
  })
})

describe('Дз3: разведка боем', () => {
  it('ударить и отойти — самый дорогой и самый точный способ узнать', () => {
    const state = warlord()
    const band = state.bands[0]
    if (!band) return
    const here: GameState = { ...state, bands: [{ ...band, locationId: state.locationId }] }
    const before = here.party.units.militia ?? 0
    const probed = ok(applyCommand(here, { type: 'probeBand', bandId: band.id }))
    console.log(probed.log.find((one) => one.text.startsWith('Ударили'))?.text)
    console.log(
      `ополчения ${before} → ${probed.party.units.militia ?? 0}, дух ${here.party.morale} → ${probed.party.morale}`,
    )
    expect(probed.party.morale).toBeLessThan(here.party.morale)
    expect((probed.words ?? []).some((one) => one.source === 'eyes')).toBe(true)
    const known = lastSeen(probed, world, PLAYER, band.id, day)
    console.log(`после пробы: ${known.says}`)
    expect(known.sure).toBe(true)
  })
})

describe('Дз4: местные', () => {
  it('холодная округа молчит, тёплая рассказывает', () => {
    const state = warlord()
    const band = state.bands[0]
    if (!band) return
    const near = world.roads[state.locationId]?.[0]?.to ?? state.locationId
    const close: GameState = { ...state, bands: [{ ...band, locationId: near }] }
    const cold = askLocals(
      { ...close, reputation: withPlaceRep(close.reputation, close.locationId, -20) },
      world,
      close.locationId,
      day,
    )
    const warm = askLocals(
      {
        ...close,
        reputation: withPlaceRep(close.reputation, close.locationId, SCOUT.askWarmRep + 10),
      },
      world,
      close.locationId,
      day,
    )
    console.log(`нелюбящие: ${cold.says}`)
    console.log(`любящие: ${warm.says}`)
    expect(cold.told).toHaveLength(0)
    expect(warm.told.length).toBeGreaterThan(0)

    // И это команда, которая стоит серебра и часов.
    const kindly: GameState = {
      ...close,
      reputation: withPlaceRep(close.reputation, close.locationId, SCOUT.askWarmRep + 10),
    }
    const asked = ok(applyCommand(kindly, { type: 'askLocals' }))
    console.log(
      `спросил: казна ${kindly.character.money} → ${asked.character.money}, вестей ${(asked.words ?? []).length}`,
    )
    expect(asked.character.money).toBe(kindly.character.money - SCOUT.askCost)
    expect((asked.words ?? []).length).toBeGreaterThan(0)
  })
})

describe('Дз5 и Дз6: цена глаз и счёт', () => {
  it('дозоры едят серебро каждые сутки — потому их и не держат много', () => {
    const state = warlord()
    const formed = ok(applyCommand(state, { type: 'formHost', troop: 'militia', count: 40 }))
    const host = formed.bands.find((one) => one.lordId === PLAYER)
    if (!host) return
    console.log(`без ролей в сутки: ${eyesCost(formed)}`)
    expect(eyesCost(formed)).toBe(0)

    const scouting = ok(applyCommand(formed, { type: 'setRole', hostId: host.id, role: 'scout' }))
    const perDay = eyesCost(scouting)
    console.log(
      `дозор в ${bandSize(host)} человек: ${perDay} серебра в сутки (${ROLE_DEFS.scout.perManDay} на человека)`,
    )
    expect(perDay).toBeGreaterThan(0)

    // Считается разницей: держава и так кормится, а дозор — чистый расход.
    let withScout = scouting
    let without = formed
    for (let step = 0; step < 10; step += 1) {
      withScout = ok(applyCommand(withScout, { type: 'tick', minutes: MINUTES_PER_DAY }))
      without = ok(applyCommand(without, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const scout = withScout.bands.find((one) => one.id === host.id)
    console.log(
      `за десять суток: без дозора казна ${without.character.money}, с дозором ${withScout.character.money} — разница ${without.character.money - withScout.character.money}`,
    )
    console.log(`в дозоре людей ${bandSize(host)} → ${scout ? bandSize(scout) : 0}`)
    expect(withScout.character.money).toBeLessThan(without.character.money)
    const later = withScout

    const ledger = scoutLedger(later)
    console.log(ledger.says)
    expect(ledger.scouts).toBe(1)
    expect(ledger.spent).toBeGreaterThan(0)
  })
})
