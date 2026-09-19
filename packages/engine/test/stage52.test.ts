import { describe, expect, it } from 'vitest'
import {
  FAVOUR_AUDIENCE,
  courtOf,
  denounceTargets,
  favourOf,
  intriguesFor,
  judgeOf,
  lordHere,
  lordTemper,
  receptionFor,
} from '../src/castle'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { COURT_ROLES, LORD_TEMPERS, LORD_TEMPER_IDS, TOURNEY_FEE } from '../src/content/castle'
import { lordRep } from '../src/reputation'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 52: замок и двор лорда.
 *
 * Замок перестаёт быть кнопкой «просить землю»: у лорда есть нрав, при нём
 * люди, к нему входят по чину, у него судятся и с ним затевают дела.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const base = createGame(createCharacter({ name: 'Т', money: 2000 }), 1, world)

/** Место, где сидит лорд. */
function seatOfLord(): { state: GameState; lordId: string } {
  for (const settlement of Object.values(base.settlements)) {
    if (!settlement.owner?.startsWith('lord:')) continue
    const state: GameState = { ...base, locationId: settlement.locationId, quarter: 'castle' }
    const lord = lordHere(state)
    if (lord) return { state, lordId: lord.id }
  }
  throw new Error('в мире нет лорда на своём месте')
}

describe('З1: приём по чину', () => {
  it('к гордому не войти без имени, к весёлому — запросто', () => {
    const seats = new Map<string, { state: GameState; lordId: string }>()
    for (const settlement of Object.values(base.settlements)) {
      if (!settlement.owner?.startsWith('lord:')) continue
      const state: GameState = { ...base, locationId: settlement.locationId, quarter: 'castle' }
      const lord = lordHere(state)
      if (!lord) continue
      const temper = lordTemper(lord)
      if (!seats.has(temper)) seats.set(temper, { state, lordId: lord.id })
    }
    expect(seats.size).toBeGreaterThan(3)
    for (const [temper, seat] of seats) {
      const lord = lordHere(seat.state)
      if (!lord) continue
      const plain = receptionFor(seat.state, lord, 0)
      const famous = receptionFor({ ...seat.state, renown: 10 }, lord, 0)
      console.log(
        `${LORD_TEMPERS[temper as keyof typeof LORD_TEMPERS].label}: новичка ${plain.admits ? 'примет' : `нет (дар ${plain.gift})`}, со славой ${famous.admits ? 'примет' : 'нет'}, ждать ${plain.waitHours} ч`,
      )
      // Со славой принимают чаще, чем без неё, и никогда наоборот.
      expect(famous.admits || !plain.admits).toBe(true)
    }
    const closed = [...seats.values()].find((seat) => {
      const lord = lordHere(seat.state)
      return lord ? !receptionFor(seat.state, lord, 0).admits : false
    })
    expect(closed, 'все лорды пускают всякого').toBeDefined()
    if (!closed) return
    const lord = lordHere(closed.state)
    if (!lord) return
    const need = receptionFor(closed.state, lord, 0).gift
    // Не пустили — милости не прибавилось; пустили с даром — прибавилось.
    const turned = ok(
      applyCommand(closed.state, { type: 'seekAudience', lordId: lord.id, gift: 0 }),
    )
    expect(lordRep(turned.reputation, lord.id)).toBe(0)
    const rich: GameState = {
      ...closed.state,
      character: { ...closed.state.character, money: 3000 },
    }
    const let_in = ok(applyCommand(rich, { type: 'seekAudience', lordId: lord.id, gift: need }))
    expect(lordRep(let_in.reputation, lord.id)).toBeGreaterThan(0)
    expect(let_in.character.money).toBe(rich.character.money - need)
    expect(let_in.time).toBeGreaterThan(rich.time)
  })
})

describe('З2: двор как люди', () => {
  it('при лорде люди с именами, должностями и своим отношением', () => {
    const { state, lordId } = seatOfLord()
    const lord = lordHere(state)
    if (!lord) return
    const court = courtOf(state, lord)
    expect(court.length).toBeGreaterThanOrEqual(2)
    expect(court.some((one) => one.role === 'seneschal')).toBe(true)
    expect(court.some((one) => one.role === 'captain')).toBe(true)
    for (const one of court) expect(COURT_ROLES[one.role].about.length).toBeGreaterThan(10)
    console.log(court.map((one) => `${COURT_ROLES[one.role].label} ${one.name}`).join(', '))
    // Двор смотрит глазами лорда: милость поднимает всех, но каждого по-своему.
    const loved: GameState = {
      ...state,
      reputation: { ...state.reputation, lords: { [lordId]: 60 } },
    }
    const warm = courtOf(loved, lord)
    for (let i = 0; i < court.length; i += 1) {
      expect(warm[i]?.mood ?? 0).toBeGreaterThan(court[i]?.mood ?? 0)
    }
    expect(new Set(warm.map((one) => one.mood)).size).toBeGreaterThan(1)
  })
})

