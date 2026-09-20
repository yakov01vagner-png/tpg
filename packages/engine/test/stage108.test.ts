import { describe, expect, it } from 'vitest'
import { BEHEST, BEHEST_DEFS, behestLedger, behestPlan, outcomeOf } from '../src/behest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { BEHESTS } from '../src/content/behest'
import { COURT_TEMPERS } from '../src/content/courtier'
import { OFFICES } from '../src/content/offices'
import { courtiersOf } from '../src/courtier'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { candidatesFor } from '../src/office'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 108: приказ и исполнение.
 *
 * До сих пор команда государя исполнялась сама собой: сказал — сделалось.
 * Здесь между словом и делом появляются дорога и человек. Приказ идёт, его
 * исполняют чужими руками, и отчёт возвращается — и каждая из трёх частей
 * может пойти не так.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Государь со своими местами и полным двором: есть кому велеть и кого послать. */
function ruler(): { state: GameState; mine: readonly string[] } {
  const game = createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, 6)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  let filled: GameState = {
    ...game,
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? game.locationId,
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
  for (const office of OFFICES) {
    const who = candidatesFor(filled, office)[0]
    if (!who) continue
    filled = {
      ...filled,
      offices: {
        ...(filled.offices ?? {}),
        [office]: { holderId: who.id, kind: who.kind, sinceDay: day - 3 * DAYS_PER_YEAR },
      },
    }
  }
  return { state: filled, mine: mine.map((one) => one.locationId) }
}

describe('Пр1: приказ идёт дорогой', () => {
  it('между словом и делом лежат сутки, и их видно заранее', () => {
    const { state, mine } = ruler()
    const far = mine[mine.length - 1] as string
    const here = state.locationId
    const near = behestPlan(world, here, here, 'collect', day)
    const away = behestPlan(world, here, far, 'collect', day)
    console.log(
      `у себя во дворе: дойдёт за ${near.arrivesDay - day} суток, дело ${BEHEST_DEFS.collect.days}, отчёт к ${near.backDay - day}-м`,
    )
    console.log(
      `в ${world.locations[far]?.name}: дойдёт за ${away.arrivesDay - day}, отчёт только к ${away.backDay - day}-м суткам`,
    )
    expect(away.backDay).toBeGreaterThan(near.backDay)

    const sent = ok(applyCommand(state, { type: 'sendBehest', kind: 'collect', locationId: far }))
    console.log(sent.log.find((one) => one.text.startsWith('Приказ послан'))?.text)
    expect(sent.behests).toHaveLength(1)
    expect(sent.behestLog?.sent).toBe(1)

    // В чужое место велеть нельзя, и дважды одно и то же — тоже.
    const theirs = Object.values(state.settlements).find((one) => one.owner !== PLAYER)
    if (theirs) {
      expect(
        applyCommand(state, {
          type: 'sendBehest',
          kind: 'collect',
          locationId: theirs.locationId,
        }).ok,
      ).toBe(false)
    }
    expect(applyCommand(sent, { type: 'sendBehest', kind: 'collect', locationId: far }).ok).toBe(
      false,
    )
  })
})

describe('Пр2 и Пр3: чьими руками', () => {
  it('один и тот же приказ выходит по-разному — и это нрав, а не бросок', () => {
    const { state } = ruler()
    const people = courtiersOf(state, day)
    expect(people.length).toBeGreaterThan(0)
    for (const temper of COURT_TEMPERS) {
      const one = people[0]
      if (!one) continue
      const out = outcomeOf({ ...one, temper })
      console.log(`${temper}: ${out.outcome}, доля ${out.share.toFixed(2)} — ${out.says}`)
    }
    const first = people[0]
    if (!first) return
    const zealous = outcomeOf({ ...first, temper: 'zealous' })
    const weary = outcomeOf({ ...first, temper: 'weary' })
    const sly = outcomeOf({ ...first, temper: 'sly' })
    expect(zealous.share).toBeGreaterThan(1)
    expect(weary.share).toBeCloseTo(BEHEST.weary, 3)
    expect(sly.share).toBeCloseTo(1 - BEHEST.slyTakes, 3)
    // Дважды спросив одно и то же, получаешь тот же ответ: исполнителя выбирают.
    expect(outcomeOf(people[0] ?? null).share).toBe(outcomeOf(people[0] ?? null).share)
    // Без двора приказ всё равно делается — но вполовину.
    console.log(`без двора: ${outcomeOf(null).says} доля ${outcomeOf(null).share}`)
    expect(outcomeOf(null).share).toBeLessThan(1)
  })
})

describe('Пр4 и Пр6: отчёт возвращается', () => {
  it('приказ доходит, исполняется и сказывается — и ложится в счёт', () => {
    const { state, mine } = ruler()
    const where = mine[1] as string
    const sent = ok(applyCommand(state, { type: 'sendBehest', kind: 'collect', locationId: where }))
    const behest = sent.behests?.[0]
    if (!behest) throw new Error('приказа нет')
    const purse = sent.character.money

    let later = sent
    for (let step = 0; step < behest.backDay - day + 3; step += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const word = later.log.find(
      (one) => one.text.includes('серебра вперёд') || one.text.includes('приказ пропал'),
    )
    console.log(`через ${behest.backDay - day + 3} суток: ${word?.text ?? 'ни слова'}`)
    console.log(
      `казна ${purse} → ${later.character.money}; приказов в дороге ${later.behests?.length ?? 0}`,
    )
    expect(later.behests).toHaveLength(0)
    expect(later.character.money).toBeGreaterThan(purse)

    const ledger = behestLedger(later)
    console.log(ledger.says)
    expect(ledger.sent).toBe(1)
    expect(ledger.full + ledger.twisted).toBe(1)
  })
})

describe('Пр5: слово можно вернуть, пока гонец в дороге', () => {
  it('отозвать выходит до прихода и не выходит после', () => {
    const { state, mine } = ruler()
    const far = mine[mine.length - 1] as string
    const sent = ok(applyCommand(state, { type: 'sendBehest', kind: 'muster', locationId: far }))
    const behest = sent.behests?.[0]
    if (!behest) throw new Error('приказа нет')
    const back = ok(applyCommand(sent, { type: 'recallBehest', behestId: behest.id }))
    console.log(back.log.find((one) => one.text.includes('отозван'))?.text)
    expect(back.behests).toHaveLength(0)

    // А после прихода — поздно.
    let late = sent
    for (let step = 0; step < behest.arrivesDay - day + 1; step += 1) {
      late = ok(applyCommand(late, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const refused = applyCommand(late, { type: 'recallBehest', behestId: behest.id })
    console.log(refused.ok ? 'отозвали' : `нельзя: ${refused.message}`)
    expect(refused.ok).toBe(false)
  })

  it('велеть можно всякое, и каждое делает своё', () => {
    const { state, mine } = ruler()
    for (const kind of BEHESTS) {
      const where = mine[1] as string
      const sent = ok(applyCommand(state, { type: 'sendBehest', kind, locationId: where }))
      const behest = sent.behests?.[0]
      if (!behest) continue
      let later = sent
      for (let step = 0; step < behest.backDay - day + 2; step += 1) {
        later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
      }
      const word = later.log.find(
        (one) =>
          one.text.includes('Исполнено') ||
          one.text.includes('Приказ исполнен') ||
          one.text.includes('осела по дороге'),
      )
      console.log(`${BEHEST_DEFS[kind].label} → ${word?.text ?? '—'}`)
      expect(later.behests).toHaveLength(0)
      expect(later.behestLog?.sent).toBe(1)
    }
  })
})
