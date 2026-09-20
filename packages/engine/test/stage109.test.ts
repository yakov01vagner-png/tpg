import { describe, expect, it } from 'vitest'
import { bandSize } from '../src/band'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { EYE_DEFS } from '../src/content/fog'
import { createSettlements } from '../src/economy'
import {
  FOG,
  blindToShare,
  driftOf,
  foeBands,
  fogMap,
  lastSeen,
  mightBeIn,
  roadHops,
  sightingsNow,
  surpriseOf,
  whoSees,
} from '../src/fog'
import { PLAYER } from '../src/holding'
import { withPlaceRep } from '../src/reputation'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 109: где чужое войско.
 *
 * До сих пор карта знала всё: чужая дружина стояла на ней всегда и точно.
 * Теперь у войска две разные вещи — где оно есть и где его видели, — и
 * расстояние между ними растёт со временем.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const foe = kingdoms[1] as string
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Государь в войне: свои места, свой отряд и чужая дружина где-то рядом. */
function atWarState(): { state: GameState; foeBandId: string; far: string } {
  const game = createGame(createCharacter({ name: 'Ратша', money: 20000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, 5)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  const here = mine[0]?.locationId ?? game.locationId
  // Чужая дружина стоит далеко: её не видит никакой твой глаз.
  const far =
    Object.values(world.locations).find(
      (one) =>
        one.id !== here &&
        !mine.some((own) => own.locationId === one.id) &&
        (map[one.id]?.population ?? 0) > 0,
    )?.id ?? here
  const theirLord = politics.lords.find((one) => one.kingdomId === foe)
  const state: GameState = {
    ...game,
    politics: {
      ...politics,
      wars: [{ a: PLAYER, b: foe, since: 100, reason: 'спорная марка' }],
    },
    settlements: map,
    locationId: here,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    party: { ...game.party, units: { militia: 40, spearman: 20 }, morale: 70 },
    bands: [
      {
        id: 'band:foe',
        lordId: theirLord?.id ?? 'lord:x',
        kingdomId: foe,
        units: { militia: 50 },
        morale: 60,
        locationId: far,
        travel: null,
        goal: { type: 'muster' },
        siegeDays: 0,
      },
    ],
  }
  return { state, foeBandId: 'band:foe', far }
}

describe('Т1 и Т2: последнее известное место', () => {
  it('о войске за горизонтом ты не знаешь ничего — и это честный ответ', () => {
    const { state, foeBandId } = atWarState()
    const blank = lastSeen(state, world, PLAYER, foeBandId, day)
    console.log(`без вестей: ${blank.says}`)
    expect(blank.seenAt).toBeNull()
    expect(blank.sure).toBe(false)
  })

  it('чем старее весть, тем шире круг', () => {
    const { state, foeBandId, far } = atWarState()
    const told: GameState = {
      ...state,
      words: [
        {
          id: 'saw:1',
          to: PLAYER,
          kind: 'host',
          about: foeBandId,
          value: far,
          source: 'own',
          from: state.locationId,
          day: day - 1,
        },
      ],
    }
    for (const age of [1, 5, 15, 30]) {
      const known = lastSeen(told, world, PLAYER, foeBandId, day - 1 + age)
      console.log(`через ${age} суток: круг ${known.drift} переходов — ${known.says}`)
    }
    const fresh = lastSeen(told, world, PLAYER, foeBandId, day)
    const stale = lastSeen(told, world, PLAYER, foeBandId, day + 20)
    expect(stale.drift).toBeGreaterThan(fresh.drift)
    expect(driftOf(0)).toBe(0)
    expect(driftOf(100)).toBe(FOG.maxDrift)

    const circle = mightBeIn(world, far, stale.drift)
    console.log(
      `через три недели войско может быть в любом из ${circle.length} мест вокруг ${world.locations[far]?.name}`,
    )
    expect(circle.length).toBeGreaterThan(1)
    expect(mightBeIn(world, far, 0)).toEqual([far])

    // Совсем старую весть честнее выкинуть, чем показывать.
    const forgotten = lastSeen(told, world, PLAYER, foeBandId, day + FOG.staleDays + 5)
    console.log(`через ${FOG.staleDays + 5} суток: ${forgotten.says}`)
    expect(forgotten.seenAt).toBeNull()
  })
})

describe('Т3: кто видит', () => {
  it('видишь там, где у тебя кто-то есть, — и каждый глаз видит по-своему', () => {
    const { state, foeBandId } = atWarState()
    const band = state.bands[0]
    if (!band) return
    for (const eye of Object.values(EYE_DEFS)) {
      console.log(`${eye.label}: видит на ${eye.hops} переход(а), доносит за ${eye.delay} сут.`)
    }
    // Войско стоит далеко — ни один глаз его не берёт.
    expect(whoSees(state, world, PLAYER, band, day)).toBeNull()

    // Приведи его к своему месту — и его увидят.
    const close: GameState = {
      ...state,
      bands: [{ ...band, locationId: state.locationId }],
    }
    const eye = whoSees(close, world, PLAYER, close.bands[0] ?? band, day)
    console.log(`у своего двора: видит ${eye ? EYE_DEFS[eye.eye].label : 'никто'}`)
    expect(eye).not.toBeNull()

    const seen = sightingsNow(close, world, PLAYER, day)
    console.log(`донесений за сутки: ${seen.length}, весть дойдёт на ${seen[0]?.day}-й день`)
    expect(seen).toHaveLength(1)
    expect(seen[0]?.kind).toBe('host')
  })

  it('дальний глаз доносит медленнее ближнего', () => {
    const { state } = atWarState()
    const band = state.bands[0]
    if (!band) return
    // Куда дотягивается глаз войска, но не дотягивается глаз города.
    const far = Object.values(world.locations).find((one) => {
      const near = roadHops(world, state.locationId, one.id, EYE_DEFS.host.hops)
      const close = roadHops(world, state.locationId, one.id, EYE_DEFS.place.hops)
      return near !== null && close === null
    })
    if (!far) return
    const there: GameState = {
      ...state,
      bands: [{ ...band, locationId: far.id }],
      settlements: Object.fromEntries(
        Object.entries(state.settlements).map(([id, one]) => [
          id,
          id === state.locationId ? one : { ...one, owner: null },
        ]),
      ),
    }
    const eye = whoSees(there, world, PLAYER, there.bands[0] ?? band, day)
    console.log(
      `${far.name} в ${roadHops(world, state.locationId, far.id, 9)} переходах: видит ${eye ? EYE_DEFS[eye.eye].label : 'никто'}`,
    )
    expect(eye?.eye).toBe('host')
    const seen = sightingsNow(there, world, PLAYER, day)
    console.log(`весть от своей части дойдёт на ${seen[0]?.day}-й день (послана на ${day}-й)`)
    expect(seen[0]?.source).toBe('eyes')
  })
})

describe('Т4: внезапность', () => {
  it('войско, о котором не знали, ломает строй прежде первого удара', () => {
    const { state, foeBandId } = atWarState()
    const band = state.bands[0]
    if (!band) return
    const here: GameState = { ...state, bands: [{ ...band, locationId: state.locationId }] }
    const blind: GameState = { ...here, words: [] }
    const unseen = surpriseOf(
      { ...blind, settlements: {}, bands: blind.bands },
      world,
      'crown:none',
      blind.bands[0] ?? band,
      day,
    )
    console.log(`не знали: ${unseen.says} дух −${unseen.moraleHit}`)
    expect(unseen.surprised).toBe(true)
    expect(unseen.moraleHit).toBeGreaterThan(0)

    // Тот, кто видит войско своими глазами, врасплох не застаётся.
    const ready = surpriseOf(blind, world, PLAYER, blind.bands[0] ?? band, day)
    console.log(`видели сами: ${ready.says}`)
    expect(ready.surprised).toBe(false)

    // И это видно в бою: дух отряда падает до первого раунда.
    const fought = applyCommand(
      { ...blind, settlements: {}, locationId: blind.locationId },
      { type: 'attackBand', bandId: foeBandId },
    )
    if (fought.ok) {
      console.log(
        `дух ${blind.party.morale} → ${fought.state.party.morale}${fought.state.battle ? '' : ' (боя не вышло)'}`,
      )
    }
  })
})

describe('Т5 и Т6: своих тоже не видно, и это на карте', () => {
  it('чужая корона узнаёт о тебе теми же глазами', () => {
    const { state } = atWarState()
    const myBand = {
      id: 'band:mine',
      lordId: PLAYER,
      kingdomId: PLAYER,
      units: { militia: 30 },
      morale: 70,
      locationId: state.locationId,
      travel: null,
      goal: { type: 'muster' } as const,
      siegeDays: 0,
    }
    const both: GameState = { ...state, bands: [...state.bands, myBand] }
    const theirs = lastSeen(both, world, foe, 'band:mine', day)
    console.log(`что знает ${world.kingdoms[foe]?.name} о твоей части: ${theirs.says}`)
    expect(theirs.sure).toBe(false)

    // Но подойди к их городу — и увидят: код у обеих сторон один.
    const theirSeat = Object.values(both.settlements).find(
      (one) =>
        one.owner === `crown:${foe}` ||
        both.politics.lords.some((lord) => lord.id === one.owner && lord.kingdomId === foe),
    )
    if (!theirSeat) return
    const near: GameState = {
      ...both,
      bands: both.bands.map((one) =>
        one.id === 'band:mine' ? { ...one, locationId: theirSeat.locationId } : one,
      ),
    }
    const theirEyes = sightingsNow(near, world, foe, day)
    console.log(
      `твоя часть подошла к ${world.locations[theirSeat.locationId]?.name} — их донесений за сутки: ${theirEyes.length}`,
    )
    expect(theirEyes.some((one) => one.about === 'band:mine')).toBe(true)
  })

  it('карта показывает, что известно и насколько это старо', () => {
    const { state, foeBandId, far } = atWarState()
    expect(foeBands(state, PLAYER).length).toBeGreaterThan(0)
    console.log(`слепота: ${Math.round(blindToShare(state, world, day) * 100)}% чужих войск`)
    expect(blindToShare(state, world, day)).toBe(1)

    const told: GameState = {
      ...state,
      words: [
        {
          id: 'saw:1',
          to: PLAYER,
          kind: 'host',
          about: foeBandId,
          value: far,
          source: 'own',
          from: state.locationId,
          day: day - 6,
        },
      ],
    }
    const rows = fogMap(told, world, day)
    for (const row of rows) console.log(`${row.name}: ${row.says}`)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.age).toBe(6)
    expect(blindToShare(told, world, day)).toBe(0)
  })

  it('донесения приходят сами: своё место видит и говорит', () => {
    const { state } = atWarState()
    const band = state.bands[0]
    if (!band) return
    const here: GameState = { ...state, bands: [{ ...band, locationId: state.locationId }] }
    let later = here
    for (let step = 0; step < FOG.beat + 2; step += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const hostWords = (later.words ?? []).filter((one) => one.kind === 'host')
    console.log(
      `за ${FOG.beat + 2} суток донесений о чужих войсках: ${hostWords.length}; ${lastSeen(later, world, PLAYER, band.id, day + FOG.beat + 2).says}`,
    )
    expect(hostWords.length).toBeGreaterThan(0)
  })
})
