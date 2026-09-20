import { describe, expect, it } from 'vitest'
import { type Battle, startBattle, unitsSize } from '../src/battle'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { GROUNDS } from '../src/content/field'
import { MELEE, PHASE_DEFS, WEATHERS, WEATHER_DEFS, type WeatherId } from '../src/content/melee'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import {
  battleChoices,
  battleReport,
  brokenSide,
  meleeRoll,
  phaseOf,
  phaseSays,
  standouts,
  weatherFor,
} from '../src/melee'
import type { Party } from '../src/party'
import { partySize } from '../src/party'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 171: бой, который хочется смотреть.
 *
 * Бой считался честно, а смотреть его было нечем: раунды шли ровной чередой, и
 * один не отличался от другого. Здесь у боя появляется ход — сходятся,
 * сшиблись, переломилось, гонят, — над полем стоит погода, а в строю видны
 * люди с именами.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const capital = Object.values(world.locations).find((one) => one.archetype === 'capital')?.id ?? ''

function party(units: Record<string, number>): Party {
  return { units, morale: 70, hungryDays: 0, gear: 0.5, veterans: 0 } as Party
}

function foe(count: number) {
  return { name: 'Чужая дружина', units: { spearman: count }, morale: 70, fatigue: 0 }
}

function captain(units: Record<string, number> = { spearman: 60, archer: 20 }): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 9000 }), 1, world)
  return {
    ...game,
    politics,
    settlements,
    time: WORLD_START,
    locationId: capital,
    quarter: null,
    party: party(units),
    character: {
      ...game.character,
      skills: {
        ...game.character.skills,
        command: { ...game.character.skills.command, level: 50, xp: 0 },
      },
    },
  }
}

function ok(result: ReturnType<typeof applyCommand>): GameState {
  if (!result.ok) throw new Error(result.message)
  return result.state
}

function fight(state: GameState, order: string, limit = 40): GameState {
  let current = state
  for (let i = 0; i < limit; i += 1) {
    if (current.battle?.outcome !== 'ongoing') break
    const result = applyCommand(current, {
      type: 'battleOrders',
      orders: { vanguard: order, archers: order, flank: order, reserve: order },
    } as never)
    if (!result.ok) break
    current = result.state
  }
  return current
}

describe('Бй1 и Бй2: у боя есть ход, и над полем — небо', () => {
  it('поры боя названы, и каждая весит по-своему', () => {
    const state = captain()
    const battle = startBattle(state.party, foe(80), 'plains', { ground: 'open' })
    expect(phaseOf(battle)).toBe('array')
    console.log(phaseSays(battle))
    const after = fight({ ...state, battle }, 'charge')
    const log = after.battle?.log ?? []
    for (const line of log.slice(0, 6)) console.log(line)
    // В журнале боя раунды названы порой, а не номером.
    expect(log.some((one) => one.includes(PHASE_DEFS.clash.label))).toBe(true)
    // Пора считается из духа и раунда, а не хранится.
    const shaken: Battle = { ...battle, round: 3, morale: MELEE.breaks - 5 }
    expect(phaseOf(shaken)).toBe('break')
    expect(brokenSide(shaken)).toBe('own')
    expect(phaseOf({ ...battle, outcome: 'won' })).toBe('chase')
  })

  it('погода выводится из дня и времени года и меняет бой числами', () => {
    const seen = new Set<WeatherId>()
    for (let day = 1; day < 400; day += 7) seen.add(weatherFor(day))
    console.log(`за год над полем: ${[...seen].map((one) => WEATHER_DEFS[one].label).join(', ')}`)
    expect(seen.size).toBeGreaterThan(2)
    // Из одного дня — одна и та же погода.
    expect(weatherFor(120)).toBe(weatherFor(120))
    // Метель слепит стрелка, распутица вяжет конницу — и это числа.
    expect(WEATHER_DEFS.snow.sight).toBeLessThan(WEATHER_DEFS.clear.sight)
    expect(WEATHER_DEFS.mud.horse).toBeLessThan(WEATHER_DEFS.clear.horse)
    const state = captain({ horseman: 60 })
    const dry = fight(
      {
        ...state,
        battle: startBattle(state.party, foe(60), 'plains', { ground: 'open', weather: 'clear' }),
      },
      'charge',
    )
    const wet = fight(
      {
        ...state,
        battle: startBattle(state.party, foe(60), 'plains', { ground: 'open', weather: 'mud' }),
      },
      'charge',
    )
    console.log(
      `шестьдесят конных: посуху уцелело ${partySize(dry.party)} за ${dry.battle?.round} р., ` +
        `в распутицу ${partySize(wet.party)} за ${wet.battle?.round} р.`,
    )
    expect(partySize(wet.party)).toBeLessThanOrEqual(partySize(dry.party))
  })
})

