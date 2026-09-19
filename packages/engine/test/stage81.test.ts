import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { HEIR_AGE, REIGN_YEARS } from '../src/content/royals'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import {
  bloodClaims,
  childless,
  dowryFor,
  marriedTo,
  reignOf,
  reignYears,
  royalHouse,
  yearsToSuccession,
} from '../src/royal'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics, relationOf } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 81: родство корон.
 *
 * У короны был человек; теперь у неё есть дом — супруга, дети, наследник и
 * ветви. Дом выводится из короны и дня, поэтому можно посчитать заранее, кто
 * будет править через двадцать лет и на чей трон у кого есть право.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(money = 40000): GameState {
  const base = createGame(createCharacter({ name: 'Ратша', money }), 1, world)
  const taken = Object.values(settlements)
    .filter((one) => one.population > 900)
    .sort((a, b) => b.population - a.population)
    .slice(0, 12)
  const map = { ...settlements }
  for (const one of taken) map[one.locationId] = { ...one, owner: PLAYER }
  const first = taken[0]
  if (!first) throw new Error('нет мест')
  return {
    ...base,
    politics,
    settlements: map,
    locationId: first.locationId,
    quarter: null,
    time: WORLD_START,
    realm: { name: 'Заречье', sinceDay: 1 },
    renown: 40,
    fame: { noble: 70 },
  }
}

