import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { ERA, ERAS, ERA_DEFS } from '../src/content/era'
import { createSettlements } from '../src/economy'
import { answersTo, eraFor, eraLedger, eraNow, eraSigns, eraTweaks } from '../src/era'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 146: событие эпохи.
 *
 * Эпоха — не число, а правило: пока она идёт, мир считается иначе. Какая и
 * когда — выводится из карты и дня, а не бросается кубиком.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(extra: Partial<GameState> = {}): GameState {
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, 8)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world),
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? '',
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    ...extra,
  }
}

describe('Эп1, Эп2 и Эп3: шесть эпох, правила и приметы', () => {
  it('эпохи выводятся из карты, а не бросаются кубиком', () => {
    for (const id of ERAS) {
      const def = ERA_DEFS[id]
      console.log(`${def.label} (${def.years} лет): ${def.rule} Приметы: ${def.signs.join(', ')}.`)
    }
    const windows = [0, 1, 2, 3, 4].map((one) => eraFor(world, one))
    console.log(
      `первые пять эпох этого мира: ${windows.map((one) => `${ERA_DEFS[one.id].label} на ${one.day}-й день`).join('; ')}`,
    )
    // Из одной карты — одна и та же история.
    expect(eraFor(world, 2).id).toBe(eraFor(world, 2).id)
    expect(eraFor(world, 2).day).toBe(eraFor(world, 2).day)

    const soon = windows[0] as { id: (typeof ERAS)[number]; day: number }
    const before = ruler({ time: WORLD_START + (soon.day - 700) * 24 * 60 })
    console.log(eraSigns(before, world, soon.day - 700).says)
  })
})

describe('Эп1, Эп4 и Эп5: правило, конец и ответ', () => {
  it('пока эпоха идёт, мир считается иначе, и её встречают решением', () => {
    const era = eraFor(world, 0)
    const state = ruler({
      era: { id: era.id, sinceDay: day - 100, untilDay: day + ERA_DEFS[era.id].years * 365 },
      churchAnger: 10,
    })
    console.log(eraNow(state, world, day).says)
    const tweak = eraTweaks(state, world, day)
    console.log(
      `правило в числах: война ×${tweak.warPressure}, гнев церкви ${tweak.churchAnger}, люди ${tweak.people}, верность ${tweak.loyalty}`,
    )
    expect(eraNow(state, world, day).id).toBe(era.id)

    for (const one of answersTo(era.id)) console.log(`${one.label}: ${one.says}`)
    const answer = answersTo(era.id)[0]?.id as string
    const met = ok(applyCommand(state, { type: 'meetEra', answer }))
    console.log(`встретили «${answer}»: казна ${state.character.money} -> ${met.character.money}`)
    expect(met.era?.answer).toBe(answer)
    expect(applyCommand(met, { type: 'meetEra', answer }).ok).toBe(false)
    console.log(eraLedger(met, world, day).says)
  })
})
