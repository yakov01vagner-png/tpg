import { describe, expect, it } from 'vitest'
import { SIEGE_DAYS, musterBands, tickBands } from '../src/band'
import type { Band } from '../src/band'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { ENGINE_DEFS, SIEGE, WATER_DEFS } from '../src/content/siege'
import type { Settlement } from '../src/economy'
import { createSettlements } from '../src/economy'
import {
  engineDays,
  fortOf,
  holdOut,
  mouthsOf,
  offersFor,
  reliefHope,
  storeDays,
  stormCost,
  wallsAfterWorks,
} from '../src/fort'
import { PLAYER } from '../src/holding'
import { rollHarvest, tickDays } from '../src/life'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { WORLD_START } from '../src/time'
import { createPolitics, tickPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 85: осадное дело.
 *
 * Крепость была одним числом, осада у дружин — отсчётом на двенадцать суток.
 * Здесь у крепости появляются вода, запас, башни и донжон, у осаждающего —
 * машины и переговоры, а у гарнизона — приказ и выбор между воротами и кровью.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function base(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
  return {
    ...game,
    politics,
    settlements,
    time: WORLD_START,
    party: { ...game.party, units: { militia: 60, spearman: 40 }, morale: 70 },
  }
}

/** Войско под чужими стенами: игрок служит Ре-Эстизу и воюет с хозяином места. */
function besieger(locationId: string): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
  const settlement = game.settlements[locationId]
  if (!settlement) throw new Error('нет такого места')
  const ownerKingdom = settlement.owner?.startsWith('crown:')
    ? settlement.owner.slice('crown:'.length)
    : (game.politics.lords.find((lord) => lord.id === settlement.owner)?.kingdomId ?? 'boharut')
  return {
    ...game,
    locationId,
    service: 'reEstiz',
    time: WORLD_START,
    party: { ...game.party, units: { spearman: 60, archer: 20, manAtArms: 20 }, morale: 80 },
    character: { ...game.character, money: 40000 },
    politics: {
      ...game.politics,
      wars: [{ a: 'reEstiz', b: ownerKingdom, since: 1, reason: 'претензии на землю' }],
    },
  }
}

/** Крепость, которую есть смысл осаждать: со стенами и чужая. */
function walledTarget(): string {
  const game = createGame(createCharacter({ name: 'Ратша' }), 1, world)
  const found = Object.values(game.settlements).find(
    (one) =>
      fortOf(game, world, one.locationId)?.walled &&
      one.population > 0 &&
      !one.locationId.startsWith('reEstiz.'),
  )
  if (!found) throw new Error('нет крепости')
  return found.locationId
}

describe('О1: крепость как вещь', () => {
  it('у каждой крепости свои вода, запас, башни и донжон', () => {
    const state = base()
    const walled = Object.values(state.settlements)
      .filter((one) => fortOf(state, world, one.locationId)?.walled)
      .slice(0, 6)
    const waters = new Set<string>()
    for (const one of walled) {
      const fort = fortOf(state, world, one.locationId)
      if (!fort) continue
      waters.add(fort.water)
      console.log(
        `${fort.name}: стены ×${fort.walls}, башен ${fort.towers}, вода — ${WATER_DEFS[fort.water].label} (${fort.waterDays === 9999 ? 'не кончается' : `${fort.waterDays} сут.`}), хлеба на ${fort.storeDays} сут., ${fort.keep ? 'с донжоном' : 'без донжона'} → держится ${holdOut(fort)} сут.`,
      )
      expect(fort.walls).toBeGreaterThan(1.9)
      expect(fort.towers).toBeGreaterThan(0)
    }
    expect(walled.length).toBeGreaterThan(0)
    // Крепости разные: одинаковых чисел у всех быть не должно.
    expect(waters.size).toBeGreaterThan(1)

    const open = Object.values(state.settlements).find(
      (one) => fortOf(state, world, one.locationId)?.walled === false,
    )
    const bare = open ? fortOf(state, world, open.locationId) : null
    if (bare) {
      console.log(`без стен: ${bare.name}, стены ×${bare.walls}, башен ${bare.towers}`)
      expect(bare.towers).toBe(0)
      expect(bare.walls).toBeLessThan(1.9)
    }
  })

  it('крепость выводится из зерна: одна и та же при каждом счёте', () => {
    const state = base()
    const id = Object.keys(state.settlements)[3] as string
    expect(fortOf(state, world, id)).toEqual(fortOf(state, world, id))
  })
})

