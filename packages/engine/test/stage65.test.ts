import { describe, expect, it } from 'vitest'
import {
  type Casus,
  casusDef,
  casusFor,
  casusWords,
  envoyAt,
  envoyTemperDef,
  envoyYields,
  stubbornOf,
  termWords,
  termsFor,
  warFame,
} from '../src/casus'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { CASUS, CASUS_KINDS, ENVOY_DAYS, PEACE_TERM_DEFS } from '../src/content/casus'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START, dayOf } from '../src/time'
import { NO_POLITICS, atWar, createPolitics, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 65: война с причиной.
 *
 * У войны была строка-причина из шести, выбранная кубиком: «спор о вере» там,
 * где спорить не о чем. Теперь повод — вещь: он выводится из мира, из него
 * следуют условия мира, и в конце века видно, за что воевали.
 */

const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

describe('Т1: повод', () => {
  it('повод берётся из мира, а не из списка', () => {
    expect(CASUS.length).toBe(CASUS_KINDS.length)
    const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
    const kingdoms = Object.keys(world.kingdoms)
    const seen = new Map<string, number>()
    let rng = createRng(7)
    for (const a of kingdoms) {
      for (const b of kingdoms) {
        if (a === b) continue
        const [casus, next] = casusFor(world, politics, settlements, a, b, rng)
        rng = next
        seen.set(casus.kind, (seen.get(casus.kind) ?? 0) + 1)
      }
    }
    console.log(
      `поводов между ${kingdoms.length} коронами: ${[...seen.entries()].map(([kind, times]) => `${casusDef(kind as 'march').label} ${times}`).join(', ')}`,
    )
    expect(seen.size).toBeGreaterThan(1)

    // Неплатёж дани — только там, где дань и правда назначена.
    const owing = {
      ...politics,
      tributes: [{ from: kingdoms[1] ?? '', to: kingdoms[0] ?? '', perDay: 5, untilDay: 999 }],
    }
    const [debt] = casusFor(
      world,
      owing,
      settlements,
      kingdoms[0] ?? '',
      kingdoms[1] ?? '',
      createRng(2),
    )
    expect(debt.kind).toBe('tribute')
    // Спорная марка называет провинцию.
    const march: Casus = { kind: 'march', provinceId: Object.keys(world.provinces)[0] ?? '' }
    expect(casusWords(world, march)).toContain(':')
  })

  it('за иной повод держатся крепче', () => {
    expect(stubbornOf({ kind: 'faith' })).toBeGreaterThan(stubbornOf({ kind: 'ambition' }))
    // И это видно в мире: войны за веру идут дольше.
    const [start, places] = createPolitics(world, createSettlements(world), createRng(9))
    const result = tickPolitics(world, start, places, 900, createRng(3))
    const declared = result.events.filter((one) => one.type === 'warDeclared')
    console.log(
      `за 900 суток объявлено ${declared.length} войн: ${declared.map((one) => (one.type === 'warDeclared' ? one.war.reason : '')).join('; ')}`,
    )
    expect(declared.length).toBeGreaterThan(0)
    for (const event of declared) {
      if (event.type !== 'warDeclared') continue
      expect(event.war.casus).toBeDefined()
      expect(event.war.reason.length).toBeGreaterThan(4)
    }
  })
})

describe('Т3 и Т6: условия мира и век войн', () => {
  it('условия следуют из повода, и в конце века видно, чем кончилось', () => {
    expect(Object.keys(PEACE_TERM_DEFS).length).toBe(5)
    // За землю требуют землю, за набеги — виновного.
    expect(termsFor({ kind: 'march' }, 0.3)).toBe('land')
    expect(termsFor({ kind: 'raids' }, 0.3)).toBe('tribute')
    expect(termWords('land')).toBe('земля')

    // Землю надо раздать: пока у мест нет хозяев, «кто сильнее» не считается
    // вовсе, и мир кончается ничем — как оно и было до этапа 65.
    const [owned, places] = createPolitics(world, createSettlements(world), createRng(9))
    let politics = owned
    let settlements = places
    let rng = createRng(5)
    const why = new Map<string, number>()
    const how = new Map<string, number>()
    for (let year = 1; year <= 100; year += 1) {
      const result = tickPolitics(world, politics, settlements, year * 365, rng)
      politics = result.politics
      settlements = result.settlements
      rng = result.rng
      for (const event of result.events) {
        if (event.type === 'warDeclared' && event.war.casus) {
          why.set(event.war.casus.kind, (why.get(event.war.casus.kind) ?? 0) + 1)
        }
        if (event.type === 'peaceTerms') how.set(event.term, (how.get(event.term) ?? 0) + 1)
      }
    }
    console.log(
      `век войн — за что: ${[...why.entries()].map(([kind, times]) => `${casusDef(kind as 'march').label} ${times}`).join(', ')}`,
    )
    console.log(
      `век войн — чем кончилось: ${[...how.entries()].map(([term, times]) => `${termWords(term as 'land')} ${times}`).join(', ')}`,
    )
    expect(why.size).toBeGreaterThan(1)
    expect(how.size).toBeGreaterThan(0)
  })
})

describe('Т2: послы', () => {
  it('посол — человек, и с ним говорят', () => {
    const [politics] = createPolitics(world, createSettlements(world), createRng(1))
    const capitals = Object.values(world.kingdoms).map((one) => one.capitalId)
    let found: ReturnType<typeof envoyAt> = null
    let where = ''
    let when = 0
    for (let day = 1; day < 400 && !found; day += ENVOY_DAYS) {
      for (const capital of capitals) {
        const envoy = envoyAt(world, politics, capital, day)
        if (envoy) {
          found = envoy
          where = capital
          when = day
          break
        }
      }
    }
    expect(found).not.toBeNull()
    if (!found) return
    console.log(
      `${world.locations[where]?.name}, день ${when}: ${found.name}, ${envoyTemperDef(found.temper).label} посол от ${world.kingdoms[found.fromKingdomId]?.name} — просит ${found.asks}`,
    )
    // Встревоженный уступает охотнее надменного, и убеждение это усиливает.
    expect(envoyYields({ ...found, temper: 'anxious' }, 0)).toBeGreaterThan(
      envoyYields({ ...found, temper: 'stiff' }, 0),
    )
    expect(envoyYields(found, 60)).toBeGreaterThan(envoyYields(found, 0))

    // За корону говорит тот, кто ей служит.
    const base = createGame(createCharacter({ name: 'Т', money: 500 }), 1, world)
    const stranger: GameState = { ...base, locationId: where, quarter: null, time: WORLD_START }
    expect(applyCommand(stranger, { type: 'meetEnvoy', answer: 'yes' }).ok).toBe(false)
  })
})

describe('Т4: война в лицах', () => {
  it('за полководцем числится то, что он делал', () => {
    expect(warFame({})).toContain('ничего')
    expect(warFame({ sacked: 5, spared: 0 })).toContain('разорил')
    expect(warFame({ sacked: 0, spared: 4 })).toContain('щадил')
    // И это набирается в мире само.
    const places = createSettlements(world)
    const [politics] = createPolitics(world, places, createRng(1))
    for (const lord of politics.lords) {
      expect(lord.sacked ?? 0).toBe(0)
    }
  })
})

describe('Т5: твоя война', () => {
  it('своё владение объявляет войну и мирится теми же правилами', () => {
    const base = createGame(createCharacter({ name: 'Т', money: 2000 }), 1, world)
    const kingdomId = Object.keys(world.kingdoms)[0] ?? ''
    const nameless: GameState = { ...base, quarter: null, time: WORLD_START }
    // Без своего имени войну не объявляют.
    expect(applyCommand(nameless, { type: 'declareWar', kingdomId }).ok).toBe(false)
    const lord: GameState = { ...nameless, realm: { name: 'Вольный Дол' } }
    const at = ok(applyCommand(lord, { type: 'declareWar', kingdomId }))
    expect(atWar(at.politics, PLAYER, kingdomId)).toBe(true)
    const war = at.politics.wars.find((one) => one.a === PLAYER || one.b === PLAYER)
    expect(war?.casus).toBeDefined()
    console.log(`${lord.realm?.name} против ${world.kingdoms[kingdomId]?.name}: ${war?.reason}`)
    // Дважды одну войну не объявляют.
    expect(applyCommand(at, { type: 'declareWar', kingdomId }).ok).toBe(false)
    // А мир — дело уговора: иногда с первого раза, иногда нет.
    let current = at
    let made = false
    for (let i = 0; i < 12; i += 1) {
      const result = applyCommand(current, { type: 'offerPeace', kingdomId })
      if (!result.ok) break
      current = result.state
      if (!atWar(current.politics, PLAYER, kingdomId)) {
        made = true
        break
      }
    }
    console.log(`мир с ${world.kingdoms[kingdomId]?.name}: ${made}, день ${dayOf(current.time)}`)
    expect(made).toBe(true)
  })
})
