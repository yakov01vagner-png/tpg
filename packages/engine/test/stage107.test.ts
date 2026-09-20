import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { AUDIENCE, MATTER_DEFS } from '../src/content/audience'
import { OFFICES } from '../src/content/offices'
import { vassalsOf } from '../src/court'
import { attentionOf, dayOfRule, delegatedWorth, doorway, ruleYear, whoTakes } from '../src/day'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { candidatesFor } from '../src/office'
import { placeRep } from '../src/reputation'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 107: день государя.
 *
 * Самая дорогая вещь во власти — внимание. Дел у дверей больше, чем часов; что
 * можно отдать своим, решится их рукой; а то, на что никто не посмотрел,
 * решается само и не в твою пользу.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

/** Государь с просителями у дверей: места просят, вассалы недовольны. */
function ruler(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, 6)
  const map = { ...settlements }
  const lords = [...politics.lords]
  const pleas: Record<string, { askId: string; askedDay: number }> = {}
  for (const [index, one] of mine.entries()) {
    if (index < 2) {
      const lord = lords[index]
      if (!lord) continue
      lords[index] = { ...lord, kingdomId: PLAYER, loyalty: 35 }
      map[one.locationId] = { ...one, owner: lord.id }
    } else {
      map[one.locationId] = { ...one, owner: PLAYER }
      pleas[one.locationId] = { askId: 'mill', askedDay: day - 20 }
    }
  }
  let filled: GameState = {
    ...game,
    politics: { ...politics, lords },
    settlements: map,
    pleas,
    locationId: mine[2]?.locationId ?? game.locationId,
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
  return filled
}

describe('Дн1 и Дн2: часы, которых мало', () => {
  it('у дверей больше, чем ты успеешь принять', () => {
    const state = ruler()
    const plan = dayOfRule(state, world, day)
    for (const matter of plan.waiting.slice(0, 5)) {
      console.log(`${matter.label} (вес ${matter.weight}): ${matter.says}`)
    }
    console.log(`${plan.says} Взять можешь ${plan.canTake}, сверх — ${plan.overflow}.`)
    expect(plan.waiting.length).toBeGreaterThan(0)
    expect(plan.canTake).toBe(attentionOf(state))

    // Усталость режет внимание.
    const tired: GameState = {
      ...state,
      character: { ...state.character, fatigue: AUDIENCE.tiredFrom + 5 },
    }
    console.log(`свежим берёшь ${attentionOf(state)} дел, усталым — ${attentionOf(tired)}`)
    expect(attentionOf(tired)).toBeLessThan(attentionOf(state))
  })
})

describe('Дн1: больше сил не возьмёшь', () => {
  it('сверх дневного счёта дела не берут', () => {
    const state = ruler()
    const plan = dayOfRule(state, world, day)
    let run = state
    let taken = 0
    for (const matter of plan.waiting) {
      const result = applyCommand(run, { type: 'hearMatter', matterId: matter.id })
      if (!result.ok) break
      run = result.state
      taken += 1
    }
    console.log(`принято за день: ${taken} при пределе ${plan.canTake}`)
    expect(taken).toBe(plan.canTake)
    expect(ruleYear(run).heard).toBe(taken)
  })
})

describe('Дн4: делегирование', () => {
  it('переданное решается чужой рукой и выходит хуже', () => {
    const state = ruler()
    const plea = doorway(state, world, day).find((one) => one.kind === 'plea')
    if (!plea) return
    const who = whoTakes(state, plea, day)
    console.log(
      `${plea.says} Возьмёт ${who?.name} (${who?.temper}): выйдет на ${Math.round(delegatedWorth(who) * 100)} из ста от твоего.`,
    )
    const heard = ok(applyCommand(state, { type: 'hearMatter', matterId: plea.id }))
    const handed = ok(applyCommand(state, { type: 'handMatter', matterId: plea.id }))
    const mine = placeRep(heard.reputation, plea.about)
    const theirs = placeRep(handed.reputation, plea.about)
    console.log(`память места: своей рукой +${mine}, чужой +${theirs}; ${ruleYear(handed).says}`)
    expect(mine).toBeGreaterThan(theirs)
    expect(ruleYear(handed).handed).toBe(1)
  })
})

describe('Дн3 и Дн6: что не посмотрел', () => {
  it('брошенное решается само и не в твою пользу', () => {
    const state = ruler()
    const plea = doorway(state, world, day).find((one) => one.kind === 'plea')
    if (!plea) return
    const before = placeRep(state.reputation, plea.about)
    let run = state
    for (let i = 0; i < 14; i += 1) {
      run = ok(applyCommand(run, { type: 'tick', minutes: 24 * 60 }))
    }
    const after = placeRep(run.reputation, plea.about)
    console.log(
      `${run.log.find((one) => one.text.includes('Решилось без тебя'))?.text ?? 'всё разобрали'} Память места ${before} → ${after}. ${ruleYear(run).says}`,
    )
    expect(after).toBeLessThan(before)
    expect(ruleYear(run).missed).toBeGreaterThan(0)
    expect(MATTER_DEFS.plea.cost).toBeGreaterThan(0)
  })

  it('недовольный вассал у дверей — это счёт, который растёт', () => {
    const state = ruler()
    const matter = doorway(state, world, day).find((one) => one.kind === 'vassal')
    if (!matter) return
    const before = vassalsOf(state).find((one) => one.id === matter.about)?.loyalty ?? 0
    const heard = ok(applyCommand(state, { type: 'hearMatter', matterId: matter.id }))
    const after = vassalsOf(heard).find((one) => one.id === matter.about)?.loyalty ?? 0
    console.log(
      `${matter.says} Разобрано тобой: верность ${Math.round(before)} → ${Math.round(after)}`,
    )
    expect(after).toBeGreaterThan(before)
  })
})
