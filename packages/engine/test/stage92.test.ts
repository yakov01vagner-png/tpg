import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { CROWN_DEED_DEFS, MEMORY, STYLE_DEFS } from '../src/content/memory'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import {
  crownMemory,
  crownRecalls,
  memoryScore,
  opinionPrice,
  playStyle,
  worldOpinion,
} from '../src/memory'
import { withPlaceRep } from '../src/reputation'
import { createRng } from '../src/rng'
import { reignOf } from '../src/royal'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 92: ИИ помнит.
 *
 * Места помнили тебя с этапа 6, лорды — с 66-го, короны — ничего. Здесь память
 * появляется у сил: она выводится из того, что с ними было, стареет по-разному,
 * слабеет вдвое со сменой государя и читается в словах и в цене.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const foe = kingdoms[1] as string

function ruler(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world)
  const taken = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, 6)
  const map = { ...settlements }
  for (const one of taken) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    politics,
    settlements: map,
    time: WORLD_START,
    locationId: taken[0]?.locationId ?? game.locationId,
    quarter: null,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

/** Места этой короны: по ним считается, кого ты жёг, а кого кормил. */
function placesOf(state: GameState, side: string): readonly string[] {
  const mine = new Set(
    state.politics.lords.filter((lord) => lord.kingdomId === side).map((lord) => lord.id),
  )
  return Object.values(state.settlements)
    .filter((one) => one.owner === `crown:${side}` || (one.owner && mine.has(one.owner)))
    .map((one) => one.locationId)
}

describe('Па1: память о тебе', () => {
  it('корона помнит то, что с ней было, — и это выводится из мира', () => {
    const state = ruler()
    const blank = crownMemory(state, world, foe, 400)
    console.log(`без дел: ${crownRecalls(state, world, foe, 400)}`)
    expect(blank).toHaveLength(0)

    const warred: GameState = {
      ...state,
      politics: {
        ...state.politics,
        wars: [{ a: PLAYER, b: foe, since: 100, reason: 'спорная марка' }],
      },
      peaces: [
        {
          against: foe,
          day: 90,
          terms: ['land', 'tribute'],
          mediator: null,
          harshness: 5,
          yielded: foe,
        },
      ],
    }
    let sacked = warred
    for (const id of placesOf(warred, foe).slice(0, 3)) {
      sacked = { ...sacked, reputation: withPlaceRep(sacked.reputation, id, -40) }
    }
    const memory = crownMemory(sacked, world, foe, 400)
    for (const one of memory) {
      console.log(
        `${CROWN_DEED_DEFS[one.deed].label}: вес ${one.weight} (забывается наполовину за ${CROWN_DEED_DEFS[one.deed].halfLife} лет) — «${one.says}»`,
      )
    }
    console.log(`общий счёт памяти: ${memoryScore(sacked, world, foe, 400)}`)
    expect(memory.length).toBeGreaterThan(1)
    expect(memoryScore(sacked, world, foe, 400)).toBeLessThan(0)
  })
})

describe('Па5: прощение', () => {
  it('обиды стареют — и не все одинаково', () => {
    const state = ruler()
    const war: GameState = {
      ...state,
      politics: {
        ...state.politics,
        wars: [],
      },
      peaces: [
        {
          against: foe,
          day: 100,
          terms: ['tribute'],
          mediator: null,
          harshness: 2,
          yielded: foe,
        },
      ],
      treaties: [
        {
          id: 'treaty:old',
          kind: 'peace',
          a: PLAYER,
          b: foe,
          sinceDay: 100,
          untilDay: 5000,
          brokenBy: PLAYER,
        },
      ],
    }
    const fresh = crownMemory(war, world, foe, 200)
    const old = crownMemory(war, world, foe, 100 + 365 * 12)
    const weightOf = (rows: typeof fresh, deed: string) =>
      Math.abs(rows.find((one) => one.deed === deed)?.weight ?? 0)
    console.log(
      `через год: война ${weightOf(fresh, 'warred')}, нарушенное слово ${weightOf(fresh, 'broke')}; через двенадцать лет: ${weightOf(old, 'warred')} и ${weightOf(old, 'broke')}`,
    )
    expect(weightOf(old, 'warred')).toBeLessThan(weightOf(fresh, 'warred'))
    // Нарушенное слово держится дольше войны.
    expect(weightOf(old, 'broke')).toBeGreaterThan(weightOf(old, 'warred'))
  })
})

describe('Па4: наследники помнят вполовину', () => {
  it('дело прежнего государя весит вдвое меньше', () => {
    const state = ruler()
    // Граница колен: день, на котором государь сменяется.
    let boundary = 200
    while (reignOf(foe, boundary) === reignOf(foe, 100) && boundary < 40000) boundary += 60
    const day = boundary + 60
    const generation = reignOf(foe, day)
    const earlier = reignOf(foe, 100)
    const war: GameState = {
      ...state,
      politics: { ...state.politics, wars: [] },
      peaces: [
        { against: foe, day: 100, terms: ['tribute'], mediator: null, harshness: 2, yielded: foe },
      ],
    }
    const atOnce = crownMemory(war, world, foe, 200)
    const later = crownMemory(war, world, foe, day)
    console.log(
      `колено на 100-й день — ${earlier}, на ${day}-й — ${generation}; вес войны ${Math.abs(atOnce[0]?.weight ?? 0)} → ${Math.abs(later[0]?.weight ?? 0)} (наследник помнит ×${MEMORY.heirShare})`,
    )
    expect(generation).toBeGreaterThan(earlier)
    expect(Math.abs(later[0]?.weight ?? 0)).toBeLessThan(Math.abs(atOnce[0]?.weight ?? 0))
  })
})

