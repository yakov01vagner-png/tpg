import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { LEVER, LEVERS, LEVER_DEFS, MIGHT } from '../src/content/lever'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import {
  bothCosts,
  bothEnds,
  buyPeaceCost,
  crownDebtsOf,
  debtAfterBeat,
  feedsKingdoms,
  loanWanted,
  mightCost,
  mightOf,
} from '../src/lever'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics, warsOf } from '../src/war'
import { measureFor, recognises, wayOf } from '../src/way'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 133: путь торга и путь силы.
 *
 * Оба обходятся без войска, и оба за это платят: торг — годами и тем, что
 * слава воинов от купленного мира не растёт; сила — гневом церкви и тем, что
 * свои отдаляются.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const day = 400

/** Война: воюющему серебро нужнее, и он берёт в долг охотнее мирного. */
function warring(
  who: string,
  against: string = kingdoms.find((id) => id !== who) ?? '',
): typeof politics {
  return {
    ...politics,
    wars: [...politics.wars, { a: who, b: against, since: day - 200, reason: 'старая обида' }],
  }
}

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(places: number, extra: Partial<GameState> = {}): GameState {
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, places)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...createGame(createCharacter({ name: 'Ратша', money: 200000 }), 1, world),
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? '',
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    ...extra,
  }
}

describe('Тс1 и Тс2: серебро делает работу войска', () => {
  it('дом, который кормит королевства, считается долгами корон', () => {
    const poor = ruler(6, { character: { ...createCharacter({ name: 'Ратша', money: 4000 }) } })
    console.log(feedsKingdoms(poor, world, day).says)
    expect(feedsKingdoms(poor, world, day).is).toBe(false)

    const rich = ruler(6, {
      crownDebts: {
        [kingdoms[0] ?? '']: { owed: 20000, sinceDay: 100 },
        [kingdoms[1] ?? '']: { owed: 9000, sinceDay: 200 },
      },
    })
    const feeds = feedsKingdoms(rich, world, day)
    console.log(feeds.says)
    expect(feeds.is).toBe(true)
    expect(feeds.owed).toBe(29000)
    expect(crownDebtsOf(rich)).toHaveLength(2)

    // Заём считается той же меркой пути, что и дань: должник — он и есть должник.
    const without = measureFor(ruler(6), world, PLAYER, 'debtors', day)
    const with2 = measureFor(rich, world, PLAYER, 'debtors', day)
    console.log(`должников без займов: ${without}, с займами: ${with2}`)
    expect(with2).toBe(without + 2)
  })

  it('заём просят по нужде, и после него говорят иначе', () => {
    for (const id of LEVERS) {
      console.log(`${LEVER_DEFS[id].label}: ${LEVER_DEFS[id].about} ${LEVER_DEFS[id].after}`)
    }
    const to = kingdoms[1] ?? ''
    const calm = ruler(6)
    console.log(loanWanted(calm, world, to, day).says)
    expect(loanWanted(calm, world, to, day).can).toBe(false)

    // Воюющему серебро нужнее: в мире эта же корона столько не возьмёт.
    const state = ruler(6, { politics: warring(to) })
    const want = loanWanted(state, world, to, day)
    console.log(want.says)
    expect(want.can).toBe(true)
    expect(want.wants).toBeGreaterThanOrEqual(LEVER.leastLoan)

    const before = state.character.money
    const after = ok(applyCommand(state, { type: 'lendToCrown', to }))
    const debt = after.crownDebts?.[to]
    console.log(
      `казна ${before} -> ${after.character.money}, долг ${debt?.owed} с ${debt?.sinceDay}-го дня`,
    )
    expect(debt?.owed).toBe(want.wants)
    expect(before - after.character.money).toBe(want.wants)

    // Второй раз той же короне не дают: она уже в долгу.
    const again = applyCommand(after, { type: 'lendToCrown', to })
    console.log(again.ok ? 'дали второй раз' : again.message)
    expect(again.ok).toBe(false)
  })

  it('от войны можно откупиться, но слава воинов от этого убывает', () => {
    const against = kingdoms[0] ?? ''
    const state = ruler(6, {
      politics: {
        ...politics,
        wars: [
          ...politics.wars,
          { a: PLAYER, b: against, since: day - 200, reason: 'землю не поделили' },
        ],
      },
    })
    const price = buyPeaceCost(state, world, against, day)
    console.log(price.says)
    expect(price.cost).toBeGreaterThan(0)

    const after = ok(applyCommand(state, { type: 'buyPeaceWith', against }))
    console.log(
      `войн было ${warsOf(state.politics, PLAYER).length}, стало ${warsOf(after.politics, PLAYER).length}; казна ${state.character.money} -> ${after.character.money}; слава воинов ${after.fame?.warriors}`,
    )
    expect(warsOf(after.politics, PLAYER).length).toBe(warsOf(state.politics, PLAYER).length - 1)
    expect(after.fame?.warriors ?? 0).toBeLessThan(0)
  })
})

