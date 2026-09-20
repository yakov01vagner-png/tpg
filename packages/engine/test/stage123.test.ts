import { describe, expect, it } from 'vitest'
import { behestPlan } from '../src/behest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import type { Settlement } from '../src/economy'
import { visibleTo } from '../src/fog'
import { fortOf } from '../src/fort'
import { PLAYER } from '../src/holding'
import { knownTo } from '../src/known'
import { offerWeight } from '../src/peace'
import { createRng } from '../src/rng'
import {
  foolsGuest,
  looksQuicker,
  noticesClash,
  obeysBetter,
  ordersRideFaster,
  persuadesAt,
  readsLetters,
  siegeHolds,
  skillDoes,
  survivalReach,
  wallsBetter,
} from '../src/sheet'
import { lookCost } from '../src/sight'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 123: навыки власти и знания.
 *
 * Шесть строк листа, которые в 0.7 значили мало, получают дела в механиках
 * 0.8: приказ (108), отчёты (100), дозор (110), стол мира (88), свои стены
 * (85 и 113) и гонцы (111).
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const foe = kingdoms[1] as string
const day = 400

function hero(skills: Record<string, number> = {}) {
  return createCharacter({ name: 'Ратша', money: 40000, skills: skills as never })
}

function ruler(skills: Record<string, number> = {}): { state: GameState; mine: readonly string[] } {
  const game = createGame(hero(skills), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 900)
    .slice(0, 5)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    state: {
      ...game,
      politics,
      settlements: map,
      locationId: mine[0]?.locationId ?? game.locationId,
      quarter: null,
      time: WORLD_START + (day - 1) * 24 * 60,
      realm: { name: 'Заречье', sinceDay: 1 },
      party: { ...game.party, units: { militia: 100 }, morale: 70 },
    },
    mine: mine.map((one) => one.locationId),
  }
}

describe('Н1: командование', () => {
  it('приказ исполняют точнее и гонец едет быстрее', () => {
    const green = hero()
    const veteran = hero({ command: 70 })
    console.log(`командование 0: ${skillDoes(green, 'command').join('; ')}`)
    console.log(`командование 70: ${skillDoes(veteran, 'command').join('; ')}`)
    expect(obeysBetter(veteran)).toBeGreaterThan(obeysBetter(green))

    const { state, mine } = ruler({ command: 70 })
    const far = mine[4] as string
    const slow = behestPlan(world, state.locationId, far, 'collect', day, 1)
    const fast = behestPlan(world, state.locationId, far, 'collect', day, ordersRideFaster(veteran))
    console.log(
      `приказ в ${world.locations[far]?.name}: у неумелого отчёт к ${slow.backDay - day}-м суткам, у умелого к ${fast.backDay - day}-м`,
    )
    expect(fast.backDay).toBeLessThan(slow.backDay)
  })
})

describe('Н2: учёность', () => {
  it('приписка наместника меньше, а расхождение вестей видно раньше', () => {
    const green = hero()
    const learned = hero({ scholarship: 60 })
    console.log(`учёность 0: ${skillDoes(green, 'scholarship').join('; ')}`)
    console.log(`учёность 60: ${skillDoes(learned, 'scholarship').join('; ')}`)
    expect(readsLetters(learned)).toBeLessThan(readsLetters(green))
    expect(noticesClash(learned, 0.25)).toBeLessThan(noticesClash(green, 0.25))

    // И это видно в игре: два расходящихся донесения.
    const words = [
      {
        id: 'w1',
        to: PLAYER,
        kind: 'strength' as const,
        about: foe,
        value: 1000,
        source: 'own' as const,
        from: 'наместник',
        day: day - 2,
      },
      {
        id: 'w2',
        to: PLAYER,
        kind: 'strength' as const,
        about: foe,
        value: 1180,
        source: 'own' as const,
        from: 'посол',
        day: day - 3,
      },
    ]
    const dull = { ...ruler().state, words }
    const sharp = { ...ruler({ scholarship: 60 }).state, words }
    const dullSees = knownTo(dull, world, PLAYER, { kind: 'strength', about: foe }, day)
    const sharpSees = knownTo(sharp, world, PLAYER, { kind: 'strength', about: foe }, day)
    console.log(
      `1000 против 1180: неучёный ${dullSees.clash ? 'видит расхождение' : 'не видит'}, учёный ${sharpSees.clash ? 'видит' : 'не видит'}`,
    )
    expect(sharpSees.clash).toBe(true)
    expect(dullSees.clash).toBe(false)
  })
})

