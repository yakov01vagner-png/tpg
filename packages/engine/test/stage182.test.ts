import { describe, expect, it } from 'vitest'
import { assizeRoll, caseFlow, caseNow, otherCourts, verdictCost, weighsToo } from '../src/assize'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { ASSIZE, COURT_PROOF_DEFS } from '../src/content/assize'
import { type Settlement, createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import type { Lord } from '../src/war'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 182: суд.
 *
 * Дело приходило по расписанию, доводов у сторон не было, свидетелей не было,
 * правды, которой ты не знаешь, тоже. Суд был выбором без веса.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function judgeState(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 9000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, 4)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  const theirs = politics.lords.filter((one) => one.kingdomId !== null).slice(0, 2)
  const lords: Lord[] = politics.lords.map((one) =>
    theirs.some((row) => row.id === one.id) ? { ...one, kingdomId: PLAYER } : one,
  )
  return {
    ...game,
    politics: { ...politics, lords },
    settlements: map,
    time: WORLD_START + 60 * 24 * 60,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

function ok(result: ReturnType<typeof applyCommand>): GameState {
  if (!result.ok) throw new Error(result.message)
  return result.state
}

describe('Сд1 и Сд2: дело как дело, и решение стоит', () => {
  it('у сторон есть доводы, свидетели и правда, которой ты не знаешь', () => {
    const state = judgeState()
    const now = caseNow(state, world, 61)
    expect(now).toBeTruthy()
    if (!now) return
    console.log(now.says)
    expect(now.sides.length).toBeGreaterThan(0)
    for (const one of now.sides) expect(COURT_PROOF_DEFS[one.proof].label.length).toBeGreaterThan(3)
    expect(now.truth.length).toBeGreaterThan(0)
    // Правда одна и та же для одного дела: она не выдумывается заново.
    expect(caseNow(state, world, 61)?.truth).toBe(now.truth)
  })

  it('всякий приговор кого-то радует и кого-то обижает', () => {
    const state = judgeState()
    const now = caseNow(state, world, 61)
    if (!now) return
    // Ответы берутся у самого дела: у жалобы они одни, у спора о меже другие.
    for (const choice of now.source.choices.map((one) => one.id)) {
      const cost = verdictCost(now, choice)
      console.log(`${choice}: ${cost.says}`)
      expect(cost.pleased.length + cost.angered.length).toBeGreaterThan(0)
    }
    // И видно, угадал ли ты правду: один из ответов её угадывает.
    const right = now.source.choices.some((one) => verdictCost(now, one.id).right)
    expect(right).toBe(true)
  })
})

describe('Сд3 и Сд4: суд продаётся, и он не один', () => {
  it('серебро, родство и страх весят в суде', () => {
    const state = judgeState()
    const now = caseNow(state, world, 61)
    if (!now) return
    const rows = weighsToo(state, now)
    for (const one of rows) console.log(`${one.what} (${one.weight}): ${one.says}`)
    expect(rows.some((one) => one.what === 'серебро')).toBe(true)
    expect(ASSIZE.bribeWeight).toBeGreaterThan(0)
  })

  it('церковный, городской и вассальный суды забирают дела', () => {
    const state = judgeState()
    const place = Object.values(state.settlements).find((one) => one.owner === PLAYER) as Settlement
    console.log(otherCourts(state, world, place.locationId).says)
    const churchy: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [place.locationId]: { ...place, buildings: ['chapel'] },
      },
      charters: { [place.locationId]: { since: 1 } } as never,
    }
    const rival = otherCourts(churchy, world, place.locationId)
    console.log(rival.says)
    expect(rival.takes).toBeGreaterThan(0)
    expect(rival.whose.length).toBeGreaterThan(1)
  })
})

describe('Сд5 и Сд6: дела идут из земли, и суд считан', () => {
  it('поток дел зависит от разбоя, голода и вассалов', () => {
    const state = judgeState()
    const quiet = caseFlow(state, world, 61)
    console.log(`${quiet.waiting}: ${quiet.why}`)
    const mine = Object.values(state.settlements).filter((one) => one.owner === PLAYER)
    const uneasy: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        ...Object.fromEntries(mine.map((one) => [one.locationId, { ...one, banditry: 0.7 }])),
      },
    }
    const busy = caseFlow(uneasy, world, 61)
    console.log(`${busy.waiting}: ${busy.why}`)
    expect(busy.waiting).toBeGreaterThan(quiet.waiting)
  })

  it('двор считает дела, и о суде начинают говорить', () => {
    const state = judgeState()
    const now = caseNow(state, world, 61)
    if (!now) return
    const sold =
      now.source.choices.find((one) => one.id === 'ransom')?.id ?? now.source.choices[0]?.id
    const after = ok(
      applyCommand(state, { type: 'judge', caseId: now.source.id, choice: sold as never }),
    )
    console.log(
      after.log
        .map((one) => one.text)
        .slice(-2)
        .join(' | '),
    )
    expect(after.courtLog?.heard).toBe(1)
    const rolled = assizeRoll(after, world, 61)
    console.log(rolled.says)
    // Если дело решено за серебро — о суде говорят, что он продаётся; если нет
    // — что он прям. Оба ответа честные, и оба считаются.
    expect(rolled.says).toContain(after.courtLog?.sold === 1 ? 'продаётся' : 'прям')
  })
})
