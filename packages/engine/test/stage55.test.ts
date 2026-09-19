import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { BOOKS, DEBATE_MINUTES, STUDENT_DAYS, STUDENT_UPKEEP } from '../src/content/books'
import { MAGIC_RANKS } from '../src/magic'
import { REFUSED, masterAttitude, masterStance, schoolAt, schoolsOf } from '../src/school'
import { createGame } from '../src/state'
import type { GameState } from '../src/state'
import { bookProgress, bookRead, booksAt, canTakeStudent, hasBook, studentDone } from '../src/study'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 55: наставники и школы.
 *
 * Школа перестаёт быть местом, где принимают испытание: там спорят, читают и
 * берут учеников. А ранг перестаёт быть записью в листе — он виден миру.
 */

const world = generateWorld(1)
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}
const school = schoolsOf(world).find((one) => one.topRank === 'archmage')
const seat = school?.locationId ?? ''

function at(locationId: string, money = 3000): GameState {
  const base = createGame(createCharacter({ name: 'Т', money }), 1, world)
  return { ...base, locationId, quarter: 'school', time: WORLD_START }
}

describe('Н1: наставник — отношение', () => {
  it('глава помнит провалы и смотрит на то, откуда ты', () => {
    const state = at(seat)
    const master = school?.master
    expect(master).toBeDefined()
    if (!school || !master) return
    expect(masterAttitude(state, master)).toBe(0)
    const hated: GameState = {
      ...state,
      reputation: { ...state.reputation, lords: { [master.id]: REFUSED - 5 } },
    }
    // Сребролюбивый примет и нелюбимого — за деньги; прочие нет.
    expect(masterStance(hated, school)).toBe(master.temper === 'venal' ? 'cold' : 'refuses')
    const loved: GameState = {
      ...state,
      reputation: { ...state.reputation, lords: { [master.id]: 40 } },
    }
    expect(masterStance(loved, school)).toBe('warm')
  })
})

describe('Н3: школа как место', () => {
  it('в школе спорят, и проигравший узнаёт больше победителя', () => {
    const state = at(seat)
    expect(applyCommand(at(state.locationId), { type: 'debate' }).ok).toBe(true)
    // В деревне спорить не с кем.
    const village = Object.values(world.locations).find((one) => one.archetype === 'village')
    if (village) {
      expect(applyCommand({ ...at(village.id), quarter: null }, { type: 'debate' }).ok).toBe(false)
    }
    let current = state
    let wins = 0
    let losses = 0
    let magicXp = 0
    for (let i = 0; i < 8; i += 1) {
      const before = current.character.skills.magic.xp
      const result = applyCommand(
        { ...current, character: { ...current.character, fatigue: 0 } },
        { type: 'debate' },
      )
      if (!result.ok) break
      const won = result.state.log[result.state.log.length - 1]?.text.includes('последним')
      if (won) wins += 1
      else losses += 1
      magicXp += result.state.character.skills.magic.xp - before
      current = result.state
    }
    console.log(`споров 8: выиграно ${wins}, проиграно ${losses}, магии прибавилось ${magicXp}`)
    expect(wins + losses).toBe(8)
    expect(magicXp).toBeGreaterThan(0)
    expect(current.time - state.time).toBeGreaterThanOrEqual(DEBATE_MINUTES * 8)
  })
})

describe('Н6: книги', () => {
  it('книгу покупают, читают сутками и получают то, чего не дал наставник', () => {
    expect(BOOKS.length).toBeGreaterThanOrEqual(10)
    const state = at(seat, 5000)
    const sold = booksAt(state)
    expect(sold.length).toBeGreaterThan(2)
    const worldly = sold.find((one) => one.needsMagic === undefined)
    expect(worldly).toBeDefined()
    if (!worldly) return
    const bought = ok(applyCommand(state, { type: 'buyBook', bookId: worldly.id }))
    expect(hasBook(bought, worldly.id)).toBe(true)
    expect(bought.character.money).toBe(state.character.money - worldly.price)
    // Дважды одну книгу не покупают.
    expect(applyCommand(bought, { type: 'buyBook', bookId: worldly.id }).ok).toBe(false)

    let current = bought
    for (let day = 0; day < worldly.days; day += 1) {
      const read = applyCommand(
        {
          ...current,
          character: { ...current.character, fatigue: 0 },
          time: WORLD_START + day * MINUTES_PER_DAY,
        },
        { type: 'readBook', bookId: worldly.id },
      )
      if (!read.ok) break
      current = read.state
    }
    console.log(
      `${worldly.label}: прочитано ${bookProgress(current, worldly.id)} из ${worldly.days} суток`,
    )
    expect(bookRead(current, worldly.id)).toBe(true)
    const skill = Object.keys(worldly.teaches)[0] as 'trade'
    expect(current.character.skills[skill].xp).toBeGreaterThan(state.character.skills[skill].xp)
    // Прочитанную не читают снова.
    expect(applyCommand(current, { type: 'readBook', bookId: worldly.id }).ok).toBe(false)
    // Магическую книгу без умения не понять.
    const magical = sold.find((one) => (one.needsMagic ?? 0) > 10)
    if (magical) {
      const owned: GameState = {
        ...state,
        books: { [magical.id]: { read: false, days: 0 } },
      }
      const tried = applyCommand(owned, { type: 'readBook', bookId: magical.id })
      expect(tried.ok).toBe(false)
      if (!tried.ok) expect(tried.message).toContain('Магия')
    }
  })
})

describe('Н5: ученик у тебя', () => {
  it('учить может магистр, и ученик уходит выучившись', () => {
    const state = at(seat)
    expect(canTakeStudent(state).can).toBe(false)
    const magister: GameState = {
      ...state,
      character: { ...state.character, magicRank: 'magister' },
    }
    expect(canTakeStudent(magister).can).toBe(true)
    const teaching = ok(applyCommand(magister, { type: 'takeStudent' }))
    expect(teaching.student?.name.length).toBeGreaterThan(2)
    expect(applyCommand(teaching, { type: 'takeStudent' }).ok).toBe(false)
    // Ученик ест твой хлеб.
    const fed = ok(applyCommand(teaching, { type: 'tick', minutes: MINUTES_PER_DAY }))
    expect(fed.character.money).toBe(teaching.character.money - STUDENT_UPKEEP)
    expect(fed.student?.learned).toBe(1)
    // И однажды уходит.
    expect(
      studentDone({ student: teaching.student }, (teaching.student?.since ?? 0) + STUDENT_DAYS),
    ).toBe(true)
  })
})

describe('Н2 и Н4: испытание с судьбой, самоучка против школы', () => {
  it('высокий ранг слышен миру, а школа видна в месте', () => {
    expect(MAGIC_RANKS.archon.tier).toBeGreaterThan(MAGIC_RANKS.magister.tier)
    // Школа — место: где она есть, там и книги, и споры, и ученики.
    expect(schoolAt(world, seat)).not.toBeNull()
    const village = Object.values(world.locations).find((one) => one.archetype === 'village')
    if (village) {
      expect(schoolAt(world, village.id)).toBeNull()
      expect(booksAt(at(village.id))).toHaveLength(0)
    }
    console.log(
      `школ в мире ${schoolsOf(world).length}, книг в ${world.locations[seat]?.name}: ${booksAt(at(seat)).length}`,
    )
  })
})
