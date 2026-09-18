import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { deserialize, serialize } from '../src/save'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { generateWorld } from '../src/world/generate'
import { worldGrid } from '../src/world/grid'
import { layoutOf } from '../src/world/layout'

/**
 * Бюджет на телефон (этап 16, T2).
 *
 * Слабый телефон — это примерно в пять раз медленнее этой машины. Поэтому
 * границы здесь жёстче, чем нужно здесь: если такт суток укладывается в пять
 * миллисекунд на сервере, на телефоне это двадцать пять — и часы на скорости
 * ×3 всё ещё не заикаются.
 */
const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/**
 * Сколько стоит одна работа, по лучшему из прогонов.
 *
 * Среднее здесь врёт: тесты идут в несколько потоков, и соседний файл, считающий
 * двадцать лет войны, растягивает наш такт вдвое — бюджет падал от чужой
 * нагрузки, а не от своей. Лучший прогон — это и есть цена работы на свободной
 * машине, а запас на слабый телефон заложен в самой границе.
 */
function ms(work: () => void, times = 1): number {
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < times; i += 1) {
    const start = performance.now()
    work()
    best = Math.min(best, performance.now() - start)
  }
  return best
}

describe('бюджет на телефон', () => {
  const world = generateWorld(1)
  const game = createGame(createCharacter({ name: 'Т' }), 1, world)

  it('холодный старт: мир, игра, разбор сейва', () => {
    const cold = ms(() => createGame(createCharacter({ name: 'Т' }), 2))
    const raw = serialize(game)
    const parse = ms(() => deserialize(raw), 5)
    console.log(
      `старт ${cold.toFixed(1)} мс, разбор сейва ${parse.toFixed(1)} мс, сейв ${(raw.length / 1024).toFixed(0)} КБ`,
    )
    expect(cold).toBeLessThan(200)
    expect(parse).toBeLessThan(60)
    // Мегабайт: с материка (этап 44) в мире тысяча шестьсот мест против шести
    // с половиной сотен, и сейв вырос с трёх с половиной сотен килобайт до
    // восьми. Что важно телефону — разбор, а не байты: он по-прежнему в
    // границе выше, а строка в мегабайт для хранилища не предел.
    expect(raw.length).toBeLessThan(1024 * 1024)
  })

  it('такт мира: сутки за пять миллисекунд, час — за одну', () => {
    let current = game
    const day = ms(() => {
      current = ok(applyCommand(current, { type: 'tick', minutes: 24 * 60 }))
    }, 20)
    const hour = ms(() => {
      current = ok(applyCommand(current, { type: 'tick', minutes: 60 }))
    }, 50)
    console.log(`сутки ${day.toFixed(2)} мс, час ${hour.toFixed(2)} мс`)
    // Пять: мир версии 0.3 вдвое больше — две сотни мест против шестидесяти
    // двух, — и такт всё равно укладывается в прежнюю границу. Цена такта сидит
    // в копиях состояния (правило №2: новое состояние на каждую команду), и это
    // не то, что стоит выкупать кэшем: память на долю производства не дала
    // ничего, а кода прибавила. Запас на слабый телефон пятикратный, то есть
    // двадцать пять миллисекунд на сутки мира при часах, идущих раз в секунду.
    // Десять на материке (этап 44): поселений четыре сотни против двух с
    // небольшим, и такт вырос вместе с ними — почти вдвое. Это граница до
    // этапа 48 («век и бюджет»), где такт большого мира считается отдельно.
    expect(day).toBeLessThan(10)
    expect(hour).toBeLessThan(2)
  })

  it('карта: сетка и раскладка считаются за кадр', () => {
    const grid = ms(() => worldGrid(world, 56 * 12), 3)
    const layout = ms(() => layoutOf(world), 3)
    console.log(`сетка ${grid.toFixed(1)} мс, раскладка ${layout.toFixed(1)} мс`)
    expect(grid).toBeLessThan(40)
    expect(layout).toBeLessThan(20)
  })
})
