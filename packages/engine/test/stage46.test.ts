import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import {
  BLIND_SLOW,
  isKnown,
  knownShare,
  knowsPlace,
  mapsFor,
  rumourAt,
  startKnowledge,
} from '../src/knowledge'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { generateWorld } from '../src/world/generate'
import { regionOf, roadsFrom } from '../src/world/queries'

/**
 * Этап 46: что ты знаешь о мире.
 *
 * Карта не известна с рождения: видна своя область, дальше туман. Мир
 * открывается ногами, слухами и картами, а идти вслепую — риск, и он считается.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}
const game = createGame(createCharacter({ name: 'Т', money: 3000 }), 1, world)

describe('Н1: известное и неизвестное', () => {
  it('на старте видна своя область и округа, дальше — туман', () => {
    const share = knownShare(game)
    console.log(`на старте известно ${Math.round(share * 100)}% земель`)
    expect(share).toBeGreaterThan(0.02)
    expect(share).toBeLessThan(0.25)
    const home = regionOf(world, game.locationId)
    for (const provinceId of home?.provinceIds ?? []) expect(isKnown(game, provinceId)).toBe(true)
    const far = world.kingdoms.hlad?.capitalId ?? ''
    expect(knowsPlace(game, far)).toBe(false)
    // Сейв без знания знает всё.
    expect(isKnown({}, 'x')).toBe(true)
    expect(startKnowledge(world, game.locationId).provinces.length).toBeGreaterThan(3)
  })

  it('пришёл — увидел: земля под ногами и то, куда ведут дороги', () => {
    // Идём по дороге, пока не выйдем в незнакомую землю: пришли — знаем её.
    let state = game
    let steps = 0
    while (steps < 60) {
      const next = roadsFrom(world, state.locationId).find((road) => !knowsPlace(state, road.to))
      const road = next ?? roadsFrom(world, state.locationId)[0]
      if (!road) break
      let walking = ok(applyCommand(state, { type: 'travel', toLocationId: road.to }))
      for (let hour = 0; hour < 72 && walking.journey; hour += 1) {
        walking = ok(applyCommand(walking, { type: 'tick', minutes: 60 }))
      }
      if (walking.journey) break
      if (!next) {
        // Дорога утомляет: перед следующим отрезком высыпаемся.
        const slept = applyCommand(walking, { type: 'sleep' })
        state = slept.ok ? slept.state : walking
        steps += 1
        continue
      }
      expect(knowsPlace(walking, road.to)).toBe(true)
      expect(knownShare(walking)).toBeGreaterThan(knownShare(state))
      return
    }
  })
})

describe('Н2: слухи как источник', () => {
  it('в корчме узнают ближайшую незнакомую землю за кружку и час', () => {
    const rumour = rumourAt(game, game.locationId)
    expect(rumour).not.toBeNull()
    if (!rumour) return
    expect(isKnown(game, rumour.provinceId)).toBe(false)
    const heard = ok(applyCommand(game, { type: 'askAround' }))
    expect(isKnown(heard, rumour.provinceId)).toBe(true)
    expect(heard.time - game.time).toBe(60)
    expect(heard.character.money).toBe(game.character.money - 5)
    expect(heard.log[heard.log.length - 1]?.text).toContain('В корчме слышал')
    // Тот, кто знает всё, слухов не слышит.
    const allKnowing: GameState = {
      ...game,
      knowledge: { provinces: Object.keys(world.provinces) },
    }
    expect(rumourAt(allKnowing, game.locationId)).toBeNull()
  })
})

describe('Н3: карты продаются', () => {
  it('в столице продают карты своей и дальних земель, и карта открывает область', () => {
    const capital = world.kingdoms.reEstiz?.capitalId ?? ''
    const there: GameState = { ...game, locationId: capital, quarter: 'market' }
    const maps = mapsFor(there, capital)
    console.log(
      `карт в столице: ${maps.length}, от ${maps[0]?.price} до ${maps[maps.length - 1]?.price}`,
    )
    expect(maps.length).toBeGreaterThan(5)
    const far = maps.find((map) => !map.regionId.startsWith('reEstiz.'))
    const near = maps.find((map) => map.regionId.startsWith('reEstiz.'))
    if (far && near) expect(far.price / far.fresh).toBeGreaterThan(near.price / near.fresh)
    const map = maps[0]
    if (!map) return
    const bought = ok(applyCommand(there, { type: 'buyMap', regionId: map.regionId }))
    for (const provinceId of world.regions[map.regionId]?.provinceIds ?? []) {
      expect(isKnown(bought, provinceId)).toBe(true)
    }
    expect(bought.character.money).toBe(there.character.money - map.price)
    // Второй раз ту же карту не продадут: знание — товар, а не бумага.
    expect(mapsFor(bought, capital).some((one) => one.regionId === map.regionId)).toBe(false)
    // В деревне карт нет.
    expect(mapsFor(game, game.locationId)).toHaveLength(0)
  })
})

describe('Н4: незнание чего-то стоит', () => {
  it('в незнакомую землю идут дольше', () => {
    const road = roadsFrom(world, game.locationId).find((one) => !knowsPlace(game, one.to))
    const knownRoad = roadsFrom(world, game.locationId).find((one) => knowsPlace(game, one.to))
    if (!road || !knownRoad) return
    const blind = ok(applyCommand(game, { type: 'travel', toLocationId: road.to }))
    const seeing: GameState = {
      ...game,
      knowledge: { provinces: Object.keys(world.provinces) },
    }
    const known = ok(applyCommand(seeing, { type: 'travel', toLocationId: road.to }))
    console.log(`тот же отрезок: зная ${known.journey?.hours} ч, вслепую ${blind.journey?.hours} ч`)
    expect(blind.journey?.hours ?? 0).toBeGreaterThan(known.journey?.hours ?? 0)
    expect(BLIND_SLOW).toBeGreaterThan(1)
  })
})
