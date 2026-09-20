import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { LINEAGE, LOSSES, LOSS_DEFS } from '../src/content/lineage'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { heirGets, houseWay, kinSupport, lossWeight, lossesOf, raisedShare } from '../src/lineage'
import { aimedAtPlayer } from '../src/mind'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { MINUTES_PER_DAY, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 132: путь дома.
 *
 * Дом считается не тем, что он приобрёл, а тем, чего не потерял: три колена, ни
 * одной потери, два родства. Потому и платится этот путь осторожностью.
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
const kingdoms = Object.keys(world.kingdoms)
const day = 400

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function ruler(places: number, extra: Partial<GameState> = {}): GameState {
  const mine = Object.values(settlements)
    .filter((one) => one.population > 600)
    .slice(0, places)
  const map = { ...settlements }
  for (const one of mine) map[one.locationId] = { ...one, owner: PLAYER }
  return {
    ...createGame(createCharacter({ name: 'Ратша', money: 30000 }), 1, world),
    politics,
    settlements: map,
    locationId: mine[0]?.locationId ?? '',
    quarter: null,
    time: WORLD_START + (day - 1) * 24 * 60,
    realm: { name: 'Заречье', sinceDay: 1 },
    ...extra,
  }
}

describe('Дм1 и Дм2: три колена и то, что считается потерей', () => {
  it('путь дома меряется тем, чего не потеряно', () => {
    const young = ruler(6)
    console.log(houseWay(young, world, day).says)
    expect(houseWay(young, world, day).finished).toBe(false)

    for (const id of LOSSES) {
      console.log(
        `${LOSS_DEFS[id].label}: ${LOSS_DEFS[id].about} Вес ${LOSS_DEFS[id].weight}, ${LOSS_DEFS[id].back ? 'вернуть можно' : 'вернуть нельзя'}`,
      )
    }
  })

  it('потеря считается против лучшего дня, а не против нуля', () => {
    const fallen = ruler(4, {
      houseBest: { places: 9, titleTier: 2, shames: 0, day: day - 200 },
      treaties: [
        {
          id: 't1',
          kind: 'alliance',
          a: PLAYER,
          b: kingdoms[1] as string,
          sinceDay: day - 100,
          untilDay: day + 900,
          brokenBy: PLAYER,
        },
      ],
    })
    const losses = lossesOf(fallen, world, day)
    for (const one of losses) console.log(one.says)
    console.log(`тяжесть потерь: ${lossWeight(losses)}`)
    expect(losses.some((one) => one.loss === 'land')).toBe(true)
    expect(losses.some((one) => one.loss === 'word')).toBe(true)
    expect(lossWeight(losses)).toBeGreaterThan(0)

    // У того, кто ничего не терял, потерь нет.
    const clean = ruler(6, { houseBest: { places: 6, titleTier: 0, shames: 0, day: day - 10 } })
    console.log(`целый дом: потерь ${lossesOf(clean, world, day).length}`)
    expect(lossesOf(clean, world, day)).toHaveLength(0)
  })

  it('лучший день запоминается сам', () => {
    const state = ruler(7)
    let later = state
    for (let step = 0; step < LINEAGE.beat + 2; step += 1) {
      later = ok(applyCommand(later, { type: 'tick', minutes: MINUTES_PER_DAY }))
    }
    console.log(
      `лучшее: было ${state.houseBest?.places ?? 0} мест, стало ${later.houseBest?.places ?? 0}`,
    )
    expect(later.houseBest?.places ?? 0).toBeGreaterThan(state.houseBest?.places ?? 0)
  })
})

describe('Дм3: наследник как решение', () => {
  it('воспитание стоит часов государя и прибавляет к трети', () => {
    const noHeir = ruler(6)
    expect(applyCommand(noHeir, { type: 'raiseHeir' }).ok).toBe(false)

    const withHeir = ruler(6, {
      character: {
        ...createCharacter({ name: 'Ратша', money: 30000 }),
        family: {
          spouse: { name: 'Милава', house: 'Заречье', sinceDay: day - 3000 },
          children: [{ name: 'Всеслав', bornDay: day - 6000, heir: true }],
        } as never,
      },
    })
    console.log(heirGets(withHeir).says)
    const raised = ok(applyCommand(withHeir, { type: 'raiseHeir' }))
    console.log(raised.log.find((one) => one.text.includes('Всеслав'))?.text)
    console.log(
      `вложено: ${raisedShare(withHeir)} → ${raisedShare(raised)}; часов ушло ${LINEAGE.raiseHours}`,
    )
    expect(raisedShare(raised)).toBeGreaterThan(raisedShare(withHeir))
    expect(heirGets(raised).share).toBeGreaterThan(heirGets(withHeir).share)

    // Выше предела не поднимешь: сын не станет отцом.
    const full = ruler(6, { ...withHeir, raised: LINEAGE.raiseMax })
    expect(applyCommand({ ...full, character: withHeir.character }, { type: 'raiseHeir' }).ok).toBe(
      false,
    )
  })
})

describe('Дм4: родство как опора', () => {
  it('родня признаёт и не воюет', () => {
    const alone = ruler(8)
    console.log(kinSupport(alone, world, day).says)
    // Породниться надо именно с тем, кто на тебя целится.
    const aiming = aimedAtPlayer(alone, world, day)
    console.log(
      `на тебя целятся: ${aiming.map((one) => world.kingdoms[one.kingdomId]?.name).join(', ') || 'никто'}`,
    )
    const married = ruler(8, {
      marriages: aiming.slice(0, 2).map((one) => ({
        kingdomId: one.kingdomId,
        who: 'self' as const,
        name: 'Милава',
        sinceDay: day - 100,
        dowry: 0,
      })),
    })
    console.log(kinSupport(married, world, day).says)
    expect(kinSupport(married, world, day).kin.length).toBeGreaterThan(0)

    const aimedKin = aimedAtPlayer(married, world, day)
    console.log(`после родства целятся: ${aimedKin.length} вместо ${aiming.length}`)
    expect(aimedKin.length).toBeLessThan(aiming.length)
  })
})

describe('Дм5 и Дм6: конец пути и числа', () => {
  it('дом, который стоит: три колена, ни одной потери, два родства', () => {
    const standing = ruler(8, {
      houseBest: { places: 8, titleTier: 0, shames: 0, day: day - 10 },
      house: [
        {
          name: 'Ратша',
          byname: 'Старый',
          fromDay: 1,
          toDay: 8000,
          battles: 4,
          holdings: 5,
          said: 'начал',
        },
        {
          name: 'Всеслав',
          byname: null,
          fromDay: 8000,
          toDay: 16000,
          battles: 2,
          holdings: 7,
          said: 'держал',
        },
        {
          name: 'Ратша',
          byname: 'Второй',
          fromDay: 16000,
          toDay: 24000,
          battles: 1,
          holdings: 8,
          said: 'кончил',
        },
      ],
      marriages: [
        { kingdomId: kingdoms[1] as string, who: 'self', name: 'М', sinceDay: 100, dowry: 0 },
        { kingdomId: kingdoms[2] as string, who: 'child', name: 'О', sinceDay: 200, dowry: 0 },
      ],
    })
    const way = houseWay(standing, world, day)
    console.log(way.says)
    console.log(`колен ${way.generations}, родства ${way.kin}, потерь ${way.losses.length}`)
    expect(way.finished).toBe(true)

    // Одна потеря — и путь не пройден.
    const broken = houseWay(
      { ...standing, houseBest: { places: 12, titleTier: 0, shames: 0, day: day - 10 } },
      world,
      day,
    )
    console.log(`с потерей земли: ${broken.says}`)
    expect(broken.finished).toBe(false)
  })
})
