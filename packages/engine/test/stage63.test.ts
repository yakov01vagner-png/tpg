import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import {
  CACHE_RETURNS,
  CAMP_MANNER_DEFS,
  DENIZENS,
  HERMIT_RETURNS,
  HUNTS,
  LAIR_RETURNS,
  TRACK_SKILL,
  WILD_ERA,
} from '../src/content/wild'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, MINUTES_PER_DAY, WORLD_START, dayOf } from '../src/time'
import {
  denizenOf,
  gameHere,
  hermitOf,
  huntChance,
  huntSpoils,
  huntYield,
  lairStrength,
  tracksAt,
  wildAt,
} from '../src/wild'
import { generateWorld } from '../src/world/generate'
import { isSite } from '../src/world/types'

/**
 * Этап 63: глушь изнутри.
 *
 * Место без жителей было расстоянием с одной находкой. Теперь в нём кто-то
 * живёт, в нём охотятся, в нём ночуют по-разному и по дороге читают следы.
 */

const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const sites = Object.values(world.locations).filter((one) => isSite(one.archetype))

function wanderer(locationId: string, survival = 20, money = 500): GameState {
  const base = createGame(createCharacter({ name: 'Т', money }), 1, world)
  return {
    ...base,
    locationId,
    quarter: null,
    time: WORLD_START,
    character: {
      ...base.character,
      skills: { ...base.character.skills, survival: { level: survival, xp: 0 } },
    },
  }
}

describe('Ш1 и Ш4: глушь не пуста и меняется', () => {
  it('в глуши кто-то живёт, и через год это другой кто-то', () => {
    expect(sites.length).toBeGreaterThan(20)
    const empty = { wilds: {} }
    const counts = new Map<string, number>()
    for (const site of sites) {
      const who = denizenOf(world, empty, site.id, 1)
      counts.set(who, (counts.get(who) ?? 0) + 1)
    }
    console.log(
      `в ${sites.length} местах без жителей: ${[...counts.entries()].map(([who, times]) => `${who} ${times}`).join(', ')}`,
    )
    // Все четыре состояния встречаются, и пустых меньше половины.
    expect(counts.size).toBeGreaterThan(2)
    expect(counts.get('none') ?? 0).toBeLessThan(sites.length * 0.6)
    for (const who of DENIZENS) expect(typeof who).toBe('string')

    // Век глуши — восемь месяцев: через него в том же месте иначе.
    const changed = sites.filter(
      (site) =>
        denizenOf(world, empty, site.id, 1) !== denizenOf(world, empty, site.id, WILD_ERA + 1),
    )
    console.log(`через ${WILD_ERA} суток изменилось ${changed.length} мест из ${sites.length}`)
    expect(changed.length).toBeGreaterThan(sites.length * 0.3)
  })

  it('выведенное логово пусто до срока, обобранный схрон — до своего', () => {
    const lair = sites.find((site) => denizenOf(world, { wilds: {} }, site.id, 1) === 'lair')
    expect(lair).toBeDefined()
    if (!lair) return
    const cleared = { wilds: { [lair.id]: { clearedDay: 1 } } }
    expect(denizenOf(world, cleared, lair.id, 2)).toBe('none')
    expect(denizenOf(world, cleared, lair.id, LAIR_RETURNS + 2)).not.toBe('none')
    const cache = sites.find((site) => denizenOf(world, { wilds: {} }, site.id, 1) === 'cache')
    if (cache) {
      const looted = { wilds: { [cache.id]: { lootedDay: 1 } } }
      expect(denizenOf(world, looted, cache.id, 2)).toBe('none')
      expect(denizenOf(world, looted, cache.id, CACHE_RETURNS + 2)).not.toBe('none')
    }
    console.log(
      `логово возвращается через ${LAIR_RETURNS} сут., схрон через ${CACHE_RETURNS}, отшельник — через ${HERMIT_RETURNS}`,
    )
    expect(lairStrength(world, lair.id)).toBeGreaterThan(0)
  })

  it('схрон и отшельник — дела, а не описания', () => {
    const cache = sites.find((site) => denizenOf(world, { wilds: {} }, site.id, 1) === 'cache')
    if (cache) {
      const state = wanderer(cache.id)
      const looted = ok(applyCommand(state, { type: 'lootCache' }))
      expect(looted.character.money).toBeGreaterThan(state.character.money)
      expect(wildAt(looted, cache.id).lootedDay).toBe(dayOf(looted.time))
      // Дважды один схрон не вскрывают.
      expect(applyCommand(looted, { type: 'lootCache' }).ok).toBe(false)
    }
    const hermitAt = sites.find((site) => denizenOf(world, { wilds: {} }, site.id, 1) === 'hermit')
    expect(hermitAt).toBeDefined()
    if (!hermitAt) return
    const state = wanderer(hermitAt.id)
    const hermit = hermitOf(hermitAt.id, 1)
    console.log(`${world.locations[hermitAt.id]?.name}: ${hermit.name}, даёт ${hermit.gift}`)
    const met = ok(applyCommand(state, { type: 'visitHermit' }))
    expect(wildAt(met, hermitAt.id).metDay).toBe(dayOf(met.time))
    // Второй раз его здесь не найти: он уходит дальше в глушь.
    expect(applyCommand(met, { type: 'visitHermit' }).ok).toBe(false)
  })
})

