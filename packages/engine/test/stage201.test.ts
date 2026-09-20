import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { LESSONS, OPENING } from '../src/content/opening'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import {
  firstAim,
  firstSteps,
  forgiving,
  openingRoll,
  originTells,
  screensOpen,
  stepsNow,
} from '../src/opening'
import { jobsAt } from '../src/place'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { dayOf } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 201: первые десять минут.
 *
 * Игра умеет всё, и в этом беда: впервые открывший её видит восемь экранов,
 * сорок дел и ни одной причины сделать хоть что-нибудь.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function newcomer(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 60 }), 1, world)
  return { ...game, politics, settlements }
}

describe('Нч1–Нч2: за руку и без лишнего', () => {
  it('первые дела объясняют правила тем, что случается', () => {
    const state = newcomer()
    const steps = firstSteps(state, world, 1)
    for (const one of steps) console.log(one.says)
    expect(steps.length).toBe(LESSONS.length)
    expect(steps.every((one) => one.says.includes('Цена ошибки'))).toBe(true)
    // Разом показывают не всё: три дела, а не пять.
    expect(stepsNow(state, world, 1).length).toBeLessThanOrEqual(OPENING.shows)
  })

  it('экранов сначала два, остальные ждут своего повода', () => {
    const state = newcomer()
    const shut = screensOpen(state, world, 1)
    console.log(shut.says)
    expect(shut.open).toEqual(['way', 'news'])
    // Своя земля открывает экран державы — и ничего больше.
    const first = Object.values(settlements).find((one) => one.population > 800)
    const landed: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [first?.locationId as string]: {
          ...(first as (typeof settlements)[string]),
          owner: PLAYER,
        },
      },
    }
    const open = screensOpen(landed, world, 1)
    console.log(open.says)
    expect(open.open).toContain('realm')
    expect(open.open).not.toContain('war')
  })
})

describe('Нч3–Нч4: есть чего хотеть, и ошибиться не страшно', () => {
  it('через десять минут известно, чего хочешь и с чего начать', () => {
    const aim = firstAim(newcomer(), world, 1)
    console.log(aim.says)
    expect(aim.aim).toContain('встать на ноги')
    expect(aim.next.length).toBeGreaterThan(0)
  })

  it('терять в начале нечего, и цена ошибки названа', () => {
    const soft = forgiving(newcomer(), 1)
    console.log(soft.says)
    expect(soft.soft).toBe(true)
    expect(soft.daysLeft).toBe(OPENING.softDays - 1)
    // Появилась война — мягкая пора кончилась, и игра говорит это прямо.
    const fighting = forgiving(
      {
        ...newcomer(),
        politics: {
          ...politics,
          wars: [
            { a: PLAYER, b: Object.keys(world.kingdoms)[0] as string, since: 1, reason: 'набег' },
          ],
        },
      },
      1,
    )
    console.log(fighting.says)
    expect(fighting.soft).toBe(false)
  })
})

describe('Нч5–Нч6: начало рассказывает о мире и считается', () => {
  it('выбор начала — рассказ, а не анкета', () => {
    const rows = originTells('origin')
    for (const one of rows.slice(0, 3)) console.log(one.says)
    expect(rows.length).toBeGreaterThan(2)
    expect(rows.every((one) => one.says.length > 60)).toBe(true)
  })

  it('прогон вслепую: первые десять минут проходятся, и нигде не встаёшь', () => {
    let state = newcomer()
    console.log(openingRoll(state, world, 1).says)
    const done: string[] = []
    // Человек, не читавший документов, делает ровно то, что ему предложили, —
    // и каждое предложенное дело обязано быть исполнимым.
    for (let turn = 1; turn <= 8; turn += 1) {
      // Урок дороги в том и состоит, что она идёт: в пути новичок ждёт, а не
      // жмёт снова. Ожидание — не затык, поэтому оно не считается делом.
      if (state.journey) {
        const waited = applyCommand(state, { type: 'tick', minutes: 6 * 60 })
        expect(waited.ok).toBe(true)
        if (!waited.ok) break
        state = waited.state
        continue
      }
      const next = stepsNow(state, world, dayOf(state.time)).find((one) => one.can)
      if (!next) break
      const jobs = jobsAt(state)

      const command =
        next.id === 'ask'
          ? ({ type: 'askAround' } as const)
          : next.id === 'earn' && jobs[0]
            ? ({ type: 'work', jobId: jobs[0].id } as const)
            : next.id === 'walk' && next.where
              ? ({ type: 'travel', toLocationId: next.where } as const)
              : ({ type: 'tick', minutes: 60 } as const)
      const result = applyCommand(state, command)
      if (!result.ok) console.log(`встал на «${next.id}»: ${JSON.stringify(result)}`)
      expect(result.ok).toBe(true)
      if (!result.ok) break
      state = result.state
      done.push(next.id)
    }
    console.log(`сделано: ${done.join(' → ')}`)
    console.log(openingRoll(state, world, dayOf(state.time)).says)
    // Что-то он успел, и от этого уроков впереди стало меньше.
    expect(done.length).toBeGreaterThan(1)
    // Повторов нет: каждое сделанное дело закрывает свой урок.
    expect(new Set(done).size).toBe(done.length)
    expect(openingRoll(state, world, dayOf(state.time)).left).toBeLessThan(LESSONS.length)
    expect(state.character.money).toBeGreaterThanOrEqual(0)
  })
})
