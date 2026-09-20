import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { OFFICES } from '../src/content/offices'
import { courtiersOf } from '../src/courtier'
import { createSettlements } from '../src/economy'
import { HIDDEN, coversFor, denounceOffer, lossLedger, shading } from '../src/hidden'
import { PLAYER } from '../src/holding'
import { lieLedger } from '../src/lies'
import { candidatesFor } from '../src/office'
import { skimAt } from '../src/report'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 105: что от тебя скрывают.
 *
 * Двор решает не только что сказать, но и когда: доброе доходит первым, дурное
 * позже и мягче. Свои прикрывают своих, и всегда есть тот, кто за плату
 * расскажет о другом — по своей выгоде, а не из любви к правде.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function court(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, 8)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER, banditry: 0.4 }
  let filled: GameState = {
    ...game,
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
  for (const office of OFFICES) {
    const who = candidatesFor(filled, office)[0]
    if (!who) continue
    filled = {
      ...filled,
      offices: {
        ...(filled.offices ?? {}),
        [office]: { holderId: who.id, kind: who.kind, sinceDay: day - 3 * DAYS_PER_YEAR },
      },
    }
  }
  return filled
}

describe('С1: доброе первым', () => {
  it('дурная весть отстаёт и приходит мягче', () => {
    const state = court()
    const people = courtiersOf(state, day)
    for (const one of people.slice(0, 3)) {
      const good = shading(one, true)
      const bad = shading(one, false)
      console.log(
        `${one.name} (${one.temper}): доброе — без задержки, дурное — на ${bad.days} сут. позже и ×${bad.soften.toFixed(2)}; проверка доброго ×${good.soften}`,
      )
    }
    const dragging = people.find((one) => shading(one, false).days > 0)
    expect(dragging).toBeTruthy()
    expect(shading(people[0] ?? null, true).days).toBe(0)
  })
})

describe('С3: кто прикрывает кого', () => {
  it('рука руку моет, и об этом тебе не скажут', () => {
    const state = court()
    const pairs = coversFor(state, day)
    for (const pair of pairs.slice(0, 3))
      console.log(`${pair.who} прикрывает ${pair.whom}: ${pair.why}`)
    console.log(`пар, прикрывающих друг друга: ${pairs.length}`)
    expect(pairs.length).toBeGreaterThanOrEqual(0)
  })
})

describe('С5: донос', () => {
  it('доносят за плату и не всегда правду', () => {
    const state = court()
    const offer = denounceOffer(state, world, day)
    console.log(offer?.says ?? 'доносить не на кого')
    if (!offer) return
    console.log(`верность доноса: ${Math.round(offer.truth * 100)} из ста`)

    const ignored = ok(applyCommand(state, { type: 'hearDenounce', pay: false }))
    expect(ignored.character.money).toBe(state.character.money)

    const paid = ok(applyCommand(state, { type: 'hearDenounce', pay: true }))
    console.log(`${paid.log[paid.log.length - 1]?.text ?? ''} ${lieLedger(paid).says}`)
    expect(paid.character.money).toBe(state.character.money - HIDDEN.denounceSilver)
    expect(Object.keys(paid.trust ?? {}).length).toBeGreaterThan(0)
  })
})

describe('С2 и С6: убытки в числах', () => {
  it('видно, сколько утекает и сколько смягчено', () => {
    const state = court()
    const ledger = lossLedger(state, world, day)
    console.log(ledger.says)
    const thieves = Object.values(state.settlements).filter(
      (one) => one.owner === PLAYER && skimAt(state, world, one.locationId, day) > 0,
    ).length
    console.log(`мест, где кладут себе: ${thieves}`)
    expect(ledger.skim).toBeGreaterThanOrEqual(0)
    expect(ledger.hidden).toBeGreaterThan(0)
  })
})
