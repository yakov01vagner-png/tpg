import { describe, expect, it } from 'vitest'
import { nextHop } from '../src/band'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, MINUTES_PER_DAY } from '../src/time'
import { generateWorld } from '../src/world/generate'
import { GRID_SIZE, worldGrid } from '../src/world/grid'
import { MAP_SIZE, layoutOf, provinceCentersOf } from '../src/world/layout'
import {
  FLOOD_FROM,
  crossesRiver,
  isFlood,
  landPieces,
  onRiver,
  pieceAt,
  riverMaskOf,
  riversOf,
} from '../src/world/rivers'
import { isWater } from '../src/world/sea'

/**
 * Этап 34: реки и переправы.
 *
 * В мире стояли броды и переправы, а реки, которую они переходят, не было: они
 * были местами с дурной репутацией и только. Теперь река режет сушу — и это
 * значит три вещи разом: дорога переходит её только там, где на русле стоит
 * место; весной брод уходит под воду; и провинция кончается на том берегу, а
 * не перешагивает его.
 */

const SEEDS = [1, 2, 3]

describe('река на карте', () => {
  it('у реки есть исток, русло и устье в море', () => {
    for (const seed of SEEDS) {
      const world = generateWorld(seed)
      const rivers = riversOf(world)
      const sea = world.sea
      expect(sea, `зерно ${seed} без воды`).toBeDefined()
      if (!sea) continue
      expect(rivers.length, `зерно ${seed}: рек нет`).toBeGreaterThanOrEqual(4)
      const lengths: number[] = []
      for (const river of rivers) {
        const source = river.points[0]
        const mouth = river.points[river.points.length - 1]
        expect(source).toBeDefined()
        expect(mouth).toBeDefined()
        if (!source || !mouth) continue
        // Исток на суше: река начинается там, где живут, а не в море.
        expect(isWater(sea, source.x, source.y), `${river.name}: исток в воде`).toBe(false)
        // Устье — в море: вода, которой некуда деться, — это не река.
        expect(isWater(sea, mouth.x, mouth.y), `${river.name}: устье не дошло до моря`).toBe(true)
        let length = 0
        for (let i = 1; i < river.points.length; i += 1) {
          const a = river.points[i - 1]
          const b = river.points[i]
          if (a && b) length += Math.hypot(b.x - a.x, b.y - a.y)
        }
        lengths.push(Math.round(length))
      }
      // Река короче дневного перехода — это ручей: такую не переходят вброд и
      // такую не рисуют.
      for (const length of lengths) expect(length).toBeGreaterThan(120)
      if (seed === 1) {
        console.log(`зерно 1: рек ${rivers.length}, длины ${lengths.join(', ')} единиц полотна`)
      }
    }
  })
})

describe('дорога переходит реку только в переправе', () => {
  it('ни один отрезок не идёт через русло мимо места на нём', () => {
    for (const seed of SEEDS) {
      const world = generateWorld(seed)
      const mask = riverMaskOf(world)
      let legs = 0
      let across = 0
      for (const [fromId, roads] of Object.entries(world.roads)) {
        const from = world.locations[fromId]
        if (!from) continue
        for (const road of roads) {
          const to = world.locations[road.to]
          if (!to || fromId > road.to) continue
          legs += 1
          if (crossesRiver(mask, from, to)) across += 1
        }
      }
      expect(legs, `зерно ${seed}: дорог нет`).toBeGreaterThan(100)
      expect(across, `зерно ${seed}: отрезков вплавь ${across}`).toBe(0)
    }
  })

  it('через реку всё-таки ходят: на руслах стоят места, и через них идут дороги', () => {
    for (const seed of SEEDS) {
      const world = generateWorld(seed)
      const mask = riverMaskOf(world)
      const onIt = Object.values(world.locations).filter((one) => onRiver(mask, one.x, one.y))
      expect(onIt.length, `зерно ${seed}: на руслах никто не стоит`).toBeGreaterThan(10)
      // Место на русле не тупик: в него приходят с одного берега и уходят на
      // другой, иначе оно не переправа, а конец дороги.
      const through = onIt.filter((one) => (world.roads[one.id] ?? []).length >= 2)
      expect(through.length / onIt.length).toBeGreaterThan(0.8)
      if (seed === 1) {
        const fords = onIt.filter((one) => one.archetype === 'ford').length
        console.log(`зерно 1: на руслах ${onIt.length} мест, из них бродов ${fords}`)
      }
    }
  })

  it('мир остаётся связным: река делит землю, но не рвёт её', () => {
    for (const seed of SEEDS) {
      const world = generateWorld(seed)
      const ids = Object.keys(world.locations)
      const first = ids[0]
      if (!first) continue
      const seen = new Set([first])
      const queue = [first]
      while (queue.length > 0) {
        const at = queue.pop() as string
        for (const road of world.roads[at] ?? []) {
          if (seen.has(road.to)) continue
          seen.add(road.to)
          queue.push(road.to)
        }
      }
      expect(seen.size, `зерно ${seed}: мир распался`).toBe(ids.length)
    }
  })
})

