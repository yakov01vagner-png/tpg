import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand, companionsAt } from '../src/commands'
import { bestSkill, following, hireCompanion, witness } from '../src/companion'
import { COMPANIONS, TEMPERS } from '../src/content/companions'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { generateWorld } from '../src/world/generate'

const world = generateWorld(1)

/** Описание спутника по имени: в тестах он обязан существовать. */
function def(id: string) {
  const found = COMPANIONS[id]
  if (!found) throw new Error(`нет спутника ${id}`)
  return found
}

function gameWith(money: number): GameState {
  const base = createGame(createCharacter({ name: 'Вит' }), 1, world)
  return { ...base, character: { ...base.character, money } }
}

function ok(result: ReturnType<typeof applyCommand>): GameState {
  if (!result.ok) throw new Error(result.message)
  return result.state
}

/** Идём туда, где спутника вообще можно встретить. */
function placeWith(state: GameState, companionId: string): string {
  const found = Object.keys(state.world.locations).find((id) =>
    companionsAt(state, id).some((one) => one.id === companionId),
  )
  if (!found) throw new Error(`${companionId} не встречается нигде`)
  return found
}

describe('спутники', () => {
  it('встречаются не везде: в деревне нет ни счетовода, ни книжницы', () => {
    const state = gameWith(1000)
    const village = Object.values(world.locations).find((one) => one.archetype === 'village')
    const capital = Object.values(world.locations).find((one) => one.archetype === 'capital')
    if (!village || !capital) throw new Error('мир не тот')
    const inVillage = companionsAt(state, village.id).map((one) => one.id)
    const inCapital = companionsAt(state, capital.id).map((one) => one.id)
    expect(inCapital.length).toBeGreaterThan(inVillage.length)
    expect(inVillage).not.toContain('marta')
  })

  it('нанятый спутник стоит денег и идёт с тобой', () => {
    const start = gameWith(1000)
    const where = placeWith(start, 'bran')
    const state = { ...start, locationId: where }
    const after = ok(applyCommand(state, { type: 'recruitCompanion', companionId: 'bran' }))
    expect(after.companions.map((one) => one.id)).toContain('bran')
    expect(after.character.money).toBe(1000 - (COMPANIONS.bran?.fee ?? 0))
    expect(following(after.companions).length).toBe(1)
  })

  it('без денег не нанять', () => {
    const start = gameWith(10)
    const where = placeWith(start, 'bran')
    const result = applyCommand(
      { ...start, locationId: where },
      { type: 'recruitCompanion', companionId: 'bran' },
    )
    expect(result.ok).toBe(false)
  })

  it('нрав решает: один и тот же поступок ссорит с одним и мирит с другим', () => {
    const devout = hireCompanion(def('alina'))
    const greedy = hireCompanion(def('marta'))
    const after = witness([devout, greedy], 'sack')
    const alina = after.companions.find((one) => one.id === 'alina')
    const marta = after.companions.find((one) => one.id === 'marta')
    expect(alina?.mood).toBeLessThan(devout.mood)
    expect(marta?.mood).toBeGreaterThan(greedy.mood)
    expect(TEMPERS.devout.feels.sack).toBeLessThan(0)
  })

  it('терпение кончается: спутник уходит, а не терпит бесконечно', () => {
    let companions = [hireCompanion(def('alina'))]
    let left: string[] = []
    for (let i = 0; i < 10 && left.length === 0; i += 1) {
      const result = witness(companions, 'sack')
      companions = [...result.companions]
      left = result.left.map((one) => one.id)
    }
    expect(left).toContain('alina')
    expect(companions.length).toBe(0)
  })

  it('навык спутника — это навык лучшего из тех, кто рядом', () => {
    const party = [hireCompanion(def('marta')), hireCompanion(def('bran'))]
    expect(bestSkill(party, 'trade').who?.id).toBe('marta')
    expect(bestSkill(party, 'survival').who?.id).toBe('bran')
    expect(bestSkill(party, 'magic').level).toBe(0)
  })

  it('спутника можно поставить на дело, и тогда он уже не рядом', () => {
    const start = gameWith(2000)
    const where = placeWith(start, 'marta')
    let state = { ...start, locationId: where }
    state = ok(applyCommand(state, { type: 'recruitCompanion', companionId: 'marta' }))
    const far = Object.keys(state.world.locations).find(
      (id) =>
        id !== state.locationId && state.world.roads[state.locationId]?.some((r) => r.to === id),
    )
    if (!far) throw new Error('некуда водить караван')
    state = ok(applyCommand(state, { type: 'foundCaravan', awayId: far }))
    const caravan = state.enterprises[0]
    if (!caravan) throw new Error('караван не завёлся')
    state = ok(
      applyCommand(state, {
        type: 'assignCompanion',
        companionId: 'marta',
        role: { type: 'factor', enterpriseId: caravan.id },
      }),
    )
    expect(state.enterprises[0]?.managerId).toBe('marta')
    expect(following(state.companions).length).toBe(0)
  })
})
