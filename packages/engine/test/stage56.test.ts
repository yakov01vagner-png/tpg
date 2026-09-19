import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import {
  CHILD_BENTS,
  HOMES,
  KIN_ASK,
  RETIRE_AGE,
  SPOUSE_TEMPERS,
  UPBRINGING_MAX,
} from '../src/content/home'
import { ageOf, birthDayFor } from '../src/dynasty'
import type { Child } from '../src/dynasty'
import {
  atHome,
  bentWords,
  canRetire,
  canTeachChild,
  childBent,
  homeComfort,
  homesAt,
  kinOf,
  spouseMood,
  spouseSays,
  spouseTemper,
  upbringingOf,
} from '../src/home'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { DAYS_PER_YEAR, MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 56: дом и семья.
 *
 * Супруг становится человеком со своим мнением, дети — людьми со склонностями,
 * дом — местом, а наследство — разделом, а не переключением героя.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}
const town =
  Object.values(world.locations).find((one) => one.archetype === 'town' && one.population > 2000)
    ?.id ?? ''

function at(locationId: string, money = 6000): GameState {
  const base = createGame(createCharacter({ name: 'Т', money }), 1, world)
  return { ...base, locationId, quarter: null }
}

function married(state: GameState, spouseName = 'Ждана'): GameState {
  return {
    ...state,
    character: {
      ...state.character,
      family: {
        ...state.character.family,
        spouse: { name: spouseName, lordId: null, kingdomId: null, sinceDay: 1 },
      },
    },
  }
}

describe('Д1: супруг — человек', () => {
  it('у супруга нрав, своё мерило и своё слово', () => {
    expect(Object.keys(SPOUSE_TEMPERS)).toHaveLength(5)
    const state = married(at(town))
    const temper = spouseTemper(state.character.family)
    expect(temper).toBeDefined()
    if (!temper) return
    const def = SPOUSE_TEMPERS[temper]
    console.log(`${state.character.family.spouse?.name}: ${def.label}, ценит ${def.values}`)
    expect(spouseSays(state).length).toBeGreaterThan(10)
    // Мерило работает: честолюбивая рада славе, крутая — деньгам.
    const poor: GameState = { ...state, renown: 0, character: { ...state.character, money: 0 } }
    const rich: GameState = { ...state, renown: 20, character: { ...state.character, money: 9000 } }
    expect(spouseMood(rich)).toBeGreaterThanOrEqual(spouseMood(poor))
    expect(spouseSays(rich)).not.toBe('')
    // Без супруга слов нет.
    expect(spouseSays(at(town))).toBe('')
  })
})

describe('Д2: дети растут', () => {
  it('у ребёнка своя склонность, и вложенное в него остаётся', () => {
    const day = 1
    const child: Child = { name: 'Малуша', bornDay: birthDayFor(day, 9), heir: true }
    expect(Object.keys(CHILD_BENTS)).toHaveLength(5)
    expect(bentWords(child)).toContain(CHILD_BENTS[childBent(child)].label)
    const state: GameState = {
      ...married(at(town)),
      home: { kind: 'hut', locationId: town, sinceDay: 1, stash: {} },
    }
    const withChild: GameState = {
      ...state,
      character: {
        ...state.character,
        family: { ...state.character.family, children: [child] },
      },
    }
    expect(canTeachChild(withChild, child, day).can).toBe(true)
    const taught = ok(applyCommand(withChild, { type: 'teachChild', childName: child.name }))
    expect(upbringingOf(taught, child)).toBe(1)
    expect(taught.time).toBeGreaterThan(withChild.time)
    // Малыша не учат, взрослого — поздно.
    const baby: Child = { name: 'Мал', bornDay: birthDayFor(day, 3), heir: false }
    expect(canTeachChild(withChild, baby, day).can).toBe(false)
    const grown: Child = { name: 'Взрослый', bornDay: birthDayFor(day, 20), heir: false }
    expect(canTeachChild(withChild, grown, day).can).toBe(false)
    // И вложить можно не бесконечно.
    const full: GameState = { ...withChild, upbringing: { [child.name]: UPBRINGING_MAX } }
    expect(canTeachChild(full, child, day).can).toBe(false)
  })
})

