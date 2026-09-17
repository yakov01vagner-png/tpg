import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand, canApply } from '../src/commands'
import { coursesAt, examsAt, jobsAt } from '../src/place'
import { createGame } from '../src/state'
import { generateWorld } from '../src/world/generate'
import type { LocationArchetype } from '../src/world/types'

const world = generateWorld(1)

/** Первое попавшееся место нужного вида — их в мире хватает. */
function someplace(archetype: LocationArchetype): string {
  const found = Object.values(world.locations).find((location) => location.archetype === archetype)
  if (!found) throw new Error(`в мире нет ни одного места вида «${archetype}»`)
  return found.id
}

const gameAt = (locationId: string) => ({
  ...createGame(createCharacter({ name: 'Тест', money: 500 }), 1, world),
  locationId,
})

describe('место определяет, что можно делать', () => {
  it('в деревне дел заметно меньше, чем в столице', () => {
    const village = jobsAt(gameAt(someplace('village'))).length
    const capital = jobsAt(gameAt(someplace('capital'))).length
    console.log(`работ: в деревне ${village}, в столице ${capital}`)
    expect(village).toBeGreaterThan(0)
    expect(capital).toBeGreaterThan(village)
  })

  it('в деревне не у кого учиться и некому принимать испытание', () => {
    const villageId = someplace('village')
    // Единственное исключение — уличные наговоры, и те не для всякого.
    expect(coursesAt(gameAt(villageId)).length).toBeLessThanOrEqual(1)
    expect(examsAt(gameAt(villageId)).length).toBe(0)
  })

  it('школа магии и испытания есть только в крупных местах', () => {
    const capitalId = someplace('capital')
    expect(coursesAt(gameAt(capitalId)).map((course) => course.id)).toContain('magicAdeptCourse')
    expect(examsAt(gameAt(capitalId)).length).toBeGreaterThan(0)
    expect(examsAt(gameAt(someplace('village'))).length).toBe(0)
    expect(examsAt(gameAt(someplace('mine'))).length).toBe(0)
  })

  it('у каждого вида места своя работа', () => {
    const idsAt = (archetype: LocationArchetype) =>
      jobsAt(gameAt(someplace(archetype))).map((job) => job.id)
    expect(idsAt('mine')).toContain('quarryShift')
    expect(idsAt('port')).toContain('loadShips')
    expect(idsAt('monastery')).toContain('copyPsalter')
    expect(idsAt('fortress')).toContain('standWatch')
    // И наоборот: в обители не кайлят породу.
    expect(idsAt('monastery')).not.toContain('quarryShift')
    expect(idsAt('capital')).not.toContain('washOre')
  })

  it('всё, что показано в месте, там и правда можно делать', () => {
    for (const archetype of ['village', 'town', 'city', 'capital', 'mine', 'port'] as const) {
      const locationId = someplace(archetype)
      const state = gameAt(locationId)
      for (const job of jobsAt(state)) {
        const check = canApply(state, { type: 'work', jobId: job.id })
        if (!check.ok) {
          // Отказ по навыкам, деньгам или часам — нормально; «здесь такого нет» — нет.
          expect(check.code, `${job.label} в месте «${archetype}»: ${check.message}`).not.toBe(
            'unavailableHere',
          )
        }
      }
      for (const course of coursesAt(state)) {
        const check = canApply(state, { type: 'study', courseId: course.id })
        if (!check.ok) {
          expect(check.code, `${course.label} в месте «${archetype}»`).not.toBe('unavailableHere')
        }
      }
    }
  })

  it('чужая работа отказывает с понятной причиной', () => {
    const state = gameAt(someplace('village'))
    const result = applyCommand(state, { type: 'work', jobId: 'countLedgers' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('unavailableHere')
      expect(result.message).toBe('Здесь такой работы нет.')
    }
  })

  it('дорога меняет причину отказа: дома некому учить, в столице — рано', () => {
    const home = gameAt(someplace('village'))
    const capital = gameAt(someplace('capital'))
    const command = { type: 'study', courseId: 'magicIntro' } as const

    const atHome = canApply(home, command)
    const atCapital = canApply(capital, command)
    expect(atHome.ok).toBe(false)
    expect(atCapital.ok).toBe(false)
    if (!atHome.ok) expect(atHome.code).toBe('unavailableHere')
    // В столице школа есть — упираешься уже в собственную неготовность.
    if (!atCapital.ok) expect(atCapital.code).toBe('requirements')
  })

  it('в столице школа доступна тому, кто к ней готов', () => {
    const capital = gameAt(someplace('capital'))
    const ready = {
      ...capital,
      character: {
        ...capital.character,
        skills: {
          ...capital.character.skills,
          scholarship: { level: 12, xp: 0 },
          concentration: { level: 8, xp: 0 },
        },
      },
    }
    expect(canApply(ready, { type: 'study', courseId: 'magicIntro' }).ok).toBe(true)
  })
})
