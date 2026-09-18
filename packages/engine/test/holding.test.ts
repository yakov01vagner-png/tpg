import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { BUILDINGS } from '../src/content/buildings'
import { MARCHES } from '../src/content/world'
import { PLAYER, dailyTax, garrisonSize, hasBuilding, holdingsOf } from '../src/holding'
import { carryingCapacity, foodSecurity, stockDays, tickDays } from '../src/life'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { generateWorld } from '../src/world/generate'
import { FRONTIER } from '../src/world/types'
import type { LocationArchetype } from '../src/world/types'

const world = generateWorld(1)

function someplace(archetype: LocationArchetype): string {
  const found = Object.values(world.locations).find((l) => l.archetype === archetype)
  if (!found) throw new Error(`нет места вида «${archetype}»`)
  return found.id
}

/** Игра, где указанное место уже принадлежит игроку. */
function owning(locationId: string, money = 5000): GameState {
  const base = createGame(createCharacter({ name: 'Тест', money }), 1, world)
  const settlement = base.settlements[locationId]
  if (!settlement) throw new Error('нет такого места')
  return {
    ...base,
    locationId,
    settlements: { ...base.settlements, [locationId]: { ...settlement, owner: PLAYER } },
  }
}

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

describe('земля роздана', () => {
  it('у каждого места есть держатель, а столицы за короной', () => {
    const base = createGame(createCharacter({ name: 'Тест' }), 1, world)
    // Кроме пограничья: марку не держит никто, в том и смысл. Вольное село в
    // ней ничьё, и отнимать его не у кого — потому его и можно взять.
    const ownerless = Object.values(base.settlements)
      .filter((one) => one.owner === null)
      .filter((one) => {
        const provinceId = world.locations[one.locationId]?.provinceId ?? ''
        const regionId = world.provinces[provinceId]?.regionId ?? ''
        return world.regions[regionId]?.kingdomId !== FRONTIER
      })
    expect(ownerless).toEqual([])
    // Ничьих поселений ровно столько, сколько ничьей земли: вольное село в
    // каждой марке и все места островов — до острова короне не дотянуться
    // (этап 35).
    const free = Object.values(base.settlements).filter((one) => one.owner === null)
    const islandPlaces = Object.values(world.provinces)
      .filter((province) => province.island)
      .reduce((sum, province) => sum + province.locationIds.length, 0)
    expect(free.length, 'вольных сёл и мест на островах').toBe(MARCHES.length + islandPlaces)
    for (const kingdom of Object.values(world.kingdoms)) {
      expect(base.settlements[kingdom.capitalId]?.owner).toBe(`crown:${kingdom.id}`)
    }
    console.log(`лордов в мире: ${base.politics.lords.length}`)
    expect(base.politics.lords.length).toBeGreaterThan(10)
  })

  it('титулы у королевств разные', () => {
    const base = createGame(createCharacter({ name: 'Тест' }), 1, world)
    const title = (kingdomId: string) =>
      base.politics.lords.find((lord) => lord.kingdomId === kingdomId)?.title
    console.log(
      `Ре-Эстиз: ${title('reEstiz')}, Бохарут: ${title('boharut')}, дворфы: ${title('durHazad')}`,
    )
    expect(title('reEstiz')).not.toBe(title('boharut'))
  })
})

describe('своё владение', () => {
  it('чужое строить нельзя', () => {
    const base = createGame(createCharacter({ name: 'Тест', money: 5000 }), 1, world)
    const result = applyCommand(
      { ...base, locationId: someplace('town') },
      { type: 'build', building: 'granary' },
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('notYours')
  })

  it('стройка стоит денег и идёт сутками', () => {
    const before = owning(someplace('town'))
    const after = ok(applyCommand(before, { type: 'build', building: 'granary' }))
    expect(after.character.money).toBe(before.character.money - BUILDINGS.granary.cost)
    expect(after.settlements[after.locationId]?.building?.id).toBe('granary')

    // Через положенное время амбар стоит.
    const later = tickDays(world, after.settlements, BUILDINGS.granary.days + 1).settlements
    const built = later[after.locationId] ?? after.settlements[after.locationId]
    if (!built) throw new Error('поселение пропало из мира')
    expect(hasBuilding(built, 'granary')).toBe(true)
  })

  it('амбар поднимает норму запаса, которую место держит', () => {
    const id = someplace('village')
    const base = owning(id).settlements[id]
    if (!base) return
    expect(stockDays({ ...base, buildings: ['granary'] })).toBeGreaterThan(stockDays(base))

    // На полупустых амбарах разница видна и в обеспеченности.
    const lean = { ...base, stock: { ...base.stock, grain: 40, fish: 0 } }
    expect(foodSecurity({ ...lean, buildings: ['granary'] })).toBeLessThan(foodSecurity(lean))
  })

  it('мельница прибавляет еды, казармы — людей', () => {
    const id = someplace('village')
    const found = createGame(createCharacter({ name: 'Тест' }), 1, world).settlements[id]
    if (!found) return
    // Деревню сажаем под самый предел земли нарочно: мельница даёт не людей, а
    // еду, и видно это только там, где упёрлись в землю. На просторе растут
    // одинаково — и с мельницей, и без неё.
    const base = { ...found, population: Math.round(carryingCapacity(world, id, found) * 0.84) }
    const plain = tickDays(world, { [id]: base }, 900).settlements[id]
    const milled = tickDays(world, { [id]: { ...base, buildings: ['mill'] } }, 900).settlements[id]
    const barracked = tickDays(world, { [id]: { ...base, buildings: ['barracks'] } }, 900)
      .settlements[id]
    console.log(
      `деревня за 900 сут: без построек ${plain?.population}, с мельницей ${milled?.population}, ` +
        `рекрутов с казармами ${barracked?.recruits} против ${plain?.recruits}`,
    )
    expect(milled?.population ?? 0).toBeGreaterThan(plain?.population ?? 0)
    expect(barracked?.recruits ?? 0).toBeGreaterThan(plain?.recruits ?? 0)
  })

  it('подати идут с сытой земли и не идут с разорённой', () => {
    const id = someplace('town')
    const base = createGame(createCharacter({ name: 'Тест' }), 1, world).settlements[id]
    if (!base) return
    const rich = dailyTax(base, 1)
    const ruined = dailyTax({ ...base, banditry: 0.9 }, 0.2)
    console.log(`подать с городка: сытого ${rich}, разорённого ${ruined}`)
    expect(rich).toBeGreaterThan(0)
    expect(ruined).toBeLessThan(rich)
  })

  it('гарнизон ставится из отряда и снимается обратно', () => {
    const id = someplace('fortress')
    let state = owning(id)
    state = ok(applyCommand(state, { type: 'hire', troop: 'militia', count: 3 }))
    state = ok(applyCommand(state, { type: 'station', troop: 'militia', count: 3 }))
    const stationed = state.settlements[id]
    expect(stationed && garrisonSize(stationed)).toBe(3)

    state = ok(applyCommand(state, { type: 'withdraw', troop: 'militia', count: 2 }))
    const left = state.settlements[id]
    expect(left && garrisonSize(left)).toBe(1)
  })

  it('владения приносят доход в тот же суточный расчёт', () => {
    const id = someplace('town')
    const before = owning(id, 500)
    const after = ok(applyCommand(before, { type: 'sleep' }))
    console.log(
      `за сутки владения: ${before.character.money} → ${after.character.money}, ` +
        `владений ${holdingsOf(after.settlements, PLAYER).length}`,
    )
    expect(after.character.money).toBeGreaterThan(before.character.money)
  })
})
