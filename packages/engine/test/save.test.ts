import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { deserialize, serialize } from '../src/save'
import { SCHEMA_VERSION, createGame } from '../src/state'
import { generateWorld } from '../src/world/generate'

function played() {
  const world = generateWorld(7)
  const base = createGame(createCharacter({ name: 'Тест', money: 30 }), 7, world)
  // Разгрузка телег водится в городах, поэтому начинаем со столицы.
  const start = { ...base, locationId: world.kingdoms.reEstiz?.capitalId ?? base.locationId }
  const result = applyCommand(start, { type: 'work', jobId: 'unloadCarts' })
  if (!result.ok) throw new Error(result.message)
  return result.state
}

describe('сохранение', () => {
  it('переживает круг сериализации без потерь', () => {
    const state = played()
    const loaded = deserialize(serialize(state))
    expect(loaded.ok).toBe(true)
    if (loaded.ok) expect(loaded.state).toEqual(state)
  })

  it('продолжается с того же места и тем же случаем', () => {
    const state = played()
    const loaded = deserialize(serialize(state))
    if (!loaded.ok) throw new Error(loaded.error)

    const direct = applyCommand(state, { type: 'work', jobId: 'runErrands' })
    const resumed = applyCommand(loaded.state, { type: 'work', jobId: 'runErrands' })
    expect(direct.ok && resumed.ok).toBe(true)
    if (direct.ok && resumed.ok) expect(resumed.state).toEqual(direct.state)
  })

  it('отказывается от мусора', () => {
    expect(deserialize('не json').ok).toBe(false)
    expect(deserialize('{"schemaVersion":1}').ok).toBe(false)
    expect(deserialize('{"foo":1}').ok).toBe(false)
  })

  it('не открывает сейв из более новой версии игры', () => {
    const state = played()
    const future = JSON.parse(serialize(state)) as Record<string, unknown>
    future.schemaVersion = SCHEMA_VERSION + 1
    const loaded = deserialize(JSON.stringify(future))
    expect(loaded.ok).toBe(false)
    if (!loaded.ok) expect(loaded.error).toContain('более новой версией')
  })

  it('честно говорит, что миграции нет', () => {
    const state = played()
    const old = JSON.parse(serialize(state)) as Record<string, unknown>
    old.schemaVersion = 0
    const loaded = deserialize(JSON.stringify(old))
    expect(loaded.ok).toBe(false)
    if (!loaded.ok) expect(loaded.error).toContain('миграции')
  })
})

describe('миграция сейвов', () => {
  it('поднимает сейв первой версии, дорисовывая мир', () => {
    const state = played()
    const old = JSON.parse(serialize(state)) as Record<string, unknown>
    // Так выглядел сейв до того, как в игре появился мир.
    old.schemaVersion = 1
    old.world = undefined
    old.locationId = undefined
    const json = JSON.stringify(old)

    const loaded = deserialize(json)
    expect(loaded.ok, loaded.ok ? '' : loaded.error).toBe(true)
    if (!loaded.ok) return
    expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(Object.keys(loaded.state.world.locations).length).toBeGreaterThan(0)
    expect(loaded.state.world.locations[loaded.state.locationId]).toBeDefined()
    // Прогресс персонажа миграция не трогает.
    expect(loaded.state.character.money).toBe(state.character.money)
    expect(loaded.state.character.skills.hardLabour.level).toBe(
      state.character.skills.hardLabour.level,
    )
  })
})
