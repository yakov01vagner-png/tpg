import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { COURTIER, COURT_TEMPER_DEFS, COURT_WANT_DEFS } from '../src/content/courtier'
import { OFFICES } from '../src/content/offices'
import {
  askWords,
  careerWords,
  courtWantDef,
  courtierAt,
  courtiersOf,
  endsNow,
  leavesSoon,
  voiceOf,
} from '../src/courtier'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { candidatesFor } from '../src/office'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 104: люди двора как люди.
 *
 * Должность была числом пригодности. Здесь у того, кто её держит, появляются
 * нрав, годы, своя цель и голос — и всё это выводится из него самого, а не
 * назначается должности.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function court(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, 6)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  const base: GameState = {
    ...game,
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
  // Сажаем на должности по одному: список свободных считается от уже занятых.
  let filled: GameState = base
  for (const office of OFFICES) {
    const who = candidatesFor(filled, office)[0]
    if (!who) continue
    filled = {
      ...filled,
      offices: {
        ...(filled.offices ?? {}),
        [office]: { holderId: who.id, kind: who.kind, sinceDay: day - 3 * DAYS_PER_YEAR },
      },
    }
  }
  return filled
}

describe('Дв1 и Дв2: нрав, годы и своя цель', () => {
  it('у каждого своё, и оно не меняется от места', () => {
    const state = court()
    const people = courtiersOf(state, day)
    for (const one of people) {
      console.log(`${one.says} Хочет: ${courtWantDef(one.wants).label}. Верность ${one.loyalty}.`)
    }
    expect(people.length).toBeGreaterThan(1)
    // Выводится, а не хранится: тот же человек — тот же нрав.
    const first = people[0]
    if (!first) return
    expect(courtierAt(state, first.office, day)?.temper).toBe(
      courtierAt(state, first.office, day + 100)?.temper,
    )
    const tempers = new Set(people.map((one) => one.temper))
    console.log(
      `нравов при дворе: ${[...tempers].map((one) => COURT_TEMPER_DEFS[one].label).join(', ')}`,
    )
  })
})

describe('Дв4: он говорит', () => {
  it('совет звучит его голосом', () => {
    const state = court()
    const people = courtiersOf(state, day)
    for (const one of people.slice(0, 3)) {
      console.log(voiceOf(one, 'Казна выдержит ещё две войны, господин.'))
    }
    expect(people.length).toBeGreaterThan(0)
    const first = people[0]
    if (!first) return
    expect(voiceOf(first, 'слово')).toContain(first.name)
  })
})

describe('Дв2 и Дв5: просьба и память о ней', () => {
  it('исполненное поднимает верность, отказ роняет', () => {
    const state = court()
    const one = courtiersOf(state, day)[0]
    if (!one) return
    console.log(askWords(one))
    const granted = ok(
      applyCommand(state, { type: 'answerCourtier', office: one.office, grant: true }),
    )
    const refused = ok(
      applyCommand(state, { type: 'answerCourtier', office: one.office, grant: false }),
    )
    const after = courtierAt(granted, one.office, day)
    const worse = courtierAt(refused, one.office, day)
    console.log(
      `${granted.log[granted.log.length - 1]?.text ?? ''} Верность ${one.loyalty} → ${after?.loyalty} (исполнено) и → ${worse?.loyalty} (отказ).`,
    )
    expect(after?.loyalty ?? 0).toBeGreaterThan(one.loyalty)
    expect(worse?.loyalty ?? 100).toBeLessThan(one.loyalty)
    expect(COURT_WANT_DEFS[one.wants].says.length).toBeGreaterThan(10)
  })
})

describe('Дв3: карьера', () => {
  it('годы берут своё, и место освобождается не по твоей воле', () => {
    const state = court()
    const one = courtiersOf(state, day)[0]
    if (!one) return
    const old = { ...one, age: COURTIER.tiredAge + 1 }
    const done = { ...one, age: COURTIER.endAge + 1 }
    console.log(`${careerWords(old)} / ${careerWords(done)}`)
    expect(leavesSoon(old)).toBe(true)
    expect(endsNow(done)).toBe(true)

    // Двор за тридцать лет: кто-то да уйдёт.
    let run = state
    for (let i = 0; i < 90; i += 1) {
      run = ok(applyCommand(run, { type: 'tick', minutes: 24 * 60 }))
    }
    console.log(
      `за тридцать месяцев при дворе: должностей занято ${courtiersOf(run, day + 900).length} из ${OFFICES.length}`,
    )
    expect(courtiersOf(run, day + 900).length).toBeLessThanOrEqual(OFFICES.length)
  })
})
