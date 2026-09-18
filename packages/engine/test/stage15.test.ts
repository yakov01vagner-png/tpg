import { describe, expect, it } from 'vitest'
import { lordSays, lordStance } from '../src/audience'
import { buildCharacterDraft, templateOptionIds } from '../src/biography'
import { createCharacter } from '../src/character'
import { applyCommand, companionsAt } from '../src/commands'
import { hireCompanion } from '../src/companion'
import { BIOGRAPHY } from '../src/content/biography'
import { CHAINS } from '../src/content/chains'
import { COMPANIONS } from '../src/content/companions'
import { COURSES } from '../src/content/courses'
import { JOBS } from '../src/content/jobs'
import { TEMPER_LINES } from '../src/content/lines'
import { PLAYER } from '../src/holding'
import { withLordRep } from '../src/reputation'
import { deserialize, serialize } from '../src/save'
import { SKILL_IDS } from '../src/skills'
import type { GameState } from '../src/state'
import { SCHEMA_VERSION, createGame } from '../src/state'
import { generateWorld } from '../src/world/generate'
import { kingdomOf } from '../src/world/queries'

const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const texts = (result: ReturnType<typeof applyCommand>): string[] =>
  result.ok
    ? result.events.map((event) => ('text' in event ? String(event.text) : '')).filter(Boolean)
    : []

describe('спутник говорит', () => {
  it('у каждого нрава есть слова на дорогу, в бой и на прощание', () => {
    for (const lines of Object.values(TEMPER_LINES)) {
      expect(lines.onRoad.length).toBeGreaterThan(0)
      expect(lines.inBattle.length).toBeGreaterThan(0)
      expect(lines.leaving.length).toBeGreaterThan(0)
    }
  })

  it('хлеб голодным: набожный говорит и теплеет', () => {
    const base = createGame(createCharacter({ name: 'Т', money: 100 }), 1, world)
    const here = base.settlements[base.locationId]
    if (!here) throw new Error('нет места')
    const alina = hireCompanion(COMPANIONS.alina as NonNullable<(typeof COMPANIONS)['alina']>)
    const hungry: GameState = {
      ...base,
      companions: [alina],
      character: { ...base.character, inventory: { grain: 40 } },
      settlements: {
        ...base.settlements,
        [base.locationId]: { ...here, stock: { ...here.stock, grain: 0, fish: 0 } },
      },
    }
    const result = applyCommand(hungry, { type: 'giveFood', amount: 20 })
    const after = ok(result)
    expect(after.companions[0]?.mood ?? 0).toBeGreaterThan(alina.mood)
    expect(texts(result).some((line) => line.startsWith('Алина из Скита: «'))).toBe(true)
  })

  it('брошенное дело: гордый теряет расположение, а на дне — уходит со словами', () => {
    const base = createGame(createCharacter({ name: 'Т', money: 100 }), 1, world)
    const sigvald = {
      ...hireCompanion(COMPANIONS.sigvald as NonNullable<(typeof COMPANIONS)['sigvald']>),
      mood: 20,
    }
    const state: GameState = {
      ...base,
      companions: [sigvald],
      quests: [
        {
          id: 'q',
          type: 'clearBandits',
          issuerLocationId: base.locationId,
          targetLocationId: base.locationId,
          amount: 0,
          reward: 10,
          deadlineDay: 99,
          progress: 0,
        },
      ],
    }
    const result = applyCommand(state, { type: 'abandonQuest', questId: 'q' })
    const after = ok(result)
    expect(after.companions).toHaveLength(0)
    expect(texts(result).some((line) => line.includes('уходит'))).toBe(true)
  })
})

describe('спутники вдвое', () => {
  it('двадцать, и у половины — своя корона', () => {
    expect(Object.keys(COMPANIONS)).toHaveLength(20)
    expect(Object.values(COMPANIONS).filter((def) => def.kingdomId).length).toBe(10)
  })

  it('человек одной короны не встречается на чужой земле', () => {
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    const reEstizCapital = world.kingdoms.reEstiz?.capitalId ?? ''
    const durHazadCapital = world.kingdoms.durHazad?.capitalId ?? ''
    const there = companionsAt({ ...base, locationId: durHazadCapital }).map((def) => def.id)
    const here = companionsAt({ ...base, locationId: reEstizCapital }).map((def) => def.id)
    expect(there).toContain('grimbold')
    expect(here).not.toContain('grimbold')
  })

  it('пленного спутника можно выкупить', () => {
    const base = createGame(createCharacter({ name: 'Т', money: 500 }), 1, world)
    const bran = {
      ...hireCompanion(COMPANIONS.bran as NonNullable<(typeof COMPANIONS)['bran']>),
      captive: true,
    }
    const freed = ok(
      applyCommand(
        { ...base, companions: [bran] },
        { type: 'ransomCompanion', companionId: 'bran' },
      ),
    )
    expect(freed.companions[0]?.captive).toBe(false)
    expect(freed.character.money).toBe(400)
  })
})

describe('лорд говорит', () => {
  it('чужак, друг, враг, вассал — разные слова', () => {
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    const lord = base.politics.lords.find((one) => one.kingdomId === 'reEstiz')
    if (!lord) throw new Error('нет лорда')
    expect(lordStance(base, lord)).toBe('stranger')
    const friend: GameState = { ...base, reputation: withLordRep(base.reputation, lord.id, 40) }
    expect(lordStance(friend, lord)).toBe('friend')
    const hated: GameState = { ...base, reputation: withLordRep(base.reputation, lord.id, -30) }
    expect(lordStance(hated, lord)).toBe('hostile')
    const vassal: GameState = {
      ...base,
      politics: {
        ...base.politics,
        lords: base.politics.lords.map((one) =>
          one.id === lord.id ? { ...one, kingdomId: PLAYER } : one,
        ),
      },
    }
    const asVassal = vassal.politics.lords.find((one) => one.id === lord.id)
    if (!asVassal) throw new Error('нет лорда')
    expect(lordStance(vassal, asVassal)).toBe('vassal')
    expect(lordSays(base, lord, 3)).not.toBe(lordSays(friend, lord, 3))
  })
})

