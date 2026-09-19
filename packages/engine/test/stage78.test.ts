import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { CORONATION, RECOGNITION, TITLE_DEFS } from '../src/content/titles'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import {
  armsOf,
  claimAgainst,
  claimable,
  coronationPlan,
  hirePrice,
  realmSize,
  recognitionOf,
  serviceDraw,
  styleOf,
  titleOf,
} from '../src/title'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 78: титул и признание.
 *
 * «Вольное владение» было флагом: поставил — и ты сила. Теперь титул растёт от
 * земли, людей и вассалов, а признают его соседи по своим причинам — и от этого
 * зависит, говорят ли с тобой как с равным.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Держава заданного размера: столько мест, сколько попросили. */
function realm(places: number, money = 5000, vassals = 0): GameState {
  const base = createGame(createCharacter({ name: 'Ратша', money }), 1, world)
  const taken = Object.values(settlements)
    .filter((one) => one.population > 900)
    .sort((a, b) => b.population - a.population)
    .slice(0, places)
  const map = { ...settlements }
  for (const one of taken) map[one.locationId] = { ...one, owner: PLAYER }
  const first = taken[0]
  if (!first) throw new Error('нет мест')
  // Вассалы: без них выше графа не поднимаются (этап 78, Т1).
  const sworn = politics.lords.slice(0, vassals).map((lord) => ({ ...lord, kingdomId: PLAYER }))
  const given = taken.slice(0, vassals)
  for (let i = 0; i < sworn.length; i += 1) {
    const place = given[i]
    const lord = sworn[i]
    if (place && lord) map[place.locationId] = { ...map[place.locationId], owner: lord.id } as never
  }
  return {
    ...base,
    politics: {
      ...politics,
      lords: [...sworn, ...politics.lords.slice(vassals)],
    },
    settlements: map,
    locationId: first.locationId,
    quarter: null,
    time: WORLD_START,
    realm: { name: 'Заречье', sinceDay: 1 },
    renown: 30,
    fame: { noble: 50 },
  }
}

describe('Т1 и Т3: титул от земли, герб от рода', () => {
  it('титул растёт вместе с державой, а не с желанием', () => {
    const small = realm(1)
    const middle = realm(6)
    const large = realm(20, 5000, 3)
    for (const state of [small, middle, large]) {
      const size = realmSize(state)
      console.log(
        `мест ${size.places}, людей ${size.people}, вассалов ${size.vassals} → ${TITLE_DEFS[titleOf(state)].label}`,
      )
    }
    expect(titleOf(small)).toBe('freeholder')
    expect(titleOf(middle)).not.toBe('freeholder')
    // Больше земли — выше титул, и без всякой команды.
    const order = ['freeholder', 'baron', 'count', 'duke', 'king']
    expect(order.indexOf(titleOf(large))).toBeGreaterThan(order.indexOf(titleOf(middle)))
    // Без имени на карте титула нет вовсе.
    expect(titleOf({ ...large, realm: null })).toBe('freeholder')
  })

  it('герб один на род и не меняется', () => {
    const state = realm(6)
    const arms = armsOf(state)
    console.log(`${styleOf(state)}: ${arms.words}`)
    expect(armsOf(state).words).toBe(arms.words)
    const other = armsOf({
      ...state,
      character: {
        ...state.character,
        family: { ...state.character.family, house: 'дом Волчьих' },
      },
    })
    expect(other.words).not.toBe(arms.words)
  })
})

describe('Т2: признание', () => {
  it('с большой державой говорят как с равной, с малой — как с самозванцем', () => {
    const small = { ...realm(1), renown: 0, fame: {} }
    const large = realm(20, 5000, 3)
    const kingdomId = Object.keys(world.kingdoms)[0] as string
    const weak = recognitionOf(small, kingdomId, 1)
    const strong = recognitionOf(large, kingdomId, 1)
    console.log(`малая держава: ${weak.value} — ${weak.says}`)
    console.log(`большая держава: ${strong.value} — ${strong.says}`)
    expect(strong.value).toBeGreaterThan(weak.value)
    expect(weak.standing).toBe('pretender')
    expect(strong.standing).not.toBe('pretender')
    // Позор роняет признание: за одним столом с таким сидеть не хотят.
    const shamed = recognitionOf(
      { ...large, shames: [{ id: 'fled', since: 1, covered: 0 }] },
      kingdomId,
      1,
    )
    console.log(`с позором: ${shamed.value}`)
    expect(shamed.value).toBe(strong.value - RECOGNITION.shame)
  })
})

