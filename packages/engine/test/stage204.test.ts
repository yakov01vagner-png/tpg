import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import { MIGRATIONS, deserialize, serialize } from '../src/save'
import type { GameState } from '../src/state'
import { SCHEMA_VERSION, createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { worldGrid } from '../src/world/grid'

/**
 * Этап 204: сейвы, телефон и скорость.
 *
 * Слоты и автосейв живут в приложении с этапа 24; здесь меряется то, чем
 * девять блоков нагрузили сейв и такт, — после всего, а не до.
 *
 * Мера снимается на счётной машине, а не на телефоне: слабое устройство
 * считают впятеро медленнее, и потому все границы ниже — пятая доля того, что
 * можно позволить на ходу.
 */

const WEAK_PHONE = 5

function ms(work: () => void, times = 10): number {
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < times; i += 1) {
    const start = performance.now()
    work()
    best = Math.min(best, performance.now() - start)
  }
  return best
}

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

/** Не новичок с пустым состоянием, а держава со всем, что накопили девять блоков. */
function loaded(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, 8)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  const them = Object.keys(world.kingdoms)[0] as string
  return {
    ...game,
    politics: {
      ...politics,
      wars: [{ a: PLAYER, b: them, since: 100, reason: 'спор о марке' }],
      alliances: [
        { a: PLAYER, b: Object.keys(world.kingdoms)[1] as string, since: 50, byMarriage: true },
      ],
      tributes: [{ from: them, to: PLAYER, perDay: 12, untilDay: 9000 }],
    },
    settlements: map,
    time: WORLD_START,
    locationId: mine[0]?.locationId ?? game.locationId,
    realm: { name: 'Заречье', sinceDay: 1 },
    peaces: [{ against: them, day: 90, terms: [], mediator: null, harshness: 40, yielded: them }],
    congresses: [{ day: 80, question: 'roads', passed: true, guests: 5 }],
  }
}

describe('Сй1, Сй5: сейв цел и переносится', () => {
  it('состояние уходит в строку и возвращается тем же', () => {
    const state = loaded()
    const raw = serialize(state)
    const back = deserialize(raw)
    expect(back.ok).toBe(true)
    if (!back.ok) return
    // Перенос между устройствами — это и есть строка: что ушло, то и пришло.
    expect(serialize(back.state)).toBe(raw)
    expect(back.state.politics.wars.length).toBe(1)
    expect(back.state.realm?.name).toBe('Заречье')
  })

  it('сейв прежней версии поднимается миграциями', () => {
    const state = loaded()
    // Берём сейв и объявляем его на колено старше: миграция обязана его
    // догнать. Цепочка непрерывна — иначе обновление игры теряет чужие сейвы.
    const older = JSON.parse(serialize(state)) as Record<string, unknown>
    older.schemaVersion = SCHEMA_VERSION - 1
    const back = deserialize(JSON.stringify(older))
    expect(back.ok).toBe(true)
    if (back.ok) expect(back.state.schemaVersion).toBe(SCHEMA_VERSION)
    for (let version = 1; version < SCHEMA_VERSION; version += 1) {
      expect(MIGRATIONS[version], `нет миграции с ${version}`).toBeDefined()
    }
  })
})

describe('Сй3–Сй4, Сй6: бюджет после девяти блоков', () => {
  it('сейв в пределах: размер, запись и разбор', () => {
    const state = loaded()
    const raw = serialize(state)
    const write = ms(() => serialize(state), 5)
    const read = ms(() => deserialize(raw), 5)
    console.log(
      `сейв ${(raw.length / 1024).toFixed(0)} КБ, запись ${write.toFixed(1)} мс, разбор ${read.toFixed(1)} мс; на слабом телефоне впятеро дороже: ${(read * WEAK_PHONE).toFixed(0)} мс`,
    )
    expect(raw.length).toBeLessThan(1024 * 1024)
    // Разбор на слабом телефоне — не дольше секунды: столько человек ждёт
    // загрузку, не считая игру сломанной.
    expect(read * WEAK_PHONE).toBeLessThan(1000)
    expect(write * WEAK_PHONE).toBeLessThan(1000)
  })

  it('такт и карта на нагруженной державе', { retry: 2 }, () => {
    let current = loaded()
    const day = ms(() => {
      current = (applyCommand(current, { type: 'tick', minutes: 24 * 60 }) as { state: GameState })
        .state
    }, 20)
    const grid = ms(() => worldGrid(world, 56 * 12), 3)
    console.log(
      `сутки ${day.toFixed(2)} мс, сетка ${grid.toFixed(1)} мс; на слабом телефоне ${(day * WEAK_PHONE).toFixed(0)} и ${(grid * WEAK_PHONE).toFixed(0)} мс`,
    )
    // Сутки на слабом телефоне — меньше ста миллисекунд: часы идут раз в
    // секунду, и такт не должен быть заметен.
    expect(day * WEAK_PHONE).toBeLessThan(100)
    // Карта открывается не чаще раза в несколько минут, и полсекунды на неё —
    // предел терпения.
    expect(grid * WEAK_PHONE).toBeLessThan(500)
  })
})
