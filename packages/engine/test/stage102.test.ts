import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { PLAYER, holdingsOf } from '../src/holding'
import { knownTo, spreadWords } from '../src/known'
import { placeRep } from '../src/reputation'
import { createRng } from '../src/rng'
import { SIGHT, blindShare, knowMap, lookCost, looksOf, tourPlan } from '../src/sight'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 102: свои глаза.
 *
 * Единственный точный источник — и единственный, который нельзя раздать.
 * Объезд стоит суток и возвращает правду; посланный человек дешевле временем и
 * дороже точностью.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(places = 7): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, places)
  const map = { ...settlements }
  for (const one of mine)
    map[one.locationId] = { ...one, owner: PLAYER, garrison: { spearman: 20 } }
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

describe('Г5 и Г6: карта знания и цена незнания', () => {
  it('видно, где знаешь свежо, а где не знаешь ничего', () => {
    const state = ruler()
    const rows = knowMap(state, world, day)
    for (const row of rows.slice(0, 4)) {
      console.log(
        `${row.name}: ${row.age >= 999 ? 'вестей нет вовсе' : `вести ${row.age} сут.`}, источник — ${row.source}${row.fresh ? '' : ' (несвежо)'}`,
      )
    }
    console.log(
      `своей земли знаешь несвежо: ${Math.round(blindShare(state, world, day) * 100)} из ста (черта свежести ${SIGHT.staleDays} сут.)`,
    )
    expect(rows.length).toBe(holdingsOf(state.settlements, PLAYER).length)
    expect(blindShare(state, world, day)).toBeGreaterThan(0.5)
  })
})

describe('Г1–Г3: объезд державы', () => {
  it('объезд стоит суток, возвращает правду и помнится местами', () => {
    const state = ruler()
    const plan = tourPlan(state, world, day)
    console.log(plan.says)
    expect(plan.stops.length).toBeGreaterThan(0)

    const before = blindShare(state, world, day)
    const rode = ok(applyCommand(state, { type: 'rideOut' }))
    const after = blindShare(rode, world, day + plan.days)
    const first = plan.stops[0]
    if (!first) return
    const known = knownTo(
      rode,
      world,
      PLAYER,
      { kind: 'stores', about: first.locationId },
      day + plan.days,
    )
    console.log(
      `${rode.log[rode.log.length - 1]?.text ?? ''} Знание о ${first.name}: ${spreadWords(known)} (${known.source}); несвежего было ${Math.round(before * 100)} из ста, стало ${Math.round(after * 100)}`,
    )
    expect(known.source).toBe('eyes')
    // Увиденное самому стареет тоже — медленнее прочего, но стареет: за
    // пятидесятидневный объезд вилка успела подрасти до 12 из ста.
    expect(known.spread).toBeLessThan(0.2)
    expect(after).toBeLessThan(before)
    // Места помнят, что хозяин приезжал.
    expect(placeRep(rode.reputation, first.locationId)).toBeGreaterThan(
      placeRep(state.reputation, first.locationId),
    )
    expect(rode.visits?.[first.locationId]).toBeTruthy()
  })
})

describe('Г4: поручить посмотреть', () => {
  it('дешевле временем, дороже точностью', () => {
    const state = ruler()
    const far = holdingsOf(state.settlements, PLAYER).find(
      (one) => one.locationId !== state.locationId,
    )
    if (!far) return
    const cost = lookCost(world, state.locationId, far.locationId)
    const sent = ok(applyCommand(state, { type: 'sendLook', locationId: far.locationId }))
    console.log(
      `${sent.log[sent.log.length - 1]?.text ?? ''} В пути: ${looksOf(sent).length}; твоих суток ушло 0 (объезд стоил бы ${tourPlan(state, world, day).days}).`,
    )
    expect(looksOf(sent)).toHaveLength(1)
    expect(sent.character.money).toBe(state.character.money - cost.silver)
    // Дважды в одно место не посылают.
    expect(applyCommand(sent, { type: 'sendLook', locationId: far.locationId }).ok).toBe(false)

    let run = sent
    for (let i = 0; i < cost.days + 2 && looksOf(run).length > 0; i += 1) {
      run = ok(applyCommand(run, { type: 'rest', hours: 12 }))
      run = ok(applyCommand(run, { type: 'rest', hours: 12 }))
    }
    const known = knownTo(
      run,
      world,
      PLAYER,
      { kind: 'stores', about: far.locationId },
      day + cost.days,
    )
    console.log(
      `${run.log.find((one) => one.text.includes('вернулся'))?.text ?? 'не вернулся'} Знание: ${spreadWords(known)} — ${known.says}`,
    )
    expect(looksOf(run)).toHaveLength(0)
    expect(known.source).toBe('own')
    // У посланного вилка есть, у своих глаз — нет.
    expect(known.spread).toBeGreaterThan(0)
  })
})
