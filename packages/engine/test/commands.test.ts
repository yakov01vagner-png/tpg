import { describe, expect, it } from 'vitest'
import type { Character } from '../src/character'
import { createCharacter } from '../src/character'
import type { CommandResult } from '../src/commands'
import { applyCommand, canApply, examChance } from '../src/commands'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START, dayOf, hourOf, hours } from '../src/time'
import { generateWorld } from '../src/world/generate'
import { roadsFrom } from '../src/world/queries'
import { walkOut } from './road'

// Один мир на весь файл: генерировать семьдесят локаций в каждом тесте незачем.
const WORLD = generateWorld(1)
/** Столица: там водится почти весь контент, поэтому проверки правил живут в ней. */
const CAPITAL = WORLD.kingdoms.reEstiz?.capitalId ?? ''

function game(overrides: Partial<Character> = {}, seed = 1): GameState {
  const character = { ...createCharacter({ name: 'Тест', money: 50 }), ...overrides }
  return { ...createGame(character, seed, WORLD), locationId: CAPITAL }
}

/** Развернуть удачный результат или упасть с внятным сообщением. */
function ok(result: CommandResult): GameState {
  if (!result.ok) throw new Error(`команда не прошла: ${result.code} — ${result.message}`)
  return result.state
}

/**
 * Одно число для сравнения «кто продвинулся дальше».
 * Голый xp сравнивать нельзя: при взятии уровня остаток обнуляется, и тот, кто
 * вырос сильнее, оказывается с меньшим числом.
 */
function progress(state: GameState, skill: keyof GameState['character']['skills']): number {
  const value = state.character.skills[skill]
  return value.level * 10_000 + value.xp
}

