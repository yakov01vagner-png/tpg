import { describe, expect, it } from 'vitest'
import { bandSize } from '../src/band'
import { createCharacter } from '../src/character'
import { MIND } from '../src/content/mind'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { strengthBoard, strengthOf } from '../src/mind'
import { partySize } from '../src/party'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 161: одна мерка силы.
 *
 * До 1.0 мерок было полторы. У игрока считались только его дружины — ни свой
 * отряд, ни гарнизоны, ни стены; у корон считались дружины и места. Числа
 * выходили несравнимыми, и всё, что их сравнивало, подпиралось надбавками
 * вроде «ранг стоит 1200 силы». Здесь проверяется, что мерка одна: те же
 * части, тот же код, и всё, что у стороны есть, в счёт попадает.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)

function ruler(places = 6): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 20000 }), 1, world)
  const taken = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, places)
  const map = { ...settlements }
  for (const one of taken) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    politics,
    settlements: map,
    time: WORLD_START,
    locationId: taken[0]?.locationId ?? game.locationId,
    quarter: null,
    party: { ...game.party, units: { spearman: 40, archer: 20 } },
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

describe('См1 и См3: одна мерка на всех', () => {
  it('в силу игрока идёт всё, что у него есть: отряд, гарнизоны, стены', () => {
    const state = ruler()
    const mine = strengthOf(state, world, PLAYER, 1)
    console.log(mine.says)
    // Свой отряд — такие же люди в поле, как чужая дружина.
    expect(partySize(state.party)).toBe(60)
    const field = state.bands
      .filter((band) => band.lordId === PLAYER)
      .reduce((sum, band) => sum + bandSize(band), 0)
    expect(mine.men).toBe(field + 60)
    // Гарнизоны и стены названы отдельно, а не свалены в «людей».
    const held = Object.values(state.settlements).filter((one) => one.owner === PLAYER)
    expect(mine.places).toBe(held.filter((one) => one.population > 0).length)
    expect(mine.walls).toBe(held.filter((one) => one.buildings.includes('walls')).length)
    // Отряд без людей — и счёт меньше ровно на цену этих людей.
    const bare = strengthOf({ ...state, party: { ...state.party, units: {} } }, world, PLAYER, 1)
    expect(mine.score - bare.score).toBe(Math.round(60 * MIND.manWeight))
  })

  it('корона считается тем же кодом: те же части у всех', () => {
    const state = ruler()
    const rows = [PLAYER, ...kingdoms].map((side) => strengthOf(state, world, side, 1))
    for (const row of rows.slice(0, 5)) console.log(row.says)
    for (const row of rows) {
      // Ни у кого нет части, которой нет у другого: мерка одна.
      expect(Object.keys(row).sort()).toEqual(
        ['allies', 'guards', 'men', 'places', 'says', 'score', 'ships', 'side', 'walls'].sort(),
      )
      expect(row.score).toBeGreaterThanOrEqual(0)
    }
    // Гарнизон короны тоже считается — и дороже нуля, но дешевле поля.
    const crown = kingdoms[0] as string
    const seat = Object.values(state.settlements).find(
      (one) => one.owner === `crown:${crown}` && one.population > 0,
    )
    expect(seat).toBeTruthy()
    if (!seat) return
    const before = strengthOf(state, world, crown, 1)
    const withGuards = strengthOf(
      {
        ...state,
        settlements: {
          ...state.settlements,
          [seat.locationId]: { ...seat, garrison: { spearman: 50 } },
        },
      },
      world,
      crown,
      1,
    )
    console.log(
      `${crown}: без гарнизона ${before.score}, с пятьюдесятью за стенами ${withGuards.score}`,
    )
    expect(withGuards.guards - before.guards).toBe(50 - (seat.garrison.spearman ?? 0))
    expect(withGuards.score).toBeGreaterThan(before.score)
    expect(MIND.guardWeight).toBeLessThan(MIND.manWeight)
  })
})

describe('См5: силу видно', () => {
  it('доска ставит державу и короны на одну шкалу, и чужое на ней — вести', () => {
    const state = ruler(10)
    const board = strengthBoard(state, world, 1)
    console.log(board.says)
    for (const row of board.rows) {
      console.log(`  ${row.side}: ${row.score}${row.sure ? '' : ' (со слов)'}`)
    }
    expect(board.rows).toHaveLength(kingdoms.length + 1)
    expect(board.rows.filter((row) => row.sure)).toHaveLength(1)
    // Место в мире считается по той же шкале и сходится с порядком чисел.
    expect(board.rows[board.place - 1]?.side).toBe(PLAYER)
    const scores = board.rows.map((row) => row.score)
    expect([...scores].sort((a, b) => b - a)).toEqual(scores)
    // Больше земли — выше место или хотя бы не ниже.
    const smaller = strengthBoard(ruler(2), world, 1)
    console.log(`два места — ${smaller.mine.score}, десять — ${board.mine.score}`)
    expect(board.mine.score).toBeGreaterThan(smaller.mine.score)
    expect(board.place).toBeLessThanOrEqual(smaller.place)
  })
})
