import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { hireCompanion } from '../src/companion'
import { COMPANIONS } from '../src/content/companions'
import { OFFICES, OFFICE_DEFS } from '../src/content/offices'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import {
  candidatesFor,
  councilAdvice,
  courtParties,
  courtWages,
  errandsFor,
  fitness,
  musterBonus,
  officerAt,
  skimGuard,
  treasuryBonus,
} from '../src/office'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 75: двор и совет.
 *
 * Вассалы держат землю, двор держит дела. Должность — работа: у неё есть
 * умение, жалованье и то, что она и правда меняет в числах державы. Проверяется
 * это: годность считается по умению, пустая должность молчит, уехавший ничего не
 * держит, а поручение возвращается с тем, ради чего посылали.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(): GameState {
  const base = createGame(createCharacter({ name: 'Ратша', money: 4000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 1500 && one.population < 9000)
    .sort((a, b) => b.population - a.population)
    .slice(0, 2)
  const places = { ...settlements }
  for (const one of mine) places[one.locationId] = { ...one, owner: PLAYER }
  const first = mine[0]
  if (!first) throw new Error('нет своих мест')
  return {
    ...base,
    politics,
    settlements: places,
    locationId: first.locationId,
    quarter: null,
    time: WORLD_START,
    realm: { name: 'Вольное владение', sinceDay: 1 },
    renown: 20,
    companions: Object.values(COMPANIONS)
      .slice(0, 4)
      .map((def) => ({ ...hireCompanion(def), mood: 70 })),
  }
}

describe('Д1 и Д2: должности и назначения', () => {
  it('на должность идут по умению, и годность считается по нему же', () => {
    const state = ruler()
    for (const id of OFFICES) {
      const best = candidatesFor(state, id)[0]
      console.log(
        `${OFFICE_DEFS[id].label}: лучший — ${best?.name} (${best?.kind}, умение ${best?.skill}), жалованье ${OFFICE_DEFS[id].wage}`,
      )
      expect(best).toBeDefined()
    }
    const best = candidatesFor(state, 'marshal')[0]
    if (!best) return
    const after = ok(
      applyCommand(state, { type: 'appoint', officeId: 'marshal', holderId: best.id }),
    )
    const officer = officerAt(after, 'marshal')
    console.log(
      `маршал ${officer?.name}: годность ${fitness(after, 'marshal', 1).toFixed(2)}, сбор ×${musterBonus(after, 1).toFixed(2)}`,
    )
    expect(officer?.id).toBe(best.id)
    expect(courtWages(after)).toBe(OFFICE_DEFS.marshal.wage)
    // Годный маршал собирает людей лучше; пустая должность ничего не даёт.
    expect(musterBonus(after, 1)).toBeGreaterThanOrEqual(musterBonus(state, 1))
    expect(musterBonus(state, 1)).toBe(1)
  })

  it('негодный ест жалованье и ничего не делает', () => {
    const state = ruler()
    const weak = candidatesFor(state, 'treasurer')
      .filter((one) => one.skill < 2)
      .slice(-1)[0]
    if (!weak) return
    const after = ok(
      applyCommand(state, { type: 'appoint', officeId: 'treasurer', holderId: weak.id }),
    )
    console.log(`казначей ${weak.name} (умение ${weak.skill}): казна ×${treasuryBonus(after, 1)}`)
    expect(fitness(after, 'treasurer', 1)).toBe(0)
    expect(treasuryBonus(after, 1)).toBe(1)
    expect(courtWages(after)).toBeGreaterThan(0)
  })
})

describe('Д3 и Д4: совет и партии', () => {
  it('совет говорит числами, а пустая должность молчит', () => {
    const state = ruler()
    expect(councilAdvice(state, 1)).toHaveLength(0)
    let court = state
    for (const id of OFFICES) {
      const best = candidatesFor(court, id)[0]
      if (!best) continue
      court = ok(applyCommand(court, { type: 'appoint', officeId: id, holderId: best.id }))
    }
    const council = councilAdvice(court, 1)
    for (const advice of council) console.log(`${advice.who}: ${advice.says} — ${advice.wants}`)
    expect(council.length).toBeGreaterThan(2)
    // Числа, а не «всё плохо»: в каждом слове есть цифра.
    expect(council.every((one) => /\d/.test(one.says))).toBe(true)
  })

  it('партии при дворе смотрят на то, что ты делаешь', () => {
    const state = ruler()
    let court = state
    for (const id of OFFICES) {
      const own = candidatesFor(court, id).find((one) => one.kind === 'companion')
      if (!own) continue
      court = ok(applyCommand(court, { type: 'appoint', officeId: id, holderId: own.id }))
    }
    const parties = courtParties(court, 1)
    for (const party of parties) console.log(`${party.label}: ${party.mood} — ${party.says}`)
    const oldBlood = parties.find((one) => one.id === 'oldBlood')
    const newMen = parties.find((one) => one.id === 'newMen')
    expect(oldBlood?.mood).toBeGreaterThan(0)
    expect(newMen?.mood).toBeLessThan(0)
    expect(parties).toHaveLength(4)
  })
})

describe('Д5: поручения своим', () => {
  it('уехавший ничего не держит, а возвращается с делом', () => {
    const state = ruler()
    const best = candidatesFor(state, 'seneschal')[0]
    if (!best) return
    const court = ok(
      applyCommand(state, { type: 'appoint', officeId: 'seneschal', holderId: best.id }),
    )
    const guard = skimGuard(court, 1)
    const errand = errandsFor('seneschal')[0]
    if (!errand) return
    const sent = ok(
      applyCommand(court, { type: 'sendOfficer', officeId: 'seneschal', errandId: errand.id }),
    )
    console.log(
      `${best.name} уехал на ${errand.days} суток: при нём воровство ×${guard.toFixed(2)}, без него ×${skimGuard(sent, 1).toFixed(2)}`,
    )
    // Пока он в дороге, его дело не делается.
    expect(skimGuard(sent, 1)).toBe(1)
    expect(councilAdvice(sent, 1)[0]?.says).toContain('отъезде')

    const before = sent.character.money
    let later = sent
    for (let day = 0; day < errand.days + 1; day += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    console.log(`через ${errand.days} суток: казна ${before} → ${later.character.money}`)
    expect(officerAt(later, 'seneschal')?.awayUntil).toBeUndefined()
    // Недоимки собраны: казна выросла сверх того, что берёт двор.
    expect(later.character.money).toBeGreaterThan(before)
    expect(skimGuard(later, 1)).toBeLessThan(1)
  })
})
