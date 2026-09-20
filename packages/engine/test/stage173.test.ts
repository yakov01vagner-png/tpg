import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { MARCH } from '../src/content/march'
import { type Settlement, createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { landAlong, marchPlan, marchRoll, marchToll, trainOf } from '../src/march'
import type { Party } from '../src/party'
import { partySize } from '../src/party'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { roadsFrom } from '../src/world/queries'

/**
 * Этап 173: поход и снабжение.
 *
 * Поход считался временем: столько-то часов дороги. Хлеб, фураж, обоз и
 * отставшие либо не считались вовсе, либо считались врозь и после — и война
 * выходила дешевле, чем она есть.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const start =
  Object.values(settlements).find((one) => one.population > 900)?.locationId ??
  Object.keys(settlements)[0] ??
  ''
const next = roadsFrom(world, start)[0]?.to ?? start

function host(units: Record<string, number> = { spearman: 100, horseman: 20 }): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 9000 }), 1, world)
  const party: Party = { units, morale: 70, hungryDays: 0, gear: 0.5, veterans: 0 } as Party
  return {
    ...game,
    politics,
    settlements,
    time: WORLD_START,
    locationId: start,
    quarter: null,
    party,
  }
}

function ok(result: ReturnType<typeof applyCommand>): GameState {
  if (!result.ok) throw new Error(result.message)
  return result.state
}

describe('Пх1 и Пх2: войско ест, и земля кормит по-разному', () => {
  it('хлеб и фураж считаются из отряда, дороги и времени года', () => {
    const state = host()
    const plan = marchPlan(state, world, next, 1)
    console.log(plan.says)
    expect(plan.bread).toBeGreaterThan(0)
    expect(plan.fodder).toBeGreaterThan(0)
    expect(plan.days).toBeGreaterThan(0)
    // Зимний поход дороже летнего — тем же счётом.
    const winter = marchPlan(state, world, next, 350)
    console.log(`лето: хлеба ${plan.bread}, зима: ${winter.bread}`)
    expect(winter.bread).toBeGreaterThan(plan.bread)
    expect(MARCH.winter).toBeGreaterThan(1)
  })

  it('своя земля, чужая и разорённая стоят по-разному', () => {
    const state = host()
    const mine: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [next]: { ...(state.settlements[next] as Settlement), owner: PLAYER, banditry: 0 },
      },
    }
    const ruined: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [next]: { ...(state.settlements[next] as Settlement), banditry: 0.6 },
      },
    }
    console.log(landAlong(mine, world, next).says)
    console.log(landAlong(ruined, world, next).says)
    expect(landAlong(mine, world, next).kind).toBe('own')
    expect(landAlong(ruined, world, next).kind).toBe('ravaged')
    const own = marchPlan(mine, world, next, 1)
    const burnt = marchPlan(ruined, world, next, 1)
    console.log(`хлеба на дорогу: своей землёй ${own.bread}, разорённой ${burnt.bread}`)
    expect(burnt.bread).toBeGreaterThan(own.bread)
  })
})

describe('Пх3 и Пх4: обоз и то, что дорога делает с войском', () => {
  it('обоз считается весом, и по нему видно, на сколько суток хлеба', () => {
    const state = host()
    const train = trainOf(state.party)
    console.log(train.says)
    expect(train.carries).toBeGreaterThan(0)
    // Большему войску обоз нужен больше — и несёт оно тоже больше.
    expect(trainOf({ ...state.party, units: { spearman: 400 } } as Party).carries).toBeGreaterThan(
      train.carries,
    )
  })

  it('дорога отнимает людей: отставшие и больные', () => {
    const state = host({ spearman: 400 })
    const plan = marchPlan(state, world, next, 350)
    const toll = marchToll(plan, state.party)
    console.log(`${plan.says}\n${toll.says}`)
    expect(toll.lost).toBeGreaterThanOrEqual(0)
    expect(toll.left).toBeLessThanOrEqual(partySize(state.party))
    // Голодный поход отнимает больше, чем сытый.
    const light = marchToll(marchPlan(host({ spearman: 20 }), world, next, 1), {
      ...state.party,
      units: { spearman: 20 },
    } as Party)
    console.log(`малый отряд: ${light.says}`)
    expect(light.lost).toBeLessThanOrEqual(toll.lost)
  })
})

describe('Пх5 и Пх6: поход виден заранее и считан', () => {
  it('перед выходом сказано, во что он обойдётся', () => {
    const state = host()
    const after = ok(applyCommand(state, { type: 'travel', toLocationId: next }))
    const said = after.log.map((one) => one.text)
    const line = said.find((one) => one.includes('сут. пути, хлеба'))
    console.log(line)
    expect(line).toBeTruthy()
    // Одному человеку считать нечего: ему дорога стоит только времени.
    const alone = ok(
      applyCommand(
        { ...state, party: { ...state.party, units: { spearman: 2 } } },
        {
          type: 'travel',
          toLocationId: next,
        },
      ),
    )
    expect(alone.log.map((one) => one.text).some((one) => one.includes('хлеба'))).toBe(false)
  })

  it('десять походов в числах', () => {
    const state = host()
    const rows: { men: number; left: number; days: number }[] = []
    for (let i = 0; i < 10; i += 1) {
      const plan = marchPlan(state, world, next, 1 + i * 30)
      const toll = marchToll(plan, state.party)
      rows.push({ men: partySize(state.party), left: toll.left, days: plan.days })
    }
    const rolled = marchRoll(rows)
    console.log(rolled.says)
    expect(rolled.marches).toBe(10)
    expect(rolled.came).toBeLessThanOrEqual(rolled.went)
  })
})
