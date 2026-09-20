import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { DREAD } from '../src/content/dread'
import { KEYS, KEY_DEFS, LEAGUE } from '../src/content/league'
import { dreadSeen } from '../src/dread'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import {
  boundTo,
  keyTo,
  leagueAgainst,
  leagueLedger,
  leagueNow,
  leagueWar,
  whoStaysOut,
  whoToCall,
  wouldJoin,
} from '../src/league'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics, warsOf } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 136: коалиция против первого.
 *
 * Коалиции были и в 0.7, но складывались по силе. Здесь у них появляется
 * причина, которой не было: сходятся против того, кто вот-вот дойдёт, — и по
 * тому, что до них дошло, а не по правде.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
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
    ...createGame(createCharacter({ name: 'Ратша', money: 200000 }), 1, world),
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? '',
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    crowned: { day: 300, titleId: 'king', guests: kingdoms.slice(0, 3), absent: [] },
    ...extra,
  }
}

/** Тот, кого весь мир уже наслушался: вести о нём разошлись. */
function feared(extra: Partial<GameState> = {}): GameState {
  const base = ruler(16, {
    recognitions: Object.fromEntries(kingdoms.slice(0, 5).map((id) => [id, 100])),
    time: WORLD_START + (DREAD.wordBeat * 14 - 2) * 24 * 60,
    ...extra,
  })
  let state = base
  for (let i = 0; i < 4; i += 1) {
    state = ok(applyCommand(state, { type: 'rest', hours: 12 }))
  }
  return state
}

/** Прожить до ближайшего такта коалиций. */
function toBeat(state: GameState): GameState {
  let out = state
  for (let i = 0; i < LEAGUE.beat * 2; i += 1) {
    out = ok(applyCommand(out, { type: 'rest', hours: 12 }))
  }
  return out
}

describe('Ко1 и Ко2: причина, которой не было, и кто в стороне', () => {
  it('сходятся против того, кто ближе всех к концу', () => {
    const quiet = ruler(3)
    console.log(leagueAgainst(quiet, world, day).says)

    const state = feared()
    const now = dayOfState(state)
    const league = leagueAgainst(state, world, now)
    console.log(league.says)
    expect(league.against).toBe(PLAYER)
    expect(league.members.length).toBeGreaterThanOrEqual(LEAGUE.least)
  })

  it('связанный с тобой в коалицию не идёт, и это видно заранее', () => {
    const kin = kingdoms[0] ?? ''
    const debtor = kingdoms[1] ?? ''
    const state = feared({
      marriages: [{ kingdomId: kin, who: 'self', name: 'Мирава', sinceDay: 200, dowry: 0 }],
      crownDebts: { [debtor]: { owed: 12000, sinceDay: 100 } },
    })
    const now = dayOfState(state)
    for (const one of whoStaysOut(state, world, PLAYER, now)) {
      console.log(`${world.kingdoms[one.who]?.name}: в стороне — ${one.why}`)
    }
    expect(boundTo(state, world, PLAYER, kin, now).why).toBe('родня')
    expect(boundTo(state, world, PLAYER, debtor, now).why).toBe('должник')
    const against = wouldJoin(state, world, PLAYER, now)
    console.log(
      `против тебя пошли бы ${against.length}: ${against.map((id) => world.kingdoms[id]?.name).join(', ')}`,
    )
    expect(against).not.toContain(kin)
    expect(against).not.toContain(debtor)
    // А мир между тем считает первым уже не тебя: связанные тебя не боятся.
    console.log(leagueAgainst(state, world, now).says)
  })
})

describe('Ко3 и Ко4: цена разобрать и война всех против одного', () => {
  it('коалиция складывается сама и объявляет войны', () => {
    const state = feared()
    const after = toBeat(state)
    const now = dayOfState(after)
    const league = leagueNow(after, world, now)
    console.log(league.says)
    console.log(leagueWar(after, world, now).says)
    console.log(
      `войн у тебя было ${warsOf(state.politics, PLAYER).length}, стало ${warsOf(after.politics, PLAYER).length}`,
    )
    expect(after.league?.against).toBe(PLAYER)
    expect(warsOf(after.politics, PLAYER).length).toBeGreaterThan(
      warsOf(state.politics, PLAYER).length,
    )
  })

  it('у всякого свой ключ, и коалиция разбирается по одному', () => {
    for (const id of KEYS) {
      console.log(`${KEY_DEFS[id].label}: ${KEY_DEFS[id].about} ${KEY_DEFS[id].after}`)
    }
    const state = feared()
    const after = toBeat(state)
    const now = dayOfState(after)
    const league = leagueNow(after, world, now)
    const member = league.members[0] ?? ''
    const key = keyTo(after, world, member, now)
    console.log(key.says)

    const bought = ok(applyCommand(after, { type: 'breakLeague', member }))
    const left = leagueNow(bought, world, dayOfState(bought))
    console.log(
      `в коалиции было ${league.members.length}, стало ${left.members.length}; казна ${after.character.money} -> ${bought.character.money}`,
    )
    expect(left.members).not.toContain(member)
    expect(warsOf(bought.politics, PLAYER).length).toBeLessThan(
      warsOf(after.politics, PLAYER).length,
    )

    // Второй раз того же не купишь: ключ уже сработал.
    const again = applyCommand(bought, { type: 'breakLeague', member })
    console.log(again.ok ? 'купили дважды' : again.message)
    expect(again.ok).toBe(false)
  })
})

describe('Ко5 и Ко6: собрать против чужого и всё это в числах', () => {
  it('можно быть участником, а не целью', () => {
    const state = feared()
    const now = dayOfState(state)
    const call = whoToCall(state, world, now)
    console.log(call.says)
    if (call.against) {
      const after = applyCommand(state, { type: 'callLeague', against: call.against })
      console.log(
        after.ok
          ? `собрано против ${world.kingdoms[call.against]?.name}: войн у него ${warsOf(after.state.politics, call.against).length}`
          : after.message,
      )
      if (after.ok) {
        expect(after.state.league?.against).toBe(call.against)
      }
    }
    expect(call.says.length).toBeGreaterThan(10)
  })

  it('коалиции в числах', () => {
    const after = toBeat(feared())
    const ledger = leagueLedger(after, world, dayOfState(after))
    console.log(ledger.says)
    expect(ledger.formed).toBeGreaterThan(0)

    const seen = dreadSeen(after, world, kingdoms[0] ?? '', PLAYER, dayOfState(after))
    console.log(`а видят они вот что: ${seen.says}`)
  })
})
