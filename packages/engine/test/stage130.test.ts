import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { WAYS, WAY_DEFS } from '../src/content/way'
import { type Settlement, createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import {
  bothWays,
  measureFor,
  nearestWay,
  recognisedBySides,
  recognises,
  wayOf,
  waySays,
  waysOf,
} from '../src/way'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 130: путь как состояние мира.
 *
 * Цель этапа 70 была личной и отмечалась галочками. Путь — другое: он называет,
 * чем кончится мир, если по нему дойти, и потому меряется состоянием мира. Одна
 * мерка на всех: корона считается тем же кодом, что игрок.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const day = 400

/** Государь с землёй: сколько мест дадим, столько и будет считаться. */
function ruler(places: number, extra: Partial<GameState> = {}): GameState {
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, places)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...createGame(createCharacter({ name: 'Ратша', money: 20000 }), 1, world),
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? '',
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: places > 0 ? { name: 'Заречье', sinceDay: 1 } : null,
    ...extra,
  }
}

describe('Пт1 и Пт2: путь считается из состояния, и для всякого', () => {
  it('одна мерка на всех: игрок и корона считаются тем же кодом', () => {
    const state = ruler(6)
    const mine = wayOf(state, world, PLAYER, 'crown', day)
    console.log(`игрок: ${mine.says}`)
    const theirs = wayOf(state, world, kingdoms[1] as string, 'crown', day)
    console.log(`${world.kingdoms[kingdoms[1] as string]?.name}: ${theirs.says}`)
    expect(mine.of).toBe(theirs.of)
    expect(mine.who).toBe(PLAYER)

    // Корона стоит на карте с первого дня, поэтому по землям она впереди.
    console.log(
      `мест у игрока ${measureFor(state, world, PLAYER, 'places', day)}, у короны ${measureFor(state, world, kingdoms[1] as string, 'places', day)}`,
    )
    expect(measureFor(state, world, kingdoms[1] as string, 'places', day)).toBeGreaterThan(
      measureFor(state, world, PLAYER, 'places', day),
    )
  })

  it('ни одной новой величины: всё берётся из состояния', () => {
    const poor = ruler(0)
    const rich = ruler(14, {
      crowned: { day: day - 100, where: '', guests: [] } as never,
      enterprises: [{ id: 'e1', kind: 'caravan' } as never, { id: 'e2', kind: 'inn' } as never],
      artifacts: [{ id: 'a1' } as never],
      piety: 70,
    })
    for (const measure of [
      'realm',
      'places',
      'crowned',
      'ventures',
      'artifacts',
      'piety',
    ] as const) {
      console.log(
        `${measure}: у безземельного ${measureFor(poor, world, PLAYER, measure, day)}, у государя ${measureFor(rich, world, PLAYER, measure, day)}`,
      )
      expect(measureFor(rich, world, PLAYER, measure, day)).toBeGreaterThanOrEqual(
        measureFor(poor, world, PLAYER, measure, day),
      )
    }
  })
})

describe('Пт3: остаток назван словами', () => {
  it('не «60 из 100», а кто именно не признал', () => {
    const state = ruler(10)
    const crown = wayOf(state, world, PLAYER, 'crown', day)
    for (const one of crown.left) console.log(one)
    const recognition = crown.left.find((one) => one.startsWith('не признали'))
    expect(recognition).toBeDefined()

    const sides = recognisedBySides(state, world, PLAYER, day)
    console.log(
      `признали ${sides.yes.length}, не признали ${sides.no.length} из ${kingdoms.length}`,
    )
    expect(sides.yes.length + sides.no.length).toBe(kingdoms.length)

    // Данник признаёт всегда, воюющий — никогда.
    const foe = kingdoms[1] as string
    const warring: GameState = {
      ...state,
      politics: {
        ...state.politics,
        wars: [{ a: PLAYER, b: foe, since: day - 10, reason: 'марка' }],
      },
    }
    const paying: GameState = {
      ...state,
      politics: {
        ...state.politics,
        tributes: [{ from: foe, to: PLAYER, perDay: 6, sinceDay: day - 50 } as never],
      },
    }
    console.log(
      `${world.kingdoms[foe]?.name}: в войне признаёт ${recognises(warring, world, PLAYER, foe, day)}, данником — ${recognises(paying, world, PLAYER, foe, day)}`,
    )
    expect(recognises(warring, world, PLAYER, foe, day)).toBe(false)
    expect(recognises(paying, world, PLAYER, foe, day)).toBe(true)
  })
})

describe('Пт4: цена пути', () => {
  it('у каждого пути свой расход, и он назван', () => {
    for (const id of WAYS) {
      console.log(waySays(WAY_DEFS[id]))
      expect(WAY_DEFS[id].costs.length).toBeGreaterThan(10)
      expect(WAY_DEFS[id].ends.length).toBeGreaterThan(3)
    }
    // Путь силы коронам закрыт: архимагом корона не бывает.
    expect(WAY_DEFS.might.forCrowns).toBe(false)
    const crownWays = waysOf(ruler(6), world, kingdoms[1] as string, day)
    console.log(`короне открыто путей: ${crownWays.length} из ${WAYS.length}`)
    expect(crownWays).toHaveLength(WAYS.length - 1)
  })
})

describe('Пт5: два пути разом', () => {
  it('видно, чем один мешает другому', () => {
    const state = ruler(8)
    const close = bothWays(state, world, PLAYER, 'crown', 'faith', day)
    const far = bothWays(state, world, PLAYER, 'trade', 'might', day)
    console.log(close.says)
    console.log(far.says)
    expect(close.shared.length).toBeGreaterThan(0)
    expect(far.slower).toBeGreaterThanOrEqual(close.slower)
  })
})

describe('Пт6: пути в числах', () => {
  it('видно, насколько далеко каждый путь у одного и того же государя', () => {
    const state = ruler(12, {
      crowned: { day: day - 100, where: '', guests: [] } as never,
      character: {
        ...createCharacter({ name: 'Ратша', money: 150000 }),
      },
      enterprises: [
        { id: 'e1' } as never,
        { id: 'e2' } as never,
        { id: 'e3' } as never,
        { id: 'e4' } as never,
      ],
      piety: 65,
    })
    for (const one of waysOf(state, world, PLAYER, day)) {
      console.log(
        `${WAY_DEFS[one.way].label}: ${one.done} из ${one.of} (${Math.round(one.share * 100)} из ста)`,
      )
    }
    const nearest = nearestWay(state, world, PLAYER, day)
    console.log(`ближе всего: ${nearest ? WAY_DEFS[nearest.way].label : 'ни одного'}`)
    expect(nearest).not.toBeNull()

    // У того, кто ничего не начал, пути нет вовсе — и это честный ответ.
    const nobody = ruler(0)
    console.log(
      `у безземельного ближайший путь: ${nearestWay(nobody, world, PLAYER, day) ? 'есть' : 'нет'}`,
    )
    expect(nearestWay(nobody, world, PLAYER, day)).toBeNull()

    // Ни один путь не пройден сам собой: конец надо брать.
    expect(waysOf(state, world, PLAYER, day).every((one) => !one.finished)).toBe(true)
  })
})