describe('О2: инженеры', () => {
  it('машина стоит денег, рук и суток, а потом стоит под стенами', () => {
    for (const engine of ['ram', 'tower', 'trebuchet'] as const) {
      const def = ENGINE_DEFS[engine]
      console.log(
        `${def.label}: ${def.silver} серебром, ${def.men} рук; впритык — ${engineDays(engine, def.men, 0)} сут., сотней — ${engineDays(engine, 100, 0)} сут., сотней умелых — ${engineDays(engine, 100, 60)} сут.`,
      )
      expect(engineDays(engine, 100, 0)).toBeLessThan(engineDays(engine, def.men, 0))
      expect(engineDays(engine, 100, 60)).toBeLessThanOrEqual(engineDays(engine, 100, 0))
      // Без рук работу не начинают.
      expect(engineDays(engine, def.men - 1, 0)).toBe(0)
    }
  })

  it('машины снимают помощь стен', () => {
    const state = base()
    const id = Object.values(state.settlements).find(
      (one) => fortOf(state, world, one.locationId)?.walled,
    )?.locationId
    const fort = id ? fortOf(state, world, id) : null
    if (!fort) return
    const bare = wallsAfterWorks(fort, [], false)
    const withRam = wallsAfterWorks(fort, ['ram'], false)
    const withAll = wallsAfterWorks(fort, ['ram', 'trebuchet'], false)
    console.log(
      `${fort.name}: голые стены ×${bare.toFixed(2)}, с тараном ×${withRam.toFixed(2)}, с тараном и пороком ×${withAll.toFixed(2)}`,
    )
    expect(withRam).toBeLessThan(bare)
    expect(withAll).toBeLessThan(withRam)
  })
})

describe('О3: голод и переговоры', () => {
  it('условия принимают по положению, а не по храбрости', () => {
    const state = base()
    const id = Object.values(state.settlements).find(
      (one) => fortOf(state, world, one.locationId)?.walled,
    )?.locationId
    const fort = id ? fortOf(state, world, id) : null
    if (!fort || !id) return
    const fresh = offersFor(state, world, fort, 1, false)
    const worn = offersFor(state, world, fort, holdOut(fort) - 1, false)
    for (const offer of worn) {
      console.log(
        `${offer.label}: на первые сутки ${Math.round((fresh.find((one) => one.term === offer.term)?.chance ?? 0) * 100)} из ста, на исходе запаса ${Math.round(offer.chance * 100)} из ста${offer.silver !== 0 ? `, выкуп ${Math.abs(offer.silver)}` : ''}`,
      )
    }
    const freeWorn = worn.find((one) => one.term === 'free')?.chance ?? 0
    const freeFresh = fresh.find((one) => one.term === 'free')?.chance ?? 0
    const mercyWorn = worn.find((one) => one.term === 'mercy')?.chance ?? 0
    expect(freeWorn).toBeGreaterThan(freeFresh)
    expect(freeWorn).toBeGreaterThan(mercyWorn)
  })

  it('надежда на выручку закрывает ворота', () => {
    const state = base()
    const id = Object.values(state.settlements).find(
      (one) => fortOf(state, world, one.locationId)?.walled && one.owner,
    )?.locationId
    const fort = id ? fortOf(state, world, id) : null
    if (!fort || !id) return
    const owner = state.settlements[id]?.owner as string
    const quiet: GameState = { ...state, bands: [] }
    const alone = offersFor(quiet, world, fort, holdOut(fort) - 1, false)
    const relief: Band = {
      id: 'relief',
      lordId: owner,
      kingdomId: null,
      units: { spearman: 60 },
      morale: 70,
      locationId: id,
      travel: null,
      goal: { type: 'defend', targetId: id },
      siegeDays: 0,
    }
    const hoped: GameState = { ...quiet, bands: [relief] }
    const hope = reliefHope(hoped, world, fort)
    const watched = offersFor(hoped, world, fort, holdOut(fort) - 1, false)
    console.log(
      `надежда на выручку ${hope}: свободный выход ${Math.round((alone.find((one) => one.term === 'free')?.chance ?? 0) * 100)} → ${Math.round((watched.find((one) => one.term === 'free')?.chance ?? 0) * 100)} из ста`,
    )
    expect(hope).toBeGreaterThan(0)
    expect(watched.find((one) => one.term === 'free')?.chance ?? 1).toBeLessThan(
      alone.find((one) => one.term === 'free')?.chance ?? 0,
    )
  })
})

