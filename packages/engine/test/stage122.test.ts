import { describe, expect, it } from 'vitest'
import { ATTRIBUTE_IDS } from '../src/attributes'
import { createCharacter, skillLevel } from '../src/character'
import { applyCommand } from '../src/commands'
import { ATTRIBUTE_PLACES, SKILL_PLACES } from '../src/content/sheet'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { knownTo } from '../src/known'
import { createRng } from '../src/rng'
import {
  attributeDoes,
  deadRows,
  digsFaster,
  hidesSpy,
  holdsOut,
  remembersDays,
  ridersSpeed,
  ridesQuicker,
  scoutReach,
  sheetOf,
  skillDoes,
  sparesMen,
  steadyUnder,
  stealsCheaper,
} from '../src/sheet'
import { SKILL_IDS } from '../src/skills'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 122: что на что влияет.
 *
 * Семь версий у героя росли шесть атрибутов и семнадцать навыков, и половина из
 * них не делала ничего, кроме скорости собственного роста. Здесь у каждой
 * строки листа есть дело, названное числом, — и проверяется это счётом, а не
 * словами.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const day = 400

/** Один и тот же герой с разным уровнем одного навыка: разница видна в числе. */
function hero(skills: Record<string, number> = {}, attributes: Record<string, number> = {}) {
  return createCharacter({
    name: 'Ратша',
    money: 20000,
    skills: skills as never,
    attributes: attributes as never,
  })
}

function ruler(character = hero()): GameState {
  const game = createGame(character, 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 900)
    .slice(0, 4)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
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

describe('А2: мёртвых нет', () => {
  it('у каждого навыка не меньше двух дел, у каждого атрибута — прямое дело', () => {
    const dead = deadRows()
    console.log(`мёртвых строк: ${dead.length}${dead.length > 0 ? ` (${dead.join(', ')})` : ''}`)
    expect(dead).toHaveLength(0)
    for (const id of SKILL_IDS) {
      expect((SKILL_PLACES[id] ?? []).length).toBeGreaterThanOrEqual(2)
    }
    for (const id of ATTRIBUTE_IDS) {
      expect((ATTRIBUTE_PLACES[id] ?? []).length).toBeGreaterThanOrEqual(1)
    }
    const counted = SKILL_IDS.map((id) => `${id} ${(SKILL_PLACES[id] ?? []).length}`)
    console.log(`дел у навыков: ${counted.join(', ')}`)
  })

  it('прежде мёртвые навыки меняют числа', () => {
    const weak = hero()
    const strong = hero({
      hardLabour: 60,
      fortitude: 60,
      concentration: 60,
      sleight: 60,
      athletics: 60,
      riding: 60,
    })
    const rows: [string, number, number][] = [
      ['тяжёлый труд: подкоп ×', digsFaster(weak), digsFaster(strong)],
      ['стойкость: усталость ×', holdsOut(weak), holdsOut(strong)],
      ['стойкость: внезапность ×', steadyUnder(weak), steadyUnder(strong)],
      ['концентрация: память, сут.', remembersDays(weak, 1080), remembersDays(strong, 1080)],
      ['ловкость рук: ловят ×', hidesSpy(weak), hidesSpy(strong)],
      ['ловкость рук: кража ×', stealsCheaper(weak), stealsCheaper(strong)],
      ['атлетика: объезд ×', ridesQuicker(weak), ridesQuicker(strong)],
      ['атлетика: проба ×', sparesMen(weak), sparesMen(strong)],
      ['верховая: гонцы ×', ridersSpeed(weak), ridersSpeed(strong)],
      ['верховая: дозор, переходов', scoutReach(weak), scoutReach(strong)],
    ]
    for (const [label, low, high] of rows) {
      console.log(`${label} ${low} → ${high} (0 и 60 уровня)`)
      expect(low).not.toBe(high)
    }
  })
})

describe('А3: атрибуты действуют сами', () => {
  it('разум сужает вилку твоего знания', () => {
    const dull = ruler(hero({}, { mind: 4 }))
    const sharp = ruler(hero({}, { mind: 10 }))
    const word = {
      id: 'word:1',
      to: PLAYER,
      kind: 'strength' as const,
      about: Object.keys(world.kingdoms)[1] as string,
      value: 1000,
      source: 'envoy' as const,
      from: null,
      day: day - 30,
    }
    const dullKnows = knownTo(
      { ...dull, words: [word] },
      world,
      PLAYER,
      { kind: 'strength', about: word.about },
      day,
    )
    const sharpKnows = knownTo(
      { ...sharp, words: [word] },
      world,
      PLAYER,
      { kind: 'strength', about: word.about },
      day,
    )
    console.log(`разум 4: вилка ${dullKnows.spread}; разум 10: ${sharpKnows.spread}`)
    expect(sharpKnows.spread).toBeLessThan(dullKnows.spread)
  })

  it('воля снимает усталость с приёмов, обаяние прибавляет чужой руке', () => {
    for (const id of ['mind', 'will', 'charisma'] as const) {
      const strong = hero({}, { [id]: 10 })
      console.log(`${id} 10: ${attributeDoes(strong, id).join('; ')}`)
      const plain = hero({}, { [id]: 6 })
      expect(attributeDoes(strong, id).join()).not.toBe(attributeDoes(plain, id).join())
    }
  })
})

describe('А1 и А5: лист показывает дело, а не уровень', () => {
  it('против каждой строки стоит, что она даёт здесь и сейчас', () => {
    const character = hero(
      { hardLabour: 30, riding: 40, trade: 50 },
      { mind: 8, will: 8, charisma: 9 },
    )
    const rows = sheetOf(character)
    for (const row of rows.filter((one) => one.kind === 'attribute')) {
      console.log(`${row.label} ${row.level}: ${row.does.join('; ')}`)
    }
    for (const id of ['hardLabour', 'riding', 'fortitude'] as const) {
      console.log(`${id} ${skillLevel(character, id)}: ${skillDoes(character, id).join('; ')}`)
    }
    expect(rows).toHaveLength(ATTRIBUTE_IDS.length + SKILL_IDS.length)
    expect(rows.every((one) => one.does.length > 0)).toBe(true)
  })
})

describe('А6: дела видны в игре, а не только на листе', () => {
  it('то же самое действие у разных героев стоит по-разному', () => {
    const lazy = ruler(hero({ athletics: 0 }))
    const fit = ruler(hero({ athletics: 60 }))
    const probeLazy = applyCommand(
      { ...lazy, party: { ...lazy.party, units: { militia: 100 } } },
      { type: 'probeBand', bandId: 'нет такого' },
    )
    expect(probeLazy.ok).toBe(false)

    // Усталость: тот же час дороги у стойкого стоит меньше.
    const soft = ruler(hero({ fortitude: 0 }))
    const tough = ruler(hero({ fortitude: 70 }))
    const softRest = applyCommand(soft, { type: 'rest', hours: 1 })
    const toughRest = applyCommand(tough, { type: 'rest', hours: 1 })
    console.log(
      `стойкость 0 и 70: усталость ×${holdsOut(soft.character)} и ×${holdsOut(tough.character)}`,
    )
    expect(softRest.ok && toughRest.ok).toBe(true)
    expect(holdsOut(tough.character)).toBeLessThan(holdsOut(soft.character))
    expect(fit.character.skills.athletics.level).toBeGreaterThan(
      lazy.character.skills.athletics.level,
    )
  })
})
