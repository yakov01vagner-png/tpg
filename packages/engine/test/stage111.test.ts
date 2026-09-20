import { describe, expect, it } from 'vitest'
import { bandSize } from '../src/band'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { CAPTAIN_DEFS, DISPATCH, INTENT_DEFS } from '../src/content/dispatch'
import {
  actsOn,
  captainOf,
  driftedFrom,
  fieldReport,
  foesNear,
  linkTo,
  orderLedger,
} from '../src/dispatch'
import { type Settlement, createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { neighbourSettlements } from '../src/world/queries'

/**
 * Этап 111: донесение с поля.
 *
 * Приказ этапа 108 шёл туда, где его ждали. На войне ждать некому: пока гонец
 * едет, война двигается, и приказ приходит к другому дню. Тогда решает тот,
 * кто его получил, — и разница между «иди туда» и «держи этот край» перестаёт
 * быть словесной.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const foe = kingdoms[1] as string
const day = 400

/** Полководец нужного нрава: он выводится из части, так что часть и подбираем. */
function pickCaptain(host: { readonly id: string; readonly lordId: string }, want: string) {
  for (let n = 0; n < 200; n += 1) {
    const captain = captainOf({ ...host, id: `${host.id}:${n}` } as never)
    if (captain.temper === want) return captain
  }
  return captainOf(host as never)
}

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function warlord(): { state: GameState; mine: readonly string[] } {
  const game = createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world)
  // Владение — это связная земля, а не пять городов по разным концам карты:
  // от этого зависит, как быстро ходят гонцы (По5).
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
      locationId: mine[0]?.locationId ?? game.locationId,
      quarter: null,
      time: WORLD_START + (day - 1) * 24 * 60,
      realm: { name: 'Заречье', sinceDay: 1 },
      party: { ...game.party, units: { militia: 90, spearman: 30 }, morale: 70 },
    },
    mine: mine.map((one) => one.locationId),
  }
}

/** Часть, отделённая и отведённая подальше: к ней приказ уже едет. */
function withHost(state: GameState, where: string): { state: GameState; hostId: string } {
  const formed = ok(applyCommand(state, { type: 'formHost', troop: 'militia', count: 40 }))
  const host = formed.bands.find((one) => one.lordId === PLAYER)
  if (!host) throw new Error('части нет')
  return {
    state: {
      ...formed,
      bands: formed.bands.map((one) => (one.id === host.id ? { ...one, locationId: where } : one)),
    },
    hostId: host.id,
  }
}

describe('По2: у части есть тот, кто отвечает', () => {
  it('полководец выводится из части, а не хранится', () => {
    const { state, mine } = warlord()
    const { state: field, hostId } = withHost(state, mine[3] as string)
    const host = field.bands.find((one) => one.id === hostId)
    if (!host) return
    const captain = captainOf(host)
    console.log(captain.says)
    expect(captainOf(host).name).toBe(captain.name)
    expect(CAPTAIN_DEFS[captain.temper].about.length).toBeGreaterThan(10)
    for (const [id, def] of Object.entries(CAPTAIN_DEFS)) {
      console.log(`${id}: ${def.label} — по-своему в ${Math.round(def.ownWay * 100)} из ста`)
    }
  })
})

describe('По1 и По5: приказ едет, и связь можно строить', () => {
  it('до дальней части приказ идёт сутками, и это видно', () => {
    const { state, mine } = warlord()
    const near = linkTo(state, world, state.locationId, state.locationId)
    const far = linkTo(state, world, mine[4] as string, state.locationId)
    console.log(`при себе: ${near.says}`)
    console.log(`дальняя часть: ${far.says}`)
    expect(near.days).toBe(0)
    expect(far.days).toBeGreaterThan(0)

    // Сторожевые башни по дороге: весть идёт огнём.
    const towered: GameState = {
      ...state,
      settlements: Object.fromEntries(
        Object.entries(state.settlements).map(([id, one]) => [
          id,
          one.owner === PLAYER ? { ...one, buildings: [...one.buildings, 'watchtower'] } : one,
        ]),
      ),
    }
    const byFire = linkTo(towered, world, mine[4] as string, state.locationId)
    console.log(`с башнями: ${byFire.says}`)
    expect(byFire.days).toBeLessThan(far.days)

    // И это команда: приказ дальней части не исполняется в тот же миг.
    const { state: field, hostId } = withHost(state, mine[4] as string)
    const sent = ok(
      applyCommand(field, {
        type: 'orderHost',
        hostId,
        order: 'advance',
        targetId: mine[2] as string,
      }),
    )
    console.log(sent.log.find((one) => one.text.startsWith('Гонец послан'))?.text)
    expect(sent.fieldOrders).toHaveLength(1)
    expect(sent.bands.find((one) => one.id === hostId)?.goal.type).toBe('muster')
  })
})