describe('работа', () => {
  it('даёт деньги, тратит время и силы, качает навык', () => {
    const before = game()
    const after = ok(applyCommand(before, { type: 'work', jobId: 'unloadCarts' }))

    // Плата — базовая, помноженная на ступень и на нрав хозяина (этап 50).
    expect(after.character.money).toBeGreaterThan(before.character.money)
    expect(after.character.money).toBeLessThan(before.character.money + 20)
    expect(after.time).toBe(before.time + hours(8))
    expect(after.character.fatigue).toBe(35)
    expect(after.character.skills.hardLabour.xp).toBeGreaterThan(0)
    expect(after.log.length).toBeGreaterThan(before.log.length)
  })

  it('не берёт на дневную работу ночью', () => {
    const night = { ...game(), time: WORLD_START + hours(17) }
    const result = applyCommand(night, { type: 'work', jobId: 'unloadCarts' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('closed')
  })

  it('ночная работа живёт по своему расписанию', () => {
    const night = { ...game(), time: WORLD_START + hours(17) }
    const day = game()
    expect(applyCommand(night, { type: 'work', jobId: 'nightWatch' }).ok).toBe(true)

    const denied = applyCommand(day, { type: 'work', jobId: 'nightWatch' })
    expect(denied.ok).toBe(false)
    if (!denied.ok) {
      expect(denied.code).toBe('closed')
      expect(denied.message).toContain('22:00')
    }
  })

  it('проверяет требования', () => {
    const result = applyCommand(game(), { type: 'work', jobId: 'guardCaravan' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('requirements')
  })

  it('не пускает на смену вымотанного', () => {
    const tired = game({ fatigue: 80 })
    const result = applyCommand(tired, { type: 'work', jobId: 'unloadCarts' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('exhausted')
  })

  it('усталость снижает отдачу от той же смены', () => {
    const fresh = ok(applyCommand(game(), { type: 'work', jobId: 'unloadCarts' }))
    const weary = ok(applyCommand(game({ fatigue: 60 }), { type: 'work', jobId: 'unloadCarts' }))
    expect(progress(weary, 'hardLabour')).toBeLessThan(progress(fresh, 'hardLabour'))
    // Но плату урезать не за что: смену отработал полностью.
    expect(weary.character.money).toBe(fresh.character.money)
  })

  it('незнакомую работу не выполняет', () => {
    const result = applyCommand(game(), { type: 'work', jobId: 'нет такой' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('unknownAction')
  })
})

describe('учёба', () => {
  it('стоит денег и времени, но растит навык быстрее работы', () => {
    // Писцом берут только грамотного, поэтому сравниваем на одинаковом старте.
    const literate = game()
    const before: GameState = {
      ...literate,
      character: {
        ...literate.character,
        skills: { ...literate.character.skills, scholarship: { level: 5, xp: 0 } },
      },
    }
    const studied = ok(applyCommand(before, { type: 'study', courseId: 'lettersBasics' }))
    expect(studied.character.money).toBe(before.character.money - 6)
    expect(studied.time).toBe(before.time + hours(4))

    const worked = ok(applyCommand(before, { type: 'work', jobId: 'copyPapers' }))
    // Смена длиннее занятия в полтора раза, а учит меньше — в этом и смысл выбора.
    expect(progress(studied, 'scholarship')).toBeGreaterThan(progress(worked, 'scholarship'))
    // Зато работа кормит, а учёба — наоборот.
    expect(worked.character.money).toBeGreaterThan(studied.character.money)
  })

  it('без денег не учит', () => {
    const result = applyCommand(game({ money: 2 }), { type: 'study', courseId: 'lettersBasics' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('noMoney')
  })

  it('упирается в предел наставника', () => {
    const clever = game()
    const advanced: GameState = {
      ...clever,
      character: {
        ...clever.character,
        skills: { ...clever.character.skills, scholarship: { level: 25, xp: 0 } },
      },
    }
    const result = applyCommand(advanced, { type: 'study', courseId: 'lettersBasics' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('maxed')
  })
})

describe('отдых и сон', () => {
  it('ожидание снимает усталость и двигает часы', () => {
    const after = ok(applyCommand(game({ fatigue: 40 }), { type: 'rest', hours: 3 }))
    expect(after.character.fatigue).toBe(40 - 18)
    expect(after.time).toBe(WORLD_START + hours(3))
  })

  it('ждать бесконечно нельзя', () => {
    const result = applyCommand(game(), { type: 'rest', hours: 48 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('invalid')
  })

  it('сон доводит до утра и снимает усталость', () => {
    const evening: GameState = { ...game({ fatigue: 70 }), time: WORLD_START + hours(15) }
    const after = ok(applyCommand(evening, { type: 'sleep' }))
    expect(hourOf(after.time)).toBe(6)
    expect(after.time).toBeGreaterThan(evening.time)
    expect(after.character.fatigue).toBe(0)
  })
})

describe('очки за уровень', () => {
  it('без очков тратить нечего', () => {
    const result = applyCommand(game(), { type: 'spendSkillPoint', skillId: 'magic' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('noPoints')
  })

  it('очко навыка поднимает уровень сразу', () => {
    const after = ok(
      applyCommand(game({ unspentSkillPoints: 2 }), { type: 'spendSkillPoint', skillId: 'magic' }),
    )
    expect(after.character.skills.magic.level).toBe(1)
    expect(after.character.unspentSkillPoints).toBe(1)
  })

  it('очко атрибута поднимает атрибут', () => {
    const after = ok(
      applyCommand(game({ unspentAttributePoints: 1 }), {
        type: 'spendAttributePoint',
        attributeId: 'mind',
      }),
    )
    expect(after.character.attributes.mind).toBe(4)
    expect(after.character.unspentAttributePoints).toBe(0)
  })
})

describe('испытание на ранг', () => {
  const magician = (level: number, extra: Partial<Character> = {}) =>
    game({
      money: 100,
      skills: { ...createCharacter({ name: 'x' }).skills, magic: { level, xp: 0 } },
      ...extra,
    })

  it('ступени не перепрыгивают', () => {
    const result = applyCommand(magician(40), { type: 'takeExam', examId: 'examAdept' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('rankNotEligible')
  })

  it('без навыка на испытание не пускают', () => {
    const result = applyCommand(magician(2), { type: 'takeExam', examId: 'examNeophyte' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('rankNotEligible')
  })

  it('шанс растёт вместе с запасом навыка и не доходит до гарантии', () => {
    expect(examChance(5, 5, 5)).toBeCloseTo(0.4)
    expect(examChance(10, 5, 5)).toBeCloseTo(0.95)
    expect(examChance(50, 5, 5)).toBeCloseTo(0.95)
  })

  it('с хорошим запасом ранг присваивают, и он остаётся в персонаже', () => {
    let granted = false
    for (let seed = 1; seed <= 5 && !granted; seed += 1) {
      const state = { ...createGame(magician(20).character, seed, WORLD), locationId: CAPITAL }
      const after = ok(applyCommand(state, { type: 'takeExam', examId: 'examNeophyte' }))
      // Двадцать, а не десять: маг с навыком в двадцать и без единого ранга —
      // самоучка (этап 40, `SELF_TAUGHT_GAP`), и школа берёт с него вдвое.
      expect(after.character.money).toBe(80)
      if (after.character.magicRank === 'neophyte') granted = true
    }
    expect(granted).toBe(true)
  })

  it('результат воспроизводится из того же зерна', () => {
    const atSchool = (seed: number): GameState => ({
      ...createGame(magician(6).character, seed, WORLD),
      locationId: CAPITAL,
    })
    const first = ok(applyCommand(atSchool(12345), { type: 'takeExam', examId: 'examNeophyte' }))
    const second = ok(applyCommand(atSchool(12345), { type: 'takeExam', examId: 'examNeophyte' }))
    expect(first.character.magicRank).toBe(second.character.magicRank)
    expect(first.rng).toEqual(second.rng)
  })
})

describe('чистота движка', () => {
  it('не меняет переданное состояние', () => {
    const before = game()
    const snapshot = JSON.stringify(before)
    applyCommand(before, { type: 'work', jobId: 'unloadCarts' })
    applyCommand(before, { type: 'sleep' })
    expect(JSON.stringify(before)).toBe(snapshot)
  })
})

describe('предпросмотр доступности', () => {
  it('говорит ту же причину, что и само действие', () => {
    const state = game()
    const preview = canApply(state, { type: 'work', jobId: 'guardCaravan' })
    const real = applyCommand(state, { type: 'work', jobId: 'guardCaravan' })
    expect(preview.ok).toBe(false)
    expect(real.ok).toBe(false)
    if (!preview.ok && !real.ok) expect(preview.message).toBe(real.message)
  })

  it('не меняет состояние проверкой', () => {
    const state = game()
    const snapshot = JSON.stringify(state)
    canApply(state, { type: 'work', jobId: 'unloadCarts' })
    expect(JSON.stringify(state)).toBe(snapshot)
  })
})

describe('дорога', () => {
  // Дорогу проверяем от родной деревни, а не из столицы.
  const home = (overrides: Partial<Character> = {}): GameState =>
    createGame({ ...createCharacter({ name: 'Тест', money: 50 }), ...overrides }, 1, WORLD)

  const neighbourOf = (state: GameState) => {
    const road = roadsFrom(state.world, state.locationId)[0]
    if (!road) throw new Error('стартовая локация без дорог')
    return road
  }

  it('доводит до соседнего места и берёт за это время и силы', () => {
    const before = home()
    const road = neighbourOf(before)
    // Дорога больше не переносит: она ставит на дорогу, а дальше идут часы.
    const started = ok(applyCommand(before, { type: 'travel', toLocationId: road.to }))
    expect(started.locationId).toBe(before.locationId)
    expect(started.journey?.toId).toBe(road.to)
    const after = walkOut(started)

    expect(after.locationId).toBe(road.to)
    expect(after.journey).toBeNull()
    expect(after.time).toBeGreaterThanOrEqual(before.time + hours(road.hours))
    expect(after.character.fatigue).toBeGreaterThan(0)
    expect(progress(after, 'athletics')).toBeGreaterThan(progress(before, 'athletics'))
  })

  it('не пускает туда, куда нет дороги', () => {
    const state = home()
    const neighbours = new Set(roadsFrom(state.world, state.locationId).map((road) => road.to))
    const far = Object.keys(state.world.locations).find(
      (id) => id !== state.locationId && !neighbours.has(id),
    )
    expect(far).toBeDefined()
    const result = applyCommand(state, { type: 'travel', toLocationId: far ?? '' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('нет прямой дороги')
  })

  it('не отправляет в путь вымотанного', () => {
    const state = home({ fatigue: 95 })
    const result = applyCommand(state, { type: 'travel', toLocationId: neighbourOf(state).to })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('exhausted')
  })

  it('ходит и ночью: дорога не спрашивает расписания', () => {
    const night: GameState = { ...home(), time: WORLD_START + hours(17) }
    const result = applyCommand(night, { type: 'travel', toLocationId: neighbourOf(night).to })
    expect(result.ok).toBe(true)
  })
})

describe('мир идёт сам', () => {
  it('тик двигает часы и потихоньку снимает усталость', () => {
    const before = game({ fatigue: 40 })
    const after = ok(applyCommand(before, { type: 'tick', minutes: 60 }))
    expect(after.time).toBe(before.time + 60)
    expect(after.character.fatigue).toBeLessThan(40)
    // Просто стоять — не то же самое, что отдыхать на привале.
    const rested = ok(applyCommand(before, { type: 'rest', hours: 1 }))
    expect(after.character.fatigue).toBeGreaterThan(rested.character.fatigue)
  })

  it('за долгий тик мир успевает прожить сутки', () => {
    const before = game()
    const after = ok(applyCommand(before, { type: 'tick', minutes: hours(20) }))
    expect(dayOf(after.time)).toBeGreaterThan(dayOf(before.time))
    // Поселения пересчитались: запасы уже не те, что были.
    expect(after.settlements).not.toEqual(before.settlements)
  })

  it('не принимает бессмыслицу', () => {
    expect(applyCommand(game(), { type: 'tick', minutes: 0 }).ok).toBe(false)
    expect(applyCommand(game(), { type: 'tick', minutes: -5 }).ok).toBe(false)
    expect(applyCommand(game(), { type: 'tick', minutes: 10_000 }).ok).toBe(false)
  })
})
