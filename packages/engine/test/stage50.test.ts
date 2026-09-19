import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { CECHS, CECH_DUES, CRAFT_MASTERS, CRAFT_RANKS } from '../src/content/craft'
import { ITEMS_BY_ID } from '../src/content/equipment'
import { JOBS } from '../src/content/jobs'
import {
  cechAt,
  cechLets,
  experienceOf,
  masterHires,
  masterOf,
  qualityFactor,
  qualityFrom,
  qualityLabel,
  rankOfShifts,
  shiftsOf,
} from '../src/craft'
import { repairCost } from '../src/equipment'
import { jobsAt } from '../src/place'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 50: ремесло и выучка.
 *
 * Работа перестаёт быть строкой «смена окончена». У неё есть ступени, у
 * ступеней — мастер, у ремесла — цех, а у сделанной вещи — клеймо.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}
const capital = world.kingdoms.reEstiz?.capitalId ?? ''

function at(locationId: string, money = 2000): GameState {
  const base = createGame(createCharacter({ name: 'Т', money }), 1, world)
  return { ...base, locationId, quarter: 'market' }
}

/** Отстоять смены на одной работе, отсыпаясь между ними. */
function workShifts(state: GameState, jobId: string, times: number): GameState {
  let current = state
  for (let i = 0; i < times * 4 && shiftsOf(current, jobId) < times; i += 1) {
    const done = applyCommand(current, { type: 'work', jobId })
    current = done.ok ? done.state : current
    const slept = applyCommand(current, { type: 'sleep' })
    if (slept.ok) current = slept.state
  }
  return current
}

describe('М1: работа, которой учатся', () => {
  it('ступени растут от смен, плата — от ступени', () => {
    expect(CRAFT_RANKS).toHaveLength(4)
    expect(rankOfShifts(0).id).toBe('hand')
    expect(rankOfShifts(12).id).toBe('apprentice')
    expect(rankOfShifts(40).id).toBe('worker')
    expect(rankOfShifts(100).id).toBe('master')
    for (let i = 1; i < CRAFT_RANKS.length; i += 1) {
      expect(CRAFT_RANKS[i]?.pay ?? 0).toBeGreaterThan(CRAFT_RANKS[i - 1]?.pay ?? 0)
      expect(CRAFT_RANKS[i]?.practice ?? 0).toBeGreaterThan(CRAFT_RANKS[i - 1]?.practice ?? 0)
    }

    const state = at(capital)
    const job = jobsAt(state).find((one) => masterHires(masterOf(capital, one), 0, 0).hires)
    expect(job).toBeDefined()
    if (!job) return
    const first = ok(applyCommand(state, { type: 'work', jobId: job.id }))
    const firstPay = first.character.money - state.character.money
    expect(shiftsOf(first, job.id)).toBe(1)

    const grown = workShifts(state, job.id, 42)
    const seasoned: GameState = { ...grown, character: { ...grown.character, fatigue: 0 } }
    const later = ok(applyCommand(seasoned, { type: 'work', jobId: job.id }))
    const laterPay = later.character.money - seasoned.character.money
    console.log(
      `${job.label}: подёнщик ${firstPay}, ${rankOfShifts(shiftsOf(grown, job.id)).label} ${laterPay} (смен ${shiftsOf(grown, job.id)})`,
    )
    expect(rankOfShifts(shiftsOf(grown, job.id)).id).not.toBe('hand')
    expect(laterPay).toBeGreaterThan(firstPay)
    expect(grown.log.some((entry) => entry.text.includes('Теперь ты'))).toBe(true)
  })
})

describe('М2: мастер над тобой', () => {
  it('у работы есть хозяин: берёт, гонит и учит по-своему', () => {
    const state = at(capital)
    const jobs = jobsAt(state)
    const masters = jobs.map((job) => masterOf(capital, job))
    expect(new Set(masters.map((one) => one.temper)).size).toBeGreaterThan(1)
    // Один и тот же город, одна и та же работа — тот же человек.
    expect(masterOf(capital, jobs[0] as never).id).toBe(masterOf(capital, jobs[0] as never).id)

    const picky = jobs.find((job) => CRAFT_MASTERS[masterOf(capital, job).temper].demand >= 0.45)
    expect(picky, 'нет ни одного разборчивого мастера').toBeDefined()
    if (!picky) return
    const refused = applyCommand(state, { type: 'work', jobId: picky.id })
    expect(refused.ok).toBe(false)
    if (!refused.ok) expect(refused.message).toContain(masterOf(capital, picky).name)
    // А опытного берёт: выучка видна по рукам.
    const seasoned: GameState = { ...state, craft: { unloadCarts: 60 } }
    expect(experienceOf(seasoned)).toBe(60)
    const taken = applyCommand(seasoned, { type: 'work', jobId: picky.id })
    expect(taken.ok, taken.ok ? '' : taken.message).toBe(true)
  })
})

