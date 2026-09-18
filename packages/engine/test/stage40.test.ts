import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { HIGH_EXAMS } from '../src/content/exams'
import { MAGIC_RANKS, MAGIC_RANK_IDS, rankTier } from '../src/magic'
import type { MagicRankId } from '../src/magic'
import { coursesAt, examsAt } from '../src/place'
import { lordRep } from '../src/reputation'
import {
  SELF_TAUGHT_FEE,
  archonSeat,
  isSelfTaught,
  masterStance,
  schoolAt,
  schoolsOf,
} from '../src/school'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { MINUTES_PER_DAY } from '../src/time'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 40: школы магии.
 *
 * Ранг перестаёт быть строкой в листе. Школа — место, учитель — человек, экзамен
 * — событие. Лестница из DESIGN.md п.4 наконец стоит на земле.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Маг с нужным навыком и деньгами — там, где надо. */
function mage(
  magic: number,
  at: string,
  rank: MagicRankId | null = null,
  money = 100000,
): GameState {
  const base = createGame(
    createCharacter({
      name: 'М',
      money,
      skills: { magic, concentration: 80, scholarship: 70 },
    }),
    1,
    world,
  )
  return {
    ...base,
    locationId: at,
    character: { ...base.character, magicRank: rank },
  }
}

describe('школа — место в мире', () => {
  it('школ немного: при каждом престоле и в самых больших городах', () => {
    for (const seed of [1, 2, 3]) {
      const current = generateWorld(seed)
      const schools = schoolsOf(current)
      const capitals = Object.values(current.kingdoms).map((one) => one.capitalId)
      for (const capitalId of capitals) {
        expect(
          schools.some((school) => school.locationId === capitalId),
          `столица ${capitalId}`,
        ).toBe(true)
      }
      for (const school of schools) {
        const kind = current.locations[school.locationId]?.archetype
        expect(kind === 'capital' || kind === 'city', school.locationId).toBe(true)
      }
      expect(schools.length).toBeGreaterThanOrEqual(capitals.length)
      // Школ немного — меньше четырёх на корону: при престоле и в самых
      // больших городах (на материке корон восемь, этап 44).
      expect(schools.length).toBeLessThan(capitals.length * 4)
      // Архон один на весь свет.
      expect(schools.filter((school) => school.topRank === 'archon')).toHaveLength(1)
      if (seed === 1) {
        console.log(
          `школ ${schools.length}: ${schools.map((school) => `${current.locations[school.locationId]?.name} (${MAGIC_RANKS[school.topRank].label})`).join(', ')}`,
        )
      }
    }
  })

  it('в деревне испытаний нет, в школе — только до её ранга', () => {
    const village = Object.values(world.locations).find((one) => one.archetype === 'village')
    expect(examsAt(mage(90, village?.id ?? ''))).toHaveLength(0)
    const city = schoolsOf(world).find((school) => school.topRank === 'magister')
    if (!city) return
    const there = examsAt(mage(90, city.locationId))
    for (const exam of there) {
      expect(rankTier(exam.rank)).toBeLessThanOrEqual(rankTier('magister'))
    }
    const seat = archonSeat(world)
    expect(seat).not.toBeNull()
    if (!seat) return
    expect(examsAt(mage(90, seat.locationId)).some((exam) => exam.rank === 'archon')).toBe(true)
  })

  it('курсы школы читают только там, где есть кому', () => {
    const village = Object.values(world.locations).find((one) => one.archetype === 'village')
    const seat = archonSeat(world)
    if (!seat) return
    const atSeat = coursesAt(mage(60, seat.locationId)).map((course) => course.id)
    const atVillage = coursesAt(mage(60, village?.id ?? '')).map((course) => course.id)
    expect(atSeat).toContain('magicMasterCourse')
    expect(atVillage).not.toContain('magicJourneymanCourse')
  })
})

