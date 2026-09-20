import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { DREAD } from '../src/content/dread'
import { LOOKS, LOOK_DEFS, PRIMACY, TEMPER_LOOK } from '../src/content/primacy'
import { dreadSeen, wayTruth } from '../src/dread'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import {
  courtSplit,
  firstPays,
  goingQuiet,
  loudAndQuiet,
  primacyLedger,
  quietCost,
  rightlyFirst,
} from '../src/primacy'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics, pairOf } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 139: цена первенства.
 *
 * Быть первым — положение, за которое платят: серебром, своим двором и
 * выбором между «громко и быстро» и «тихо и долго».
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

/** Шесть владетелей мира становятся твоими: по их нравам и считается двор. */
function withVassals(state: GameState): GameState {
  const lords = [...state.politics.lords]
  for (let i = 0; i < 6; i += 1) {
    const lord = lords[i]
    if (lord) lords[i] = { ...lord, kingdomId: PLAYER, loyalty: 60 }
  }
  return { ...state, politics: { ...state.politics, lords } }
}

/** Тот, кто уже далеко по пути короны. */
function far(extra: Partial<GameState> = {}): GameState {
  return ruler(16, {
    crowned: { day: 300, titleId: 'king', guests: kingdoms.slice(0, 3), absent: [] },
    recognitions: Object.fromEntries(kingdoms.slice(0, 5).map((id) => [id, 100])),
    ...extra,
  })
}

describe('Це1 и Це2: первый платит, и свои считают', () => {
  it('с того, кто ближе к концу, просят больше', () => {
    const small = ruler(2)
    console.log(firstPays(small, world, day).says)

    const big = far()
    const pays = firstPays(big, world, day)
    console.log(pays.says)
    expect(pays.times).toBeGreaterThan(firstPays(small, world, day).times)

    // И это настоящая цена. Чтобы в ней было видно именно первенство, обе
    // стороны берутся признанными: непризнанность (этап 138) считается отдельно.
    const all = Object.fromEntries(kingdoms.map((id) => [id, 100]))
    const beginner = ruler(2, { recognitions: all })
    const leader = far({ recognitions: all })
    console.log(
      `множители: начинающий ×${firstPays(beginner, world, day).times}, первый ×${firstPays(leader, world, day).times}`,
    )
    const to = kingdoms[1] ?? ''
    const cheap = ok(
      applyCommand(beginner, { type: 'sendEnvoy', to, errand: 'passage', byLetter: true }),
    )
    const dear = ok(
      applyCommand(leader, { type: 'sendEnvoy', to, errand: 'passage', byLetter: true }),
    )
    console.log(
      `письмо у начинающего ${beginner.character.money - cheap.character.money}, у первого ${leader.character.money - dear.character.money}`,
    )
    expect(leader.character.money - dear.character.money).toBeGreaterThan(
      beginner.character.money - cheap.character.money,
    )
  })

  it('одним твой путь слава, другим страх', () => {
    for (const id of LOOKS) console.log(`${LOOK_DEFS[id].label}: ${LOOK_DEFS[id].says}`)
    console.log(
      `по нравам: ${Object.entries(TEMPER_LOOK)
        .map(([temper, look]) => `${temper} — ${LOOK_DEFS[look].label}`)
        .join(', ')}`,
    )
    const state = withVassals(far())
    const split = courtSplit(state, world, day)
    console.log(split.says)
    expect(split.glory + split.fear).toBe(
      state.politics.lords.filter((one) => one.kingdomId === PLAYER).length,
    )
    expect(split.glory).toBeGreaterThan(0)
    expect(split.fear).toBeGreaterThan(0)

    // И это не слова: за такт двор расходится в разные стороны.
    let after: GameState = {
      ...state,
      time: WORLD_START + (PRIMACY.beat * 14 - 2) * 24 * 60,
    }
    const before = after.politics.lords.filter((one) => one.kingdomId === PLAYER)
    for (let i = 0; i < 6; i += 1) after = ok(applyCommand(after, { type: 'rest', hours: 12 }))
    const now = new Map(after.politics.lords.map((one) => [one.id, one.loyalty]))
    console.log(
      `верность: ${before.map((one) => `${one.name} ${one.loyalty} -> ${now.get(one.id) ?? '—'}`).join(', ')}`,
    )
    expect(before.some((one) => (now.get(one.id) ?? one.loyalty) > one.loyalty)).toBe(true)
    expect(before.some((one) => (now.get(one.id) ?? one.loyalty) < one.loyalty)).toBe(true)
  })
})

