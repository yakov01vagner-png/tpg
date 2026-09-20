import { describe, expect, it } from 'vitest'
import { strangerCost } from '../src/acclaim'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import {
  COMPANY,
  commissionOffer,
  companiesOf,
  companyById,
  companyDef,
  companyLedger,
  hiringCrowns,
  idleHarm,
  patienceLeft,
  rivalsFor,
  treacheryChance,
  upfrontFor,
  wageOf,
} from '../src/company'
import { COMPANIES, TEMPER_DEFS } from '../src/content/companies'
import { firstPays } from '../src/primacy'
import { placeRep } from '../src/reputation'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 86: наёмники.
 *
 * Войско до 0.7 было только своё и всегда слушалось. Рота — войско с волей:
 * приходит с именем и славой, служит тому, кто платит, и уходит к тому, кто
 * платит больше. Неоплаченная рота — не убыток, а враг, знающий твой лагерь.
 */

const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Сутки: отдыхают по полсуток, дольше за раз не выходит. */
function day(state: GameState): GameState {
  return ok(
    applyCommand(ok(applyCommand(state, { type: 'rest', hours: 12 })), {
      type: 'rest',
      hours: 12,
    }),
  )
}

function captain(money = 60000): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money }), 1, world)
  const kingdoms = Object.keys(world.kingdoms)
  const [first, second, third, fourth] = kingdoms
  return {
    ...game,
    // Роты нужны воюющим: без войн их никто не перекупает.
    politics: {
      ...game.politics,
      wars: [
        { a: first as string, b: second as string, since: 1, reason: 'спорная марка' },
        { a: third as string, b: fourth as string, since: 1, reason: 'старая обида' },
      ],
    },
    time: WORLD_START,
    character: { ...game.character, money },
    party: { ...game.party, units: { spearman: 40, archer: 20 }, morale: 70 },
    renown: 20,
  }
}

/** Прийти туда, где стоит рота: нанимают лицом к лицу. */
function withCompanyHere(state: GameState, id: string): GameState {
  const company = companyById(state, id)
  if (!company) throw new Error('нет роты')
  return { ...state, locationId: company.locationId }
}

describe('Н1: вольные роты', () => {
  it('у каждой роты имя, нрав, люди и цена', () => {
    const state = captain()
    for (const company of companiesOf(state)) {
      const def = companyDef(company.id)
      console.log(
        `${def.name} (${TEMPER_DEFS[def.temper].label}): ${company.men} человек, ${wageOf(company)} в сутки, задаток ${upfrontFor(company)}, терпит ${TEMPER_DEFS[def.temper].patience} суток недоимки; стоит в ${world.locations[company.locationId]?.name}`,
      )
    }
    expect(companiesOf(state)).toHaveLength(COMPANIES.length)
    // Роты разные не только именем: цена у них своя.
    const wages = new Set(companiesOf(state).map((one) => wageOf(one)))
    expect(wages.size).toBeGreaterThan(3)
  })
})

describe('Н2: контракт', () => {
  it('задаток, срок и жалованье считаются от роты, а не от кошелька', () => {
    const state = captain()
    const company = companiesOf(state)[0]
    if (!company) return
    const here = withCompanyHere(state, company.id)
    const hired = ok(applyCommand(here, { type: 'hireCompany', companyId: company.id, days: 90 }))
    const row = companyById(hired, company.id)
    console.log(
      `${companyDef(company.id).name}: нанята на 90 суток, задаток ${state.character.money - hired.character.money}, жалованья ${wageOf(company)} в сутки; на карте частей ${hired.bands.filter((one) => one.id.startsWith('company:')).length}`,
    )
    expect(row?.hiredBy).toBe('player')
    // Задаток берут с поправкой на признание (этап 138, Пр4) и на первенство
    // (этап 139, Це1): роты берут с непризнанного и с первого вперёд и больше.
    const dearer = strangerCost(here, here.world, 1).times * firstPays(here, here.world, 1).times
    expect(hired.character.money).toBe(
      state.character.money - Math.round(upfrontFor(company) * dearer),
    )
    expect(hired.bands.some((one) => one.id === `company:${company.id}`)).toBe(true)
    // Сроку есть предел с обеих сторон.
    expect(applyCommand(here, { type: 'hireCompany', companyId: company.id, days: 5 }).ok).toBe(
      false,
    )
    // Роту нанимают там, где она стоит.
    const elsewhere = Object.keys(world.locations).find((id) => id !== company.locationId) as string
    expect(
      applyCommand(
        { ...here, locationId: elsewhere },
        { type: 'hireCompany', companyId: company.id, days: 90 },
      ).ok,
    ).toBe(false)
  })

  it('кто платит больше — к тому и уходят', () => {
    const state = captain()
    const company = companiesOf(state)[0]
    if (!company) return
    const rivals = rivalsFor(state, world, company, wageOf(company))
    console.log(
      `${companyDef(company.id).name} служит за ${wageOf(company)}; перебить готовы: ${rivals
        .slice(0, 3)
        .map((one) => `${one.kingdomId} — ${one.bid}`)
        .join(', ')}`,
    )
    // Кто не воюет, тот и не платит: бьются за роту только воюющие короны.
    for (const rival of rivals) expect(rival.bid).toBeGreaterThan(wageOf(company))
  })
})

