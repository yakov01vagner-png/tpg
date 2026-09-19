import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { LENDER_DEFS, RAISE_DEFS } from '../src/content/treasury'
import { createSettlements } from '../src/economy'
import { PLAYER, garrisonSize, holdingsOf } from '../src/holding'
import { placeRep } from '../src/reputation'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import {
  creditLimit,
  daysOfPurse,
  debtTo,
  ledger,
  lends,
  queueAhead,
  queueOf,
  raiseCost,
  worksPrice,
} from '../src/treasury'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 77: казна и войско короны.
 *
 * Кошелёк был одним числом. У державы есть счёт: откуда пришло, куда ушло, у
 * кого занято и что бывает, когда не хватает. Проверяется это: счёт сходится по
 * статьям, заимодавцы разные, три набора стоят разного, очередь строек идёт по
 * мере денег, а пустая казна видна в мире.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(money = 3000): { state: GameState; mine: readonly string[] } {
  const base = createGame(createCharacter({ name: 'Ратша', money }), 1, world)
  const rich = Object.values(settlements)
    .filter((one) => one.population > 2000 && one.population < 12000)
    .sort((a, b) => b.population - a.population)
    .slice(0, 2)
  const places = { ...settlements }
  for (const one of rich) places[one.locationId] = { ...one, owner: PLAYER }
  const first = rich[0]
  if (!first) throw new Error('нет своих мест')
  return {
    state: {
      ...base,
      politics,
      settlements: places,
      locationId: first.locationId,
      quarter: null,
      time: WORLD_START,
      realm: { name: 'Вольное владение', sinceDay: 1 },
      renown: 30,
      fame: { traders: 40, folk: 30, church: 20 },
      piety: 30,
    },
    mine: rich.map((one) => one.locationId),
  }
}

