import { describe, expect, it } from 'vitest'
import {
  BIAS,
  BIAS_DEFS,
  beliefOf,
  biasLedger,
  biasOf,
  errorSays,
  loudEnough,
  ownStrengthAs,
  shadedBy,
} from '../src/bias'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { crownGame, seenStrength, strengthOf } from '../src/mind'
import { seenBy } from '../src/picture'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 120: он ошибается и упорствует.
 *
 * Картина мира и выводы сделали ИИ похожим на игрока в том, что он знает не
 * всё. Здесь он похож в том, чего в 0.7 не было вовсе: он видит то, что ждёт
 * увидеть, держится своего и бросает заблуждение только когда его опровергнут
 * слишком громко.
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
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 900)
    .slice(0, 6)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    party: { ...game.party, units: { militia: 120, spearman: 40 }, morale: 70 },
    ...extra,
  }
}

describe('Уп1 и Уп2: предубеждение и переоценка себя', () => {
  it('нрав решает, в какую сторону он ошибается', () => {
    const state = ruler()
    for (const [id, def] of Object.entries(BIAS_DEFS)) {
      console.log(
        `${def.label}: ${def.about} Чужое ×${1 + def.onOthers}, своё ×${1 + def.onSelf}, упорство ${def.stubborn} — ${id}`,
      )
    }
    const kinds = kingdoms.map((one) => `${one}: ${BIAS_DEFS[biasOf(one)].label}`)
    console.log(`нравы корон: ${kinds.join(', ')}`)

    const truth = strengthOf(state, world, PLAYER, day).score
    for (const side of kingdoms.slice(0, 4)) {
      console.log(
        `${side} (${BIAS_DEFS[biasOf(side)].label}) видит твою силу ${shadedBy(side, truth)} при ${truth}`,
      )
    }
    const proud = kingdoms.find((one) => biasOf(one) === 'proud')
    const fearful = kingdoms.find((one) => biasOf(one) === 'fearful')
    if (proud) expect(shadedBy(proud, truth)).toBeLessThan(truth)
    if (fearful) expect(shadedBy(fearful, truth)).toBeGreaterThan(truth)
  })

  it('своё войско он считает не тем, что оно есть', () => {
    const state = ruler()
    for (const side of kingdoms.slice(0, 3)) {
      const own = ownStrengthAs(state, world, side, day)
      console.log(own.says)
      expect(own.truth).toBeGreaterThan(0)
    }
    const proud = kingdoms.find((one) => biasOf(one) === 'proud')
    if (!proud) return
    const own = ownStrengthAs(state, world, proud, day)
    expect(own.thinks).toBeGreaterThan(own.truth)
  })
})

describe('Уп3: инерция', () => {
  it('тихое опровержение мнения не меняет', () => {
    const side = kingdoms[1] as string
    const quiet = loudEnough(side, 1000, 1150)
    const loud = loudEnough(side, 1000, 2000)
    console.log(
      `${BIAS_DEFS[biasOf(side)].label}: 1000 → 1150 разошлось на ${quiet.delta} при нужде ${quiet.needs} — ${quiet.loud ? 'передумал' : 'держится'}`,
    )
    console.log(`1000 → 2000 разошлось на ${loud.delta} — ${loud.loud ? 'передумал' : 'держится'}`)
    expect(quiet.loud).toBe(false)
    expect(loud.loud).toBe(true)
    // Поражение громче любой вести: то же расхождение становится довольно громким.
    const afterBattle = loudEnough(side, 1000, 1150, BIAS.battleLoud)
    console.log(`то же после поражения: нужда ${afterBattle.needs}`)
    expect(afterBattle.needs).toBeLessThan(quiet.needs)

    // И решения идут по тому, во что он верит, а не по правде.
    const state = ruler({
      beliefs: { [`${side}:${PLAYER}`]: { value: 99999, day: day - 30 } },
    })
    const seen = seenBy(state, world, side, PLAYER, day, { score: 50, error: 0 })
    console.log(seen.says)
    expect(seen.value).toBe(99999)
    const gambit = crownGame(state, world, side, day)
    console.log(`его партия при таком мнении: ${gambit.aim} — ${gambit.why}`)
    expect(seenStrength(state, world, side, PLAYER, day).score).toBe(99999)
  })
})

describe('Уп4: прозрение', () => {
  it('когда он понимает, что ошибался, это событие', () => {
    const side = kingdoms[1] as string
    const state = ruler({
      beliefs: { [`${side}:${PLAYER}`]: { value: 4, day: day - 40 } },
      spies: [{ id: 'spy:1', kingdomId: side, seat: 'court', sinceDay: day - 100 }],
    })
    const before = beliefOf(state, side, PLAYER)
    let later = state
    for (let step = 0; step < BIAS.beat + 2; step += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const after = beliefOf(later, side, PLAYER)
    console.log(later.log.find((one) => one.text.includes('переменил партию'))?.text)
    console.log(`во что верил: ${before?.value} → ${after?.value}`)
    expect(after?.value).not.toBe(before?.value)
    expect(later.biasLog?.woke ?? 0).toBeGreaterThan(0)
  })
})

describe('Уп5 и Уп6: цена упорства и слова', () => {
  it('ошибка называется словами', () => {
    const side = kingdoms[1] as string
    console.log(errorSays(side, world, PLAYER, 200, 100))
    console.log(errorSays(side, world, PLAYER, 50, 100))
    console.log(errorSays(side, world, PLAYER, 120, 100))
    console.log(errorSays(side, world, PLAYER, 102, 100))
    expect(errorSays(side, world, PLAYER, 200, 100)).toContain('вдвое больше')
    expect(errorSays(side, world, PLAYER, 50, 100)).toContain('вдвое меньше')

    const state = ruler({
      beliefs: { [`${side}:${PLAYER}`]: { value: 10, day: day - 10 } },
      spies: [{ id: 'spy:1', kingdomId: side, seat: 'court', sinceDay: day - 100 }],
    })
    const weighed = ok(applyCommand(state, { type: 'weighError', of: side }))
    for (const line of weighed.log.filter(
      (one) => one.text.includes('думает') || one.text.includes('войско'),
    )) {
      console.log(line.text)
    }
    expect(weighed.log.some((one) => one.text.includes('ждёт увидеть'))).toBe(true)

    // Без своего человека там заглянуть нельзя.
    expect(applyCommand(ruler(), { type: 'weighError', of: side }).ok).toBe(false)
  })

  it('век считает упорство и прозрения', () => {
    const state = ruler()
    console.log(biasLedger(state).says)
    let later = state
    for (let step = 0; step < BIAS.beat * 2 + 2; step += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const ledger = biasLedger(later)
    console.log(ledger.says)
    expect(ledger.held + ledger.woke).toBeGreaterThan(0)
  })
})
