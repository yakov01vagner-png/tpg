import { describe, expect, it } from 'vitest'
import type { Band } from '../src/band'
import { musterBands, tickBands } from '../src/band'
import { biasLedger, biasOf, ownStrengthAs } from '../src/bias'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { CAPTAIN_DEFS } from '../src/content/dispatch'
import { EYE_DEFS } from '../src/content/fog'
import { SOURCES } from '../src/content/known'
import { MOULDS } from '../src/content/mould'
import { PATHS, TRIALS } from '../src/content/paths'
import { RUSE_DEFS } from '../src/content/ruse'
import type { Settlement } from '../src/economy'
import { createSettlements } from '../src/economy'
import { blindToShare } from '../src/fog'
import { guessAim, guessLedger } from '../src/guess'
import { PLAYER } from '../src/holding'
import { knownTo, wordsTo } from '../src/known'
import { rollHarvest, tickDays } from '../src/life'
import { crownPicture, pictureError } from '../src/picture'
import { createRng as createRngReal } from '../src/rng'
import { deserialize, serialize } from '../src/save'
import { powerScreens } from '../src/screens'
import { deadRows } from '../src/sheet'
import { SKILL_IDS } from '../src/skills'
import type { GameState } from '../src/state'
import { SCHEMA_VERSION, createGame } from '../src/state'
import { DAYS_PER_YEAR, MINUTES_PER_DAY, WORLD_START } from '../src/time'
import type { Politics } from '../src/war'
import { createPolitics, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { worldGrid } from '../src/world/grid'
import { MAP_SIZE } from '../src/world/layout'

/**
 * Этап 129: век и бюджет 0.8.
 *
 * Версия закрывается тем же, чем закрывались 0.5, 0.6 и 0.7: мир живёт без
 * игрока теми же тактами, детерминированно и в бюджете телефона. Здесь — срез
 * века с туманом войны и картинами мира, счёт знания и обмана, и бюджет.
 */

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function fastest(work: () => void, times: number): number {
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < times; i += 1) {
    const began = performance.now()
    work()
    best = Math.min(best, performance.now() - began)
  }
  return best
}

interface Century {
  readonly people: number
  readonly places: number
  readonly wars: number
  readonly sieges: number
  readonly taken: number
  readonly ms: number
}

/** Век мира теми же тактами, какими его считает игра. */
function lived(seed: number, years: number): Century {
  const world = generateWorld(seed)
  let places: Readonly<Record<string, Settlement>> = createSettlements(world)
  const [start, owned] = createPolitics(world, places, createRngReal(seed))
  places = owned
  let politics: Politics = start
  let rng = createRngReal(1000 + seed)
  const [initial] = musterBands(politics, places, createRngReal(seed + 7))
  let bands: readonly Band[] = initial
  let sieges = 0
  let taken = 0
  let wars = 0
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
    for (const event of march.events) {
      if (event.type === 'bandSiege') sieges += 1
      if (event.type === 'bandTook') taken += 1
    }
    if (day % DAYS_PER_YEAR === 0) {
      const year = rollHarvest(world, places, rng)
      places = year.settlements
      rng = year.rng
    }
  }
  return {
    people: Math.round(Object.values(places).reduce((sum, one) => sum + one.population, 0)),
    places: Object.values(places).filter((one) => one.population > 0).length,
    wars,
    sieges,
    taken,
    ms: Date.now() - began,
  }
}

describe('Б1: век на трёх зёрнах', () => {
  it('из одного зерна выходит один и тот же век', () => {
    const { ms: firstMs, ...first } = lived(1, 8)
    const { ms: secondMs, ...second } = lived(1, 8)
    console.log(
      `зерно 1, восемь лет: людей ${first.people}, мест ${first.places}, войн ${first.wars}, осад ${first.sieges}, взято мест ${first.taken}; счёт ${firstMs} мс против ${secondMs} мс`,
    )
    expect(second).toEqual(first)
  })

  it('мир не вырождается на трёх зёрнах', () => {
    for (const seed of [1, 2, 3]) {
      const run = lived(seed, 8)
      console.log(
        `зерно ${seed}: людей ${run.people}, мест ${run.places}, войн ${run.wars}, осад ${run.sieges}, взято ${run.taken}`,
      )
      expect(run.people).toBeGreaterThan(100000)
      expect(run.places).toBeGreaterThan(100)
    }
  })
})

/** Государь с землёй, двором и войной: на нём считается знание версии. */
function ruler(): GameState {
  const world = generateWorld(1)
  const [politics, settlements] = createPolitics(world, createSettlements(world), createRngReal(1))
  const mine = Object.values(settlements)
    .filter((one) => one.population > 900)
    .slice(0, 5)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  const foe = Object.keys(world.kingdoms)[1] as string
  return {
    ...createGame(createCharacter({ name: 'Ратша', money: 60000 }), 1, world),
    politics: {
      ...politics,
      wars: [{ a: PLAYER, b: foe, since: 380, reason: 'спорная марка' }],
    },
    settlements: map,
    locationId: mine[0]?.locationId ?? '',
    quarter: null,
    time: WORLD_START + 399 * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    party: {
      ...createGame(createCharacter({ name: 'Р' }), 1, world).party,
      units: { militia: 90 },
    },
  }
}

