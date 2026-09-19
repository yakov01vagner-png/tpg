import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { LIBERTY_POPULATION } from '../src/content/realm'
import { courtCase } from '../src/court'
import { createSettlements } from '../src/economy'
import { lawOf } from '../src/estate'
import { PLAYER } from '../src/holding'
import { charterOf, debtors, libertyOffers, realmMood, realmYear, takeAt } from '../src/realm'
import { placeRep } from '../src/reputation'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 76: закон державы.
 *
 * Закон владения считал подать и суд на своей земле. Держава добавляет то,
 * чего у владения не было: города, с которыми договариваются; недоимщиков, у
 * которых есть причина; и год, который подводит итог всему разом.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Государь с большим городом и деревней: с этого и начинается закон державы. */
function ruler(): { state: GameState; city: string; small: string } {
  const base = createGame(createCharacter({ name: 'Ратша', money: 1500 }), 1, world)
  const city = Object.values(settlements)
    .filter((one) => one.population >= LIBERTY_POPULATION && one.population < 20000)
    .sort((a, b) => b.population - a.population)[0]
  const small = Object.values(settlements)
    .filter((one) => one.population > 400 && one.population < 1500)
    .sort((a, b) => b.population - a.population)[0]
  if (!city || !small) throw new Error('нет подходящих мест')
  const places = {
    ...settlements,
    [city.locationId]: { ...city, owner: PLAYER },
    [small.locationId]: { ...small, owner: PLAYER },
  }
  return {
    state: {
      ...base,
      politics,
      settlements: places,
      locationId: city.locationId,
      quarter: null,
      time: WORLD_START,
      realm: { name: 'Вольное владение', sinceDay: 1 },
      renown: 20,
    },
    city: city.locationId,
    small: small.locationId,
  }
}

describe('З1 и З4: закон державы и вольности городов', () => {
  it('город просит вольность: деньги сейчас против подати потом', () => {
    const { state, city } = ruler()
    const offer = libertyOffers(state, 1)[0]
    if (!offer) return
    console.log(`${offer.asks}`)
    const before = takeAt(state, city, 1)
    const after = ok(applyCommand(state, { type: 'grantCharter', locationId: city }))
    console.log(
      `берём с города: ${before.toFixed(2)} → ${takeAt(after, city, 1).toFixed(2)}; в казне ${state.character.money} → ${after.character.money}`,
    )
    expect(after.character.money).toBe(state.character.money + offer.price)
    expect(takeAt(after, city, 1)).toBeLessThan(before)
    expect(charterOf(after, city, 1)?.kind).toBe('liberty')
    // Город это помнит, и помнит долго.
    expect(placeRep(after.reputation, city)).toBeGreaterThan(placeRep(state.reputation, city))
    // Второй раз ту же вольность не просят.
    expect(libertyOffers(after, 1).some((one) => one.locationId === city)).toBe(false)
  })

  it('деревня о вольности не заговаривает', () => {
    const { state, small } = ruler()
    expect(libertyOffers(state, 1).some((one) => one.locationId === small)).toBe(false)
  })
})

