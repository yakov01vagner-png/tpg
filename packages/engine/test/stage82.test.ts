import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { RUMOUR, SPY_SEAT_DEFS } from '../src/content/spies'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import {
  bribeTargets,
  catchChance,
  depth,
  leakFactor,
  reportOf,
  spiesOf,
  spyIn,
  spyWages,
  watchers,
} from '../src/spy'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics, relationOf } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 82: соглядатаи.
 *
 * Открытая дипломатия — половина дела. Вторая половина — знать то, чего тебе не
 * скажут: пуста ли у соседа казна, кого он считает врагом, о чём договорился не
 * вслух. Свой человек это видит — и однажды попадается.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(money = 20000): GameState {
  const base = createGame(createCharacter({ name: 'Ратша', money }), 1, world)
  const taken = Object.values(settlements)
    .filter((one) => one.population > 900)
    .sort((a, b) => b.population - a.population)
    .slice(0, 10)
  const map = { ...settlements }
  for (const one of taken) map[one.locationId] = { ...one, owner: PLAYER }
  const first = taken[0]
  if (!first) throw new Error('нет мест')
  return {
    ...base,
    politics,
    settlements: map,
    locationId: first.locationId,
    quarter: null,
    time: WORLD_START,
    realm: { name: 'Заречье', sinceDay: 1 },
    renown: 40,
    fame: { noble: 60 },
  }
}

describe('С1 и С2: свой человек и то, что он видит', () => {
  it('человек при дворе дороже и видит больше, чем человек на торгу', () => {
    console.log(
      Object.entries(SPY_SEAT_DEFS)
        .map(
          ([id, def]) =>
            `${def.label}: ${def.cost} вперёд, ${def.wage} в сутки, риск ${(def.risk * 100).toFixed(2)}%, видит ${def.sees}`,
        )
        .join('; '),
    )
    expect(SPY_SEAT_DEFS.court.cost).toBeGreaterThan(SPY_SEAT_DEFS.city.cost)
    expect(SPY_SEAT_DEFS.court.sees).toBeGreaterThan(SPY_SEAT_DEFS.city.sees)
    expect(SPY_SEAT_DEFS.court.risk).toBeGreaterThan(SPY_SEAT_DEFS.city.risk)

    const state = ruler()
    const to = kingdoms[1] as string
    const planted = ok(applyCommand(state, { type: 'plantSpy', kingdomId: to, seat: 'court' }))
    const spy = spyIn(planted, to)
    console.log(
      `заведён: ${spy?.seat} в ${world.kingdoms[to]?.name}; казна ${state.character.money} → ${planted.character.money}`,
    )
    expect(spy).not.toBeNull()
    expect(planted.character.money).toBe(state.character.money - SPY_SEAT_DEFS.court.cost)
    expect(spyWages(planted)).toBe(SPY_SEAT_DEFS.court.wage)
    // Второго туда же не заводят.
    expect(applyCommand(planted, { type: 'plantSpy', kingdomId: to, seat: 'city' }).ok).toBe(false)
    // И его можно отозвать, пока он не попался.
    const back = ok(applyCommand(planted, { type: 'recallSpy', kingdomId: to }))
    expect(spiesOf(back)).toHaveLength(0)
  })

  it('чем дольше он сидит, тем больше видит — и тем вернее его возьмут', () => {
    const state = ruler()
    const to = kingdoms[1] as string
    const planted = ok(applyCommand(state, { type: 'plantSpy', kingdomId: to, seat: 'court' }))
    const spy = spyIn(planted, to)
    if (!spy) return
    const young = reportOf(planted, world, spy, spy.sinceDay + 1)
    const old = reportOf(planted, world, spy, spy.sinceDay + 800)
    console.log(
      `в первый день видит ${young.length} пунктов: ${young.map((one) => one.find).join(', ')}`,
    )
    console.log(`через два года — ${old.length}: ${old.map((one) => one.find).join(', ')}`)
    for (const line of old) console.log(`  ${line.find}: ${line.says}`)
    expect(depth(spy, spy.sinceDay + 800)).toBeGreaterThan(depth(spy, spy.sinceDay + 1))
    expect(old.length).toBeGreaterThanOrEqual(young.length)
    expect(catchChance(spy, spy.sinceDay + 800)).toBeGreaterThan(catchChance(spy, spy.sinceDay + 1))
    // Донесение — это числа, а не «у них всё плохо».
    expect(old.some((one) => /\d/.test(one.says))).toBe(true)
  })
})

