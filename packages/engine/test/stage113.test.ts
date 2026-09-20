import { describe, expect, it } from 'vitest'
import {
  BLIND,
  DEFECTOR_DEFS,
  bannersLift,
  besiegedOf,
  bluffWorth,
  defectorAt,
  garrisonGuess,
  reliefKnown,
  siegeLedger,
  storesGuess,
} from '../src/blind'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { type Settlement, createSettlements } from '../src/economy'
import { storeDays } from '../src/fort'
import { PLAYER, garrisonSize } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { neighbourSettlements } from '../src/world/queries'

/**
 * Этап 113: осада вслепую.
 *
 * До сих пор осада шла при открытых картах: осаждающий читал чужой запас
 * числом, осаждённый знал, идёт ли выручка. Теперь гадают обе стороны — и обе
 * могут этим воспользоваться.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const foe = kingdoms[1] as string
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Игрок под чужими стенами: осада уже идёт. */
function besieging(days: number): { state: GameState; where: string } {
  const game = createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world)
  const theirs = Object.values(settlements).find(
    (one) =>
      one.population > 900 &&
      (one.owner === `crown:${foe}` ||
        politics.lords.some((lord) => lord.id === one.owner && lord.kingdomId === foe)),
  )
  if (!theirs) throw new Error('нет чужих мест')
  const map = {
    ...settlements,
    [theirs.locationId]: {
      ...theirs,
      garrison: { militia: 40, spearman: 20 },
      stock: { ...theirs.stock, grain: 60000 },
    },
  }
  return {
    state: {
      ...game,
      politics: { ...politics, wars: [{ a: PLAYER, b: foe, since: 100, reason: 'марка' }] },
      settlements: map,
      locationId: theirs.locationId,
      quarter: null,
      time: WORLD_START + (day - 1) * 24 * 60,
      realm: { name: 'Заречье', sinceDay: 1 },
      party: { ...game.party, units: { militia: 120, spearman: 60 }, morale: 70 },
      siege: { locationId: theirs.locationId, days },
    },
    where: theirs.locationId,
  }
}

describe('Ос1: что знает осаждающий', () => {
  it('запас за стенами — догадка, и она сужается стоянием', () => {
    const { state, where } = besieging(0)
    const place = state.settlements[where]
    if (!place) return
    const fresh = storesGuess(state, world, { locationId: where, days: 0 }, day)
    const long = storesGuess(state, world, { locationId: where, days: 40 }, day)
    console.log(`на деле хлеба на ${storeDays(place)} суток`)
    console.log(`первый день: ${fresh.says}`)
    console.log(`сороковой день: ${long.says}`)
    expect(long.spread).toBeLessThan(fresh.spread)
    expect(fresh.truth).toBe(storeDays(place))

    const guard = garrisonGuess(state, world, { locationId: where, days: 12 }, day)
    console.log(
      `гарнизон: на деле ${garrisonSize(place)}, по-твоему ${guard.value} (вилка ${Math.round(guard.spread * 100)} из ста)`,
    )
    expect(guard.truth).toBe(garrisonSize(place))

    // И это команда: под стенами можно оглядеться.
    const weighed = ok(applyCommand(state, { type: 'weighSiege' }))
    console.log(weighed.log[1]?.text)
    expect(weighed.log.some((one) => one.text.includes('вилка'))).toBe(true)
  })
})

describe('Ос2: что знает осаждённый', () => {
  it('за стенами не знают, идёт ли выручка', () => {
    const { state, where } = besieging(10)
    const blank = reliefKnown(state, world, where, day)
    console.log(`без выручки: ${blank.says}`)

    // Их дружина в двух переходах — о ней узнают; в шести — нет.
    const near = [...neighbourSettlements(world, where, 8)].sort((a, b) => a.hops - b.hops)
    const close = near[0]?.id
    const far = near[near.length - 1]?.id
    const theirLord = politics.lords.find((one) => one.kingdomId === foe)
    const make = (at: string) => ({
      ...state,
      bands: [
        {
          id: 'band:relief',
          lordId: theirLord?.id ?? 'lord:x',
          kingdomId: foe,
          units: { militia: 90 },
          morale: 65,
          locationId: at,
          travel: null,
          goal: { type: 'muster' } as const,
          siegeDays: 0,
        },
      ],
    })
    if (close) {
      const heard = reliefKnown(make(close), world, where, day)
      console.log(`выручка близко: ${heard.says}`)
      expect(heard.coming).toBe(true)
    }
    if (far) {
      const unheard = reliefKnown(make(far), world, where, day)
      console.log(`выручка далеко: ${unheard.says}`)
      expect(unheard.coming).toBe(true)
      expect(unheard.known).toBe(false)
    }
  })
})