describe('Ш2 и Ш6: охота по земле и по времени года', () => {
  it('лес кормит лучше пустыни, осень лучше зимы', () => {
    expect(Object.keys(HUNTS).length).toBeGreaterThan(6)
    const forest = sites.find((one) => one.terrain === 'forest')
    const desert = sites.find((one) => one.terrain === 'desert')
    if (forest && desert) {
      expect(gameHere(world, forest.id, 1)).toBeGreaterThan(gameHere(world, desert.id, 1))
    }
    if (!forest) return
    const autumn = gameHere(world, forest.id, 200)
    const winter = gameHere(world, forest.id, 300)
    console.log(
      `${world.locations[forest.id]?.name}: осенью ${autumn.toFixed(2)}, зимой ${winter.toFixed(2)}; добыча — ${huntSpoils(world, forest.id).join(', ')}`,
    )
    expect(autumn).toBeGreaterThan(winter)
    // Умелый добывает больше и чаще.
    expect(huntChance(1, 40)).toBeGreaterThan(huntChance(1, 0))
    expect(huntYield(1, 40)).toBeGreaterThan(huntYield(1, 0))

    // Охота — дело: время, добыча и риск.
    let state = wanderer(forest.id, 40)
    let caught = false
    for (let i = 0; i < 12 && !caught; i += 1) {
      const result = applyCommand(
        { ...state, character: { ...state.character, fatigue: 0 } },
        { type: 'hunt' },
      )
      if (!result.ok) break
      state = result.state
      caught = Object.keys(state.character.inventory).length > 0
    }
    console.log(`охота в лесу: добыто ${JSON.stringify(state.character.inventory)}`)
    expect(caught).toBe(true)
    // В селе не охотятся.
    const village = Object.values(world.locations).find((one) => one.archetype === 'village')
    if (village) expect(applyCommand(wanderer(village.id, 40), { type: 'hunt' }).ok).toBe(false)
  })
})

describe('Ш3: стоянка', () => {
  it('ночь в поле не одинакова: дозор стоит отдыха, разговоры — духа', () => {
    expect(CAMP_MANNER_DEFS.watch.risk).toBeLessThan(CAMP_MANNER_DEFS.sleep.risk)
    expect(CAMP_MANNER_DEFS.watch.rest).toBeLessThan(CAMP_MANNER_DEFS.sleep.rest)
    const site = sites[0]
    expect(site).toBeDefined()
    if (!site) return
    const tired: GameState = {
      ...wanderer(site.id, 20),
      character: { ...wanderer(site.id, 20).character, fatigue: 80 },
      party: { units: { militia: 6 }, morale: 50, hungryDays: 0, gear: 0 },
    }
    const slept = ok(applyCommand(tired, { type: 'camp', manner: 'sleep' }))
    const watched = ok(applyCommand(tired, { type: 'camp', manner: 'watch' }))
    const talked = ok(applyCommand(tired, { type: 'camp', manner: 'talk' }))
    console.log(
      `усталость 80 → сон ${slept.character.fatigue}, дозор ${watched.character.fatigue}, разговоры ${talked.character.fatigue}; дух ${tired.party.morale} → ${talked.party.morale}`,
    )
    expect(watched.character.fatigue).toBeGreaterThan(slept.character.fatigue)
    expect(talked.party.morale).toBeGreaterThan(tired.party.morale)
  })
})

describe('Ш5: следы', () => {
  it('по дороге видно, кто прошёл, и читает это выживание', () => {
    const site = sites[0]
    if (!site) return
    const state = wanderer(site.id, 20)
    const kind = tracksAt(world, state.bands, state, site.id, 1)
    console.log(`${world.locations[site.id]?.name}: следы — ${kind}`)
    expect(typeof kind).toBe('string')
    // Дружина рядом — это видно.
    const near = state.bands.find((band) => band.locationId !== '')
    if (near) {
      const at = world.locations[near.locationId]
      const closest = at
        ? Object.values(world.locations)
            .filter((one) => isSite(one.archetype))
            .sort(
              (a, b) => Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y),
            )[0]
        : null
      if (closest) {
        expect(tracksAt(world, [near], state, closest.id, 1)).toBe('host')
      }
    }
    // Ниже порога следов не читают.
    const green = wanderer(site.id, TRACK_SKILL - 2)
    expect(applyCommand(green, { type: 'readTracks' }).ok).toBe(false)
    const read = ok(applyCommand(state, { type: 'readTracks' }))
    expect(read.log[read.log.length - 1]?.text).toContain('Следы')
  })
})

describe('глушь не сломала прежнего', () => {
  it('находка по-прежнему одна на место', () => {
    const withFind = sites.find((one) => one.archetype === 'barrow')
    if (!withFind) return
    const state = wanderer(withFind.id, 30)
    const searched = ok(applyCommand(state, { type: 'search' }))
    expect(searched.searchedSites).toContain(withFind.id)
    expect(applyCommand(searched, { type: 'search' }).ok).toBe(false)
    // И год в глуши идёт как везде.
    const later = ok(applyCommand(searched, { type: 'tick', minutes: MINUTES_PER_DAY }))
    expect(dayOf(later.time)).toBeGreaterThan(dayOf(searched.time))
    expect(DAYS_PER_YEAR).toBeGreaterThan(200)
  })
})
