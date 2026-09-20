import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { GUESS, PLAYER_AIM_DEFS, TELL_DEFS } from '../src/content/guess'
import { type Settlement, createSettlements } from '../src/economy'
import { guessAim, guessLedger, readyFor, readyShare, tellsOf, trueAim } from '../src/guess'
import { PLAYER, garrisonLimit, garrisonSize } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { neighbourSettlements } from '../src/world/queries'

/**
 * Этап 119: он делает выводы.
 *
 * Картина мира сказала, что корона знает о числах. Здесь она выводит из этого
 * замысел: называет его вслух, готовится к нему заранее, ошибается и сбивается
 * ходами, которые ничего не значат.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const foe = kingdoms[1] as string
const day = 405

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Владение рядом с чужой границей: иначе примет «войско у границы» не бывает. */
function ruler(extra: Partial<GameState> = {}): { state: GameState; theirs: string } {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
  const theirSeat = Object.values(settlements).find(
    (one) =>
      one.population > 900 &&
      (one.owner === `crown:${foe}` ||
        politics.lords.some((lord) => lord.id === one.owner && lord.kingdomId === foe)),
  )
  if (!theirSeat) throw new Error('нет чужих мест')
  const near = [...neighbourSettlements(world, theirSeat.locationId, 3)]
    .slice(0, 3)
    .map((one) => settlements[one.id])
    .filter((one): one is Settlement => Boolean(one))
  const map = { ...settlements }
  for (const one of near) map[one.locationId] = { ...one, owner: PLAYER }
  const here = near[0]?.locationId ?? game.locationId
  return {
    state: {
      ...game,
      politics,
      settlements: map,
      locationId: here,
      quarter: null,
      time: WORLD_START + (day - 1) * 24 * 60,
      realm: { name: 'Заречье', sinceDay: 1 },
      party: { ...game.party, units: { militia: 150, spearman: 60 }, morale: 70 },
      ...extra,
    },
    theirs: theirSeat.locationId,
  }
}

describe('Вы1 и Вы2: он читает твои ходы и называет замысел', () => {
  it('приметы выводятся из мира, а не из записи', () => {
    const { state } = ruler()
    const quiet = tellsOf(state, world, foe, day)
    for (const tell of quiet) console.log(`${TELL_DEFS[tell.kind].label}: ${tell.says}`)
    console.log(`приметы в мире: ${quiet.length}`)

    // Отдели часть и поставь её у их границы — примет станет больше.
    const formed = ok(applyCommand(state, { type: 'formHost', troop: 'militia', count: 60 }))
    const loud = tellsOf(formed, world, foe, day)
    console.log(`после сбора войска: ${loud.map((one) => TELL_DEFS[one.kind].label).join(', ')}`)
    expect(loud.length).toBeGreaterThanOrEqual(quiet.length)

    const guessed = guessAim(formed, world, foe, day)
    console.log(`${guessed.says} На деле: ${PLAYER_AIM_DEFS[trueAim(formed, world, day)].label}`)
    expect(guessed.confidence).toBeGreaterThan(0)
  })

  it('война — самая громкая примета, и вывод бывает верным', () => {
    const { state } = ruler({
      politics: {
        ...politics,
        wars: [{ a: PLAYER, b: foe, since: day - 20, reason: 'марка' }],
      },
    })
    const guessed = guessAim(state, world, foe, day)
    console.log(`${guessed.says} На деле: ${PLAYER_AIM_DEFS[trueAim(state, world, day)].label}`)
    expect(guessed.aim).toBe('takeLand')
    expect(guessed.right).toBe(true)
  })
})

