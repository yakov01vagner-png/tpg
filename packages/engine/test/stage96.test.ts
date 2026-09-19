import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import {
  CENSURE_DEFS,
  CHURCH,
  CHURCH_WANT_DEFS,
  censureDue,
  churchAsk,
  churchLedger,
  churchOf,
  crusadersAgainst,
  defianceCost,
  interdictBite,
} from '../src/church'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { PLAYER, holdingsOf } from '../src/holding'
import { placeRep } from '../src/reputation'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { pietyOf } from '../src/temple'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 96: церковь и ордена как сила.
 *
 * Церковь была местом, где служат обряды. Здесь она — держава без короны: своя
 * земля, десятина, свои просьбы и счёт, который она ведёт. На счёт она отвечает
 * словом, интердиктом на всю державу и походом, в который зовёт других.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(places = 9): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 60000 }), 1, world)
  const taken = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, places)
  const map = { ...settlements }
  for (const one of taken) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    politics,
    settlements: map,
    time: WORLD_START + 8 * 24 * 60,
    locationId: taken[0]?.locationId ?? game.locationId,
    quarter: null,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

describe('Ц1: церковь как держава', () => {
  it('у церкви своя земля, свои деньги и свой счёт к тебе', () => {
    const state = ruler()
    const church = churchOf(state, world, 10)
    console.log(
      `обителей на карте ${church.places}, десятина с твоей земли ${church.tithe} в год, счёт к тебе ${church.anger}, благочестие ${church.piety} — ${church.says}`,
    )
    expect(church.places).toBeGreaterThan(0)
    expect(church.tithe).toBeGreaterThan(0)
    const want = churchAsk(state, world, 10)
    console.log(
      `просит: ${CHURCH_WANT_DEFS[want].label} — «${CHURCH_WANT_DEFS[want].says}» (платишь ${CHURCH_WANT_DEFS[want].costs})`,
    )
    // Воюющего просят кончить войну, а не десятины.
    const warring: GameState = {
      ...state,
      politics: {
        ...state.politics,
        wars: [{ a: PLAYER, b: 'robl', since: 1, reason: 'война' }],
      },
    }
    console.log(`у воюющего просят: ${CHURCH_WANT_DEFS[churchAsk(warring, world, 10)].label}`)
    expect(churchAsk(warring, world, 10)).toBe('peace')
  })
})

describe('Ц5: своя вера', () => {
  it('спорить можно, бесплатно — нет', () => {
    const state = ruler()
    const want = churchAsk(state, world, 10)
    const cost = defianceCost(want)
    console.log(cost.says)
    const refused = ok(applyCommand(state, { type: 'answerChurch', yield: false }))
    console.log(
      `после отказа: счёт ${refused.churchAnger}, благочестие ${pietyOf(state)} → ${pietyOf(refused)}`,
    )
    expect(refused.churchAnger ?? 0).toBe(CHURCH.refusal)
    expect(pietyOf(refused)).toBeLessThan(pietyOf(state))

    const obeyed = ok(applyCommand(refused, { type: 'answerChurch', yield: true }))
    console.log(
      `${obeyed.log[obeyed.log.length - 1]?.text ?? ''} Счёт ${refused.churchAnger} → ${obeyed.churchAnger}.`,
    )
    expect(obeyed.churchAnger ?? 0).toBeLessThan(refused.churchAnger ?? 0)
    expect(pietyOf(obeyed)).toBeGreaterThan(pietyOf(refused))
  })
})

describe('Ц2: интердикт на державу', () => {
  it('запрет ложится на всю землю и стоит памяти', () => {
    const state: GameState = { ...ruler(), churchAnger: CENSURE_DEFS.interdict.from }
    console.log(`счёт ${state.churchAnger} → кара ${censureDue(state.churchAnger ?? 0)}`)
    console.log(interdictBite(state).says)
    expect(censureDue(state.churchAnger ?? 0)).toBe('interdict')

    const before = holdingsOf(state.settlements, PLAYER).map((one) =>
      placeRep(state.reputation, one.locationId),
    )
    let run = state
    for (let i = 0; i < 4; i += 1) {
      run = ok(applyCommand(run, { type: 'rest', hours: 12 }))
      run = ok(applyCommand(run, { type: 'rest', hours: 12 }))
      if (run.censure) break
    }
    // И ещё декада под запретом: он кусает не в день объявления, а каждый срок.
    for (let i = 0; i < 12; i += 1) {
      run = ok(applyCommand(run, { type: 'rest', hours: 12 }))
      run = ok(applyCommand(run, { type: 'rest', hours: 12 }))
    }
    const after = holdingsOf(run.settlements, PLAYER).map((one) =>
      placeRep(run.reputation, one.locationId),
    )
    console.log(
      `${run.log.find((one) => one.text.includes('интердикт'))?.text ?? 'интердикта нет'} Память мест: ${before.reduce((a, b) => a + b, 0)} → ${after.reduce((a, b) => a + b, 0)}.`,
    )
    expect(run.censure?.kind).toBe('interdict')
    expect(run.censure?.untilDay ?? 0).toBeGreaterThan(run.censure?.sinceDay ?? 0)
    expect(after.reduce((a, b) => a + b, 0)).toBeLessThan(before.reduce((a, b) => a + b, 0))
  })
})

describe('Ц3: поход по призыву', () => {
  it('церковь не воюет сама — она называет имя', () => {
    const state: GameState = { ...ruler(), churchAnger: CENSURE_DEFS.crusade.from }
    const called = crusadersAgainst(state, world, PLAYER, 10)
    console.log(`по призыву пойдут: ${called.join(', ')} (не больше ${CHURCH.crusaders})`)
    expect(called.length).toBeGreaterThan(0)
    expect(called.length).toBeLessThanOrEqual(CHURCH.crusaders)

    let run = state
    for (let i = 0; i < 4; i += 1) {
      run = ok(applyCommand(run, { type: 'rest', hours: 12 }))
      run = ok(applyCommand(run, { type: 'rest', hours: 12 }))
      if (run.censure) break
    }
    const wars = run.politics.wars.filter((war) => war.a === PLAYER || war.b === PLAYER)
    console.log(
      `${run.log.find((one) => one.text.includes('поход'))?.text ?? 'похода нет'} Войн против тебя: ${wars.length}.`,
    )
    expect(run.censure?.kind).toBe('crusade')
    expect(wars.length).toBeGreaterThan(0)
  })
})

describe('Ц6: вера в отчёте', () => {
  it('счёт по вере виден числом', () => {
    const calm = churchLedger(ruler(), world, 10)
    console.log(calm.says)
    const angry = churchLedger({ ...ruler(), churchAnger: 60 }, world, 10)
    console.log(angry.says)
    expect(calm.anger).toBe(0)
    expect(angry.anger).toBe(60)
    for (const id of ['warning', 'interdict', 'crusade'] as const) {
      expect(CENSURE_DEFS[id].from).toBeGreaterThan(0)
    }
  })
})
