import { describe, expect, it } from 'vitest'
import { bandSize } from '../src/band'
import {
  aimFor,
  campaignOf,
  campaignReport,
  dispatchDelay,
  frontsOf,
  hostsOf,
  supplyOf,
} from '../src/campaign'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { AIM_DEFS, SUPPLY } from '../src/content/campaign'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { placeRep } from '../src/reputation'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 84: кампания.
 *
 * Дружины ходили по карте, но война от этого не была решением: ни цели, ни
 * фронтов, ни обоза. Кампания добавляет то, из-за чего война становится
 * замыслом: зачем воюем, где, чем кормим и чем кончилось.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Государь с войском в отряде: из него и отделяют части. */
function warlord(): { state: GameState; mine: readonly string[] } {
  const base = createGame(createCharacter({ name: 'Ратша', money: 8000 }), 1, world)
  const taken = Object.values(settlements)
    .filter((one) => one.population > 1500)
    .sort((a, b) => b.population - a.population)
    .slice(0, 8)
  const map = { ...settlements }
  for (const one of taken) map[one.locationId] = { ...one, owner: PLAYER }
  const first = taken[0]
  if (!first) throw new Error('нет мест')
  return {
    state: {
      ...base,
      politics,
      settlements: map,
      locationId: first.locationId,
      quarter: null,
      time: WORLD_START,
      realm: { name: 'Заречье', sinceDay: 1 },
      renown: 40,
      party: { ...base.party, units: { militia: 60, spearman: 30 }, morale: 70 },
    },
    mine: taken.map((one) => one.locationId),
  }
}

describe('Ка1: цель войны', () => {
  it('цель выводится из повода, и её видно', () => {
    const { state } = warlord()
    const against = kingdoms[1] as string
    const warring: GameState = {
      ...state,
      politics: {
        ...state.politics,
        wars: [
          {
            a: PLAYER,
            b: against,
            since: 1,
            reason: 'спорная марка',
            casus: { kind: 'march', provinceId: 'x' },
          },
        ],
      },
    }
    const aim = aimFor(warring, against)
    console.log(`повод «спорная марка» → цель «${AIM_DEFS[aim].label}»: ${AIM_DEFS[aim].about}`)
    expect(aim).toBe('takeLand')
    const set = ok(applyCommand(warring, { type: 'setCampaign', against }))
    expect(campaignOf(set)?.aim).toBe('takeLand')
    expect(campaignOf(set)?.against).toBe(against)
    // Без войны кампании не бывает.
    expect(applyCommand(state, { type: 'setCampaign', against }).ok).toBe(false)
  })
})

describe('Ка5: свои части и приказы', () => {
  it('часть отделяется, стоит на карте и слушает приказ', () => {
    const { state, mine } = warlord()
    const formed = ok(applyCommand(state, { type: 'formHost', troop: 'militia', count: 40 }))
    const host = hostsOf(formed)[0]
    console.log(
      `часть: ${host ? bandSize(host) : 0} человек в ${world.locations[host?.locationId ?? '']?.name}; в отряде осталось ${formed.party.units.militia}`,
    )
    expect(hostsOf(formed)).toHaveLength(1)
    expect(formed.party.units.militia).toBe(20)
    if (!host) return

    const target = Object.values(state.settlements).find(
      (one) => one.owner !== PLAYER && one.population > 0,
    )
    if (!target) return
    const ordered = ok(
      applyCommand(formed, {
        type: 'orderHost',
        hostId: host.id,
        order: 'advance',
        targetId: target.locationId,
      }),
    )
    console.log(ordered.log.find((one) => one.text.startsWith('Приказ части'))?.text)
    expect(hostsOf(ordered)[0]?.goal.type).toBe('raid')

    // Свести можно там, где стоишь сам.
    const back = ok(applyCommand(formed, { type: 'recallHost', hostId: host.id }))
    expect(hostsOf(back)).toHaveLength(0)
    expect(back.party.units.militia).toBe(60)
  })

  it('донесение идёт тем дольше, чем дальше часть', () => {
    const { state, mine } = warlord()
    const near = mine[0] as string
    const far = Object.values(world.locations).find(
      (one) => one.id !== near && one.archetype === 'city',
    )
    if (!far) return
    const close = dispatchDelay(world, near, near)
    const away = dispatchDelay(world, far.id, near)
    console.log(`донесение: со своего двора ${close} суток, из ${far.name} — ${away}`)
    expect(close).toBe(0)
    expect(away).toBeGreaterThan(0)
  })
})

