import { describe, expect, it } from 'vitest'
import type { Band } from '../src/band'
import { musterBands, tickBands } from '../src/band'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { COMPANIES } from '../src/content/companies'
import { CONGRESS_QUESTIONS } from '../src/content/congress'
import { EMBASSY_DEFS } from '../src/content/embassy'
import { WARSHIP_DEFS } from '../src/content/navy'
import { OFFICES } from '../src/content/offices'
import { OVERTURE_DEFS } from '../src/content/overture'
import { ACCORD_DEFS, MEDIATOR_DEFS } from '../src/content/peace'
import { ENGINE_DEFS } from '../src/content/siege'
import { TREATY_DEFS } from '../src/content/treaties'
import type { Settlement } from '../src/economy'
import { createSettlements } from '../src/economy'
import { PLAYER, holdingsOf } from '../src/holding'
import { rollHarvest, tickDays } from '../src/life'
import { crownGame, strengthOf } from '../src/mind'
import { crownFleet } from '../src/navy'
import { coalitionAgainst, overturesOf, wordOf } from '../src/overture'
import { peaceChronicle } from '../src/peace'
import { createRng as createRngReal } from '../src/rng'
import { deserialize, serialize } from '../src/save'
import { SCHEMA_VERSION, createGame } from '../src/state'
import type { GameState } from '../src/state'
import { DAYS_PER_YEAR, WORLD_START } from '../src/time'
import { createPolitics, tickPolitics } from '../src/war'
import type { Politics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { worldGrid } from '../src/world/grid'
import { MAP_SIZE } from '../src/world/layout'

/**
 * Этап 98: век и бюджет 0.7.
 *
 * Версия закрывается тем же, чем закрывались 0.5 и 0.6: мир живёт без игрока
 * теми же тактами, что и с ним, детерминированно и в бюджете телефона. Здесь —
 * срез века с дипломатией, кампаниями и ИИ, счёт по содержимому и бюджет.
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
  readonly yielded: number
  readonly stormed: number
  readonly raids: number
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
  let yielded = 0
  let stormed = 0
  let raids = 0
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
      if (event.type === 'bandRaid') raids += 1
      if (event.type === 'bandTook') {
        if (event.yielded) yielded += 1
        else stormed += 1
      }
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
    yielded,
    stormed,
    raids,
    ms: Date.now() - began,
  }
}

describe('Б1: век на трёх зёрнах', () => {
  it('из одного зерна выходит один и тот же век', () => {
    const { ms: firstMs, ...first } = lived(1, 8)
    const { ms: secondMs, ...second } = lived(1, 8)
    console.log(
      `зерно 1, восемь лет: людей ${first.people}, мест ${first.places}, войн ${first.wars}, осад ${first.sieges} (сдач ${first.yielded}, приступов ${first.stormed}), набегов ${first.raids}, счёт ${firstMs} мс против ${secondMs} мс во втором прогоне`,
    )
    expect(second).toEqual(first)
  })

  it('мир не вырождается на трёх зёрнах', () => {
    for (const seed of [1, 2, 3]) {
      const run = lived(seed, 8)
      console.log(
        `зерно ${seed}: людей ${run.people}, мест ${run.places}, войн ${run.wars}, осад ${run.sieges}, взято ${run.yielded + run.stormed}`,
      )
      expect(run.people).toBeGreaterThan(100000)
      expect(run.places).toBeGreaterThan(100)
    }
  })
})

describe('Б2: дипломатия в числах века', () => {
  it('послы, обещания, коалиции и миры считаются', () => {
    const world = generateWorld(1)
    const [politics, settlements] = createPolitics(
      world,
      createSettlements(world),
      createRngReal(1),
    )
    const taken = Object.values(settlements)
      .filter((one) => one.population > 800)
      .slice(0, 4)
    const map = { ...settlements }
    for (const one of taken) map[one.locationId] = { ...one, owner: PLAYER }
    let state: GameState = {
      ...createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world),
      politics,
      settlements: map,
      locationId: taken[0]?.locationId ?? '',
      quarter: null,
      time: WORLD_START,
      realm: { name: 'Заречье', sinceDay: 1 },
    }
    let came = 0
    const seen = new Set<string>()
    for (let i = 0; i < 360; i += 1) {
      state = ok(applyCommand(state, { type: 'rest', hours: 12 }))
      state = ok(applyCommand(state, { type: 'rest', hours: 12 }))
      for (const one of overturesOf(state)) {
        if (seen.has(one.id)) continue
        seen.add(one.id)
        came += 1
      }
    }
    const coalition = coalitionAgainst(state, world, 360)
    const words = Object.keys(world.kingdoms).map((one) => wordOf(state, one, 360))
    console.log(
      `за год: чужих посольств ${came}, договоров в силе ${(state.treaties ?? []).length}, обещаний ${(state.pledges ?? []).length}, миров ${peaceChronicle(state, 360).made}; слово корон от ${Math.min(...words)} до ${Math.max(...words)}; ${coalition.says}`,
    )
    expect(came).toBeGreaterThan(0)
    expect(Math.max(...words)).toBeGreaterThan(0)
  })
})

describe('Б3: ИИ в числах века', () => {
  it('войны идут с целью, а осады кончаются по-разному', () => {
    const run = lived(1, 8)
    console.log(
      `за восемь лет: осад ${run.sieges}, из них сдачей ${run.yielded}, приступом ${run.stormed}; набегов ${run.raids}`,
    )
    expect(run.sieges).toBeGreaterThan(0)
    expect(run.yielded + run.stormed).toBeGreaterThan(0)

    // У каждой короны есть партия на годы, и она объяснима словами.
    const world = generateWorld(1)
    const [politics, settlements] = createPolitics(
      world,
      createSettlements(world),
      createRngReal(1),
    )
    const state: GameState = {
      ...createGame(createCharacter({ name: 'Смотритель' }), 1, world),
      politics,
      settlements,
    }
    const aims = Object.keys(world.kingdoms).map((one) => crownGame(state, world, one, 400))
    console.log(
      `партии корон: ${aims.map((one) => `${one.kingdomId} — ${one.aim}${one.able ? '' : ' (не по силам)'}`).join(', ')}`,
    )
    expect(aims.every((one) => one.steps.length > 0)).toBe(true)
    expect(new Set(aims.map((one) => one.aim)).size).toBeGreaterThan(1)
  })
})

describe('Б4: держава в числах', () => {
  it('партия игрока: от одного места до державы', () => {
    const world = generateWorld(1)
    const [politics, settlements] = createPolitics(
      world,
      createSettlements(world),
      createRngReal(1),
    )
    const first = Object.values(settlements)
      .filter((one) => one.population > 800)
      .slice(0, 1)[0]
    if (!first) return
    let state: GameState = {
      ...createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world),
      politics,
      settlements: { ...settlements, [first.locationId]: { ...first, owner: PLAYER } },
      locationId: first.locationId,
      quarter: null,
      time: WORLD_START,
      realm: { name: 'Заречье', sinceDay: 1 },
    }
    const began = Date.now()
    let revolts = 0
    let riots = 0
    for (let i = 0; i < 360; i += 1) {
      state = ok(applyCommand(state, { type: 'rest', hours: 12 }))
      state = ok(applyCommand(state, { type: 'rest', hours: 12 }))
      revolts += state.log.filter((one) => one.text.includes('знамёна')).length
      riots += state.log.filter((one) => one.text.includes('Хлебный бунт')).length
    }
    const mine = holdingsOf(state.settlements, PLAYER)
    console.log(
      `год державы: мест ${mine.length}, казна ${Math.round(state.character.money)}, мятежей ${revolts > 0 ? 'были' : 'не было'}, бунтов ${riots > 0 ? 'были' : 'не было'}; счёт ${Date.now() - began} мс на 360 суток`,
    )
    expect(mine.length).toBeGreaterThan(0)
    expect(state.over).toBeFalsy()
  })
})

describe('Б5: бюджет', () => {
  it('сутки ≤ 6 мс, час ≤ 1 мс, сетка ≤ 45 мс, сейв ≤ 1 МБ', { retry: 2 }, () => {
    const world = generateWorld(1)
    const [politics, settlements] = createPolitics(
      world,
      createSettlements(world),
      createRngReal(1),
    )
    const taken = Object.values(settlements)
      .filter((one) => one.population > 800)
      .slice(0, 8)
    const map = { ...settlements }
    for (const one of taken) map[one.locationId] = { ...one, owner: PLAYER }
    const rich: GameState = {
      ...createGame(createCharacter({ name: 'Ратша', money: 50000 }), 1, world),
      politics,
      settlements: map,
      locationId: taken[0]?.locationId ?? '',
      quarter: null,
      time: WORLD_START,
      realm: { name: 'Заречье', sinceDay: 1 },
    }
    // Меряется тем же способом, что и в 0.5 и 0.6 (этап 48): такт на сутки,
    // лучшее из двадцати пяти — цена работы, а не давки за счётом.
    let game = rich
    const dayMs = fastest(() => {
      game = ok(applyCommand(game, { type: 'tick', minutes: 24 * 60 }))
    }, 25)
    const hourMs = fastest(() => {
      game = ok(applyCommand(game, { type: 'tick', minutes: 60 }))
    }, 50)
    const gridMs = fastest(() => worldGrid(world, MAP_SIZE), 6)
    const save = serialize(game)
    const kb = Math.round(save.length / 1024)
    console.log(
      `сутки ${dayMs.toFixed(2)} мс, час ${hourMs.toFixed(2)} мс, сетка ${gridMs.toFixed(0)} мс, сейв ${kb} КБ, схема ${SCHEMA_VERSION}`,
    )
    expect(dayMs).toBeLessThan(6)
    expect(hourMs).toBeLessThan(1)
    expect(gridMs).toBeLessThan(45)
    expect(kb).toBeLessThan(1024)
    // Сейв читается обратно целиком.
    const back = deserialize(save)
    expect(back.ok).toBe(true)
  })
})

describe('Б5: старые сейвы', () => {
  it('сейв 0.6 поднимается: вся держава дописывается миграцией', () => {
    const world = generateWorld(1)
    const fresh = createGame(createCharacter({ name: 'Ратша', money: 300 }), 1, world)
    const old = JSON.parse(serialize(fresh)) as Record<string, unknown>
    // Сейв версии 0.6: всё, что появилось за 0.7, из него вынуто.
    const gone = [
      'oaths',
      'offices',
      'charters',
      'debts',
      'queue',
      'crowned',
      'claims',
      'embassies',
      'treaties',
      'marriages',
      'spies',
      'rumours',
      'congress',
      'congresses',
      'overtures',
      'pledges',
      'campaign',
      'dispatches',
      'garrisons',
      'navy',
      'blockades',
      'letter',
      'companies',
      'commission',
      'talks',
      'peaces',
      'grievances',
      'heirLaw',
      'pacts',
      'churchAnger',
      'censure',
    ]
    for (const key of gone) delete old[key]
    old.schemaVersion = 22
    const loaded = deserialize(JSON.stringify(old))
    if (!loaded.ok) throw new Error(loaded.error)
    const state = loaded.state
    const rows = state as unknown as Record<string, unknown>
    console.log(
      `сейв 0.6 поднят до схемы ${SCHEMA_VERSION}: полей дописано ${gone.filter((key) => rows[key] !== undefined).length} из ${gone.length}, рот в мире ${(state.companies ?? []).length}, закон о наследстве — ${state.heirLaw}`,
    )
    for (const key of gone) expect(rows[key], key).not.toBeUndefined()
    // Пустое — пустым, решение — решением, а роты были в мире и до тебя.
    expect(state.oaths).toEqual({})
    expect(state.peaces).toEqual([])
    expect(state.heirLaw).toBe('eldest')
    expect((state.companies ?? []).length).toBe(COMPANIES.length)
    expect((state.companies ?? []).every((one) => one.locationId !== '')).toBe(true)
    // И он продолжает играть.
    const moved = ok(applyCommand(state, { type: 'tick', minutes: 24 * 60 }))
    expect(moved.time).toBeGreaterThan(state.time)
  })
})

describe('Б6: контент числом', () => {
  it('всё, что версия обещала, посчитано', () => {
    const counts = {
      'поручения послам': Object.keys(EMBASSY_DEFS).length,
      договоры: Object.keys(TREATY_DEFS).length,
      'вопросы съездов': CONGRESS_QUESTIONS.length,
      'условия мира': Object.keys(ACCORD_DEFS).length,
      посредники: Object.keys(MEDIATOR_DEFS).length,
      роты: COMPANIES.length,
      должности: OFFICES.length,
      'осадные машины': Object.keys(ENGINE_DEFS).length,
      'боевые суда': Object.keys(WARSHIP_DEFS).length,
      'чужие предложения': Object.keys(OVERTURE_DEFS).length,
    }
    for (const [what, many] of Object.entries(counts)) console.log(`${what}: ${many}`)
    expect(counts['поручения послам']).toBeGreaterThanOrEqual(7)
    expect(counts.договоры).toBeGreaterThanOrEqual(4)
    expect(counts['вопросы съездов']).toBeGreaterThanOrEqual(5)
    expect(counts.роты).toBeGreaterThanOrEqual(6)
    expect(counts['боевые суда']).toBe(3)
  })

  it('флот корон выводится, а не хранится: он есть у всех, у кого есть гавани', () => {
    const world = generateWorld(1)
    const [politics, settlements] = createPolitics(
      world,
      createSettlements(world),
      createRngReal(1),
    )
    const state: GameState = {
      ...createGame(createCharacter({ name: 'Смотритель' }), 1, world),
      politics,
      settlements,
    }
    const fleets = Object.keys(world.kingdoms).map((one) => ({
      id: one,
      ships: crownFleet(state, world, one, 400).length,
      force: strengthOf(state, world, one, 400).score,
    }))
    console.log(
      `флоты корон: ${fleets.map((one) => `${one.id} — ${one.ships} судов, сила ${one.force}`).join('; ')}`,
    )
    expect(fleets.some((one) => one.ships > 0)).toBe(true)
  })
})
