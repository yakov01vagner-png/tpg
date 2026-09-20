import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { PICTURE } from '../src/content/picture'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { crownGame, seenStrength, strengthOf } from '../src/mind'
import { canSeePicture, crownPicture, pictureError, pictureSays, seenBy } from '../src/picture'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 118: своя картина мира.
 *
 * С этапа 89 корона ошибалась в чужой силе, но ошибка её была недосягаема: на
 * неё нельзя было повлиять. Теперь её картина складывается из тех же вестей,
 * что и твоя, — и потому твой обман попадает в её решения, а не только в текст.
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

const guessFor = (state: GameState, watcher: string, about: string) => {
  const seen = seenStrength(state, world, watcher, about, day)
  return { score: seen.score, error: seen.error }
}

describe('К1 и К2: у каждой короны своя', () => {
  it('что знает одна корона о другой — не то же, что знаешь ты', () => {
    const state = ruler()
    const rows = crownPicture(state, world, first, day, (about) => guessFor(state, first, about))
    console.log(pictureSays(rows, first, world))
    for (const row of rows.slice(0, 3)) console.log(row.says)
    expect(rows.length).toBeGreaterThan(1)
    // Без вестей это догадка, и она расходится с правдой.
    expect(rows.every((one) => one.from === 'guess')).toBe(true)
    const off = rows.find((one) => one.value !== one.truth)
    console.log(
      `расхождение есть: ${off ? `${off.about}: ${off.value} против ${off.truth}` : 'нет'}`,
    )
    expect(off).toBeDefined()
  })
})

describe('К3: она считает по вестям, а не по правде', () => {
  it('принесённая весть весит больше её догадки', () => {
    const truth = strengthOf(ruler(), world, PLAYER, day).score
    const plain = ruler()
    const guess = seenStrength(plain, world, first, PLAYER, day)
    // Ты прибеднился, и её посол увёз меньшее число (этапы 114 и 117).
    const lied = ruler({
      words: [
        {
          id: 'word:theirs',
          to: first,
          kind: 'strength',
          about: PLAYER,
          value: Math.round(truth * 0.4),
          source: 'own',
          from: 'их посол',
          day: day - 5,
        },
      ],
    })
    const fooled = seenStrength(lied, world, first, PLAYER, day)
    console.log(
      `на деле ${truth}; без вестей она думает ${guess.score}, со вестью — ${fooled.score}`,
    )
    console.log(fooled.says)
    expect(fooled.score).toBeLessThan(guess.score)

    // Старая весть перестаёт весить: остаётся догадка.
    const stale = ruler({
      words: [
        {
          id: 'word:theirs',
          to: first,
          kind: 'strength',
          about: PLAYER,
          value: Math.round(truth * 0.4),
          source: 'own',
          from: 'их посол',
          day: day - PICTURE.freshDays - 30,
        },
      ],
    })
    const forgotten = seenBy(stale, world, first, PLAYER, day, guess)
    console.log(`через ${PICTURE.freshDays + 30} суток: ${forgotten.from} — ${forgotten.value}`)
    expect(forgotten.from).toBe('guess')
  })
})

describe('К4: решения по картине, а не по правде', () => {
  it('её партия считается из того, что она думает', () => {
    const truth = strengthOf(ruler(), world, PLAYER, day).score
    const plain = ruler()
    const honest = crownGame(plain, world, first, day)
    console.log(`без обмана: ${honest.aim} — ${honest.why}`)

    // Покажи ей себя вдесятеро сильнее — и её расчёт поменяется.
    const scared = ruler({
      words: [
        {
          id: 'word:big',
          to: first,
          kind: 'strength',
          about: PLAYER,
          value: truth * 12 + 4000,
          source: 'own',
          from: 'их посол',
          day: day - 3,
        },
      ],
    })
    const afraid = crownGame(scared, world, first, day)
    console.log(`после обмана: ${afraid.aim} — ${afraid.why}`)
    console.log(
      `она видит твою силу: ${seenStrength(plain, world, first, PLAYER, day).score} → ${seenStrength(scared, world, first, PLAYER, day).score}`,
    )
    console.log(
      `кого она считает главным: ${honest.targetId ?? 'никого'} → ${afraid.targetId ?? 'никого'}`,
    )
    // Решение считается по картине: увидев тебя первым, она смотрит на тебя.
    expect(afraid.targetId).toBe(PLAYER)
    expect(seenStrength(scared, world, first, PLAYER, day).score).toBeGreaterThan(
      seenStrength(plain, world, first, PLAYER, day).score,
    )
  })
})

describe('К5 и К6: в её голову можно заглянуть', () => {
  it('без своего человека там — нельзя, с ним — можно', () => {
    const blind = ruler()
    console.log(`без людей: ${canSeePicture(blind, first).why}`)
    expect(canSeePicture(blind, first).can).toBe(false)
    expect(applyCommand(blind, { type: 'askPicture', of: first }).ok).toBe(false)

    const withSpy = ruler({
      spies: [{ id: 'spy:1', kingdomId: first, seat: 'court', sinceDay: day - 50 }],
    })
    console.log(`с соглядатаем: ${canSeePicture(withSpy, first).why}`)
    const asked = ok(applyCommand(withSpy, { type: 'askPicture', of: first }))
    for (const line of asked.log.filter((one) => one.text.includes('считает сильнейшими'))) {
      console.log(line.text)
    }
    console.log(asked.log.find((one) => one.text.startsWith('О тебе'))?.text)
    expect(asked.character.money).toBe(withSpy.character.money - PICTURE.askCost)
  })

  it('ошибка называется словами и в чью она пользу', () => {
    const state = ruler()
    const rows = crownPicture(state, world, second, day, (about) => guessFor(state, second, about))
    const error = pictureError(rows)
    console.log(error.says)
    expect(error.aboutPlayer).not.toBeNull()
  })
})
