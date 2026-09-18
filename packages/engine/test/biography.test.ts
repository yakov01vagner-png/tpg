import { describe, expect, it } from 'vitest'
import {
  type Biography,
  type BiographyOption,
  availableOptions,
  buildCharacterDraft,
  progressOf,
  templateOptionIds,
} from '../src/biography'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { BIOGRAPHY } from '../src/content/biography'
import { createGame } from '../src/state'
import { generateWorld } from '../src/world/generate'

/** Все полные пути по биографии — контент маленький, перебор честный. */
function allPaths(biography: Biography): string[][] {
  const paths: string[][] = []
  const walk = (chosen: string[], tags: string[]) => {
    const stage = biography.stages[chosen.length]
    if (!stage) {
      paths.push([...chosen])
      return
    }
    for (const option of availableOptions(stage, tags)) {
      walk([...chosen, option.id], [...tags, ...(option.effects.tags ?? [])])
    }
  }
  walk([], [])
  return paths
}

function draftOf(optionIds: readonly string[]) {
  const result = buildCharacterDraft('Тест', optionIds, BIOGRAPHY)
  if (!result.ok) throw new Error(result.error)
  return result.draft
}

describe('контент биографии', () => {
  it('нигде не заводит в тупик', () => {
    const walk = (chosen: string[], tags: string[]) => {
      const stage = BIOGRAPHY.stages[chosen.length]
      if (!stage) return
      const options = availableOptions(stage, tags)
      expect(
        options.length,
        `тупик на этапе «${stage.label}» после ${chosen.join(' → ') || 'начала'}`,
      ).toBeGreaterThan(0)
      for (const option of options) {
        walk([...chosen, option.id], [...tags, ...(option.effects.tags ?? [])])
      }
    }
    walk([], [])
  })

  it('не содержит вариантов, до которых нельзя добраться', () => {
    const used = new Set(allPaths(BIOGRAPHY).flat())
    const unreachable: string[] = []
    for (const stage of BIOGRAPHY.stages) {
      for (const option of stage.options) {
        if (!used.has(option.id)) unreachable.push(`${stage.label}: ${option.label}`)
      }
    }
    expect(unreachable).toEqual([])
  })

  it('держит идентификаторы вариантов уникальными', () => {
    const ids = BIOGRAPHY.stages.flatMap((stage) => stage.options.map((option) => option.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('даёт достаточно ветвления, чтобы выбор что-то значил', () => {
    console.log(`Полных путей по биографии: ${allPaths(BIOGRAPHY).length}`)
    expect(allPaths(BIOGRAPHY).length).toBeGreaterThan(100)
  })
})

describe('шаблоны быстрого старта', () => {
  it('все собираются в персонажа', () => {
    for (const template of BIOGRAPHY.templates) {
      const result = buildCharacterDraft('Тест', template.optionIds, BIOGRAPHY)
      expect(result.ok, `шаблон «${template.label}»: ${result.ok ? '' : result.error}`).toBe(true)
    }
  })

  it('отвечают на каждый этап ровно один раз', () => {
    for (const template of BIOGRAPHY.templates) {
      expect(template.optionIds.length).toBe(BIOGRAPHY.stages.length)
    }
  })

  it('находятся по идентификатору', () => {
    expect(templateOptionIds(BIOGRAPHY, 'fallenNoble')?.[1]).toBe('lordSon')
    expect(templateOptionIds(BIOGRAPHY, 'нет такого')).toBe(null)
  })
})

describe('прохождение', () => {
  it('в начале предлагает первый этап', () => {
    const progress = progressOf(BIOGRAPHY, [])
    expect(progress.stage?.id).toBe('homeland')
    expect(progress.done).toBe(false)
    expect(progress.options.length).toBe(BIOGRAPHY.stages[0]?.options.length)
  })

  it('происхождение открывает и закрывает варианты детства', () => {
    const noble = progressOf(BIOGRAPHY, ['homeReEstiz', 'lordSon']).options.map(
      (o: BiographyOption) => o.id,
    )
    const peasant = progressOf(BIOGRAPHY, ['homeReEstiz', 'villager']).options.map(
      (o: BiographyOption) => o.id,
    )

    expect(noble).toContain('courtPage')
    expect(peasant).not.toContain('courtPage')
    // Наследника не отправишь расти на улице и в поле.
    expect(noble).not.toContain('streets')
    expect(peasant).toContain('streets')
    // А конюшни открыты всем — на этом и держится пример из обсуждения.
    expect(noble).toContain('stables')
    expect(peasant).toContain('stables')
  })

  it('заканчивается, когда отвечено на все этапы', () => {
    const progress = progressOf(BIOGRAPHY, [
      'homeReEstiz',
      'lordSon',
      'stables',
      'levy',
      'stableHand',
    ])
    expect(progress.done).toBe(true)
    expect(progress.stage).toBe(null)
    expect(progress.tags).toContain('noble_born')
  })
})

describe('сборка персонажа', () => {
  it('складывает атрибуты, навыки, деньги и теги', () => {
    const draft = draftOf(['homeReEstiz', 'merchantChild', 'templeSchool', 'scribeHand', 'copyist'])
    // Разум: база 3 + 1 за торговый дом + 1 за подручного писца.
    expect(draft.attributes?.mind).toBe(5)
    // Учёность: 2 + 4 + 5 + 3.
    expect(draft.skills?.scholarship).toBe(14)
    expect(draft.money).toBe(30 + 10 + 12)
    expect(draft.tags).toContain('merchant_family')
    expect(draft.tags).toContain('scribe_work')
  })

  it('не принимает недопройденную биографию', () => {
    const result = buildCharacterDraft('Тест', ['lordSon'], BIOGRAPHY)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('не пройдена')
  })

  it('не принимает вариант, закрытый происхождением', () => {
    // Наследник не рос на улице, как бы ни хотелось.
    const result = buildCharacterDraft(
      'Тест',
      ['homeReEstiz', 'lordSon', 'streets', 'levy', 'stableHand'],
      BIOGRAPHY,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('недоступен')
  })

  it('различает одинаковую работу при разном происхождении', () => {
    const noble = draftOf(['homeReEstiz', 'lordSon', 'stables', 'levy', 'stableHand'])
    const peasant = draftOf(['homeReEstiz', 'villager', 'stables', 'levy', 'stableHand'])

    // Занятие одно и то же — а персонажи разные.
    expect(noble.tags).toContain('noble_born')
    expect(peasant.tags).not.toContain('noble_born')
    expect(noble.tags).toContain('literate')
    expect(peasant.tags).not.toContain('literate')
    expect(noble.money ?? 0).toBeGreaterThan(peasant.money ?? 0)
    // Конюшни дали обоим одно и то же, но сын лорда ездил верхом с детства.
    expect(peasant.skills?.riding ?? 0).toBeGreaterThan(0)
    expect(noble.skills?.riding ?? 0).toBeGreaterThan(peasant.skills?.riding ?? 0)
  })
})

describe('теги работают в игре', () => {
  // Школа магии и уличные наставники водятся в столице, туда и ставим героя.
  const world = generateWorld(1)
  const capital = world.kingdoms.reEstiz?.capitalId ?? ''

  const gameFrom = (templateId: string) => {
    const optionIds = templateOptionIds(BIOGRAPHY, templateId)
    if (!optionIds) throw new Error(`нет шаблона ${templateId}`)
    const state = createGame(createCharacter(draftOf(optionIds)), 1, world)
    return { ...state, locationId: capital }
  }

  it('в школу магии берут только своих', () => {
    const insider = applyCommand(gameFrom('schoolServant'), {
      type: 'work',
      jobId: 'serveAtSchool',
    })
    const outsider = applyCommand(gameFrom('fallenNoble'), {
      type: 'work',
      jobId: 'serveAtSchool',
    })
    expect(insider.ok).toBe(true)
    expect(outsider.ok).toBe(false)
    if (!outsider.ok) expect(outsider.code).toBe('requirements')
  })

  it('уличное прошлое открывает дешёвую и кривую магию', () => {
    // Полоумная старуха сидит на окраине городка, а не в столице.
    const townId =
      Object.values(world.locations).find((location) => location.archetype === 'town')?.id ?? ''
    const inTown = (templateId: string) => ({ ...gameFrom(templateId), locationId: townId })

    const streetRat = applyCommand(inTown('cutpurse'), {
      type: 'study',
      courseId: 'streetCharms',
    })
    const noble = applyCommand(inTown('fallenNoble'), {
      type: 'study',
      courseId: 'streetCharms',
    })
    expect(streetRat.ok).toBe(true)
    expect(noble.ok).toBe(false)
    if (!noble.ok) expect(noble.code).toBe('requirements')
  })
})
