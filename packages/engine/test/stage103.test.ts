import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { PLAYER, holdingsOf } from '../src/holding'
import { type Word, bring, knownTo, spreadWords, truthOf } from '../src/known'
import {
  LIES,
  lieLedger,
  mistakeOf,
  remember,
  trustOf,
  trustWords,
  weigh,
  whoGains,
} from '../src/lies'
import { skimAt } from '../src/report'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 103: ложь и проверка.
 *
 * У лжи появляется хозяин и цена: кому выгодно, чтобы в неё поверили; чем
 * кончается очная ставка двух источников; и во что обошлась ошибка.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, 8)
  const map = { ...settlements }
  for (const one of mine)
    map[one.locationId] = { ...one, owner: PLAYER, garrison: { spearman: 20 } }
  // Чужим местам тоже ставим гарнизоны: врать интересно о том, что есть.
  for (const one of Object.values(settlements)
    .filter((place) => place.population > 400 && !mine.includes(place))
    .slice(0, 10)) {
    map[one.locationId] = { ...one, garrison: { spearman: 45 } }
  }
  return {
    ...game,
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

const word = (
  over: Partial<Word> & { kind: Word['kind']; about: string; value: number },
): Word => ({
  id: `word:${over.kind}:${over.about}:${over.source ?? 'rumour'}`,
  to: PLAYER,
  source: 'rumour',
  from: null,
  day: day - 10,
  ...over,
})

describe('Л1: кому выгодно', () => {
  it('у всякой лжи есть выгодоприобретатель, и он выводится', () => {
    const state = ruler()
    const far = Object.values(state.settlements).find(
      (one) => one.owner !== PLAYER && one.population > 400,
    )
    if (!far) return
    const truth = truthOf(state, world, { kind: 'garrison', about: far.locationId }, day)
    const small = whoGains(
      state,
      world,
      word({ kind: 'garrison', about: far.locationId, value: 0 }),
      day,
    )
    const big = whoGains(
      state,
      world,
      word({ kind: 'garrison', about: far.locationId, value: 500 }),
      day,
    )
    console.log(`на деле ${truth}. Сказали 0 — выгодно ${small?.who}: ${small?.why}`)
    console.log(`Сказали 500 — выгодно ${big?.who}: ${big?.why}`)
    expect(small?.who).toBeTruthy()
    expect(big?.why).not.toBe(small?.why)
  })
})

describe('Л2 и Л4: два источника и имя', () => {
  it('сойдутся — веришь, разойдутся — веришь тому, кто не врал', () => {
    const state = ruler()
    const about = holdingsOf(state.settlements, PLAYER)[1]?.locationId as string
    let words = bring(
      state.words ?? [],
      word({ kind: 'garrison', about, value: 20, source: 'own', from: 'Лукьян', day: day - 20 }),
    )
    words = bring(
      words,
      word({ kind: 'garrison', about, value: 21, source: 'envoy', from: 'Гюрята', day: day - 12 }),
    )
    const agreeing: GameState = { ...state, words }
    const agreed = weigh(agreeing, world, { kind: 'garrison', about }, day)
    console.log(`двадцать и двадцать один: ${agreed.says}`)
    expect(agreed.agree).toBe(true)

    let clashWords = bring(
      state.words ?? [],
      word({ kind: 'garrison', about, value: 20, source: 'own', from: 'Лукьян', day: day - 20 }),
    )
    clashWords = bring(
      clashWords,
      word({ kind: 'garrison', about, value: 120, source: 'envoy', from: 'Гюрята', day: day - 2 }),
    )
    const clashing: GameState = { ...state, words: clashWords }
    const clash = weigh(clashing, world, { kind: 'garrison', about }, day)
    console.log(`двадцать против ста двадцати: ${clash.says}`)
    expect(clash.agree).toBe(false)

    // А теперь Лукьян уже врал: цена его вести падает, и верят другому.
    const burnt: GameState = {
      ...clashing,
      trust: remember(remember({}, 'Лукьян', true), 'Лукьян', true),
    }
    const after = weigh(burnt, world, { kind: 'garrison', about }, day)
    console.log(
      `после двух уличений: верят ${after.best.from} (${after.best.value}); ${trustWords(burnt, 'Лукьян')} Доверие ${trustOf(burnt, 'Лукьян')}`,
    )
    expect(trustOf(burnt, 'Лукьян')).toBeLessThan(1)
    expect(after.best.from).toBe('Гюрята')
  })
})

describe('Л3: поймать на лжи', () => {
  it('ревизия и проверка молвы записывают ложь за источником', () => {
    const state = ruler()
    const thief = holdingsOf(state.settlements, PLAYER).find(
      (one) => skimAt(state, world, one.locationId, day) > 0,
    )
    if (!thief) return
    const after = ok(applyCommand(state, { type: 'orderAudit', locationId: thief.locationId }))
    const ledger = lieLedger(after)
    console.log(`${after.log[after.log.length - 1]?.text ?? ''} ${ledger.says}`)
    expect(ledger.sources).toBeGreaterThan(0)
    expect(ledger.lies).toBeGreaterThan(0)
    expect(LIES.memoryYears).toBeGreaterThan(0)
  })
})

describe('Л5 и Л6: цена ошибки и счёт лжи', () => {
  it('ошибка считается разницей с правдой, а не объявляется', () => {
    const state = ruler()
    const about = holdingsOf(state.settlements, PLAYER)[2]?.locationId as string
    const truth = truthOf(state, world, { kind: 'garrison', about }, day)
    const wrong: GameState = {
      ...state,
      words: bring(
        state.words ?? [],
        word({ kind: 'garrison', about, value: 4, source: 'rumour', day: day - 3 }),
      ),
    }
    const known = knownTo(wrong, world, PLAYER, { kind: 'garrison', about }, day)
    const mistake = mistakeOf(wrong, world, known, day)
    console.log(`${spreadWords(known)} — ${mistake.says} (на деле ${truth})`)
    expect(mistake.off).toBeGreaterThan(0)

    const right: GameState = {
      ...state,
      words: bring(
        state.words ?? [],
        word({
          kind: 'garrison',
          about,
          value: truth as number,
          source: 'own',
          from: 'посланный',
          day: day - 3,
        }),
      ),
    }
    const good = mistakeOf(
      right,
      world,
      knownTo(right, world, PLAYER, { kind: 'garrison', about }, day),
      day,
    )
    console.log(`а по донесению своих: ${good.says}`)
    expect(good.off).toBe(0)

    const empty = lieLedger({ trust: {} })
    console.log(empty.says)
    expect(empty.sources).toBe(0)
  })
})
