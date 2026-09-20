import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { HALL, TIE_DEFS } from '../src/content/hall'
import { OFFICES } from '../src/content/offices'
import { courtiersOf } from '../src/courtier'
import { createSettlements } from '../src/economy'
import { hallNow, hallRoll, lossOf, offerOf, slipping, tiesOf } from '../src/hall'
import { PLAYER } from '../src/holding'
import { candidatesFor } from '../src/office'
import { createRng } from '../src/rng'
import { courtScreen } from '../src/screens'
import { SCHEMA_VERSION } from '../src/state'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 168: двор, который живёт.
 *
 * С этапа 104 у должности есть человек: нрав, годы, цель и голос. Двора как
 * целого не было — люди стояли в столбик и не знали друг о друге. Здесь двор
 * становится связями, и они выводятся из того, кто эти люди, а не хранятся.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function ok(result: ReturnType<typeof applyCommand>): GameState {
  if (!result.ok) throw new Error(result.message)
  return result.state
}

function ruler(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 60000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, 6)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    politics,
    settlements: map,
    time: WORLD_START,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

/** Двор, занятый целиком: иначе связей не из кого складывать. */
function withCourt(): GameState {
  let state = ruler()
  for (const office of OFFICES) {
    const who = candidatesFor(state, office)[0]
    if (!who) continue
    state = ok(applyCommand(state, { type: 'appoint', officeId: office, holderId: who.id }))
  }
  return state
}

describe('Дв1 и Дв2: двор — это люди, и они между собой', () => {
  it('связи выводятся из нравов и целей, а не хранятся', () => {
    const state = withCourt()
    const day = 1 + 365 * 5
    const people = courtiersOf(state, day)
    for (const one of people) console.log(one.says)
    expect(people.length).toBeGreaterThan(2)
    const ties = tiesOf(state, day)
    for (const tie of ties) console.log(tie.says)
    expect(ties.length).toBeGreaterThan(0)
    for (const tie of ties) expect(TIE_DEFS[tie.kind].label.length).toBeGreaterThan(3)
    // Из одного состояния — те же связи: они считаются.
    expect(tiesOf(state, day).map((one) => one.kind)).toEqual(ties.map((one) => one.kind))
    // И связи держатся людей, а не дня: назавтра двор тот же.
    expect(tiesOf(state, day + 1)).toHaveLength(ties.length)
  })
})

describe('Дв3 и Дв4: они просят, дают — и их можно потерять', () => {
  it('довольный предлагает сам, а недовольного видно заранее', () => {
    const state = withCourt()
    const day = 1 + 365 * 6
    const people = courtiersOf(state, day)
    const offers = people.map((one) => offerOf(one)).filter((one) => one !== null)
    for (const one of offers) console.log(one?.says)
    expect(offers.length).toBeGreaterThan(0)
    // Тот, у кого верность на дне, смотрит на сторону — и это названо.
    const sour: GameState = {
      ...state,
      favours: Object.fromEntries(people.map((one) => [one.id, -20])),
    }
    const risky = slipping(sour, day)
    for (const one of risky) console.log(`${one.who.name}: ${one.why} Порвёт: ${one.breaks}`)
    expect(risky.length).toBeGreaterThan(0)
    // Уход стоит державе названного, а не «минус к числу».
    const first = people[0]
    if (first) console.log(lossOf(state, first.office, day))
    if (first) expect(lossOf(state, first.office, day)).toContain(first.name)
  })
})

describe('Дв5 и Дв6: двор одним взглядом и в числах', () => {
  it('на экране двора видно, кто с кем, кто просит и кто уходит', () => {
    const state = withCourt()
    const screen = courtScreen(state, world)
    for (const line of screen.lines) console.log(`${line.label}: ${line.value} — ${line.hint}`)
    const labels = screen.lines.map((one) => one.label)
    expect(labels).toContain('Кто с кем')
    expect(labels).toContain('Просят и предлагают')
    expect(labels).toContain('Смотрят на сторону')
    for (const line of screen.lines) expect((line.hint ?? '').length).toBeGreaterThan(5)
  })

  it('двор считан: места, выслуга, вражда и потери', () => {
    const state = withCourt()
    const day = 1 + 365 * 9
    const rolled = hallRoll(state, world, day)
    console.log(rolled.says)
    console.log(hallNow(state, world, day).says)
    expect(rolled.seats).toBeGreaterThan(2)
    expect(rolled.risen).toBeGreaterThan(0)
    expect(HALL.risenYears).toBeLessThan(9)
    // Схема растёт с каждой версией: проверяется, что поле этого этапа
    // в ней уже есть, а не точное число — иначе следующий этап ломает
    // чужую проверку.
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(29)
  })
})
