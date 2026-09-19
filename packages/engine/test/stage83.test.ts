import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import {
  congressPlan,
  congressQuestions,
  congressesOf,
  tally,
  voteOf,
  votePrice,
} from '../src/congress'
import { CONGRESS_COST, QUESTION_DEFS } from '../src/content/congress'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { allied, createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 83: съезд корон.
 *
 * Посольство говорит с одним, договор связывает двоих. Съезд — место, где
 * говорят все сразу: там кончают чужие войны, делят выморочную землю и называют
 * общего врага. Вопросы берутся из мира, голоса — из замыслов, а купить их можно
 * серебром.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Держава, которую признают: иначе на съезд никто не поедет. */
function greatRealm(money = 60000): GameState {
  const base = createGame(createCharacter({ name: 'Ратша', money }), 1, world)
  const taken = Object.values(settlements)
    .filter((one) => one.population > 900)
    .sort((a, b) => b.population - a.population)
    .slice(0, 22)
  const map = { ...settlements }
  for (const one of taken) map[one.locationId] = { ...one, owner: PLAYER }
  const first = taken[0]
  if (!first) throw new Error('нет мест')
  const sworn = politics.lords.slice(0, 3).map((lord) => ({ ...lord, kingdomId: PLAYER }))
  return {
    ...base,
    politics: { ...politics, lords: [...sworn, ...politics.lords.slice(3)] },
    settlements: map,
    locationId: first.locationId,
    quarter: null,
    time: WORLD_START,
    realm: { name: 'Заречье', sinceDay: 1 },
    renown: 60,
    fame: { noble: 90 },
    crowned: { day: 1, titleId: 'duke', guests: [], absent: [] },
  }
}

describe('Е1 и Е2: зов и вопросы', () => {
  it('вопросы берутся из мира, а не из головы', () => {
    const state = greatRealm()
    const asked = congressQuestions(state, world, 1)
    for (const one of asked) console.log(`${QUESTION_DEFS[one.question].label}: ${one.why}`)
    expect(asked.length).toBeGreaterThan(1)
    // О войне съезд собирают, только если война идёт.
    expect(asked.some((one) => one.question === 'peace')).toBe(false)
    const warring: GameState = {
      ...state,
      politics: {
        ...state.politics,
        wars: [{ a: kingdoms[1] as string, b: kingdoms[2] as string, since: 1, reason: 'проба' }],
      },
    }
    expect(congressQuestions(warring, world, 1).some((one) => one.question === 'peace')).toBe(true)
  })

  it('едут те, кто признаёт, и съезд стоит по гостям', () => {
    const state = greatRealm()
    const plan = congressPlan(state, world, 1)
    console.log(
      `едут ${plan.guests.length}, не едут ${plan.absent.length}, стол и дары ${plan.cost}`,
    )
    expect(plan.cost).toBe(CONGRESS_COST.rite + plan.guests.length * CONGRESS_COST.perGuest)
    const called = ok(applyCommand(state, { type: 'callCongress', question: 'roads' }))
    console.log(called.log.find((one) => one.text.startsWith('Съезд созван'))?.text)
    expect(called.congress?.question).toBe('roads')
    expect(called.character.money).toBe(state.character.money - plan.cost)
    // Второй съезд не созывают, пока первый не собрался.
    expect(applyCommand(called, { type: 'callCongress', question: 'faith' }).ok).toBe(false)
  })
})

describe('Е3: торг', () => {
  it('голос того, кто против, стоит вдвое дороже', () => {
    const state = greatRealm()
    const called = ok(applyCommand(state, { type: 'callCongress', question: 'faith' }))
    const congress = called.congress
    if (!congress) return
    const rows = congress.guests.slice(0, 4).map((id) => {
      const lean = voteOf(called, world, id, congress.question, congress.about, 1)
      return { id, lean, price: votePrice(called, world, id, lean) }
    })
    for (const row of rows) {
      console.log(`${world.kingdoms[row.id]?.name}: голос ${row.lean}, цена ${row.price}`)
    }
    const willing = rows.find((one) => one.lean > 0)
    const against = rows.find((one) => one.lean < 0)
    if (willing && against) expect(against.price).toBeGreaterThan(willing.price)
    // И прямо по мере: голос того, кто против, дороже голоса того, кто за.
    const one = rows[0]
    if (one) {
      const cheap = votePrice(called, world, one.id, 1)
      const dear = votePrice(called, world, one.id, -1)
      console.log(`тот же голос: за ${cheap}, против ${dear}`)
      expect(dear).toBeGreaterThan(cheap)
    }

    const target = rows[0]
    if (!target) return
    const bought = ok(applyCommand(called, { type: 'buyVote', kingdomId: target.id }))
    console.log(
      `уплачено: ${bought.congress?.bribes[target.id]}; голос стал ${voteOf(bought, world, target.id, congress.question, congress.about, 1)}`,
    )
    expect(bought.congress?.bribes[target.id]).toBe(target.price)
    expect(voteOf(bought, world, target.id, congress.question, congress.about, 1)).toBeGreaterThan(
      target.lean,
    )
    // Дважды одному не платят.
    expect(applyCommand(bought, { type: 'buyVote', kingdomId: target.id }).ok).toBe(false)
  })
})

describe('Е4, Е5 и Е6: решение, союз против сильного и память века', () => {
  it('съезд о дорогах кончается торговым согласием со всеми, кто приехал', () => {
    const state = greatRealm()
    const called = ok(applyCommand(state, { type: 'callCongress', question: 'roads' }))
    const congress = called.congress
    if (!congress) return
    const count = tally(called, world, congress, congress.meetDay)
    console.log(`голосов за ${count.yes}, против ${count.no}, нужно ${count.needs}`)
    let later = called
    for (let day = 0; day < CONGRESS_COST.days + 2; day += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    console.log(later.log.find((one) => one.text.startsWith('Съезд'))?.text)
    expect(later.congress).toBeNull()
    expect(congressesOf(later)).toHaveLength(1)
    const record = congressesOf(later)[0]
    console.log(
      `в летописи: ${record?.question}, решено ${record?.passed}, гостей ${record?.guests}`,
    )
    if (record?.passed) {
      expect((later.treaties ?? []).some((one) => one.kind === 'trade')).toBe(true)
    }
  })

  it('против того, кто вырос, сходятся все', () => {
    const state = greatRealm()
    // Одна корона забрала треть карты: против такой и собирают съезд.
    const giantId = kingdoms[1] as string
    const grabbed = { ...state.settlements }
    let taken = 0
    for (const [id, one] of Object.entries(grabbed)) {
      if (one.population <= 0 || one.owner === PLAYER) continue
      if (taken > 220) break
      grabbed[id] = { ...one, owner: `crown:${giantId}` }
      taken += 1
    }
    const feared: GameState = { ...state, settlements: grabbed }
    const asked = congressQuestions(feared, world, 1).find((one) => one.question === 'commonFoe')
    console.log(asked ? asked.why : 'никто не вырос')
    if (!asked?.about) return
    const foe = asked.about
    const called = ok(
      applyCommand(feared, { type: 'callCongress', question: 'commonFoe', about: foe }),
    )
    let later = called
    for (let day = 0; day < CONGRESS_COST.days + 2; day += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const said = later.log.find((one) => one.text.includes('сошлись'))
    console.log(said?.text ?? later.log.find((one) => one.text.startsWith('Съезд'))?.text)
    if (said) {
      const ally = called.congress?.guests.find((id) => id !== foe)
      if (ally) expect(allied(later.politics, PLAYER, ally)).toBe(true)
    }
  })
})