describe('Це3 и Це4: тихо и долго против громко и быстро', () => {
  it('тихий не коронуется и соборов не созывает', () => {
    const state = far()
    console.log(quietCost(state, world, day).says)
    const quiet = ok(applyCommand(state, { type: 'goQuiet' }))
    expect(goingQuiet(quiet)).toBe(true)
    console.log(quietCost(quiet, world, day).says)

    const crown = applyCommand({ ...quiet, crowned: null }, { type: 'crownSelf' })
    console.log(crown.ok ? 'венчался тихо' : crown.message)
    expect(crown.ok).toBe(false)

    const synod = applyCommand(quiet, { type: 'churchDeed', deed: 'synod' })
    console.log(synod.ok ? 'созвал собор тихо' : synod.message)
    expect(synod.ok).toBe(false)

    const loud = ok(applyCommand(quiet, { type: 'goLoud' }))
    expect(goingQuiet(loud)).toBe(false)
  })

  it('тихого дальние не слышат вовсе', () => {
    const loud = far({ time: WORLD_START + (DREAD.wordBeat * 14 - 2) * 24 * 60 })
    const quiet = ok(applyCommand(loud, { type: 'goQuiet' }))
    const after = (state: GameState): GameState => {
      let out = state
      for (let i = 0; i < 4; i += 1) out = ok(applyCommand(out, { type: 'rest', hours: 12 }))
      return out
    }
    const loudly = after(loud)
    const quietly = after(quiet)
    const heardLoud = kingdoms.filter(
      (id) => dreadSeen(loudly, world, id, PLAYER, dayOfState(loudly)).known.value !== null,
    ).length
    const heardQuiet = kingdoms.filter(
      (id) => dreadSeen(quietly, world, id, PLAYER, dayOfState(quietly)).known.value !== null,
    ).length
    console.log(`о громком услышали ${heardLoud} корон, о тихом — ${heardQuiet}`)
    expect(heardQuiet).toBeLessThan(heardLoud)

    const split = loudAndQuiet(loud, world, PLAYER, day)
    console.log(split.says)
    expect(split.loud).toBeGreaterThan(0)
  })
})

describe('Це5 и Це6: ошибиться в чужом первенстве и вся цена в числах', () => {
  it('собрать мир не против того стоит', () => {
    const state = far()
    const wrong = kingdoms.find((id) => !rightlyFirst(state, world, id, day).right) as string
    console.log(rightlyFirst(state, world, wrong, day).says)
    expect(rightlyFirst(state, world, wrong, day).right).toBe(false)

    const marked: GameState = {
      ...state,
      renown: 12,
      wrongCalls: [{ against: wrong, day: day - PRIMACY.showsUp - 1 }],
      time: WORLD_START + (PRIMACY.beat * 14 - 2) * 24 * 60,
    }
    let after = marked
    for (let i = 0; i < 6; i += 1) after = ok(applyCommand(after, { type: 'rest', hours: 12 }))
    const row = (after.wrongCalls ?? [])[0]
    const cold = kingdoms.filter(
      (id) =>
        (after.politics.relations[pairOf(PLAYER, id)] ?? 0) <
        (marked.politics.relations[pairOf(PLAYER, id)] ?? 0),
    ).length
    console.log(
      `вскрылось на ${row?.shown ?? 0}-й день; слава ${marked.renown} -> ${after.renown}; похолодало у ${cold} корон`,
    )
    expect(row?.shown ?? 0).toBeGreaterThan(0)
    expect(after.renown).toBeLessThan(marked.renown)
  })

  it('цена первенства в числах', () => {
    const state = far()
    const ledger = primacyLedger(state, world, day)
    console.log(ledger.says)
    console.log(`продвижение ${wayTruth(state, world, PLAYER, day)} из ста`)
    expect(ledger.times).toBeGreaterThan(1)
  })
})
