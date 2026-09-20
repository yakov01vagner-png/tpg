import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { LEARN } from '../src/content/learning'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import {
  crownLearnedSays,
  crownLearningRoll,
  errsBy,
  learnedOn,
  taughtBy,
  triesNew,
} from '../src/learning'
import type { PeaceRecord } from '../src/peace'
import { createRng } from '../src/rng'
import { ruseFrom, seesThrough } from '../src/ruse'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 198: ошибка и учение.
 *
 * Ошибаться корона умела, но ошибка ничему не учила: приём проходил в десятый
 * раз так же легко, как в первый.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const crowns = Object.keys(world.kingdoms).filter((one) => one !== PLAYER)
const them = crowns[0] as string
const other = crowns[1] as string
const where = Object.keys(settlements)[0] as string

function ruler(over: Partial<GameState> = {}): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 20000 }), 1, world)
  return { ...game, politics, settlements, time: WORLD_START, ...over }
}

function lostTo(who: string, against: string, day: number): PeaceRecord {
  return { against, day, terms: [], mediator: null, harshness: 55, yielded: who }
}

describe('Ош1–Ош2: ошибка своя, и несбывшееся её правит', () => {
  it('ошибается он по нраву, а не по кубику', () => {
    const one = errsBy(ruler(), world, them, other, 100)
    console.log(one.says)
    const two = errsBy(ruler(), world, other, them, 100)
    console.log(two.says)
    // Две короны о разном считают по-разному: перекос от нрава, а не общий.
    expect(one.off).not.toBe(two.off)
    expect(one.says).toContain('перекос')
  })

  it('уступивший считает противника вернее', () => {
    const naive = taughtBy(ruler(), world, them, other, 400)
    console.log(naive.says)
    expect(naive.beaten).toBe(0)
    const taught = taughtBy(
      ruler({ peaces: [lostTo(them, other, 100), lostTo(them, other, 200)] }),
      world,
      them,
      other,
      400,
    )
    console.log(taught.says)
    expect(taught.beaten).toBe(2)
    expect(taught.after).toBeLessThan(taught.before)
  })
})

describe('Ош3–Ош4: он учится на тебе и меняет дорогу', () => {
  it('тот же приём в третий раз ждут', () => {
    const first = ruseFrom('camp', PLAYER, where, 300, 10)
    const alone = ruler({ ruses: [first] })
    const again = ruseFrom('camp', PLAYER, where, 300, 400)
    const often = ruler({
      ruses: [first, ruseFrom('camp', PLAYER, where, 300, 200), again],
    })
    const cold = seesThrough(alone, world, them, first, 12)
    const wise = seesThrough(often, world, them, again, 402)
    console.log(`впервые: ${cold.says}`)
    console.log(`в третий раз: ${wise.says}`)
    expect(wise.chance).toBeGreaterThan(cold.chance)
    // Твои собственные глаза от этого не зорче: учится тот, кого обманывают.
    expect(seesThrough(often, world, PLAYER, again, 402).chance).toBe(
      seesThrough(alone, world, PLAYER, first, 12).chance,
    )
    const rows = learnedOn(often, world, them, 402)
    for (const row of rows) console.log(row.says)
    expect(rows[0]?.times).toBe(3)
    expect(rows[0]?.sinceDay).toBe(10)
  })

  it('дважды уступивший меняет дорогу, а не цель', () => {
    const same = triesNew(ruler(), world, them, 400)
    console.log(same.says)
    expect(same.changed).toBe(false)
    // Битым коронам дорога меняется не всем одинаково: та, что и так искала
    // родства, никуда не сворачивает. Считается, что свернул хоть кто-то.
    const turned = crowns
      .map((id) =>
        triesNew(
          ruler({ peaces: [lostTo(id, other, 100), lostTo(id, other, 200)] }),
          world,
          id,
          400,
        ),
      )
      .filter((one) => one.changed)
    for (const one of turned) console.log(one.says)
    expect(turned.length).toBeGreaterThan(0)
    expect(turned.every((one) => one.says.includes('не ходит'))).toBe(true)
    expect(turned.every((one) => one.aim === 'wed')).toBe(true)
  })
})

describe('Ош5–Ош6: учение видно и считается', () => {
  it('видно, чему научился и с какого дня', () => {
    const state = ruler({
      ruses: [ruseFrom('rumour', PLAYER, where, 0, 30), ruseFrom('rumour', PLAYER, where, 0, 90)],
      peaces: [lostTo(them, other, 100), lostTo(them, other, 200)],
    })
    const said = crownLearnedSays(state, world, them, 400)
    console.log(said)
    expect(said).toContain('с 30 сут')
    expect(said).toContain('дорог')
  })

  it('учение в числах: сколько раз приём ещё проходит', () => {
    const where2 = Object.keys(settlements)[1] as string
    let ruses = [ruseFrom('camp', PLAYER, where, 300, 10)]
    const chances: number[] = []
    for (let time = 1; time <= 5; time += 1) {
      const shown = ruseFrom('camp', PLAYER, where2, 300, 10 + time)
      const state = ruler({ ruses: [...ruses, shown] })
      chances.push(seesThrough(state, world, them, shown, 12 + time).chance)
      ruses = [...ruses, shown]
    }
    console.log(`раскусят (из ста): ${chances.map((one) => Math.round(one * 100)).join(', ')}`)
    // Каждый повтор виднее прошлого — и это не бросок, а счёт.
    for (let i = 1; i < chances.length; i += 1) {
      expect(chances[i] as number).toBeGreaterThan(chances[i - 1] as number)
    }
    const rolled = crownLearningRoll(ruler({ ruses }), world, them, 'camp', 20)
    console.log(rolled.says)
    expect(rolled.times).toBe(6)
    expect(rolled.adds).toBeCloseTo(6 * LEARN.perRepeat, 2)
  })
})
