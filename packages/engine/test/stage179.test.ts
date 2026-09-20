import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import type { EquippedItem } from '../src/content/equipment'
import { SMITHY } from '../src/content/smithy'
import { qualityLabel } from '../src/craft'
import { createSettlements } from '../src/economy'
import { createRng } from '../src/rng'
import { masterFame, orderPrice, smithyRoll, storyOf, wearAfter, worthOf } from '../src/smithy'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 179: ремесло и вещи.
 *
 * У вещи было клеймо — чья работа, где и какова, — и на этом всё: ни года, ни
 * починок, а починка и вовсе стирала клеймо. Здесь у вещи появляется история, у
 * мастера — слава, у заказа — цена и срок.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function smith(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 9000 }), 1, world)
  const here = Object.values(settlements).find((one) => one.population > 900)
  return {
    ...game,
    politics,
    settlements,
    time: WORLD_START,
    locationId: here?.locationId ?? game.locationId,
    quarter: null,
  }
}

const blade: EquippedItem = {
  id: 'longSword',
  condition: 90,
  mark: { maker: 'Ратша', place: 'Ре-Эстиз', quality: 3, day: 400, repairs: 0 },
}

describe('Рм1 и Рм2: у вещи есть история и износ', () => {
  it('вещь помнит мастера, место, год и починки', () => {
    const story = storyOf(blade, 800)
    console.log(story.line)
    expect(story.line).toContain('Ратша')
    expect(story.line).toContain('год')
    expect(story.state).toBe('new')
    const mended = storyOf({ ...blade, condition: 55, mark: { ...blade.mark!, repairs: 2 } }, 800)
    console.log(mended.line)
    expect(mended.line).toContain('починок 2')
    expect(mended.state).toBe('worn')
    // Лавочная вещь ничья, и это сказано.
    const bought = storyOf({ id: 'longSword', condition: 100 }, 800)
    console.log(bought.line)
    expect(bought.line).toContain('ничья')
  })

  it('хорошая вещь изнашивается медленнее', () => {
    const plain: EquippedItem = { id: 'longSword', condition: 100 }
    const fine: EquippedItem = {
      id: 'longSword',
      condition: 100,
      mark: { maker: 'Ратша', place: 'Ре-Эстиз', quality: 4 },
    }
    console.log(
      `после десяти боёв и года: простая ${wearAfter(plain, 10, 1)}, добрая ${wearAfter(fine, 10, 1)}`,
    )
    expect(wearAfter(fine, 10, 1)).toBeGreaterThan(wearAfter(plain, 10, 1))
    expect(SMITHY.wearPerFight).toBeGreaterThan(0)
  })

  it('починка больше не стирает клеймо', () => {
    const state: GameState = {
      ...smith(),
      character: {
        ...smith().character,
        money: 5000,
        equipment: { weapon: { ...blade, condition: 40 } },
      },
    }
    const result = applyCommand(state, { type: 'repairItem', slot: 'weapon' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const after = result.state.character.equipment.weapon
    console.log(storyOf(after as EquippedItem, 800).line)
    expect(after?.mark?.maker).toBe('Ратша')
    expect(after?.mark?.repairs).toBe(1)
    expect(after?.condition).toBe(100)
  })
})

describe('Рм3–Рм6: мастер, заказ, вещь в бою и счёт', () => {
  it('слава мастера считается по его клеймам', () => {
    const state: GameState = {
      ...smith(),
      character: {
        ...smith().character,
        equipment: { weapon: blade, armor: { ...blade, id: 'gambeson' } },
      },
    }
    console.log(`клейм Ратши на тебе: ${masterFame(state, 'Ратша')}`)
    expect(masterFame(state, 'Ратша')).toBe(2)
    expect(masterFame(state, 'Никто')).toBe(0)
  })

  it('заказ дороже лавки, дольше и лучше', () => {
    const order = orderPrice('longSword', 2)
    console.log(order.says)
    expect(order.days).toBe(SMITHY.orderDays)
    expect(order.quality).toBe(3)
    expect(order.cost).toBeGreaterThan(0)
  })

  it('качество и износ считаются там, где это видно', () => {
    const good = worthOf(blade)
    const ruined = worthOf({ ...blade, condition: 20 })
    console.log(good.says)
    console.log(ruined.says)
    expect(good.inFight).toBeGreaterThan(ruined.inFight)
    expect(ruined.says).toContain('вполсилы')
    expect(qualityLabel(3).length).toBeGreaterThan(3)
  })

  it('ремесло в числах', () => {
    const state: GameState = {
      ...smith(),
      character: {
        ...smith().character,
        equipment: { weapon: blade, shield: { id: 'woodShield', condition: 60 } },
      },
    }
    const rolled = smithyRoll(state, world, 800)
    console.log(rolled.says)
    expect(rolled.marked).toBe(1)
    expect(rolled.condition).toBe(75)
  })
})
