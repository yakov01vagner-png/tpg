import { describe, expect, it } from 'vitest'
import {
  BIND_DEFS,
  FAITH,
  HOLY_DEEDS,
  HOLY_DEED_DEFS,
  anointedOf,
  boundBy,
  churchWay,
  deedCost,
  faithCost,
  faithWorld,
  holyBinds,
  withYou,
} from '../src/anoint'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics, relationOf } from '../src/war'
import { wayOf } from '../src/way'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 134: путь веры.
 *
 * Путь веры кончается не титулом, а положением: церковь называет тебя своим
 * государем. Оно держится делами, и пока держится — часть решений принимает не
 * игрок.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const day = 400

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
    ...createGame(createCharacter({ name: 'Ратша', money: 300000 }), 1, world),
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? '',
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    ...extra,
  }
}

/** Тот, кого церкви уже не в чем упрекнуть: благочестие, поход и восемь мест. */
function holy(extra: Partial<GameState> = {}): GameState {
  return ruler(9, {
    piety: 70,
    churchAnger: 0,
    quests: [
      {
        id: 'crusade-north',
        type: 'orderHeresy',
        issuerLocationId: '',
        targetLocationId: '',
        amount: 0,
        reward: 0,
        deadlineDay: day + 200,
        progress: 1,
      },
    ],
    ...extra,
  })
}

describe('Вр1 и Вр2: чем берётся признание церкви', () => {
  it('церковь называет своим за пройденный путь, а не за обряд', () => {
    const plain = ruler(9)
    console.log(anointedOf(plain, world, day).says)
    expect(anointedOf(plain, world, day).is).toBe(false)

    const saint = holy()
    console.log(wayOf(saint, world, PLAYER, 'faith', day).says)
    console.log(anointedOf(saint, world, day).says)
    expect(anointedOf(saint, world, day).is).toBe(true)
  })

  it('четыре двери, и у каждой своя цена перед прочими коронами', () => {
    const state = ruler(9, { churchAnger: 30 })
    for (const id of HOLY_DEEDS) {
      const def = HOLY_DEED_DEFS[id]
      console.log(`${deedCost(state, id, day).says} (${def.about})`)
    }
    const before = state.piety ?? 0
    const after = ok(applyCommand(state, { type: 'churchDeed', deed: 'gift' }))
    console.log(
      `дар: благочестие ${before} -> ${after.piety}, счёт церкви ${state.churchAnger ?? 0} -> ${after.churchAnger}, казна ${state.character.money} -> ${after.character.money}`,
    )
    expect(after.piety ?? 0).toBe(before + HOLY_DEED_DEFS.gift.piety)

    // Второй раз за то же дело не берутся: дар помнят, пока он не проеден.
    const again = applyCommand(after, { type: 'churchDeed', deed: 'gift' })
    console.log(again.ok ? 'дали второй дар' : again.message)
    expect(again.ok).toBe(false)

    // Собор прочие короны считают твоим судом над ними.
    const synod = ok(applyCommand(state, { type: 'churchDeed', deed: 'synod' }))
    const shift = Object.keys(world.kingdoms).map(
      (id) => relationOf(synod.politics, PLAYER, id) - relationOf(state.politics, PLAYER, id),
    )
    console.log(`после собора отношения восьми корон: ${shift.join(', ')}`)
    expect(shift.every((one) => one === HOLY_DEED_DEFS.synod.others)).toBe(true)
  })
})

describe('Вр3 и Вр4: у церкви свой путь, у помазанника — свои запреты', () => {
  it('церковь идёт к своему, и не всегда туда же, куда ты', () => {
    const state = ruler(9, { piety: 40 })
    const way = churchWay(state, world, day)
    console.log(way.says)
    expect(way.done).toBeLessThanOrEqual(3)

    const atPeace = withYou(ruler(5, { piety: 40 }), world, day)
    console.log(`в мире: ${atPeace.says}`)
    const fighting = ruler(9, {
      piety: 40,
      politics: {
        ...politics,
        wars: [
          ...politics.wars,
          { a: PLAYER, b: Object.keys(world.kingdoms)[0] ?? '', since: 300, reason: 'обида' },
        ],
      },
    })
    const clash = withYou(fighting, world, day)
    console.log(`в войне: ${clash.says}`)
    expect(clash.agrees).toBe(false)
  })

  it('помазаннику нельзя того, что можно прочим', () => {
    const plain = ruler(9)
    console.log(holyBinds(plain, world, day).says)
    expect(holyBinds(plain, world, day).binds).toHaveLength(0)

    const saint = holy()
    console.log(holyBinds(saint, world, day).says)
    expect(holyBinds(saint, world, day).binds).toHaveLength(3)
    expect(boundBy(saint, world, 'usury', day)).toBe(true)

    // Лихва: заём короне (этап 133) помазаннику закрыт.
    const to = Object.keys(world.kingdoms)[1] ?? ''
    const lend = applyCommand(saint, { type: 'lendToCrown', to })
    console.log(lend.ok ? 'дал в рост' : lend.message)
    expect(lend.ok).toBe(false)
    expect(lend.ok === false && lend.message).toBe(BIND_DEFS.usury.says)

    // Война без права: церковь считает это грехом, а не ходом.
    const war = ok(applyCommand(saint, { type: 'declareWar', kingdomId: to }))
    console.log(
      `после объявления войны счёт церкви ${saint.churchAnger ?? 0} -> ${war.churchAnger ?? 0}`,
    )
    expect(war.churchAnger ?? 0).toBeGreaterThan(saint.churchAnger ?? 0)
  })
})

describe('Вр5 и Вр6: мир, где государь и церковь — одно', () => {
  it('короны холодеют, а своя земля шатается изнутри', () => {
    const saint = holy({ time: WORLD_START + (FAITH.beat * 40 - 2) * 24 * 60 })
    const world0 = faithWorld(saint, world, day)
    console.log(world0.says)
    expect(world0.fear).toBeLessThan(0)

    let after = saint
    for (let i = 0; i < 26; i += 1) {
      after = ok(applyCommand(after, { type: 'rest', hours: 12 }))
    }
    const first = Object.keys(world.kingdoms)[0] ?? ''
    console.log(
      `помазание с ${after.anointed?.sinceDay ?? 0}-го дня; отношение ${world.kingdoms[first]?.name} ${relationOf(saint.politics, PLAYER, first)} -> ${relationOf(after.politics, PLAYER, first)}`,
    )
    expect(after.anointed?.sinceDay ?? 0).toBeGreaterThan(0)
    expect(relationOf(after.politics, PLAYER, first)).toBeLessThan(
      relationOf(saint.politics, PLAYER, first),
    )
  })

  it('видно, сколько лет, сколько даров и сколько походов', () => {
    const young = ruler(9, { piety: 10 })
    const cost = faithCost(young, world, day)
    console.log(cost.says)
    expect(cost.gifts).toBeGreaterThan(0)
    expect(cost.years).toBeGreaterThan(0)
    expect(cost.wars).toBe(1)

    const saint = holy()
    const done = faithCost(saint, world, day)
    console.log(done.says)
    expect(done.wars).toBe(0)
  })
})
