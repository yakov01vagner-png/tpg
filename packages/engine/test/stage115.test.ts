import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { OFFICES } from '../src/content/offices'
import { KEEPER_DEFS, SECRET } from '../src/content/secret'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { candidatesFor } from '../src/office'
import { createRng } from '../src/rng'
import {
  caughtDouble,
  doubleGames,
  exposeCost,
  hushCost,
  keepersOf,
  leakNow,
  secretLedger,
  theirSecrets,
} from '../src/secret'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import type { Treaty } from '../src/treaty'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 115: тайные переговоры.
 *
 * С этапа 80 у грамоты была тайная статья, но утекала она броском. Теперь тайну
 * держат люди — названные, со своими нравами, — и потому её можно купить,
 * посчитать и на ней попасться.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const first = kingdoms[1] as string
const second = kingdoms[2] as string
const third = kingdoms[3] as string
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function secretTreaty(id: string, other: string, against: string, since = day - 30): Treaty {
  return {
    id,
    a: PLAYER,
    b: other,
    kind: 'alliance',
    sinceDay: since,
    untilDay: since + 3000,
    secret: { id: 'partition', against },
  }
}

function ruler(treaties: readonly Treaty[] = []): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 60000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 900)
    .slice(0, 5)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  const lords = [...politics.lords]
  for (let i = 0; i < 3; i += 1) {
    const lord = lords[i]
    if (lord) lords[i] = { ...lord, kingdomId: PLAYER, loyalty: 60 }
  }
  let filled: GameState = {
    ...game,
    politics: { ...politics, lords },
    settlements: map,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    treaties,
  }
  for (const office of OFFICES) {
    const who = candidatesFor(filled, office)[0]
    if (!who) continue
    filled = {
      ...filled,
      offices: {
        ...(filled.offices ?? {}),
        [office]: { holderId: who.id, kind: who.kind, sinceDay: day - 200 },
      },
    }
  }
  return filled
}

describe('Тн2: утечка по людям, а не по броску', () => {
  it('тайну держат названные люди, и у каждого своя доля', () => {
    const paper = secretTreaty('treaty:one', first, third)
    const state = ruler([paper])
    const keepers = keepersOf(state, paper, day)
    for (const keeper of keepers) {
      console.log(
        `${keeper.name} (${KEEPER_DEFS[keeper.kind].label}): ${KEEPER_DEFS[keeper.kind].about} Течёт на ${keeper.leaks} в год`,
      )
    }
    expect(keepers.length).toBeGreaterThan(2)

    const fresh = leakNow(state, paper, day)
    console.log(fresh.says)
    const older = leakNow(state, { ...paper, sinceDay: day - 365 * 4 }, day)
    console.log(`через четыре года: ${Math.round(older.chance * 10000) / 100} из ста за сутки`)
    expect(older.chance).toBeGreaterThan(fresh.chance)

    // Свидетель добавляет своего человека — и свою долю.
    const witnessed = leakNow(state, { ...paper, guarantor: second }, day)
    console.log(`со свидетелем: ${Math.round(witnessed.chance * 10000) / 100} из ста`)
    expect(witnessed.chance).toBeGreaterThan(fresh.chance)
  })
})

describe('Тн1: молчание можно купить', () => {
  it('плата замедляет утечку и кончается', () => {
    const paper = secretTreaty('treaty:one', first, third)
    const state = ruler([paper])
    const price = hushCost(state, paper, day)
    console.log(
      `молчание ${keepersOf(state, paper, day).length} человек: ${price} серебра (${SECRET.hushPerKeeper} с человека)`,
    )
    const paid = ok(applyCommand(state, { type: 'hushSecret', treatyId: paper.id }))
    console.log(paid.log.find((one) => one.text.includes('Заплачено'))?.text)
    expect(paid.character.money).toBe(state.character.money - price)
    expect(paid.hushed?.[paper.id]).toBe(day + SECRET.hushDays)

    const before = leakNow(state, paper, day)
    const after = leakNow(paid, paper, day)
    console.log(
      `утечка за сутки: ${Math.round(before.chance * 10000) / 100} → ${Math.round(after.chance * 10000) / 100} из ста`,
    )
    expect(after.chance).toBeLessThan(before.chance)

    // И кончается: через полгода молчание уже не куплено.
    const later = leakNow(paid, paper, day + SECRET.hushDays + 1)
    expect(later.chance).toBeGreaterThan(after.chance)
  })
})

describe('Тн3: цена раскрытия', () => {
  it('раскрытая тайна бьёт по слову сильнее нарушенной явной грамоты', () => {
    const paper = secretTreaty('treaty:one', first, third)
    const cost = exposeCost(paper)
    console.log(cost.says)
    expect(Math.abs(cost.world)).toBeGreaterThan(0)
    expect(SECRET.worseThanBreach).toBeGreaterThan(1)
  })
})

describe('Тн4: двойная игра', () => {
  it('два тайных обещания против одного и того же — это двойная игра', () => {
    const one = secretTreaty('treaty:one', first, third)
    const two = secretTreaty('treaty:two', second, third)
    const single = ruler([one])
    const both = ruler([one, two])
    expect(doubleGames(single, day)).toHaveLength(0)
    const games = doubleGames(both, day)
    console.log(`против ${world.kingdoms[third]?.name}: обещано ${games[0]?.with.length} дворам`)
    expect(games).toHaveLength(1)

    const caught = caughtDouble(both, world, day)
    console.log(caught.says)
    // Не бросок: тот же день даёт тот же ответ.
    expect(caughtDouble(both, world, day).caught).toBe(caught.caught)
    expect(caughtDouble(single, world, day).caught).toBe(false)
  })
})

describe('Тн5: они сговариваются между собой', () => {
  it('чужой сговор выводится из мира, и его можно выведать', () => {
    // Двое воюют с тобой и не воюют между собой — вот и общий интерес.
    const state: GameState = {
      ...ruler(),
      politics: {
        ...politics,
        lords: ruler().politics.lords,
        wars: [
          { a: PLAYER, b: first, since: 100, reason: 'марка' },
          { a: PLAYER, b: second, since: 120, reason: 'марка' },
        ],
      },
    }
    let found = theirSecrets(state, world, day)
    let when = day
    for (let step = 1; step < 40 && found.length === 0; step += 1) {
      when = day + step * SECRET.beat
      found = theirSecrets(state, world, when)
    }
    for (const pact of found.slice(0, 3)) console.log(pact.says)
    expect(found.length).toBeGreaterThan(0)

    const pact = found[0]
    if (!pact) return
    const atDay: GameState = { ...state, time: WORLD_START + (when - 1) * 24 * 60 }
    const pried = ok(applyCommand(atDay, { type: 'prySecret', a: pact.a, b: pact.b }))
    console.log(pried.log.find((one) => one.text.includes('Выведано'))?.text)
    expect(pried.character.money).toBe(atDay.character.money - SECRET.pryCost)
    expect(pried.learned?.[`${pact.a}:${pact.b}`]).toBe(when)
  })
})

describe('Тн6: тайны в числах', () => {
  it('век считает сговоры, утечки и то, чем они кончались', () => {
    const state = ruler([secretTreaty('treaty:one', first, third)])
    console.log(secretLedger(state).says)
    const paid = ok(applyCommand(state, { type: 'hushSecret', treatyId: 'treaty:one' }))
    const ledger = secretLedger(paid)
    console.log(ledger.says)
    expect(ledger.hushed).toBe(1)
  })
})
