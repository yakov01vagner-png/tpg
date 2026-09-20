import { describe, expect, it } from 'vitest'
import {
  ACCLAIM,
  DEARER,
  DEARER_DEFS,
  TITLE_NEEDS,
  acclaimLedger,
  givingCost,
  hasGiven,
  strangerCost,
  titleWorth,
  wouldRecall,
} from '../src/acclaim'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { DOORS, DOOR_DEFS } from '../src/content/union'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { titleDef, titleOf } from '../src/title'
import { createPolitics, pairOf } from '../src/war'
import { recognisedBySides, recognises, wayOf } from '../src/way'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 138: признание.
 *
 * Титул значит то, что его признали. Признание берут пятью дверями, его можно
 * отозвать, и тому, кого не признали, дороже всё, что делается через чужие
 * руки.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Остудить отношения: в ядре это делает команда, здесь — рука. */
function chill(state: GameState, id: string, to: number): GameState {
  return {
    ...state,
    politics: {
      ...state.politics,
      relations: { ...state.politics.relations, [pairOf(PLAYER, id)]: to },
    },
  }
}

function dayOfState(state: GameState): number {
  return Math.floor((state.time - WORLD_START) / (24 * 60)) + 1
}

function ruler(places: number, extra: Partial<GameState> = {}): GameState {
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, places)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...createGame(createCharacter({ name: 'Ратша', money: 300000 }), 1, world),
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? '',
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    crowned: { day: 300, titleId: 'king', guests: [], absent: kingdoms },
    ...extra,
  }
}

describe('Пр1 и Пр2: титул значит то, что его признали', () => {
  it('коронация без признания — слово без дела', () => {
    const alone = ruler(60)
    const worth = titleWorth(alone, world, day)
    console.log(`${worth.says} (${worth.claimed} -> ${worth.real})`)
    console.log(
      `порог по титулам: ${Object.entries(TITLE_NEEDS)
        .map(([id, need]) => `${titleDef(id as never).label} ${need}`)
        .join(', ')}`,
    )
    expect(worth.hollow).toBe(true)

    const known = ruler(60, {
      recognitions: Object.fromEntries(kingdoms.slice(0, 6).map((id) => [id, 200])),
    })
    const worth2 = titleWorth(known, world, day)
    console.log(worth2.says)
    expect(worth2.hollow).toBe(false)
  })

  it('пятая дверь — церковь: за помазанника говорит не он сам', () => {
    for (const id of DOORS) console.log(`${DOOR_DEFS[id].label}: ${DOOR_DEFS[id].about}`)
    const plain = ruler(20)
    const before = recognisedBySides(plain, world, PLAYER, day).yes.length
    const holy = { ...plain, anointed: { sinceDay: 300 } }
    const after = recognisedBySides(holy, world, PLAYER, day).yes.length
    console.log(`признавших без помазания ${before}, с помазанием ${after}`)
    expect(after).toBeGreaterThan(before)

    // А холодному соседу и церковь не указ.
    const cold = chill(holy, kingdoms[0] ?? '', -60)
    console.log(
      `с холодным ${world.kingdoms[kingdoms[0] ?? '']?.name}: ${recognises(cold, world, PLAYER, kingdoms[0] ?? '', day)}`,
    )
    expect(recognises(cold, world, PLAYER, kingdoms[0] ?? '', day)).toBe(false)
  })
})

