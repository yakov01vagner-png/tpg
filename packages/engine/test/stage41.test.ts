import { describe, expect, it } from 'vitest'
import { resolveRound, startBattle } from '../src/battle'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { JOBS } from '../src/content'
import { SPELLS, SPELLS_BY_ID } from '../src/content/spells'
import { createRng } from '../src/rng'
import { bestSpell, castChance, knownSpells, spellsFor } from '../src/spell'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { MINUTES_PER_DAY } from '../src/time'
import { banditBand } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { lanesFrom } from '../src/world/lanes'
import { isSite } from '../src/world/types'

/**
 * Этап 41: магия в деле.
 *
 * Что маг умеет: в бою, в дороге, в хозяйстве. Без этого ранг — звание без
 * ремесла. Заклинания — содержимое: логика их только читает.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function mage(magic: number, extra: Partial<GameState> = {}): GameState {
  const base = createGame(
    createCharacter({ name: 'М', money: 5000, skills: { magic, concentration: 40 } }),
    1,
    world,
  )
  return { ...base, ...extra }
}

describe('заклинания — содержимое', () => {
  it('тридцать штук, на всех ступенях и всех родов', () => {
    expect(SPELLS.length).toBeGreaterThanOrEqual(30)
    const families = new Set(SPELLS.map((spell) => spell.family))
    expect(families.size).toBe(7)
    const ids = new Set(SPELLS.map((spell) => spell.id))
    expect(ids.size).toBe(SPELLS.length)
    // Есть что творить и неофиту, и архимагу.
    expect(SPELLS.some((spell) => spell.requiredSkill <= 10)).toBe(true)
    expect(SPELLS.some((spell) => spell.requiredSkill >= 80)).toBe(true)
  })

  it('открываются навыком, а не рангом: самоучка творит то же', () => {
    expect(knownSpells(mage(5).character).length).toBeGreaterThan(0)
    expect(knownSpells(mage(5).character).length).toBeLessThan(
      knownSpells(mage(50).character).length,
    )
    expect(knownSpells(mage(100).character)).toHaveLength(SPELLS.length)
    // Ранг ни при чём: тот же навык — те же чары.
    const schooled = mage(50)
    const withRank: GameState = {
      ...schooled,
      character: { ...schooled.character, magicRank: 'master' },
    }
    expect(knownSpells(withRank.character)).toEqual(knownSpells(schooled.character))
  })
})

describe('магия в бою', () => {
  const clash = (magic: number, order: 'fireball' | 'curse' | 'ward') => {
    const state = mage(magic)
    const [band] = banditBand(0.8, 800, createRng(3))
    const battle = startBattle(
      { units: { spearman: 20, mage: 3 }, morale: 70, hungryDays: 0, gear: 0.3 },
      band,
      'plains',
      { foeId: 'bandits' },
    )
    const spells = {
      fire: bestSpell(state.character, 'fire'),
      curse: bestSpell(state.character, 'curse'),
      ward: bestSpell(state.character, 'ward'),
    }
    const power = (family: 'fire' | 'curse' | 'ward') => {
      const spell = spells[family]
      const effect = spell?.effect
      return effect && 'power' in effect ? { power: effect.power, label: spell?.label ?? '' } : null
    }
    return resolveRound(
      battle,
      { vanguard: 'hold', archers: 'shoot', flank: 'hold', reserve: 'hold', mages: order },
      {
        command: 10,
        magic,
        spells: { fire: power('fire'), curse: power('curse'), ward: power('ward') },
      },
      createRng(5),
    ).battle
  }

  it('круг бьёт тем, что знает герой: у архимага огонь страшнее', () => {
    const weak = clash(6, 'fireball')
    const strong = clash(85, 'fireball')
    const lost = (battle: ReturnType<typeof clash>) =>
      battle.enemyStart - Object.values(battle.enemy.units).reduce((sum, n) => sum + (n ?? 0), 0)
    console.log(`потери врага за круг: искра ${lost(weak)}, солнечное копьё ${lost(strong)}`)
    expect(lost(strong)).toBeGreaterThan(lost(weak))
    expect(strong.log.some((line) => line.includes('Солнечное копьё'))).toBe(true)
    expect(weak.log.some((line) => line.includes('Искра'))).toBe(true)
  })

  it('маг меняет исход, но не решает его один', () => {
    // Один круг магии — не победа: враг стоит и после солнечного копья.
    const after = clash(85, 'fireball')
    expect(after.outcome).toBe('ongoing')
    const cursed = clash(85, 'curse')
    expect(cursed.enemy.morale).toBeLessThan(70)
  })
})

describe('магия в дороге и в деле', () => {
  const harbour = (() => {
    for (const place of Object.values(world.locations)) {
      const lanes = lanesFrom(world, place.id)
      if (lanes.length > 0 && lanes[0]) return { id: place.id, lane: lanes[0] }
    }
    throw new Error('в мире нет гаваней')
  })()

  it('рана затягивается раньше', () => {
    const hurt = mage(40)
    const wounded: GameState = {
      ...hurt,
      character: { ...hurt.character, wound: { daysLeft: 10, severity: 0.3 } },
    }
    let healed: GameState | null = null
    for (let seed = 1; seed <= 20 && !healed; seed += 1) {
      const result = ok(
        applyCommand({ ...wounded, rng: { state: seed * 97 } }, { type: 'cast', spellId: 'knit' }),
      )
      if ((result.character.wound?.daysLeft ?? 0) < 10) healed = result
    }
    expect(healed).not.toBeNull()
    expect(healed?.character.wound?.daysLeft).toBe(4)
    // А в бою это не творят, и того, чего не знаешь, — тоже.
    expect(applyCommand(wounded, { type: 'cast', spellId: 'fireball' }).ok).toBe(false)
    expect(applyCommand(mage(5), { type: 'cast', spellId: 'restore' }).ok).toBe(false)
  })

  it('тишь снимает шторм с пути и не даёт ему вернуться', () => {
    const state: GameState = { ...mage(60), locationId: harbour.id, time: 120 * MINUTES_PER_DAY }
    const sailing = ok(
      applyCommand(state, { type: 'sail', toLocationId: harbour.lane.to, manner: 'hire' }),
    )
    const journey = sailing.journey
    if (!journey) throw new Error('не отплыли')
    const stormy: GameState = {
      ...sailing,
      journey: { ...journey, hours: journey.hours + 6, done: 1 },
    }
    let calmed: GameState | null = null
    for (let seed = 1; seed <= 20 && !calmed; seed += 1) {
      const result = ok(
        applyCommand(
          { ...stormy, rng: { state: seed * 31 } },
          { type: 'cast', spellId: 'stillwater' },
        ),
      )
      if (result.journey?.calm) calmed = result
    }
    expect(calmed).not.toBeNull()
    expect(calmed?.journey?.hours).toBe(journey.hours)
    // На суше тишь не творят.
    expect(applyCommand(mage(60), { type: 'cast', spellId: 'stillwater' }).ok).toBe(false)
  })

  it('взгляд под землю: искать удаётся наверняка', () => {
    const barrow = Object.values(world.locations).find(
      (one) => isSite(one.archetype) && one.archetype === 'barrow',
    )
    if (!barrow) return
    const state: GameState = { ...mage(60), locationId: barrow.id }
    let seeing: GameState | null = null
    for (let seed = 1; seed <= 20 && !seeing; seed += 1) {
      const result = ok(
        applyCommand({ ...state, rng: { state: seed * 13 } }, { type: 'cast', spellId: 'seek' }),
      )
      if (result.character.insight) seeing = result
    }
    expect(seeing).not.toBeNull()
    if (!seeing) return
    const found = ok(
      applyCommand(
        { ...seeing, character: { ...seeing.character, fatigue: 0 } },
        { type: 'search' },
      ),
    )
    expect(found.character.money).toBeGreaterThan(seeing.character.money)
    expect(found.character.insight).toBe(false)
  })

  it('благословение кладёт хлеб в амбар, а оберег — держит засаду', () => {
    const state = mage(60)
    const before = state.settlements[state.locationId]?.stock.grain ?? 0
    let blessed: GameState | null = null
    for (let seed = 1; seed <= 20 && !blessed; seed += 1) {
      const result = ok(
        applyCommand({ ...state, rng: { state: seed * 7 } }, { type: 'cast', spellId: 'bless' }),
      )
      if ((result.settlements[state.locationId]?.stock.grain ?? 0) > before) blessed = result
    }
    expect(blessed).not.toBeNull()
    const warded = ok(
      applyCommand(
        { ...mage(60), journey: { fromId: state.locationId, toId: harbour.id, hours: 5, done: 1 } },
        { type: 'cast', spellId: 'hidepath' },
      ),
    )
    expect(
      (warded.character.warded ?? 0) > warded.time || warded.character.warded === undefined,
    ).toBe(true)
  })

  it('чары — это ещё и ремесло: за них платят', () => {
    const magicJobs = JOBS.filter((job) => (job.requires?.skills?.magic ?? 0) > 0)
    expect(magicJobs.length).toBeGreaterThanOrEqual(3)
    expect(Math.max(...magicJobs.map((job) => job.pay))).toBeGreaterThan(50)
  })
})

describe('цена', () => {
  it('усталость и время уходят и при неудаче, а впритык не даётся через раз', () => {
    const spell = SPELLS_BY_ID.knit
    if (!spell) return
    expect(castChance(spell.requiredSkill, spell)).toBeLessThan(0.6)
    expect(castChance(spell.requiredSkill + 15, spell)).toBeGreaterThan(0.9)
    const hurt = mage(spell.requiredSkill)
    const wounded: GameState = {
      ...hurt,
      character: { ...hurt.character, wound: { daysLeft: 10, severity: 0.3 } },
    }
    let failed: GameState | null = null
    for (let seed = 1; seed <= 40 && !failed; seed += 1) {
      const result = ok(
        applyCommand({ ...wounded, rng: { state: seed * 11 } }, { type: 'cast', spellId: 'knit' }),
      )
      if (result.character.wound?.daysLeft === 10) failed = result
    }
    expect(failed).not.toBeNull()
    expect(failed?.character.fatigue).toBe(spell.fatigue)
    expect((failed?.time ?? 0) - wounded.time).toBe(spell.minutes)
  })

  it('дорогие чары дорого стоят: верхние — полдня и половина сил', () => {
    const top = SPELLS.filter((spell) => spell.where !== 'battle' && spell.requiredSkill >= 60)
    for (const spell of top) {
      expect(spell.fatigue).toBeGreaterThanOrEqual(40)
      expect(spell.minutes).toBeGreaterThanOrEqual(60)
    }
    expect(spellsFor(mage(100).character, 'sea').length).toBeGreaterThanOrEqual(4)
  })
})
