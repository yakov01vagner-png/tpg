import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { QUARTERS, QUARTER_POPULATION } from '../src/content/quarters'
import { masterHires, masterOf } from '../src/craft'
import { coursesAt, jobsAt } from '../src/place'
import { activityOf, quarterFor, quartersOf, walkMinutes } from '../src/quarter'
import { schoolAt } from '../src/school'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 45: город изнутри.
 *
 * Большое место перестаёт быть одной карточкой: у города есть кварталы, в
 * каждом своё, переход между ними стоит минут, а деревня остаётся деревней.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function at(locationId: string, money = 3000): GameState {
  const base = createGame(createCharacter({ name: 'Т', money }), 1, world)
  return { ...base, locationId, quarter: quartersOf(base, locationId).length > 0 ? 'gate' : null }
}

const capital = world.kingdoms.reEstiz?.capitalId ?? ''
const village = Object.values(world.locations).find((one) => one.archetype === 'village')?.id ?? ''
const port = Object.values(world.locations).find((one) => one.archetype === 'port')?.id ?? ''

describe('У1: кварталы как места внутри места', () => {
  it('у столицы есть куда пойти: ворота, рынок, ряды, храм, школа, замок', () => {
    const quarters = quartersOf(at(capital), capital)
    console.log(`кварталы столицы: ${quarters.map((id) => QUARTERS[id].label).join(', ')}`)
    for (const id of ['gate', 'market', 'craft', 'temple', 'castle'] as const) {
      expect(quarters, id).toContain(id)
    }
    expect(quarters.includes('school')).toBe(schoolAt(world, capital) !== null)
    // В каждом квартале что-то делают.
    for (const id of quarters) expect(QUARTERS[id].hosts.length).toBeGreaterThan(0)
  })

  it('пристань есть у гавани и нет у сухопутного города', () => {
    if (port) expect(quartersOf(at(port), port)).toContain('harbour')
    const inland = Object.values(world.locations).find(
      (one) => one.archetype === 'city' && !one.shore,
    )
    if (inland) expect(quartersOf(at(inland.id), inland.id)).not.toContain('harbour')
  })

  it('перейти можно только в свой квартал, и приходят к воротам', () => {
    const state = at(capital)
    expect(state.quarter).toBe('gate')
    expect(applyCommand(state, { type: 'goQuarter', quarterId: 'harbour' }).ok).toBe(
      quartersOf(state, capital).includes('harbour'),
    )
    const moved = ok(applyCommand(state, { type: 'goQuarter', quarterId: 'market' }))
    expect(moved.quarter).toBe('market')
    // Дорога приводит к воротам следующего места, если оно делится.
    const road = world.roads[capital]?.[0]
    if (!road) return
    let walking = ok(applyCommand(moved, { type: 'travel', toLocationId: road.to }))
    for (let hour = 0; hour < 48 && walking.journey; hour += 1) {
      walking = ok(applyCommand(walking, { type: 'tick', minutes: 60 }))
    }
    expect(walking.locationId).toBe(road.to)
    expect(walking.quarter).toBe(quartersOf(walking, road.to).length > 0 ? 'gate' : null)
  })
})

describe('У2: люди по кварталам', () => {
  it('работа — на рынке, наставник — в школе, лорд — в замке', () => {
    const state = at(capital)
    expect(quarterFor(state, 'work', capital)).toBe('market')
    expect(quarterFor(state, 'lord', capital)).toBe('castle')
    expect(quarterFor(state, 'hire', capital)).toBe('gate')
    if (schoolAt(world, capital)) expect(quarterFor(state, 'learn', capital)).toBe('school')
    expect(activityOf({ type: 'work', jobId: 'x' })).toBe('work')
    expect(activityOf({ type: 'askForFief' })).toBe('lord')
    expect(activityOf({ type: 'sleep' })).toBeNull()
  })

  it('не в том квартале — отказ с указанием, куда идти; в том — дело идёт', () => {
    const state = at(capital)
    // Работа, на которую берут: у иных хозяев свой разбор (этап 50).
    const job = jobsAt(state).find((one) => masterHires(masterOf(capital, one), 0, 0).hires)
    expect(job).toBeDefined()
    if (!job) return
    const wrong = applyCommand(state, { type: 'work', jobId: job.id })
    expect(wrong.ok).toBe(false)
    if (!wrong.ok) {
      expect(wrong.code).toBe('elsewhere')
      expect(wrong.message).toContain('на рынке')
    }
    const there = ok(applyCommand(state, { type: 'goQuarter', quarterId: 'market' }))
    const done = applyCommand(there, { type: 'work', jobId: job.id })
    expect(done.ok, done.ok ? '' : done.message).toBe(true)
    // Наняться и спать можно у ворот; наставник ждёт в школе.
    expect(applyCommand(state, { type: 'sleep' }).ok).toBe(true)
    const course = coursesAt(state)[0]
    if (course && schoolAt(world, capital)) {
      const study = applyCommand(state, { type: 'study', courseId: course.id })
      expect(study.ok).toBe(false)
      if (!study.ok) expect(study.code).toBe('elsewhere')
    }
  })
})

describe('У3: время внутри города', () => {
  it('переход стоит минут, а не часов, и в столице дольше, чем в городке', () => {
    const state = at(capital)
    const moved = ok(applyCommand(state, { type: 'goQuarter', quarterId: 'market' }))
    expect(moved.time - state.time).toBe(walkMinutes(world, capital))
    expect(walkMinutes(world, capital)).toBeLessThanOrEqual(60)
    const town = Object.values(world.locations).find((one) => one.archetype === 'town')
    if (town) expect(walkMinutes(world, town.id)).toBeLessThan(walkMinutes(world, capital))
    // Второй раз в тот же квартал не ходят.
    expect(applyCommand(moved, { type: 'goQuarter', quarterId: 'market' }).ok).toBe(false)
  })
})

describe('У4: деревня остаётся деревней', () => {
  it('в деревне кварталов нет, и всё под рукой', () => {
    const state = at(village)
    expect(quartersOf(state, village)).toHaveLength(0)
    expect(state.quarter).toBeNull()
    expect(applyCommand(state, { type: 'goQuarter', quarterId: 'market' }).ok).toBe(false)
    const job = jobsAt(state)[0]
    if (job) {
      const done = applyCommand(state, { type: 'work', jobId: job.id })
      expect(done.ok, done.ok ? '' : done.message).toBe(true)
    }
    expect(quarterFor(state, 'work', village)).toBeNull()
  })

  it('делится только людное место: городок мельче порога — одна карточка', () => {
    const small = Object.values(world.locations).find(
      (one) => one.archetype === 'town' && one.population < QUARTER_POPULATION,
    )
    const big = Object.values(world.locations).find(
      (one) => one.archetype === 'town' && one.population >= QUARTER_POPULATION,
    )
    if (small) expect(quartersOf(at(small.id), small.id)).toHaveLength(0)
    if (big) expect(quartersOf(at(big.id), big.id).length).toBeGreaterThanOrEqual(2)
    console.log(
      `городок ${small?.name ?? '—'} (${small?.population ?? 0}) — без кварталов; ${big?.name ?? '—'} (${big?.population ?? 0}) — ${quartersOf(at(big?.id ?? ''), big?.id ?? '').length}`,
    )
  })
})
