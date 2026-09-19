import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { OVERTURE, OVERTURE_DEFS } from '../src/content/overture'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { strengthOf } from '../src/mind'
import {
  coalitionAgainst,
  counterWeight,
  isLiar,
  overtureFrom,
  overtureLedger,
  overturesOf,
  overturesToday,
  pledgesOf,
  wordOf,
  wordWords,
} from '../src/overture'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { allied, createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 91: ИИ в дипломатии.
 *
 * Послы ездили в одну сторону: игрок слал, мир отвечал. Здесь короны говорят
 * первыми — предлагают, требуют, грозят пустым, торгуются и возвращаются, — и
 * у каждой есть слово, которое видно всем.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const day = (state: GameState): GameState =>
  ok(
    applyCommand(ok(applyCommand(state, { type: 'rest', hours: 12 })), {
      type: 'rest',
      hours: 12,
    }),
  )

function ruler(places = 6): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world)
  const taken = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, places)
  const map = { ...settlements }
  for (const one of taken) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    politics,
    settlements: map,
    time: WORLD_START,
    locationId: taken[0]?.locationId ?? game.locationId,
    quarter: null,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

describe('Ди1: предложения', () => {
  it('короны приезжают сами, и с чем — зависит от того, каким тебя видят', () => {
    const weak = ruler(2)
    const strong = ruler(60)
    const seen = new Set<string>()
    for (let d = 1; d < 365 * 3; d += 30) {
      for (const kingdomId of kingdoms) {
        const one = overtureFrom(weak, world, kingdomId, d)
        if (one) seen.add(one.kind)
      }
    }
    console.log(`к слабому за три года приезжали с: ${[...seen].join(', ')}`)
    const toStrong = new Set<string>()
    for (let d = 1; d < 365 * 3; d += 30) {
      for (const kingdomId of kingdoms) {
        const one = overtureFrom(strong, world, kingdomId, d)
        if (one) toStrong.add(one.kind)
      }
    }
    console.log(`к сильному: ${[...toStrong].join(', ')}`)
    expect(seen.size).toBeGreaterThan(0)
    for (const kind of [...seen, ...toStrong]) {
      expect(OVERTURE_DEFS[kind as keyof typeof OVERTURE_DEFS].label).toBeTruthy()
    }
    // Одно и то же состояние даёт одно и то же посольство.
    const first = kingdoms[0] as string
    expect(overtureFrom(weak, world, first, 90)?.kind).toBe(
      overtureFrom(weak, world, first, 90)?.kind,
    )
  })

  it('посол доезжает до игрока и ждёт ответа', () => {
    let run = ruler(2)
    let waited = 0
    while (overturesOf(run).length === 0 && waited < 200) {
      run = day(run)
      waited += 1
    }
    const first = overturesOf(run)[0]
    console.log(
      `на ${waited}-е сутки: ${first ? first.says : 'никто не приехал'}; ждут ответа ${OVERTURE.standDays} сут.`,
    )
    expect(first).toBeTruthy()
  })
})

describe('Ди2: торг', () => {
  it('на встречное условие уступают или уезжают', () => {
    let run = ruler(2)
    while (overturesOf(run).length === 0) run = day(run)
    const first = overturesOf(run)[0]
    if (!first) return
    const dayNow = Math.floor((run.time - WORLD_START) / (24 * 60)) + 1
    const chance = counterWeight(run, world, first, dayNow)
    const answered = ok(
      applyCommand(run, { type: 'answerOverture', id: first.id, answer: 'counter' }),
    )
    const left = overturesOf(answered).find((one) => one.id === first.id)
    console.log(
      `торг: ${Math.round(chance * 100)} из ста — ${left ? `уступили, просят ${left.silver} вместо ${first.silver}` : 'уехали'}`,
    )
    expect(chance).toBeGreaterThan(0)
    if (left) expect(left.silver).toBeLessThan(first.silver)
  })

  it('отказ не бесплатен, а согласие кладёт дело в мир', () => {
    let run = ruler(2)
    while (overturesOf(run).length === 0) run = day(run)
    const first = overturesOf(run)[0]
    if (!first) return
    const refused = ok(
      applyCommand(run, { type: 'answerOverture', id: first.id, answer: 'refuse' }),
    )
    console.log(refused.log[refused.log.length - 1]?.text ?? '')
    expect(overturesOf(refused).some((one) => one.id === first.id)).toBe(false)

    const taken = ok(applyCommand(run, { type: 'answerOverture', id: first.id, answer: 'accept' }))
    console.log(
      `${taken.log[taken.log.length - 1]?.text ?? ''} Обещаний в силе: ${pledgesOf(taken).length}`,
    )
    expect(pledgesOf(taken).length).toBeGreaterThan(0)
    if (first.kind === 'alliance' || first.kind === 'marriage') {
      expect(allied(taken.politics, PLAYER, first.fromKingdom)).toBe(true)
    }
  })
})

