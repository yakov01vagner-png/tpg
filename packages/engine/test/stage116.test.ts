import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { voteOf } from '../src/congress'
import { PROOF, PROOF_DEFS } from '../src/content/proof'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import {
  type Proof,
  congressWeight,
  forgerySeen,
  proofLedger,
  proofsAvailable,
  showWorth,
  weightOf,
} from '../src/proof'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics, relationOf } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 116: чужие договоры.
 *
 * До сих пор чужой союз был записью в состоянии — игрок видел его сразу и
 * целиком. Теперь между «знать» и «доказать» лежит расстояние, и оно
 * оказывается главным: мир верит не тому, кто прав, а тому, у кого бумага.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const first = kingdoms[1] as string
const second = kingdoms[2] as string
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(extra: Partial<GameState> = {}): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 60000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 900)
    .slice(0, 5)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    ...extra,
  }
}

describe('Чд1 и Чд2: знать и доказать — разное', () => {
  it('без знания и без людей доказательства не добыть', () => {
    const state = ruler()
    const blind = proofsAvailable(state, world, first, second, day)
    for (const one of blind) {
      console.log(`${PROOF_DEFS[one.kind].label}: ${one.can ? 'можно' : 'нельзя'} — ${one.why}`)
    }
    // Подделать можно всегда; остальное — нет.
    expect(blind.find((one) => one.kind === 'forged')?.can).toBe(true)
    expect(blind.find((one) => one.kind === 'letter')?.can).toBe(false)

    // Со знанием и своим человеком при их дворе — можно.
    const ready = ruler({
      learned: { [`${first}:${second}`]: day - 10 },
      spies: [{ id: 'spy:1', kingdomId: first, seat: 'court', sinceDay: day - 100 }],
    })
    const have = proofsAvailable(ready, world, first, second, day)
    console.log(
      `со своим человеком: ${have
        .filter((one) => one.can)
        .map((one) => PROOF_DEFS[one.kind].label)
        .join(', ')}`,
    )
    expect(have.find((one) => one.kind === 'letter')?.can).toBe(true)

    const got = ok(applyCommand(ready, { type: 'getProof', kind: 'letter', a: first, b: second }))
    console.log(got.log.find((one) => one.text.includes('добыто'))?.text)
    expect(got.proofs).toHaveLength(1)
    expect(got.character.money).toBe(ready.character.money - PROOF_DEFS.letter.cost)
  })

  it('бумага ветшает', () => {
    const proof: Proof = {
      id: 'proof:seal',
      kind: 'seal',
      about: `${first}:${second}`,
      against: PLAYER,
      gotDay: day,
    }
    console.log(
      `сама грамота: сегодня ${weightOf(proof, day)}, через три года ${weightOf(proof, day + 365 * 3)}`,
    )
    expect(weightOf(proof, day + 365 * 3)).toBeLessThan(weightOf(proof, day))
  })
})

