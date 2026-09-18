import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { CHAINS } from '../src/content/chains'
import { JOBS } from '../src/content/jobs'
import { SITES } from '../src/content/sites'
import { jobsAt } from '../src/place'
import { createRng } from '../src/rng'
import { deserialize, serialize } from '../src/save'
import type { GameState } from '../src/state'
import { SCHEMA_VERSION, createGame } from '../src/state'
import { generateWorld } from '../src/world/generate'
import { isSettlement, isSite } from '../src/world/types'
import type { SiteKind } from '../src/world/types'

/**
 * Этап 21: что делать в глуши.
 *
 * Место без жителей перестало быть перевалочным пунктом: там ночуют, там
 * работают руками, и там есть что найти — один раз.
 */
const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function at(kind: SiteKind, money = 100): GameState | null {
  const site = Object.values(world.locations).find((one) => one.archetype === kind)
  if (!site) return null
  const base = createGame(createCharacter({ name: 'Т', money }), 1, world)
  return { ...base, locationId: site.id }
}

describe('ночёвка под небом', () => {
  it('сутки вне поселения — это сутки: лагерь снимает усталость и идёт время', () => {
    const state = at('grove')
    if (!state) return
    const tired: GameState = {
      ...state,
      character: { ...state.character, fatigue: 80 },
    }
    const after = ok(applyCommand(tired, { type: 'camp' }))
    expect(after.character.fatigue).toBeLessThan(80)
    expect(after.time - tired.time).toBeGreaterThanOrEqual(8 * 60)
    expect(after.character.skills.survival.xp).toBeGreaterThan(0)
  })

  it('под крышей лагерем не встают', () => {
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    const result = applyCommand(base, { type: 'camp' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('unavailableHere')
  })

  it('ночь в глуши бывает недоброй', () => {
    const state = at('wilds')
    if (!state) return
    let met = 0
    for (let seed = 1; seed <= 40; seed += 1) {
      const after = applyCommand({ ...state, rng: createRng(seed) }, { type: 'camp' })
      if (!after.ok) continue
      const said = after.events.map((one) => ('text' in one ? String(one.text) : '')).join(' ')
      if (said.includes('Разбойники') || said.includes('дороге ждали')) met += 1
    }
    console.log(`ночей с гостями из 40: ${met}`)
    expect(met).toBeGreaterThan(0)
  })
})

describe('работа земли', () => {
  it('восемь работ живут только там, где не живут люди', () => {
    const wild = JOBS.filter((job) =>
      job.where?.archetypes?.some((kind) => !isSettlement(kind)),
    )
    expect(wild.length).toBeGreaterThanOrEqual(8)
    for (const job of wild) {
      for (const kind of job.where?.archetypes ?? []) {
        expect(isSite(kind), `${job.id} просится в поселение`).toBe(true)
      }
    }
  })

  it('на каменоломне бьют камень, а в бору ставят силки', () => {
    const quarry = at('quarry')
    const grove = at('grove')
    if (quarry) expect(jobsAt(quarry).map((one) => one.id)).toContain('breakStone')
    if (grove) expect(jobsAt(grove).map((one) => one.id)).toContain('trapFurs')
    if (quarry) expect(jobsAt(quarry).map((one) => one.id)).not.toContain('trapFurs')
  })

  it('за работу в глуши платят и учат', () => {
    const state = at('quarry')
    if (!state) return
    const after = ok(applyCommand(state, { type: 'work', jobId: 'breakStone' }))
    expect(after.character.money).toBeGreaterThan(state.character.money)
    expect(after.character.skills.hardLabour.xp).toBeGreaterThan(0)
  })
})

describe('что лежит в земле', () => {
  it('находка одна на место: второй раз искать нечего', () => {
    const state = at('spring')
    if (!state) return
    const skilled: GameState = {
      ...state,
      character: {
        ...state.character,
        skills: { ...state.character.skills, survival: { level: 14, xp: 0 } },
      },
    }
    const after = ok(applyCommand(skilled, { type: 'search' }))
    expect(after.searchedSites).toContain(state.locationId)
    const again = applyCommand(after, { type: 'search' })
    expect(again.ok).toBe(false)
  })

  it('умелый находит чаще неумелого', () => {
    const state = at('barrow')
    if (!state) return
    const tries = (level: number): number => {
      let found = 0
      for (let seed = 1; seed <= 40; seed += 1) {
        const one: GameState = {
          ...state,
          rng: createRng(seed),
          character: {
            ...state.character,
            skills: { ...state.character.skills, survival: { level, xp: 0 } },
          },
        }
        const after = applyCommand(one, { type: 'search' })
        if (!after.ok) continue
        const said = after.events.map((e) => ('text' in e ? String(e.text) : '')).join(' ')
        if (said.includes('Взято')) found += 1
      }
      return found
    }
    const master = tries(16)
    const novice = tries(1)
    console.log(`нашли из 40: умелый ${master}, неумелый ${novice}`)
    expect(master).toBeGreaterThan(novice)
  })

  it('разрытый курган округа не забудет', () => {
    const state = at('barrow')
    if (!state) return
    const skilled: GameState = {
      ...state,
      character: {
        ...state.character,
        skills: { ...state.character.skills, survival: { level: 18, xp: 0 } },
      },
    }
    for (let seed = 1; seed <= 30; seed += 1) {
      const after = applyCommand({ ...skilled, rng: createRng(seed) }, { type: 'search' })
      if (!after.ok) continue
      const said = after.events.map((e) => ('text' in e ? String(e.text) : '')).join(' ')
      if (!said.includes('Взято')) continue
      expect(after.state.reputation.places[state.locationId] ?? 0).toBeLessThan(0)
      return
    }
  })

  it('у каждого вида места, где есть что искать, находка описана словами', () => {
    for (const def of Object.values(SITES)) {
      if (!def.find) continue
      expect(def.find.text.length).toBeGreaterThan(20)
      expect(def.find.money || def.find.good).toBeTruthy()
    }
  })
})

describe('поручения вне стен', () => {
  it('есть цепочки, чьи шаги ведут в глушь', () => {
    const outside = CHAINS.filter((chain) =>
      chain.steps.some((step) => step.type === 'visit' && isSite(step.archetype)),
    )
    expect(outside.length).toBeGreaterThanOrEqual(4)
  })
})

describe('сейв', () => {
  it('старый герой ещё нигде не искал', () => {
    const state = createGame(createCharacter({ name: 'Т' }), 1, world)
    const saved = JSON.parse(serialize(state)) as Record<string, unknown>
    saved.searchedSites = undefined
    saved.schemaVersion = 15
    const loaded = deserialize(JSON.stringify(saved))
    if (!loaded.ok) throw new Error(loaded.error)
    expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(loaded.state.searchedSites).toEqual([])
  })
})
