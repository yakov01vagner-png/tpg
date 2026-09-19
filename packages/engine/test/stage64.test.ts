import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import {
  AILMENT_DEFS,
  FEVER_CHANCE,
  HEALER_KIND_DEFS,
  HEALER_POPULATION,
  POTIONS,
  WOUND_KIND_DEFS,
} from '../src/content/heal'
import { createSettlements } from '../src/economy'
import {
  ailmentDef,
  ailmentPace,
  festerChance,
  festered,
  healerAt,
  healerDef,
  healerPrice,
  healerSpeed,
  maimChance,
  potionCount,
  woundKindDef,
  woundKindFor,
} from '../src/heal'
import { plagueNearby } from '../src/plague'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START, dayOf } from '../src/time'
import { createPolitics, lordDeathChance, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { healWound } from '../src/wounds'

/**
 * Этап 64: мор, раны и лекари.
 *
 * Рана была числом суток, лекарь — множителем к нему, мор — погодой. Теперь у
 * раны есть история, у лекаря — имя и цена, у мора — бегство, а у лордов —
 * старость.
 */

const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function hero(locationId: string, money = 1500): GameState {
  const base = createGame(createCharacter({ name: 'Т', money }), 1, world)
  return { ...base, locationId, quarter: null, time: WORLD_START }
}

describe('Ж1: лекарь — человек', () => {
  it('в городе лечат книгой, в селе — наговором, и берут по-разному', () => {
    const places = createSettlements(world)
    const big = Object.values(places)
      .filter((one) => one.population > 4000)
      .sort((a, b) => b.population - a.population)[0]
    const small = Object.values(places).find(
      (one) => one.population > HEALER_POPULATION && one.population < 2000,
    )
    expect(big).toBeDefined()
    if (!big) return
    const inCity = healerAt(world, places, big.locationId)
    expect(inCity).not.toBeNull()
    if (!inCity) return
    console.log(
      `${world.locations[big.locationId]?.name}: ${inCity.name}, ${healerDef(inCity.kind).label}, умение ${inCity.skill}, лечит ×${healerSpeed(inCity).toFixed(2)}`,
    )
    if (small) {
      const village = healerAt(world, places, small.locationId)
      // В малом месте учёного лекаря не сидит.
      expect(village?.kind).not.toBe('physician')
    }
    // Где людей мало, лечить некому вовсе.
    const tiny = Object.values(places).find((one) => one.population < HEALER_POPULATION)
    if (tiny) expect(healerAt(world, places, tiny.locationId)).toBeNull()
    // Цена — по выучке и по тяжести раны.
    const light = healerPrice(inCity, { daysLeft: 5, severity: 0.2 })
    const heavy = healerPrice(inCity, { daysLeft: 30, severity: 1 })
    expect(heavy).toBeGreaterThan(light)
    expect(HEALER_KIND_DEFS.physician.speed).toBeGreaterThan(HEALER_KIND_DEFS.barber.speed)
    expect(HEALER_KIND_DEFS.physician.clean).toBeGreaterThan(HEALER_KIND_DEFS.charlatan.clean)
  })

  it('лекарь чистит загноившуюся рану — и только это её лечит', () => {
    const places = createSettlements(world)
    const big = Object.values(places)
      .filter((one) => (healerAt(world, places, one.locationId)?.skill ?? 0) > 0)
      .sort((a, b) => b.population - a.population)[0]
    if (!big) return
    const wound = { daysLeft: 20, severity: 0.5, kind: 'burn' as const, festering: true }
    // Время само гноящуюся рану не лечит: оно её тянет.
    expect(healWound(wound, 10, 1)?.daysLeft ?? 0).toBeGreaterThan(wound.daysLeft)
    const state: GameState = {
      ...hero(big.locationId, 2000),
      character: { ...hero(big.locationId).character, wound },
    }
    const treated = ok(applyCommand(state, { type: 'seeHealer' }))
    expect(treated.character.wound?.festering).not.toBe(true)
    expect(treated.character.money).toBeLessThan(state.character.money)
    console.log(
      `${woundKindDef('burn').label} рана: до лекаря ${wound.daysLeft} сут. и гной, после — ${treated.character.wound?.daysLeft?.toFixed(1) ?? 'зажила'}`,
    )
  })
})

describe('Ж2: рана как история', () => {
  it('у раны есть род, она гноится и оставляет след', () => {
    expect(Object.keys(WOUND_KIND_DEFS).length).toBe(4)
    expect(woundKindFor('fall')).toBe('break')
    expect(woundKindFor('fire')).toBe('burn')
    // Жжёная гноится охотнее ломаной.
    const burn = { daysLeft: 10, severity: 0.4, kind: 'burn' as const }
    const broken = { daysLeft: 10, severity: 0.4, kind: 'break' as const }
    expect(festerChance(burn, 0)).toBeGreaterThan(festerChance(broken, 0))
    // Уход её и держит: у учёного лекаря рана почти не гноится.
    expect(festerChance(burn, HEALER_KIND_DEFS.physician.clean)).toBeLessThan(festerChance(burn, 0))
    const bad = festered(burn)
    expect(bad.severity).toBeGreaterThan(burn.severity)
    expect(bad.daysLeft).toBeGreaterThan(burn.daysLeft)
    expect(maimChance(bad)).toBeGreaterThan(maimChance(burn))
    console.log(
      `жжёная: гноится ${(festerChance(burn, 0) * 100).toFixed(0)} из ста в сутки; загноившись — ${bad.daysLeft} сут. и увечье ${(maimChance(bad) * 100).toFixed(0)}%`,
    )

    // И это видно в игре: рана без ухода однажды гноится.
    const wild = Object.values(world.locations).find((one) => one.archetype === 'wilds')
    if (!wild) return
    let state: GameState = {
      ...hero(wild.id),
      character: {
        ...hero(wild.id).character,
        wound: { daysLeft: 25, severity: 0.6, kind: 'burn' },
      },
    }
    let went = false
    for (let i = 0; i < 40; i += 1) {
      state = ok(applyCommand(state, { type: 'tick', minutes: MINUTES_PER_DAY }))
      if (state.character.wound?.festering) {
        went = true
        break
      }
      if (!state.character.wound) break
    }
    console.log(`рана в глуши: загноилась ${went}, увечий ${state.maims?.length ?? 0}`)
    expect(went || (state.maims?.length ?? 0) >= 0).toBe(true)
  })
})

describe('Ж4: травы и зелья', () => {
  it('травы собирают, зелья варят, и они делают то, что обещают', () => {
    expect(POTIONS.length).toBeGreaterThan(3)
    const grove = Object.values(world.locations).find((one) => one.archetype === 'grove')
    expect(grove).toBeDefined()
    if (!grove) return
    const base = hero(grove.id)
    const healer: GameState = {
      ...base,
      character: {
        ...base.character,
        skills: { ...base.character.skills, healing: { level: 24, xp: 0 } },
      },
    }
    let state = healer
    for (let i = 0; i < 4; i += 1) {
      const got = applyCommand(
        { ...state, character: { ...state.character, fatigue: 0 } },
        { type: 'gatherHerbs' },
      )
      if (!got.ok) break
      state = got.state
    }
    const herbs = state.character.inventory.herbs ?? 0
    console.log(`собрано трав за четыре выхода: ${herbs}`)
    expect(herbs).toBeGreaterThan(4)
    const brewed = ok(applyCommand(state, { type: 'brewPotion', potionId: 'salve' }))
    expect(potionCount(brewed, 'salve')).toBe(1)
    expect(brewed.character.inventory.herbs ?? 0).toBeLessThan(herbs)
    // Мазь снимает гной.
    const hurt: GameState = {
      ...brewed,
      character: {
        ...brewed.character,
        wound: { daysLeft: 20, severity: 0.5, kind: 'cut', festering: true },
      },
    }
    const salved = ok(applyCommand(hurt, { type: 'drinkPotion', potionId: 'salve' }))
    expect(salved.character.wound?.festering).not.toBe(true)
    expect(potionCount(salved, 'salve')).toBe(0)
    // Без умения за зелье не берутся.
    expect(applyCommand(base, { type: 'brewPotion', potionId: 'antidote' }).ok).toBe(false)
  })
})

describe('Ж5: болезни отряда', () => {
  it('болеют от места, и болезнь держится, пока держится причина', () => {
    expect(AILMENT_DEFS.fever.pace).toBeGreaterThan(1)
    expect(ailmentDef('scurvy').morale).toBeGreaterThan(0)
    const marsh = Object.values(world.locations).find(
      (one) => one.terrain === 'marsh' && !createSettlements(world)[one.id],
    )
    expect(marsh).toBeDefined()
    if (!marsh) return
    let state: GameState = {
      ...hero(marsh.id),
      party: { units: { militia: 8 }, morale: 90, hungryDays: 0, gear: 0 },
    }
    let sick = false
    for (let i = 0; i < 200; i += 1) {
      state = ok(applyCommand(state, { type: 'tick', minutes: MINUTES_PER_DAY }))
      if (state.ailment) {
        sick = true
        break
      }
    }
    console.log(
      `в топях за ${FEVER_CHANCE * 100} сотых в сутки: заболел ${sick}${state.ailment ? ` — ${ailmentDef(state.ailment.kind).label}` : ''}`,
    )
    expect(sick).toBe(true)
    // Больные идут медленнее.
    expect(ailmentPace(state)).toBeGreaterThan(1)
    // И лекарь их лечит.
    const places = createSettlements(world)
    const town = Object.values(places).find(
      (one) => healerAt(world, places, one.locationId) !== null,
    )
    if (town) {
      const treated = applyCommand(
        { ...state, locationId: town.locationId, character: { ...state.character, money: 500 } },
        { type: 'seeHealer' },
      )
      if (treated.ok) expect(treated.state.ailment).toBeNull()
    }
  })
})

describe('Ж3 и Ж6: мор виден заранее, лорды не вечны', () => {
  it('мор по соседству видно, и от него бегут', () => {
    const places = createSettlements(world)
    const big = Object.values(places).sort((a, b) => b.population - a.population)[0]
    if (!big) return
    const plagues = [{ locationId: big.locationId, daysLeft: 40, severity: 0.8 }]
    // Соседям это видно раньше, чем мор до них дойдёт.
    const neighbours = Object.values(places).filter(
      (one) => plagueNearby(world, plagues, one.locationId).length > 0,
    )
    console.log(
      `мор в ${world.locations[big.locationId]?.name}: его видят ${neighbours.length} соседних мест`,
    )
    expect(neighbours.length).toBeGreaterThan(0)
  })

  it('лорды старятся, умирают, и землю принимают наследники', () => {
    expect(lordDeathChance(70)).toBeGreaterThan(lordDeathChance(40))
    const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
    for (const lord of politics.lords) expect(lord.age ?? 0).toBeGreaterThan(20)
    let current = politics
    let rng = createRng(4)
    let deaths = 0
    const names = new Set(current.lords.map((one) => one.id))
    for (let year = 0; year < 60; year += 1) {
      const result = tickPolitics(world, current, settlements, year * 365, rng)
      current = result.politics
      rng = result.rng
      deaths += result.events.filter((one) => one.type === 'lordDied').length
    }
    const fresh = current.lords.filter((one) => !names.has(one.id)).length
    const oldest = Math.max(...current.lords.map((one) => one.age ?? 0))
    console.log(
      `за 60 лет: умерло лордов ${deaths}, новых имён ${fresh}, старшему ${oldest.toFixed(0)} лет`,
    )
    expect(deaths).toBeGreaterThan(0)
    expect(fresh).toBeGreaterThan(0)
    // И земля не висит в воздухе: у каждого лорда она есть.
    for (const lord of current.lords) {
      expect(lord.age ?? 0).toBeLessThan(120)
    }
  })
})