describe('С3: подкуп', () => {
  it('ропщущий продаётся вдвое дешевле верного', () => {
    const state = ruler()
    const to = kingdoms[1] as string
    const targets = bribeTargets(state, world, to, 1)
    for (const one of targets) console.log(`${one.name}: ${one.price} — ${one.says}`)
    expect(targets.length).toBeGreaterThan(0)
    const cheapest = targets[0]
    if (!cheapest) return
    const bought = ok(
      applyCommand(state, { type: 'bribeAdvisor', kingdomId: to, lordId: cheapest.id }),
    )
    const before = state.politics.lords.find((one) => one.id === cheapest.id)?.loyalty ?? 0
    const after = bought.politics.lords.find((one) => one.id === cheapest.id)?.loyalty ?? 0
    console.log(
      `верность ${before} → ${after}; глаза при дворе: ${spyIn(bought, to) ? 'есть' : 'нет'}`,
    )
    expect(after).toBeLessThan(before)
    expect(spyIn(bought, to)).not.toBeNull()
    expect(bought.character.money).toBe(state.character.money - cheapest.price)
  })
})

describe('С4: раскрытие', () => {
  it('взятого не спасают: за него отвечает тот, кто послал', () => {
    const state = ruler()
    const to = kingdoms[1] as string
    // Человек, который сидит там пятый год: такого берут вернее всего.
    const old: GameState = {
      ...state,
      spies: [{ id: 'spy:старый', kingdomId: to, seat: 'court', sinceDay: 1 }],
      time: WORLD_START + 1800 * MINUTES_PER_DAY,
    }
    let later = old
    let caught = false
    for (let day = 0; day < 400 && !caught; day += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
      caught = later.log.some((one) => one.text.includes('Твоего человека взяли'))
    }
    console.log(caught ? 'взяли' : 'за четыреста суток так и не взяли')
    if (caught) {
      expect(spiesOf(later)).toHaveLength(0)
      expect(relationOf(later.politics, PLAYER, to)).toBeLessThan(
        relationOf(old.politics, PLAYER, to),
      )
      expect((later.shames ?? []).some((one) => one.id === 'broke')).toBe(true)
    }
  })
})

describe('С5 и С6: свои тайны и молва', () => {
  it('чужие глаза ускоряют утечку твоих тайн', () => {
    const state = ruler()
    const cold: GameState = {
      ...state,
      politics: {
        ...state.politics,
        relations: Object.fromEntries(kingdoms.map((id) => [[PLAYER, id].sort().join('|'), -60])),
      },
    }
    const quiet = watchers(state, world, 1)
    const many = watchers(cold, world, 1)
    console.log(`следят: в мире ${quiet.length}, когда всех обидел — ${many.length}`)
    expect(many.length).toBeGreaterThan(quiet.length)
    expect(leakFactor(many.length)).toBeGreaterThan(leakFactor(quiet.length))
  })

  it('слух портит чужое имя у всех прочих корон', () => {
    const state = ruler()
    const to = kingdoms[1] as string
    const third = kingdoms[3] as string
    const before = relationOf(state.politics, third, to)
    const said = ok(applyCommand(state, { type: 'spreadRumour', kingdomId: to }))
    console.log(
      `слух о ${world.kingdoms[to]?.name}: ${world.kingdoms[third]?.name} ${before} → ${relationOf(said.politics, third, to)}, стоил ${RUMOUR.cost}`,
    )
    expect(relationOf(said.politics, third, to)).toBeLessThan(before)
    expect(said.character.money).toBe(state.character.money - RUMOUR.cost)
    // Дважды один слух не пускают.
    expect(applyCommand(said, { type: 'spreadRumour', kingdomId: to }).ok).toBe(false)
    // И он стихает сам.
    let later = said
    for (let day = 0; day < RUMOUR.days + 2; day += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    expect((later.rumours ?? []).length).toBe(0)
  })
})
