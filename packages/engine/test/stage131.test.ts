import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { DOORS, DOOR_DEFS, UNION } from '../src/content/union'
import { type Settlement, createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { doorsTo, harderNow, unionOf, unionWorld, whoIsLeft } from '../src/union'
import { createPolitics } from '../src/war'
import { recognisedBySides, recognises, wayOf } from '../src/way'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 131: путь короны.
 *
 * Объединить мир — не «взять сорок мест»: пока есть корона, которая тебя не
 * признала, ты первый среди спорящих. Признание берётся четырьмя дверями, и
 * последние трое берутся не тем, чем первые пять.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const foe = kingdoms[1] as string
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
    ...createGame(createCharacter({ name: 'Ратша', money: 400000 }), 1, world),
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? '',
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    ...extra,
  }
}

describe('Кр1: что значит «объединить»', () => {
  it('дело не в числе мест, а в том, что признавать больше некому', () => {
    const big = ruler(30)
    const union = unionOf(big, world, PLAYER, day)
    console.log(`тридцать мест: ${union.says}`)
    expect(union.all).toBe(false)
    expect(union.finished).toBe(false)

    // А признание всех — ещё не конец: его надо удержать.
    const all: GameState = {
      ...big,
      recognitions: Object.fromEntries(kingdoms.map((one) => [one, day - 100])),
      union: { sinceDay: day - 100 },
    }
    const young = unionOf(all, world, PLAYER, day)
    const old = unionOf(all, world, PLAYER, day + 365 * UNION.holdYears)
    console.log(`признали все, держится: ${young.says}`)
    console.log(`через ${UNION.holdYears} лет: ${old.says}`)
    expect(young.finished).toBe(false)
    expect(old.finished).toBe(true)
  })
})

describe('Кр2: четыре двери', () => {
  it('у каждой своя цена и своя прочность', () => {
    for (const door of DOORS) {
      const def = DOOR_DEFS[door]
      console.log(`${def.label}: ${def.about} Платится ${def.costs}. ${def.after}`)
    }
    const state = ruler(8)
    for (const one of doorsTo(state, world, PLAYER, foe, day)) {
      console.log(`${one.door}: ${one.can ? 'открыто' : 'закрыто'} — ${one.says}`)
    }
    expect(doorsTo(state, world, PLAYER, foe, day)).toHaveLength(4)
  })

  it('родство признаёт без силы, и дар тоже', () => {
    const state = ruler(8)
    expect(recognises(state, world, PLAYER, foe, day)).toBe(false)

    const married: GameState = {
      ...state,
      marriages: [{ kingdomId: foe, who: 'self', name: 'Милава', sinceDay: day - 20, dowry: 0 }],
    }
    console.log(`в родстве: признаёт ${recognises(married, world, PLAYER, foe, day)}`)
    expect(recognises(married, world, PLAYER, foe, day)).toBe(true)

    const gift = doorsTo(state, world, PLAYER, foe, day).find((one) => one.door === 'coin')
    if (!gift) return
    const paid = ok(applyCommand(state, { type: 'giftRecognition', to: foe }))
    console.log(paid.log.find((one) => one.text.includes('признаёт тебя'))?.text)
    console.log(`казна ${state.character.money} → ${paid.character.money}`)
    expect(paid.character.money).toBe(state.character.money - gift.cost)
    expect(recognises(paid, world, PLAYER, foe, day)).toBe(true)
    // Дважды одну корону не покупают.
    expect(applyCommand(paid, { type: 'giftRecognition', to: foe }).ok).toBe(false)
  })
})

describe('Кр3: последние не сдаются', () => {
  it('чем меньше осталось, тем дороже каждый следующий', () => {
    for (const left of [8, 5, 3, 2, 1]) {
      console.log(`осталось ${left}: цена ×${harderNow(left)}`)
    }
    expect(harderNow(8)).toBe(1)
    expect(harderNow(1)).toBeGreaterThan(harderNow(3))

    const state = ruler(10)
    const many = doorsTo(state, world, PLAYER, foe, day).find((one) => one.door === 'coin')
    const few: GameState = {
      ...state,
      recognitions: Object.fromEntries(
        kingdoms
          .filter((one) => one !== foe)
          .slice(0, 6)
          .map((one) => [one, day - 10]),
      ),
    }
    const last = doorsTo(few, world, PLAYER, foe, day).find((one) => one.door === 'coin')
    console.log(
      `дар ${world.kingdoms[foe]?.name}: когда не признали восьмеро — ${many?.cost}; когда он остался почти один — ${last?.cost}`,
    )
    expect(last?.cost ?? 0).toBeGreaterThan(many?.cost ?? 0)
  })
})

describe('Кр4 и Кр5: удержать и что потом', () => {
  it('срок идёт сам, и сбивается, если кто-то отвалился', () => {
    const all: GameState = {
      ...ruler(12),
      recognitions: Object.fromEntries(kingdoms.map((one) => [one, day - 10])),
    }
    let later = all
    for (let step = 0; step < 12; step += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    console.log(later.log.find((one) => one.text.includes('признали все'))?.text)
    console.log(`срок пошёл с ${later.union?.sinceDay ?? 'нет'}-го дня`)
    expect(later.union).not.toBeNull()

    // Отозвалось признание — срок сбит.
    const lost: GameState = { ...later, recognitions: {} }
    let after = lost
    for (let step = 0; step < 12; step += 1) {
      after = ok(applyCommand(after, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    console.log(after.log.find((one) => one.text.includes('отвалилось'))?.text ?? 'держится')
    expect(after.union).toBeNull()
  })

  it('мир под одной рукой играется иначе', () => {
    const all: GameState = {
      ...ruler(12),
      recognitions: Object.fromEntries(kingdoms.map((one) => [one, day - 10])),
      union: { sinceDay: day - 10 },
    }
    const world_ = unionWorld(all, world, day)
    console.log(world_.says)
    expect(world_.unrest).toBeGreaterThan(0)
    expect(world_.revolts).toBeGreaterThan(1)
    expect(unionWorld(ruler(12), world, day).unrest).toBe(0)
  })
})

describe('Кр6: путь короны в числах', () => {
  it('видно, кто остался и чем его брать', () => {
    const state = ruler(12)
    const left = whoIsLeft(state, world, PLAYER, day)
    for (const one of left) console.log(one.says)
    expect(left.length).toBeGreaterThan(0)
    const crown = wayOf(state, world, PLAYER, 'crown', day)
    console.log(crown.says)
    console.log(
      `признали ${recognisedBySides(state, world, PLAYER, day).yes.length} из ${kingdoms.length}`,
    )
    expect(crown.of).toBe(5)
  })
})