describe('Н3: измена', () => {
  it('без жалованья рота сперва считает дни, потом уходит или бьёт', () => {
    const state = captain(12000)
    const company = companiesOf(state)[0]
    if (!company) return
    const here = withCompanyHere(state, company.id)
    let run = ok(applyCommand(here, { type: 'hireCompany', companyId: company.id, days: 180 }))
    const wage = wageOf(company)
    let days = 0
    while (days < 120) {
      run = day(run)
      days += 1
      const row = companyById(run, company.id)
      if (!row || row.hiredBy !== 'player') break
    }
    const row = companyById(run, company.id)
    const said = run.log.filter(
      (one) => one.text.includes('ушла') || one.text.includes('повернула'),
    )
    console.log(
      `жалованья ${wage} в сутки при казне ${here.character.money}: рота держалась ${days} суток, дальше — ${said[said.length - 1]?.text ?? 'служит'}`,
    )
    expect(row?.hiredBy).not.toBe('player')
    expect(days).toBeLessThan(120)
  })

  it('терпение и измена считаются по нраву', () => {
    const state = captain()
    for (const one of companiesOf(state)) {
      const def = companyDef(one.id)
      const owed = { ...one, unpaidDays: TEMPER_DEFS[def.temper].patience * 2 }
      console.log(
        `${def.name} (${TEMPER_DEFS[def.temper].label}): терпения на ${TEMPER_DEFS[def.temper].patience} суток; вдвое дольше без денег — измена ${Math.round(treacheryChance(owed) * 100)} из ста`,
      )
      expect(patienceLeft(owed)).toBe(0)
    }
    const greedy = companiesOf(state).find((one) => companyDef(one.id).temper === 'greedy')
    const faithful = companiesOf(state).find((one) => companyDef(one.id).temper === 'faithful')
    if (!greedy || !faithful) return
    const late = (row: typeof greedy) => treacheryChance({ ...row, unpaidDays: 60 })
    expect(late(greedy)).toBeGreaterThan(late(faithful))
  })
})

describe('Н4: своя рота', () => {
  it('можно наняться самому, и корона платит по суткам', () => {
    const state = captain()
    const offers = hiringCrowns(state, world, 60)
    console.log(
      `за шесть десятков дают: ${offers
        .slice(0, 4)
        .map((one) => `${one.kingdomId} — ${one.wage} в сутки (война с ${one.against})`)
        .join(', ')}`,
    )
    const first = offers[0]
    if (!first) return
    const served = ok(
      applyCommand(state, { type: 'takeCommission', kingdomId: first.kingdomId, days: 60 }),
    )
    expect(served.commission?.kingdomId).toBe(first.kingdomId)
    const after = day(served)
    const paid = after.character.money - served.character.money
    console.log(
      `сутки службы: заплачено ${paid}, всего ${after.commission?.paid}; ${after.log.find((one) => one.text.startsWith('Ты в службе'))?.text ?? ''}`,
    )
    expect(paid).toBeGreaterThan(0)
    // Уйти до срока можно, но имя это помнит.
    const left = ok(applyCommand(after, { type: 'leaveCommission' }))
    expect(left.commission).toBe(null)
    expect(left.renown).toBeLessThan(after.renown)
  })

  it('цена своей роты растёт с числом людей и со славой', () => {
    const state = captain()
    const kingdomId = hiringCrowns(state, world, 60)[0]?.kingdomId
    if (!kingdomId) return
    const small = commissionOffer(state, world, kingdomId, 20)
    const big = commissionOffer(state, world, kingdomId, 200)
    const famous = commissionOffer({ ...state, renown: 200 }, world, kingdomId, 200)
    console.log(
      `${kingdomId} даёт: за 20 человек ${small}, за 200 — ${big}, за 200 со славой 200 — ${famous}`,
    )
    expect(big).toBeGreaterThan(small)
    expect(famous).toBeGreaterThan(big)
  })
})

describe('Н5: роты между войнами', () => {
  it('вольная рота кормится с округи, и округа это помнит', () => {
    // В мире без войн роту никто не нанимает — и она кормится сама.
    const peace = captain()
    const state: GameState = { ...peace, politics: { ...peace.politics, wars: [] } }
    const company = companiesOf(state)[0]
    if (!company) return
    const harm = idleHarm(company)
    const before = placeRep(state.reputation, company.locationId)
    let run: GameState = { ...state, locationId: company.locationId }
    for (let i = 0; i < 10; i += 1) run = day(run)
    const after = placeRep(run.reputation, company.locationId)
    const banditry = run.settlements[company.locationId]?.banditry ?? 0
    console.log(
      `${companyDef(company.id).name} стоит без найма в ${world.locations[company.locationId]?.name}: память места ${before} → ${Math.round(after)}, разбой ${(state.settlements[company.locationId]?.banditry ?? 0).toFixed(2)} → ${banditry.toFixed(2)}; за сутки ${harm.mood.toFixed(2)} памяти`,
    )
    expect(after).toBeLessThan(before)
  })
})

describe('Н6: роты в отчёте', () => {
  it('счёт по ротам виден числом', () => {
    const state = captain()
    const company = companiesOf(state)[0]
    if (!company) return
    const here = withCompanyHere(state, company.id)
    const hired = ok(applyCommand(here, { type: 'hireCompany', companyId: company.id, days: 90 }))
    const ledger = companyLedger(hired)
    console.log(ledger.says)
    expect(ledger.served).toBeGreaterThan(0)
    expect(ledger.daily).toBe(wageOf(company))
    expect(ledger.men).toBeGreaterThan(300)
  })

  it('за год роты нанимаются коронами сами', () => {
    let run = captain()
    for (let i = 0; i < 30; i += 1) run = day(run)
    const ledger = companyLedger(run)
    const served = companiesOf(run).filter((one) => one.hiredBy && one.hiredBy !== 'player')
    console.log(
      `через год: ${ledger.says} В короне: ${served.map((one) => `${companyDef(one.id).name} → ${one.hiredBy}`).join(', ') || 'никто'}`,
    )
    expect(ledger.served + ledger.free).toBe(COMPANIES.length)
  })
})
