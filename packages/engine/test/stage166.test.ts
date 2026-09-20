import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { FOLK } from '../src/content/folk'
import { createSettlements } from '../src/economy'
import { folkRoll, rememberedOf, rollOf, soldiersOf, syncRoll, whoLeaves } from '../src/folk'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import { SCHEMA_VERSION } from '../src/state'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 166: отряд из людей.
 *
 * Отряд был строкой «копейщиков 12»: двенадцать одинаковых чисел, которые
 * нельзя потерять по имени и нельзя вспомнить. Люди здесь не заводятся, а
 * выводятся: в состоянии лежит книга набора, а имя, годы, прошлое, страх и
 * выслуга считаются из неё.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function captain(units: Record<string, number> = { spearman: 12, archer: 6 }): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 20000 }), 1, world)
  const where = Object.values(settlements).find((one) => one.population > 800)
  return {
    ...game,
    politics,
    settlements,
    time: WORLD_START,
    locationId: where?.locationId ?? game.locationId,
    quarter: null,
    party: { ...game.party, units },
  }
}

function ok(result: ReturnType<typeof applyCommand>): GameState {
  if (!result.ok) throw new Error(result.message)
  return result.state
}

describe('От1 и От2: в отряде люди, и каждый чем-то был', () => {
  it('книга набора сводится с числами, и из неё выходят люди с именами', () => {
    const state = captain()
    const after = ok(applyCommand(state, { type: 'rest', hours: 12 }))
    const roll = rollOf(after)
    console.log(`записей набора: ${roll.length}`)
    expect(roll.length).toBeGreaterThan(0)
    const people = soldiersOf(after, world, 1)
    for (const one of people.slice(0, 4)) console.log(one.says)
    expect(people).toHaveLength(18)
    // У каждого своё: имена не повторяются подряд, прошлое и страх названы.
    expect(new Set(people.map((one) => one.name)).size).toBeGreaterThan(8)
    for (const one of people) {
      expect(one.age).toBeGreaterThanOrEqual(17)
      expect(one.was.length).toBeGreaterThan(8)
      expect(one.fears.length).toBeGreaterThan(3)
      expect(one.from).toBe(after.locationId)
    }
    // Из одного состояния — те же люди: они выводятся, а не выдумываются.
    expect(soldiersOf(after, world, 1).map((one) => one.name)).toEqual(
      people.map((one) => one.name),
    )
  })
})

describe('От3 и От4: потери именные, а служба растит', () => {
  it('убыль отряда получает имена, и первым уходит новичок', () => {
    const state = captain({ spearman: 10 })
    const day = 100
    const first = syncRoll([], { spearman: 10 }, 1, 'Ржаное', 'left')
    const older = first.roll
    const added = syncRoll(older, { spearman: 14 }, day, 'Ржаное', 'left')
    expect(added.roll).toHaveLength(2)
    // Пало четверо: это те, кого набрали последними.
    const lost = syncRoll(added.roll, { spearman: 10 }, day + 30, 'Бычий Рог', 'fell')
    console.log(`пали: ${lost.gone.map((one) => one.name).join(', ')}`)
    expect(lost.gone).toHaveLength(4)
    expect(lost.gone.every((one) => one.how === 'fell')).toBe(true)
    expect(lost.roll.reduce((sum, one) => sum + one.count, 0)).toBe(10)
    // Старая запись цела: старики пережили новичков.
    expect(lost.roll[0]?.sinceDay).toBe(1)
    // А выслуга и привычка растут со временем, а не выдаются.
    const green = soldiersOf({ ...state, roll: older } as GameState, world, 2)[0]
    const grey = soldiersOf({ ...state, roll: older } as GameState, world, 1 + 365 * 5)[0]
    console.log(`${green?.name}: ${green?.years} г., привычка ${green?.bond}`)
    console.log(
      `${grey?.name}: ${grey?.years} г., привычка ${grey?.bond}, усталость ${grey?.weary}`,
    )
    expect(grey?.bond ?? 0).toBeGreaterThan(green?.bond ?? 1)
    expect(grey?.weary ?? 0).toBeGreaterThan(green?.weary ?? 1)
    expect(grey?.age ?? 0).toBeGreaterThan(green?.age ?? 99)
  })
})

describe('От5 и От6: люди уходят, и отряд считан', () => {
  it('без жалованья уходят поимённо, и ушедших помнят', () => {
    const state = captain({ militia: 20 })
    const fed = ok(applyCommand(state, { type: 'rest', hours: 12 }))
    expect(whoLeaves(fed, world, 1)).toHaveLength(0)
    // Свежий и неплаченый ещё не уходит: одного безденежья мало, и это верно —
    // бегство от голода считается своим счётом (побег при низком духе, 0.2).
    const unpaid: GameState = {
      ...fed,
      party: { ...fed.party, hungryDays: FOLK.patience + 20 },
    }
    expect(whoLeaves(unpaid, world, 1)).toHaveLength(0)
    // А неплаченый, напуганный и отслуживший своё — уходит.
    const starving: GameState = {
      ...unpaid,
      party: { ...unpaid.party, morale: 25 },
    }
    const leaving = whoLeaves(starving, world, 1)
    console.log(`ушли бы ${leaving.length} из 20; первый — ${leaving[0]?.says}`)
    expect(leaving.length).toBeGreaterThan(0)
    // Тот, кто с тобой давно, уходит последним: привычка держит.
    const old = whoLeaves({ ...starving }, world, 1 + 365 * 6)
    console.log(`через шесть лет службы ушли бы ${old.length}`)
    expect(old.length).toBeLessThanOrEqual(leaving.length)
    const rolled = folkRoll(starving, world, 1)
    console.log(rolled.says)
    expect(rolled.men).toBe(20)
    expect(SCHEMA_VERSION).toBe(28)
  })

  it('за десять лет видно, кто дожил, кто ушёл и кто вырос', () => {
    let state = captain({ militia: 30, spearman: 10 })
    for (let i = 0; i < 400; i += 1) {
      state = ok(applyCommand(state, { type: 'rest', hours: 12 }))
      state = ok(applyCommand(state, { type: 'rest', hours: 12 }))
    }
    const rolled = folkRoll(state, world, 400)
    console.log(rolled.says)
    const remembered = rememberedOf(state)
    for (const one of remembered.slice(0, 3)) {
      console.log(`  ${one.name}: ${one.how === 'fell' ? 'пал' : 'ушёл'} на ${one.day}-й день`)
    }
    expect(rolled.men + remembered.length).toBeGreaterThanOrEqual(40)
    if (rolled.longest) expect(rolled.longest.years).toBeGreaterThan(0.9)
  })
})
