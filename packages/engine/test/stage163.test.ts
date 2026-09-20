import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { TALLY } from '../src/content/tally'
import { createSettlements } from '../src/economy'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { warReckon, warRoll, warTally } from '../src/tally'
import { WORLD_START } from '../src/time'
import type { War } from '../src/war'
import { createPolitics, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 163: война, которая кончается по счёту.
 *
 * Война начиналась расчётом (этап 143) и обрывалась броском в 0.006: сто войн за
 * век были одной и той же войной — объявили, помирились, всё как было. Счёт
 * ставит на место броска четыре вещи, которые в мире уже есть: сколько зим война
 * идёт, взята ли цель, можно ли её ещё взять и давят ли со стороны.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const [first, second, third] = kingdoms as [string, string, string]

function base(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 100 }), 1, world)
  return { ...game, politics, settlements, time: WORLD_START, quarter: null }
}

/** Провинция, которую держит `side`, — за неё и пойдёт спор. */
function provinceOf(side: string): string {
  for (const [id, province] of Object.entries(world.provinces)) {
    const mine = province.locationIds.filter(
      (one) => settlements[one]?.owner === `crown:${side}`,
    ).length
    if (mine > 0 && mine / Math.max(1, province.locationIds.length) > 0.8) return id
  }
  return Object.keys(world.provinces)[0] as string
}

function warFor(a: string, b: string, since: number, provinceId?: string): War {
  return {
    a,
    b,
    since,
    reason: 'спор о марке',
    casus: provinceId ? { kind: 'march', provinceId } : { kind: 'ambition' },
  }
}

describe('Вс1 и Вс4: мир заключают расчётом, и зимы стоят разного', () => {
  it('чем дольше война, тем охотнее мирятся — и тем дороже зима', () => {
    const state = base()
    const day = 2000
    const rows = [0.2, 2, 5].map((years) =>
      warTally(state, world, warFor(first, second, day - Math.round(years * 365)), day),
    )
    for (const row of rows) console.log(row.says)
    const [fresh, middling, spent] = rows as [
      (typeof rows)[0],
      (typeof rows)[0],
      (typeof rows)[0],
    ]
    expect(fresh.haste).toBeLessThan(middling.haste)
    expect(middling.haste).toBeLessThan(spent.haste)
    expect(spent.weariness).toBe(1)
    // Вторая, третья и пятая зима стоят разного, и это число видно обеим сторонам.
    expect(middling.cost).toBeGreaterThan(fresh.cost)
    expect(spent.cost).toBeGreaterThan(middling.cost)
    expect(fresh.cost).toBe(TALLY.winterCost)
    console.log(
      `зимы: ${rows.map((one) => `${one.winters}-я ${one.cost}`).join(', ')} серебра в сутки`,
    )
  })
})

describe('Вс2 и Вс3: у войны есть цель, и условия идут из её хода', () => {
  it('взявший спорную землю победил — даже если он меньше', () => {
    const state = base()
    const day = 2000
    const theirs = provinceOf(second)
    // Зачинщик взял спорную марку: цель достигнута, и условия — та самая земля.
    const taken = { ...state.settlements }
    for (const id of world.provinces[theirs]?.locationIds ?? []) {
      const place = taken[id]
      if (!place || place.population <= 0) continue
      taken[id] = { ...place, owner: `crown:${first}` }
    }
    const won = warTally({ ...state, settlements: taken }, world, warFor(first, second, day - 800, theirs), day)
    console.log(won.says)
    expect(won.reached).toBe(true)
    expect(won.winner).toBe(first)
    expect(won.term).toBe(won.aim)
    expect(won.haste).toBeGreaterThan(TALLY.reachedHaste)

    // Та же война, но марка осталась за хозяином и четвёртый год: безнадёжна.
    const lost = warTally(state, world, warFor(first, second, day - 1500, theirs), day)
    console.log(lost.says)
    expect(lost.reached).toBe(false)
    expect(lost.hopeless || lost.winner === null).toBe(true)
    // Свежая война с той же целью не кончается ничем: мириться рано.
    const early = warTally(state, world, warFor(first, second, day - 100, theirs), day)
    expect(early.hopeless).toBe(false)
    expect(early.winner).toBe(null)
    expect(early.term).toBe('nothing')
  })
})

describe('Вс5: войну кончают и со стороны', () => {
  it('поручитель и коалиция торопят мир, и счёт это называет', () => {
    const state = base()
    const day = 2000
    const war = warFor(first, second, day - 400)
    const alone = warTally(state, world, war, day)
    const watched = warTally(
      { ...state, guarantees: [{ by: third, of: second, sinceDay: day - 500 }] },
      world,
      war,
      day,
    )
    console.log(`${alone.says}\n${watched.says}`)
    expect(watched.outside).toBeGreaterThan(alone.outside)
    expect(watched.haste).toBeGreaterThan(alone.haste)
    expect(warReckon(state, world, war, day).haste).toBe(alone.haste)
  })
})

describe('Вс6: войны в числах', () => {
  it('за два года войны кончаются по-разному, и долгие — первыми', () => {
    const state = base()
    const start = 3000
    const wars: readonly War[] = [
      warFor(first, second, start - 365 * 6, provinceOf(second)),
      warFor(third, kingdoms[3] as string, start - 365 * 5),
      warFor(kingdoms[4] as string, kingdoms[5] as string, start - 30),
    ]
    const roll = warRoll({ ...state, politics: { ...state.politics, wars } }, world, start)
    console.log(roll.says)
    for (const row of roll.rows) console.log(`  ${row.says}`)
    expect(roll.count).toBe(3)
    expect(roll.years).toBeGreaterThan(10)

    let live = { ...state.politics, wars, lastDay: start }
    let places = state.settlements
    let rng = createRng(7)
    const ended: Record<string, number> = {}
    const ages: number[] = []
    for (let step = 0; step < 24; step += 1) {
      const day = start + (step + 1) * 30
      const tick = tickPolitics(
        world,
        { ...live, lastDay: day - 30 },
        places,
        day,
        rng,
        'busy',
        () => 1,
        (war, when) =>
          warReckon({ ...state, politics: live, settlements: places }, world, war, when),
      )
      live = tick.politics
      places = tick.settlements
      rng = tick.rng
      for (const event of tick.events) {
        if (event.type === 'peaceTerms') ended[event.term] = (ended[event.term] ?? 0) + 1
        if (event.type === 'peace' && wars.includes(event.war)) {
          ages.push(Math.round(((day - event.war.since) / 365) * 10) / 10)
        }
      }
    }
    console.log(
      `за два года кончилось войн: ${Object.entries(ended)
        .map(([term, count]) => `${term} ${count}`)
        .join(', ')}; из трёх заданных кончились в ${ages.join(', ')} лет`,
    )
    // Долгие войны кончились: до счёта они тянулись броском по десять лет.
    expect(ages.length).toBeGreaterThanOrEqual(2)
    // И кончились не все одинаково: исход берётся из хода войны.
    expect(Object.keys(ended).length).toBeGreaterThan(1)
  })
})