describe('Чд3: предъявить миру', () => {
  it('третьи поворачиваются на вес бумаги, а на слово — почти нет', () => {
    const bare = showWorth(null, day)
    const seal = showWorth(
      {
        id: 'proof:seal',
        kind: 'seal',
        about: `${first}:${second}`,
        against: PLAYER,
        gotDay: day,
      },
      day,
    )
    console.log(`без бумаги: ${bare.says} Поворот ${bare.turn}`)
    console.log(`${seal.says} Поворот ${seal.turn}`)
    expect(seal.turn).toBeGreaterThan(bare.turn * 3)

    const ready = ruler({
      learned: { [`${first}:${second}`]: day - 10 },
      spies: [{ id: 'spy:1', kingdomId: first, seat: 'court', sinceDay: day - 100 }],
    })
    const got = ok(applyCommand(ready, { type: 'getProof', kind: 'seal', a: first, b: second }))
    const proof = got.proofs?.[0]
    if (!proof) return
    const third = kingdoms[3] as string
    const before = relationOf(got.politics, PLAYER, third)
    const shown = ok(applyCommand(got, { type: 'showProof', proofId: proof.id }))
    console.log(shown.log.find((one) => one.text.includes('Предъявлено'))?.text)
    console.log(
      `${world.kingdoms[third]?.name}: ${before} → ${relationOf(shown.politics, PLAYER, third)}; ${world.kingdoms[first]?.name}: ${relationOf(got.politics, PLAYER, first)} → ${relationOf(shown.politics, PLAYER, first)}`,
    )
    expect(relationOf(shown.politics, PLAYER, third)).toBeGreaterThan(before)
    expect(relationOf(shown.politics, PLAYER, first)).toBeLessThan(
      relationOf(got.politics, PLAYER, first),
    )

    // И обвинить можно без бумаги — только мир пожмёт плечами.
    const said = ok(applyCommand(ruler(), { type: 'accuse', a: first, b: second }))
    console.log(said.log.find((one) => one.text.includes('плечами'))?.text)
  })
})

describe('Чд4: подделка', () => {
  it('подделку могут сличить, и тогда врун — ты', () => {
    const state = ruler()
    const forged = ok(
      applyCommand(state, { type: 'getProof', kind: 'forged', a: first, b: second }),
    )
    const proof = forged.proofs?.[0]
    if (!proof) return
    const fresh = forgerySeen(forged, world, proof, day)
    const old = forgerySeen(forged, world, proof, day + 365 * 2)
    console.log(`свежая: ${fresh.says}`)
    console.log(`через два года: ${old.says}`)
    expect(old.chance).toBeGreaterThan(fresh.chance)
    // Не бросок: тот же день — тот же ответ.
    expect(forgerySeen(forged, world, proof, day).seen).toBe(fresh.seen)

    const shown = ok(applyCommand(forged, { type: 'showProof', proofId: proof.id }))
    console.log(shown.log[shown.log.length - 1]?.text)
    if (fresh.seen) {
      expect(shown.proofs?.[0]?.exposed).toBe(true)
      expect(shown.proofLog?.caught).toBe(1)
      expect(PROOF.forgeryCost).toBeLessThan(0)
    } else {
      expect(shown.proofs?.[0]?.shown).toBe(true)
    }
  })
})

describe('Чд5 и Чд6: съезд и счёт', () => {
  it('на съезде бумага весит больше речи', () => {
    const proof: Proof = {
      id: 'proof:seal',
      kind: 'seal',
      about: `${first}:${second}`,
      against: PLAYER,
      gotDay: day,
      shown: true,
    }
    console.log(
      `${PROOF_DEFS.seal.label} на съезде весит ${congressWeight(proof, day)} голоса (${PROOF.atCongress} от веса)`,
    )
    expect(congressWeight(proof, day)).toBeGreaterThan(0)
    expect(congressWeight(null, day)).toBe(0)

    const third = kingdoms[3] as string
    const without = ruler()
    const with_ = ruler({ proofs: [proof] })
    const voteWithout = voteOf(without, world, third, 'commonFoe', first, day)
    const voteWith = voteOf(with_, world, third, 'commonFoe', first, day)
    console.log(
      `голос ${world.kingdoms[third]?.name} за «общий враг ${world.kingdoms[first]?.name}»: без бумаги ${voteWithout}, с бумагой ${voteWith}`,
    )
    expect(voteWith).toBeGreaterThan(voteWithout)
  })

  it('век считает, что добыто и что сличено', () => {
    const state = ruler()
    console.log(proofLedger(state, day).says)
    const forged = ok(
      applyCommand(state, { type: 'getProof', kind: 'forged', a: first, b: second }),
    )
    const ledger = proofLedger(forged, day)
    console.log(ledger.says)
    expect(ledger.got).toBe(1)
    expect(ledger.forged).toBe(1)
  })
})
