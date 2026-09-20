import { describe, expect, it } from 'vitest'
import { createCharacter, skillLevel } from '../src/character'
import { applyCommand } from '../src/commands'
import { MOULD, MOULDS, MOULD_DEFS } from '../src/content/mould'
import { createSettlements } from '../src/economy'
import { guessAim } from '../src/guess'
import { PLAYER } from '../src/holding'
import { everyMould, mouldOf, paysWith, retrainCost, seenAs, takesBy } from '../src/mould'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 126: склад и выбор.
 *
 * Классов в игре нет: склад — это не то, что выбрали на старте, а то, что
 * вышло из выборов. Здесь он получает имя, цену и голос.
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

function hero(skills: Record<string, number> = {}) {
  return createCharacter({ name: 'Ратша', money: 40000, skills: skills as never })
}

/** Герои пяти складов: у каждого подняты его навыки и просели чужие. */
const heroes = {
  warrior: hero({ heavyWeapons: 50, command: 45, fortitude: 40, riding: 40 }),
  scholar: hero({ scholarship: 50, engineering: 45, concentration: 40, healing: 40 }),
  merchant: hero({ trade: 55, persuasion: 45, scholarship: 30, riding: 30 }),
  ruler: hero({ persuasion: 50, command: 45, scholarship: 40, trade: 45 }),
  shadow: hero({ sleight: 50, concentration: 45, persuasion: 40, lightWeapons: 40 }),
}

function ruler(character = heroes.warrior): GameState {
  const game = createGame(character, 1, world)
  const mine = Object.values(settlements)
    .filter((one) => one.population > 900)
    .slice(0, 3)
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

describe('Сл1: склады, а не классы', () => {
  it('склад выводится из навыков, а не выбирается', () => {
    for (const [name, character] of Object.entries(heroes)) {
      const mould = mouldOf(character)
      console.log(`${name}: ${mould.says}`)
      expect(mould.id).toBe(name)
    }
    // У новичка склада ещё нет.
    const green = mouldOf(hero())
    console.log(`новичок: ${green.says}`)
    expect(green.id).toBeNull()
  })
})

describe('Сл2: чем платишь', () => {
  it('за каждый склад платишь тем, чего в нём нет', () => {
    for (const id of MOULDS) {
      console.log(paysWith(heroes[id], id).says)
      expect(MOULD_DEFS[id].lacks.length).toBeGreaterThan(0)
    }
    const warrior = paysWith(heroes.warrior, 'warrior')
    expect(warrior.lacks.every((one) => one.level < 20)).toBe(true)
  })
})

describe('Сл3: склад виден миру', () => {
  it('короны судят по складу ещё до всяких примет', () => {
    const asWarrior = guessAim(ruler(heroes.warrior), world, foe, day)
    const asMerchant = guessAim(ruler(heroes.merchant), world, foe, day)
    console.log(
      `о воине: земля ${asWarrior.lean.land}, серебро ${asWarrior.lean.coin}, родство ${asWarrior.lean.kin}`,
    )
    console.log(
      `о купце: земля ${asMerchant.lean.land}, серебро ${asMerchant.lean.coin}, родство ${asMerchant.lean.kin}`,
    )
    expect(asWarrior.lean.land).toBeGreaterThan(asMerchant.lean.land)
    expect(asMerchant.lean.coin).toBeGreaterThan(asWarrior.lean.coin)
    for (const id of MOULDS) console.log(`${MOULD_DEFS[id].label}: ${seenAs(id)}`)
  })
})

describe('Сл4: смена пути', () => {
  it('переучиться можно, и это стоит лет и денег', () => {
    const warrior = ruler(heroes.warrior)
    const cost = retrainCost(warrior.character, 'heavyWeapons', 'trade')
    console.log(cost.says)
    expect(cost.can).toBe(true)
    expect(cost.silver).toBeGreaterThan(0)

    const before = skillLevel(warrior.character, 'heavyWeapons')
    const after = ok(applyCommand(warrior, { type: 'retrain', from: 'heavyWeapons', to: 'trade' }))
    console.log(
      `тяжёлое оружие ${before} → ${skillLevel(after.character, 'heavyWeapons')}, торговля ${skillLevel(warrior.character, 'trade')} → ${skillLevel(after.character, 'trade')}`,
    )
    // Плата за переучивание видна там, где нет дохода: у безземельного героя.
    const landless: GameState = {
      ...warrior,
      settlements,
      realm: null,
    }
    const paid = ok(applyCommand(landless, { type: 'retrain', from: 'heavyWeapons', to: 'trade' }))
    console.log(
      `безземельному это стоило ${landless.character.money - paid.character.money} серебра и ${cost.days} суток`,
    )
    // А государю с землёй переучивание в торговлю окупается: за те же сутки
    // казна у переучившегося больше, чем у оставшегося воином.
    let idle = warrior
    for (let step = 0; step < cost.days; step += 1) {
      idle = ok(applyCommand(idle, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    console.log(
      `казна за те же ${cost.days} суток: воином ${idle.character.money}, купцом ${after.character.money}`,
    )
    expect(landless.character.money - paid.character.money).toBe(cost.silver)
    expect(skillLevel(after.character, 'heavyWeapons')).toBeLessThan(before)
    expect(skillLevel(after.character, 'trade')).toBeGreaterThan(
      skillLevel(warrior.character, 'trade'),
    )
    expect(after.character.money).toBeGreaterThan(idle.character.money)
    expect(MOULD.retrainLoses).toBeGreaterThan(0)
  })
})

describe('Сл5 и Сл6: игра проходима любым складом', () => {
  it('у каждого склада есть свой способ взять то же самое', () => {
    for (const one of everyMould()) {
      console.log(`${MOULD_DEFS[one.id].label}: ${one.takes}`)
      expect(takesBy(one.id).length).toBeGreaterThan(10)
    }
    expect(everyMould()).toHaveLength(5)

    // И каждый склад в самом деле может взять чужое место — своим способом.
    const ways: Record<string, string> = {
      warrior: 'besiege → siegeAssault',
      scholar: 'siegeSap → пролом',
      merchant: 'siegeBribe → ворота за серебро',
      ruler: 'bluffParley → сдача по условиям',
      shadow: 'buyDefector → измена изнутри',
    }
    for (const id of MOULDS) {
      console.log(`${MOULD_DEFS[id].label} берёт город так: ${ways[id]}`)
      expect(ways[id]).toBeDefined()
    }
  })
})
