import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { BUILDINGS } from '../src/content/buildings'
import {
  ARREARS_MAX,
  JUSTICE_DEFS,
  LEVY_DEFS,
  PLEAS,
  SENESCHAL_TEMPER_DEFS,
  TAX_DEFS,
  VISIT_STALE,
} from '../src/content/estate'
import { createSettlements } from '../src/economy'
import {
  arrearsFactor,
  daysAway,
  isBroken,
  lawMood,
  lawOf,
  pleaOf,
  seneschalDef,
  seneschalOf,
  skimOf,
  taxTake,
  worksRepairCost,
  worksWages,
} from '../src/estate'
import { PLAYER, dailyTax } from '../src/holding'
import { carryingCapacity, foodSecurity } from '../src/life'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START, dayOf } from '../src/time'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 61: своя земля изнутри.
 *
 * Владение было счётом: подать минус жалованье. Теперь в нём живут люди — у
 * земли есть управляющий, просьбы, закон и хозяйство, которое ломается.
 */

const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Герой, которому это место принадлежит. */
function holder(locationId: string, money = 4000): GameState {
  const base = createGame(createCharacter({ name: 'Т', money }), 1, world)
  const settlement = base.settlements[locationId]
  if (!settlement) throw new Error('нет такого места')
  return {
    ...base,
    locationId,
    quarter: null,
    time: WORLD_START,
    settlements: { ...base.settlements, [locationId]: { ...settlement, owner: PLAYER } },
  }
}

const village = Object.values(world.locations).find((one) => one.archetype === 'village')

describe('В1: управляющий с лицом', () => {
  it('у каждого владения свой человек, и вор виден по казне', () => {
    expect(village).toBeDefined()
    if (!village) return
    const seneschal = seneschalOf(village.id)
    expect(seneschal.name.length).toBeGreaterThan(2)
    // Он один на всю жизнь владения: второй раз спросишь — тот же человек.
    expect(seneschalOf(village.id).temper).toBe(seneschal.temper)
    console.log(
      `${village.name}: ${seneschal.name}, ${seneschalDef(seneschal.temper).label} (берёт ${Math.round(SENESCHAL_TEMPER_DEFS[seneschal.temper].skim * 100)}%)`,
    )
    // При хозяине не крадёт никто: считать при живом счёте неудобно.
    const state = holder(village.id)
    expect(skimOf(state, village.id, 1)).toBe(0)
    // Найдём вора среди своих мест и посмотрим, как он смелеет без хозяина.
    const thiefAt = Object.values(world.locations).find(
      (one) => seneschalOf(one.id).temper === 'thief',
    )
    expect(thiefAt).toBeDefined()
    if (!thiefAt) return
    const far = { ...holder(thiefAt.id), locationId: village.id, visits: { [thiefAt.id]: 0 } }
    const early = skimOf(far, thiefAt.id, 30)
    const late = skimOf(far, thiefAt.id, VISIT_STALE * 2)
    console.log(
      `вор в ${thiefAt.name}: через 30 сут. ${Math.round(early * 100)}%, через два срока ${Math.round(late * 100)}%`,
    )
    expect(late).toBeGreaterThan(early)
    expect(late).toBeCloseTo(SENESCHAL_TEMPER_DEFS.thief.skim, 5)
  })
})

describe('В5: несколько владений', () => {
  it('там, где хозяина давно не было, платят хуже', () => {
    if (!village) return
    const state = holder(village.id)
    expect(daysAway(state, village.id, 100)).toBe(0)
    const away: GameState = { ...state, locationId: 'elsewhere', visits: { [village.id]: 0 } }
    expect(arrearsFactor(away, village.id, 30)).toBe(1)
    const stale = arrearsFactor(away, village.id, VISIT_STALE)
    console.log(`недоимка: через ${VISIT_STALE} сут. доходит ${Math.round(stale * 100)}%`)
    expect(stale).toBeCloseTo(1 - ARREARS_MAX, 5)
    // Объезд возвращает счёт: недоимку заносят, и хозяина снова видели.
    const owed = ok(
      applyCommand({ ...state, visits: { [village.id]: 0 } }, { type: 'tourHolding' }),
    )
    expect(owed.character.money).toBeGreaterThan(state.character.money)
    expect(owed.visits?.[village.id]).toBe(dayOf(owed.time))
  })
})