describe('Т4: коронация', () => {
  it('венчают доросшего, и видно, кто приехал', () => {
    const small = realm(2)
    expect(coronationPlan(small, 1).can).toBe(false)
    const large = realm(20, 20000, 3)
    const plan = coronationPlan(large, 1)
    console.log(
      `венчание: ${plan.cost} серебром, приедут ${plan.guests.length}, не приедут ${plan.absent.length}`,
    )
    expect(plan.can).toBe(true)
    expect(plan.cost).toBe(CORONATION.rite + plan.guests.length * CORONATION.perGuest)

    const crowned = ok(applyCommand(large, { type: 'crownSelf' }))
    console.log(
      `после венчания: ${crowned.crowned?.guests.length} гостей, титул ${crowned.crowned?.titleId}`,
    )
    expect(crowned.crowned).not.toBeNull()
    expect(crowned.crowned?.guests).toEqual(plan.guests)
    // Обряд идёт пять суток, и за эти сутки держава живёт своей жизнью:
    // проверяется не остаток в казне, а то, что за венчание заплачено.
    expect(crowned.log.some((entry) => entry.text.startsWith('Венчание'))).toBe(true)
    // Венчанного признают охотнее: это и есть смысл обряда.
    const kingdomId = Object.keys(world.kingdoms)[0] as string
    expect(recognitionOf(crowned, kingdomId, 1).value).toBeGreaterThan(
      recognitionOf(large, kingdomId, 1).value,
    )
    // Второй раз не венчают.
    expect(applyCommand(crowned, { type: 'crownSelf' }).ok).toBe(false)
  })
})

describe('Т5 и Т6: право на землю и слава государя', () => {
  it('право заявляют на соседнюю землю и ссылаются на него, объявляя войну', () => {
    const state = realm(12, 5000, 2)
    const can = claimable(state)
    console.log(`можно заявить право на ${can.length} провинций`)
    if (can.length === 0) return
    const claim = can[0] as (typeof can)[number]
    const pressed = ok(
      applyCommand(state, {
        type: 'pressClaim',
        provinceId: claim.provinceId,
        against: claim.against,
      }),
    )
    console.log(
      `право на ${world.provinces[claim.provinceId]?.name} против ${world.kingdoms[claim.against]?.name}`,
    )
    expect(claimAgainst(pressed, claim.against)).not.toBeNull()
    const war = ok(applyCommand(pressed, { type: 'declareWar', kingdomId: claim.against }))
    const declared = war.politics.wars.find(
      (one) =>
        (one.a === PLAYER && one.b === claim.against) ||
        (one.b === PLAYER && one.a === claim.against),
    )
    console.log(`повод войны: ${declared?.casus?.kind} (${declared?.reason})`)
    expect(declared?.casus?.kind).toBe(claim.kind)
    expect(declared?.casus?.provinceId).toBe(claim.provinceId)
  })

  it('за кем имя, к тому идут дешевле', () => {
    const plain = realm(6)
    const famous: GameState = { ...plain, fame: { noble: 90, warriors: 80 } }
    const shamed: GameState = {
      ...famous,
      shames: [
        { id: 'fled', since: 1, covered: 0 },
        { id: 'broke', since: 1, covered: 0 },
      ],
    }
    console.log(
      `наём: безымянному ×${hirePrice(plain).toFixed(2)}, славному ×${hirePrice(famous).toFixed(2)}, опозоренному ×${hirePrice(shamed).toFixed(2)}`,
    )
    expect(hirePrice(famous)).toBeLessThan(hirePrice(plain))
    expect(serviceDraw(shamed)).toBeLessThan(serviceDraw(famous))
  })
})