describe('З3 и З4: милость, опала и интрига', () => {
  it('покровительство открывается милостью, донос слышат обе стороны', () => {
    const { state, lordId } = seatOfLord()
    const lord = lordHere(state)
    if (!lord) return
    // Незнакомцу покровительства не предлагают.
    expect(intriguesFor(state, lord).some((one) => one.id === 'patronage')).toBe(false)
    const favoured: GameState = {
      ...state,
      reputation: { ...state.reputation, lords: { [lordId]: 40 } },
    }
    expect(intriguesFor(favoured, lord).some((one) => one.id === 'patronage')).toBe(true)
    const patron = ok(applyCommand(favoured, { type: 'courtIntrigue', lordId, kind: 'patronage' }))
    expect(favourOf(patron, lordId)).toBeGreaterThan(favourOf(favoured, lordId))
    expect(patron.renown).toBe(favoured.renown + 1)

    const target = denounceTargets(favoured, lord)[0]
    expect(target, 'не на кого доносить').toBeDefined()
    if (!target) return
    const told = ok(
      applyCommand(favoured, {
        type: 'courtIntrigue',
        lordId,
        kind: 'denounce',
        targetId: target.id,
      }),
    )
    expect(favourOf(told, lordId)).toBeGreaterThan(favourOf(favoured, lordId))
    expect(favourOf(told, target.id)).toBeLessThan(0)
    // Донос — грех: церковь считает и это (этап 51).
    expect(told.piety ?? 0).toBeLessThan(0)
  })
})

describe('З5: турнир', () => {
  it('на турнир зовут своих: взнос, кошель победителю, падение проигравшему', () => {
    const { state, lordId } = seatOfLord()
    expect(applyCommand(state, { type: 'tourney', lordId }).ok).toBe(false)
    const known: GameState = {
      ...state,
      reputation: { ...state.reputation, lords: { [lordId]: 30 } },
    }
    let wins = 0
    let falls = 0
    let current = known
    for (let i = 0; i < 12; i += 1) {
      const result = applyCommand(
        { ...current, character: { ...current.character, fatigue: 0, wound: null } },
        { type: 'tourney', lordId },
      )
      if (!result.ok) break
      const earned = result.state.character.money - current.character.money
      if (earned > 0) wins += 1
      if (result.state.character.wound) falls += 1
      current = { ...result.state, character: { ...result.state.character, money: 2000 } }
    }
    console.log(`турниров 12: выиграно ${wins}, сбит с седла ${falls}`)
    expect(wins + falls).toBeGreaterThan(0)
    expect(TOURNEY_FEE).toBeGreaterThan(0)
  })
})

describe('З6: суд лорда', () => {
  it('судит по нраву и по милости', () => {
    const { state, lordId } = seatOfLord()
    const lord = lordHere(state)
    if (!lord) return
    expect(applyCommand(state, { type: 'petition', lordId }).ok).toBe(false)
    // Богобоязненный склонен к просителю, суровый — к своим.
    const pious = LORD_TEMPER_IDS.map((id) => LORD_TEMPERS[id]).find((one) => one.id === 'pious')
    const grim = LORD_TEMPER_IDS.map((id) => LORD_TEMPERS[id]).find((one) => one.id === 'grim')
    expect((pious?.justice ?? 0) > (grim?.justice ?? 0)).toBe(true)
    const verdicts = (favour: number) =>
      Array.from({ length: 20 }, (_, i) => judgeOf(lord, favour, i / 20))
    const poor = verdicts(-10).filter((one) => one === 'granted').length
    const rich = verdicts(80).filter((one) => one === 'granted').length
    console.log(`из 20 дел решено в твою пользу: без милости ${poor}, в чести ${rich}`)
    expect(rich).toBeGreaterThan(poor)

    const favoured: GameState = {
      ...state,
      reputation: { ...state.reputation, lords: { [lordId]: 50 } },
    }
    const judged = ok(applyCommand(favoured, { type: 'petition', lordId }))
    expect(judged.time).toBeGreaterThan(favoured.time)
    expect(judged.log.length).toBeGreaterThan(favoured.log.length)
    expect(FAVOUR_AUDIENCE).toBeLessThan(0)
  })
})