describe('брод — не всегда брод', () => {
  const world = generateWorld(1)

  /** Пара «откуда — в брод»: с этого места брод в одном переходе. */
  const toFord = (() => {
    for (const [fromId, roads] of Object.entries(world.roads)) {
      for (const road of roads) {
        if (world.locations[road.to]?.archetype === 'ford') return { fromId, toId: road.to }
      }
    }
    throw new Error('в мире нет бродов')
  })()

  const at = (day: number) =>
    ({
      ...createGame(createCharacter({ name: 'Т' }), 1, world),
      locationId: toFord.fromId,
      time: (day - 1) * MINUTES_PER_DAY + 8 * 60,
    }) as ReturnType<typeof createGame>

  it('в половодье через брод не пройти', () => {
    const result = applyCommand(at(FLOOD_FROM + 3), { type: 'travel', toLocationId: toFord.toId })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('flood')
    expect(result.message).toContain('Половодье')
  })

  it('в остальное время года — обычная дорога', () => {
    const result = applyCommand(at(FLOOD_FROM + 200), { type: 'travel', toLocationId: toFord.toId })
    expect(result.ok, result.ok ? '' : result.message).toBe(true)
  })

  it('половодье кончается: оно длится недели, а не полгода', () => {
    let flooded = 0
    for (let day = 1; day <= DAYS_PER_YEAR; day += 1) if (isFlood(day)) flooded += 1
    expect(flooded).toBeGreaterThan(14)
    expect(flooded).toBeLessThan(60)
    // И приходит каждый год, а не однажды.
    expect(isFlood(FLOOD_FROM + DAYS_PER_YEAR)).toBe(true)
  })

  it('войско обходит разлившийся брод той же дорогой, что и герой', () => {
    // Цель за бродом: в половодье шаг туда идёт мимо него.
    const beyond = (world.roads[toFord.toId] ?? []).find((road) => road.to !== toFord.fromId)
    if (!beyond) return
    const dry = nextHop(world, toFord.fromId, beyond.to, FLOOD_FROM + 200)
    const wet = nextHop(world, toFord.fromId, beyond.to, FLOOD_FROM + 3)
    expect(dry).toBe(toFord.toId)
    expect(wet).not.toBe(toFord.toId)
  })
})

describe('река — рубеж', () => {
  it('земля провинции не перешагивает через русло', () => {
    for (const seed of SEEDS) {
      const world = generateWorld(seed)
      const sea = world.sea
      const mask = riverMaskOf(world)
      if (!sea) continue
      const pieces = landPieces(sea, mask)
      const grid = worldGrid(world, MAP_SIZE)
      const points = layoutOf(world)
      const centres = provinceCentersOf(world)

      // Куски суши, на которых стоят якоря провинции: её середина и её места.
      const banks = new Map<string, Set<number>>()
      const remember = (provinceId: string, x: number, y: number) => {
        const set = banks.get(provinceId) ?? new Set<number>()
        set.add(pieceAt(pieces, sea.size, x, y))
        banks.set(provinceId, set)
      }
      for (const [provinceId, point] of Object.entries(centres)) {
        remember(provinceId, point.x, point.y)
      }
      for (const [locationId, point] of Object.entries(points)) {
        const provinceId = world.locations[locationId]?.provinceId
        if (provinceId) remember(provinceId, point.x, point.y)
      }

      let land = 0
      let cut = 0
      let nearest = 0
      const anchors: { x: number; y: number; piece: number }[] = []
      for (const point of Object.values(centres)) {
        anchors.push({ x: point.x, y: point.y, piece: pieceAt(pieces, sea.size, point.x, point.y) })
      }
      for (const point of Object.values(points)) {
        anchors.push({ x: point.x, y: point.y, piece: pieceAt(pieces, sea.size, point.x, point.y) })
      }
      for (let row = 0; row < GRID_SIZE; row += 1) {
        for (let column = 0; column < GRID_SIZE; column += 1) {
          const cell = grid.cells[row * GRID_SIZE + column]
          if (!cell) continue
          const x = (column + 0.5) * grid.cell
          const y = (row + 0.5) * grid.cell
          const mine = pieceAt(pieces, sea.size, x, y)
          if (mine < 0) continue
          land += 1
          if (!banks.get(cell.provinceId)?.has(mine)) cut += 1
          // Сколько было бы, если бы клетку брал просто ближайший якорь.
          let best = Number.POSITIVE_INFINITY
          let bestPiece = -1
          for (const anchor of anchors) {
            const distance = (anchor.x - x) ** 2 + (anchor.y - y) ** 2
            if (distance < best) {
              best = distance
              bestPiece = anchor.piece
            }
          }
          if (bestPiece !== mine) nearest += 1
        }
      }
      if (seed === 1) {
        console.log(
          `зерно 1: клеток суши ${land}, за рекой от своей провинции ${cut} (${((cut / land) * 100).toFixed(1)}%), по прежнему правилу «ближайший якорь» было бы ${nearest}`,
        )
      }
      expect(cut / land, `зерно ${seed}: за рекой ${cut} из ${land}`).toBeLessThan(0.03)
      // Правило должно что-то менять: иначе это не рубеж, а совпадение.
      expect(nearest).toBeGreaterThan(cut)
    }
  })
})