describe('По1 и По2: приказ застаёт другую войну', () => {
  it('разошлась обстановка — решает полководец', () => {
    const { state, mine } = warlord()
    const { state: field, hostId } = withHost(state, mine[4] as string)
    const host = field.bands.find((one) => one.id === hostId)
    if (!host) return
    const order = {
      id: 'order:test',
      hostId,
      order: 'advance' as const,
      targetId: mine[2] as string,
      sentDay: day,
      arrivesDay: day + 4,
      wasAt: host.locationId,
      wasFoes: foesNear(field, host.locationId),
    }
    const same = driftedFrom(field, order, day + 4)
    console.log(`та же обстановка: расхождение ${same.share} — ${same.says}`)
    expect(same.changed).toBe(false)

    // А теперь под его стенами встало чужое войско, о котором ты не знал.
    const theirLord = politics.lords.find((one) => one.kingdomId === foe)
    const changed: GameState = {
      ...field,
      bands: [
        ...field.bands,
        {
          id: 'band:foe',
          lordId: theirLord?.id ?? 'lord:x',
          kingdomId: foe,
          units: { militia: 150 },
          morale: 60,
          locationId: host.locationId,
          travel: null,
          goal: { type: 'muster' },
          siegeDays: 0,
        },
      ],
    }
    const drift = driftedFrom(changed, order, day + 4)
    console.log(
      `чужих у ${host.locationId}: было ${order.wasFoes}, стало ${foesNear(changed, host.locationId)}; расхождение ${drift.share} — ${drift.says}`,
    )
    expect(drift.changed).toBe(true)

    // Своевольному приказ не указ: он рассудит сам.
    const willful = pickCaptain(host, 'willful')
    const alone = actsOn(changed, order, willful, null, day + 4)
    console.log(`без замысла: ${alone.says} → ${alone.order}`)
    expect(alone.obeyed).toBe(false)

    // А исполнительный сделает вчерашнее, и это тоже решение нрава.
    const dutiful = pickCaptain(host, 'dutiful')
    const kept = actsOn(changed, order, dutiful, null, day + 4)
    console.log(`исполнительный: ${kept.says} → ${kept.order}`)
    expect(kept.obeyed).toBe(true)
  })
})

describe('По3: замысел вместо приказа', () => {
  it('замысел не стареет — и полководец делает по нему, а не по себе', () => {
    const { state, mine } = warlord()
    const { state: field, hostId } = withHost(state, mine[4] as string)
    const host = field.bands.find((one) => one.id === hostId)
    if (!host) return
    const captain = pickCaptain(host, 'willful')
    const order = {
      id: 'order:test',
      hostId,
      order: 'advance' as const,
      targetId: mine[2] as string,
      sentDay: day,
      arrivesDay: day + 4,
      wasAt: host.locationId,
      wasFoes: foesNear(field, host.locationId) + 400,
    }
    for (const intent of ['holdEdge', 'pressThem', 'saveMen'] as const) {
      const acted = actsOn(field, order, captain, intent, day + 4)
      console.log(`«${INTENT_DEFS[intent].label}» → ${acted.order}: ${acted.says}`)
    }
    const held = actsOn(field, order, captain, 'holdEdge', day + 4)
    const pressed = actsOn(field, order, captain, 'pressThem', day + 4)
    expect(held.order).not.toBe(pressed.order)

    const set = ok(applyCommand(field, { type: 'setIntent', hostId, intent: 'saveMen' }))
    console.log(set.log[0]?.text)
    expect(set.intents?.[hostId]).toBe('saveMen')
  })
})

describe('По4: донесение с ошибкой', () => {
  it('то, что доложили, — не то, что было', () => {
    const { state, mine } = warlord()
    const { state: field, hostId } = withHost(state, mine[4] as string)
    const host = field.bands.find((one) => one.id === hostId)
    if (!host) return
    const report = fieldReport(field, world, host, day)
    console.log(
      `${report.says} На деле ${report.truth}: поправка ${Math.round(report.off * 100)} из ста`,
    )
    expect(report.truth).toBe(bandSize(host))

    // Нрав виден в числе: горячий прибавляет, осторожный убавляет.
    const bold = fieldReport(field, world, { ...host, id: 'host:bold' }, day)
    console.log(
      `${captainOf({ ...host, id: 'host:bold' }).temper}: доложено ${bold.told} при ${bold.truth}`,
    )
    const asked = ok(applyCommand(field, { type: 'askHost', hostId }))
    console.log(asked.log.find((one) => one.text.includes('доносит'))?.text)
    expect((asked.words ?? []).some((one) => one.about === hostId)).toBe(true)
  })
})

describe('По6: приказы в числах', () => {
  it('век считает, сколько дошло вовремя и сколько к чужой обстановке', () => {
    const { state, mine } = warlord()
    const { state: field, hostId } = withHost(state, mine[4] as string)
    const sent = ok(
      applyCommand(field, {
        type: 'orderHost',
        hostId,
        order: 'advance',
        targetId: mine[2] as string,
      }),
    )
    const order = sent.fieldOrders?.[0]
    if (!order) return
    let later = sent
    for (let step = 0; step < order.arrivesDay - day + 2; step += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    console.log(
      later.log.find(
        (one) => one.text.includes('Исполнено как велено') || one.text.includes('рассудил'),
      )?.text ?? 'ни слова',
    )
    expect(later.fieldOrders).toHaveLength(0)
    const ledger = orderLedger(later)
    console.log(ledger.says)
    expect(ledger.sent).toBe(1)
    expect(ledger.onTime + ledger.stale).toBeGreaterThan(0)
    expect(DISPATCH.staleDays).toBeGreaterThan(0)
  })
})