describe('поручения руками', () => {
  it('двенадцать цепочек, у каждой человек, шаги и конец', () => {
    expect(CHAINS).toHaveLength(12)
    for (const chain of CHAINS) {
      expect(chain.steps.length).toBeGreaterThanOrEqual(2)
      expect(chain.giver.name.length).toBeGreaterThan(0)
      expect(chain.outro.length).toBeGreaterThan(0)
    }
  })

  it('долг мельника: взять в деревне, довезти зерно в город, вернуться — и получить', () => {
    const base = createGame(createCharacter({ name: 'Т', money: 50 }), 1, world)
    const village = base.locationId
    expect(world.locations[village]?.archetype).toBe('village')
    const taken = ok(applyCommand(base, { type: 'startChain', chainId: 'millerDebt' }))
    expect(taken.chains).toHaveLength(1)
    expect(applyCommand(taken, { type: 'startChain', chainId: 'millerDebt' }).ok).toBe(false)

    const town = Object.values(world.locations).find((one) => one.archetype === 'town')
    if (!town) throw new Error('нет города')
    // Телепорт ради теста: перенос с зерном в город.
    const inTown: GameState = {
      ...taken,
      locationId: town.id,
      character: { ...taken.character, inventory: { grain: 25 } },
    }
    const delivered = ok(applyCommand(inTown, { type: 'tick', minutes: 30 }))
    expect(delivered.chains[0]?.step).toBe(1)
    expect(delivered.character.inventory.grain).toBe(5)

    const back = ok(
      applyCommand({ ...delivered, locationId: village }, { type: 'tick', minutes: 30 }),
    )
    expect(back.chains).toHaveLength(0)
    expect(back.doneChains).toContain('millerDebt')
    expect(back.character.money).toBe(50 + 60)
    // Второй раз не предлагают.
    expect(applyCommand(back, { type: 'startChain', chainId: 'millerDebt' }).ok).toBe(false)
  })

  it('цепочку одной короны не предлагают на чужой земле', () => {
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    const mine = Object.values(world.locations).find(
      (one) => one.archetype === 'mine' && kingdomOf(world, one.id)?.id !== 'durHazad',
    )
    if (mine) {
      expect(
        applyCommand(
          { ...base, locationId: mine.id },
          { type: 'startChain', chainId: 'dwarvenForge' },
        ).ok,
      ).toBe(false)
    }
  })
})

describe('биография вдвое', () => {
  it('пять этапов, больше пятидесяти вариантов, десять шаблонов — и все собираются', () => {
    expect(BIOGRAPHY.stages).toHaveLength(5)
    const options = BIOGRAPHY.stages.reduce((sum, stage) => sum + stage.options.length, 0)
    expect(options).toBeGreaterThanOrEqual(50)
    expect(BIOGRAPHY.templates).toHaveLength(10)
    for (const template of BIOGRAPHY.templates) {
      const ids = templateOptionIds(BIOGRAPHY, template.id) ?? []
      const built = buildCharacterDraft('Т', ids, BIOGRAPHY)
      if (!built.ok) throw new Error(`${template.id}: ${built.error}`)
    }
  })

  it('гном начинает под горой, степняк — в степи, а не в Ре-Эстизе', () => {
    const dwarf = buildCharacterDraft(
      'Т',
      templateOptionIds(BIOGRAPHY, 'dwarfSmith') ?? [],
      BIOGRAPHY,
    )
    if (!dwarf.ok) throw new Error(dwarf.error)
    const game = createGame(createCharacter(dwarf.draft), 1, world)
    expect(kingdomOf(world, game.locationId)?.id).toBe('durHazad')
    expect(dwarf.draft.tags).toContain('dwarf')
    const rider = buildCharacterDraft(
      'Т',
      templateOptionIds(BIOGRAPHY, 'steppeRider') ?? [],
      BIOGRAPHY,
    )
    if (!rider.ok) throw new Error(rider.error)
    expect(
      kingdomOf(world, createGame(createCharacter(rider.draft), 1, world).locationId)?.id,
    ).toBe('tribes')
  })
})

describe('работы и наставники вдвое', () => {
  it('сорок работ и двадцать четыре наставника', () => {
    expect(JOBS).toHaveLength(40)
    expect(COURSES).toHaveLength(24)
  })

  it('у каждого навыка есть наставник', () => {
    const taught = new Set(COURSES.map((course) => course.skill))
    for (const skill of SKILL_IDS) expect(taught.has(skill), `нет наставника: ${skill}`).toBe(true)
  })

  it('идентификаторы не повторяются', () => {
    expect(new Set(JOBS.map((job) => job.id)).size).toBe(JOBS.length)
    expect(new Set(COURSES.map((course) => course.id)).size).toBe(COURSES.length)
  })
})

describe('сейв', () => {
  it('старый сейв поднимается без цепочек и с нулём побед', () => {
    const state = createGame(createCharacter({ name: 'Т' }), 1, world)
    const saved = JSON.parse(serialize(state)) as Record<string, unknown>
    saved.chains = undefined
    saved.doneChains = undefined
    saved.battlesWon = undefined
    saved.schemaVersion = 13
    const loaded = deserialize(JSON.stringify(saved))
    if (!loaded.ok) throw new Error(loaded.error)
    expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(loaded.state.chains).toEqual([])
    expect(loaded.state.battlesWon).toBe(0)
  })
})