describe('М3: мастерская с людьми', () => {
  it('ученика берёт мастер, и он приносит и брак, и оборот', () => {
    const state: GameState = { ...at(capital, 5000), quarter: 'craft' }
    const founded = ok(applyCommand(state, { type: 'foundWorkshop' }))
    // Подёнщику учить нечему.
    expect(applyCommand(founded, { type: 'takeApprentice' }).ok).toBe(false)
    const master: GameState = { ...founded, craft: { unloadCarts: 120 } }
    const withBoy = ok(applyCommand(master, { type: 'takeApprentice' }))
    const workshop = withBoy.enterprises.find((one) => one.kind === 'workshop')
    expect(workshop?.apprentices).toBe(1)
    expect(withBoy.character.money).toBeLessThan(master.character.money)
    // Трое — предел верстака.
    let crowded = withBoy
    for (let i = 0; i < 3; i += 1) {
      const more = applyCommand(crowded, { type: 'takeApprentice' })
      if (more.ok) crowded = more.state
    }
    expect(
      crowded.enterprises.find((one) => one.kind === 'workshop')?.apprentices,
    ).toBeLessThanOrEqual(3)
  })
})

describe('М4: вещь с историей', () => {
  it('выкованная вещь несёт клеймо, и качество видно в бою и в починке', () => {
    const item = Object.values(ITEMS_BY_ID).find((one) => one.craft)
    expect(item).toBeDefined()
    if (!item?.craft) return
    const smith = createCharacter({ name: 'Т', money: 3000, skills: { engineering: 40 } })
    const state: GameState = {
      ...at(capital, 3000),
      quarter: 'craft',
      character: { ...smith, inventory: { iron: 40, tools: 20 } },
      craft: { unloadCarts: 120 },
    }
    const forged = ok(applyCommand(state, { type: 'craftItem', itemId: item.id }))
    const mark = forged.character.equipment[item.slot]?.mark
    expect(mark).toBeDefined()
    expect(mark?.maker).toBe('Т')
    expect(mark?.quality).toBeGreaterThan(0)
    console.log(`выковано: ${item.label} — ${qualityLabel(mark?.quality ?? 0)}, ${mark?.place}`)
    // Качество меняет и прок, и цену починки.
    expect(qualityFactor(0)).toBeLessThan(1)
    expect(qualityFactor(4)).toBeGreaterThan(1)
    expect(repairCost(item, 50, 4)).toBeGreaterThan(repairCost(item, 50, 0))
    expect(qualityFrom(40, CRAFT_RANKS[3] as never, 1)).toBeGreaterThan(
      qualityFrom(0, CRAFT_RANKS[0] as never, 0),
    )
  })
})

describe('М5: ремесло по земле', () => {
  it('что делают под горой, не делают в порту', () => {
    const mine = Object.values(world.locations).find((one) => one.archetype === 'mine')
    const port = Object.values(world.locations).find((one) => one.archetype === 'port')
    if (!mine || !port) return
    const atMine = jobsAt(at(mine.id)).map((one) => one.id)
    const atPort = jobsAt(at(port.id)).map((one) => one.id)
    console.log(`в руднике ${atMine.length} работ, в гавани ${atPort.length}`)
    expect(atMine).toContain('breakOre')
    expect(atMine).not.toContain('tarRigging')
    expect(atPort).toContain('tarRigging')
    expect(atPort).not.toContain('breakOre')
    // Полсотни с лишним работ, и у трети есть своя земля или свой вид места.
    const placed = JOBS.filter((one) => one.where?.terrains || one.where?.archetypes)
    expect(placed.length / JOBS.length).toBeGreaterThan(0.3)
  })
})

describe('М6: цех', () => {
  it('цех берёт взнос и не пускает нецеховых к работе мастера', () => {
    const cech = cechAt(world, at(capital).settlements, capital)
    expect(cech).toBeDefined()
    if (!cech) return
    expect(CECHS.some((one) => one.id === cech.id)).toBe(true)
    const held = jobsAt(at(capital)).find(
      (job) =>
        Object.keys(job.practice).some((skill) => cech.skills.includes(skill)) &&
        masterHires(masterOf(capital, job), 200, 0).hires,
    )
    expect(held).toBeDefined()
    if (!held) return
    const master = CRAFT_RANKS[3] as never
    expect(cechLets(cech, null, held, master, capital)).toBe(false)
    // Работнику цех ещё не мешает: дверь на самой верхней ступени.
    expect(cechLets(cech, null, held, CRAFT_RANKS[2] as never, capital)).toBe(true)
    expect(
      cechLets(
        cech,
        { locationId: capital, cechId: cech.id, since: 1, paidUntil: 40 },
        held,
        master,
        capital,
      ),
    ).toBe(true)
    // Подмастерью цех не мешает.
    expect(cechLets(cech, null, held, CRAFT_RANKS[1] as never, capital)).toBe(true)

    const state: GameState = { ...at(capital), craft: { [held.id]: 140 } }
    const barred = applyCommand(state, { type: 'work', jobId: held.id })
    expect(barred.ok).toBe(false)
    if (!barred.ok) expect(barred.message).toContain('цех')

    // Цех сидит в ремесленных рядах: туда и идут вступать.
    const atRows = ok(applyCommand(state, { type: 'goQuarter', quarterId: 'craft' }))
    const joined = ok(applyCommand(atRows, { type: 'joinCech' }))
    expect(joined.cech?.cechId).toBe(cech.id)
    expect(joined.character.money).toBe(state.character.money - CECH_DUES)
    const back = ok(applyCommand(joined, { type: 'goQuarter', quarterId: 'market' }))
    const allowed = applyCommand(back, { type: 'work', jobId: held.id })
    expect(allowed.ok, allowed.ok ? '' : allowed.message).toBe(true)
    // В двух цехах не бывают, а выйти можно.
    expect(applyCommand(joined, { type: 'joinCech' }).ok).toBe(false)
    expect(ok(applyCommand(joined, { type: 'leaveCech' })).cech).toBeNull()
  })
})
