import { describe, expect, it } from 'vitest'
import type { Band } from '../src/band'
import { bandSize, musterBands, tickBands } from '../src/band'
import { WARMIND } from '../src/content/warmind'
import type { Settlement } from '../src/economy'
import { createSettlements } from '../src/economy'
import { rollHarvest, tickDays } from '../src/life'
import { createRng } from '../src/rng'
import { createPolitics, tickPolitics } from '../src/war'
import {
  aimSideOf,
  avoidsBattle,
  fistReady,
  pickTarget,
  rallyPoint,
  relieveTarget,
  retreats,
  sideOfOwner,
  tooFewAlone,
  weakness,
} from '../src/warmind'
import { generateWorld } from '../src/world/generate'
import { neighbourSettlements } from '../src/world/queries'

/** Сколько переходов отсюда до соседей: тем же счётом, что у дружин. */
function hopsFrom(fromId: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const step of neighbourSettlements(world, fromId, 8)) out.set(step.id, step.hops)
  return out
}

/**
 * Этап 90: ИИ на войне.
 *
 * Дружины ходили поодиночке к ближайшему селу: сорок человек выходили со двора,
 * разоряли соседа и возвращались. Здесь появляется войско — собранное в кулак,
 * идущее к цели кампании, умеющее не принимать боя и выручать своих.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)

function band(over: Partial<Band> & { id: string; locationId: string }): Band {
  return {
    lordId: `crown:${kingdoms[0]}`,
    kingdomId: kingdoms[0] as string,
    units: { spearman: 20 },
    morale: 70,
    travel: null,
    goal: { type: 'muster' },
    siegeDays: 0,
    ...over,
  }
}

/** Место, которое держит эта корона. */
function placeOf(side: string): Settlement {
  const mine = new Set(
    politics.lords.filter((lord) => lord.kingdomId === side).map((lord) => lord.id),
  )
  const found = Object.values(settlements).find(
    (one) =>
      one.population > 0 && (one.owner === `crown:${side}` || (one.owner && mine.has(one.owner))),
  )
  if (!found) throw new Error(`нет земли у ${side}`)
  return found
}

describe('Во1: сбор сил', () => {
  it('горстью в поход не выходят: сперва сходятся к своим', () => {
    const seat = placeOf(kingdoms[0] as string)
    const small = band({ id: 'small', locationId: seat.locationId, units: { militia: 12 } })
    const big = band({ id: 'big', locationId: seat.locationId, units: { spearman: 60 } })
    console.log(
      `один в поле: ${bandSize(small)} человек — ${tooFewAlone(small) ? 'мало' : 'хватит'} (черта ${WARMIND.aloneLine}); кулак собран при ${WARMIND.fistLine}`,
    )
    expect(tooFewAlone(small)).toBe(true)
    expect(tooFewAlone(big)).toBe(false)
    expect(fistReady([small], small)).toBe(false)
    expect(fistReady([small, big], small)).toBe(true)

    const rally = rallyPoint(world, politics, settlements, [small, big], small)
    console.log(`место сбора для горсти: ${world.locations[rally ?? '']?.name ?? 'нет'}`)
    expect(rally).toBeTruthy()
  })
})

describe('Во2: маневр', () => {
  it('боя, который не выиграть, не принимают, и от сильного отступают', () => {
    const seat = placeOf(kingdoms[0] as string)
    const foeSeat = placeOf(kingdoms[1] as string)
    const warring = {
      ...politics,
      wars: [
        {
          a: kingdoms[0] as string,
          b: kingdoms[1] as string,
          since: 1,
          reason: 'спорная марка',
        },
      ],
    }
    const ours = band({ id: 'ours', locationId: seat.locationId, units: { spearman: 30 } })
    const theirs = band({
      id: 'theirs',
      locationId: foeSeat.locationId,
      lordId: `crown:${kingdoms[1]}`,
      kingdomId: kingdoms[1] as string,
      units: { spearman: 90 },
    })
    console.log(
      `тридцать против девяноста: боя ${avoidsBattle(warring, [ours, theirs], ours, foeSeat.locationId) ? 'не принимают' : 'принимают'} (черта ×${WARMIND.avoidLine})`,
    )
    expect(avoidsBattle(warring, [ours, theirs], ours, foeSeat.locationId)).toBe(true)
    const weaker = { ...theirs, units: { spearman: 20 } }
    expect(avoidsBattle(warring, [ours, weaker], ours, foeSeat.locationId)).toBe(false)

    // Отступают от того, кто уже стоит рядом.
    const pressed = { ...theirs, locationId: seat.locationId }
    console.log(
      `враг рядом: ${retreats(warring, [ours, pressed], ours) ? 'уходят' : 'стоят'} (черта ×${WARMIND.retreatLine})`,
    )
    expect(retreats(warring, [ours, pressed], ours)).toBe(true)
  })
})