describe('Пр3 и Пр4: отозвать и жить непризнанным', () => {
  it('признание отзывают — и с той стороны, и с этой', () => {
    const of = kingdoms[0] ?? ''
    const state = ok(applyCommand(ruler(20), { type: 'recogniseCrown', of }))
    expect(hasGiven(state, of)).toBe(true)
    const back = ok(applyCommand(state, { type: 'recallRecognition', of }))
    console.log(
      `отозвано: ${(back.recalls ?? []).length}; отношение ${state.politics.relations[pairOf(PLAYER, of)] ?? 0} -> ${back.politics.relations[pairOf(PLAYER, of)] ?? 0}`,
    )
    expect(hasGiven(back, of)).toBe(false)
    expect((back.recalls ?? []).length).toBe(1)

    // И они отзывают своё: тому, с кем холодно ниже дна.
    const cold = ruler(20, {
      recognitions: { [of]: 200 },
      time: WORLD_START + (ACCLAIM.beat * 14 - 2) * 24 * 60,
    })
    const chilled = chill(cold, of, ACCLAIM.recallsAt - 10)
    console.log(
      `готовы отозвать: ${wouldRecall(chilled, world, PLAYER, day)
        .map((id) => world.kingdoms[id]?.name)
        .join(', ')}`,
    )
    let after = chilled
    for (let i = 0; i < 6; i += 1) after = ok(applyCommand(after, { type: 'rest', hours: 12 }))
    console.log(
      `их признание осталось: ${(after.recognitions?.[of] ?? 0) > 0}; отзывов ${(after.recalls ?? []).length}`,
    )
    expect((after.recognitions?.[of] ?? 0) > 0).toBe(false)
  })

  it('непризнанному дороже всё, что делается чужими руками', () => {
    for (const id of DEARER) console.log(`${DEARER_DEFS[id].label}: ${DEARER_DEFS[id].says}`)
    const alone = ruler(20)
    const cost = strangerCost(alone, world, day)
    console.log(cost.says)
    expect(cost.times).toBeGreaterThan(1)

    const known = ruler(20, {
      recognitions: Object.fromEntries(kingdoms.map((id) => [id, 200])),
    })
    console.log(strangerCost(known, world, day).says)
    expect(strangerCost(known, world, day).times).toBe(1)

    // И это настоящая цена: посольство непризнанного дороже в тех же долях.
    const to = kingdoms[1] ?? ''
    const poorer = ok(
      applyCommand(alone, { type: 'sendEnvoy', to, errand: 'passage', byLetter: true }),
    )
    const richer = ok(
      applyCommand(known, { type: 'sendEnvoy', to, errand: 'passage', byLetter: true }),
    )
    console.log(
      `посольство непризнанного ${alone.character.money - poorer.character.money}, признанного ${known.character.money - richer.character.money}`,
    )
    expect(alone.character.money - poorer.character.money).toBeGreaterThan(
      known.character.money - richer.character.money,
    )
  })
})

describe('Пр5 и Пр6: признание чужого и всё это в числах', () => {
  it('признать чужого — значит двинуть его путь', () => {
    const of = kingdoms[0] ?? ''
    // Слабый признаёт сильного и без слов: чтобы признание было поступком, надо
    // быть тем, кто мог бы и не признать.
    const state = ruler(120)
    const before = wayOf(state, world, of, 'crown', dayOfState(state))
    const cost = givingCost(state, world, of, day)
    console.log(cost.says)
    const after = ok(applyCommand(state, { type: 'recogniseCrown', of }))
    const moved = wayOf(after, world, of, 'crown', dayOfState(after))
    const yes = recognisedBySides(after, world, of, dayOfState(after)).yes.length
    console.log(
      `${world.kingdoms[of]?.name}: признавших ${recognisedBySides(state, world, of, dayOfState(state)).yes.length} -> ${yes}; путь короны ${before.share} -> ${moved.share}`,
    )
    expect(yes).toBeGreaterThan(recognisedBySides(state, world, of, dayOfState(state)).yes.length)
    expect(moved.share).toBeGreaterThanOrEqual(before.share)
  })

  it('признание в числах', () => {
    const state = ok(applyCommand(ruler(20), { type: 'recogniseCrown', of: kingdoms[2] ?? '' }))
    const ledger = acclaimLedger(state, world, day)
    console.log(ledger.says)
    expect(ledger.given).toBe(1)
    console.log(`титул: ${titleDef(titleOf(state)).label}`)
  })
})
