import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { REPORT, REPORTER_DEFS } from '../src/content/report'
import { createSettlements } from '../src/economy'
import { PLAYER, holdingsOf } from '../src/holding'
import { knownTo, spreadWords, wordsTo } from '../src/known'
import {
  auditOf,
  purseAsReported,
  reportFrom,
  reportedAt,
  reporterAt,
  skimAt,
  skimTotal,
  truthAt,
} from '../src/report'
import { placeRep } from '../src/reputation'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 100: донесения своих.
 *
 * Своя земля отчитывалась мгновенно и точно — так что о невидимом государь знал
 * лучше, чем о том, что перед глазами. Здесь между землёй и тобой встаёт человек
 * с отчётом, дорогой и своими причинами округлить.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(places = 8): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, places)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER, banditry: 0.3 }
  return {
    ...game,
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

describe('Д1 и Д5: отчёт и тот, кто его пишет', () => {
  it('у каждого места свой человек, и отчёт идёт своей дорогой', () => {
    const state = ruler()
    const kinds = new Set<string>()
    for (const one of holdingsOf(state.settlements, PLAYER)) {
      const reporter = reporterAt(state, world, one.locationId, day)
      if (!reporter) continue
      kinds.add(reporter.kind)
      console.log(
        `${world.locations[one.locationId]?.name}: ${reporter.says} Отчёт идёт ${reporter.days} сут.`,
      )
    }
    expect(kinds.size).toBeGreaterThan(1)
    // Выводится, а не хранится: один и тот же человек при каждом счёте.
    const first = holdingsOf(state.settlements, PLAYER)[0]?.locationId as string
    expect(reporterAt(state, world, first, day)?.name).toBe(
      reporterAt(state, world, first, day + 50)?.name,
    )
    for (const id of ['honest', 'plain', 'flatterer', 'thief'] as const) {
      console.log(
        `${REPORTER_DEFS[id].label}: доброе ×${REPORTER_DEFS[id].gilds}, дурное ×${REPORTER_DEFS[id].hides}, себе ${Math.round(REPORTER_DEFS[id].skims * 100)} из ста`,
      )
    }
  })
})

describe('Д2 и Д3: приукрашивание и утайка', () => {
  it('доброе растёт, дурное мельчает, часть подати не доходит', () => {
    const state = ruler()
    let gilded = 0
    let hidden = 0
    for (const one of holdingsOf(state.settlements, PLAYER)) {
      const said = reportedAt(state, world, one.locationId, 'tax', day)
      const truth = truthAt(state, one.locationId, 'tax')
      const saidBad = reportedAt(state, world, one.locationId, 'banditry', day)
      const truthBad = truthAt(state, one.locationId, 'banditry')
      if (said > truth) gilded += 1
      if (saidBad < truthBad) hidden += 1
    }
    const purse = purseAsReported(state, world, day)
    console.log(purse.says)
    console.log(
      `мест, где подать приукрашена: ${gilded}; где разбой написан мельче: ${hidden}; утекает ${skimTotal(state, world, day)} в месяц`,
    )
    expect(hidden).toBeGreaterThan(0)
    expect(skimTotal(state, world, day)).toBeGreaterThan(0)

    // Учёность хозяина сужает приукрашивание: считать умеют не все.
    const learned: GameState = {
      ...state,
      character: {
        ...state.character,
        skills: { ...state.character.skills, scholarship: { level: 40, xp: 0 } },
      },
    }
    // Берём место, где пишет не честный: у честного и сравнивать нечего.
    const first = holdingsOf(state.settlements, PLAYER).find(
      (one) => reporterAt(state, world, one.locationId, day)?.kind !== 'honest',
    )?.locationId as string
    console.log(
      `подать в отчёте (${world.locations[first]?.name}, ${reporterAt(state, world, first, day)?.kind}): без учёности ${reportedAt(state, world, first, 'tax', day)}, с учёностью 40 — ${reportedAt(learned, world, first, 'tax', day)}, на деле ${truthAt(state, first, 'tax')}`,
    )
    expect(reportedAt(learned, world, first, 'tax', day)).not.toBe(
      reportedAt(state, world, first, 'tax', day),
    )
  })
})

describe('Д4: ревизия', () => {
  it('стоит серебра, суток и отношений — и убирает руку', () => {
    const state = ruler()
    const thief = holdingsOf(state.settlements, PLAYER).find(
      (one) => skimAt(state, world, one.locationId, day) > 0,
    )
    if (!thief) return
    const before = auditOf(state, world, thief.locationId, day)
    console.log(`${world.locations[thief.locationId]?.name}: ${before?.says}`)
    const after = ok(applyCommand(state, { type: 'orderAudit', locationId: thief.locationId }))
    console.log(
      `${after.log[after.log.length - 1]?.text ?? ''} Память места ${placeRep(state.reputation, thief.locationId)} → ${placeRep(after.reputation, thief.locationId)}`,
    )
    // За те же шесть суток без ревизии казна прибывает: цену считаем разницей.
    let quiet = state
    for (let i = 0; i < REPORT.auditDays; i += 1) {
      quiet = ok(applyCommand(quiet, { type: 'rest', hours: 12 }))
      quiet = ok(applyCommand(quiet, { type: 'rest', hours: 12 }))
    }
    console.log(
      `за шесть суток: с ревизией казна ${Math.round(after.character.money)}, без неё ${Math.round(quiet.character.money)} — ревизия стоила ${Math.round(quiet.character.money - after.character.money)}`,
    )
    expect(after.character.money).toBeLessThan(quiet.character.money)
    expect(after.audits?.[thief.locationId]).toBeTruthy()
    // После ревизии он пишет как есть и руку убирает.
    const nextDay = day + REPORT.auditDays
    expect(skimAt(after, world, thief.locationId, nextDay)).toBe(0)
    expect(reportedAt(after, world, thief.locationId, 'tax', nextDay)).toBe(
      truthAt(after, thief.locationId, 'tax'),
    )
    // И память об этом не вечна.
    const later = nextDay + REPORT.auditMemoryYears * 365 + 10
    expect(skimAt(after, world, thief.locationId, later)).toBeGreaterThan(0)
  })
})

describe('Д6: отчёт как весть', () => {
  it('дошедший отчёт становится вестью со своим возрастом', () => {
    const state = ruler()
    const first = holdingsOf(state.settlements, PLAYER).find(
      (one) => one.locationId !== state.locationId,
    )
    if (!first) return
    const report = reportFrom(state, world, first.locationId, day)
    console.log(report?.says ?? 'отчёта нет')
    let run = state
    for (let i = 0; i < 40 && wordsTo(run, PLAYER).length === 0; i += 1) {
      run = ok(applyCommand(run, { type: 'rest', hours: 12 }))
      run = ok(applyCommand(run, { type: 'rest', hours: 12 }))
    }
    const words = wordsTo(run, PLAYER)
    console.log(`вестей от своих: ${words.length}, источник первой — ${words[0]?.source}`)
    expect(words.length).toBeGreaterThan(0)
    expect(words.every((one) => one.source === 'own')).toBe(true)

    const known = knownTo(run, world, PLAYER, { kind: 'stores', about: first.locationId }, day + 40)
    console.log(`о запасе в ${report?.name}: ${spreadWords(known)} — ${known.says}`)
    expect(known.source).toBe('own')
    expect(known.age).toBeGreaterThan(0)
  })
})