describe('Бй3 и Бй4: решения и люди', () => {
  it('в бою три-четыре настоящих решения, и у каждого названа цена', () => {
    const state = captain()
    const open = startBattle(state.party, foe(80), 'plains', { ground: 'open' })
    const ford = startBattle(state.party, foe(80), 'plains', { ground: 'ford' })
    const inField = battleChoices(open)
    const atFord = battleChoices(ford)
    for (const one of inField) console.log(`${one.label}: ${one.says}`)
    console.log('— у брода —')
    for (const one of atFord) console.log(`${one.label}: ${one.says}`)
    expect(inField.length).toBeGreaterThanOrEqual(3)
    // В поле есть куда обходить, у брода — нет, и решение другое.
    expect(inField.some((one) => one.id === 'flank')).toBe(true)
    expect(atFord.some((one) => one.id === 'feint')).toBe(true)
    expect(GROUNDS.ford.flanks).toBe(false)
  })

  it('в строю видны люди из книги набора', () => {
    const state = captain({ spearman: 20 })
    const enlisted = ok(applyCommand(state, { type: 'rest', hours: 12 }))
    const battle = startBattle(enlisted.party, foe(20), 'plains', { ground: 'open' })
    const who = standouts(enlisted, world, battle, 1)
    console.log(who.says)
    expect(who.stood).toBeTruthy()
    expect(who.shone).toBeTruthy()
    expect(who.says).toContain('Отличился')
  })
})

describe('Бй5 и Бй6: разбор и сто боёв', () => {
  it('после боя сказано, почему вышло так', () => {
    const state = captain()
    const after = fight(
      {
        ...state,
        battle: startBattle(state.party, foe(90), 'plains', { ground: 'ford', weather: 'rain' }),
      },
      'hold',
    )
    const battle = after.battle as Battle
    const report = battleReport(battle, 'rain')
    for (const line of report.lines) console.log(line)
    expect(report.lines.length).toBeGreaterThanOrEqual(4)
    expect(report.says).toContain('Почему вышло так')
  })

  it('сто боёв: исходы, длина и доля разгромов', () => {
    const rows: { outcome: string; rounds: number }[] = []
    for (let seed = 1; seed <= 100; seed += 1) {
      const state = { ...captain(), rng: createRng(seed) }
      const ground = seed % 3 === 0 ? 'ford' : seed % 3 === 1 ? 'open' : 'forest'
      const weather = WEATHERS[seed % WEATHERS.length] as never
      const after = fight(
        {
          ...state,
          battle: startBattle(state.party, foe(60 + (seed % 60)), 'plains', { ground, weather }),
        },
        seed % 2 === 0 ? 'charge' : 'hold',
      )
      rows.push({
        outcome: after.battle?.outcome ?? 'ongoing',
        rounds: after.battle?.round ?? 0,
      })
    }
    const rolled = meleeRoll(rows)
    console.log(rolled.says)
    expect(rolled.fought).toBe(100)
    expect(rolled.won + rolled.lost + rolled.fled).toBeGreaterThan(80)
    expect(rolled.rounds).toBeGreaterThan(1)
  })
})
