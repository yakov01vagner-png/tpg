import { describe, expect, it } from 'vitest'
import {
  type BattleSide,
  GROUP_IDS,
  type GroupId,
  type OrderId,
  startBattle,
  unitsSize,
} from '../src/battle'
import { captiveFrom, fateOutcome, ransomFor } from '../src/captive'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { GROUNDS, SAP_DAYS } from '../src/content/field'
import { engagedShare, spoilsGoods, veteranPower, woundedOf } from '../src/field'
import { garrisonSize } from '../src/holding'
import { partySize } from '../src/party'
import type { Party } from '../src/party'
import { lordRep } from '../src/reputation'
import { bribePrice, surrenderChance, wallsUnderSiege } from '../src/siege'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 58: бой с полем.
 *
 * Бой перестаёт быть двумя числами друг против друга: у него есть место, и
 * место решает, сколько людей вообще доходит до сшибки. Осада перестаёт быть
 * отсчётом суток. Победа приносит вещи и раненых, а не строку. И командование
 * перестаёт быть множителем: оно открывает приказы.
 */

const world = generateWorld(1)
const capital = world.kingdoms.reEstiz?.capitalId ?? ''

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const party = (units: Party['units'], morale = 75): Party => ({
  units,
  morale,
  hungryDays: 0,
  gear: 0,
})

const foe = (size: number): BattleSide => ({
  name: 'Чужая дружина',
  units: { militia: size },
  morale: 65,
  fatigue: 0,
})

const allOrders = (order: OrderId): Record<GroupId, OrderId> =>
  Object.fromEntries(GROUP_IDS.map((id) => [id, order])) as Record<GroupId, OrderId>

function at(locationId: string, own: Party, command = 60, money = 3000): GameState {
  const base = createGame(createCharacter({ name: 'Т', money }), 1, world)
  return {
    ...base,
    locationId,
    quarter: null,
    time: WORLD_START,
    party: own,
    character: {
      ...base.character,
      skills: {
        ...base.character.skills,
        command: { ...base.character.skills.command, level: command, xp: 0 },
      },
    },
  }
}

/** Довести бой до конца одним приказом. */
function fight(state: GameState, order: OrderId, limit = 30): GameState {
  let current = state
  for (let round = 0; round < limit; round += 1) {
    if (current.battle?.outcome !== 'ongoing') break
    const result = applyCommand(current, { type: 'battleOrders', orders: allOrders(order) })
    if (!result.ok) break
    current = result.state
  }
  return current
}

describe('Б1: поле боя', () => {
  it('в узком месте перевес в числе перестаёт быть перевесом', () => {
    // Двадцать человек у брода дерутся вдвадцатером; двести против них — тоже
    // двадцатью шестью. В этом вся разница между полем и бродом.
    expect(engagedShare(GROUNDS.open, 200)).toBe(1)
    expect(engagedShare(GROUNDS.ford, 200)).toBeCloseTo(0.13, 2)
    expect(engagedShare(GROUNDS.ford, 20)).toBe(1)

    const small = party({ spearman: 20 })
    const horde = foe(200)
    const inField = at(capital, small)
    const openFight = fight(
      { ...inField, battle: startBattle(small, horde, 'plains', { ground: 'open' }) },
      'hold',
    )
    const fordFight = fight(
      { ...inField, battle: startBattle(small, horde, 'plains', { ground: 'ford' }) },
      'hold',
    )
    const leftInField = unitsSize(openFight.battle?.enemy.units ?? {})
    const leftAtFord = unitsSize(fordFight.battle?.enemy.units ?? {})
    console.log(
      `двадцать против двухсот: в поле выбито ${200 - leftInField}, у брода ${200 - leftAtFord}; ` +
        `наши раунды ${openFight.battle?.round} и ${fordFight.battle?.round}`,
    )
    // У брода бой длится дольше и стоит врагу дороже за каждого своего.
    expect(fordFight.battle?.round ?? 0).toBeGreaterThan(openFight.battle?.round ?? 0)
  })

  it('обходить негде там, где негде', () => {
    expect(GROUNDS.ford.flanks).toBe(false)
    expect(GROUNDS.pass.flanks).toBe(false)
    expect(GROUNDS.open.flanks).toBe(true)
    const state = at(capital, party({ horseman: 12, spearman: 20 }))
    const atFord = fight(
      { ...state, battle: startBattle(state.party, foe(40), 'plains', { ground: 'ford' }) },
      'flank',
      2,
    )
    expect(atFord.battle?.log.some((line) => line.includes('обходить негде'))).toBe(true)
  })
})

