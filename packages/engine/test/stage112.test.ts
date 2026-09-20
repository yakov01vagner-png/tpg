import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { RUSE, RUSE_DEFS } from '../src/content/ruse'
import { type Settlement, createSettlements } from '../src/economy'
import { lastSeen } from '../src/fog'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import {
  pulledBy,
  ruseFrom,
  ruseLedger,
  ruseWord,
  seesThrough,
  theirRuses,
  walkedInto,
} from '../src/ruse'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { neighbourSettlements } from '../src/world/queries'

/**
 * Этап 112: обман на войне.
 *
 * Пока все всё видели, врать было некому. Туман этапов 109–111 завёл чужое
 * незнание — здесь оно обращается в ход: ложный лагерь, показное движение,
 * пущенный слух и засада. И каждое из этого можно раскусить.
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

function warlord(): { state: GameState; mine: readonly string[] } {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
  const seat = Object.values(settlements)
    .filter((one) => one.population > 900)
    .sort((a, b) => b.population - a.population)[0]
  if (!seat) throw new Error('нет мест')
  const around = [...neighbourSettlements(world, seat.locationId, 9)]
    .sort((a, b) => a.hops - b.hops)
    .slice(0, 5)
    .map((one) => settlements[one.id])
    .filter((one): one is Settlement => Boolean(one))
  const mine = [seat, ...around]
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    state: {
      ...game,
      politics: { ...politics, wars: [{ a: PLAYER, b: foe, since: 100, reason: 'марка' }] },
      settlements: map,
      locationId: seat.locationId,
      quarter: null,
      time: WORLD_START + (day - 1) * 24 * 60,
      realm: { name: 'Заречье', sinceDay: 1 },
      party: { ...game.party, units: { militia: 120, spearman: 40 }, morale: 70 },
    },
    mine: mine.map((one) => one.locationId),
  }
}

describe('О1: ложный лагерь', () => {
  it('войска нет, а весть о нём есть — и она того же вида, что правда', () => {
    const { state, mine } = warlord()
    const where = mine[3] as string
    for (const [id, def] of Object.entries(RUSE_DEFS)) {
      console.log(`${def.label}: ${def.cost} серебра, ${def.days} сут., ${def.men} человек`)
      expect(id.length).toBeGreaterThan(2)
    }
    const made = ok(applyCommand(state, { type: 'makeRuse', kind: 'camp', locationId: where }))
    console.log(made.log.find((one) => one.text.includes('ложный лагерь'))?.text)
    expect(made.ruses).toHaveLength(1)
    expect(made.character.money).toBe(state.character.money - RUSE_DEFS.camp.cost)

    // Весть о лагере ложится чужой стороне и читается как обычная весть.
    const ruse = made.ruses?.[0]
    if (!ruse) return
    const told: GameState = { ...made, words: [ruseWord(ruse, foe, day)] }
    const known = lastSeen(told, world, foe, ruse.id, day + 3)
    console.log(`что видит ${world.kingdoms[foe]?.name}: ${known.says}`)
    expect(known.seenAt).toBe(where)
    expect(known.sure).toBe(false)

    // Дважды в одном месте одного и того же не заводят.
    expect(applyCommand(made, { type: 'makeRuse', kind: 'camp', locationId: where }).ok).toBe(false)
  })
})

describe('О5: раскусить можно — и это выводится', () => {
  it('смотрит то же, чем смотрят на правду', () => {
    const { state, mine } = warlord()
    const ruse = ruseFrom('camp', PLAYER, mine[3] as string, 200, day)
    const fresh = seesThrough(state, world, foe, ruse, day)
    const old = seesThrough(state, world, foe, ruse, day + RUSE_DEFS.camp.days - 1)
    console.log(`свежий лагерь: ${fresh.says}`)
    console.log(`через ${RUSE_DEFS.camp.days - 1} суток: ${old.says}`)
    expect(old.chance).toBeGreaterThan(fresh.chance)

    // Тот, у кого глаза рядом, видит лучше: убери их дружины и их землю —
    // и тот же лагерь станет неразличим.
    const blind: GameState = {
      ...state,
      bands: state.bands.filter((one) => one.kingdomId !== foe),
      settlements: Object.fromEntries(
        Object.entries(state.settlements).map(([id, one]) => [
          id,
          one.owner === `crown:${foe}` ? { ...one, owner: null } : one,
        ]),
      ),
      politics: {
        ...state.politics,
        lords: state.politics.lords.map((one) =>
          one.kingdomId === foe ? { ...one, kingdomId: kingdoms[2] as string } : one,
        ),
      },
    }
    const far = seesThrough(blind, world, foe, ruse, day)
    console.log(`без глаз поблизости: ${far.says}`)
    expect(far.chance).toBeLessThan(fresh.chance)

    // И это не бросок: один и тот же взгляд даёт один и тот же ответ.
    expect(seesThrough(state, world, foe, ruse, day).seen).toBe(fresh.seen)
  })

  it('ИИ врёт тем же способом, и его ложь приходит тебе вестью', () => {
    const { state, mine } = warlord()
    const theirLord = politics.lords.find((one) => one.kingdomId === foe)
    const theirs: GameState = {
      ...state,
      bands: Array.from({ length: 12 }, (_, index) => ({
        id: `band:theirs:${index}`,
        lordId: theirLord?.id ?? 'lord:x',
        kingdomId: foe,
        units: { militia: 40 },
        morale: 60,
        locationId: mine[index % mine.length] as string,
        travel: null,
        goal: { type: 'muster' } as const,
        siegeDays: 0,
      })),
    }
    const made = theirRuses(theirs, world, day)
    console.log(`чужих обманов в эти сутки: ${made.length} из 12 отрядов`)
    for (const one of made.slice(0, 3)) {
      console.log(
        `${world.locations[one.locationId]?.name}: показано ${one.men} человек до ${one.untilDay}-го дня`,
      )
    }
    expect(made.length).toBeGreaterThan(0)
    // Тем же кодом, каким смотрят на твой, смотришь и ты на их.
    const first = made[0]
    if (!first) return
    const looked = seesThrough(theirs, world, PLAYER, first, day)
    console.log(`твой взгляд на их лагерь: ${looked.says}`)
    expect(looked.chance).toBeGreaterThanOrEqual(0)
  })
})

describe('О2: демонстрация', () => {
  it('те, кто поверил, поворачивают на показанное', () => {
    const { state, mine } = warlord()
    const where = mine[2] as string
    const theirLord = politics.lords.find((one) => one.kingdomId === foe)
    const near = [...neighbourSettlements(world, where, RUSE.pullHops)][0]?.id ?? where
    const watching: GameState = {
      ...state,
      bands: [
        {
          id: 'band:theirs',
          lordId: theirLord?.id ?? 'lord:x',
          kingdomId: foe,
          units: { militia: 80 },
          morale: 60,
          locationId: near,
          travel: null,
          goal: { type: 'raid', targetId: mine[0] as string },
          siegeDays: 0,
        },
      ],
    }
    const ruse = ruseFrom('demo', PLAYER, where, 200, day)
    const pulled = pulledBy(watching, world, ruse, day)
    console.log(
      `демонстрация у ${world.locations[where]?.name}: повернуло ${pulled.length} отряд(ов) из ${watching.bands.length}`,
    )
    expect(pulled.length).toBeGreaterThan(0)

    // И это команда, которая стоит серебра и людей.
    const made = ok(applyCommand(watching, { type: 'makeRuse', kind: 'demo', locationId: where }))
    let later = made
    for (let step = 0; step < RUSE.beat + 1; step += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    console.log(later.log.find((one) => one.text.includes('повернули'))?.text ?? 'не повернули')
    expect(made.character.money).toBe(watching.character.money - RUSE_DEFS.demo.cost)
  })
})

describe('О4: засада', () => {
  it('вошедший узнаёт о ней последним', () => {
    const { state, mine } = warlord()
    const formed = ok(applyCommand(state, { type: 'formHost', troop: 'militia', count: 50 }))
    const host = formed.bands.find((one) => one.lordId === PLAYER)
    if (!host) return
    const where = host.locationId
    const set = ok(
      applyCommand(formed, {
        type: 'makeRuse',
        kind: 'ambush',
        locationId: where,
        hostId: host.id,
      }),
    )
    console.log(set.log.find((one) => one.text.includes('засада'))?.text)
    expect(set.ruses).toHaveLength(1)

    const theirLord = politics.lords.find((one) => one.kingdomId === foe)
    const walked: GameState = {
      ...set,
      bands: [
        ...set.bands,
        {
          id: 'band:theirs',
          lordId: theirLord?.id ?? 'lord:x',
          kingdomId: foe,
          units: { militia: 60 },
          morale: 65,
          locationId: where,
          travel: null,
          goal: { type: 'muster' },
          siegeDays: 0,
        },
      ],
    }
    const ruse = set.ruses?.[0]
    if (!ruse) return
    const caught = walkedInto(walked, ruse)
    console.log(`в засаду вошло отрядов: ${caught.length}`)
    expect(caught.length).toBeGreaterThan(0)

    const after = ok(applyCommand(walked, { type: 'tick', minutes: MINUTES_PER_DAY }))
    console.log(after.log.find((one) => one.text.includes('Засада'))?.text ?? 'не сработала')
    expect(after.ruseLog?.worked ?? 0).toBeGreaterThan(0)
  })
})

describe('О6: обман в числах', () => {
  it('век считает, сколько удалось и сколько раскрыли', () => {
    const { state, mine } = warlord()
    console.log(ruseLedger(state, day).says)
    const made = ok(
      applyCommand(state, { type: 'makeRuse', kind: 'rumour', locationId: mine[1] as string }),
    )
    const ledger = ruseLedger(made, day)
    console.log(ledger.says)
    expect(ledger.made).toBe(1)
    expect(ledger.live).toBe(1)

    // Снять можно раньше срока.
    const ruse = made.ruses?.[0]
    if (!ruse) return
    const dropped = ok(applyCommand(made, { type: 'dropRuse', ruseId: ruse.id }))
    expect(dropped.ruses).toHaveLength(0)
  })
})
