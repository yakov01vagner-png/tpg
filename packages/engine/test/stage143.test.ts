import { describe, expect, it } from 'vitest'
import { balanceLedger, balanceSays, betrayers, warPressure } from '../src/balance'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { BALANCE } from '../src/content/balance'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { theirWay } from '../src/theirway'
import { WORLD_START } from '../src/time'
import { allied, createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 143: ИИ и равновесие.
 *
 * Союз держится не только отношением, но и тем, что союзник не вырвался
 * вперёд; война объявляется расчётом, а кубик остаётся на мелочи.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(extra: Partial<GameState> = {}): GameState {
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, 8)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world),
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? '',
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    ...extra,
  }
}

describe('Рв1, Рв3 и Рв5: равновесие считается, союз рвётся, и это видно', () => {
  it('вырвавшегося вперёд бросает его же союзник', () => {
    const first = kingdoms
      .map((id) => ({ id, share: theirWay(ruler(), world, id, day).share }))
      .sort((a, b) => b.share - a.share)[0]?.id as string
    const ally = kingdoms.find((id) => id !== first) as string
    const state = ruler({
      time: WORLD_START + (BALANCE.beat * 14 - 2) * 24 * 60,
      politics: {
        ...politics,
        alliances: [...politics.alliances, { a: ally, b: first, since: 100, byMarriage: false }],
      },
    })
    const rows = betrayers(state, world, day)
    console.log(rows[0]?.says ?? 'никто никого не бросает')
    expect(rows.length).toBeGreaterThan(0)
    expect(allied(state.politics, ally, first)).toBe(true)

    let after = state
    for (let i = 0; i < 6; i += 1) after = ok(applyCommand(after, { type: 'rest', hours: 12 }))
    console.log(
      `союз ${world.kingdoms[ally]?.name} — ${world.kingdoms[first]?.name} после такта: ${allied(after.politics, ally, first)}; брошено по расчёту ${after.balanceLog?.betrayals ?? 0}`,
    )
    expect(allied(after.politics, ally, first)).toBe(false)
    console.log(balanceSays(after, world, day))
  })
})

describe('Рв0 и Рв6: война перестаёт быть броском', () => {
  it('давление считается по страху и по связанности', () => {
    const state = ruler({
      politics: {
        ...politics,
        tributes: [
          ...politics.tributes,
          {
            from: kingdoms[0] as string,
            to: kingdoms[1] as string,
            perDay: 6,
            untilDay: day + 999,
          },
        ],
      },
    })
    const bound = warPressure(state, world, kingdoms[0] as string, kingdoms[1] as string, day)
    const free = warPressure(state, world, kingdoms[2] as string, kingdoms[3] as string, day)
    console.log(
      `давление: на того, кому платишь дань, ${bound}; на чужого, о ком ничего не слышно, ${free}`,
    )
    expect(bound).toBeLessThan(free)
    expect(free).toBeLessThanOrEqual(1)
    console.log(balanceLedger(state, world, day).says)
  })
})