describe('Д3: дом как место', () => {
  it('дом покупают, в нём спят лучше и в нём оставляют поклажу', () => {
    expect(HOMES).toHaveLength(3)
    const state = at(town)
    const offered = homesAt(world, state.settlements, town)
    expect(offered.length).toBeGreaterThan(0)
    const hut = offered[0]
    if (!hut) return
    expect(atHome(state)).toBe(false)
    const bought = ok(applyCommand(state, { type: 'buyHome', kind: hut.id }))
    expect(bought.home?.locationId).toBe(town)
    expect(atHome(bought)).toBe(true)
    expect(homeComfort(bought)).toBeGreaterThan(0)
    expect(bought.character.money).toBe(state.character.money - hut.price)
    // Второй дом не покупают.
    expect(applyCommand(bought, { type: 'buyHome', kind: hut.id }).ok).toBe(false)

    // Дома спится лучше: сил восстанавливается больше за ту же ночь.
    // Ложатся под утро: за три часа сна разница видна, за девять оба выспятся.
    const tired = (one: GameState): GameState => ({
      ...one,
      time: WORLD_START + 21 * 60,
      character: { ...one.character, fatigue: 95 },
    })
    const homeSleep = ok(applyCommand(tired(bought), { type: 'sleep' }))
    const innSleep = ok(applyCommand(tired({ ...bought, home: null }), { type: 'sleep' }))
    console.log(
      `ночь: дома усталость ${Math.round(homeSleep.character.fatigue)}, на постоялом ${Math.round(innSleep.character.fatigue)}`,
    )
    expect(homeSleep.character.fatigue).toBeLessThan(innSleep.character.fatigue)

    // И поклажу дома оставляют.
    const laden: GameState = {
      ...bought,
      character: { ...bought.character, inventory: { grain: 20 } },
    }
    const stored = ok(applyCommand(laden, { type: 'storeAtHome', good: 'grain', amount: 20 }))
    expect(stored.home?.stash.grain).toBe(20)
    expect(stored.character.inventory.grain ?? 0).toBe(0)
    const taken = ok(applyCommand(stored, { type: 'takeFromHome', good: 'grain', amount: 5 }))
    expect(taken.character.inventory.grain).toBe(5)
    // Не дома — ни положить, ни взять.
    const away: GameState = { ...stored, locationId: world.kingdoms.reEstiz?.capitalId ?? '' }
    expect(applyCommand(away, { type: 'takeFromHome', good: 'grain', amount: 1 }).ok).toBe(false)
  })
})

describe('Д5 и Д6: родня и старость', () => {
  it('родня просит и помогает, а на покой уходят в летах', () => {
    const state = married(at(town))
    const kin = kinOf(state.character.family, 1)
    expect(kin.length).toBeGreaterThanOrEqual(2)
    console.log(
      `родня дома ${state.character.family.house}: ${kin.map((one) => `${one.name} — ${one.asks ? 'просит' : 'помогает'}`).join(', ')}`,
    )
    const asking = kin.find((one) => one.asks)
    const giving = kin.find((one) => !one.asks)
    if (asking) {
      const helped = ok(applyCommand(state, { type: 'helpKin', kinId: asking.id }))
      expect(helped.character.money).toBe(state.character.money - KIN_ASK)
      expect(helped.renown).toBe(state.renown + 1)
    }
    if (giving) {
      const gifted = ok(applyCommand(state, { type: 'helpKin', kinId: giving.id }))
      expect(gifted.character.money).toBeGreaterThan(state.character.money)
    }

    // На покой — в летах и когда есть кому передать.
    const day = 1
    expect(canRetire(state, day)).toBe(false)
    const old: GameState = {
      ...state,
      time: WORLD_START,
      character: {
        ...state.character,
        bornDay: birthDayFor(day, RETIRE_AGE + 2),
        family: {
          ...state.character.family,
          children: [{ name: 'Молодой', bornDay: birthDayFor(day, 18), heir: true }],
        },
      },
      upbringing: { Молодой: 4 },
      renown: 10,
    }
    expect(canRetire(old, day)).toBe(true)
    const passed = ok(applyCommand(old, { type: 'retire' }))
    expect(passed.character.name).toBe('Молодой')
    expect(passed.renown).toBe(5)
    expect(ageOf(passed.character.bornDay, day)).toBe(18)
    // Вложенное в него не пропало: у наследника есть то, чему его учили.
    const bent = childBent({ name: 'Молодой', bornDay: birthDayFor(day, 18), heir: true })
    const skill =
      bent === 'sword'
        ? 'heavyWeapons'
        : bent === 'book'
          ? 'scholarship'
          : bent === 'coin'
            ? 'trade'
            : bent === 'land'
              ? 'survival'
              : 'concentration'
    expect(passed.character.skills[skill].level).toBeGreaterThanOrEqual(4)
    console.log(`наследник: ${bent}, ${skill} на ${passed.character.skills[skill].level}`)
    expect(DAYS_PER_YEAR).toBe(365)
    expect(MINUTES_PER_DAY).toBe(1440)
  })
})
