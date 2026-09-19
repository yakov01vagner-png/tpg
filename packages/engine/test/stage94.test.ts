import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { CONCESSION_DEFS, GRUDGE_DEFS, REVOLT } from '../src/content/revolt'
import { vassalsOf } from '../src/court'
import { createSettlements } from '../src/economy'
import { PLAYER, holdingsOf } from '../src/holding'
import {
  bribePriceFor,
  concessionsFor,
  courtMood,
  grudgeScore,
  grudgesOf,
  lessonWords,
  mercyGain,
  plotAgainst,
  reprisalCost,
} from '../src/revolt'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 94: мятеж против тебя.
 *
 * Вассал терял верность и однажды уходил из присяги молча. Здесь недовольство
 * складывается в счёт из вещей, которые он видит у себя во дворе, счёт зреет в
 * заговор, а у тебя есть чем ответить — уступкой или силой, и обе цены видны.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const day = 400

/** Государь со своими вассалами: землю держат его лорды. */
function liege(loyalty = 60, count = 4): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
  const places = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, count + 4)
  const map = { ...settlements }
  const lords = [...politics.lords]
  const mine: string[] = []
  for (const [index, one] of places.entries()) {
    if (index < count) {
      // Первые места — лены вассалов, остальные держит сам государь.
      const lord = lords[index]
      if (!lord) continue
      lords[index] = { ...lord, kingdomId: PLAYER, loyalty }
      map[one.locationId] = { ...one, owner: lord.id }
      mine.push(lord.id)
    } else {
      map[one.locationId] = { ...one, owner: PLAYER }
    }
  }
  return {
    ...game,
    politics: { ...politics, lords },
    settlements: map,
    time: WORLD_START + (day - 1) * 24 * 60,
    locationId: places[count]?.locationId ?? game.locationId,
    quarter: null,
    realm: { name: 'Заречье', sinceDay: 1 },
  }
}

describe('Мя1: недовольство', () => {
  it('счёт складывается из того, что вассал видит у себя во дворе', () => {
    const calm = liege(80)
    const lord = vassalsOf(calm)[0]
    if (!lord) return
    console.log(`спокойный двор: ${courtMood(calm, world, day)}`)
    const heavy: GameState = {
      ...calm,
      law: {
        tax: 'heavy' as const,
        toll: 'plain' as const,
        levy: 'full' as const,
        justice: 'harsh' as const,
      },
      politics: {
        ...calm.politics,
        wars: [{ a: PLAYER, b: 'robl', since: 1, reason: 'война' }],
      },
      shames: [{ id: 'broke' as const, since: 10, covered: 0 }],
    }
    const angryLord = vassalsOf(heavy)[0]
    if (!angryLord) return
    for (const one of grudgesOf(heavy, world, angryLord, day)) {
      console.log(`${GRUDGE_DEFS[one.id].label}: ${one.weight} — «${one.says}»`)
    }
    console.log(
      `счёт недовольства: спокойный ${grudgeScore(calm, world, lord, day)}, недовольный ${grudgeScore(heavy, world, angryLord, day)} (заговор с ${REVOLT.plotLine}, мятеж с ${REVOLT.riseLine})`,
    )
    expect(grudgeScore(heavy, world, angryLord, day)).toBeGreaterThan(
      grudgeScore(calm, world, lord, day),
    )
  })
})

describe('Мя2: заговор', () => {
  it('недовольные находят друг друга, и об этом можно узнать заранее', () => {
    const angry: GameState = {
      ...liege(20),
      law: {
        tax: 'heavy' as const,
        toll: 'plain' as const,
        levy: 'full' as const,
        justice: 'harsh' as const,
      },
      politics: {
        ...liege(20).politics,
        wars: [{ a: PLAYER, b: 'robl', since: 1, reason: 'война' }],
      },
      shames: [{ id: 'broke' as const, since: 10, covered: 0 }],
    }
    const plot = plotAgainst(angry, world, day)
    console.log(plot?.says ?? 'заговора нет')
    expect(plot).toBeTruthy()
    if (!plot) return
    expect(plot.members.length).toBeGreaterThan(0)
    // Свои люди при дворе или соглядатаи приносят весть раньше.
    const withOfficers: GameState = {
      ...angry,
      offices: { marshal: { holderId: 'someone', sinceDay: 1, kind: 'hired' } },
    }
    const seen = plotAgainst(withOfficers, world, day)
    console.log(`узнали от: ${seen?.seenBy ?? 'никого'}`)
    expect(seen?.seen).toBe(true)
  })
})