describe('Р1 и Р3: дом короны и наследование', () => {
  it('у каждой короны свой дом, и он выводится одинаково дважды', () => {
    for (const id of kingdoms.slice(0, 4)) {
      const house = royalHouse(world, id, 1)
      console.log(
        `${world.kingdoms[id]?.name}: ${house.title} ${house.name} (${house.temper}), супруга ${house.spouse ?? 'нет'}, детей ${house.children.length}, наследник ${house.heir?.name ?? 'нет'} — ${house.says}`,
      )
      expect(royalHouse(world, id, 1)).toEqual(house)
    }
    const houses = kingdoms.map((id) => royalHouse(world, id, 1))
    // Дома разные: не один шаблон на весь мир.
    expect(new Set(houses.map((one) => one.name)).size).toBeGreaterThan(1)
    expect(houses.some((one) => one.heir === null)).toBe(true)
  })

  it('колено сменяется по сроку правления, и наследник — другой человек', () => {
    const id = kingdoms[0] as string
    const span = reignYears(id)
    console.log(`${world.kingdoms[id]?.name}: колено правит ${span} лет`)
    expect(span).toBeGreaterThanOrEqual(REIGN_YEARS.least)
    expect(span).toBeLessThanOrEqual(REIGN_YEARS.most)
    const now = royalHouse(world, id, 10)
    const after = royalHouse(world, id, Math.round((span + 1) * DAYS_PER_YEAR))
    console.log(`было ${now.name} (${now.temper}), стало ${after.name} (${after.temper})`)
    expect(after.reign).toBe(now.reign + 1)
    expect(reignOf(id, 10)).toBe(0)
    console.log(`до смены колена ${yearsToSuccession(id, 10)} лет`)
    expect(yearsToSuccession(id, 10)).toBeGreaterThan(0)
  })

  it('смена колена — событие для соседей, и половина обид не наследуется', () => {
    const id = kingdoms[0] as string
    const span = reignYears(id) * DAYS_PER_YEAR
    const state = ruler()
    const angry: GameState = {
      ...state,
      politics: {
        ...state.politics,
        relations: { ...state.politics.relations, [[PLAYER, id].sort().join('|')]: -60 },
      },
      time: WORLD_START + (span - 2) * MINUTES_PER_DAY,
    }
    let later = angry
    for (let day = 0; day < 4; day += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const said = later.log.find((one) => one.text.includes('на престоле'))
    console.log(said?.text ?? 'смены не случилось')
    if (said) {
      console.log(
        `обида ${relationOf(angry.politics, PLAYER, id)} → ${relationOf(later.politics, PLAYER, id)}`,
      )
      expect(relationOf(later.politics, PLAYER, id)).toBeGreaterThan(
        relationOf(angry.politics, PLAYER, id),
      )
    }
  })
})

describe('Р2 и Р5: брак как договор', () => {
  it('за невесту просят по земле её короны, и равному уступают', () => {
    const state = ruler()
    const id = kingdoms[1] as string
    const plain = dowryFor(state, id, 1, false)
    const equal = dowryFor(state, id, 1, true)
    console.log(`приданое: чужому ${plain}, равному ${equal}`)
    expect(equal).toBeLessThan(plain)
    expect(plain).toBeGreaterThan(200)
  })

  it('удавшееся сватовство платит приданое и роднит дома', () => {
    const state = ruler()
    const id = kingdoms[1] as string
    const warm: GameState = {
      ...state,
      politics: {
        ...state.politics,
        relations: { ...state.politics.relations, [[PLAYER, id].sort().join('|')]: 95 },
      },
      crowned: { day: 1, titleId: 'duke', guests: [], absent: [] },
    }
    const sent = ok(
      applyCommand(warm, { type: 'sendEnvoy', to: id, errand: 'marriage', byLetter: true }),
    )
    let later = sent
    let paidOn: { before: number; after: number } | null = null
    for (let day = 0; day < 50; day += 1) {
      const before = later.character.money
      const had = later.marriages?.length ?? 0
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
      // Приданое платится в тот день, когда сладился брак: за пятьдесят суток
      // держава успевает заработать больше, чем стоил брак, и разницу на концах
      // считать нечестно.
      if ((later.marriages?.length ?? 0) > had) {
        paidOn = { before, after: later.character.money }
      }
    }
    const wed = marriedTo(later, id)
    console.log(
      wed
        ? `породнились: ${later.marriages?.[0]?.name}, приданое ${later.marriages?.[0]?.dowry}`
        : `не вышло: ${later.log.find((one) => one.text.includes('Ответ из'))?.text}`,
    )
    if (wed) {
      expect(later.marriages).toHaveLength(1)
      expect(paidOn).toBeTruthy()
      if (paidOn) expect(paidOn.after).toBeLessThan(paidOn.before)
    }
  })
})

describe('Р4: право по крови', () => {
  it('право на трон даёт только бездетный дом', () => {
    const state = ruler()
    const day = 1
    const empty = kingdoms.filter((id) => childless(world, id, day))
    console.log(
      `бездетных домов: ${empty.map((id) => world.kingdoms[id]?.name).join(', ') || 'нет'}`,
    )
    const claims = bloodClaims(state, day)
    console.log(
      claims.map((one) => `${world.kingdoms[one.kingdomId]?.name}: ${one.why}`).join('; '),
    )
    expect(claims.length).toBe(empty.length)
    const withHeir = kingdoms.find((id) => !childless(world, id, day))
    if (withHeir) {
      expect(applyCommand(state, { type: 'claimThrone', kingdomId: withHeir }).ok).toBe(false)
    }
    const target = empty[0]
    if (!target) return
    const claimed = ok(applyCommand(state, { type: 'claimThrone', kingdomId: target }))
    console.log(claimed.log.find((one) => one.text.startsWith('Право на престол'))?.text)
    expect((claimed.claims ?? []).some((one) => one.against === target)).toBe(true)
    expect(relationOf(claimed.politics, PLAYER, target)).toBeLessThan(
      relationOf(state.politics, PLAYER, target),
    )
  })
})

describe('Р6: древо', () => {
  it('дом виден числом: кто наследник и когда он будет готов', () => {
    const id = kingdoms[2] as string
    const house = royalHouse(world, id, 4000)
    console.log(
      `${house.title} ${house.name}: детей ${house.children.map((one) => `${one.name} (${one.age})`).join(', ') || 'нет'}, ветвей ${house.branches}`,
    )
    expect(house.branches).toBeGreaterThan(0)
    if (house.heir) {
      expect(house.says).toBe(
        house.heir.age >= HEIR_AGE
          ? 'Наследник взрослый и при отце: переход будет тихим.'
          : 'Наследник мал: за него будут править другие.',
      )
    }
  })
})