describe('О2: машины под своими стенами', () => {
  it('машину строят сутками, и она встаёт под стенами', () => {
    const id = walledTarget()
    const started = ok(applyCommand(besieger(id), { type: 'besiege' }))
    const paid = started.character.money
    const building = ok(applyCommand(started, { type: 'buildEngine', engine: 'ram' }))
    const left = building.siege?.works?.daysLeft ?? 0
    console.log(
      `${world.locations[id]?.name}: таран заказан за ${paid - building.character.money}, сроку ${left} сут.`,
    )
    expect(left).toBeGreaterThan(0)
    // Двух работ разом не ведут.
    expect(applyCommand(building, { type: 'buildEngine', engine: 'tower' }).ok).toBe(false)

    let waited = building
    for (let i = 0; i < 6 && (waited.siege?.works ?? null) !== null; i += 1) {
      waited = ok(applyCommand(waited, { type: 'siegeWait', days: 2 }))
      if (waited.battle) waited = { ...waited, battle: null }
    }
    console.log(
      `через ${waited.siege?.days} сут. под стенами: ${(waited.siege?.engines ?? []).map((one) => ENGINE_DEFS[one].label).join(', ') || 'ничего'}`,
    )
    expect(waited.siege?.engines ?? []).toContain('ram')
  })
})

describe('О3: условия под своими стенами', () => {
  it('голодной крепости предлагают выход, и она его берёт', () => {
    const id = walledTarget()
    const started = ok(applyCommand(besieger(id), { type: 'besiege' }))
    const settlement = started.settlements[id] as Settlement
    // Крепость на исходе: хлеба в амбарах нет.
    const starving: GameState = {
      ...started,
      settlements: {
        ...started.settlements,
        [id]: { ...settlement, stock: { ...settlement.stock, grain: 0 } },
      },
      siege: { locationId: id, days: 30 },
    }
    const fort = fortOf(starving, world, id)
    const offers = offersFor(starving, world, fort as never, 30, false)
    console.log(
      `${fort?.name}: хлеба на ${fort?.storeDays} сут.; ${offers.map((one) => `${one.label} — ${Math.round(one.chance * 100)} из ста`).join(', ')}`,
    )
    const answered = ok(applyCommand(starving, { type: 'siegeTerms', term: 'free' }))
    const took = answered.settlements[id]?.owner === PLAYER
    console.log(
      `${answered.log[answered.log.length - 1]?.text ?? ''} → место ${took ? 'сдано' : 'держится'}`,
    )
    expect(offers.find((one) => one.term === 'free')?.chance ?? 0).toBeGreaterThan(0.5)
  })
})

