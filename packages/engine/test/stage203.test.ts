import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { TELLING, TELLING_DEFS, type TellingId } from '../src/content/telling'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import { powerScreens } from '../src/screens'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { lifeTold, notOurVoice, numbersBare, tell, tellingRoll, yearTold } from '../src/telling'
import { DAYS_PER_YEAR, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 203: мир говорит словами.
 *
 * Событие было строкой лога: сообщало, но не рассказывало, — а двадцатый набег
 * звучал ровно как первый.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function ruler(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 5000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, 3)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    politics,
    settlements: map,
    time: WORLD_START,
    locationId: mine[0]?.locationId ?? game.locationId,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

describe('Тк1–Тк2: рассказ с причиной и мир, который не повторяется', () => {
  it('событие рассказывается, а не отмечается строкой', () => {
    const told = tell(
      'raid',
      'Увели скот и тридцать человек.',
      'граница не держится третий год',
      0,
      100,
    )
    console.log(told.says)
    expect(told.says).toContain('Причина:')
    expect(told.says).toContain('Дальше —')
    expect(told.says.length).toBeGreaterThan(80)
  })

  it('двадцатый набег звучит не как первый, и подряд одинаковых нет', () => {
    const said: string[] = []
    for (let times = 0; times < 20; times += 1) {
      said.push(
        tell('raid', 'Пожгли выселки.', 'соседу нечем кормить дружину', times, 100 + times).says,
      )
    }
    for (const one of said.slice(0, 4)) console.log(one)
    console.log(`разных рассказов на двадцать набегов: ${new Set(said).size}`)
    expect(said[0]).not.toBe(said[19])
    // Ни одного дословного повтора подряд.
    for (let i = TELLING.window - 1; i < said.length; i += 1) {
      expect(said[i]).not.toBe(said[i - 1])
    }
    expect(new Set(said).size).toBeGreaterThan(8)
  })
})

describe('Тк3–Тк4: итоги словами и числа с объяснением', () => {
  it('год и жизнь читаются словами', () => {
    const state = ruler()
    console.log(yearTold(state, world, 3 * DAYS_PER_YEAR))
    console.log(lifeTold(state, world, 40 * DAYS_PER_YEAR))
    expect(yearTold(state, world, 3 * DAYS_PER_YEAR)).toContain('Причина:')
    expect(lifeTold(state, world, 40 * DAYS_PER_YEAR)).toContain('Прожито 40 лет')
  })

  it('у всякого числа на экране есть объяснение рядом', () => {
    const bare = numbersBare(powerScreens(ruler(), world))
    for (const one of bare) console.log(`без объяснения: ${one}`)
    expect(bare).toEqual([])
  })
})

describe('Тк5–Тк6: один голос и текст в числах', () => {
  it('канцелярита и пафоса в содержимом нет', () => {
    const dir = 'packages/engine/src/content'
    const found: string[] = []
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.ts')) continue
      // Сам список чужих слов проверять по себе же бессмысленно.
      if (file === 'telling.ts') continue
      const bad = notOurVoice(readFileSync(`${dir}/${file}`, 'utf8'))
      if (bad.length > 0) found.push(`${file}: ${bad.join(', ')}`)
    }
    for (const one of found) console.log(one)
    expect(found).toEqual([])
  })

  it('текст в числах', () => {
    const rolled = tellingRoll()
    console.log(rolled.says)
    expect(rolled.kinds).toBe((Object.keys(TELLING_DEFS) as TellingId[]).length)
    // На каждый повод — не меньше положенного числа зачинов.
    for (const id of Object.keys(TELLING_DEFS) as TellingId[]) {
      expect(TELLING_DEFS[id].opens.length).toBeGreaterThanOrEqual(TELLING.least)
      expect(TELLING_DEFS[id].ends.length).toBeGreaterThanOrEqual(TELLING.least)
    }
    expect(rolled.least).toBeGreaterThanOrEqual(TELLING.least * TELLING.least)
  })
})
