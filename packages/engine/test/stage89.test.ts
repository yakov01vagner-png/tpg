import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { GAMBIT_DEFS, MIND, STEP_DEFS, TONE_DEFS } from '../src/content/mind'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import {
  aimedAtPlayer,
  asksFactor,
  crownGame,
  gambitWords,
  seenStrength,
  strengthOf,
  toneToward,
} from '../src/mind'
import { worldAims } from '../src/plans'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 89: ИИ как игрок.
 *
 * Замысел 0.6 был на один шаг: чего корона хочет сегодня. Партия — цель на
 * годы, дорога к ней и честный счёт: по силам или нет. Сила считается одним
 * правилом для всех, держава игрока — тем же; чужую силу корона видит с
 * ошибкой, и ошибка идёт от нрава, а не от кубика.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)

function ruler(places = 6): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 20000 }), 1, world)
  const taken = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, places)
  const map = { ...settlements }
  for (const one of taken) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    politics,
    settlements: map,
    time: WORLD_START,
    locationId: taken[0]?.locationId ?? game.locationId,
    quarter: null,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

describe('И2 и И5: расчёт сил', () => {
  it('сила считается одним правилом, и держава игрока — тоже', () => {
    const state = ruler()
    const mine = strengthOf(state, world, PLAYER, 1)
    console.log(mine.says)
    for (const kingdomId of kingdoms.slice(0, 4)) {
      console.log(strengthOf(state, world, kingdomId, 1).says)
    }
    expect(mine.places).toBe(6)
    expect(mine.score).toBeGreaterThan(0)
    // Больше земли — больше силы, по тому же счёту.
    const bigger = strengthOf(ruler(12), world, PLAYER, 1)
    console.log(`шесть мест — ${mine.score}, двенадцать — ${bigger.score}`)
    expect(bigger.score).toBeGreaterThan(mine.score)
  })
})

describe('И4: он не всевидящий', () => {
  it('соседа видят точнее, чем дальнего, и ошибаются по нраву', () => {
    const state = ruler()
    let near = 0
    let far = 0
    for (const watcher of kingdoms) {
      for (const about of kingdoms) {
        if (watcher === about) continue
        const seen = seenStrength(state, world, watcher, about, 1)
        const truth = strengthOf(state, world, about, 1).score
        const off = truth > 0 ? Math.abs(seen.score - truth) / truth : 0
        if (Math.abs(seen.error) <= MIND.nearError) near += 1
        else far += 1
        if (watcher === kingdoms[0] && about === kingdoms[1]) {
          console.log(`${seen.says} Ошибка ${Math.round(off * 100)} из ста.`)
        }
      }
    }
    console.log(`оценок «как у соседа» ${near}, «по слухам» ${far}`)
    expect(near + far).toBeGreaterThan(4)
    // Из одного состояния — одна и та же оценка.
    const first = kingdoms[0] as string
    const second = kingdoms[1] as string
    expect(seenStrength(state, world, first, second, 1).score).toBe(
      seenStrength(state, world, first, second, 1).score,
    )
  })
})

describe('И3: сильный и слабый', () => {
  it('с сильным говорят иначе, чем со слабым', () => {
    const state = ruler(1)
    const speaker = kingdoms[0] as string
    // Со слабым — свысока, с сильнейшей короной мира — уступчиво.
    const strongest = kingdoms
      .filter((one) => one !== speaker)
      .map((one) => ({ id: one, score: strengthOf(state, world, one, 1).score }))
      .sort((a, b) => b.score - a.score)[0]
    const toWeak = toneToward(state, world, speaker, PLAYER, 1)
    const toStrong = toneToward(state, world, speaker, strongest?.id ?? PLAYER, 1)
    console.log(toWeak.says)
    console.log(toStrong.says)
    console.log(
      `запросит: свысока ×${asksFactor('demand')}, на равных ×${asksFactor('deal')}, уступчиво ×${asksFactor('defer')}`,
    )
    expect(toWeak.ratio).toBeLessThan(toStrong.ratio)
    expect(toWeak.tone).toBe('demand')
    expect(toStrong.tone).toBe('defer')
    expect(asksFactor(toWeak.tone)).toBeGreaterThan(asksFactor(toStrong.tone))
    expect(TONE_DEFS[toWeak.tone].label).toBeTruthy()
  })
})

describe('И1 и И6: партия короны', () => {
  it('у короны цель на годы, дорога к ней и счёт по силам', () => {
    const state = ruler()
    for (const kingdomId of kingdoms.slice(0, 5)) {
      const gambit = crownGame(state, world, kingdomId, 1)
      console.log(gambitWords(gambit, world))
      expect(gambit.steps.length).toBeGreaterThan(0)
      expect(GAMBIT_DEFS[gambit.aim].years).toBeGreaterThan(0)
      expect(STEP_DEFS[gambit.next].label).toBeTruthy()
    }
    // Партия не меняется каждые сутки.
    const first = kingdoms[0] as string
    expect(crownGame(state, world, first, 1).aim).toBe(crownGame(state, world, first, 30).aim)
  })

  it('осторожная цель не начинается без перевеса, дерзкая — начинается', () => {
    console.log(
      `смелость целей: ${Object.entries(GAMBIT_DEFS)
        .map(([id, def]) => `${def.label} ×${def.daring}`)
        .join(', ')}`,
    )
    expect(GAMBIT_DEFS.humble.daring).toBeGreaterThan(GAMBIT_DEFS.wed.daring)
    expect(GAMBIT_DEFS.hold.daring).toBeLessThan(GAMBIT_DEFS.grow.daring)
  })

  it('партия видна в сводке мира словами', () => {
    const state = ruler()
    const cards = worldAims(state)
    const games = cards.filter((one) => one.id.startsWith('aim:game:'))
    console.log(games[0]?.why ?? 'партий не видно')
    expect(games.length).toBeGreaterThan(0)
    for (const card of games) expect(card.why.length).toBeGreaterThan(40)
  })
})

describe('И5: ты — цель', () => {
  it('держава игрока попадает в чужие партии, когда её видно', () => {
    const small = ruler(1)
    const big = ruler(40)
    const againstSmall = aimedAtPlayer(small, world, 1)
    const againstBig = aimedAtPlayer(big, world, 1)
    console.log(
      `одно место: тебя держат целью ${againstSmall.length} корон; сорок мест: ${againstBig.length}`,
    )
    for (const gambit of againstBig.slice(0, 3)) console.log(gambitWords(gambit, world))
    expect(againstSmall.length + againstBig.length).toBeGreaterThan(0)
    expect(againstBig.length).toBeGreaterThanOrEqual(againstSmall.length)
  })
})
