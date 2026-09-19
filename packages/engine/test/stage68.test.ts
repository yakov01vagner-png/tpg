import { describe, expect, it } from 'vitest'
import { receptionFor } from '../src/castle'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { RITES } from '../src/content/faith'
import { BYNAMES, CIRCLES, SHAMES, SHAME_COVER, SINGER_PRICE } from '../src/content/fame'
import { createSettlements } from '../src/economy'
import {
  bynameOf,
  circleFeels,
  coverShames,
  fameOf,
  fameWord,
  fullName,
  shameBefore,
  shameDef,
  singerAt,
  taleOf,
  taleStepFor,
  withDeed,
} from '../src/fame'
import { createRng } from '../src/rng'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { priestAt, templeAccepts } from '../src/temple'
import { WORLD_START, dayOf } from '../src/time'
import { createPolitics } from '../src/war'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 68: слава и молва.
 *
 * Слава была одним числом побед. Теперь их пять — по кругам, — и над ними
 * лежит прозвище, рассказ, который портится по дороге, и позор, который
 * перекрывают делом, а не деньгами.
 */

const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

describe('Ф3: пять слав вместо одной', () => {
  it('одно дело круги читают по-разному', () => {
    expect(CIRCLES.length).toBe(5)
    // Разорение города: для простого люда — всё, для воинов — почти ничто.
    expect(circleFeels('folk', 'sack')).toBeLessThan(-15)
    expect(circleFeels('warriors', 'sack')).toBeGreaterThan(0)
    // Хлеб голодным: церковь и люд считают, воины — нет.
    expect(circleFeels('church', 'feedHungry')).toBeGreaterThan(0)
    expect(circleFeels('warriors', 'feedHungry')).toBe(0)
    let fame = withDeed({}, 'sack')
    fame = withDeed(fame, 'sack')
    console.log(
      `после двух разорений: ${CIRCLES.map((circle) => `${circle} ${fame[circle] ?? 0} (${fameWord(fame[circle] ?? 0)})`).join(', ')}`,
    )
    expect(fame.folk ?? 0).toBeLessThan(0)
    expect(fame.warriors ?? 0).toBeGreaterThan(0)
  })
})

describe('Ф1: прозвище', () => {
  it('мир зовёт по делам, и прозвище меняется вместе с ними', () => {
    expect(BYNAMES.length).toBeGreaterThan(8)
    const base = createGame(createCharacter({ name: 'Ратша' }), 1, world)
    expect(bynameOf(base)).toBeNull()
    expect(fullName(base)).toBe('Ратша')
    // Три разорения — и тебя зовут Кровавым.
    let fame = {}
    for (let i = 0; i < 3; i += 1) fame = withDeed(fame, 'sack')
    const bloody: GameState = { ...base, fame }
    console.log(`${fullName(bloody)}: ${bynameOf(bloody)?.about} (люд ${fameOf(bloody, 'folk')})`)
    expect(bynameOf(bloody)?.id).toBe('bloody')
    // А три хлебных обоза в голод зовут иначе.
    let kind = {}
    for (let i = 0; i < 3; i += 1) kind = withDeed(kind, 'feedHungry')
    const generous: GameState = { ...base, fame: kind }
    expect(bynameOf(generous)?.id).toBe('generous')
    console.log(`${fullName(generous)}: ${bynameOf(generous)?.about}`)
  })
})

describe('Ф2: молва портится по дороге', () => {
  it('в соседнем селе рассказывают почти как было, за три области — не узнать', () => {
    expect(taleStepFor(0)).toBe('true')
    expect(taleStepFor(3)).toBe('grown')
    expect(taleStepFor(9)).toBe('unrecognizable')
    const deed = 'ты один вышел против двадцати'
    for (const hops of [0, 2, 5, 9]) {
      console.log(`через ${hops} переходов: «${taleOf(deed, hops)}»`)
    }
    expect(taleOf(deed, 0)).toBe(deed)
    expect(taleOf(deed, 9)).not.toBe(deed)
  })
})

