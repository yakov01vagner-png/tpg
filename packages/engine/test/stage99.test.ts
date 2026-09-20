import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { KNOWN, SOURCE_DEFS } from '../src/content/known'
import { createSettlements } from '../src/economy'
import { PLAYER, garrisonSize } from '../src/holding'
import {
  type Word,
  bring,
  forgetOld,
  knownTo,
  offBy,
  seesNow,
  sourceDef,
  spreadOf,
  spreadWords,
  truthOf,
  wordsTo,
} from '../src/known'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 99: источник и возраст.
 *
 * До 0.8 всякое число доходило точным и мгновенным. Здесь между правдой и тем,
 * кто спрашивает, встаёт слой: у ответа есть источник, день, возраст и вилка. В
 * ядре остаётся правда — её читают мир и тесты; игрок и короны спрашивают через
 * слой.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const day = 400

function ruler(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 20000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, 3)
  const map = { ...settlements }
  for (const one of mine) {
    map[one.locationId] = { ...one, owner: PLAYER, garrison: { spearman: 25 } }
  }
  // Чужие места тоже с гарнизонами: в новорождённом мире они пусты, а спрашивать
  // интересно про то, что есть.
  for (const one of Object.values(settlements)
    .filter((place) => place.population > 500 && !mine.includes(place))
    .slice(0, 12)) {
    map[one.locationId] = { ...one, garrison: { spearman: 35 } }
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

/** Чужое место подальше: о нём знать нечего, пока не принесут. */
function theirs(state: GameState): string {
  const found = Object.values(state.settlements).find(
    (one) => one.owner !== PLAYER && garrisonSize(one) > 0,
  )
  if (!found) throw new Error('нет чужого места с гарнизоном')
  return found.locationId
}

function word(
  over: Partial<Word> & { kind: Word['kind']; about: string; value: number | string },
): Word {
  return {
    id: `word:${over.kind}:${over.about}:${over.source ?? 'rumour'}`,
    to: PLAYER,
    source: 'rumour',
    from: null,
    day: day - 10,
    ...over,
  }
}

describe('З1 и З2: три рода знания и возраст', () => {
  it('у источников разная цена, и весть стареет', () => {
    for (const id of ['eyes', 'own', 'envoy', 'rumour'] as const) {
      const def = SOURCE_DEFS[id]
      console.log(
        `${def.label}: верят на ${def.trust}, свежая вилка ${Math.round(def.spread * 100)} из ста, стареет ×${def.ages} — ${def.about}`,
      )
    }
    // Вилка растёт от возраста и расстояния, а не от произвола.
    const near = spreadOf('own', 10, 1)
    const old = spreadOf('own', 700, 1)
    const far = spreadOf('own', 10, 8)
    console.log(
      `донесение своих: свежее и рядом — ${near}, двухлетнее — ${old}, из-за восьми переходов — ${far}`,
    )
    expect(old).toBeGreaterThan(near)
    expect(far).toBeGreaterThan(near)
    expect(spreadOf('rumour', 10, 1)).toBeGreaterThan(spreadOf('envoy', 10, 1))
  })
})

describe('З3 и З5: вилка и то, что знание не хранится', () => {
  it('без вестей — честное «не знаю», со вестью — вилка, а не точка', () => {
    const state = ruler()
    const far = theirs(state)
    const blank = knownTo(state, world, PLAYER, { kind: 'garrison', about: far }, day)
    console.log(`о чужом гарнизоне без вестей: ${blank.says} (${spreadWords(blank)})`)
    expect(blank.value).toBe(null)
    expect(blank.source).toBe(null)

    const truth = truthOf(state, world, { kind: 'garrison', about: far }, day)
    const heard: GameState = {
      ...state,
      words: bring(
        state.words ?? [],
        word({
          kind: 'garrison',
          about: far,
          value: 40,
          source: 'envoy',
          from: 'посол Гюрята',
          day: day - 40,
        }),
      ),
    }
    const known = knownTo(heard, world, PLAYER, { kind: 'garrison', about: far }, day)
    console.log(
      `по донесению посла: ${spreadWords(known)} (${known.says}); на деле ${truth}, разошлось на ${Math.round(offBy(heard, world, known, day) * 100)} из ста`,
    )
    expect(known.value).toBe(40)
    expect(known.source).toBe('envoy')
    expect(known.age).toBe(40)
    expect(known.spread).toBeGreaterThan(0)
    expect(spreadWords(known)).toContain('от')

    // Знание выводится: правда в состоянии не тронута.
    expect(truthOf(heard, world, { kind: 'garrison', about: far }, day)).toBe(truth)
  })

  it('своими глазами — точно и без вилки', () => {
    const state = ruler()
    const own = state.locationId
    expect(seesNow(state, world, PLAYER, { kind: 'garrison', about: own })).toBe(true)
    const known = knownTo(state, world, PLAYER, { kind: 'garrison', about: own }, day)
    console.log(`своё место: ${spreadWords(known)} — ${known.says}`)
    expect(known.source).toBe('eyes')
    expect(known.spread).toBe(0)
    expect(known.value).toBe(truthOf(state, world, { kind: 'garrison', about: own }, day))
  })
})

describe('З4: расхождение источников', () => {
  it('две вести об одном названы расхождением', () => {
    const state = ruler()
    const far = theirs(state)
    let words = bring(
      state.words ?? [],
      word({
        kind: 'garrison',
        about: far,
        value: 30,
        source: 'own',
        from: 'наместник',
        day: day - 20,
      }),
    )
    words = bring(
      words,
      word({ kind: 'garrison', about: far, value: 90, source: 'rumour', day: day - 5 }),
    )
    const clashing: GameState = { ...state, words }
    const known = knownTo(clashing, world, PLAYER, { kind: 'garrison', about: far }, day)
    console.log(`${known.says} — берут ${spreadWords(known)}, второй источник говорил другое`)
    expect(known.clash).toBe(true)
    // Берут не самую свежую, а самую узкую: молва свежа, но широка.
    expect(known.source).toBe('own')
    expect(KNOWN.clash).toBeGreaterThan(0)
  })

  it('негодная весть не выдаётся за знание', () => {
    const state = ruler()
    const far = theirs(state)
    const ancient: GameState = {
      ...state,
      words: bring(
        state.words ?? [],
        word({ kind: 'garrison', about: far, value: 50, source: 'rumour', day: day - 1000 }),
      ),
    }
    const known = knownTo(ancient, world, PLAYER, { kind: 'garrison', about: far }, day)
    console.log(
      `тысячедневная молва: вилка была бы ${spreadOf('rumour', 1000, 9)} при пределе ${KNOWN.useless} — ${known.says}`,
    )
    expect(known.value).toBe(null)
  })
})

describe('З6: вести живут в состоянии и забываются', () => {
  it('одна весть на источник, старое забывается', () => {
    const state = ruler()
    const far = theirs(state)
    let words = bring(
      state.words ?? [],
      word({ kind: 'garrison', about: far, value: 10, source: 'own', day: day - 90 }),
    )
    words = bring(
      words,
      word({ kind: 'garrison', about: far, value: 20, source: 'own', day: day - 5 }),
    )
    console.log(
      `две вести от своих об одном: осталось ${words.length}, значение ${words[0]?.value}`,
    )
    expect(words).toHaveLength(1)
    expect(words[0]?.value).toBe(20)

    const old = [
      ...words,
      word({
        kind: 'garrison',
        about: far,
        value: 5,
        source: 'rumour',
        day: day - KNOWN.keepDays - 10,
      }),
    ]
    const kept = forgetOld(old, day)
    console.log(
      `забыто по сроку: было ${old.length}, осталось ${kept.length} (срок ${KNOWN.keepDays} сут.)`,
    )
    expect(kept).toHaveLength(1)
    expect(wordsTo({ words: kept }, PLAYER)).toHaveLength(1)
  })

  it('спрашивают все одинаково: у короны тот же слой', () => {
    const state = ruler()
    const side = kingdoms[1] as string
    const mine = state.locationId
    // Своё место короне не видно: она о нём знает только по вестям.
    expect(seesNow(state, world, side, { kind: 'garrison', about: mine })).toBe(false)
    const theirWord: Word = {
      ...word({ kind: 'garrison', about: mine, value: 12, source: 'rumour', day: day - 30 }),
      to: side,
    }
    const heard: GameState = { ...state, words: [theirWord] }
    const known = knownTo(heard, world, side, { kind: 'garrison', about: mine }, day)
    console.log(`${side} о твоём гарнизоне: ${spreadWords(known)} — ${known.says}`)
    expect(known.value).toBe(12)
    // А игроку эта весть не принадлежит: вести адресные.
    expect(
      knownTo(heard, world, PLAYER, { kind: 'garrison', about: theirs(state) }, day).value,
    ).toBe(null)
    expect(sourceDef('rumour').trust).toBeLessThan(sourceDef('own').trust)
  })
})
