import { describe, expect, it } from 'vitest'
import { lordTemper } from '../src/castle'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import {
  CROWN_TEMPER_DEFS,
  FACTIONS,
  FACTION_DEFS,
  LORD_DEEDS,
  MEMORY_DEPTH,
} from '../src/content/lords'
import { createSettlements } from '../src/economy'
import {
  crownOf,
  crownTemperDef,
  crownWarlust,
  deedWeight,
  factionDef,
  factionMood,
  factionsAt,
  heirRegard,
  lordBonds,
  lordRecalls,
  lordSaidOf,
  temperDeeds,
  withLordDeed,
} from '../src/lordlife'
import { withLordRep } from '../src/reputation'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 66: лорды как люди.
 *
 * Нрав лорда жил в приёмной и решал, примет ли он. Теперь он виден в делах: кто
 * разоряет, кто щадит, кто держится короны. Рядом — корона как человек, партии
 * при дворе и память лорда о тебе.
 */

const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

describe('Л1: нрав лорда', () => {
  it('нрав виден в делах, а не только в приёмной', () => {
    const tempers = new Map<string, number>()
    for (const lord of politics.lords) {
      const temper = lordTemper(lord)
      tempers.set(temper, (tempers.get(temper) ?? 0) + 1)
    }
    console.log(
      `нравы ${politics.lords.length} лордов: ${[...tempers.entries()].map(([t, n]) => `${t} ${n}`).join(', ')}`,
    )
    expect(tempers.size).toBeGreaterThan(3)
    const grim = politics.lords.find((one) => lordTemper(one) === 'grim')
    const pious = politics.lords.find((one) => lordTemper(one) === 'pious')
    expect(grim).toBeDefined()
    expect(pious).toBeDefined()
    if (!grim || !pious) return
    // Мрачный разоряет сильнее набожного — и это число, а не описание.
    expect(temperDeeds(grim).cruel).toBeGreaterThan(temperDeeds(pious).cruel * 2)
    // Набожный крепче держится короны.
    expect(temperDeeds(pious).loyal).toBeGreaterThan(temperDeeds(grim).loyal)
    console.log(`${grim.name}: ${lordSaidOf(grim)}`)
    expect(lordSaidOf(grim).length).toBeGreaterThan(10)
  })
})

describe('Л5: корона как человек', () => {
  it('у короны есть имя, титул и нрав, и он решает, сколько она воюет', () => {
    const crowns = Object.keys(world.kingdoms).map((id) => crownOf(id))
    console.log(
      crowns
        .map((one) => `${one.title} ${one.name} (${crownTemperDef(one.temper).label})`)
        .join('; '),
    )
    expect(new Set(crowns.map((one) => one.title)).size).toBeGreaterThan(3)
    // Воинственная корона объявляет войну охотнее расчётливой.
    expect(CROWN_TEMPER_DEFS.warlike.war).toBeGreaterThan(CROWN_TEMPER_DEFS.thrifty.war)
    const warlust = crowns.map((one) => crownWarlust(one.kingdomId))
    expect(Math.max(...warlust)).toBeGreaterThan(Math.min(...warlust))
    // И один и тот же король не меняется от взгляда.
    expect(crownOf('reEstiz').name).toBe(crownOf('reEstiz').name)
  })
})

describe('Л2: дружба и вражда лордов', () => {
  it('соперники — те, с кем делят провинцию, свои — соседи по короне', () => {
    const lord = politics.lords[0]
    expect(lord).toBeDefined()
    if (!lord) return
    const bonds = lordBonds(politics, settlements, world, lord)
    console.log(
      `${lord.title} ${lord.name}: своих ${bonds.friends.length}, соперников ${bonds.rivals.length}`,
    )
    expect(bonds.friends.length).toBeGreaterThan(0)
    for (const friend of bonds.friends) expect(friend.kingdomId).toBe(lord.kingdomId)
    // Поделим провинцию — и появится соперник.
    const province = Object.values(world.provinces).find((one) =>
      one.locationIds.some((id) => settlements[id]?.owner === lord.id),
    )
    const other = politics.lords.find((one) => one.id !== lord.id)
    if (province && other) {
      const shared = province.locationIds.find((id) => settlements[id]?.owner !== lord.id)
      if (shared && settlements[shared]) {
        const contested = {
          ...settlements,
          [shared]: { ...settlements[shared], owner: other.id },
        }
        expect(
          lordBonds(politics, contested, world, lord).rivals.some((one) => one.id === other.id),
        ).toBe(true)
      }
    }
  })
})