describe('Н3: выживание', () => {
  it('дозор видит дальше, и посмотреть выходит быстрее', () => {
    const green = hero()
    const woodsman = hero({ survival: 60 })
    console.log(`выживание 0: ${skillDoes(green, 'survival').join('; ')}`)
    console.log(`выживание 60: ${skillDoes(woodsman, 'survival').join('; ')}`)
    expect(survivalReach(woodsman)).toBeGreaterThan(survivalReach(green))

    const { state, mine } = ruler({ survival: 60 })
    const plain = ruler().state
    const far = mine[3] as string
    console.log(
      `посмотреть в ${world.locations[far]?.name}: неумелому ${lookCost(world, plain.locationId, far, looksQuicker(plain.character)).days} сут., умелому ${lookCost(world, state.locationId, far, looksQuicker(state.character)).days}`,
    )
    expect(
      lookCost(world, state.locationId, far, looksQuicker(state.character)).days,
    ).toBeLessThanOrEqual(
      lookCost(world, plain.locationId, far, looksQuicker(plain.character)).days,
    )

    // И дозор его берёт больше мест.
    const { state: withHost } = ruler({ survival: 60, riding: 60 })
    const formed = applyCommand(withHost, { type: 'formHost', troop: 'militia', count: 40 })
    if (!formed.ok) return
    const host = formed.state.bands.find((one) => one.lordId === PLAYER)
    if (!host) return
    const scouting = applyCommand(formed.state, {
      type: 'setRole',
      hostId: host.id,
      role: 'scout',
    })
    if (!scouting.ok) return
    const wide = visibleTo(scouting.state, world, PLAYER).size
    // Тот же дозор у неумелого берёт меньше округи.
    const plainFormed = applyCommand(ruler().state, {
      type: 'formHost',
      troop: 'militia',
      count: 40,
    })
    if (!plainFormed.ok) return
    const plainHost = plainFormed.state.bands.find((one) => one.lordId === PLAYER)
    if (!plainHost) return
    const plainScout = applyCommand(plainFormed.state, {
      type: 'setRole',
      hostId: plainHost.id,
      role: 'scout',
    })
    if (!plainScout.ok) return
    const narrow = visibleTo(plainScout.state, world, PLAYER).size
    console.log(`дозор умелого видит ${wide} мест, дозор неумелого — ${narrow}`)
    expect(wide).toBeGreaterThan(narrow)
  })
})

describe('Н4: убеждение', () => {
  it('за столом мира уступают охотнее, и чужого посла легче обмануть', () => {
    const green = hero()
    const speaker = hero({ persuasion: 70 })
    console.log(`убеждение 0: ${skillDoes(green, 'persuasion').join('; ')}`)
    console.log(`убеждение 70: ${skillDoes(speaker, 'persuasion').join('; ')}`)
    expect(persuadesAt(speaker)).toBeGreaterThan(persuadesAt(green))
    expect(foolsGuest(speaker)).toBeGreaterThan(foolsGuest(green))

    const dull = ruler().state
    const smooth = ruler({ persuasion: 70 }).state
    const warring = (one: GameState): GameState => ({
      ...one,
      politics: {
        ...one.politics,
        wars: [{ a: PLAYER, b: foe, since: day - 100, reason: 'марка' }],
      },
    })
    const dullOffer = offerWeight(warring(dull), world, foe, ['tribute'], day)
    const smoothOffer = offerWeight(warring(smooth), world, foe, ['tribute'], day)
    console.log(`то же предложение: неумелому ${dullOffer}, краснобаю ${smoothOffer}`)
    expect(smoothOffer).toBeGreaterThan(dullOffer)
  })
})

describe('Н5: инженерия и стойкость', () => {
  it('свои стены крепче, и измор держится дольше', () => {
    const { state, mine } = ruler({ engineering: 60, fortitude: 60 })
    const plain = ruler().state
    const where = mine[0] as string
    const seed = (one: GameState): GameState => ({
      ...one,
      settlements: {
        ...one.settlements,
        [where]: {
          ...(one.settlements[where] as Settlement),
          stock: { ...(one.settlements[where] as Settlement).stock, grain: 60000 },
          garrison: { militia: 30 },
        },
      },
    })
    const mineFort = fortOf(seed(state), world, where)
    const plainFort = fortOf(seed(plain), world, where)
    console.log(
      `${world.locations[where]?.name}: у неумелого стены ×${plainFort?.walls}, запас ${plainFort?.storeDays} сут.`,
    )
    console.log(
      `у знающего инженерию и стойкого: стены ×${mineFort?.walls}, запас ${mineFort?.storeDays} сут.`,
    )
    expect(mineFort?.walls ?? 0).toBeGreaterThan(plainFort?.walls ?? 0)
    expect(mineFort?.storeDays ?? 0).toBeGreaterThan(plainFort?.storeDays ?? 0)
    expect(wallsBetter(state.character)).toBeGreaterThan(1)
    expect(siegeHolds(state.character)).toBeGreaterThan(1)

    // Чужая крепость от твоих навыков не крепчает.
    const theirs = Object.values(state.settlements).find((one) => one.owner !== PLAYER)
    if (!theirs) return
    const a = fortOf(state, world, theirs.locationId)
    const b = fortOf(plain, world, theirs.locationId)
    console.log(`чужая крепость: ${a?.walls} и ${b?.walls} — одна и та же`)
    expect(a?.walls).toBe(b?.walls)
  })
})

describe('Н6: ловкость рук и верховая езда', () => {
  it('эти два навыка уже работали с этапа 122 — здесь проверяется, что вместе', () => {
    const rider = hero({ riding: 60, sleight: 60 })
    console.log(`верховая 60: ${skillDoes(rider, 'riding').join('; ')}`)
    console.log(`ловкость рук 60: ${skillDoes(rider, 'sleight').join('; ')}`)
    expect(skillDoes(rider, 'riding').length).toBeGreaterThanOrEqual(2)
    expect(skillDoes(rider, 'sleight').length).toBeGreaterThanOrEqual(2)
  })
})