describe('В3: закон', () => {
  it('у каждого решения своя цена, и дешёвого выбора нет', () => {
    if (!village) return
    const state = holder(village.id)
    expect(lawOf(state).tax).toBe('plain')
    expect(taxTake(lawOf(state))).toBe(1)

    const heavy = ok(applyCommand(state, { type: 'setLaw', tax: 'heavy' }))
    expect(heavy.law?.tax).toBe('heavy')
    expect(taxTake(lawOf(heavy))).toBeGreaterThan(1)
    // За тяжёлую подать платят настроением.
    expect(lawMood(lawOf(heavy))).toBeLessThan(lawMood(lawOf(state)))
    // И это ложится в память места по суткам, а не одним ударом.
    let lived = heavy
    for (let i = 0; i < 12; i += 1) {
      lived = ok(applyCommand(lived, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    console.log(
      `тяжёлая подать: ${TAX_DEFS.heavy.label} ×${TAX_DEFS.heavy.take}, настроение ${lawMood(lawOf(heavy))}, память места через 12 сут. ${lived.reputation.places[village.id] ?? 0}`,
    )
    expect(lived.reputation.places[village.id] ?? 0).toBeLessThan(0)
    // Суд без пощады сбивает разбой, милостивый — отпускает.
    expect(JUSTICE_DEFS.harsh.banditry).toBeLessThan(JUSTICE_DEFS.mild.banditry)
    // Полный набор восполняет рекрутов быстрее, но людям это не нравится.
    expect(LEVY_DEFS.full.recruits).toBeGreaterThan(LEVY_DEFS.plain.recruits)
    expect(LEVY_DEFS.full.mood).toBeLessThan(0)
    // Пустое решение не принимают.
    expect(applyCommand(heavy, { type: 'setLaw', tax: 'heavy' }).ok).toBe(false)
  })
})

describe('В2: жители хотят', () => {
  it('просьба растёт из состояния места, и молчание помнят как отказ', () => {
    expect(PLEAS.length).toBeGreaterThanOrEqual(7)
    if (!village) return
    const state = holder(village.id)
    const settlement = state.settlements[village.id]
    expect(settlement).toBeDefined()
    if (!settlement) return
    // Голодной деревне нужен амбар — прежде всего прочего.
    const hungry: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [village.id]: { ...settlement, stock: { ...settlement.stock, grain: 0, fish: 0 } },
      },
    }
    const plea = pleaOf(hungry, hungry.settlements[village.id] ?? settlement, 1)
    expect(plea?.def.id).toBe('granary')
    console.log(`${village.name} просит: ${plea?.def.label} — «${plea?.def.asks}»`)
    // Ответ — это работа и деньги, и место это помнит.
    const answered = ok(applyCommand(hungry, { type: 'answerPlea', locationId: village.id }))
    expect(answered.settlements[village.id]?.building?.id).toBe('granary')
    expect(answered.reputation.places[village.id] ?? 0).toBeGreaterThan(0)
    // Отвечают на месте, а не издалека.
    const far: GameState = { ...hungry, locationId: 'elsewhere' }
    expect(applyCommand(far, { type: 'answerPlea', locationId: village.id }).ok).toBe(false)

    // Молчание: терпение выходит, и это записывают. Берём просьбу, которая не
    // меняется сама: деревне с амбаром и тихой округой нужна мельница, и нужна
    // она столько, сколько её нет.
    const settled: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [village.id]: { ...settlement, buildings: ['granary'], banditry: 0 },
      },
    }
    const waiting = pleaOf(settled, settled.settlements[village.id] ?? settlement, 1)
    expect(waiting?.def.id).toBe('mill')
    let silent = settled
    const patience = waiting?.def.patience ?? 180
    for (let i = 0; i < patience + 10; i += 1) {
      silent = ok(applyCommand(silent, { type: 'tick', minutes: MINUTES_PER_DAY }))
      if ((silent.reputation.places[village.id] ?? 0) < 0) break
    }
    console.log(
      `молчали о мельнице ${patience} сут.: память места ${silent.reputation.places[village.id] ?? 0}`,
    )
    expect(silent.reputation.places[village.id] ?? 0).toBeLessThan(0)
  })
})

describe('В4: постройки с людьми', () => {
  it('работникам платят, постройка встаёт, и встав — не считается', () => {
    if (!village) return
    const state = holder(village.id)
    const settlement = state.settlements[village.id]
    if (!settlement) return
    const withMill = { ...settlement, buildings: ['mill' as const, 'well' as const] }
    expect(worksWages(withMill, [])).toBeGreaterThan(0)
    expect(worksRepairCost('mill')).toBeGreaterThan(0)
    // Мельница и колодец поднимают предел земли: своя деревня растёт, если ты
    // ей дал (В6).
    const bare = carryingCapacity(world, village.id, settlement)
    const given = carryingCapacity(world, village.id, withMill)
    console.log(`${village.name}: предел земли ${bare} → ${given} с мельницей и колодцем`)
    expect(given).toBeGreaterThan(bare)

    // Поломка: за десять лет мельница встаёт хотя бы раз.
    let lived: GameState = {
      ...state,
      settlements: { ...state.settlements, [village.id]: { ...withMill, owner: PLAYER } },
    }
    let brokeOnce = false
    for (let i = 0; i < 1200; i += 1) {
      lived = ok(applyCommand(lived, { type: 'tick', minutes: MINUTES_PER_DAY }))
      if (isBroken(lived, village.id, 'mill')) {
        brokeOnce = true
        break
      }
    }
    console.log(`мельница встала: ${brokeOnce}`)
    expect(brokeOnce).toBe(true)
    // Встав, она ушла из списка построек: мир перестал её считать.
    expect(lived.settlements[village.id]?.buildings.includes('mill')).toBe(false)
    // И её чинят за деньги, на месте.
    const fixed = ok(
      applyCommand(lived, { type: 'repairBuilding', locationId: village.id, building: 'mill' }),
    )
    expect(isBroken(fixed, village.id, 'mill')).toBe(false)
    expect(fixed.settlements[village.id]?.buildings.includes('mill')).toBe(true)
    expect(fixed.character.money).toBe(lived.character.money - worksRepairCost('mill'))
    console.log(`починка ${BUILDINGS.mill.label.toLowerCase()}: −${worksRepairCost('mill')}`)
  })
})

describe('счёт остался счётом', () => {
  it('подать по-прежнему считается с достатка, а не с воздуха', () => {
    const places = createSettlements(world)
    const rich = Object.values(places).find((one) => one.population > 2000)
    expect(rich).toBeDefined()
    if (!rich) return
    expect(dailyTax(rich, foodSecurity(rich))).toBeGreaterThan(0)
    const starving = { ...rich, stock: { ...rich.stock, grain: 0, fish: 0 } }
    expect(dailyTax(starving, foodSecurity(starving))).toBeLessThan(
      dailyTax(rich, foodSecurity(rich)),
    )
  })
})