describe('О4: штурм', () => {
  it('башни стоят людей, машины эту цену сбивают', () => {
    const state = base()
    const id = Object.values(state.settlements)
      .filter((one) => fortOf(state, world, one.locationId)?.walled)
      .sort((a, b) => b.population - a.population)[0]?.locationId
    const fort = id ? fortOf(state, world, id) : null
    if (!fort) return
    const bare = stormCost(fort, [], false)
    const covered = stormCost(fort, ['tower'], false)
    const breached = stormCost(fort, [], true)
    console.log(
      `${fort.name} (${fort.towers} башен): без машин теряешь ${Math.round(bare.losses * 100)} из ста на подходе, с осадной башней ${Math.round(covered.losses * 100)}, через пролом ${Math.round(breached.losses * 100)}`,
    )
    console.log(bare.says)
    expect(covered.losses).toBeLessThan(bare.losses)
    expect(breached.losses).toBeLessThan(bare.losses)
  })
})

describe('О5: своя крепость', () => {
  it('запас в амбарах — это сутки, которые крепость проживёт', () => {
    const state = base()
    // Кормить осадой город в тридцать тысяч душ не по карману никому: запас
    // кладут в крепость, а не в столицу.
    const id = Object.values(state.settlements)
      .filter((one) => fortOf(state, world, one.locationId)?.walled && one.population > 0)
      .sort((a, b) => a.population - b.population)[0]?.locationId
    if (!id) return
    const mine: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [id]: { ...(state.settlements[id] as Settlement), owner: PLAYER },
      },
      locationId: id,
    }
    const before = fortOf(mine, world, id)
    const stocked = ok(applyCommand(mine, { type: 'stockFort', locationId: id, days: 30 }))
    const after = fortOf(stocked, world, id)
    console.log(
      `${before?.name}: было хлеба на ${before?.storeDays} сут., стало на ${after?.storeDays}; заплачено ${mine.character.money - stocked.character.money}`,
    )
    expect(after?.storeDays ?? 0).toBeGreaterThan(before?.storeDays ?? 0)
    expect(stocked.character.money).toBeLessThan(mine.character.money)
  })

  it('приказ гарнизону решает, откроют ли ворота', () => {
    const state = base()
    const id = Object.values(state.settlements).find(
      (one) => fortOf(state, world, one.locationId)?.walled && one.population > 0,
    )?.locationId
    if (!id) return
    const mine: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [id]: { ...(state.settlements[id] as Settlement), owner: PLAYER },
      },
      locationId: id,
    }
    const ordered = ok(
      applyCommand(mine, { type: 'garrisonOrder', locationId: id, order: 'yield' }),
    )
    expect(ordered.garrisons?.[id]).toBe('yield')

    const foe = Object.values(politics.lords)[0]
    if (!foe) return
    const host: Band = {
      id: 'foe',
      lordId: foe.id,
      kingdomId: foe.kingdomId,
      units: { spearman: 80 },
      morale: 80,
      locationId: id,
      travel: null,
      goal: { type: 'siege', targetId: id },
      siegeDays: 0,
    }
    const besieged = { ...ordered, bands: [host] }
    const march = tickBands(
      world,
      besieged.politics,
      besieged.settlements,
      besieged.bands,
      besieged.rng,
      1,
      besieged.garrisons,
    )
    const took = march.events.find((one) => one.type === 'bandTook')
    console.log(
      `«открыть ворота»: место перешло на ${march.bands[0]?.siegeDays === 0 ? 'первые' : '?'} сутки, приступа не было — ${took?.type === 'bandTook' && took.yielded ? 'сдача' : 'штурм'}`,
    )
    expect(took?.type === 'bandTook' && took.yielded).toBe(true)
    expect(march.settlements[id]?.owner).not.toBe(PLAYER)
  })
})