describe('Б3: раненые и трофеи', () => {
  it('с поля снимают железо и подбирают своих — если поле твоё', () => {
    const goods = spoilsGoods({ manAtArms: 10, militia: 20 })
    console.log(`с десяти латников и двадцати ополченцев: ${JSON.stringify(goods)}`)
    expect((goods.weapons ?? 0) > 0).toBe(true)
    expect((goods.grain ?? 0) > 0).toBe(true)
    // Раненых подбирает тот, кто держит поле.
    expect(woundedOf({ spearman: 10 }, true).spearman).toBe(3)
    expect(woundedOf({ spearman: 10 }, false).spearman).toBeUndefined()

    const state = at(capital, party({ spearman: 40, archer: 10 }))
    const fighting: GameState = {
      ...state,
      battle: startBattle(state.party, foe(18), 'plains', { ground: 'open' }),
    }
    const done = fight(fighting, 'charge')
    expect(done.battle?.outcome).toBe('won')
    const before = partySize(done.party)
    const after = ok(applyCommand(done, { type: 'battleEnd', prisoners: 'release' }))
    console.log(
      `после победы: в строю было ${before}, стало ${partySize(after.party)}; ` +
        `оружия ${after.character.inventory.weapons ?? 0}, хлеба ${after.character.inventory.grain ?? 0}`,
    )
    // Раненые вернулись в строй, трофеи легли на спины.
    expect(partySize(after.party)).toBeGreaterThanOrEqual(before)
    expect(
      (after.character.inventory.weapons ?? 0) + (after.character.inventory.grain ?? 0),
    ).toBeGreaterThan(0)
  })
})

describe('Б4 и Б5: полководец и ветераны', () => {
  it('обманный отход — приказ не для всякого', () => {
    const green = at(capital, party({ spearman: 20 }), 5)
    const fighting: GameState = {
      ...green,
      battle: startBattle(green.party, foe(20), 'plains', { ground: 'open' }),
    }
    const refused = applyCommand(fighting, {
      type: 'battleOrders',
      orders: { ...allOrders('hold'), vanguard: 'feint' },
    })
    expect(refused.ok).toBe(false)
    if (!refused.ok) expect(refused.message).toContain('командование')
    // Тому, кто учился, тот же приказ дают без разговоров.
    const captain = at(capital, party({ spearman: 20 }), 60)
    const theirs: GameState = {
      ...captain,
      battle: startBattle(captain.party, foe(20), 'plains', { ground: 'open' }),
    }
    expect(
      applyCommand(theirs, {
        type: 'battleOrders',
        orders: { ...allOrders('hold'), vanguard: 'feint' },
      }).ok,
    ).toBe(true)
  })

  it('прошедший бой отряд бьёт крепче набранного заново', () => {
    expect(veteranPower(1)).toBeGreaterThan(veteranPower(0))
    const state = at(capital, party({ spearman: 30 }))
    const green = fight(
      {
        ...state,
        battle: startBattle(state.party, foe(30), 'plains', { ground: 'open', veterans: 0 }),
      },
      'hold',
    )
    const veterans = fight(
      {
        ...state,
        battle: startBattle(state.party, foe(30), 'plains', { ground: 'open', veterans: 30 }),
      },
      'hold',
    )
    console.log(
      `тридцать против тридцати: новобранцы — ${green.battle?.outcome}, ветераны — ${veterans.battle?.outcome}; ` +
        `у врага осталось ${unitsSize(green.battle?.enemy.units ?? {})} против ${unitsSize(veterans.battle?.enemy.units ?? {})}`,
    )
    expect(unitsSize(veterans.battle?.enemy.units ?? {})).toBeLessThanOrEqual(
      unitsSize(green.battle?.enemy.units ?? {}),
    )
    // И после боя те, кто уцелел, ветеранами уже записаны.
    const after = ok(applyCommand(green, { type: 'battleEnd', prisoners: 'release' }))
    expect(after.party.veterans).toBe(partySize(after.party))
  })
})