describe('Вы4: его можно запутать', () => {
  it('пустые ходы сбивают уверенность', () => {
    const { state } = ruler({
      politics: {
        ...politics,
        wars: [{ a: PLAYER, b: foe, since: day - 20, reason: 'марка' }],
      },
    })
    const plain = guessAim(state, world, foe, day)
    const noisy = ruler({
      politics: {
        ...politics,
        wars: [{ a: PLAYER, b: foe, since: day - 20, reason: 'марка' }],
      },
      ruses: [
        {
          id: 'ruse:1',
          kind: 'camp',
          by: PLAYER,
          locationId: state.locationId,
          men: 100,
          hostId: null,
          sinceDay: day - 2,
          untilDay: day + 10,
        },
        {
          id: 'ruse:2',
          kind: 'demo',
          by: PLAYER,
          locationId: state.locationId,
          men: 80,
          hostId: null,
          sinceDay: day - 1,
          untilDay: day + 6,
        },
      ],
    }).state
    const confused = guessAim(noisy, world, foe, day)
    console.log(`без пустых ходов: уверенность ${plain.confidence}`)
    console.log(`с двумя пустыми ходами: уверенность ${confused.confidence} — ${confused.says}`)
    expect(confused.confidence).toBeLessThan(plain.confidence)
  })
})

describe('Вы5: он учится на повторяющемся', () => {
  it('те же приметы во второй раз видны яснее', () => {
    const { state } = ruler({
      politics: {
        ...politics,
        wars: [{ a: PLAYER, b: foe, since: day - 20, reason: 'марка' }],
      },
    })
    const first = guessAim(state, world, foe, day)
    const learned = guessAim({ ...state, tellSeen: { [foe]: 4 } }, world, foe, day)
    console.log(
      `впервые: уверенность ${first.confidence}; после четырёх раз: ${learned.confidence} (по ${GUESS.learnsPerSeen} за раз)`,
    )
    expect(learned.confidence).toBeGreaterThan(first.confidence)
  })
})

describe('Вы3 и Вы6: он готовится заранее, и это считается', () => {
  it('угаданная цель усиливает его гарнизоны до удара', () => {
    // Войны нет — есть войско у их границы и худое отношение: этого довольно,
    // чтобы он счёл тебя идущим за землёй.
    const { state, theirs } = ruler({
      politics: {
        ...politics,
        relations: { [[PLAYER, foe].sort().join('|')]: -40 },
      },
      spies: [{ id: 'spy:1', kingdomId: foe, seat: 'court', sinceDay: day - 60 }],
    })
    const formed = ok(applyCommand(state, { type: 'formHost', troop: 'militia', count: 70 }))
    const seeded: GameState = {
      ...formed,
      settlements: {
        ...formed.settlements,
        [theirs]: { ...(formed.settlements[theirs] as Settlement), garrison: { militia: 40 } },
      },
    }
    console.log(`его вывод сейчас: ${guessAim(seeded, world, foe, day).says}`)
    const before = garrisonSize(seeded.settlements[theirs] as Settlement)
    let later = seeded
    for (let step = 0; step < GUESS.beat + 2; step += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const after = garrisonSize(later.settlements[theirs] as Settlement)
    console.log(later.log.find((one) => one.text.includes('называет твой замысел'))?.text)
    console.log(
      `${world.locations[theirs]?.name}: гарнизон ${before} → ${after} (готовится ×${GUESS.readyGarrison})`,
    )
    console.log(`все выводы: ${JSON.stringify(later.guesses)}`)
    console.log(
      `война ещё идёт: ${later.politics.wars.some((one) => one.a === PLAYER || one.b === PLAYER)}`,
    )
    console.log(
      `предел гарнизона: ${garrisonLimit(world, later.settlements[theirs] as Settlement)}`,
    )
    console.log(`вывод в состоянии: ${JSON.stringify(readyFor(later, foe))}`)
    expect(readyFor(later, foe)?.aim).toBe('takeLand')
    expect(readyShare(later, foe)).toBe(GUESS.readyGarrison)
    expect(after).toBeGreaterThan(before)

    const ledger = guessLedger(later)
    console.log(ledger.says)
    expect(ledger.made).toBeGreaterThan(0)
  })
})
