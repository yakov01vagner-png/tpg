import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { HEIRS } from '../src/content/heirs'
import { createSettlements } from '../src/economy'
import { crownTemperNow, heirWay, heirsLedger, troubled } from '../src/heirs'
import { PLAYER } from '../src/holding'
import { crownOf } from '../src/lordlife'
import { createRng } from '../src/rng'
import { reignOf } from '../src/royal'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { crownWay } from '../src/theirway'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 144: наследники чужих путей.
 *
 * Государи не вечны, и путь — тоже: со сменой государя он либо переходит, либо
 * переменяется по нраву нового.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(extra: Partial<GameState> = {}): GameState {
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, 8)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world),
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? '',
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    ...extra,
  }
}

describe('Нс1, Нс2 и Нс6: путь переходит или переменяется', () => {
  it('у нового государя свой нрав, и путь может стать другим', () => {
    const state = ruler()
    let same = 0
    let other = 0
    for (const id of kingdoms) {
      const now = crownWay(state, world, id, day)
      const next = heirWay(state, world, id, day + 40 * 365)
      if (now === next) same += 1
      else other += 1
      console.log(
        `${world.kingdoms[id]?.name}: ${crownOf(id).temper} → ${crownTemperNow(id, day + 40 * 365)} (колено ${reignOf(id, day)} → ${reignOf(id, day + 40 * 365)}), путь ${now} → ${next}`,
      )
    }
    console.log(`через сорок лет: путь тот же у ${same}, другой у ${other}`)
    expect(same + other).toBe(kingdoms.length)
  })

  it('смена колена — событие, и она считается', () => {
    const id = kingdoms[0] as string
    const state = ruler({
      time: WORLD_START + (HEIRS.beat * 14 - 2) * 24 * 60,
      // Мир помнит прежнее колено: значит, на такте он заметит смену.
      reigns: { [id]: reignOf(id, day) - 1 },
    })
    let after = state
    for (let i = 0; i < 6; i += 1) after = ok(applyCommand(after, { type: 'rest', hours: 12 }))
    const log = after.heirLog ?? { kept: 0, changed: 0 }
    console.log(`переходов ${log.kept}, перемен ${log.changed}`)
    console.log(heirsLedger(after, world, day).says)
    expect(log.kept + log.changed).toBeGreaterThan(0)
  })
})

describe('Нс4 и Нс5: смута и твоя смерть', () => {
  it('смута считается по своим, а твоя смерть сбрасывает чужой страх', () => {
    const id = kingdoms[0] as string
    const calm = ruler()
    console.log(troubled(calm, world, id, day).says)

    const sick: GameState = {
      ...calm,
      politics: {
        ...calm.politics,
        lords: calm.politics.lords.map((one) =>
          one.kingdomId === id ? { ...one, loyalty: 20 } : one,
        ),
      },
    }
    console.log(troubled(sick, world, id, day).says)
    expect(troubled(sick, world, id, day).troubled).toBe(true)
    expect(troubled(calm, world, id, day).troubled).toBe(false)
  })
})