describe('Тс3 и Тс4: ранг, с которым считаются, и чем он платится', () => {
  it('с пятой ступени и тремя вещами корона говорит как с короной', () => {
    const plain = ruler(3)
    console.log(mightOf(plain, day).says)
    expect(mightOf(plain, day).reckoned).toBe(false)

    const mage = ruler(3, {
      character: { ...createCharacter({ name: 'Ратша', money: 200000 }), magicRank: 'master' },
      artifacts: [
        { id: 'a1', defId: 'staff', found: 'wild', day: 100 },
        { id: 'a2', defId: 'ring', found: 'made', day: 200 },
        { id: 'a3', defId: 'amulet', found: 'wild', day: 300 },
      ],
    })
    const might = mightOf(mage, day)
    console.log(might.says)
    expect(might.tier).toBe(MIGHT.crownReckons)
    expect(might.reckoned).toBe(true)

    // Пятая дверь признания (Тс3): с архимагом спорят вровень, а не в полтора
    // раза, и потому его признаёт тот, кто не признал бы просто государя.
    const big = ruler(16)
    const bigMage = ruler(16, {
      character: { ...createCharacter({ name: 'Ратша', money: 200000 }), magicRank: 'master' },
      artifacts: mage.artifacts ?? [],
    })
    const without = kingdoms.filter((id) => recognises(big, world, PLAYER, id, day))
    const with2 = kingdoms.filter((id) => recognises(bigMage, world, PLAYER, id, day))
    const flipped = with2.filter((id) => !without.includes(id))
    console.log(
      `признают без ранга ${without.length} из ${kingdoms.length}, с рангом ${with2.length}: прибавились ${flipped.map((id) => world.kingdoms[id]?.name).join(', ') || 'никто'}`,
    )
    expect(with2.length).toBeGreaterThanOrEqual(without.length)
  })

  it('цена силы берётся гневом церкви и отдалением своих', () => {
    const mage = ruler(6, {
      character: { ...createCharacter({ name: 'Ратша', money: 200000 }), magicRank: 'master' },
    })
    const cost = mightCost(mage, day)
    console.log(cost.says)
    expect(cost.churchAnger).toBe(MIGHT.churchFears)
    expect(cost.apart).toBeLessThan(0)

    // Такт цены: проходим MIGHT.beat суток и смотрим, что церковь заметила.
    let state = mage
    for (let i = 0; i < (MIGHT.beat + 2) * 2; i += 1) {
      state = ok(applyCommand(state, { type: 'rest', hours: 12 }))
    }
    console.log(`гнев церкви ${mage.churchAnger ?? 0} -> ${state.churchAnger ?? 0}`)
    expect(state.churchAnger ?? 0).toBeGreaterThan(mage.churchAnger ?? 0)
  })

  it('долг воюющего растёт, а мирный его отдаёт', () => {
    const atWar = debtAfterBeat(20000, true)
    const atPeace = debtAfterBeat(20000, false)
    console.log(
      `за такт в ${MIGHT.beat} суток: воюющий 20000 -> ${atWar.owed} (отдал ${atWar.back}), мирный 20000 -> ${atPeace.owed} (отдал ${atPeace.back})`,
    )
    expect(atWar.owed).toBeGreaterThan(20000)
    expect(atPeace.owed).toBeLessThan(20000)

    // И это же видно в прогоне: такт долгов приходится на 420-й день.
    const debtor = kingdoms[0] ?? ''
    const state = ruler(6, {
      time: WORLD_START + (MIGHT.beat * 14 - 2) * 24 * 60,
      crownDebts: { [debtor]: { owed: 20000, sinceDay: 100 } },
    })
    let after = state
    for (let i = 0; i < 4; i += 1) {
      after = ok(applyCommand(after, { type: 'rest', hours: 12 }))
    }
    const left = after.crownDebts?.[debtor]?.owed ?? 0
    console.log(
      `${world.kingdoms[debtor]?.name}: долг 20000 -> ${left}, казна ${state.character.money} -> ${after.character.money}`,
    )
    expect(left).toBe(atPeace.owed)
    expect(after.character.money).toBeGreaterThan(state.character.money)
  })
})

describe('Тс5 и Тс6: два мира и то, во что они обходятся', () => {
  it('мир с одним заимодавцем и мир с одним архимагом названы по-разному', () => {
    const state = ruler(6, { crownDebts: { [kingdoms[0] ?? '']: { owed: 40000, sinceDay: 10 } } })
    const ends = bothEnds(state, world, day)
    console.log(ends.banker)
    console.log(ends.archmage)
    expect(ends.banker).not.toBe(ends.archmage)
  })

  it('видно, сколько лет стоит каждый путь и как далеко зашёл каждый', () => {
    const state = ruler(6, { character: createCharacter({ name: 'Ратша', money: 9000 }) })
    const costs = bothCosts(state)
    console.log(costs.says)
    expect(costs.tradeYears).toBeGreaterThan(0)
    expect(costs.mightYears).toBeGreaterThan(0)

    const trade = wayOf(state, world, PLAYER, 'trade', day)
    const might = wayOf(state, world, PLAYER, 'might', day)
    console.log(`торг: ${trade.says}`)
    console.log(`сила: ${might.says}`)
    expect(trade.finished).toBe(false)
    expect(might.finished).toBe(false)
  })
})
