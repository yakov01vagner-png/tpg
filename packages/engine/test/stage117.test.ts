import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { OFFICES } from '../src/content/offices'
import { RESIDENT, RISK_DEFS } from '../src/content/resident'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { knownTo } from '../src/known'
import { candidatesFor } from '../src/office'
import {
  type Resident,
  nativeShare,
  residentAt,
  residentCost,
  residentLedger,
  residentWords,
  riskNow,
  theirResidents,
  theyLearn,
} from '../src/resident'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 117: постоянный посол.
 *
 * Выездное посольство привозит картину раз в месяцы и стареет в дороге.
 * Постоянный человек пишет каждые десять суток и вдвое вернее — а живя там
 * годами, начинает смотреть их глазами.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const first = kingdoms[1] as string
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(extra: Partial<GameState> = {}): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 60000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 900)
    .slice(0, 5)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  const lords = [...politics.lords]
  for (let i = 0; i < 3; i += 1) {
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
    ...extra,
  }
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

describe('Рп1 и Рп2: двор при дворе и поток вестей', () => {
  it('человек садится при чужой короне и пишет по своему сроку', () => {
    const state = ruler()
    const seated = ok(applyCommand(state, { type: 'seatResident', at: first }))
    console.log(seated.log.find((one) => one.text.includes('сел при'))?.text)
    expect(residentAt(seated, first)).not.toBeNull()
    expect(seated.character.money).toBe(state.character.money - RESIDENT.setUp)
    expect(residentCost(seated)).toBe(RESIDENT.perDay)
    // Дважды в одно место не сажают.
    expect(applyCommand(seated, { type: 'seatResident', at: first }).ok).toBe(false)

    // Вести приходят по такту и читаются общим слоем.
    let later = seated
    for (let step = 0; step < RESIDENT.beat + 1; step += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    const mine = (later.words ?? []).filter((one) => one.about === first)
    console.log(`прислал вестей: ${mine.length}, источник — ${mine[0]?.source}`)
    const known = knownTo(later, world, PLAYER, { kind: 'strength', about: first }, day + 12)
    console.log(`о их силе: ${known.says}`)
    expect(mine.length).toBeGreaterThan(0)
    expect(residentLedger(later).words).toBeGreaterThan(0)

    // И отозвать можно.
    const back = ok(applyCommand(later, { type: 'recallResident', at: first }))
    expect(residentAt(back, first)).toBeNull()
  })
})

describe('Рп3: он прирастает к месту', () => {
  it('со временем в его письмах всё больше их правоты', () => {
    const state = ruler()
    const resident: Resident = {
      id: 'resident:test',
      at: first,
      name: 'Прокоп',
      sinceDay: day,
      skill: 5,
    }
    for (const years of [0, 1.5, 3, 6]) {
      const when = day + Math.round(years * 365)
      console.log(`через ${years} лет: ${Math.round(nativeShare(resident, when) * 100)} из ста их`)
    }
    expect(nativeShare(resident, day)).toBe(0)
    expect(nativeShare(resident, day + 365 * 4)).toBeGreaterThan(0)
    expect(nativeShare(resident, day + 365 * 40)).toBe(RESIDENT.nativeMax)

    const fresh = residentWords(state, world, resident, day)
    const old = residentWords(state, world, resident, day + 365 * 5)
    console.log(`сила ${first}: свежий пишет ${fresh[0]?.value}, приросший ${old[0]?.value}`)
    expect(Number(old[0]?.value)).toBeLessThan(Number(fresh[0]?.value))
    // Приросший перестаёт передавать замысел вовсе.
    console.log(`вестей от свежего ${fresh.length}, от приросшего ${old.length}`)
  })
})

describe('Рп4: риск', () => {
  it('высылают, покупают и уличают — и это выводится из мира', () => {
    const state = ruler()
    const resident: Resident = {
      id: 'resident:test',
      at: first,
      name: 'Прокоп',
      sinceDay: day,
      skill: 5,
    }
    const calm = riskNow(state, world, resident, day)
    console.log(`в мире: ${calm.says}`)
    const warring: GameState = {
      ...state,
      politics: {
        ...state.politics,
        wars: [{ a: PLAYER, b: first, since: day - 10, reason: 'марка' }],
      },
    }
    const atWar = riskNow(warring, world, resident, day)
    console.log(`в войне: ${atWar.says}`)
    expect(atWar.chance).toBeGreaterThan(calm.chance)

    const hated: GameState = {
      ...state,
      politics: {
        ...state.politics,
        relations: {
          ...state.politics.relations,
          [[PLAYER, first].sort().join('|')]: RESIDENT.expelAt - 20,
        },
      },
    }
    const cold = riskNow(hated, world, resident, day)
    console.log(`при худом отношении: ${cold.says}`)
    expect(cold.chance).toBeGreaterThan(calm.chance)

    // Долго сидящего покупают, а при своих соглядатаях его же уличают.
    const veteran = riskNow(state, world, { ...resident, sinceDay: day - 365 * 5 }, day)
    console.log(`через пять лет: ${veteran.says}`)
    expect(veteran.chance).toBeGreaterThan(calm.chance)
    const watched = riskNow(
      { ...state, spies: [{ id: 'spy:1', kingdomId: first, seat: 'court', sinceDay: day - 60 }] },
      world,
      resident,
      day,
    )
    console.log(`когда ты там ещё и шпионишь: ${watched.says}`)
    expect(watched.chance).toBeGreaterThan(calm.chance)

    // Не бросок: тот же срок даёт тот же ответ.
    expect(riskNow(state, world, resident, day).risk).toBe(calm.risk)
    for (const [id, def] of Object.entries(RISK_DEFS)) {
      console.log(`${def.label}: ${def.about} — ${id}`)
    }
  })
})

describe('Рп5: взаимность', () => {
  it('чужие резиденты сидят у тебя, и видят то, что ты показываешь', () => {
    const state = ruler({
      politics: {
        ...politics,
        relations: {},
        wars: [{ a: PLAYER, b: first, since: day - 10, reason: 'марка' }],
      },
    })
    const theirs = theirResidents(state, world, day)
    for (const one of theirs.slice(0, 3)) console.log(one.says)
    expect(theirs.length).toBeGreaterThan(0)

    const guest = theirs[0]
    if (!guest) return
    const plain = theyLearn(state, world, guest, day)
    const poor = theyLearn({ ...state, showing: { [guest.from]: 'poor' } }, world, guest, day)
    const strong = theyLearn({ ...state, showing: { [guest.from]: 'strong' } }, world, guest, day)
    console.log(`как есть: ${plain.says}`)
    console.log(`прибеднился: ${poor.says}`)
    console.log(`показал силу: ${strong.says}`)
    expect(poor.sees).toBeLessThan(plain.sees)
    expect(strong.sees).toBeGreaterThan(plain.sees)
    // Постоянного не обманешь вполне: показное держится вполовину.
    expect(strong.sees - plain.sees).toBeLessThan(plain.truth * 0.45)
  })
})

describe('Рп6: резиденты в числах', () => {
  it('век считает, сколько стояло, сколько потеряно и что это дало', () => {
    const state = ruler()
    console.log(residentLedger(state).says)
    const seated = ok(applyCommand(state, { type: 'seatResident', at: first }))
    const ledger = residentLedger(seated)
    console.log(ledger.says)
    expect(ledger.seated).toBe(1)
    expect(ledger.perDay).toBe(RESIDENT.perDay)
  })
})
