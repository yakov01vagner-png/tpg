import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { ACCORD_DEFS, MEDIATOR_DEFS, PEACE } from '../src/content/peace'
import { PLAYER } from '../src/holding'
import {
  asksOf,
  grievanceFrom,
  grievancesOf,
  grudgeRipe,
  harshness,
  mediatorsFor,
  offerWeight,
  peaceChronicle,
  peacesOf,
  shameOf,
  talksOf,
  warToll,
} from '../src/peace'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 88: мир и его цена.
 *
 * Мир был броском: кубик решал, не пора ли, а условия выводились из повода.
 * Здесь у мира появляется счёт — во что война встала обеим сторонам, — торг,
 * посредник со своей ценой и память: тяжёлый мир сам становится поводом.
 */

const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const foe = Object.keys(world.kingdoms)[1] as string

function warring(days = 400): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world)
  const taken = Object.values(game.settlements)
    .filter((one) => one.population > 800)
    .slice(0, 6)
  const places = { ...game.settlements }
  for (const one of taken) places[one.locationId] = { ...one, owner: PLAYER }
  const first = taken[0]
  return {
    ...game,
    time: WORLD_START + days * 24 * 60,
    locationId: first?.locationId ?? game.locationId,
    quarter: null,
    settlements: places,
    realm: { name: 'Заречье', sinceDay: 1 },
    politics: {
      ...game.politics,
      wars: [
        {
          a: PLAYER,
          b: foe,
          since: 1,
          reason: 'спорная марка',
          casus: { kind: 'march', provinceId: 'x' },
        },
      ],
    },
  }
}

describe('М2: цена войны', () => {
  it('обе стороны считают одно и то же число', () => {
    const state = warring()
    const war = state.politics.wars[0]
    if (!war) return
    const day = Math.floor((state.time - WORLD_START) / (24 * 60)) + 1
    const ours = warToll(state, world, PLAYER, war, day)
    const theirs = warToll(state, world, foe, war, day)
    console.log(ours.says)
    console.log(theirs.says)
    expect(ours.days).toBeGreaterThan(300)
    expect(ours.cost).toBeGreaterThanOrEqual(0)
    expect(theirs.cost).toBeGreaterThanOrEqual(0)
    // Год войны стоит своего: та же война через год дороже.
    const later = warToll(state, world, PLAYER, war, day + 365)
    console.log(`через год: счёт ${ours.cost} → ${later.cost} (год войны ${PEACE.yearCost})`)
    expect(later.cost).toBeGreaterThan(ours.cost)
  })
})

describe('М1 и М3: переговоры и сложные условия', () => {
  it('за столом видно, чего просят, и условий бывает несколько', () => {
    const state = warring()
    const day = Math.floor((state.time - WORLD_START) / (24 * 60)) + 1
    const asks = asksOf(state, world, foe, day)
    console.log(
      `просят: ${asks.map((one) => `${ACCORD_DEFS[one].label} (вес ${ACCORD_DEFS[one].weight}, обида ${ACCORD_DEFS[one].shame})`).join(', ') || 'ничего'}`,
    )
    const opened = ok(applyCommand(state, { type: 'openTalks', against: foe }))
    console.log(opened.log[opened.log.length - 1]?.text ?? '')
    expect(talksOf(opened)?.against).toBe(foe)
    // Дважды стол не накрывают.
    expect(applyCommand(opened, { type: 'openTalks', against: foe }).ok).toBe(false)

    const light = offerWeight(opened, world, foe, ['trade'], day)
    const heavy = offerWeight(opened, world, foe, ['land', 'tribute', 'apology'], day)
    console.log(
      `«торговые пути» — ${Math.round(light * 100)} из ста; «земля, дань, признание вины» (вес ${harshness(['land', 'tribute', 'apology'])}, обида ${shameOf(['land', 'tribute', 'apology'])}) — ${Math.round(heavy * 100)} из ста`,
    )
    expect(light).toBeGreaterThan(heavy)
  })

  it('мир кладёт войну в летопись, а дань — в состояние', () => {
    const state = warring()
    const opened = ok(applyCommand(state, { type: 'openTalks', against: foe }))
    let run = opened
    let made = false
    for (let i = 0; i < 12 && !made; i += 1) {
      const result = applyCommand(run, { type: 'tableTerms', terms: ['trade'] })
      if (!result.ok) break
      run = result.state
      made = peacesOf(run).length > 0
      if (!talksOf(run) && !made) {
        run = ok(applyCommand(run, { type: 'openTalks', against: foe }))
      }
    }
    const record = peacesOf(run)[0]
    console.log(
      `мир: ${record ? `${record.terms.join(', ')}, вес ${record.harshness}, уступил ${record.yielded}` : 'не заключён'}; войн осталось ${run.politics.wars.length}`,
    )
    expect(made).toBe(true)
    expect(run.politics.wars).toHaveLength(0)
  })
})