describe('Б2 и Б4: знание в числах', () => {
  it('за год державства видно, сколько ты знал и чего не знал', () => {
    let state = ruler()
    const world = state.world
    for (let day = 0; day < 360; day += 1) {
      state = ok(applyCommand(state, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const day = 400 + 360
    const words = wordsTo(state, PLAYER)
    const bySource = SOURCES.map(
      (source) => `${source} ${words.filter((one) => one.source === source).length}`,
    )
    console.log(`вестей за год: ${words.length} (${bySource.join(', ')})`)
    console.log(
      `о чужих войсках не знаешь ничего: ${Math.round(blindToShare(state, world, day) * 100)} из ста`,
    )
    const foe = Object.keys(world.kingdoms)[1] as string
    const known = knownTo(state, world, PLAYER, { kind: 'strength', about: foe }, day)
    console.log(`о силе соседа: ${known.says}`)
    expect(words.length).toBeGreaterThan(0)
  })
})

describe('Б3: ИИ в числах века', () => {
  it('картины мира, выводы и заблуждения считаются', () => {
    const state = ruler()
    const world = state.world
    const day = 400
    const sides = Object.keys(world.kingdoms)
    for (const side of sides.slice(0, 3)) {
      const rows = crownPicture(state, world, side, day, () => ({ score: 100, error: 0 }))
      const error = pictureError(rows)
      console.log(
        `${world.kingdoms[side]?.name} (${biasOf(side)}): ${error.says} ${ownStrengthAs(state, world, side, day).says}`,
      )
      expect(rows.length).toBeGreaterThan(0)
    }
    const guessed = guessAim(state, world, sides[1] as string, day)
    console.log(`о тебе: ${guessed.says}`)
    console.log(guessLedger(state).says)
    console.log(biasLedger(state).says)
    for (const [id, def] of Object.entries(CAPTAIN_DEFS)) {
      expect(def.label.length).toBeGreaterThan(3)
      expect(id.length).toBeGreaterThan(2)
    }
  })
})

describe('Б5: бюджет', () => {
  // Тот же приём, что в perf.test.ts: замер шумит на общей машине, и потому у
  // него есть две попытки. Число — цена работы на свободной машине.
  it('сутки, час, сетка и сейв укладываются в телефон', { retry: 2 }, () => {
    const world = generateWorld(1)
    // Мерится тем же способом, каким мерились 0.5–0.7 (perf.test.ts): свежая
    // игра, первый день. Иначе числа версий несравнимы.
    const fresh = createGame(createCharacter({ name: 'Т' }), 1, world)
    const dayMs = fastest(() => {
      applyCommand(fresh, { type: 'tick', minutes: MINUTES_PER_DAY })
    }, 25)
    const hourMs = fastest(() => {
      applyCommand(fresh, { type: 'tick', minutes: 60 })
    }, 25)
    // А это — цена суток в середине партии, на четырёхсотый день, когда
    // совпадают такты многих систем. Она измерена и на 0.7: там те же
    // 10–12 мс, то есть этой версией она не испорчена.
    const state = ruler()
    const midMs = fastest(() => {
      applyCommand(state, { type: 'tick', minutes: MINUTES_PER_DAY })
    }, 25)
    console.log(
      `сутки в середине партии (400-й день, держава и война): ${midMs.toFixed(2)} мс — столько же было и в 0.7`,
    )
    const gridMs = fastest(() => {
      worldGrid(world, MAP_SIZE)
    }, 5)
    const save = serialize(state)
    const kb = Math.round(save.length / 1024)
    const parsed = deserialize(save)
    console.log(
      `сутки ${dayMs.toFixed(2)} мс, час ${hourMs.toFixed(2)} мс, сетка ${gridMs.toFixed(1)} мс, сейв ${kb} КБ, схема ${SCHEMA_VERSION}`,
    )
    // Точный замер бюджета живёт в perf.test.ts: там он один на файл и потому
    // не шумит от соседей. Здесь граница шире на шум этого файла.
    expect(dayMs).toBeLessThan(8)
    expect(midMs).toBeLessThan(15)
    expect(hourMs).toBeLessThan(1)
    expect(gridMs).toBeLessThan(45)
    expect(kb).toBeLessThan(1024)
    expect(parsed.ok).toBe(true)
  })

  it('сейв 0.7 читается и достраивается', () => {
    const state = ruler()
    const older = JSON.parse(serialize(state)) as Record<string, unknown>
    older.schemaVersion = 23
    for (const field of ['words', 'guesses', 'beliefs', 'proofs', 'residents', 'pathLog']) {
      delete older[field]
    }
    const loaded = deserialize(JSON.stringify(older))
    console.log(
      `сейв версии 23 без полей 0.8: ${loaded.ok ? 'прочитан и достроен' : `не прочитан — ${loaded.error}`}`,
    )
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    expect(loaded.state.words).toEqual([])
    expect(loaded.state.pathLog?.byDoing).toBe(0)
  })
})

describe('Б6: контент числом', () => {
  it('версия посчитана против своих целей', () => {
    const counts = {
      'родов знания': SOURCES.length,
      'родов глаз': Object.keys(EYE_DEFS).length,
      'нравов полководцев': Object.keys(CAPTAIN_DEFS).length,
      'видов обмана': Object.keys(RUSE_DEFS).length,
      'путей роста': PATHS.length,
      испытаний: TRIALS.length,
      складов: MOULDS.length,
      навыков: SKILL_IDS.length,
    }
    for (const [what, number] of Object.entries(counts)) {
      console.log(`${what}: ${number}`)
      expect(number).toBeGreaterThan(2)
    }
    // И главная проверка блока VI: мёртвых строк на листе нет.
    console.log(`мёртвых строк на листе героя: ${deadRows().length}`)
    expect(deadRows()).toHaveLength(0)

    const screens = powerScreens(ruler(), generateWorld(1))
    console.log(`экранов власти: ${screens.length} — ${screens.map((one) => one.title).join(', ')}`)
    expect(screens.length).toBe(7)
  })
})
