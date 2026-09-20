import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { THEIRS } from '../src/content/theirs'
import { WAYS, WAY_DEFS, WAY_MEASURES } from '../src/content/way'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { crownLand, crownMight, crownPiety, theirsOf } from '../src/theirs'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { measureFor, wayOf } from '../src/way'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 162: пути, которые корона может пройти.
 *
 * Мерка пути была одна на всех, но мерить у корон было нечего: благочестие,
 * дела, казна, родня и ранг считались только у игрока. Три пути из пяти стояли
 * для них закрытыми, а на открытых они замирали на полудороге. Здесь проверено,
 * что у чужой стороны есть то же самое — и что оно выведено из мира, а не
 * добавлено в состояние.
 */

function worldAt(seed: number): { state: GameState; world: ReturnType<typeof generateWorld> } {
  const world = generateWorld(seed)
  const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(seed))
  const game = createGame(createCharacter({ name: 'Ратша', money: 100 }), 1, world)
  return {
    world,
    state: { ...game, politics, settlements, time: WORLD_START, quarter: null },
  }
}

describe('Пк1–Пк4: у чужой стороны есть то же самое', () => {
  it('благочестие, дела, казна, родня и ранг считаются у каждой короны', () => {
    const { state, world } = worldAt(1)
    const rows = Object.keys(world.kingdoms).map((id) => theirsOf(state, world, id, 1))
    for (const row of rows) console.log(row.says)
    // Ни одной величины, которая у всех ноль: иначе это опять заглушка.
    expect(rows.some((row) => row.piety > 0)).toBe(true)
    expect(rows.every((row) => row.ventures > 0)).toBe(true)
    expect(rows.every((row) => row.purse > 0)).toBe(true)
    expect(rows.some((row) => row.kin.length > 0)).toBe(true)
    // Архимаг бывает не только игроком.
    expect(rows.some((row) => row.tier >= THEIRS.artifactsFrom)).toBe(true)
    expect(rows.some((row) => row.artifacts > 0)).toBe(true)
  })

  it('всё это выведено из мира: то же состояние — те же числа', () => {
    const { state, world } = worldAt(1)
    const id = Object.keys(world.kingdoms)[0] as string
    expect(theirsOf(state, world, id, 1)).toEqual(theirsOf(state, world, id, 1))
    // Благочестие идёт от обителей в её земле, а войны его съедают.
    const land = crownLand(state, world, id)
    console.log(
      `${id}: мест ${land.places}, обителей ${land.monasteries}, портов ${land.ports}, рудников ${land.mines}, городов ${land.cities}`,
    )
    expect(land.places).toBeGreaterThan(0)
    const peaceful = crownPiety(
      { ...state, politics: { ...state.politics, wars: [] } },
      world,
      id,
      1,
    )
    expect(peaceful).toBeGreaterThanOrEqual(crownPiety(state, world, id, 1))
    // Двор меняется с коленом, а не каждый день.
    expect(crownMight(world, id, 1).tier).toBe(crownMight(world, id, 200).tier)
  })
})

describe('Пк5 и Пк6: пять путей на девять сторон', () => {
  it('любой путь считается у любой стороны, и ни одна мерка не мертва', () => {
    const { state, world } = worldAt(1)
    for (const way of WAYS) expect(WAY_DEFS[way].forCrowns).toBe(true)
    // Мир первого дня беден нарочно: колен ещё не сменилось, войн нет и дани
    // никто не платит. Живость мерок проверяется на мире, в котором всё это
    // случилось, — иначе проверяется календарь, а не расчёт.
    const [first, second, third] = Object.keys(world.kingdoms) as [string, string, string]
    const lived: GameState = {
      ...state,
      politics: {
        ...state.politics,
        wars: [{ a: second, b: third, since: 11000, reason: 'спор о земле' }],
        tributes: [{ from: third, to: second, perDay: 40, untilDay: 13000 }],
      },
    }
    const sides = [PLAYER, ...Object.keys(world.kingdoms)]
    for (const measure of WAY_MEASURES) {
      const live = sides.filter((side) => measureFor(lived, world, side, measure, 12000) > 0).length
      expect(live, measure).toBeGreaterThan(0)
    }
    for (const id of Object.keys(world.kingdoms)) {
      const shares = WAYS.map((way) => wayOf(state, world, id, way, 1))
      console.log(
        `${id}: ${shares.map((one) => `${one.way} ${Math.round(one.share * 100)}`).join(', ')}`,
      )
      for (const one of shares) {
        expect(one.share).toBeGreaterThan(0)
        expect(one.share).toBeLessThanOrEqual(1)
      }
    }
  })

  it('на трёх зёрнах корона подошла к концу пути, и остаток назван словами', () => {
    for (const seed of [1, 2, 3]) {
      const { state, world } = worldAt(seed)
      let best: { id: string; way: string; share: number; left: readonly string[] } | null = null
      for (const id of Object.keys(world.kingdoms)) {
        for (const way of WAYS) {
          const one = wayOf(state, world, id, way, 1)
          if (!best || one.share > best.share) {
            best = { id, way: one.way, share: one.share, left: one.left }
          }
        }
      }
      expect(best).toBeTruthy()
      if (!best) return
      console.log(
        `зерно ${seed}: ${best.id} идёт ${best.way}, пройдено ${Math.round(best.share * 100)}, осталось: ${best.left.join('; ') || 'ничего'}`,
      )
      // До 1.0 лучшая корона стояла на половине пути и не двигалась.
      expect(best.share).toBeGreaterThan(0.8)
      // Остаток — не число, а имена тех, кто не признал.
      expect(best.left.join(' ')).not.toBe('')
    }
  })
})
