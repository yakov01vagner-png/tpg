import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { createSettlements } from '../src/economy'
import { PLAYER } from '../src/holding'
import { createRng } from '../src/rng'
import {
  courtScreen,
  houseScreen,
  powerScreens,
  realmScreen,
  talksScreen,
  warScreen,
} from '../src/screens'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, WORLD_START } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 97: интерфейс власти.
 *
 * Вещей у державы стало больше, чем помещается в голове. Экран здесь — не
 * разметка, а модель: строки с числами, пояснения словами и действия, которые
 * делаются прямо отсюда. Правило одно: экран кончается действием (У6).
 */

const world = generateWorld(1)
const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const day = 400

/** Государь со всем, что 0.7 успела добавить: земля, война, род, знать. */
function sovereign(): GameState {
  const game = createGame(createCharacter({ name: 'Ратша', money: 40000 }), 1, world)
  const places = Object.values(settlements)
    .filter((one) => one.population > 800)
    .slice(0, 10)
  const map = { ...settlements }
  const lords = [...politics.lords]
  for (const [index, one] of places.entries()) {
    if (index < 3) {
      const lord = lords[index]
      if (!lord) continue
      lords[index] = { ...lord, kingdomId: PLAYER, loyalty: 55 }
      map[one.locationId] = { ...one, owner: lord.id }
    } else {
      map[one.locationId] = { ...one, owner: PLAYER }
    }
  }
  return {
    ...game,
    politics: {
      ...politics,
      lords,
      wars: [{ a: PLAYER, b: 'robl', since: 100, reason: 'спорная марка' }],
    },
    settlements: map,
    time: WORLD_START + (day - 1) * 24 * 60,
    locationId: places[3]?.locationId ?? game.locationId,
    quarter: null,
    realm: { name: 'Заречье', sinceDay: 1 },
    character: {
      ...game.character,
      family: {
        ...game.character.family,
        house: 'Заречные',
        children: [
          { name: 'Ждан', bornDay: day - 20 * DAYS_PER_YEAR, heir: true },
          { name: 'Любим', bornDay: day - 12 * DAYS_PER_YEAR, heir: false },
        ],
      },
    },
  }
}

describe('У1–У5: пять экранов власти', () => {
  it('каждый экран отвечает на свой вопрос числами и словами', () => {
    const state = sovereign()
    for (const screen of powerScreens(state, world)) {
      console.log(`— ${screen.title}: ${screen.says}`)
      for (const line of screen.lines) {
        console.log(`   ${line.label}: ${line.value}${line.hint ? ` — ${line.hint}` : ''}`)
      }
      expect(screen.lines.length).toBeGreaterThan(2)
      for (const line of screen.lines) expect(line.value.length).toBeGreaterThan(0)
    }
    // С этапов 127 и 128 к пяти экранам власти прибавились рост и вести.
    // Экранов прибавлялось с версиями: пять в 0.7, шестой и седьмой в 0.8
    // (рост и вести), восьмой в 0.9 — путь (этап 158).
    expect(powerScreens(state, world)).toHaveLength(8)
  })
})

describe('У6: решение, а не таблица', () => {
  it('на каждом экране есть что сделать, и объяснено почему', () => {
    const state = sovereign()
    let deeds = 0
    for (const screen of powerScreens(state, world)) {
      for (const deed of screen.deeds) {
        deeds += 1
        console.log(`${screen.title} → ${deed.label}${deed.can ? '' : ' (нельзя)'}: ${deed.why}`)
        expect(deed.why.length).toBeGreaterThan(10)
      }
    }
    console.log(`всего действий с пяти экранов: ${deeds}`)
    expect(deeds).toBeGreaterThan(4)
    // Экран державы и экран рода всегда дают что-то сделать.
    expect(realmScreen(state, world).deeds.length).toBeGreaterThan(0)
    expect(houseScreen(state, world).deeds.length).toBeGreaterThan(0)
  })

  it('действие с экрана и правда исполняется', () => {
    const state = sovereign()
    const house = houseScreen(state, world)
    const deed = house.deeds.find((one) => one.can)
    if (!deed) return
    const after = ok(applyCommand(state, deed.command))
    console.log(
      `${deed.label}: ${houseScreen(state, world).lines[0]?.value} → ${houseScreen(after, world).lines[0]?.value}`,
    )
    expect(houseScreen(after, world).lines[0]?.value).not.toBe(house.lines[0]?.value)
  })

  it('экран войны показывает кампанию, фронты и снабжение', () => {
    const state = sovereign()
    const war = warScreen(state, world)
    console.log(war.lines.map((one) => `${one.label}: ${one.value}`).join('; '))
    const aim = war.deeds.find((one) => one.command.type === 'setCampaign')
    expect(aim).toBeTruthy()
    if (!aim) return
    const after = ok(applyCommand(state, aim.command))
    console.log(`после «${aim.label}»: ${warScreen(after, world).says}`)
    expect(warScreen(after, world).lines[0]?.value).not.toBe('нет')
  })

  it('экран двора и экран дипломатии читаются без состояния в голове', () => {
    const state = sovereign()
    const court = courtScreen(state, world)
    const talks = talksScreen(state, world)
    console.log(`двор: ${court.says}`)
    console.log(`дипломатия: ${talks.says}`)
    expect(court.lines.some((one) => one.label === 'Вассалы')).toBe(true)
    expect(talks.lines.some((one) => one.label === 'Войны')).toBe(true)
  })
})
