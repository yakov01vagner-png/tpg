import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { INHERIT, LAW_DEFS, REGENT_DEFS } from '../src/content/inherit'
import { createSettlements } from '../src/economy'
import { PLAYER, holdingsOf } from '../src/holding'
import {
  claimantsOf,
  heirLawOf,
  heirUnder,
  partitionOf,
  regencyFor,
  strifeOf,
  successionView,
} from '../src/inherit'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 93: наследование своего.
 *
 * Держава переживала государя без трещины: наследник получал всё. Здесь у
 * наследства есть закон и цена — раздел, первородство или неделимость, — регент
 * при малолетнем и родня с правами, из которых выходит смута.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const day = 400

function sovereign(children: readonly { name: string; age: number }[]): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 20000 }), 1, world)
  const taken = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, 10)
  const map = { ...settlements }
  for (const one of taken) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...game,
    politics,
    settlements: map,
    time: WORLD_START + (day - 1) * 24 * 60,
    locationId: taken[0]?.locationId ?? game.locationId,
    quarter: null,
    realm: { name: 'Заречье', sinceDay: 1 },
    character: {
      ...game.character,
      family: {
        ...game.character.family,
        house: 'Заречные',
        children: children.map((child, index) => ({
          name: child.name,
          bornDay: day - child.age * DAYS_PER_YEAR,
          heir: index === 0,
        })),
      },
    },
  }
}

describe('Сл2: закон и раздел', () => {
  it('три закона делят державу по-разному и стоят разного', () => {
    const state = sovereign([
      { name: 'Ждан', age: 22 },
      { name: 'Любим', age: 19 },
      { name: 'Милана', age: 17 },
    ])
    for (const law of ['split', 'eldest', 'unity'] as const) {
      const under: GameState = { ...state, heirLaw: law }
      const plan = partitionOf(under, day)
      console.log(
        `${LAW_DEFS[law].label}: наследнику ${plan.toHeir} мест из ${holdingsOf(state.settlements, PLAYER).length}, остальным ${plan.toOthers.map((one) => `${one.name} — ${one.places}`).join(', ') || 'ничего'}; знать ${LAW_DEFS[law].nobles >= 0 ? '+' : ''}${LAW_DEFS[law].nobles}, зависть обойдённых ${LAW_DEFS[law].envy}`,
      )
      expect(plan.toHeir).toBeGreaterThan(0)
    }
    expect(partitionOf({ ...state, heirLaw: 'unity' }, day).toHeir).toBeGreaterThan(
      partitionOf({ ...state, heirLaw: 'split' }, day).toHeir,
    )
    // Закон ставится державой и меняет отношение знати.
    const set = ok(applyCommand(state, { type: 'setHeirLaw', law: 'split' }))
    console.log(set.log[set.log.length - 1]?.text ?? '')
    expect(heirLawOf(set)).toBe('split')
    expect(applyCommand(set, { type: 'setHeirLaw', law: 'split' }).ok).toBe(false)
  })
})

describe('Сл4: ветви с правами', () => {
  it('права есть и у детей, и у родни', () => {
    const state = sovereign([
      { name: 'Ждан', age: 22 },
      { name: 'Любим', age: 19 },
    ])
    const claims = claimantsOf(state, day)
    for (const one of claims) console.log(`${one.name} (${one.kind}): ${one.claim} — ${one.says}`)
    expect(claims.some((one) => one.kind === 'branch')).toBe(true)
    expect(heirUnder(state, day)?.name).toBe('Ждан')
  })
})

describe('Сл3: регентство', () => {
  it('при малолетнем правит регент — и берёт своё', () => {
    const grown = sovereign([{ name: 'Ждан', age: 22 }])
    const minor = sovereign([{ name: 'Ждан', age: 9 }])
    expect(regencyFor(grown, heirUnder(grown, day) as never, day)).toBe(null)
    const regency = regencyFor(minor, heirUnder(minor, day) as never, day)
    console.log(regency?.says ?? 'регента нет')
    expect(regency).toBeTruthy()
    expect(regency?.years).toBe(INHERIT.minorAge - 9)
    console.log(
      `нравы регентов: ${Object.values(REGENT_DEFS)
        .map((one) => `${one.label} берёт ${Math.round(one.skim * 100)} из ста`)
        .join(', ')}`,
    )
  })
})

describe('Сл5: смута', () => {
  it('спор доходит до оружия, когда наследник слаб, а прав у соперника много', () => {
    const strong = sovereign([{ name: 'Ждан', age: 25 }])
    const weak: GameState = { ...sovereign([{ name: 'Ждан', age: 8 }]), heirLaw: 'unity' }
    const calm = strifeOf(strong, day)
    const storm = strifeOf(weak, day)
    console.log(`взрослый наследник: ${calm.says}`)
    console.log(`малолетний при неделимости: ${storm.says}`)
    expect(storm.risk).toBeGreaterThan(calm.risk)
  })
})

describe('Сл1 и Сл6: что будет без тебя', () => {
  it('всё это видно заранее одним взглядом', () => {
    const state: GameState = {
      ...sovereign([
        { name: 'Ждан', age: 10 },
        { name: 'Любим', age: 7 },
      ]),
      heirLaw: 'split',
    }
    const view = successionView(state, day)
    console.log(view)
    expect(view.length).toBeGreaterThan(60)
  })

  it('передача власти и правда делит державу', () => {
    const state: GameState = {
      ...sovereign([
        { name: 'Ждан', age: 22 },
        { name: 'Любим', age: 19 },
      ]),
      heirLaw: 'split',
    }
    const before = holdingsOf(state.settlements, PLAYER).length
    // Отречение идёт тем же законом, что и смерть: власть кончается одинаково.
    const old: GameState = {
      ...state,
      character: { ...state.character, bornDay: state.character.bornDay - 40 * DAYS_PER_YEAR },
    }
    const after = ok(applyCommand(old, { type: 'retire' }))
    const left = holdingsOf(after.settlements, PLAYER).length
    console.log(
      `${old.character.name} отошёл от дел: держава была ${before} мест, у наследника ${left}. ${after.log[after.log.length - 1]?.text ?? ''}`,
    )
    expect(after.character.name).toBe('Ждан')
    expect(left).toBeLessThan(before)
  })
})