describe('Ф4: слава открывает и закрывает', () => {
  it('у знати и у церкви она решает, пустят ли', () => {
    const [politics, settlements] = createPolitics(world, createSettlements(world), createRng(1))
    const lord = politics.lords[0]
    expect(lord).toBeDefined()
    if (!lord) return
    const base = createGame(createCharacter({ name: 'Т', money: 100 }), 1, world)
    const nobody: GameState = { ...base, politics, settlements }
    const highborn: GameState = { ...nobody, fame: { noble: 90 } }
    const upstart: GameState = { ...nobody, fame: { noble: -90 } }
    const open = receptionFor(highborn, lord)
    const shut = receptionFor(upstart, lord)
    console.log(
      `${lord.title} ${lord.name}: высокородного ${open.admits ? 'принимает' : 'не принимает'} (дать ${open.gift}), выскочку ${shut.admits ? 'принимает' : 'не принимает'} (дать ${shut.gift})`,
    )
    expect(shut.gift).toBeGreaterThan(open.gift)

    // Церковь: «Безбожному» откажут и с изрядной верой.
    const temple = Object.values(settlements)
      .map((one) => priestAt(world, settlements, one.locationId))
      .find((one) => one?.cloth === 'bishop')
    const rite = RITES.find((one) => one.needsBishop)
    if (temple && rite) {
      const zealous = { ...temple, temper: 'zealous' as const }
      const feared = templeAccepts(zealous, -10, rite, -90)
      const loved = templeAccepts(zealous, -10, rite, 90)
      console.log(
        `владыка ${temple.name}: безбожному ${feared.accepts ? 'служит' : 'отказ'}, благочестивому ${loved.accepts ? 'служит' : 'отказ'}`,
      )
      expect(loved.accepts).toBe(true)
      expect(feared.accepts).toBe(false)
    }
  })
})

describe('Ф5: певец', () => {
  it('рассказ о славе покупают, а саму славу — нет', () => {
    const city = Object.values(world.locations)
      .filter((one) => one.population > 2000)
      .sort((a, b) => b.population - a.population)[0]
    expect(city).toBeDefined()
    if (!city) return
    const base: GameState = {
      ...createGame(createCharacter({ name: 'Т', money: 600 }), 1, world),
      locationId: city.id,
      quarter: null,
      time: WORLD_START,
    }
    const sung = ok(applyCommand(base, { type: 'hireSinger', circle: 'warriors' }))
    console.log(
      `${singerAt(city.id, dayOf(base.time))} поёт: воины ${fameOf(base, 'warriors')} → ${fameOf(sung, 'warriors')}`,
    )
    expect(fameOf(sung, 'warriors')).toBeGreaterThan(fameOf(base, 'warriors'))
    expect(sung.character.money).toBe(base.character.money - SINGER_PRICE)
    // В глухом месте петь некому.
    const wild = Object.values(world.locations).find((one) => one.population === 0)
    if (wild) {
      expect(
        applyCommand({ ...base, locationId: wild.id }, { type: 'hireSinger', circle: 'folk' }).ok,
      ).toBe(false)
    }
  })
})

describe('Ф6: позор', () => {
  it('позор — история, и перекрывают его делом, а не деньгами', () => {
    expect(SHAMES.length).toBe(4)
    expect(shameDef('fled').covers).toBe('winBattle')
    const shames = [{ id: 'fled' as const, since: 1, covered: 0 }]
    // Одна победа не закрывает: нужно три.
    let current = shames
    for (let i = 0; i < SHAME_COVER - 1; i += 1) {
      const step = coverShames(current, 'winBattle')
      expect(step.covered).toHaveLength(0)
      current = step.shames as typeof shames
    }
    const last = coverShames(current, 'winBattle')
    console.log(`«${shameDef('fled').label}»: перекрыто после ${SHAME_COVER} побед`)
    expect(last.covered).toContain('fled')
    expect(last.shames).toHaveLength(0)
    // И чужим делом не перекрыть: купеческое купеческим.
    expect(coverShames(shames, 'feedHungry').shames).toHaveLength(1)
    // Позор виден кругу, перед которым он висит.
    const state: Pick<GameState, 'shames'> = { shames }
    expect(shameBefore(state, 'warriors')?.id).toBe('fled')
    expect(shameBefore(state, 'traders')).toBeNull()
  })
})
