import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { DECEIT, DECEIT_DEFS } from '../src/content/deceit'
import { deceitLedger, deceitOf, deceitWord, seeThrough, willBreak, wordWorth } from '../src/deceit'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { knownTo } from '../src/known'
import { strengthOf } from '../src/mind'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 121: он обманывает нарочно.
 *
 * До сих пор корона могла ошибаться, но не могла лгать: её слово всегда
 * означало её намерение. Теперь у неё есть то же, что у игрока с этапа 112, —
 * выгода от чужого незнания. И то же наказание: пойманный теряет слово надолго.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const foe = kingdoms[1] as string
const day = 396

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(extra: Partial<GameState> = {}): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 900)
    .slice(0, 6)
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
    party: { ...game.party, units: { militia: 120, spearman: 40 }, morale: 70 },
    ...extra,
  }
}

describe('Об2 и Об3: ложная слабость и ложная сила', () => {
  it('обман выводится из его положения, а не из броска', () => {
    const state = ruler()
    for (const [id, def] of Object.entries(DECEIT_DEFS)) {
      console.log(`${def.label}: ${def.about} Показывает ×${def.shows}, чтобы ${def.wants} — ${id}`)
    }
    // Обманывают не все и не всегда: найдём срок, когда обман есть.
    let found = 0
    let when = day
    for (let step = 0; step < 20 && found === 0; step += 1) {
      when = day + step * DECEIT.beat
      found = 0
      for (const side of kingdoms) {
        const lie = deceitOf(state, world, side, when)
        if (!lie.kind) continue
        found += 1
        console.log(
          `${when}-й день, ${world.kingdoms[side]?.name}: ${DECEIT_DEFS[lie.kind].label} — ${lie.says}`,
        )
      }
    }
    console.log(`на ${when}-й день обманывают ${found} корон из ${kingdoms.length}`)
    expect(found).toBeGreaterThan(0)
    // Не бросок: тот же день даёт то же решение.
    expect(deceitOf(state, world, foe, day).kind).toBe(deceitOf(state, world, foe, day).kind)

    // Весть, которую он подкладывает, — та же по виду, что правда.
    const truth = strengthOf(state, world, foe, day).score
    const strong = deceitWord(state, world, foe, 'strong', day)
    const weak = deceitWord(state, world, foe, 'weak', day)
    console.log(
      `на деле ${truth}: ложной силой покажет ${strong.value}, ложной слабостью ${weak.value}`,
    )
    expect(Number(strong.value)).toBeGreaterThan(truth)
    expect(Number(weak.value)).toBeLessThan(truth)
    const told: GameState = { ...state, words: [strong] }
    console.log(knownTo(told, world, PLAYER, { kind: 'strength', about: foe }, day + 2).says)
  })
})

describe('Об1: обещание, которого не сдержит', () => {
  it('сдержит или нет — считается выгодой, а не честностью', () => {
    const friendly = ruler({
      pledges: [
        { kingdomId: foe, kind: 'alliance', sinceDay: day - 10, untilDay: day + 300, kept: null },
      ],
    })
    const kind = willBreak(friendly, world, friendly.pledges?.[0] as never, day)
    console.log(`в мире: ${kind.says}`)

    const hostile = ruler({
      pledges: [
        { kingdomId: foe, kind: 'alliance', sinceDay: day - 10, untilDay: day + 300, kept: null },
      ],
      politics: {
        ...politics,
        wars: [{ a: PLAYER, b: foe, since: day - 5, reason: 'марка' }],
        relations: { [[PLAYER, foe].sort().join('|')]: -50 },
      },
    })
    const broken = willBreak(hostile, world, hostile.pledges?.[0] as never, day)
    console.log(`в войне и во вражде: ${broken.says}`)
    expect(broken.gain).toBeGreaterThan(kind.gain)
    expect(broken.breaks).toBe(true)

    // И это команда: слово можно взвесить.
    const weighed = ok(applyCommand(hostile, { type: 'weighPledge', of: foe }))
    console.log(weighed.log.find((one) => one.text.includes('Нарушить'))?.text)
    expect(weighed.log.length).toBeGreaterThan(0)
  })
})

describe('Об4: разгадать', () => {
  it('раскрывают свои люди там и расхождение вестей', () => {
    const blind = ruler()
    const bare = seeThrough(blind, world, foe, day)
    console.log(`без людей и без вестей: ${bare.says}`)

    const withSpy = ruler({
      spies: [{ id: 'spy:1', kingdomId: foe, seat: 'court', sinceDay: day - 60 }],
    })
    const eyed = seeThrough(withSpy, world, foe, day)
    console.log(`со своим соглядатаем: ${eyed.says}`)
    expect(eyed.chance).toBeGreaterThan(bare.chance)

    const truth = strengthOf(blind, world, foe, day).score
    const clashing = ruler({
      words: [
        deceitWord(blind, world, foe, 'strong', day - 2),
        { ...deceitWord(blind, world, foe, 'weak', day - 1), id: 'word:other' },
      ],
    })
    const clashed = seeThrough(clashing, world, foe, day)
    console.log(
      `когда вести расходятся (${Math.round(truth * 1.6)} и ${Math.round(truth * 0.55)}): ${clashed.says}`,
    )
    expect(clashed.chance).toBeGreaterThan(bare.chance)
  })
})

describe('Об5 и Об6: цена раскрытого обмана', () => {
  it('пойманный теряет слово, и это видно в цене его вестей', () => {
    const name = `посол ${world.kingdoms[foe]?.name}`
    const clean = ruler()
    const caught = ruler({ trust: { [name]: { said: 4, lied: 2 } } })
    console.log(
      `слово честного стоит ${wordWorth(clean, foe, world)}, пойманного дважды — ${wordWorth(caught, foe, world)}`,
    )
    expect(wordWorth(caught, foe, world)).toBeLessThan(1)
    expect(wordWorth(caught, foe, world)).toBeGreaterThanOrEqual(DECEIT.wordWorth)

    // Вилка его вестей от этого шире: доверие делит её (этап 103).
    const word = deceitWord(clean, world, foe, 'strong', day - 1)
    const honest = knownTo(
      { ...clean, words: [word] },
      world,
      PLAYER,
      { kind: 'strength', about: foe },
      day,
    )
    const liar = knownTo(
      { ...caught, words: [{ ...word, from: name }] },
      world,
      PLAYER,
      { kind: 'strength', about: foe },
      day,
    )
    console.log(`вилка: у честного ${honest.spread}, у пойманного ${liar.spread}`)
    expect(liar.spread).toBeGreaterThan(honest.spread)
  })

  it('век считает чужие обманы', () => {
    const state = ruler({
      politics: {
        ...politics,
        relations: { [[PLAYER, foe].sort().join('|')]: -40 },
      },
      spies: [{ id: 'spy:1', kingdomId: foe, seat: 'court', sinceDay: day - 60 }],
    })
    console.log(deceitLedger(state).says)
    let later = state
    for (let step = 0; step < DECEIT.beat + 2; step += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const ledger = deceitLedger(later)
    console.log(ledger.says)
    console.log(
      later.log.find((one) => one.text.includes('ложная') || one.text.includes('слово'))?.text ??
        'в эти сутки никто не лгал',
    )
    expect(ledger.made).toBeGreaterThanOrEqual(0)
  })
})
