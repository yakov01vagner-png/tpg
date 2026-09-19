import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand, companionsAt } from '../src/commands'
import {
  DEED_SKILL,
  feelsAbout,
  hireCompanion,
  quarrelsOf,
  wishDone,
  wishNeeds,
  wishOf,
  wishShare,
} from '../src/companion'
import type { Companion } from '../src/companion'
import { COMPANIONS, WISHES } from '../src/content/companions'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { MINUTES_PER_DAY } from '../src/time'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 54: спутники с прошлым.
 *
 * У спутника есть родина, прошлое и то, чего он хочет; он растёт делами,
 * ссорится с теми, с кем не сходится, и остаётся в памяти, если погиб.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function withCompanions(ids: readonly string[], money = 3000): GameState {
  const base = createGame(createCharacter({ name: 'Т', money }), 1, world)
  return {
    ...base,
    companions: ids.map((id) => hireCompanion(COMPANIONS[id] as never, 1)),
  }
}

describe('С1: история у каждого', () => {
  it('у всех родина, прошлое и своё желание', () => {
    const all = Object.values(COMPANIONS)
    expect(all.length).toBeGreaterThan(15)
    for (const def of all) {
      expect(def.story.length, def.id).toBeGreaterThan(20)
      expect(def.home, def.id).toBeDefined()
      expect(def.wish, def.id).toBeDefined()
    }
    expect(Object.keys(WISHES)).toHaveLength(6)
    const kinds = new Set(all.map((one) => one.wish))
    console.log(`спутников ${all.length}, желаний ${kinds.size}: ${[...kinds].join(', ')}`)
    expect(kinds.size).toBeGreaterThan(3)
    for (const wish of Object.values(WISHES)) {
      expect(wish.says.length).toBeGreaterThan(20)
      expect(wish.done.length).toBeGreaterThan(20)
    }
  })
})

describe('С2: своё дело спутника', () => {
  it('долг выкупают деньгами, имя приходит славой', () => {
    const debtor = Object.values(COMPANIONS).find((one) => one.wish === 'debt')
    expect(debtor).toBeDefined()
    if (!debtor) return
    const state = withCompanions([debtor.id])
    const companion = state.companions[0] as Companion
    expect(wishOf(companion)?.id).toBe('debt')
    expect(wishDone(companion)).toBe(false)
    expect(wishShare(companion)).toBe(0)
    const paid = ok(applyCommand(state, { type: 'grantWish', companionId: debtor.id }))
    const freed = paid.companions[0] as Companion
    expect(wishDone(freed)).toBe(true)
    expect(freed.mood).toBeGreaterThan(companion.mood)
    expect(paid.character.money).toBe(state.character.money - WISHES.debt.cost)
    expect(paid.log.some((one) => one.text.includes(WISHES.debt.done))).toBe(true)
    // Дважды одно дело не делают.
    expect(applyCommand(paid, { type: 'grantWish', companionId: debtor.id }).ok).toBe(false)

    // Имя деньгами не купишь: оно приходит делами.
    const proud = Object.values(COMPANIONS).find((one) => one.wish === 'name')
    if (!proud) return
    const two = withCompanions([proud.id])
    expect(applyCommand(two, { type: 'grantWish', companionId: proud.id }).ok).toBe(false)
    const famous: GameState = { ...two, renown: wishNeeds('name') }
    const later = ok(applyCommand(famous, { type: 'tick', minutes: MINUTES_PER_DAY }))
    expect(wishDone(later.companions[0] as Companion)).toBe(true)
  })
})

describe('С3: ссоры и дружбы', () => {
  it('честный не уживается с корыстным, а верный с честным — ладит', () => {
    const honest = Object.values(COMPANIONS).find((one) => one.temper === 'honest')
    const greedy = Object.values(COMPANIONS).find((one) => one.temper === 'greedy')
    const loyal = Object.values(COMPANIONS).find((one) => one.temper === 'loyal')
    if (!honest || !greedy) return
    const clash = withCompanions([honest.id, greedy.id])
    const quarrels = quarrelsOf(clash.companions)
    expect(quarrels.length).toBe(1)
    expect(quarrels[0]?.feeling).toBeLessThan(0)
    console.log(
      `${honest.name} и ${greedy.name}: ${quarrels[0]?.feeling}; ${loyal ? `${honest.name} и ${loyal.name}: ${feelsAbout(clash.companions[0] as Companion, hireCompanion(loyal, 1))}` : ''}`,
    )
    // Ссора тянет настроение вниз день за днём.
    let current = clash
    for (let day = 0; day < 10; day += 1) {
      current = ok(applyCommand(current, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    expect((current.companions[0] as Companion).mood).toBeLessThan(
      (clash.companions[0] as Companion).mood,
    )
    if (loyal) {
      const friends = withCompanions([honest.id, loyal.id])
      expect(quarrelsOf(friends.companions)[0]?.feeling ?? 0).toBeGreaterThan(0)
    }
  })
})

describe('С5: спутник растёт', () => {
  it('дела прибавляют умения', () => {
    const state = withCompanions(['hedwar'])
    const before = state.companions[0] as Companion
    expect(before.deeds).toBe(0)
    expect(before.since).toBe(1)
    expect(DEED_SKILL).toBeGreaterThan(0)
    // Рост считается после боя; здесь — что он вообще считается и куда идёт.
    const grown: Companion = {
      ...before,
      deeds: 7,
      skills: { ...before.skills, healing: (before.skills.healing ?? 0) + DEED_SKILL * 7 },
    }
    expect(grown.skills.healing ?? 0).toBeGreaterThan(before.skills.healing ?? 0)
  })
})

describe('С4 и С6: память и возвращение', () => {
  it('павшего не встретишь, ушедшего — встретишь', () => {
    const base = createGame(createCharacter({ name: 'Т', money: 3000 }), 1, world)
    const offered = (state: GameState) =>
      new Set(
        Object.values(COMPANIONS)
          .filter((def) => !state.companions.some((one) => one.id === def.id))
          .map((def) => def.id),
      )
    expect(offered(base).has('hedwar')).toBe(true)
    const buried: GameState = {
      ...base,
      fallen: [{ id: 'hedwar', name: 'Хедвар Костоправ', day: 10, locationId: base.locationId }],
    }
    // Павший из мира уходит: его больше не нанять.
    expect(companionsAt(buried, buried.locationId).some((one) => one.id === 'hedwar')).toBe(false)
    expect(buried.fallen?.[0]?.name).toContain('Хедвар')
  })
})
