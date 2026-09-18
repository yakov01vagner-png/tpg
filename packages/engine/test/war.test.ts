import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { tickDays } from '../src/life'
import type { Party } from '../src/party'
import { partySize } from '../src/party'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { NO_POLITICS, atWar, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { goTo } from './road'

const world = generateWorld(1)
const start = createSettlements(world)
const capital = world.kingdoms.reEstiz?.capitalId ?? ''

const totalPopulation = (settlements: Record<string, (typeof start)[string]>) =>
  Object.values(settlements).reduce((sum, s) => sum + s.population, 0)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

describe('политика', () => {
  it('войны начинаются и кончаются сами', () => {
    const result = tickPolitics(world, NO_POLITICS, start, 900, createRng(3))
    const declared = result.events.filter((event) => event.type === 'warDeclared').length
    const peace = result.events.filter((event) => event.type === 'peace').length
    console.log(`за 900 суток: объявлено войн ${declared}, заключено миров ${peace}`)
    expect(declared).toBeGreaterThan(0)
    expect(peace).toBeGreaterThan(0)
    // Мир не превращается во всеобщую резню без конца.
    expect(result.politics.wars.length).toBeLessThan(Object.keys(world.kingdoms).length)
  })

  it('у каждой войны есть причина', () => {
    const result = tickPolitics(world, NO_POLITICS, start, 900, createRng(3))
    for (const event of result.events) {
      if (event.type === 'warDeclared') expect(event.war.reason.length).toBeGreaterThan(5)
    }
  })

  it('объявленная война сама по себе никого не разоряет', () => {
    // Раньше разорение бросал кубик, и за сто лет набеги убивали больше людей,
    // чем живёт в мире, ничего при этом не меняя. Теперь разорять должен тот,
    // кто дошёл до места (band.ts), а война на бумаге остаётся бумагой.
    const result = tickPolitics(world, NO_POLITICS, start, 1200, createRng(11))
    expect(result.events.some((event) => event.type === 'warDeclared')).toBe(true)
    for (const [id, settlement] of Object.entries(result.settlements)) {
      expect(settlement.population).toBe(start[id]?.population)
    }
  })
})

describe('разбой душит подвоз', () => {
  const mines = Object.values(world.locations).filter((one) => one.archetype === 'mine')
  const minePop = (settlements: Record<string, (typeof start)[string]>) =>
    mines.reduce((sum, mine) => sum + (settlements[mine.id]?.population ?? 0), 0)
  /** Тот же мир, но по дорогам страшно ездить и, если сказано, земля выжата. */
  const under = (banditry: number, strain: number) => {
    const places: Record<string, (typeof start)[string]> = {}
    for (const [id, settlement] of Object.entries(start))
      places[id] = { ...settlement, banditry, strain }
    return tickDays(world, places, 400).settlements
  }

  it('на сытой земле разбой обозы тощит, но рудников не пустошит', () => {
    // Пока в провинции есть хлебная деревня, до рудника доходит и треть обоза:
    // деревенская округа кормит вчетверо больше, чем в ней живёт. Пара
    // процентов людей на этом теряется, но разбой сам по себе — ещё не голод.
    const calm = under(0, 0)
    const troubled = under(0.9, 0)
    console.log(
      `за 400 суток на сытой земле: в рудниках ${minePop(calm).toFixed(0)} против ${minePop(troubled).toFixed(0)}`,
    )
    expect(minePop(troubled)).toBeLessThanOrEqual(minePop(calm))
    // Десятая часть, а не двадцатая: с версии 0.4 подвоз идёт дальше — между
    // рудником и хлебной деревней лежит земля, — и разбой отъедает от него
    // больше. Голодом это всё ещё не становится.
    expect(minePop(troubled)).toBeGreaterThan(minePop(calm) * 0.9)
  })

  it('на выжатой земле тот же разбой оборачивается голодом', () => {
    // А вот когда урожай сел, запаса в округе больше нет — и первыми ложатся
    // те, кто своей еды не растит. Это и есть связка «голод и разбой кормят
    // друг друга»: поодиночке ни то ни другое рудник не берёт, вместе — вдвое.
    const calm = under(0, 1)
    const troubled = under(0.9, 1)
    console.log(
      `за 400 суток на выжатой земле: всего людей ${totalPopulation(calm).toFixed(0)} против ${totalPopulation(troubled).toFixed(0)}, ` +
        `в рудниках ${minePop(calm).toFixed(0)} против ${minePop(troubled).toFixed(0)}`,
    )
    expect(totalPopulation(troubled)).toBeLessThan(totalPopulation(calm))
    expect(minePop(troubled)).toBeLessThan(minePop(calm))
    // Главным стала не дорога, а год: с версии 0.5 у года есть времена (этап
    // 37), и выжатая земля сама по себе отнимает у рудников треть — с шести
    // тысяч девятисот до четырёх с половиной. Разбой поверх этого отнимает ещё
    // несколько процентов: связка «голод и разбой» осталась, но первым теперь
    // идёт голод, а не разбой.
    const fed = under(0, 0)
    console.log(
      `рудники: сытая земля ${minePop(fed).toFixed(0)}, выжатая ${minePop(calm).toFixed(0)}, выжатая с разбоем ${minePop(troubled).toFixed(0)}`,
    )
    expect(minePop(calm)).toBeLessThan(minePop(fed) * 0.8)
  })
})

describe('дорога', () => {
  const traveller = (party: Party, banditry: number, seed: number): GameState => {
    const base = createGame(createCharacter({ name: 'Тест', money: 300 }), seed, world)
    const settlements: Record<string, (typeof start)[string]> = { ...base.settlements }
    for (const [id, settlement] of Object.entries(settlements)) {
      settlements[id] = { ...settlement, banditry }
    }
    return { ...base, settlements, party }
  }

  const firstRoad = (state: GameState) => {
    const road = state.world.roads[state.locationId]?.[0]
    if (!road) throw new Error('из стартовой деревни нет дорог')
    return road.to
  }

  it('в разбойной округе отряд нарывается на засаду', () => {
    let ambushed = false
    for (let seed = 1; seed <= 12 && !ambushed; seed += 1) {
      const state = traveller(
        { units: { militia: 8 }, morale: 70, hungryDays: 0, gear: 0 },
        0.9,
        seed,
      )
      const after = goTo(state, firstRoad(state))
      if (after.battle) ambushed = true
    }
    expect(ambushed).toBe(true)
  })

  it('на спокойных дорогах обычно тихо', () => {
    let ambushes = 0
    for (let seed = 1; seed <= 12; seed += 1) {
      const state = traveller(
        { units: { militia: 8 }, morale: 70, hungryDays: 0, gear: 0 },
        0,
        seed,
      )
      const after = ok(applyCommand(state, { type: 'travel', toLocationId: firstRoad(state) }))
      if (after.battle) ambushes += 1
    }
    console.log(`из 12 переходов по спокойной дороге засад: ${ambushes}`)
    expect(ambushes).toBeLessThan(4)
  })

  it('одиночку не бьют, а обирают', () => {
    let robbed = false
    for (let seed = 1; seed <= 12 && !robbed; seed += 1) {
      const state = traveller({ units: {}, morale: 60, hungryDays: 0, gear: 0 }, 0.9, seed)
      const after = goTo(state, firstRoad(state))
      if (after.character.money < state.character.money) {
        robbed = true
        expect(after.battle).toBe(null)
      }
    }
    expect(robbed).toBe(true)
  })
})

describe('служба', () => {
  const inCapital = (): GameState => ({
    ...createGame(createCharacter({ name: 'Тест', money: 500 }), 1, world),
    locationId: capital,
  })

  it('на службу берут на своей земле', () => {
    const state = inCapital()
    const after = ok(applyCommand(state, { type: 'takeService', kingdomId: 'reEstiz' }))
    expect(after.service).toBe('reEstiz')
    const foreign = applyCommand(state, { type: 'takeService', kingdomId: 'boharut' })
    expect(foreign.ok).toBe(false)
  })

  it('без войны воевать не с кем', () => {
    const served = ok(applyCommand(inCapital(), { type: 'takeService', kingdomId: 'reEstiz' }))
    const withParty = {
      ...served,
      party: { units: { militia: 8 }, morale: 70, hungryDays: 0, gear: 0 },
    }
    const result = applyCommand(withParty, { type: 'seekEnemy' })
    expect(result.ok).toBe(false)
  })

  it('на войне выход к врагу оборачивается боем', () => {
    const served = ok(applyCommand(inCapital(), { type: 'takeService', kingdomId: 'reEstiz' }))
    const atWarState: GameState = {
      ...served,
      party: { units: { spearman: 20, archer: 6 }, morale: 75, hungryDays: 0, gear: 0 },
      politics: {
        ...served.politics,
        wars: [{ a: 'reEstiz', b: 'boharut', since: 1, reason: 'старые счёты' }],
        lastDay: 1,
      },
    }
    expect(atWar(atWarState.politics, 'reEstiz', 'boharut')).toBe(true)
    const after = ok(applyCommand(atWarState, { type: 'seekEnemy' }))
    expect(after.battle).not.toBe(null)
    expect(partySize(after.party)).toBe(26)
  })
})

describe('мир выдерживает войну', () => {
  it('десять лет войн не превращают мир в пустыню', () => {
    let settlements = start
    let politics = NO_POLITICS
    let rng = createRng(7)
    let day = 0
    const began = performance.now()

    for (let chunk = 0; chunk < 122; chunk += 1) {
      day += 30
      settlements = tickDays(world, settlements, 30).settlements
      const result = tickPolitics(world, politics, settlements, day, rng)
      settlements = result.settlements
      politics = result.politics
      rng = result.rng
    }

    const survivors = Object.values(settlements).filter((s) => s.population > 0).length
    console.log(
      `десять лет войн: население ${totalPopulation(start)} → ${totalPopulation(settlements)}, ` +
        `мест ${survivors} из ${Object.keys(start).length}, войн сейчас ${politics.wars.length}, ` +
        `счёт ${(performance.now() - began).toFixed(0)} мс`,
    )
    expect(totalPopulation(settlements)).toBeGreaterThan(totalPopulation(start) * 0.3)
    expect(survivors).toBeGreaterThan(Object.keys(start).length * 0.5)
  })
})