describe('Ос3: переговоры вслепую', () => {
  it('блефовать можно, и раскрытый блеф стоит доверия', () => {
    const { state, where } = besieging(20)
    const bluff = bluffWorth(state, world, { locationId: where, days: 20 }, day)
    console.log(`блеф стоит ${Math.round(bluff.gain * 100)} из ста: ${bluff.says}`)
    expect(bluff.gain).toBeGreaterThan(0)
    // Не бросок: один и тот же блеф в один и тот же день держится одинаково.
    expect(bluffWorth(state, world, { locationId: where, days: 20 }, day).holds).toBe(bluff.holds)

    const tried = ok(applyCommand(state, { type: 'bluffParley' }))
    console.log(tried.log.find((one) => one.text.includes('Сдача'))?.text)
    expect(tried.siegeLog?.bluffs).toBe(1)
  })
})

describe('Ос4: перебежчик', () => {
  it('из-за стен приходят с правдой и с ложью, и отличить их нельзя', () => {
    const { state, where } = besieging(14)
    const place = state.settlements[where]
    if (!place) return
    for (const [id, def] of Object.entries(DEFECTOR_DEFS)) {
      console.log(`${def.label}: ${def.true ? 'правда' : 'ложь'}, расхождение ${def.off} — ${id}`)
    }
    const bought = defectorAt(state, { locationId: where, days: 14 }, day, true)
    console.log(`на деле хлеба на ${storeDays(place)} суток`)
    console.log(bought?.says)
    expect(bought?.kind).toBe('bought')

    const paid = ok(applyCommand(state, { type: 'buyDefector' }))
    console.log(`казна ${state.character.money} → ${paid.character.money}`)
    expect(paid.character.money).toBe(state.character.money - BLIND.buyDefector)
    expect((paid.words ?? []).some((one) => one.kind === 'stores')).toBe(true)
    expect(paid.siegeLog?.defectors).toBe(1)

    // И кто-нибудь перелезает сам, без твоего серебра.
    let later = state
    for (let step = 0; step < BLIND.defectorBeat + 1; step += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    console.log(
      later.log.find((one) => one.text.includes('перелез'))?.text ?? 'за эти сутки никто не пришёл',
    )
  })
})

describe('Ос5: ложная выручка', () => {
  it('знамёна на холме снимают осады — тем вернее, чем меньше у них глаз', () => {
    const game = createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world)
    const mine = Object.values(settlements)
      .filter((one) => one.population > 900)
      .slice(0, 1)
    const where = mine[0]?.locationId
    if (!where) return
    const theirLord = politics.lords.find((one) => one.kingdomId === foe)
    const state: GameState = {
      ...game,
      politics: { ...politics, wars: [{ a: PLAYER, b: foe, since: 100, reason: 'марка' }] },
      settlements: { ...settlements, [where]: { ...(mine[0] as Settlement), owner: PLAYER } },
      locationId: where,
      quarter: null,
      time: WORLD_START + (day - 1) * 24 * 60,
      realm: { name: 'Заречье', sinceDay: 1 },
      bands: [
        {
          id: 'band:siegers',
          lordId: theirLord?.id ?? 'lord:x',
          kingdomId: foe,
          units: { militia: 90 },
          morale: 65,
          locationId: where,
          travel: null,
          goal: { type: 'siege', targetId: where },
          siegeDays: 8,
        },
      ],
    }
    console.log(`осаждают: ${besiegedOf(state, where).join(', ')}`)
    expect(besiegedOf(state, where)).toHaveLength(1)

    const lone = bannersLift(state, world, where, foe, day)
    console.log(`у них один отряд кругом: ${lone.says}`)
    const siegers = state.bands[0]
    if (!siegers) return
    const crowded: GameState = {
      ...state,
      bands: [...state.bands, { ...siegers, id: 'band:2' }, { ...siegers, id: 'band:3' }],
    }
    const watched = bannersLift(crowded, world, where, foe, day)
    console.log(`у них три отряда кругом: ${watched.says}`)
    expect(watched.chance).toBeLessThan(lone.chance)

    const raised = applyCommand(state, { type: 'raiseBanners', locationId: where })
    if (raised.ok) {
      console.log(raised.state.log.find((one) => one.text.includes('знамёна'))?.text)
      console.log(`осаду сняли: ${raised.state.bands[0]?.goal.type !== 'siege'}`)
    }
  })
})

describe('Ос6: осады в числах', () => {
  it('век считает, сколько осад решило знание, а не стены', () => {
    const { state } = besieging(20)
    console.log(siegeLedger(state).says)
    const tried = ok(applyCommand(state, { type: 'bluffParley' }))
    const ledger = siegeLedger(tried)
    console.log(ledger.says)
    expect(ledger.bluffs).toBe(1)
  })
})