describe('Ди3 и Ди4: обман и слово', () => {
  it('за угрозой не всегда стоят силы, и это видно', () => {
    const weak = ruler(2)
    const strong = ruler(120)
    const kingdomId = kingdoms[0] as string
    const mine = strengthOf(weak, world, PLAYER, 1).score
    const theirs = strengthOf(weak, world, kingdomId, 1).score
    console.log(
      `их сила ${theirs}, твоя ${mine} при двух местах и ${strengthOf(strong, world, PLAYER, 1).score} при ста двадцати; угроза считается пустой ниже ×${OVERTURE.threatBacking}`,
    )
    expect(theirs).toBeGreaterThan(mine * OVERTURE.threatBacking)
  })

  it('нарушенное обещание бьёт по имени короны, и с обманщиком говорят иначе', () => {
    const state = ruler(6)
    const kingdomId = kingdoms[0] as string
    const honest = wordOf(state, kingdomId, 400)
    const liar: GameState = {
      ...state,
      pledges: [
        { kingdomId, kind: 'alliance', sinceDay: 10, untilDay: 20, kept: false },
        { kingdomId, kind: 'marriage', sinceDay: 30, untilDay: 40, kept: false },
      ],
    }
    const after = wordOf(liar, kingdomId, 60)
    console.log(
      `слово ${kingdomId}: ${honest} без нарушений, ${after} после двух — ${wordWords(liar, kingdomId, 60)}`,
    )
    expect(after).toBeLessThan(honest)
    expect(isLiar(liar, kingdomId, 60)).toBe(true)
    // Обида стареет: через годы слово частично отрастает.
    const later = wordOf(liar, kingdomId, 60 + 365 * 4)
    console.log(`через четыре года: ${later}`)
    expect(later).toBeGreaterThan(after)
  })
})

describe('Ди5: коалиции', () => {
  it('против выросшего сходятся сами — и против тебя тоже', () => {
    const small = coalitionAgainst(ruler(2), world, 1)
    // Держава, которая переросла всех: земля и войско вместе.
    const huge = ruler(200)
    const giant = coalitionAgainst(
      {
        ...huge,
        bands: [
          {
            id: 'host',
            lordId: PLAYER,
            kingdomId: PLAYER,
            units: { spearman: 6000 },
            morale: 80,
            locationId: huge.locationId,
            travel: null,
            goal: { type: 'defend', targetId: huge.locationId },
            siegeDays: 0,
          },
        ],
      },
      world,
      1,
    )
    console.log(`при двух местах: ${small.says}`)
    console.log(`при двух сотнях: ${giant.says}`)
    expect(giant.giant).toBe(PLAYER)
    expect(giant.members.length).toBeGreaterThan(1)
    expect(small.giant).not.toBe(PLAYER)
  })
})

describe('Ди6: дипломатия в отчёте', () => {
  it('счёт по послам и обещаниям виден числом', () => {
    const state = ruler(6)
    const busy: GameState = {
      ...state,
      overtures: [
        {
          id: 'a',
          fromKingdom: kingdoms[0] as string,
          kind: 'alliance',
          aboutId: null,
          silver: 100,
          sinceDay: 1,
          untilDay: 100,
          backed: true,
          says: 'союз',
        },
      ],
      pledges: [
        {
          kingdomId: kingdoms[0] as string,
          kind: 'alliance',
          sinceDay: 1,
          untilDay: 10,
          kept: true,
        },
        { kingdomId: kingdoms[1] as string, kind: 'join', sinceDay: 1, untilDay: 10, kept: false },
      ],
    }
    const ledger = overtureLedger(busy, world, 50)
    console.log(ledger.says)
    expect(ledger.standing).toBe(1)
    expect(ledger.broken).toBe(1)
  })
})
