import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { DEFEATS, DEFEAT_DEFS, HOLDS, RISK } from '../src/content/risk'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { partySize } from '../src/party'
import { afterDefeat, oldDebts, otherFight, riskOf, siegeOnMe } from '../src/risk'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics, warsOf } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 153: цена риска и старые долги.
 *
 * У поражения шесть степеней с именами; свою крепость можно оборонять, а в
 * чужой бой — прийти.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(places: number, extra: Partial<GameState> = {}): GameState {
  const base = createGame(createCharacter({ name: 'Ратша', money: 60000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, places)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...base,
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? base.locationId,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    party: { ...base.party, units: { ...base.party.units, spearman: 120 } },
    ...extra,
  }
}

/** Чужая дружина под твоими стенами. */
function besieged(men: number, extra: Partial<GameState> = {}): GameState {
  const state = ruler(6, extra)
  const foe = kingdoms[0] as string
  return {
    ...state,
    politics: {
      ...state.politics,
      wars: [...state.politics.wars, { a: PLAYER, b: foe, since: day - 30, reason: 'спор' }],
    },
    bands: [
      ...state.bands,
      {
        id: 'band:foe',
        lordId: 'lord:foe',
        kingdomId: foe,
        units: { spearman: men },
        morale: 70,
        locationId: state.locationId,
        travel: null,
        goal: { type: 'raid', targetId: state.locationId },
        siegeDays: 12,
      },
    ],
  }
}

describe('Рс1, Рс2, Рс3 и Рс4: риск назван, поражение градуировано', () => {
  it('видно, чем рискуешь, и что осталось от прошлых проигрышей', () => {
    for (const id of DEFEATS) {
      console.log(
        `${DEFEAT_DEFS[id].label}: ${DEFEAT_DEFS[id].says} Платится ${DEFEAT_DEFS[id].costs}.`,
      )
    }
    const big = ruler(9)
    console.log(riskOf(big, world, kingdoms[0] as string, day).says)
    const small = ruler(2)
    console.log(riskOf(small, world, kingdoms[0] as string, day).says)
    expect(riskOf(small, world, kingdoms[0] as string, day).worst).not.toBe(
      riskOf(big, world, kingdoms[0] as string, day).worst,
    )

    const paying = ruler(6, {
      politics: {
        ...politics,
        tributes: [
          ...politics.tributes,
          { from: PLAYER, to: kingdoms[0] as string, perDay: 6, untilDay: day + 500 },
        ],
      },
    })
    console.log(oldDebts(paying, world, day).says)
    expect(oldDebts(paying, world, day).tributes).toBe(1)
    console.log(afterDefeat(paying, world, day).says)
  })
})

describe('Рс0 и Рс0б: оборона своего и чужой бой', () => {
  it('под своими стенами есть три хода', () => {
    const state = besieged(60)
    const siege = siegeOnMe(state, world, day)
    console.log(siege.says)
    for (const one of siege.moves) console.log(one.says)
    // Под стенами не только приведённая дружина: там же стоят и те, кто стоял.
    expect(siege.men).toBeGreaterThanOrEqual(60)
    expect(siege.moves).toHaveLength(HOLDS.length)

    const paid = ok(applyCommand(state, { type: 'holdWalls', move: 'pay' }))
    console.log(
      `откуп: казна ${state.character.money} -> ${paid.character.money}, под стенами ${siegeOnMe(paid, world, day).men}`,
    )
    expect(siegeOnMe(paid, world, day).men).toBe(0)

    const out = ok(applyCommand(besieged(20), { type: 'holdWalls', move: 'sally' }))
    console.log(
      `вылазка против двадцати: отряд ${partySize(state.party)} -> ${partySize(out.party)}, под стенами ${siegeOnMe(out, world, day).men}`,
    )
  })

  it('в чужой бой можно прийти на любой стороне', () => {
    const state = ruler(6)
    const a = kingdoms[0] as string
    const b = kingdoms[1] as string
    const field: GameState = {
      ...state,
      politics: {
        ...state.politics,
        wars: [...state.politics.wars, { a, b, since: day - 20, reason: 'своя война' }],
      },
      bands: [
        ...state.bands,
        {
          id: 'band:a',
          lordId: 'lord:a',
          kingdomId: a,
          units: { spearman: 40 },
          morale: 70,
          locationId: state.locationId,
          travel: null,
          goal: { type: 'raid', targetId: state.locationId },
          siegeDays: 0,
        },
        {
          id: 'band:b',
          lordId: 'lord:b',
          kingdomId: b,
          units: { spearman: 40 },
          morale: 70,
          locationId: state.locationId,
          travel: null,
          goal: { type: 'raid', targetId: state.locationId },
          siegeDays: 0,
        },
      ],
    }
    console.log(otherFight(field, world, day).says)
    expect(otherFight(field, world, day).sides).toHaveLength(2)

    const joined = ok(applyCommand(field, { type: 'joinFight', side: a }))
    console.log(
      `вошёл на стороне ${world.kingdoms[a]?.name}: войн у тебя ${warsOf(joined.politics, PLAYER).length}, слава ${field.renown} -> ${joined.renown}`,
    )
    expect(warsOf(joined.politics, PLAYER).length).toBeGreaterThan(
      warsOf(field.politics, PLAYER).length,
    )
  })
})