describe('Л4 и Л3: лорд помнит тебя, наследник помнит по рассказам', () => {
  it('помнит делами, а не числом, и помнит немного', () => {
    expect(LORD_DEEDS.length).toBe(6)
    expect(deedWeight('saved')).toBeGreaterThan(0)
    expect(deedWeight('betrayed')).toBeLessThan(0)
    let deeds: Readonly<Record<string, readonly (typeof LORD_DEEDS)[number][]>> = {}
    for (const deed of ['served', 'gifted', 'refused', 'saved'] as const) {
      deeds = withLordDeed(deeds, 'lord:x', deed)
    }
    // Помнит последние три: столько человек и правда держит в голове о чужом.
    expect(deeds['lord:x']).toHaveLength(MEMORY_DEPTH)
    expect(deeds['lord:x']?.[MEMORY_DEPTH - 1]).toBe('saved')
    const recalls = lordRecalls({ lordDeeds: deeds }, 'lord:x')
    console.log(`лорд вспоминает: «${recalls}»`)
    expect(recalls).toContain('стоять')

    // Наследник: милость с половины отцовой, и дурное помнится вдвое.
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    const father = politics.lords[0]
    if (!father) return
    const liked: GameState = {
      ...base,
      politics,
      reputation: withLordRep(base.reputation, father.id, 60),
    }
    expect(heirRegard(liked, father.id)).toBe(30)
    const hated: GameState = {
      ...liked,
      lordDeeds: withLordDeed({}, father.id, 'betrayed'),
    }
    expect(heirRegard(hated, father.id)).toBeLessThan(heirRegard(liked, father.id))
  })

  it('со смертью лорда его память о тебе уходит вместе с ним', () => {
    const base = createGame(createCharacter({ name: 'Т' }), 1, world)
    const lord = politics.lords[0]
    if (!lord) return
    const state: GameState = {
      ...base,
      politics,
      settlements,
      lordDeeds: withLordDeed({}, lord.id, 'robbed'),
      reputation: withLordRep(base.reputation, lord.id, -40),
    }
    // Сын не отец: у него своя мера, и она мягче отцовой обиды.
    expect(heirRegard(state, lord.id)).toBeGreaterThan(-40)
  })
})

describe('Л6: придворные партии', () => {
  it('милость одной — немилость другой', () => {
    expect(FACTIONS.length).toBe(4)
    expect(FACTION_DEFS.hawks.against).toBe('doves')
    const kingdomId = Object.keys(world.kingdoms)[0] ?? ''
    const capital = world.kingdoms[kingdomId]?.capitalId ?? ''
    const base = createGame(createCharacter({ name: 'Т', money: 500 }), 1, world)
    const atCourt: GameState = { ...base, locationId: capital, quarter: null, time: WORLD_START }
    const before = factionsAt(atCourt, kingdomId)
    expect(before.every((one) => one.mood === 0)).toBe(true)
    const asked = ok(applyCommand(atCourt, { type: 'askFaction', kingdomId, factionId: 'hawks' }))
    console.log(
      `${factionDef('hawks').label}: ${factionMood(asked, kingdomId, 'hawks')}, ${factionDef('doves').label}: ${factionMood(asked, kingdomId, 'doves')}`,
    )
    expect(factionMood(asked, kingdomId, 'hawks')).toBeGreaterThan(0)
    expect(factionMood(asked, kingdomId, 'doves')).toBeLessThan(0)
    // Партии сидят при дворе, а двор — в столице.
    const village = Object.values(world.locations).find((one) => one.archetype === 'village')
    if (village) {
      expect(
        applyCommand(
          { ...atCourt, locationId: village.id },
          { type: 'askFaction', kingdomId, factionId: 'hawks' },
        ).ok,
      ).toBe(false)
    }
  })
})

describe('нрав короны виден в мире', () => {
  it('за век воинственная корона проводит в войне больше лет, чем расчётливая', () => {
    // Считаем не объявления, а годы в войне: объявлений у воинственной короны
    // не больше — она и так уже со всеми воюет, и лишние броски пропадают
    // впустую. А вот война у неё не кончается, и это видно.
    let current = politics
    let rng = createRng(11)
    const atWarYears = new Map<string, number>()
    for (let year = 1; year <= 100; year += 1) {
      const result = tickPolitics(world, current, settlements, year * 365, rng)
      current = result.politics
      rng = result.rng
      for (const war of current.wars) {
        for (const side of [war.a, war.b]) {
          if (!world.kingdoms[side]) continue
          atWarYears.set(side, (atWarYears.get(side) ?? 0) + 1)
        }
      }
    }
    const rows = [...atWarYears.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(
        ([id, years]) =>
          `${crownOf(id).title} ${crownOf(id).name} (${crownTemperDef(crownOf(id).temper).label}) — ${years}`,
      )
    console.log(`лет в войне за век: ${rows.join('; ')}`)
    const warlike = [...atWarYears.entries()].filter(([id]) => crownOf(id).temper === 'warlike')
    const thrifty = [...atWarYears.entries()].filter(([id]) => crownOf(id).temper === 'thrifty')
    expect(warlike.length).toBeGreaterThan(0)
    expect(thrifty.length).toBeGreaterThan(0)
    // Воинственная корона проводит в войне больше всех: она и объявляет
    // охотнее, и мириться не спешит.
    const most = Math.max(...warlike.map(([, years]) => years))
    const everyone = [...atWarYears.values()]
    expect(most).toBe(Math.max(...everyone))
  })
})