describe('Па2: твой стиль', () => {
  it('мир видит, каким способом ты играешь, и отвечает на это', () => {
    const state = ruler()
    const warlike: GameState = {
      ...state,
      character: { ...state.character, money: 100 },
      peaces: [
        { against: foe, day: 10, terms: ['land'], mediator: null, harshness: 3, yielded: foe },
        {
          against: kingdoms[2] as string,
          day: 20,
          terms: ['land'],
          mediator: null,
          harshness: 3,
          yielded: foe,
        },
      ],
    }
    const trader: GameState = { ...state, character: { ...state.character, money: 400000 } }
    const schemer: GameState = {
      ...state,
      character: { ...state.character, money: 100 },
      spies: [
        { id: 'spy:1', kingdomId: foe, seat: 'court', sinceDay: 1 },
        { id: 'spy:2', kingdomId: kingdoms[2] as string, seat: 'court', sinceDay: 1 },
      ],
      rumours: [{ against: foe, untilDay: 400 }],
    }
    console.log(playStyle(warlike, 100).says)
    console.log(playStyle(trader, 100).says)
    console.log(playStyle(schemer, 100).says)
    expect(playStyle(warlike, 100).id).toBe('warlike')
    expect(playStyle(trader, 100).id).toBe('trader')
    expect(playStyle(schemer, 100).id).toBe('schemer')
    for (const id of ['warlike', 'trader', 'schemer', 'builder'] as const) {
      expect(STYLE_DEFS[id].answer.length).toBeGreaterThan(10)
    }
  })
})

describe('Па3 и Па6: общее мнение и цена', () => {
  it('мнение складывается и читается в цене, а не в числе на экране', () => {
    const state = ruler()
    const opinion = worldOpinion(state, world, 200)
    console.log(opinion.says)
    expect(opinion.friends.length + opinion.foes.length + opinion.wary.length).toBe(kingdoms.length)

    // Там, где тебя держат за врага, всё дороже.
    let hated: GameState = {
      ...state,
      politics: {
        ...state.politics,
        wars: [{ a: PLAYER, b: foe, since: 100, reason: 'война' }],
      },
      peaces: [
        {
          against: foe,
          day: 60,
          terms: ['land' as const],
          mediator: null,
          harshness: 6,
          yielded: foe,
        },
        {
          against: foe,
          day: 120,
          terms: ['land' as const],
          mediator: null,
          harshness: 6,
          yielded: foe,
        },
      ],
      treaties: [
        {
          id: 'treaty:test2',
          kind: 'peace' as const,
          a: PLAYER,
          b: foe,
          sinceDay: 60,
          untilDay: 4000,
          brokenBy: PLAYER,
        },
      ],
    }
    for (const id of placesOf(hated, foe).slice(0, 4)) {
      hated = { ...hated, reputation: withPlaceRep(hated.reputation, id, -45) }
    }
    const theirPlace = placesOf(hated, foe)[0] as string
    const factor = opinionPrice(hated, world, theirPlace, 200)
    // Воителю дорого, торговому человеку — ещё дороже: с него есть что взять.
    const asWarrior = opinionPrice(
      { ...hated, character: { ...hated.character, money: 200 } },
      world,
      theirPlace,
      200,
    )
    const traderFactor = opinionPrice(
      { ...hated, character: { ...hated.character, money: 400000 } },
      world,
      theirPlace,
      200,
    )
    console.log(
      `${world.locations[theirPlace]?.name}: счёт памяти ${memoryScore(hated, world, foe, 200)}, цена ×${factor}; воителю ×${asWarrior}, торговому человеку ×${traderFactor}`,
    )
    expect(factor).toBeGreaterThan(1)
    expect(traderFactor).toBeGreaterThan(asWarrior)
    console.log(crownRecalls(hated, world, foe, 200))
  })

  it('цена в лавке и правда меняется', () => {
    const state = ruler()
    let hated: GameState = {
      ...state,
      politics: {
        ...state.politics,
        wars: [{ a: PLAYER, b: foe, since: 100, reason: 'война' }],
      },
      peaces: [
        {
          against: foe,
          day: 60,
          terms: ['land' as const],
          mediator: null,
          harshness: 6,
          yielded: foe,
        },
        {
          against: foe,
          day: 120,
          terms: ['land' as const],
          mediator: null,
          harshness: 6,
          yielded: foe,
        },
      ],
      treaties: [
        {
          id: 'treaty:test2',
          kind: 'peace' as const,
          a: PLAYER,
          b: foe,
          sinceDay: 60,
          untilDay: 4000,
          brokenBy: PLAYER,
        },
      ],
    }
    for (const id of placesOf(hated, foe)) {
      hated = { ...hated, reputation: withPlaceRep(hated.reputation, id, -45) }
    }
    const where = placesOf(hated, foe).find((id) => (hated.settlements[id]?.stock.grain ?? 0) > 50)
    if (!where) return
    const calm: GameState = { ...state, locationId: where, quarter: null }
    const angry: GameState = { ...hated, locationId: where, quarter: null }
    const buyCalm = applyCommand(calm, { type: 'buy', good: 'grain', amount: 5 })
    const buyAngry = applyCommand(angry, { type: 'buy', good: 'grain', amount: 5 })
    const spentCalm = buyCalm.ok ? calm.character.money - buyCalm.state.character.money : 0
    const spentAngry = buyAngry.ok ? angry.character.money - buyAngry.state.character.money : 0
    console.log(
      `пять мер хлеба в ${world.locations[where]?.name}: своим ${spentCalm}, врагу ${spentAngry}`,
    )
    expect(spentAngry).toBeGreaterThan(spentCalm)
  })
})
