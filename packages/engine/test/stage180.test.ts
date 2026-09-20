import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { MISHAP_DEFS, YEARLAND } from '../src/content/yearland'
import { type Settlement, createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START, dayOfYear } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import {
  landSays,
  mishapsAt,
  riversFrozen,
  yearKind,
  yearRoll,
  yearRules,
  yearSays,
} from '../src/yearland'

/**
 * Этап 180: год, погода и земля.
 *
 * Времена года меняли урожай и скорость дороги — процентами. Год был штрафом, а
 * не временем: он ничего не разрешал и ничего не запрещал. Здесь он меняет
 * правила.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

function ruler(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 9000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, 4)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    politics,
    settlements: map,
    time: WORLD_START,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
  }
}

describe('Гд1 и Гд2: год виден, и погода меняет правило', () => {
  it('зимой реки встают, весной броды под водой — и то и другое правило, а не процент', () => {
    // Зима считается по календарю игры, а не по числам: год здесь начинается
    // весной (`time.ts`), и зима приходится на конец.
    console.log(`реки стоят: зимой ${riversFrozen(340)}, летом ${riversFrozen(150)}`)
    expect(riversFrozen(340)).toBe(true)
    expect(riversFrozen(150)).toBe(false)
    const state = ruler()
    for (const day of [10, 100, 200, 340]) {
      const rules = yearRules(state, world, day)
      console.log(`день ${dayOfYear(day)}: ${rules.map((one) => one.says).join(' ')}`)
      expect(rules.length).toBeGreaterThan(0)
    }
  })
})

describe('Гд3 и Гд4: земля устаёт, бедствие приходит из причин', () => {
  it('усталость земли видна словами и числом', () => {
    const state = ruler()
    const place = Object.values(state.settlements).find((one) => one.owner === PLAYER) as Settlement
    console.log(landSays(place))
    console.log(landSays({ ...place, strain: 0.7 }))
    expect(landSays({ ...place, strain: 0.7 })).toContain('устала')
    expect(YEARLAND.tiredAt).toBeLessThan(1)
  })

  it('бедствие выводится из того, что сошлось, а не из броска', () => {
    const state = ruler()
    const place = Object.values(state.settlements).find((one) => one.owner === PLAYER) as Settlement
    const dry: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [place.locationId]: { ...place, harvest: 1.2, population: 4000 },
      },
    }
    const summer = mishapsAt(dry, world, place.locationId, 200)
    for (const one of summer) console.log(`${one.says} (${Math.round(one.risk * 100)} из ста)`)
    expect(summer.some((one) => one.what === 'fire')).toBe(true)
    const wet: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [place.locationId]: { ...place, harvest: 0.7, population: 4000 },
      },
    }
    const murrain = mishapsAt(wet, world, place.locationId, 200)
    for (const one of murrain) console.log(one.says)
    expect(murrain.some((one) => one.what === 'murrain')).toBe(true)
    // Из одного состояния — то же бедствие: это не кубик.
    expect(mishapsAt(dry, world, place.locationId, 200).length).toBe(summer.length)
    expect(MISHAP_DEFS.fire.from.length).toBeGreaterThan(10)
  })
})

describe('Гд5 и Гд6: год словами и в числах', () => {
  it('год называется словами, а не процентом', () => {
    const state = ruler()
    const mine = Object.values(state.settlements).filter((one) => one.owner === PLAYER)
    const lean: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        ...Object.fromEntries(mine.map((one) => [one.locationId, { ...one, harvest: 0.6 }])),
      },
    }
    console.log(yearSays(state, world, 250))
    console.log(yearSays(lean, world, 250))
    expect(yearSays(lean, world, 250)).toContain('не убрали')
    expect(yearKind({ ...(mine[0] as Settlement), harvest: 0.6 })).toBe('lean')
    expect(yearKind({ ...(mine[0] as Settlement), harvest: 1.2 })).toBe('fat')
  })

  it('год в числах по всему миру', () => {
    const state = ruler()
    const rolled = yearRoll(state, world, 200)
    console.log(rolled.says)
    expect(rolled.places).toBeGreaterThan(50)
    expect(rolled.lean + rolled.fat).toBeLessThanOrEqual(rolled.places)
  })
})