describe('З3: недоимки', () => {
  it('у недоимки есть причина, и три ответа стоят разного', () => {
    const { state, city } = ruler()
    // Хозяина давно не видели: подать доходит хуже (этап 61, В5).
    const stale: GameState = {
      ...state,
      locationId: state.locationId === city ? city : city,
      visits: { [city]: 1 },
      time: WORLD_START + 400 * MINUTES_PER_DAY,
    }
    const day = Math.floor(stale.time / MINUTES_PER_DAY) + 1
    const owing = debtors({ ...stale, locationId: 'нигде' }, day)
    console.log(owing.map((one) => `${one.locationId}: ${one.owed} — ${one.why}`).join('; '))
    expect(owing.length).toBeGreaterThan(0)
    const debt = owing[0]
    if (!debt) return
    const here: GameState = { ...stale, locationId: 'нигде' }
    const forced = ok(
      applyCommand(here, { type: 'answerArrears', locationId: debt.locationId, answer: 'force' }),
    )
    const dealt = ok(
      applyCommand(here, { type: 'answerArrears', locationId: debt.locationId, answer: 'deal' }),
    )
    const forgiven = ok(
      applyCommand(here, { type: 'answerArrears', locationId: debt.locationId, answer: 'forgive' }),
    )
    console.log(
      `силой: +${forced.character.money - here.character.money}, память ${placeRep(forced.reputation, debt.locationId)}; ` +
        `договором: +${dealt.character.money - here.character.money}, память ${placeRep(dealt.reputation, debt.locationId)}; ` +
        `прощением: +${forgiven.character.money - here.character.money}, память ${placeRep(forgiven.reputation, debt.locationId)}`,
    )
    expect(forced.character.money).toBeGreaterThan(dealt.character.money)
    expect(dealt.character.money).toBeGreaterThan(forgiven.character.money)
    expect(placeRep(forced.reputation, debt.locationId)).toBeLessThan(
      placeRep(forgiven.reputation, debt.locationId),
    )
    // Договор — это послабление на срок, а не разовая скидка.
    expect(charterOf(dealt, debt.locationId, day)?.kind).toBe('relief')
  })
})

describe('З2: суд государя', () => {
  it('решение суда помнит не только тот, кого рассудили', () => {
    const { state } = ruler()
    // Двор с двумя вассалами: тогда и спорить есть кому.
    const vassals = state.politics.lords.slice(0, 2).map((lord) => ({ ...lord, kingdomId: PLAYER }))
    const court: GameState = {
      ...state,
      politics: {
        ...state.politics,
        lords: [...vassals, ...state.politics.lords.slice(2)],
      },
      courtDay: 0,
      time: WORLD_START + 40 * MINUTES_PER_DAY,
    }
    const pending = courtCase(court)
    if (!pending || pending.kind !== 'landDispute') return
    const hasRansom = pending.choices.some((one) => one.id === 'ransom')
    console.log(`${pending.title}: ${pending.choices.map((one) => one.label).join(' / ')}`)
    expect(hasRansom).toBe(true)
    const judged = ok(applyCommand(court, { type: 'judge', caseId: pending.id, choice: 'ransom' }))
    console.log(`откуп: казна ${court.character.money} → ${judged.character.money}`)
    expect(judged.character.money).toBeGreaterThan(court.character.money)
    // Помнят обе стороны: одному милость, другому обида.
    const memories = Object.values(judged.lordDeeds ?? {}).flat()
    expect(memories).toContain('gifted')
    expect(memories).toContain('robbed')
  })
})

describe('З5 и З6: закон в людях и год державы', () => {
  it('тяжёлая подать портит память мест, а год подводит итог', () => {
    const { state, city } = ruler()
    const plain = realmMood(state, state.settlements[city] as never, 1)
    const heavy = realmMood(
      { ...state, law: { ...lawOf(state), tax: 'heavy' } },
      state.settlements[city] as never,
      1,
    )
    console.log(
      `память места за сутки: по обычаю ${plain.toFixed(4)}, при тяжёлой ${heavy.toFixed(4)}`,
    )
    expect(heavy).toBeLessThan(plain)

    const report = realmYear(state, 1)
    console.log(
      `год державы: приход ${report.income}, расход ${report.spent}; ${report.says}${report.unhappy.length > 0 ? ` (${report.unhappy.join(', ')})` : ''}`,
    )
    expect(report.income).toBeGreaterThan(0)
    expect(report.says.length).toBeGreaterThan(10)

    // Итог приходит сам, раз в год, и его видно в журнале.
    let lived: GameState = { ...state, time: WORLD_START + (DAYS_PER_YEAR - 2) * MINUTES_PER_DAY }
    for (let day = 0; day < 4; day += 1) {
      lived = ok(applyCommand(lived, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const said = lived.log.some((entry) => entry.text.startsWith('Год державы'))
    console.log(`отчёт в журнале: ${said ? 'есть' : 'нет'}`)
    expect(said).toBe(true)
  })
})
