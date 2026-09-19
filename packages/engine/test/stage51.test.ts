import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import {
  EXCOMMUNICATED,
  FEAST_DOINGS,
  PILGRIM_DAYS,
  PILGRIM_PIETY,
  RITES,
  pietyWord,
} from '../src/content/faith'
import { FEASTS } from '../src/content/year'
import { createSettlements } from '../src/economy'
import { LIFE, rollHarvest, tickDays } from '../src/life'
import { createRng } from '../src/rng'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import {
  feastDoingsAt,
  graceFor,
  isHolySite,
  offeringFor,
  pietyMorale,
  pietyOf,
  priestAt,
  ritesAt,
  templeAccepts,
  titheFor,
} from '../src/temple'
import { MINUTES_PER_DAY, dayOf } from '../src/time'
import { generateWorld } from '../src/world/generate'
import { kingdomOf } from '../src/world/queries'

/**
 * Этап 51: храм и вера.
 *
 * Храм перестаёт быть видом места: в нём кто-то есть и есть что сделать.
 * Праздник перестаёт быть выходным. Обитель перестаёт вымирать. Вера
 * становится счётом с последствиями.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}
const capital = world.kingdoms.reEstiz?.capitalId ?? ''
const monastery =
  Object.values(world.locations).find((one) => one.archetype === 'monastery')?.id ?? ''

function at(locationId: string, money = 1500, day = 1): GameState {
  const base = createGame(createCharacter({ name: 'Т', money }), 1, world)
  return {
    ...base,
    locationId,
    quarter: 'temple',
    time: (day - 1) * MINUTES_PER_DAY + 9 * 60,
  }
}

describe('Х1: священник и обряд', () => {
  it('в храме есть кто-то: имя, сан и нрав — и служат они по-разному', () => {
    const state = at(capital)
    const bishop = priestAt(world, state.settlements, capital)
    const abbot = priestAt(world, state.settlements, monastery)
    expect(bishop?.cloth).toBe('bishop')
    expect(abbot?.cloth).toBe('abbot')
    console.log(
      `${bishop?.name} (${bishop?.cloth}, ${bishop?.temper}); ${abbot?.name} (${abbot?.cloth}, ${abbot?.temper})`,
    )
    // Владыка служит всё, приходской — не всё.
    expect(ritesAt(bishop)).toHaveLength(RITES.length)
    expect(ritesAt(abbot).length).toBeLessThan(RITES.length)
    // В деревне постоянного храма нет.
    const village = Object.values(world.locations).find(
      (one) => one.archetype === 'village' && one.population < 1200,
    )
    if (village) expect(priestAt(world, state.settlements, village.id)).toBeNull()
  })

  it('обряд стоит денег и времени и прибавляет благочестия', () => {
    const state = at(capital)
    const priest = priestAt(world, state.settlements, capital)
    if (!priest) return
    const rite = RITES[0] as (typeof RITES)[number]
    const offering = offeringFor(priest, rite)
    const prayed = ok(applyCommand(state, { type: 'rite', riteId: rite.id }))
    expect(prayed.character.money).toBe(state.character.money - offering)
    expect(prayed.time).toBe(state.time + rite.minutes)
    expect(pietyOf(prayed)).toBe(graceFor(priest, rite))
    // Отпевание поднимает дух отряда, благословение — славу.
    const grieving: GameState = { ...state, party: { ...state.party, morale: 50 } }
    const buried = ok(applyCommand(grieving, { type: 'rite', riteId: 'funeral' }))
    expect(buried.party.morale).toBeGreaterThan(50)
    const blessed = ok(applyCommand(state, { type: 'rite', riteId: 'blessing' }))
    expect(blessed.renown).toBe(state.renown + 1)
    // А у приходского священника благословения не получишь.
    const town = Object.values(world.locations).find(
      (one) => one.archetype === 'town' && one.population >= 1200,
    )
    if (town) {
      const there = applyCommand(at(town.id), { type: 'rite', riteId: 'blessing' })
      expect(there.ok).toBe(false)
    }
  })

  it('вклад покупает благочестие плохо, но покупает', () => {
    const state = at(monastery, 2000)
    const small = ok(applyCommand(state, { type: 'donate', amount: 25 }))
    const large = ok(applyCommand(state, { type: 'donate', amount: 400 }))
    console.log(`вклад 25 → ${pietyOf(small)}, вклад 400 → ${pietyOf(large)}`)
    expect(pietyOf(large)).toBeGreaterThan(pietyOf(small))
    // Вчетверо больше денег — не вчетверо больше благодати.
    expect(pietyOf(large)).toBeLessThan(pietyOf(small) * 4)
  })
})

describe('Х2: праздник как событие', () => {
  it('в праздник есть что делать, и каждое даёт своё', () => {
    const feast = FEASTS.find((one) => one.kingdomId === kingdomOf(world, capital)?.id)
    expect(feast).toBeDefined()
    if (!feast) return
    const state = at(capital, 500, feast.day)
    const doings = feastDoingsAt(world, capital, feast.day)
    expect(doings.length).toBeGreaterThan(0)
    expect(doings.length).toBeLessThan(FEAST_DOINGS.length + 1)
    const walked = applyCommand(state, { type: 'joinFeast', doingId: doings[0]?.id ?? '' })
    expect(walked.ok, walked.ok ? '' : walked.message).toBe(true)
    if (!walked.ok) return
    expect(walked.state.time).toBeGreaterThan(state.time)
    console.log(
      `${feast.name}: ${doings.map((one) => one.label.toLowerCase()).join(', ')} — «${walked.state.log[walked.state.log.length - 1]?.text}»`,
    )
    // Не в праздник ничего этого нет.
    const plain = at(capital, 500, feast.day + feast.days + 5)
    expect(feastDoingsAt(world, capital, feast.day + feast.days + 5)).toHaveLength(0)
    expect(applyCommand(plain, { type: 'joinFeast', doingId: 'procession' }).ok).toBe(false)
  })
})

describe('Х3: обитель живёт', () => {
  it('десятина с округи кормит обитель, и за сорок лет она не усыхает', () => {
    expect(titheFor(world, createSettlements(world), monastery)).toBeGreaterThan(0)
    // С чужого места десятины нет: платит своя провинция.
    expect(titheFor(world, createSettlements(world), capital)).toBe(0)

    let settlements = createSettlements(world)
    let rng = createRng(1)
    const sum = () =>
      Object.values(settlements)
        .filter((one) => world.locations[one.locationId]?.archetype === 'monastery')
        .reduce((acc, one) => acc + one.population, 0)
    const before = sum()
    for (let year = 1; year <= 40; year += 1) {
      settlements = tickDays(world, settlements, 365, LIFE, (year - 1) * 365 + 1).settlements
      const harvest = rollHarvest(world, settlements, rng)
      settlements = harvest.settlements
      rng = harvest.rng
    }
    const after = sum()
    console.log(`обители за 40 лет: ${Math.round(before)} → ${Math.round(after)}`)
    expect(after).toBeGreaterThan(before * 0.9)
  })
})

describe('Х4 и Х6: вера как счёт, церковь и корона', () => {
  it('грех отлучает, отлучённого не пускают и не венчают, покаяние возвращает', () => {
    const state = at(capital)
    expect(pietyWord(0)).not.toBe(pietyWord(EXCOMMUNICATED))
    expect(pietyMorale(EXCOMMUNICATED)).toBeLessThan(0)
    expect(pietyMorale(80)).toBeGreaterThan(0)

    const priest = priestAt(world, state.settlements, capital)
    if (!priest) return
    const rite = RITES[0] as (typeof RITES)[number]
    expect(templeAccepts(priest, -80, rite).accepts).toBe(false)
    // Кроме исповеди: к покаянию пускают всегда.
    const confession = RITES.find((one) => one.id === 'confession') as (typeof RITES)[number]
    expect(templeAccepts(priest, -80, confession).accepts).toBe(true)

    const sinner: GameState = { ...state, piety: -80 }
    expect(applyCommand(sinner, { type: 'rite', riteId: rite.id }).ok).toBe(false)
    const repented = ok(applyCommand(sinner, { type: 'rite', riteId: 'confession' }))
    expect(pietyOf(repented)).toBeGreaterThan(-80)
    // В церковный орден отлучённого не берут.
    const church = applyCommand(sinner, { type: 'joinOrder', orderId: 'lantern' })
    expect(church.ok).toBe(false)
  })
})

describe('Х5: паломничество', () => {
  it('к святому месту ходят за благодатью, но не каждую неделю', () => {
    const holy = Object.values(world.locations).find((one) => isHolySite(world, one.id))
    expect(holy).toBeDefined()
    if (!holy) return
    const state = { ...at(holy.id), quarter: null }
    const walked = ok(applyCommand(state, { type: 'pilgrimage' }))
    expect(pietyOf(walked)).toBe(PILGRIM_PIETY)
    expect(walked.pilgrimDay).toBe(dayOf(state.time))
    // Второй раз подряд — нет.
    const again = applyCommand(walked, { type: 'pilgrimage' })
    expect(again.ok).toBe(false)
    // А через положенный срок — снова.
    const later: GameState = {
      ...walked,
      time: walked.time + PILGRIM_DAYS * MINUTES_PER_DAY,
    }
    expect(applyCommand(later, { type: 'pilgrimage' }).ok).toBe(true)
    // И не всякое место свято.
    const road = Object.values(world.locations).find((one) => one.archetype === 'ford')
    if (road)
      expect(applyCommand({ ...at(road.id), quarter: null }, { type: 'pilgrimage' }).ok).toBe(false)
  })
})
