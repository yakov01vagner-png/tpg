import { describe, expect, it } from 'vitest'
import type { Band } from '../src/band'
import { musterBands, tickBands } from '../src/band'
import { createCharacter } from '../src/character'
import type { Settlement } from '../src/economy'
import { createSettlements } from '../src/economy'
import { eraFor } from '../src/era'
import type { Word } from '../src/known'
import { bring } from '../src/known'
import { leagueAgainst } from '../src/league'
import { rollHarvest, tickDays } from '../src/life'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { theirWay } from '../src/theirway'
import { DAYS_PER_YEAR } from '../src/time'
import type { Politics } from '../src/war'
import { createPolitics, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 159: равновесие и век в прогоне.
 *
 * Мир живёт теми же тактами, какими его считает игра, и в нём смотрят на то,
 * ради чего затевалась версия: пути, гонка, коалиции и эпохи.
 */

interface Lived {
  readonly people: number
  readonly places: number
  readonly wars: number
  readonly leader: string
  readonly share: number
  readonly finished: number
  readonly leagues: number
  readonly eras: readonly string[]
  readonly ms: number
}

/** Век мира: те же такты, что в игре, плюс счёт путей раз в год. */
function lived(seed: number, years: number): Lived {
  const world = generateWorld(seed)
  let places: Readonly<Record<string, Settlement>> = createSettlements(world)
  const [start, owned] = createPolitics(world, places, createRng(seed))
  places = owned
  let politics: Politics = start
  let rng = createRng(1000 + seed)
  const [initial] = musterBands(politics, places, createRng(seed + 7))
  let bands: readonly Band[] = initial
  let wars = 0
  let words: readonly Word[] = []
  let leagues = 0
  let finished = 0
  const base = createGame(createCharacter({ name: 'Никто' }), seed, world)
  const began = Date.now()
  for (let day = 1; day <= years * DAYS_PER_YEAR; day += 1) {
    const life = tickDays(world, places, 1)
    places = life.settlements
    const turn = tickPolitics(world, politics, places, day, rng)
    politics = turn.politics
    places = turn.settlements
    rng = turn.rng
    wars += turn.events.filter((one) => one.type === 'warDeclared').length
    const march = tickBands(world, politics, places, bands, rng, day)
    bands = march.bands
    places = march.settlements
    politics = march.politics
    rng = march.rng
    if (day % DAYS_PER_YEAR === 0) {
      const year = rollHarvest(world, places, rng)
      places = year.settlements
      rng = year.rng
      // Раз в год мир смотрит на себя тем же кодом, каким на него смотрит игра.
      // Вести о чужом продвижении разносятся так же, как их разносит такт
      // молвы (этап 135): без них короны не знают, кого бояться, и коалиций
      // не складывается вовсе.
      const seen: GameState = { ...base, politics, settlements: places, bands, words }
      const rows = Object.keys(world.kingdoms).map((id) => ({
        id,
        share: theirWay(seen, world, id, day).share,
      }))
      for (const row of rows) if (row.share >= 1) finished += 1
      const ahead = [...rows].sort((a, b) => b.share - a.share)[0]
      if (ahead) {
        for (const who of Object.keys(world.kingdoms)) {
          if (who === ahead.id) continue
          words = bring(words, {
            id: `word:way:${ahead.id}:${who}:${day}`,
            to: who,
            kind: 'way',
            about: ahead.id,
            value: Math.round(ahead.share * 100),
            source: 'rumour',
            from: null,
            day,
          })
        }
      }
      const state: GameState = { ...base, politics, settlements: places, bands, words }
      if (leagueAgainst(state, world, day).against !== null) leagues += 1
    }
  }
  const state: GameState = { ...base, politics, settlements: places, bands, words }
  const rows = Object.keys(world.kingdoms)
    .map((id) => ({ id, share: theirWay(state, world, id, years * DAYS_PER_YEAR).share }))
    .sort((a, b) => b.share - a.share)
  const first = rows[0] as { id: string; share: number }
  const windows = [0, 1, 2].map((one) => eraFor(world, one))
  return {
    people: Math.round(Object.values(places).reduce((sum, one) => sum + one.population, 0)),
    places: Object.values(places).filter((one) => one.population > 0).length,
    wars,
    leader: world.kingdoms[first.id]?.name ?? first.id,
    share: Math.round(first.share * 100),
    finished,
    leagues,
    eras: windows.map((one) => `${one.id} на ${Math.round(one.day / 365)}-й год`),
    ms: Date.now() - began,
  }
}

describe('Пг1–Пг6: век с путями, гонкой и коалициями', () => {
  it('мир живёт двадцать лет и не вырождается', { timeout: 300000 }, () => {
    const rows = [1, 2, 3].map((seed) => ({ seed, ...lived(seed, 20) }))
    for (const row of rows) {
      console.log(
        `зерно ${row.seed}: людей ${row.people}, мест ${row.places}, войн ${row.wars}; ведёт ${row.leader} (${row.share} из ста), дошедших ${row.finished}, лет с коалицией ${row.leagues}; эпохи: ${row.eras.join(', ')}; счёт ${row.ms} мс`,
      )
      expect(row.people).toBeGreaterThan(100000)
      expect(row.places).toBeGreaterThan(100)
    }
    // Войн не меньше, чем было: равновесие не превращает век в тишину.
    expect(rows.every((one) => one.wars > 0)).toBe(true)
    // Детерминизм: из одного зерна выходит один и тот же век.
    const again = lived(1, 20)
    const first = rows[0] as (typeof rows)[number]
    console.log(`повтор зерна 1: людей ${again.people}, войн ${again.wars}, ведёт ${again.leader}`)
    expect(again.people).toBe(first.people)
    expect(again.wars).toBe(first.wars)
    expect(again.leader).toBe(first.leader)
  })
})