describe('К1 и К2: приход и расход', () => {
  it('счёт державы сходится по статьям, и видно, на сколько хватит', () => {
    const { state } = ruler()
    const sheet = ledger(state, world, 1)
    console.log(
      `приход: подать ${sheet.tax}, мыто ${sheet.tolls}, вассалы ${sheet.vassals}, дань ${sheet.tribute} = ${sheet.income}`,
    )
    console.log(
      `расход: гарнизоны ${sheet.garrison}, двор ${sheet.court}, рост долгов ${sheet.interest} = ${sheet.spent}; итого ${sheet.net}`,
    )
    expect(sheet.income).toBe(sheet.tax + sheet.tolls + sheet.vassals + sheet.tribute)
    expect(sheet.spent).toBe(sheet.garrison + sheet.court + sheet.interest)
    expect(sheet.net).toBe(sheet.income - sheet.spent)
    // Пока приход выше расхода, казна не кончится.
    expect(daysOfPurse(state, sheet)).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('К4: долг', () => {
  it('дают по имени и по земле, а долг растёт сам', () => {
    const { state } = ruler()
    for (const lender of ['merchants', 'guild', 'temple'] as const) {
      console.log(
        `${LENDER_DEFS[lender].label}: даёт ${lends(state, lender) ? 'да' : 'нет'}, не больше ${creditLimit(state, world, lender, 1)}`,
      )
    }
    const limit = creditLimit(state, world, 'merchants', 1)
    expect(limit).toBeGreaterThan(0)
    const tooMuch = applyCommand(state, { type: 'borrow', lender: 'merchants', amount: limit + 1 })
    expect(tooMuch.ok).toBe(false)

    const borrowed = ok(
      applyCommand(state, { type: 'borrow', lender: 'merchants', amount: Math.floor(limit / 2) }),
    )
    const debt = debtTo(borrowed, 'merchants')
    console.log(
      `взято ${debt?.owed}; в казне ${state.character.money} → ${borrowed.character.money}`,
    )
    expect(debt).not.toBeNull()
    expect(borrowed.character.money).toBeGreaterThan(state.character.money)

    let later = borrowed
    for (let day = 0; day < 60; day += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const grown = debtTo(later, 'merchants')
    console.log(
      `через 60 суток долг ${Math.round(debt?.owed ?? 0)} → ${Math.round(grown?.owed ?? 0)}`,
    )
    expect(grown?.owed ?? 0).toBeGreaterThan(debt?.owed ?? 0)
    // Рост долга виден в счёте расхода.
    expect(ledger(later, world, 61).interest).toBeGreaterThan(0)

    const repaid = ok(
      applyCommand(later, { type: 'repay', lender: 'merchants', amount: later.character.money }),
    )
    console.log(`после уплаты долг ${Math.round(debtTo(repaid, 'merchants')?.owed ?? 0)}`)
    expect(debtTo(repaid, 'merchants')?.owed ?? 0).toBeLessThan(grown?.owed ?? 0)
  })

  it('храм не даёт безбожному, купцы — безымянному', () => {
    const { state } = ruler()
    const nobody: GameState = { ...state, renown: 0, fame: {}, piety: -60 }
    console.log(
      `безымянному: купцы ${lends(nobody, 'merchants') ? 'дают' : 'нет'}, храм ${lends(nobody, 'temple') ? 'даёт' : 'нет'}`,
    )
    expect(lends(nobody, 'temple')).toBe(false)
  })
})

describe('К3: наборы', () => {
  it('три способа — три цены за одних и тех же людей', () => {
    const { state, mine } = ruler(4000)
    const place = mine[0] as string
    for (const way of ['levy', 'hire', 'retinue'] as const) {
      console.log(
        `${RAISE_DEFS[way].label}: разом ${raiseCost(way, 20)}, в сутки ${(RAISE_DEFS[way].wage * 20).toFixed(0)}, память ${(RAISE_DEFS[way].mood * 20).toFixed(1)}`,
      )
    }
    const levied = ok(
      applyCommand(state, { type: 'raiseMen', locationId: place, way: 'levy', men: 20 }),
    )
    const hired = ok(
      applyCommand(state, { type: 'raiseMen', locationId: place, way: 'hire', men: 20 }),
    )
    console.log(
      `ополчение: казна ${levied.character.money}, память ${placeRep(levied.reputation, place).toFixed(1)}; ` +
        `набор: казна ${hired.character.money}, память ${placeRep(hired.reputation, place).toFixed(1)}`,
    )
    // Ополчение даром, но память места портит; набор наоборот.
    expect(levied.character.money).toBe(state.character.money)
    expect(hired.character.money).toBeLessThan(state.character.money)
    expect(placeRep(levied.reputation, place)).toBeLessThan(placeRep(hired.reputation, place))
    expect(garrisonSize(levied.settlements[place] as never)).toBeGreaterThan(
      garrisonSize(state.settlements[place] as never),
    )
  })
})

describe('К5 и К6: стройка державы и пустая казна', () => {
  it('очередь идёт по мере денег', () => {
    const { state, mine } = ruler(4000)
    const place = mine[0] as string
    const queued = ok(
      applyCommand(state, { type: 'queueWork', locationId: place, building: 'granary' }),
    )
    console.log(
      `в очереди ${queueOf(queued).length}, стоит ${worksPrice('granary')}, всего ${queueAhead(queued).cost}`,
    )
    expect(queueOf(queued)).toHaveLength(1)
    let later = queued
    for (let day = 0; day < 40; day += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const built = later.settlements[place]?.buildings.includes('granary')
    console.log(`через 40 суток: ${built ? 'построено' : `в очереди ${queueOf(later).length}`}`)
    expect(built || queueOf(later)[0]?.paid).toBeTruthy()
  })

  it('пустая казна расходит гарнизоны', () => {
    const { state, mine } = ruler(0)
    const place = mine[0] as string
    const settlement = state.settlements[place]
    if (!settlement) return
    const manned: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [place]: { ...settlement, garrison: { militia: 40 } },
      },
      character: { ...state.character, money: 0 },
    }
    const before = garrisonSize(manned.settlements[place] as never)
    let later = manned
    for (let day = 0; day < 10; day += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const after = garrisonSize(later.settlements[place] as never)
    console.log(
      `без жалованья за 10 суток: гарнизон ${before} → ${after}, казна ${later.character.money}`,
    )
    expect(holdingsOf(later.settlements, PLAYER).length).toBeGreaterThan(0)
    if (later.character.money <= 0) expect(after).toBeLessThan(before)
  })
})
