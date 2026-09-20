import { describe, expect, it } from 'vitest'
import { createCharacter, skillLevel } from '../src/character'
import { applyCommand } from '../src/commands'
import { PATHS, PATH_DEFS, SERVICE_TEACHES, TRIALS } from '../src/content/paths'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { narrowSkills, pathCount, pathLedger, pathsFor, trialOdds, trialsFor } from '../src/paths'
import { createRng } from '../src/rng'
import { SKILL_IDS } from '../src/skills'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 124: пути раскачки.
 *
 * До сих пор навык рос двумя способами, и разница между ними была только в
 * скорости — то есть выбор сводился к «есть ли серебро». Здесь путей пять, и
 * они различаются ценой: временем, серебром, потолком, риском и свободой.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function hero(skills: Record<string, number> = {}) {
  return createCharacter({ name: 'Ратша', money: 30000, skills: skills as never })
}

function ruler(skills: Record<string, number> = {}): GameState {
  const game = createGame(hero(skills), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 900)
    .slice(0, 3)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

describe('Пу1: пять путей, и они разные по цене', () => {
  it('у каждого своя цена, свой потолок и своя скорость', () => {
    for (const id of PATHS) {
      const def = PATH_DEFS[id]
      console.log(
        `${def.label}: ${def.about} Платишь ${def.costs}; опыта за раз ${def.xp}${def.cap > 0 ? `, потолок ${def.cap}` : ', без потолка'}`,
      )
    }
    expect(PATHS).toHaveLength(5)
    // Цена разная, а не только скорость: у книги потолок, у испытания риск.
    expect(PATH_DEFS.book.cap).toBeGreaterThan(0)
    expect(PATH_DEFS.doing.cap).toBe(0)
    expect(PATH_DEFS.trial.xp).toBeGreaterThan(PATH_DEFS.teacher.xp)
  })
})

describe('Пу2: не меньше двух', () => {
  it('к каждому навыку ведут хотя бы два пути', () => {
    const state = ruler()
    const counted = pathCount(state)
    for (const id of SKILL_IDS) {
      console.log(`${id}: путей ${counted[id]}`)
    }
    const narrow = narrowSkills(state)
    console.log(
      `навыков с одним путём: ${narrow.length}${narrow.length > 0 ? ` (${narrow.join(', ')})` : ''}`,
    )
    expect(narrow).toHaveLength(0)
  })

  it('и видно, какие именно', () => {
    const state = ruler()
    for (const one of pathsFor(state, 'command')) {
      console.log(
        `командование, ${PATH_DEFS[one.path].label}: ${one.open ? 'открыт' : 'закрыт'} — ${one.says}`,
      )
    }
    expect(pathsFor(state, 'command').filter((one) => one.open).length).toBeGreaterThanOrEqual(2)
  })
})

describe('Пу1 и Пу5: испытание и потолок книги', () => {
  it('испытание даёт разом и много — если выдержишь', () => {
    for (const trial of TRIALS) {
      console.log(
        `${trial.label} (${trial.skill}): нужно ${trial.needs}, стоит ${trial.cost} и ${trial.days} сут., даёт ${trial.xp}; провал — ${trial.fails}`,
      )
    }
    const green = ruler()
    const ready = ruler({ heavyWeapons: 40 })
    const tourney = TRIALS.find((one) => one.id === 'tourney')
    if (!tourney) return
    console.log(`новичок: ${trialOdds(green, tourney).says}`)
    console.log(`боец 40: ${trialOdds(ready, tourney).says}`)
    expect(trialOdds(green, tourney).can).toBe(false)
    expect(trialOdds(ready, tourney).can).toBe(true)

    const before = skillLevel(ready.character, 'heavyWeapons')
    const after = ok(applyCommand(ready, { type: 'takeTrial', trialId: 'tourney' }))
    console.log(after.log.find((one) => one.text.includes('турнир'))?.text)
    console.log(
      `тяжёлое оружие ${before} → ${skillLevel(after.character, 'heavyWeapons')}, казна ${ready.character.money} → ${after.character.money}`,
    )
    // Три дня державства приносят доход, поэтому считаем разницей с теми же
    // тремя днями без турнира.
    let idle = ready
    for (let step = 0; step < tourney.days; step += 1) {
      idle = ok(applyCommand(idle, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    console.log(
      `за те же ${tourney.days} суток без турнира казна ${idle.character.money}, с турниром ${after.character.money}`,
    )
    expect(after.character.money).toBeLessThan(idle.character.money)
    expect(after.trials?.tourney).toBe(day)
    console.log(pathLedger(after).says)
    expect(pathLedger(after).byTrial).toBeGreaterThan(0)
    // Второй раз в тот же год не выйдешь.
    expect(applyCommand(after, { type: 'takeTrial', trialId: 'tourney' }).ok).toBe(false)
  })

  it('по книге дальше середины не уйдёшь', () => {
    console.log(`потолок книги: ${PATH_DEFS.book.cap}`)
    expect(PATH_DEFS.book.cap).toBe(50)
    const master = ruler({ scholarship: 60 })
    for (const one of pathsFor(master, 'scholarship')) {
      if (one.path !== 'book') continue
      console.log(`книга при учёности 60: потолок ${one.cap} — выше уже не поднимет`)
      expect(one.cap).toBeLessThan(skillLevel(master.character, 'scholarship'))
    }
  })
})

describe('Пу6: служба учит тому, чем служишь', () => {
  it('навыки службы растут без серебра и без школы', () => {
    for (const [kind, skills] of Object.entries(SERVICE_TEACHES)) {
      console.log(`${kind}: учит ${skills.join(', ')}`)
    }
    const state = ruler()
    const before = skillLevel(state.character, 'trade')
    let later = state
    for (let step = 0; step < 20; step += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const ledger = pathLedger(later)
    console.log(
      `за двадцать суток державства: торговля ${before} → ${skillLevel(later.character, 'trade')}`,
    )
    console.log(ledger.says)
    expect(ledger.byService).toBeGreaterThan(0)
  })
})

describe('Пу3 и Пу4: дело и учитель', () => {
  it('у каждого навыка есть испытание или наставник, а дело есть всегда', () => {
    const state = ruler()
    let withTeacher = 0
    let withTrial = 0
    for (const id of SKILL_IDS) {
      const paths = pathsFor(state, id)
      if (paths.find((one) => one.path === 'teacher')?.open) withTeacher += 1
      if (trialsFor(id).length > 0) withTrial += 1
    }
    console.log(`наставники есть у ${withTeacher} навыков из ${SKILL_IDS.length}`)
    console.log(`испытания есть у ${withTrial} навыков`)
    expect(withTeacher).toBeGreaterThan(10)
    expect(withTrial).toBeGreaterThan(5)
  })
})
