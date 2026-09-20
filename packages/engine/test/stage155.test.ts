import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { lifeOf, othersLives, summaryOf } from '../src/summary'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этапы 155 и 156: итог и жизнь как счёт.
 *
 * Итог не хвалит и не ставит очков: он называет, что стало с миром, с домом и
 * с теми, кто шёл рядом, чем это взято и чего стоило.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const day = 400

function ruler(places: number, extra: Partial<GameState> = {}): GameState {
  const base = createGame(createCharacter({ name: 'Ратша', money: 60000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, places)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...base,
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? base.locationId,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    log: [
      {
        time: WORLD_START + 100 * 24 * 60,
        text: 'Престол Робла взят приступом',
        kind: 'war' as const,
      },
      { time: WORLD_START + 150 * 24 * 60, text: 'Ты венчан на царство', kind: 'world' as const },
    ],
    ...extra,
  }
}

describe('Ит1–Ит6: итог одним экраном', () => {
  it('итог называет мир, дом, ближних, способ и цену', () => {
    const state = ruler(9, {
      marriages: [
        { kingdomId: kingdoms[0] as string, who: 'self', name: 'Мирава', sinceDay: 200, dowry: 0 },
      ],
      crownDebts: { [kingdoms[1] as string]: { owed: 9000, sinceDay: 100 } },
    })
    const out = summaryOf(state, world, day)
    console.log(`конец: ${out.says}`)
    console.log(`мир: ${out.world}`)
    console.log(`дом: ${out.house}`)
    console.log(`ближние: ${out.kin}`)
    console.log(out.how)
    console.log(out.cost)
    expect(out.how.length).toBeGreaterThan(10)
    // Ни одного «молодец»: в итоге нет слов похвалы.
    for (const line of [out.world, out.house, out.kin, out.how, out.cost]) {
      expect(line).not.toMatch(/молодец|поздравля/i)
    }
  })
})

describe('Жз1, Жз3 и Жз5: жизнь как счёт', () => {
  it('счёт жизни — перечень, а не очки', () => {
    const state = ruler(9)
    const life = lifeOf(state, world, day)
    console.log(`был: ${life.was}`)
    console.log(`нажил: ${life.got}`)
    console.log(`потерял: ${life.lost}`)
    console.log(`осталось: ${life.left}`)
    for (const one of othersLives(state, world, day).slice(0, 4)) console.log(`рядом жил ${one}`)
    expect(othersLives(state, world, day).length).toBe(kingdoms.length)
  })
})
