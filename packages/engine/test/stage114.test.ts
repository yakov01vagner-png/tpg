import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { ENVOY, ENVOY_EYE_DEFS, SHOW_DEFS } from '../src/content/envoy'
import { OFFICES } from '../src/content/offices'
import { createSettlements } from '../src/economy'
import { envoyChoices } from '../src/embassy'
import { envoyLedger, envoySight, envoyWords, eyeOf, guestNow, showTo } from '../src/envoy'
import { PLAYER } from '../src/holding'
import { knownTo } from '../src/known'
import { strengthOf } from '../src/mind'
import { candidatesFor } from '../src/office'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 114: посол как глаза.
 *
 * Посольство 0.7 привозило одно слово — да или нет, — потому что остальное о
 * чужой короне игрок и так знал точно. Теперь не знает, и посол становится тем,
 * чем он был в жизни: единственным способом посмотреть на чужой двор. Смотрит
 * при этом он, а не ты.
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

function ruler(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 900)
    .slice(0, 5)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  // Посольство водит человек: сделаем двоих владетелей своими вассалами, чтобы
  // при дворе вообще были люди.
  const lords = [...politics.lords]
  for (let i = 0; i < 2; i += 1) {
    const lord = lords[i]
    if (lord) lords[i] = { ...lord, kingdomId: PLAYER, loyalty: 60 }
  }
  let filled: GameState = {
    ...game,
    politics: { ...politics, lords },
    settlements: map,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
  // Посольство водит человек: без двора послать некого.
  for (const office of OFFICES) {
    const who = candidatesFor(filled, office)[0]
    if (!who) continue
    filled = {
      ...filled,
      offices: {
        ...(filled.offices ?? {}),
        [office]: { holderId: who.id, kind: who.kind, sinceDay: day - 200 },
      },
    }
  }
  return filled
}

describe('Пс2 и Пс3: чьими глазами', () => {
  it('один и тот же двор выглядит по-разному, и это нрав посла', () => {
    const state = ruler()
    const truth = strengthOf(state, world, foe, day)
    console.log(`на деле сила ${world.kingdoms[foe]?.name}: ${truth.score}`)
    for (const eye of Object.keys(ENVOY_EYE_DEFS) as (keyof typeof ENVOY_EYE_DEFS)[]) {
      const def = ENVOY_EYE_DEFS[eye]
      const sight = envoySight(
        state,
        world,
        foe,
        { id: `envoy:${eye}`, name: def.label, skill: 4, kind: 'companion' },
        day,
      )
      // Нрав берётся из человека, поэтому подменяем глаз прямо в проверке.
      console.log(
        `${def.label}: ${def.about} Привёз бы силу ${Math.round(truth.score * (1 + def.onStrength))} при правде ${truth.score}`,
      )
      expect(sight.truthStrength).toBe(truth.score)
    }
    // Приметливость приходит с умением, а за вассалом видна держава.
    expect(eyeOf({ id: 'a', name: 'умелый', skill: 8, kind: 'companion' })).toBe('keen')
    expect(eyeOf({ id: 'b', name: 'вассал', skill: 4, kind: 'vassal' })).toBe('bold')
    expect(eyeOf(null)).toBe('timid')
  })

  it('умение сужает поправку, но не меняет её знака', () => {
    const state = ruler()
    const weak = envoySight(
      state,
      world,
      foe,
      { id: 'envoy:x', name: 'робкий', skill: 1, kind: 'companion' },
      day,
    )
    const good = envoySight(
      state,
      world,
      foe,
      { id: 'envoy:x', name: 'он же умелый', skill: 6, kind: 'companion' },
      day,
    )
    console.log(
      `${ENVOY_EYE_DEFS[weak.eye].label}: с умением 1 поправка ${weak.off}, с умением 6 — ${good.off}`,
    )
    expect(Math.abs(good.off)).toBeLessThanOrEqual(Math.abs(weak.off))
    expect(Math.sign(good.off)).toBe(Math.sign(weak.off))
  })
})