describe('Ка2 и Ка3: фронты и снабжение', () => {
  it('фронт — это провинция, где стоят твои части', () => {
    const { state } = warlord()
    expect(frontsOf(state, world)).toHaveLength(0)
    const formed = ok(applyCommand(state, { type: 'formHost', troop: 'militia', count: 30 }))
    const fronts = frontsOf(formed, world)
    console.log(
      fronts.map((one) => `${one.name}: людей ${one.men}, частей ${one.hosts}`).join('; '),
    )
    expect(fronts).toHaveLength(1)
    expect(fronts[0]?.men).toBe(30)
  })

  it('своя земля кормит из амбаров, чужая — с округи и за память', () => {
    const { state, mine } = warlord()
    const formed = ok(applyCommand(state, { type: 'formHost', troop: 'militia', count: 40 }))
    const host = hostsOf(formed)[0]
    if (!host) return
    const home = supplyOf(formed, world, host, 1)
    console.log(`на своей земле: ${home.kind} — ${home.says}, надо ${home.needs} хлеба в сутки`)
    expect(home.kind).toBe('depot')
    expect(home.needs).toBeCloseTo(40 * SUPPLY.perMan, 1)

    // Та же часть в чужом краю кормится с округи.
    const far = Object.values(state.settlements).find(
      (one) => one.owner !== PLAYER && one.population > 2000,
    )
    if (!far) return
    const away: GameState = {
      ...formed,
      bands: formed.bands.map((one) =>
        one.id === host.id ? { ...one, locationId: far.locationId } : one,
      ),
    }
    const abroad = supplyOf(away, world, { ...host, locationId: far.locationId }, 1)
    console.log(`в чужом краю: ${abroad.kind} — ${abroad.says}`)
    expect(abroad.kind).toBe('forage')

    // И это видно: за трое суток округа беднеет и помнит.
    let later = away
    for (let day = 0; day < 3; day += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    console.log(
      `${far.locationId}: память ${placeRep(away.reputation, far.locationId).toFixed(1)} → ${placeRep(later.reputation, far.locationId).toFixed(1)}`,
    )
    expect(placeRep(later.reputation, far.locationId)).toBeLessThan(
      placeRep(away.reputation, far.locationId),
    )
  })
})

describe('Ка6: итог кампании', () => {
  it('кампания кончается счётом', () => {
    const { state } = warlord()
    const against = kingdoms[1] as string
    const warring: GameState = {
      ...state,
      politics: {
        ...state.politics,
        wars: [{ a: PLAYER, b: against, since: 1, reason: 'проба', casus: { kind: 'raids' } }],
      },
    }
    const set = ok(applyCommand(warring, { type: 'setCampaign', against }))
    const campaign = campaignOf(set)
    if (!campaign) return
    const report = campaignReport(set, { ...campaign, taken: 3, lost: 40 }, campaign.sinceDay + 200)
    console.log(report.says)
    expect(report.taken).toBe(3)
    expect(report.says).toContain('месяцев')

    // Кончилась война — кончилась кампания, и счёт лёг в журнал.
    const peace: GameState = { ...set, politics: { ...set.politics, wars: [] } }
    const after = ok(applyCommand(peace, { type: 'tick', minutes: MINUTES_PER_DAY }))
    console.log(after.log.find((one) => one.text.startsWith('Кампания кончена'))?.text)
    expect(campaignOf(after)).toBeNull()
    expect(after.log.some((one) => one.text.startsWith('Кампания кончена'))).toBe(true)
  })
})