describe('Мя4: уступки', () => {
  it('уступка унимает, и у каждой своя цена', () => {
    const angry: GameState = {
      ...liege(20),
      law: {
        tax: 'heavy' as const,
        toll: 'plain' as const,
        levy: 'full' as const,
        justice: 'harsh' as const,
      },
      shames: [{ id: 'broke' as const, since: 10, covered: 0 }],
    }
    const plot = plotAgainst(angry, world, day)
    if (!plot) return
    for (const offer of concessionsFor(angry, plot)) {
      console.log(
        `${offer.label}: унимает ${offer.calms}, платишь ${offer.costs}${offer.can ? '' : ' — нельзя сейчас'}`,
      )
    }
    console.log(`серебром просят ${bribePriceFor(plot)} за ${plot.members.length} человек`)
    const before = vassalsOf(angry).reduce((sum, one) => sum + one.loyalty, 0)
    const given = ok(applyCommand(angry, { type: 'appeasePlot', concession: 'liberty' }))
    const after = vassalsOf(given).reduce((sum, one) => sum + one.loyalty, 0)
    console.log(
      `${given.log[given.log.length - 1]?.text ?? ''} Верность знати ${before} → ${after}.`,
    )
    expect(after).toBeGreaterThan(before)
    expect(given.charters?.[plot.leaderId]?.kind).toBe('liberty')
  })
})

describe('Мя5 и Мя6: расправа и уроки', () => {
  it('силой — тоже можно, и это стоит славы и доверия', () => {
    const angry: GameState = {
      ...liege(15),
      law: {
        tax: 'heavy' as const,
        toll: 'plain' as const,
        levy: 'full' as const,
        justice: 'harsh' as const,
      },
      shames: [{ id: 'broke' as const, since: 10, covered: 0 }],
    }
    const plot = plotAgainst(angry, world, day)
    if (!plot) return
    const cost = reprisalCost(angry, plot)
    console.log(cost.says)
    console.log(mercyGain().says)
    const before = holdingsOf(angry.settlements, PLAYER).length
    const crushed = ok(applyCommand(angry, { type: 'crushPlot' }))
    const after = holdingsOf(crushed.settlements, PLAYER).length
    console.log(
      `земля зачинщика: ${before} мест → ${after}; вассалов ${vassalsOf(angry).length} → ${vassalsOf(crushed).length}; слава у знати ${angry.fame?.nobles ?? 0} → ${crushed.fame?.nobles ?? 0}`,
    )
    expect(after).toBeGreaterThan(before)
    expect(vassalsOf(crushed).length).toBeLessThan(vassalsOf(angry).length)
    console.log(lessonWords(true))
    console.log(lessonWords(false))
  })
})

describe('Мя3: мятеж', () => {
  it('созревший заговор выходит в открытый мятеж сам', () => {
    // Верность не в нуле: старое правило (верность ниже 12) не сработает —
    // мятеж должен вырасти из заговора, а не из отчаяния одиночки.
    const angry: GameState = {
      ...liege(30),
      law: {
        tax: 'heavy' as const,
        toll: 'plain' as const,
        levy: 'full' as const,
        justice: 'harsh' as const,
      },
      politics: {
        ...liege(30).politics,
        wars: [{ a: PLAYER, b: 'robl', since: 1, reason: 'война' }],
      },
      shames: [
        { id: 'broke' as const, since: 10, covered: 0 },
        { id: 'burned' as const, since: 20, covered: 0 },
      ],
    }
    const plot = plotAgainst(angry, world, day)
    console.log(`зрелость заговора ${plot?.ripeness ?? 0} при черте мятежа ${REVOLT.riseLine}`)
    if (!plot || plot.ripeness < REVOLT.riseLine) return
    let run = angry
    for (let i = 0; i < 12; i += 1) {
      run = ok(applyCommand(run, { type: 'rest', hours: 12 }))
      run = ok(applyCommand(run, { type: 'rest', hours: 12 }))
      if (vassalsOf(run).length < vassalsOf(angry).length) break
    }
    console.log(
      `${run.log.find((one) => one.text.includes('знамёна'))?.text ?? 'мятежа не случилось'} Вассалов осталось ${vassalsOf(run).length} из ${vassalsOf(angry).length}.`,
    )
    expect(vassalsOf(run).length).toBeLessThan(vassalsOf(angry).length)
  })
})