describe('Пс1: он привозит не только ответ', () => {
  it('картина чужого двора ложится вестями и читается общим слоем', () => {
    const state = ruler()
    const sight = envoySight(
      state,
      world,
      foe,
      { id: 'envoy:keen', name: 'приметливый', skill: 8, kind: 'companion' },
      day,
    )
    const brought = envoyWords(sight, foe, day, 'test')
    console.log(
      `привёз ${brought.length} вестей: ${brought.map((one) => one.kind).join(', ')} — все «привёз посол»`,
    )
    expect(brought.every((one) => one.source === 'envoy')).toBe(true)
    const told: GameState = { ...state, words: brought }
    const known = knownTo(told, world, PLAYER, { kind: 'strength', about: foe }, day + 5)
    console.log(`через пять суток: ${known.says}`)
    expect(known.source).toBe('envoy')

    // Письмо глаз не имеет: оно привозит только ответ.
    const byLetter = ok(
      applyCommand(state, { type: 'sendEnvoy', to: foe, errand: 'passage', byLetter: true }),
    )
    let later = byLetter
    for (let step = 0; step < 60; step += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
      if ((later.embassies ?? []).length === 0) break
    }
    console.log(later.log.find((one) => one.text.includes('Ответ из'))?.text ?? 'ответа ещё нет')
    expect((later.words ?? []).some((one) => one.source === 'envoy')).toBe(false)
  })

  it('живой посол привозит картину, и это видно в счёте', () => {
    const state = ruler()
    const who = envoyChoices(state, day)[0]
    const sent = ok(
      applyCommand(state, {
        type: 'sendEnvoy',
        to: foe,
        errand: 'passage',
        ...(who ? { envoyId: who.id } : {}),
      }),
    )
    let later = sent
    for (let step = 0; step < 60; step += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
      if ((later.embassies ?? []).length === 0) break
    }
    console.log(later.log.find((one) => one.text.includes('Говорит: сила'))?.text ?? 'не вернулся')
    const ledger = envoyLedger(later)
    console.log(ledger.says)
    expect(ledger.brought).toBeGreaterThan(0)
  })
})

describe('Пс4 и Пс5: чужой посол у тебя', () => {
  it('гость увозит то, что ему показали, — если не раскусит', () => {
    const state = ruler()
    // Гость приезжает по своему счёту суток: найдём день, когда он есть.
    let guest = guestNow(state, world, day)
    let when = day
    for (let step = 0; step < 40 && !guest; step += 1) {
      when = day + step * ENVOY.guestBeat
      guest = guestNow(state, world, when)
    }
    if (!guest) return
    console.log(guest.says)
    const truth = strengthOf(state, world, PLAYER, when).score
    for (const show of Object.keys(SHOW_DEFS) as (keyof typeof SHOW_DEFS)[]) {
      const seen = showTo(state, world, guest, show, when)
      console.log(`${SHOW_DEFS[show].label} (${SHOW_DEFS[show].cost} серебра): ${seen.says}`)
      expect(seen.truth).toBe(truth)
    }
    const strong = showTo(state, world, guest, 'strong', when)
    const plain = showTo(state, world, guest, 'plain', when)
    if (guest.eye === 'keen') {
      console.log('гость приметлив: показное он видит')
      expect(strong.caught).toBe(true)
    } else {
      expect(strong.sees).toBeGreaterThan(plain.sees)
    }

    // Приметливый раскусывает всегда — проверим прямо.
    const keenGuest = { ...guest, eye: 'keen' as const }
    const caught = showTo(state, world, keenGuest, 'strong', when)
    console.log(caught.says)
    expect(caught.caught).toBe(true)
    expect(caught.sees).toBe(truth)
  })

  it('уезжая, он кладёт весть о тебе в знание своей короны', () => {
    const state = ruler()
    let guest = guestNow(state, world, day)
    let when = day
    for (let step = 1; step < 60 && !guest; step += 1) {
      when = day + step
      guest = guestNow(state, world, when)
    }
    if (!guest) return
    const atEnd: GameState = {
      ...state,
      time: WORLD_START + (guest.untilDay - 1) * 24 * 60,
      showing: { [guest.from]: 'poor' },
    }
    const after = ok(applyCommand(atEnd, { type: 'tick', minutes: MINUTES_PER_DAY }))
    const theirWord = (after.words ?? []).find((one) => one.to === guest?.from)
    console.log(after.log.find((one) => one.text.includes('уехал'))?.text ?? 'гость ещё не уехал')
    console.log(
      `весть их короне: сила ${theirWord?.value ?? '—'} при правде ${strengthOf(state, world, PLAYER, guest.untilDay).score}`,
    )
    expect(theirWord?.about).toBe(PLAYER)
  })
})
