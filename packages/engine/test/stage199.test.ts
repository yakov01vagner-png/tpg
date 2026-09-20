import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { QUARRY } from '../src/content/quarry'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { gameAgainst, gameSeen, quarryRoll, usedBy, weakSpots } from '../src/quarry'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 199: игрок в их партии.
 *
 * Игрок попадал в чужой замысел королевством с числом силы: долгов, пустых
 * стен и мятежных вассалов чужой расчёт не видел.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const crowns = Object.keys(world.kingdoms).filter((one) => one !== PLAYER)
const them = crowns[0] as string

function lord(id: string, loyalty: number) {
  return { id, name: 'Держан', title: 'боярин', kingdomId: PLAYER, loyalty, strength: 40 }
}

function ruler(over: Partial<GameState> = {}): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 8000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, 3)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER, garrison: {} }
  return { ...game, politics, settlements: map, time: WORLD_START, ...over }
}

describe('Иг1, Иг3: ты — фигура, и слабости названы', () => {
  it('за тебя берут то, чего у короны нет', () => {
    // Стены с людьми и наследник в доме: остаются долг и свой, смотрящий на
    // сторону, — то, чего у короны не бывает.
    const base = ruler()
    const weak: GameState = {
      ...base,
      settlements: Object.fromEntries(
        Object.entries(base.settlements).map(([id, one]) => [
          id,
          one.owner === PLAYER ? { ...one, garrison: { spearman: 60 } } : one,
        ]),
      ),
      character: {
        ...base.character,
        family: {
          ...base.character.family,
          children: [{ name: 'Всеслав', bornDay: 1, heir: true }],
        },
      },
      debts: [{ lender: 'guild', owed: 4000, sinceDay: 1, paidDay: 1 }],
      politics: { ...politics, lords: [...politics.lords, lord('l1', 20)] },
    }
    const spots = weakSpots(weak, world, 100)
    for (const one of spots) console.log(one.says)
    expect(spots.length).toBeGreaterThan(0)
    expect(spots.length).toBeLessThanOrEqual(QUARRY.shows)
    expect(spots.map((one) => one.id)).toContain('debt')
    expect(spots.map((one) => one.id)).toContain('restless')
    // У каждой слабости сказано, что с ней делают, а не только что она есть.
    expect(spots.every((one) => one.says.includes('Делают так:'))).toBe(true)
    // Расплатился — и место в чужом расчёте закрылось.
    const paid = weakSpots({ ...weak, debts: [] }, world, 100)
    expect(paid.map((one) => one.id)).not.toContain('debt')
  })

  it('в чужой замысел игрок входит теми же правилами, что корона', () => {
    const state = ruler()
    const rows = crowns.map((id) => gameAgainst(state, world, id, 100))
    for (const one of rows.slice(0, 3)) console.log(one.says)
    // Ни исключения, ни поблажки: кто-то целит в тебя, кто-то мимо.
    expect(rows.every((one) => one.aim.length > 0)).toBe(true)
    expect(rows.some((one) => !one.aimed)).toBe(true)
  })
})

describe('Иг2, Иг4: партия на годы и то, как тобой пользуются', () => {
  it('против тебя играют вдолгую, а не набегом', () => {
    const state = ruler()
    const aimed = crowns.map((id) => gameAgainst(state, world, id, 100)).find((one) => one.aimed)
    const shown = aimed ?? gameAgainst(state, world, them, 100)
    console.log(shown.says)
    expect(shown.years).toBe(QUARRY.years)
    expect(shown.next.length).toBeGreaterThan(0)
  })

  it('тобой прикрываются и тебе платят чужим', () => {
    const fighting = ruler({
      politics: {
        ...politics,
        wars: [{ a: PLAYER, b: crowns[1] as string, since: 50, reason: 'спор о марке' }],
      },
    })
    const uses = usedBy(fighting, world, them, 100)
    for (const one of uses) console.log(one.says)
    expect(uses.length).toBeGreaterThan(0)
    expect(uses.some((one) => one.id === 'shield' || one.id === 'set')).toBe(true)
    // Пока ты не воюешь, прикрываться тобой нечем.
    expect(usedBy(ruler(), world, them, 100).some((one) => one.id === 'shield')).toBe(false)
  })
})

describe('Иг5–Иг6: узнать можно, и всё это считается', () => {
  it('без посольства видно только сделанное', () => {
    const blind = gameSeen(ruler(), world, them, 100)
    console.log(blind.says)
    expect(blind.can).toBe(false)
    const seeing = gameSeen(
      ruler({ spies: [{ id: 's1', kingdomId: them, seat: 'court', sinceDay: 1 }] }),
      world,
      them,
      100,
    )
    console.log(seeing.says)
    expect(seeing.can).toBe(true)
    expect(seeing.says.length).toBeGreaterThan(blind.says.length)
  })

  it('партии против тебя в числах', () => {
    const state = ruler({
      debts: [{ lender: 'guild', owed: 4000, sinceDay: 1, paidDay: 1 }],
      politics: { ...politics, lords: [...politics.lords, lord('l1', 20)] },
    })
    const rolled = quarryRoll(state, world, 100)
    console.log(rolled.says)
    expect(rolled.spots).toBeGreaterThan(0)
    expect(rolled.against).toBeLessThanOrEqual(crowns.length)
    expect(rolled.uses).toBeGreaterThanOrEqual(0)
  })
})
