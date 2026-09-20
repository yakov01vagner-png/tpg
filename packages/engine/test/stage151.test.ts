import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { FALLEN, REMAINS, REMAIN_DEFS } from '../src/content/fallen'
import { createSettlements } from '../src/economy'
import { exileAt, fallenLedger, realmLost, whatRemains, whoRemembers } from '../src/fallen'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics, pairOf } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 151: потеря державы.
 *
 * Держава кончается, когда кончается земля, — и это положение, а не конец
 * игры: остаются имя, дом, слово, спутники и знание.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Государь без единого места: земля взята вся. */
function landless(extra: Partial<GameState> = {}): GameState {
  const base = createGame(createCharacter({ name: 'Ратша', money: 4000 }), 1, world)
  return {
    ...base,
    // Человеку есть что терять и что сохранить: умения, отряд и летопись.
    character: {
      ...base.character,
      skills: {
        ...base.character.skills,
        persuasion: { level: 30, xp: 0 },
        scholarship: { level: 20, xp: 0 },
      },
    },
    party: { ...base.party, units: { ...base.party.units, spearman: 12 } },
    log: [
      {
        time: WORLD_START + 100 * 24 * 60,
        text: 'Ты венчан на царство',
        kind: 'world' as const,
      },
    ],
    politics,
    settlements,
    locationId: Object.values(settlements)[0]?.locationId ?? '',
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    ...extra,
  }
}

describe('По1, По2 и По5: держава кончилась, а игрок нет', () => {
  it('последнее место взято — и это названо прямо', () => {
    for (const id of REMAINS) console.log(`${REMAIN_DEFS[id].label}: ${REMAIN_DEFS[id].says}`)
    const state = landless({ time: WORLD_START + (FALLEN.beat * 41 - 2) * 24 * 60 })
    expect(realmLost(state)).toBe(true)
    console.log(whatRemains(state, world, day).says)

    let after = state
    for (let i = 0; i < 6; i += 1) after = ok(applyCommand(after, { type: 'rest', hours: 12 }))
    console.log(
      `держава: ${state.realm?.name} -> ${after.realm === null ? 'нет' : after.realm?.name}; потерь ${(after.fallenLog ?? []).length}`,
    )
    expect(after.realm).toBeNull()
    expect((after.fallenLog ?? []).length).toBe(1)
    console.log(fallenLedger(after, world, day).says)
  })
})

describe('По3 и По4: изгнание и память о тебе', () => {
  it('изгнанника принимает тот, кому ты не холоден', () => {
    const cold = landless()
    console.log(exileAt(cold, world, day).says)
    expect(exileAt(cold, world, day).at).toBeNull()

    const warm = landless({
      politics: {
        ...politics,
        relations: { ...politics.relations, [pairOf(PLAYER, kingdoms[0] as string)]: 40 },
      },
    })
    const where = exileAt(warm, world, day)
    console.log(where.says)
    const gone = ok(applyCommand(warm, { type: 'goIntoExile', at: where.at as string }))
    console.log(
      `при дворе ${world.kingdoms[gone.exile?.at ?? '']?.name} с ${gone.exile?.sinceDay}-го дня`,
    )
    expect(gone.exile?.at).toBe(where.at)
    expect(applyCommand(gone, { type: 'goIntoExile', at: where.at as string }).ok).toBe(false)

    const rows = whoRemembers(warm, world, day).slice(0, 4)
    for (const one of rows) console.log(one.says)
  })
})
