import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { CLAUSE_DEFS } from '../src/content/paper'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { clausesOf, keptSoFar, paperRoll, paperSays, termOf, witnessOf } from '../src/paper'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import type { Treaty } from '../src/treaty'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 192: договор, который читается.
 *
 * Договор был записью: кто, с кем, какого рода, до какого дня. Условия не
 * разложены, повода разорвать нет, исполнение не считается.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const them = Object.keys(world.kingdoms)[1] as string

const treaty: Treaty = {
  id: 'treaty:1',
  a: PLAYER,
  b: them,
  kind: 'tribute',
  sinceDay: 100,
  untilDay: 900,
  perDay: 40,
}

function ruler(rows: readonly Treaty[] = [treaty]): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 9000 }), 1, world)
  return {
    ...game,
    politics,
    settlements,
    time: WORLD_START,
    quarter: null,
    treaties: rows,
  }
}

describe('Дг1–Дг3: условия, срок и исполнение', () => {
  it('бумага собирается из условий, и у каждого свой повод быть порванным', () => {
    const clauses = clausesOf(treaty)
    for (const one of clauses) console.log(`${CLAUSE_DEFS[one].label}: ${CLAUSE_DEFS[one].says} ${CLAUSE_DEFS[one].breaks}`)
    expect(clauses.length).toBeGreaterThan(0)
    const term = termOf(treaty, 500)
    console.log(term.says)
    expect(term.left).toBe(400)
    expect(term.breaks.length).toBe(clauses.length)
  })

  it('исполнение видно обеим сторонам', () => {
    const state = ruler()
    const slipping = keptSoFar(state, world, treaty, 500)
    console.log(slipping.says)
    expect(slipping.kept).toBe(false)
    const paying: GameState = {
      ...state,
      politics: {
        ...state.politics,
        tributes: [{ from: them, to: PLAYER, perDay: 40, untilDay: 900 }],
      },
    }
    expect(keptSoFar(paying, world, treaty, 500).kept).toBe(true)
    const torn = keptSoFar(state, world, { ...treaty, brokenBy: them }, 500)
    console.log(torn.says)
    expect(torn.kept).toBe(false)
  })
})

describe('Дг4–Дг6: свидетель, слова и счёт', () => {
  it('свидетель делает разрыв дороже', () => {
    const state = ruler()
    const bare = witnessOf(state, treaty)
    const witnessed = witnessOf(state, { ...treaty, guarantor: 'robl' })
    console.log(bare.says)
    console.log(witnessed.says)
    expect(bare.holds).toBe(1)
    expect(witnessed.holds).toBeGreaterThan(1)
  })

  it('грамота читается как грамота, и грамоты считаны', () => {
    const state = ruler([treaty, { ...treaty, id: 'treaty:2', kind: 'peace', brokenBy: them }])
    console.log(paperSays(state, world, treaty, 500))
    expect(paperSays(state, world, treaty, 500).length).toBeGreaterThan(80)
    const rolled = paperRoll(state, world, 500)
    console.log(rolled.says)
    expect(rolled.all).toBe(2)
    expect(rolled.broken).toBe(1)
  })
})
