import { describe, expect, it } from 'vitest'
import { tickDiplomacy } from '../src/diplomacy'
import { createRng } from '../src/rng'
import { NO_POLITICS, allied, pairOf, peaceTerms, relationOf } from '../src/war'
import type { Politics, War } from '../src/war'
import { generateWorld } from '../src/world/generate'

const world = generateWorld(1)
const kingdoms = Object.keys(world.kingdoms)
const [first, second] = kingdoms as [string, string]

describe('договор и союз', () => {
  it('война портит отношение, мир его лечит', () => {
    const war: War = { a: first, b: second, since: 1, reason: 'спор о вере' }
    const fighting: Politics = { ...NO_POLITICS, wars: [war] }
    let state = fighting
    let rng = createRng(1)
    for (let day = 1; day <= 200; day += 1) {
      const turn = tickDiplomacy(world, state, day, rng)
      state = turn.politics
      rng = turn.rng
    }
    const hostile = relationOf(state, first, second)
    expect(hostile).toBeLessThan(0)

    let peaceful: Politics = { ...state, wars: [] }
    for (let day = 201; day <= 1200; day += 1) {
      const turn = tickDiplomacy(world, peaceful, day, rng)
      peaceful = turn.politics
      rng = turn.rng
    }
    console.log(
      `отношение: после войны ${hostile.toFixed(0)}, после мира ${relationOf(peaceful, first, second).toFixed(0)}`,
    )
    expect(relationOf(peaceful, first, second)).toBeGreaterThan(hostile)
  })

  it('союз заключают те, кто давно в ладу', () => {
    // Разводим отношения до дружеских и ждём.
    let state: Politics = {
      ...NO_POLITICS,
      relations: Object.fromEntries(
        kingdoms.flatMap((a) => kingdoms.map((b) => [pairOf(a, b), 80] as const)),
      ),
    }
    let rng = createRng(4)
    let made = false
    for (let day = 1; day <= 4000 && !made; day += 1) {
      const turn = tickDiplomacy(world, state, day, rng)
      state = turn.politics
      rng = turn.rng
      made = turn.events.some((event) => event.type === 'allianceMade')
    }
    expect(made).toBe(true)
    expect(state.alliances.length).toBeGreaterThan(0)
    const pact = state.alliances[0]
    if (!pact) throw new Error('союза нет')
    expect(allied(state, pact.a, pact.b)).toBe(true)
  })

  it('союзник входит в чужую войну — и решает это в начале, а не годами', () => {
    const third = kingdoms[2] as string
    const fresh = (): Politics => ({
      ...NO_POLITICS,
      alliances: [{ a: first, b: second, since: 1, byMarriage: false }],
      wars: [{ a: first, b: third, since: 1, reason: 'старые претензии' }],
      relations: { [pairOf(first, second)]: 80 },
    })

    // Решение принимается в первые дни войны: пока бросок повторялся каждые
    // сутки, союзники входили в чужие войны сотни раз за век и мир не вылезал
    // из войны вовсе. Поэтому смотрим на нескольких зёрнах, а не на одном.
    let joinedRuns = 0
    let lateJoin = false
    for (let seed = 1; seed <= 10; seed += 1) {
      let state = fresh()
      let rng = createRng(seed)
      for (let day = 1; day <= 400; day += 1) {
        const turn = tickDiplomacy(world, state, day, rng)
        state = turn.politics
        rng = turn.rng
        if (turn.events.some((event) => event.type === 'joinedWar')) {
          joinedRuns += 1
          if (day > 25) lateJoin = true
          break
        }
      }
    }
    console.log(`из десяти случаев союзник вступил в войну ${joinedRuns} раз`)
    expect(joinedRuns).toBeGreaterThan(0)
    expect(lateJoin).toBe(false)
  })

  it('мир с сильным стоит дани, мир с равным — ничего', () => {
    expect(peaceTerms(first, second, 0.95, 100)).toBeNull()
    const beaten = peaceTerms(first, second, 0.3, 100)
    expect(beaten?.from).toBe(first)
    expect(beaten?.perDay).toBeGreaterThan(0)
    expect(beaten?.untilDay).toBeGreaterThan(100)
    // Чем слабее — тем дороже мир, но до предела: с разбитого в прах берут
    // вполовину меньше и вдвое меньший срок. Иначе малое королевство доедали
    // до конца — Дор-Хазад терял всю землю на двух зёрнах из трёх.
    const worse = peaceTerms(first, second, 0.5, 100)
    expect(worse?.perDay ?? 0).toBeLessThan(beaten?.perDay ?? 0)
    const beggared = peaceTerms(first, second, 0.1, 100)
    expect(beggared?.perDay ?? 0).toBeLessThan(beaten?.perDay ?? 0)
    expect(beggared?.untilDay ?? 0).toBeLessThan(beaten?.untilDay ?? 0)
  })

  it('союз распадается, когда отношения испортились', () => {
    let state: Politics = {
      ...NO_POLITICS,
      alliances: [{ a: first, b: second, since: 1, byMarriage: false }],
      wars: [{ a: first, b: second, since: 1, reason: 'раздор' }],
      relations: { [pairOf(first, second)]: -10 },
    }
    let rng = createRng(2)
    let broken = false
    for (let day = 1; day <= 400 && !broken; day += 1) {
      const turn = tickDiplomacy(world, state, day, rng)
      state = turn.politics
      rng = turn.rng
      broken = turn.events.some((event) => event.type === 'allianceBroken')
    }
    expect(broken).toBe(true)
    expect(allied(state, first, second)).toBe(false)
  })
})
