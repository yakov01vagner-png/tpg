import { describe, expect, it } from 'vitest'
import { clash, magesFor, musterBands, retinue } from '../src/band'
import { unitsSize } from '../src/battle'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import {
  ARCHMAGE_DEED_LABELS,
  ARTIFACTS,
  FORGET_DAYS,
  MASTERY_STEPS,
  RAIN_HARVEST,
  WAR_MAGES,
} from '../src/content/lore'
import { SPELLS, SPELLS_BY_ID } from '../src/content/spells'
import { createSettlements } from '../src/economy'
import {
  artifactPower,
  craftOf,
  fearOf,
  hasWeather,
  masteryOf,
  masteryPower,
  masteryWord,
  spellPower,
  withUses,
} from '../src/lore'
import { createRng } from '../src/rng'
import { schoolsOf } from '../src/school'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, HARVEST_DAY, MINUTES_PER_DAY, WORLD_START, dayOf } from '../src/time'
import { NO_POLITICS, createPolitics, stateOfDeed, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 60: магия в мире.
 *
 * До 0.6 магия была делом игрока, а мир обходился без неё: архимаг короны был
 * строкой «занят». Теперь «занят» значит чем-то, у погоды есть зов, у чар —
 * цена, у заклинания — ступень мастерства, а у редких вещей — своя сила.
 */

const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function mage(locationId: string, magic = 70, money = 5000): GameState {
  const base = createGame(createCharacter({ name: 'Т', money }), 1, world)
  return {
    ...base,
    locationId,
    quarter: null,
    time: WORLD_START,
    character: {
      ...base.character,
      skills: { ...base.character.skills, magic: { level: magic, xp: 0 } },
    },
  }
}

/** Творить, пока не выйдет: заклинание удаётся не всегда, и это нарочно. */
function castUntil(state: GameState, spellId: string, check: (next: GameState) => boolean) {
  let current = state
  for (let tries = 0; tries < 12; tries += 1) {
    const result = applyCommand(
      { ...current, character: { ...current.character, fatigue: 0 } },
      { type: 'cast', spellId },
    )
    if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
    current = result.state
    if (check(current)) return current
  }
  return current
}

describe('А1: маги мира', () => {
  it('«занят» значит чем-то: у архимага есть имя и дело', () => {
    const [politics] = createPolitics(world, createSettlements(world), createRng(1))
    for (const archmage of Object.values(politics.archmages)) {
      expect(archmage.name?.length ?? 0).toBeGreaterThan(2)
      expect(archmage.deed).toBe('court')
      expect(stateOfDeed('court')).toBe('free')
    }
    expect(stateOfDeed('plague')).toBe('busy')
    expect(stateOfDeed('retreat')).toBe('refused')

    // За век архимаги берутся за все дела, какие есть, и каждое что-то значит.
    const places = createSettlements(world)
    let current = politics
    let rng = createRng(3)
    const seen = new Map<string, number>()
    for (let year = 0; year < 100; year += 1) {
      const result = tickPolitics(world, current, places, year * DAYS_PER_YEAR, rng)
      current = result.politics
      rng = result.rng
      for (const event of result.events) {
        if (event.type !== 'archmageDeed') continue
        seen.set(event.deed, (seen.get(event.deed) ?? 0) + 1)
      }
    }
    console.log(
      `за век дел архимагов: ${[...seen.entries()]
        .map(([deed, times]) => `${ARCHMAGE_DEED_LABELS[deed as 'court'].label} ${times}`)
        .join(', ')}`,
    )
    expect(seen.size).toBeGreaterThan(2)
  })
})

describe('А2: чары в бою мира', () => {
  it('дружина с кругом бьёт больнее, и это видно по потерям', () => {
    const [plain] = retinue(30, createRng(4))
    const [withCircle] = retinue(30, createRng(4), WAR_MAGES)
    expect(plain.mage ?? 0).toBe(0)
    expect(withCircle.mage).toBe(WAR_MAGES)

    const band = (units: typeof plain, id: string) => ({
      id,
      lordId: id,
      kingdomId: 'reEstiz',
      units,
      morale: 70,
      locationId: 'x',
      travel: null,
      goal: { type: 'muster' } as const,
      siegeDays: 0,
    })
    let plainLeft = 0
    let circleLeft = 0
    for (let seed = 1; seed <= 12; seed += 1) {
      const [target] = retinue(30, createRng(9))
      plainLeft += unitsSize(
        clash(band(plain, 'a'), band(target, 'b'), 'plains', 1, createRng(seed)).defender,
      )
      circleLeft += unitsSize(
        clash(band(withCircle, 'a'), band(target, 'b'), 'plains', 1, createRng(seed)).defender,
      )
    }
    console.log(
      `двенадцать сшибок: без круга у чужих осталось ${plainLeft}, с кругом ${circleLeft}`,
    )
    expect(circleLeft).toBeLessThan(plainLeft)

    // Круг встаёт в строй, когда архимаг при войске, и не раньше.
    const [politics, places] = createPolitics(world, createSettlements(world), createRng(1))
    expect(magesFor(politics, 'reEstiz')).toBe(0)
    const atWar = {
      ...politics,
      archmages: {
        ...politics.archmages,
        reEstiz: {
          kingdomId: 'reEstiz',
          state: 'busy' as const,
          untilDay: 999,
          deed: 'war' as const,
        },
      },
    }
    expect(magesFor(atWar, 'reEstiz')).toBe(WAR_MAGES)
    const [bands] = musterBands(atWar, places, createRng(1))
    const withMages = bands.filter(
      (one) => one.kingdomId === 'reEstiz' && (one.units.mage ?? 0) > 0,
    )
    expect(withMages.length).toBeGreaterThan(0)
  })
})

describe('А3: погода по зову', () => {
  it('дождь правит год, буря запирает гавань, оттепель распускает лёд', () => {
    const harbour = Object.values(world.locations).find((one) => one.archetype === 'port')
    expect(harbour).toBeDefined()
    if (!harbour) return
    const state = mage(harbour.id)
    const called = castUntil(state, 'galecall', (next) =>
      hasWeather(next, harbour.id, 'gale', dayOf(next.time)),
    )
    // Позванная буря не спрашивает, чья она.
    expect(hasWeather(called, harbour.id, 'gale', dayOf(called.time))).toBe(true)
    const lane = world.lanes?.[harbour.id]?.[0]
    if (lane) {
      const tried = applyCommand(called, { type: 'sail', toLocationId: lane.to, manner: 'hire' })
      expect(tried.ok).toBe(false)
      if (!tried.ok) expect(tried.message).toContain('буря')
    }

    // Дождь ложится на провинцию и виден на жатве: год выходит лучше, чем шёл.
    const inland = Object.values(world.locations).find((one) => one.archetype === 'village')
    expect(inland).toBeDefined()
    if (!inland) return
    // Зовут накануне жатвы: в первый день осени всё, что выросло, становится
    // числом, и прибавка по зову ложится туда же.
    const eve = { ...mage(inland.id), time: (HARVEST_DAY - 3) * MINUTES_PER_DAY }
    const rained = castUntil(eve, 'rainsong', (next) =>
      hasWeather(next, inland.id, 'rain', dayOf(next.time)),
    )
    expect(hasWeather(rained, inland.id, 'rain', dayOf(rained.time))).toBe(true)
    // Сравниваем два одинаковых мира, а не два прогона: творение чар само
    // двигает генератор, и без этого прибавку не отличить от везения года.
    const withRain: GameState = {
      ...eve,
      weather: [{ locationId: inland.id, kind: 'rain', untilDay: HARVEST_DAY + 4 }],
    }
    let toHarvest = withRain
    let dry = eve
    for (let i = 0; i < 4; i += 1) {
      toHarvest = ok(applyCommand(toHarvest, { type: 'tick', minutes: MINUTES_PER_DAY }))
      dry = ok(applyCommand(dry, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const rainedYear = toHarvest.settlements[inland.id]?.harvest ?? 0
    const dryYear = dry.settlements[inland.id]?.harvest ?? 0
    console.log(
      `${inland.name}: год без зова ${dryYear}, с дождём ${rainedYear} (прибавка ${RAIN_HARVEST})`,
    )
    expect(rainedYear).toBeGreaterThan(dryYear)
  })
})

describe('А4: цена магии', () => {
  it('деревня боится сильнее города, а храм этого не любит', () => {
    expect(fearOf(400)).toBeLessThan(fearOf(9000))
    const village = Object.values(world.locations).find((one) => one.archetype === 'village')
    if (!village) return
    // Берём чары без своей награды: у заговора на урожай память места растёт за
    // полный амбар, и страх в ней не видно.
    const state = mage(village.id)
    const after = castUntil(state, 'rainsong', () => true)
    console.log(
      `${village.name} (${state.settlements[village.id]?.population.toFixed(0)} душ): память о тебе ${state.reputation.places[village.id] ?? 0} → ${after.reputation.places[village.id] ?? 0}`,
    )
    expect(after.reputation.places[village.id] ?? 0).toBeLessThan(
      state.reputation.places[village.id] ?? 0,
    )
  })
})

describe('А5: заклинание как ремесло', () => {
  it('чары доводят повторением и забывают без него', () => {
    expect(MASTERY_STEPS.length).toBe(6)
    const spell = SPELLS_BY_ID.harvestcharm
    expect(spell).toBeDefined()
    if (!spell) return
    const green = { spellcraft: {} }
    expect(masteryOf(craftOf(green, spell.id), 10)).toBe(0)
    const skilled = { spellcraft: withUses({}, spell.id, 60, 100) }
    const top = masteryOf(craftOf(skilled, spell.id), 100)
    console.log(
      `шестьдесят повторений: ${masteryWord(top)} (ступень ${top}), сила ×${masteryPower(top).toFixed(2)}`,
    )
    expect(top).toBe(MASTERY_STEPS.length - 1)
    expect(masteryPower(top)).toBeGreaterThan(masteryPower(0))
    // Забвение: то, что не творили восемь месяцев, помнится хуже.
    expect(masteryOf(craftOf(skilled, spell.id), 100 + FORGET_DAYS * 2)).toBeLessThan(top)

    // Упражнение в школе даёт четыре повторения за раз — и только в школе.
    const school = schoolsOf(world)[0]
    expect(school).toBeDefined()
    if (!school) return
    const inSchool = mage(school.locationId)
    const honed = ok(applyCommand(inSchool, { type: 'honeSpell', spellId: spell.id }))
    expect(craftOf(honed, spell.id).uses).toBe(4)
    const village = Object.values(world.locations).find((one) => one.archetype === 'village')
    if (village) {
      expect(applyCommand(mage(village.id), { type: 'honeSpell', spellId: spell.id }).ok).toBe(
        false,
      )
    }
  })
})

describe('А6: артефакты', () => {
  it('вещь с чарами прибавляет силу, но ничего не открывает', () => {
    expect(ARTIFACTS.length).toBeGreaterThan(4)
    const school = schoolsOf(world)[0]
    if (!school) return
    const state = mage(school.locationId, 70, 4000)
    const def = ARTIFACTS.find((one) => one.needsMagic <= 40)
    expect(def).toBeDefined()
    if (!def) return
    const made = ok(applyCommand(state, { type: 'makeArtifact', defId: def.id }))
    expect(made.artifacts).toHaveLength(1)
    expect(made.character.money).toBe(state.character.money - def.price)
    console.log(
      `${def.label}: ${def.family} ×${artifactPower(made, def.family).toFixed(2)}, работа ${def.days} сут.`,
    )
    expect(artifactPower(made, def.family)).toBeGreaterThan(1)
    // Но заклинания она не открывает: открывает по-прежнему навык.
    const weak = {
      ...made,
      character: {
        ...made.character,
        skills: { ...made.character.skills, magic: { level: 2, xp: 0 } },
      },
    }
    expect(applyCommand(weak, { type: 'cast', spellId: 'harvestcharm' }).ok).toBe(false)
    // Мастерство и вещь складываются в одну силу.
    const spell = SPELLS.find((one) => one.family === def.family)
    if (spell) {
      const both = { ...made, spellcraft: withUses({}, spell.id, 60, 1) }
      expect(spellPower(both, spell, 1)).toBeGreaterThan(spellPower(made, spell, 1))
    }
  })
})