describe('Во3 и Во5: цель кампании и слабые места', () => {
  it('цель выбирают по войне и по слабости, а не по близости', () => {
    const side = kingdoms[0] as string
    const foe = kingdoms[1] as string
    const warring = {
      ...politics,
      wars: [{ a: side, b: foe, since: 1, reason: 'спорная марка' }],
    }
    expect(aimSideOf(warring, side)).toBe(foe)

    const seat = placeOf(side)
    const hops = hopsFrom(seat.locationId)
    // Берём цели пошире: в списке должна быть и земля врага, и третья сила.
    const wide = new Map<string, number>()
    for (const step of neighbourSettlements(world, seat.locationId, 8)) {
      wide.set(step.id, step.hops)
    }
    const targets = Object.values(settlements)
      .filter((one) => one.population > 0)
      .slice(0, 80)
      .map((one) => one.locationId)
    // В списке есть земля и той короны, с которой война, и третьих сил.
    const foeTargets = targets.filter(
      (id) => sideOfOwner(warring, settlements[id]?.owner ?? null) === foe,
    )
    const aimed = pickTarget(settlements, warring, targets, wide, foe)
    const blind = pickTarget(settlements, warring, targets, wide, null)
    const aimedPlace = settlements[aimed ?? '']
    const blindPlace = settlements[blind ?? '']
    console.log(
      `с целью кампании: ${world.locations[aimed ?? '']?.name} (слабость ${aimedPlace ? weakness(aimedPlace) : 0}, переходов ${wide.get(aimed ?? '')}); без неё: ${world.locations[blind ?? '']?.name} (слабость ${blindPlace ? weakness(blindPlace) : 0})`,
    )
    expect(aimed).toBeTruthy()
    console.log(
      `в списке ${targets.length} мест, из них земли ${foe} — ${foeTargets.length}; выбрано ${sideOfOwner(warring, aimedPlace?.owner ?? null) === foe ? 'её' : 'чужое'}`,
    )
    if (foeTargets.length > 0) {
      expect(sideOfOwner(warring, aimedPlace?.owner ?? null)).toBe(foe)
    }
    // Слабое место весит больше крепкого при прочих равных.
    const weak = { ...(settlements[targets[0] as string] as Settlement), garrison: {} }
    const strong = {
      ...(settlements[targets[1] as string] as Settlement),
      garrison: { spearman: 60 },
    }
    console.log(
      `пустой гарнизон — слабость ${weakness(weak)}, шесть десятков — ${weakness(strong)}`,
    )
    expect(weakness(weak)).toBeGreaterThan(weakness(strong))
  })
})

describe('Во4: оборона', () => {
  it('своих выручают, если есть чем', () => {
    const side = kingdoms[0] as string
    const foe = kingdoms[1] as string
    const warring = {
      ...politics,
      wars: [{ a: side, b: foe, since: 1, reason: 'спорная марка' }],
    }
    const mine = placeOf(side)
    const reach = hopsFrom(mine.locationId)
    const near = Object.values(settlements).find(
      (one) => one.locationId !== mine.locationId && reach.has(one.locationId),
    )
    if (!near) return
    const ours = band({ id: 'ours', locationId: near.locationId, units: { spearman: 40 } })
    const besieger = band({
      id: 'foe',
      locationId: mine.locationId,
      lordId: `crown:${foe}`,
      kingdomId: foe,
      units: { spearman: 25 },
      goal: { type: 'siege', targetId: mine.locationId },
    })
    const target = relieveTarget(world, warring, settlements, [ours, besieger], ours)
    console.log(
      `осаждён ${world.locations[mine.locationId]?.name}: выручать ${target ? 'идут' : 'не идут'} (своих 40 против 25)`,
    )
    const big = { ...besieger, units: { spearman: 200 } }
    const hopeless = relieveTarget(world, warring, settlements, [ours, big], ours)
    console.log(`против двух сотен: выручать ${hopeless ? 'идут' : 'не идут'}`)
    expect(hopeless).toBe(null)
  })
})

describe('Во6: война в отчёте', () => {
  it('за десять лет походы стали осмысленнее', () => {
    let places: Readonly<Record<string, Settlement>> = settlements
    let pol = politics
    let rng = createRng(1007)
    const [initial] = musterBands(pol, places, createRng(8))
    let bands: readonly Band[] = initial
    let raids = 0
    let taken = 0
    let sieges = 0
    let marched = 0
    let menAtStrike = 0
    let strikes = 0
    for (let day = 1; day <= 360 * 10; day += 1) {
      const life = tickDays(world, places, 1)
      places = life.settlements
      const turn = tickPolitics(world, pol, places, day, rng)
      pol = turn.politics
      places = turn.settlements
      rng = turn.rng
      const before = bands
      const march = tickBands(world, pol, places, bands, rng, day)
      bands = march.bands
      places = march.settlements
      pol = march.politics
      rng = march.rng
      for (const one of bands) {
        const was = before.find((other) => other.id === one.id)
        if (
          was &&
          was.goal.type === 'muster' &&
          (one.goal.type === 'raid' || one.goal.type === 'siege')
        ) {
          marched += 1
          menAtStrike += bandSize(one)
          strikes += 1
        }
      }
      for (const event of march.events) {
        if (event.type === 'bandRaid') raids += 1
        if (event.type === 'bandTook') taken += 1
        if (event.type === 'bandSiege') sieges += 1
      }
    }
    const hits = raids + taken
    console.log(
      `за десять лет: выходов в поход ${marched}, набегов ${raids}, осад ${sieges}, взято мест ${taken}; в среднем в походе ${Math.round(menAtStrike / Math.max(1, strikes))} человек; на один выход приходится ${(hits / Math.max(1, marched)).toFixed(2)} дела`,
    )
    expect(marched).toBeGreaterThan(0)
    // Войско выходит кулаком, а не горстью.
    expect(menAtStrike / Math.max(1, strikes)).toBeGreaterThan(WARMIND.aloneLine)
    expect(hits).toBeGreaterThan(0)
  })
})