describe('лестница проходима целиком', () => {
  it('десять испытаний, и у Архона все десять берутся по порядку', () => {
    expect(HIGH_EXAMS).toHaveLength(6)
    const seat = archonSeat(world)
    if (!seat) return
    let state = mage(100, seat.locationId)
    const exams = examsAt(state)
    expect(exams).toHaveLength(MAGIC_RANK_IDS.length)
    // Идём по лестнице; провал повторяем — испытание можно пересдать.
    for (const rank of MAGIC_RANK_IDS) {
      const exam = exams.find((one) => one.rank === rank)
      expect(exam, rank).toBeDefined()
      if (!exam) return
      let granted = false
      for (let attempt = 0; attempt < 12 && !granted; attempt += 1) {
        // Испытания принимают днём: после многодневного экзамена часы стоят
        // где попало, и на следующее утро надо прийти заново.
        const morning = state.time - (state.time % MINUTES_PER_DAY) + MINUTES_PER_DAY + 9 * 60
        state = { ...state, time: morning, character: { ...state.character, fatigue: 0 } }
        // Глава академии — архимаг короны, и корона его зовёт: пока он в
        // отъезде, старшие ступени ждут его возвращения — и мы ждём.
        for (let day = 0; day < 400 && masterStance(state, seat) === 'absent'; day += 1) {
          state = ok(applyCommand(state, { type: 'tick', minutes: MINUTES_PER_DAY }))
        }
        const result = applyCommand(state, { type: 'takeExam', examId: exam.id })
        if (!result.ok) throw new Error(`${rank}: ${result.message}`)
        state = result.state
        granted = state.character.magicRank === rank
      }
      expect(granted, `не дали ${rank}`).toBe(true)
    }
    expect(state.character.magicRank).toBe('archon')
    // Ступени не перепрыгивают: снизу вверх, и только так.
    const jump = applyCommand(mage(100, seat.locationId), {
      type: 'takeExam',
      examId: 'examArchon',
    })
    expect(jump.ok).toBe(false)
  })

  it('выше ранга школы не присваивают: нужна другая школа', () => {
    const city = schoolsOf(world).find((school) => school.topRank === 'magister')
    if (!city) return
    const state = mage(100, city.locationId, 'magister')
    const result = applyCommand(state, { type: 'takeExam', examId: 'examGrandMagister' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('unavailableHere')
  })
})

describe('архимаги и архоны — люди', () => {
  it('у школы есть глава с именем и нравом, и он помнит провалы', () => {
    const seat = archonSeat(world)
    if (!seat) return
    expect(seat.master.name.length).toBeGreaterThan(1)
    // Впритык к порогу проваливаются часто; каждый провал глава запоминает.
    let state = mage(MAGIC_RANKS.neophyte.requiredSkill, seat.locationId)
    let failures = 0
    for (let attempt = 0; attempt < 30 && state.character.magicRank === null; attempt += 1) {
      state = ok(
        applyCommand(
          { ...state, character: { ...state.character, fatigue: 0 } },
          { type: 'takeExam', examId: 'examNeophyte' },
        ),
      )
      if (state.character.magicRank === null) failures += 1
    }
    const memory = lordRep(state.reputation, seat.master.id)
    console.log(`провалов ${failures}, память главы ${memory}`)
    expect(failures).toBeGreaterThan(0)
    expect(memory).not.toBe(0)
  })

  it('слишком много провалов — и глава не примет', () => {
    const seat = archonSeat(world)
    if (!seat || seat.master.temper === 'venal') return
    const shunned: GameState = {
      ...mage(50, seat.locationId),
    }
    const withGrudge: GameState = {
      ...shunned,
      reputation: { ...shunned.reputation, lords: { [seat.master.id]: -60 } },
    }
    expect(masterStance(withGrudge, seat)).toBe('refuses')
    const result = applyCommand(withGrudge, { type: 'takeExam', examId: 'examNeophyte' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('shunned')
  })

  it('архимаг в отъезде — старшие испытания ждут, младшие принимают', () => {
    const academy = schoolsOf(world).find(
      (school) =>
        school.topRank === 'archmage' &&
        world.locations[school.locationId]?.archetype === 'capital',
    )
    if (!academy) return
    const kingdom = Object.values(world.kingdoms).find(
      (one) => one.capitalId === academy.locationId,
    )
    if (!kingdom) return
    const base = mage(100, academy.locationId, 'magister')
    const away: GameState = {
      ...base,
      politics: {
        ...base.politics,
        archmages: {
          ...base.politics.archmages,
          [kingdom.id]: { kingdomId: kingdom.id, state: 'busy', untilDay: 9999 },
        },
      },
    }
    expect(masterStance(away, academy)).toBe('absent')
    expect(examsAt(away).some((exam) => exam.rank === 'grandMagister')).toBe(false)
    const high = applyCommand(away, { type: 'takeExam', examId: 'examGrandMagister' })
    expect(high.ok).toBe(false)
    const low = mage(100, academy.locationId, null)
    const lowAway: GameState = { ...low, politics: away.politics }
    expect(applyCommand(lowAway, { type: 'takeExam', examId: 'examNeophyte' }).ok).toBe(true)
  })
})

describe('самоучка', () => {
  it('сила обгоняет титул на две ступени — платишь вдвое', () => {
    const seat = archonSeat(world)
    if (!seat) return
    const self = mage(40, seat.locationId, null)
    const schooled = mage(40, seat.locationId, 'student')
    expect(isSelfTaught(self)).toBe(true)
    expect(isSelfTaught(schooled)).toBe(false)
    const paidSelf =
      self.character.money -
      ok(applyCommand(self, { type: 'takeExam', examId: 'examNeophyte' })).character.money
    const paidSchooled =
      schooled.character.money -
      ok(applyCommand(schooled, { type: 'takeExam', examId: 'examJourneyman' })).character.money
    console.log(`самоучка отдал ${paidSelf} за неофита, школьный ${paidSchooled} за подмастерье`)
    expect(paidSelf).toBe(10 * SELF_TAUGHT_FEE)
    expect(paidSchooled).toBe(180)
  })

  it('надменный глава самоучку не жалует, мягкий — не смотрит', () => {
    const proud = schoolsOf(world).find((school) => school.master.temper === 'proud')
    const kind = schoolsOf(world).find((school) => school.master.temper === 'kind')
    if (proud) expect(masterStance(mage(40, proud.locationId), proud)).toBe('selfTaught')
    if (kind) expect(masterStance(mage(40, kind.locationId), kind)).not.toBe('selfTaught')
    expect(schoolAt(world, 'nowhere')).toBeNull()
  })
})