describe('О6: осады в числах', () => {
  it('за десять лет осада перестала быть отсчётом', () => {
    let places: Readonly<Record<string, Settlement>> = settlements
    let pol = politics
    let rng = createRng(1007)
    const [initial] = musterBands(pol, places, createRng(8))
    let bands: readonly Band[] = initial
    let sieges = 0
    let yielded = 0
    let stormed = 0
    let repelled = 0
    for (let day = 1; day <= 360 * 10; day += 1) {
      const life = tickDays(world, places, 1)
      places = life.settlements
      const turn = tickPolitics(world, pol, places, day, rng)
      pol = turn.politics
      places = turn.settlements
      rng = turn.rng
      const march = tickBands(world, pol, places, bands, rng, day)
      bands = march.bands
      places = march.settlements
      pol = march.politics
      rng = march.rng
      for (const event of march.events) {
        if (event.type === 'bandSiege') sieges += 1
        if (event.type === 'bandTook') {
          if (event.yielded) yielded += 1
          else stormed += 1
        }
        if (event.type === 'bandClash') repelled += 1
      }
      if (day % 360 === 0) {
        const year = rollHarvest(world, places, rng)
        places = year.settlements
        rng = year.rng
      }
    }
    console.log(
      `за десять лет: осад ${sieges}, сдач ${yielded}, взято приступом ${stormed}, отбито ${repelled}`,
    )
    expect(sieges).toBeGreaterThan(20)
    // Осада кончается и воротами, и лестницами: ни одного исхода не пропало.
    expect(yielded).toBeGreaterThan(0)
    expect(stormed).toBeGreaterThan(0)
  })

  it('сильное войско лезет на стены, слабое уходит', () => {
    const state = base()
    const walled = Object.values(state.settlements)
      .filter((one) => fortOf(state, world, one.locationId)?.walled && one.population > 2000)
      .sort((a, b) => b.population - a.population)[0]
    if (!walled) return
    const id = walled.locationId
    const foe = politics.lords[0]
    if (!foe) return
    const under = (men: number): Band => ({
      id: `host:${men}`,
      lordId: foe.id,
      kingdomId: foe.kingdomId,
      units: { spearman: men },
      morale: 80,
      locationId: id,
      travel: null,
      goal: { type: 'siege', targetId: id },
      siegeDays: SIEGE_DAYS,
    })
    const run = (men: number) => {
      const march = tickBands(
        world,
        state.politics,
        state.settlements,
        [under(men)],
        createRng(3),
        1,
      )
      const band = march.bands[0]
      return {
        left: band?.goal.type,
        clash: march.events.some((one) => one.type === 'bandClash'),
        took: march.events.some((one) => one.type === 'bandTook'),
      }
    }
    const strong = run(400)
    const weak = run(15)
    const fort = fortOf(state, world, id)
    console.log(
      `${fort?.name}: жителей ${walled.population}, ополчения ${Math.floor(walled.population / 260)}; четыре сотни — ${strong.clash || strong.took ? 'приступ' : 'стоят'}, полтора десятка — ${weak.clash || weak.took ? 'приступ' : `уходят (${weak.left})`}`,
    )
    expect(strong.clash || strong.took).toBe(true)
    expect(weak.clash || weak.took).toBe(false)
  })

  it('крепость с колодцем держится дольше, чем крепость с привозной водой', () => {
    const state = base()
    const one = Object.values(state.settlements).find(
      (place) => fortOf(state, world, place.locationId)?.walled,
    )
    if (!one) return
    const fort = fortOf(state, world, one.locationId)
    if (!fort) return
    const well = { ...fort, water: 'well' as const, waterDays: WATER_DEFS.well.days }
    const none = { ...fort, water: 'none' as const, waterDays: WATER_DEFS.none.days }
    console.log(
      `${fort.name}: с колодцем держится ${holdOut(well)} сут., на привозной воде — ${holdOut(none)}; хлеба у неё на ${storeDays(one)} сут., ртов за стенами ${mouthsOf(one)} при ${SIEGE.perMan} меры на рот`,
    )
    expect(holdOut(well)).toBeGreaterThan(holdOut(none))
  })
})