describe('Б2: осада как дело', () => {
  const target = Object.values(world.locations).find(
    (one) => one.archetype === 'town' && one.id !== capital,
  )

  it('подкоп роняет кладку, и пролом снимает помощь стен', () => {
    expect(wallsUnderSiege(3, { locationId: 'x', days: 0 })).toBe(3)
    expect(wallsUnderSiege(3, { locationId: 'x', days: 0, breached: true })).toBeLessThan(3)
    if (!target) return
    const state = at(target.id, party({ spearman: 30, militia: 20 }))
    const here = state.settlements[target.id]
    expect(here).toBeDefined()
    if (!here) return
    const hostile: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [target.id]: { ...here, owner: 'crown:boharut' },
      },
      politics: {
        ...state.politics,
        wars: [{ a: 'reEstiz', b: 'boharut', since: 1, reason: 'старые счёты' }],
      },
      service: 'reEstiz',
    }
    let current = ok(applyCommand(hostile, { type: 'besiege' }))
    expect(current.siege?.locationId).toBe(target.id)
    let dug = 0
    for (let i = 0; i < 4 && !current.siege?.breached; i += 1) {
      const result = applyCommand(current, { type: 'siegeSap', days: 3 })
      if (!result.ok) break
      current = result.state
      dug += 1
      // Вылазка гарнизона прерывает работы: её надо доиграть.
      if (current.battle)
        current = ok(
          applyCommand(fight(current, 'hold'), { type: 'battleEnd', prisoners: 'release' }),
        )
    }
    console.log(`подкоп: за ${dug} заходов по 3 сут. пролом — ${current.siege?.breached}`)
    expect(SAP_DAYS).toBeGreaterThan(1)
    expect(current.siege?.breached).toBe(true)
    // Проломив стену, копать больше нечего.
    expect(applyCommand(current, { type: 'siegeSap', days: 3 }).ok).toBe(false)
  })

  it('голодный гарнизон слушает о сдаче, сытый — нет', () => {
    if (!target) return
    const settlement = world.locations[target.id]
    expect(settlement).toBeDefined()
    const base = at(target.id, party({ spearman: 30 })).settlements[target.id]
    expect(base).toBeDefined()
    if (!base) return
    const fed = { ...base, stock: { ...base.stock, grain: base.population * 400 } }
    const starving = { ...base, stock: { ...base.stock, grain: 0, fish: 0 } }
    const siege = { locationId: target.id, days: 30 }
    console.log(
      `сдача: сытый гарнизон ${Math.round(surrenderChance(fed, siege) * 100)} из ста, ` +
        `голодный ${Math.round(surrenderChance(starving, siege) * 100)}`,
    )
    expect(surrenderChance(starving, siege)).toBeGreaterThan(surrenderChance(fed, siege))
    expect(surrenderChance(fed, siege)).toBeLessThan(0.3)
    // Пролом — тоже довод.
    expect(surrenderChance(starving, { ...siege, breached: true })).toBeGreaterThan(
      surrenderChance(starving, siege),
    )
    // Ворота стоят тем дороже, чем больше тех, кому есть что терять.
    const state = at(target.id, party({ spearman: 30 }))
    const big = { ...base, garrison: { spearman: 40 } }
    expect(bribePrice(state, big)).toBeGreaterThan(bribePrice(state, base))
    expect(garrisonSize(big)).toBe(40)
  })
})

describe('Б6: пленный лорд', () => {
  it('за лорда платят, ему навязывают присягу и его вешают — и всё это помнят', () => {
    const state = at(capital, party({ manAtArms: 10 }))
    const lord = state.politics.lords[0]
    expect(lord).toBeDefined()
    if (!lord) return
    const captive = captiveFrom(state, lord.id, 10)
    expect(captive?.name).toBe(lord.name)
    expect(captive?.ransom).toBe(ransomFor(lord.strength))
    // Разбойники лордов не рождают.
    expect(captiveFrom(state, 'bandits', 10)).toBeNull()
    if (!captive) return

    const held: GameState = { ...state, captives: [captive] }
    const ransomed = ok(
      applyCommand(held, { type: 'captiveFate', captiveId: captive.id, fate: 'ransom' }),
    )
    expect(ransomed.character.money).toBe(state.character.money + captive.ransom)
    expect(ransomed.captives).toHaveLength(0)

    const spared = ok(
      applyCommand(held, { type: 'captiveFate', captiveId: captive.id, fate: 'release' }),
    )
    expect(lordRep(spared.reputation, captive.id)).toBeGreaterThan(0)

    const hanged = ok(
      applyCommand(held, { type: 'captiveFate', captiveId: captive.id, fate: 'execute' }),
    )
    console.log(
      `${captive.name}: выкуп ${captive.ransom}, милость за милость ${lordRep(spared.reputation, captive.id)}, ` +
        `за верёвку родня ${lordRep(hanged.reputation, state.politics.lords.find((one) => one.kingdomId === captive.kingdomId && one.id !== captive.id)?.id ?? '')}`,
    )
    expect(hanged.renown).toBeGreaterThan(state.renown)
    // Родня по короне такое помнит: милость к ним падает.
    const kin = state.politics.lords.find(
      (one) => one.kingdomId === captive.kingdomId && one.id !== captive.id,
    )
    if (kin) expect(lordRep(hanged.reputation, kin.id)).toBeLessThan(0)
    // Гордый нрав присягу помнит как обиду, покладистый — как долг.
    const outcome = fateOutcome(state, captive, 'oath')
    expect(Math.abs(outcome.ownFavour)).toBeGreaterThan(10)
  })
})