describe('М4: посредники', () => {
  it('посредник берёт своё и делает разговор легче', () => {
    const state = warring()
    const day = Math.floor((state.time - WORLD_START) / (24 * 60)) + 1
    const offers = mediatorsFor(state, world, foe, day)
    for (const offer of offers) {
      console.log(
        `${offer.name}: берёт ${offer.fee} (${offer.takes}), разговор легче на ${Math.round(offer.ease * 100)} из ста`,
      )
    }
    expect(offers.length).toBeGreaterThan(1)
    const church = offers.find((one) => one.kind === 'church')
    if (!church) return
    const plain = ok(applyCommand(state, { type: 'openTalks', against: foe }))
    const mediated = ok(
      applyCommand(state, { type: 'openTalks', against: foe, mediator: 'church' }),
    )
    const terms: readonly ('land' | 'tribute')[] = ['tribute']
    const without = offerWeight(plain, world, foe, terms, day)
    const with_ = offerWeight(mediated, world, foe, terms, day)
    console.log(
      `«дань» без посредника — ${Math.round(without * 100)} из ста, с церковью — ${Math.round(with_ * 100)}; заплачено ${state.character.money - mediated.character.money}`,
    )
    expect(with_).toBeGreaterThan(without)
    expect(mediated.character.money).toBe(state.character.money - church.fee)
  })
})

describe('М5: плохой мир', () => {
  it('тяжёлые условия оставляют обиду, и обида становится войной', () => {
    const light = grievanceFrom(
      {
        against: foe,
        day: 10,
        terms: ['trade'],
        mediator: null,
        harshness: harshness(['trade']),
        yielded: foe,
      },
      10,
    )
    const heavy = grievanceFrom(
      {
        against: foe,
        day: 10,
        terms: ['land', 'tribute', 'apology'],
        mediator: null,
        harshness: harshness(['land', 'tribute', 'apology']),
        yielded: foe,
      },
      10,
    )
    console.log(
      `лёгкий мир (вес ${harshness(['trade'])}): обиды ${light ? 'есть' : 'нет'}; тяжёлый (вес ${harshness(['land', 'tribute', 'apology'])}, черта ${PEACE.harshLine}): обида ${heavy?.weight}`,
    )
    expect(light).toBe(null)
    expect(heavy).toBeTruthy()
    if (!heavy) return
    expect(grudgeRipe(heavy, 10 + PEACE.grudgeDays - 1)).toBe(false)
    expect(grudgeRipe(heavy, 10 + PEACE.grudgeDays)).toBe(true)
  })

  it('созревшая обида объявляет войну сама', () => {
    const state = warring()
    const day = Math.floor((state.time - WORLD_START) / (24 * 60)) + 1
    const peaceful: GameState = {
      ...state,
      politics: { ...state.politics, wars: [] },
      grievances: [{ who: foe, against: PLAYER, sinceDay: day - PEACE.grudgeDays, weight: 0.3 }],
      peaces: [
        {
          against: foe,
          day: day - PEACE.grudgeDays,
          terms: ['land', 'tribute', 'apology'],
          mediator: null,
          harshness: 8,
          yielded: foe,
        },
      ],
    }
    const after = ok(
      applyCommand(ok(applyCommand(peaceful, { type: 'rest', hours: 12 })), {
        type: 'rest',
        hours: 12,
      }),
    )
    console.log(
      `${after.log.find((one) => one.text.includes('вспомнил'))?.text ?? 'обида ещё зреет'}; войн ${after.politics.wars.length}, обид ${grievancesOf(after).length}`,
    )
    expect(after.politics.wars.length).toBeGreaterThan(0)
    expect(grievancesOf(after)).toHaveLength(0)
    expect(peacesOf(after)[0]?.brokenDay).toBeTruthy()
  })
})

describe('М6: миры в летописи', () => {
  it('летопись знает, какие миры держались', () => {
    const state = warring()
    const day = 2000
    const withPeaces: GameState = {
      ...state,
      peaces: [
        {
          against: foe,
          day: 10,
          terms: ['trade'],
          mediator: 'church',
          harshness: 0.5,
          yielded: foe,
        },
        {
          against: foe,
          day: 100,
          terms: ['land', 'tribute', 'apology'],
          mediator: null,
          harshness: 8,
          yielded: foe,
          brokenDay: 700,
        },
      ],
    }
    const chronicle = peaceChronicle(withPeaces, day)
    console.log(chronicle.says)
    expect(chronicle.made).toBe(2)
    expect(chronicle.held).toBe(1)
    expect(chronicle.broken).toBe(1)
    expect(chronicle.forced).toBe(1)
    expect(MEDIATOR_DEFS.church.cut).toBeLessThan(MEDIATOR_DEFS.crown.cut)
  })
})
