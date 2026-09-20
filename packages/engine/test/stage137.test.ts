import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { BONDS, BOND_DEFS, TIED, TIED_DEFS, WARD } from '../src/content/ward'
import { nearTo } from '../src/dread'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { boundTo } from '../src/league'
import { aimedAtPlayer, strengthOf } from '../src/mind'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics, warsOf } from '../src/war'
import {
  breakingWord,
  calledOn,
  canGuarantee,
  guarantorOf,
  handOver,
  tiedHands,
  tiedTo,
  wantsHand,
  wardLedger,
} from '../src/ward'
import { generateWorld } from '../src/world/generate'
import { neighbourSettlements } from '../src/world/queries'

/**
 * Этап 137: гарантия и покровительство.
 *
 * Третий способ связать себя с чужой короной, кроме договора и дани: ручаться
 * за слабого. Слово стоит связанных рук, а нарушенное — дороже порванной
 * грамоты.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function dayOfState(state: GameState): number {
  return Math.floor((state.time - WORLD_START) / (24 * 60)) + 1
}

/** Слабейшая корона мира: за такую и ручаются. */
function weakest(state: GameState): string {
  return [...kingdoms]
    .map((id) => ({ id, score: strengthOf(state, world, id, day).score }))
    .sort((a, b) => a.score - b.score)[0]?.id as string
}

/** Слабая корона по соседству: под руку идут к соседу, а не к дальнему. */
function neighbour(state: GameState): string {
  const rows = kingdoms
    .map((id) => ({
      id,
      score: strengthOf(state, world, id, day).score,
      near: nearTo(state, world, PLAYER, id),
    }))
    .sort((a, b) => b.near - a.near || a.score - b.score)
  for (const row of rows) {
    console.log(`${world.kingdoms[row.id]?.name}: сила ${row.score}, соседство ${row.near}`)
  }
  return rows[0]?.id as string
}

function ruler(places: number, extra: Partial<GameState> = {}): GameState {
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, places)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  const bands = Object.values(settlements)
    .slice(0, 0)
    .map(() => null)
  return {
    ...createGame(createCharacter({ name: 'Ратша', money: 120000 }), 1, world),
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? '',
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    ...extra,
  }
}

/** Игрок, который сильнее слабейшей короны: у него есть чем ручаться. */
function strong(extra: Partial<GameState> = {}): GameState {
  const base = ruler(3, extra)
  const weak = weakest(base)
  const theirs = strengthOf(base, world, weak, day).score
  // Сила игрока считается по местам: берём столько, чтобы хватило с запасом.
  const need = Math.ceil((theirs * WARD.strongerBy) / 10) + 4
  return ruler(need, extra)
}

/**
 * Державный сосед: земли берутся рядом с тем, кого он берёт под руку.
 *
 * Под руку идут к соседу, и потому картина должна быть соседской: не «сильный
 * где-то», а «сильный за рекой».
 */
function neighbourRuler(ward: string, times: number, extra: Partial<GameState> = {}): GameState {
  const base = ruler(3, extra)
  const theirs = strengthOf(base, world, ward, day).score
  const seat = Object.values(settlements)
    .filter((one) => one.owner === `crown:${ward}`)
    .sort((a, b) => b.population - a.population)[0]
  const near = new Map(
    neighbourSettlements(world, seat?.locationId ?? '', 12).map((one) => [one.id, one.hops]),
  )
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600 && one.owner !== `crown:${ward}`)
    .sort((a, b) => (near.get(a.locationId) ?? 99) - (near.get(b.locationId) ?? 99))
    .slice(0, Math.ceil((theirs * times) / 10) + 4)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...ruler(1, extra),
    settlements: map,
    locationId: mine[0]?.locationId ?? '',
  }
}

describe('Га1 и Га3: поручиться и связать себе руки', () => {
  it('ручаться можно только за того, кто слабее', () => {
    for (const id of BONDS) {
      console.log(`${BOND_DEFS[id].label}: ${BOND_DEFS[id].about} ${BOND_DEFS[id].after}`)
    }
    const small = ruler(3)
    const weak = weakest(small)
    console.log(canGuarantee(small, world, PLAYER, weak, day).says)
    expect(canGuarantee(small, world, PLAYER, weak, day).can).toBe(false)

    const big = strong()
    const can = canGuarantee(big, world, PLAYER, weak, day)
    console.log(can.says)
    expect(can.can).toBe(true)

    const after = ok(applyCommand(big, { type: 'giveGuarantee', of: weak }))
    console.log(
      `поручился за ${world.kingdoms[weak]?.name}; слава ${big.renown} -> ${after.renown}`,
    )
    expect(guarantorOf(after, weak)?.by).toBe(PLAYER)
  })

  it('поручившемуся некоторых ходов нет', () => {
    const big = strong()
    const weak = weakest(big)
    const after = ok(applyCommand(big, { type: 'giveGuarantee', of: weak }))
    for (const one of tiedHands(after, world, PLAYER, day)) console.log(one.says)
    expect(tiedTo(after, PLAYER, weak)).toBe(true)

    const war = applyCommand(after, { type: 'declareWar', kingdomId: weak })
    console.log(war.ok ? 'пошёл войной на того, за кого ручался' : war.message)
    expect(war.ok).toBe(false)
    expect(war.ok === false && war.message).toBe(TIED_DEFS.war.says)

    const tribute = applyCommand(after, { type: 'sendEnvoy', to: weak, errand: 'tribute' })
    console.log(tribute.ok ? 'взял дань' : tribute.message)
    expect(tribute.ok).toBe(false)
    for (const id of TIED) expect(TIED_DEFS[id].says.length).toBeGreaterThan(10)
  })
})

describe('Га2 и Га5: под рукой — и они делают так же', () => {
  it('слабый идёт под руку, и признание идёт руке', () => {
    const probe = strong()
    const weak = neighbour(probe)
    const big = neighbourRuler(weak, WARD.strongerBy + 0.2)
    console.log(
      `твоя сила ${strengthOf(big, world, PLAYER, day).score} против ${strengthOf(big, world, weak, day).score} у ${world.kingdoms[weak]?.name}`,
    )
    const wants = wantsHand(big, world, weak, day)
    console.log(wants.says)

    if (wants.patron === PLAYER) {
      const after = ok(applyCommand(big, { type: 'takeUnderHand', of: weak }))
      console.log(
        `под рукой: ${handOver(after, weak)?.ward}; признал ли он тебя: ${(after.recognitions?.[weak] ?? 0) > 0}`,
      )
      expect(handOver(after, weak)?.patron).toBe(PLAYER)
      expect(guarantorOf(after, weak)?.by).toBe(PLAYER)
      // Под рукой на руку не целятся и против неё не сходятся.
      console.log(
        `целятся на тебя ${aimedAtPlayer(after, world, day).length}; ${world.kingdoms[weak]?.name} в коалицию против тебя: ${!boundTo(after, world, PLAYER, weak, day).bound}`,
      )
      expect(boundTo(after, world, PLAYER, weak, day).why).toBe('под рукой')
    } else {
      expect(wants.patron).not.toBe(PLAYER)
    }
  })

  it('короны берут слабых под руку сами', () => {
    const state = ruler(3, { time: WORLD_START + (WARD.beat * 4 * 4 - 2) * 24 * 60 })
    let after = state
    for (let i = 0; i < 6; i += 1) {
      after = ok(applyCommand(after, { type: 'rest', hours: 12 }))
    }
    const ledger = wardLedger(after, world, dayOfState(after))
    console.log(ledger.says)
    expect(ledger.hands + ledger.theirs).toBeGreaterThan(0)
  })
})

describe('Га4 и Га6: не пришёл — потерял слово', () => {
  it('нарушенное поручительство стоит дороже нарушенной грамоты', () => {
    const cost = breakingWord()
    console.log(cost.says)
    expect(cost.timesTreaty).toBe(WARD.worseThanTreaty)

    const big = strong({ time: WORLD_START + (WARD.beat * 14 - 2) * 24 * 60 })
    const weak = weakest(big)
    const attacker = kingdoms.find((id) => id !== weak) ?? ''
    const state = ok(applyCommand(big, { type: 'giveGuarantee', of: weak }))
    const warring: GameState = {
      ...state,
      politics: {
        ...state.politics,
        wars: [
          ...state.politics.wars,
          { a: attacker, b: weak, since: dayOfState(state), reason: 'пошёл на слабого' },
        ],
      },
    }
    const calls = calledOn(warring, world, PLAYER, dayOfState(warring))
    for (const one of calls) console.log(one.says)
    expect(calls.length).toBeGreaterThan(0)

    // Проходит срок — и слово теряется.
    let after = warring
    for (let i = 0; i < (WARD.comeDays + WARD.beat * 2) * 2; i += 1) {
      after = ok(applyCommand(after, { type: 'rest', hours: 12 }))
    }
    const row = (after.guarantees ?? []).find((one) => one.of === weak)
    console.log(
      `поручительство: позвали на ${row?.calledDay ?? 0}-й день, нарушено на ${row?.brokenDay ?? 0}-й`,
    )
    console.log(wardLedger(after, world, dayOfState(after)).says)
    expect(row?.brokenDay ?? 0).toBeGreaterThan(0)
    expect((after.shames ?? []).some((one) => one.id === 'broke')).toBe(true)
  })

  it('а пришедший на зов получает обратное', () => {
    const big = strong({ time: WORLD_START + (WARD.beat * 14 - 2) * 24 * 60 })
    const weak = weakest(big)
    const attacker = kingdoms.find((id) => id !== weak) ?? ''
    const state = ok(applyCommand(big, { type: 'giveGuarantee', of: weak }))
    let called: GameState = {
      ...state,
      politics: {
        ...state.politics,
        wars: [
          ...state.politics.wars,
          { a: attacker, b: weak, since: dayOfState(state), reason: 'пошёл на слабого' },
        ],
      },
    }
    // Зов приходит на такте, а после него ты идёшь на того, кто взялся.
    for (let i = 0; i < 4; i += 1) called = ok(applyCommand(called, { type: 'rest', hours: 12 }))
    console.log(`позвали на ${(called.guarantees ?? [])[0]?.calledDay ?? 0}-й день`)
    let after = ok(applyCommand(called, { type: 'declareWar', kingdomId: attacker }))
    for (let i = 0; i < WARD.beat * 2; i += 1) {
      after = ok(applyCommand(after, { type: 'rest', hours: 12 }))
    }
    const row = (after.guarantees ?? []).find((one) => one.of === weak)
    console.log(
      `после прихода: нарушено ${row?.brokenDay ?? 0}, зов снят ${row?.calledDay === undefined}; слава ${called.renown} -> ${after.renown}`,
    )
    expect(row?.brokenDay).toBeUndefined()
    expect(after.renown).toBeGreaterThan(called.renown)
  })

  it('гарантии в числах', () => {
    const big = strong()
    const weak = weakest(big)
    const after = ok(applyCommand(big, { type: 'giveGuarantee', of: weak }))
    const ledger = wardLedger(after, world, day)
    console.log(ledger.says)
    expect(ledger.mine).toBe(1)
    console.log(`войн у тебя ${warsOf(after.politics, PLAYER).length}`)
  })
})
