import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/character'
import { applyCommand } from '../src/commands'
import { JESTER_MORALE, RECRUITER_PRICE, SKIES, SKY_DEFS, SKY_ODDS } from '../src/content/year'
import { fairAt } from '../src/fair'
import { jobsAt } from '../src/place'
import {
  anniversariesOf,
  calendarOf,
  fairFolkAt,
  hasFairFolk,
  skyDef,
  skyOf,
  skyRoad,
  skySight,
} from '../src/season'
import type { GameState } from '../src/state'
import { createGame } from '../src/state'
import { DAYS_PER_YEAR, MINUTES_PER_DAY, WORLD_START, dayOf, seasonOf } from '../src/time'
import { generateWorld } from '../src/world/generate'

/**
 * Этап 67: год как жизнь.
 *
 * Год был временем года: зимой земля не родит, осенью жнут. Теперь у года есть
 * день — своя погода, своя ярмарочная толпа, своя годовщина, — и календарь, по
 * которому видно, что будет дальше.
 */

const world = generateWorld(1)

const ok = (result: ReturnType<typeof applyCommand>): GameState => {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

const village = Object.values(world.locations).find((one) => one.archetype === 'village')

function atDay(locationId: string, day: number, money = 600): GameState {
  const base = createGame(createCharacter({ name: 'Т', money }), 1, world)
  return {
    ...base,
    locationId,
    quarter: null,
    time: WORLD_START + (day - 1) * MINUTES_PER_DAY,
  }
}

describe('Я1: сев и жатва', () => {
  it('в деревне весной сеют, осенью жнут, а зимой ни того ни другого', () => {
    expect(village).toBeDefined()
    if (!village) return
    const names = (day: number) => jobsAt(atDay(village.id, day)).map((one) => one.id)
    const spring = names(30)
    const autumn = names(200)
    const winter = names(330)
    console.log(
      `${village.name}: весной ${spring.length} работ (${spring.includes('sowField') ? 'сев есть' : 'сева нет'}), ` +
        `осенью ${autumn.length} (${autumn.includes('reapField') ? 'жатва есть' : 'жатвы нет'}), ` +
        `зимой ${winter.length} (${winter.includes('winterYard') ? 'подёнщина есть' : 'нет'})`,
    )
    expect(seasonOf(30)).toBe('spring')
    expect(spring).toContain('sowField')
    expect(spring).not.toContain('reapField')
    expect(autumn).toContain('reapField')
    expect(autumn).not.toContain('sowField')
    expect(winter).not.toContain('sowField')
    expect(winter).toContain('winterYard')
    // И платят за жатву лучше, чем за зимнюю подёнщину: руки нужны сейчас.
    const reap = jobsAt(atDay(village.id, 200)).find((one) => one.id === 'reapField')
    const yard = jobsAt(atDay(village.id, 330)).find((one) => one.id === 'winterYard')
    expect((reap?.pay ?? 0) / Math.max(1, reap?.durationMinutes ?? 1)).toBeGreaterThan(
      (yard?.pay ?? 0) / Math.max(1, yard?.durationMinutes ?? 1),
    )
  })
})

describe('Я4: погода дня', () => {
  it('у дня своё небо, и оно меняет дорогу и стрельбу', () => {
    expect(SKIES.length).toBe(6)
    expect(skyRoad('storm')).toBeGreaterThan(skyRoad('clear'))
    expect(skySight('fog')).toBeLessThan(skySight('clear'))
    if (!village) return
    const tally = new Map<string, number>()
    for (let day = 1; day <= DAYS_PER_YEAR; day += 1) {
      const sky = skyOf(world, village.id, day)
      tally.set(sky, (tally.get(sky) ?? 0) + 1)
    }
    console.log(
      `${village.name} за год: ${[...tally.entries()].map(([sky, days]) => `${skyDef(sky as 'clear').label} ${days}`).join(', ')}`,
    )
    expect(tally.size).toBeGreaterThan(3)
    // Мороз — зимой, зной — летом: время года решает, что вероятно.
    let winterFrost = 0
    let summerFrost = 0
    for (let day = 1; day <= DAYS_PER_YEAR * 3; day += 1) {
      const sky = skyOf(world, village.id, day)
      if (sky !== 'frost') continue
      if (seasonOf(day) === 'winter') winterFrost += 1
      if (seasonOf(day) === 'summer') summerFrost += 1
    }
    console.log(`морозных дней за три года: зимой ${winterFrost}, летом ${summerFrost}`)
    expect(winterFrost).toBeGreaterThan(summerFrost)
    expect(SKY_ODDS.summer?.frost).toBe(0)
    // Одно и то же небо над одним днём: погода не пересдаётся от взгляда.
    expect(skyOf(world, village.id, 100)).toBe(skyOf(world, village.id, 100))
    // И соседи по полосе видят то же небо.
    const near = Object.values(world.locations)
      .filter((one) => one.id !== village.id)
      .sort(
        (a, b) =>
          Math.hypot(a.x - village.x, a.y - village.y) -
          Math.hypot(b.x - village.x, b.y - village.y),
      )[0]
    if (near) {
      let same = 0
      for (let day = 1; day <= 100; day += 1) {
        if (skyOf(world, near.id, day) === skyOf(world, village.id, day)) same += 1
      }
      console.log(`с ближайшим соседом небо совпало ${same} дней из ста`)
      expect(same).toBeGreaterThan(40)
    }
  })

  it('в непогоду дорога дольше', () => {
    if (!village) return
    const road = world.roads[village.id]?.[0]
    if (!road) return
    let clear = 0
    let foul = 0
    for (let day = 5; day < 300; day += 1) {
      const state = atDay(village.id, day)
      const result = applyCommand(state, { type: 'travel', toLocationId: road.to })
      if (!result.ok) continue
      const hoursOfRoad = result.state.journey?.hours ?? 0
      if (skyOf(world, village.id, day) === 'clear') clear = Math.max(clear, hoursOfRoad)
      else foul = Math.max(foul, hoursOfRoad)
    }
    console.log(`та же дорога: в ясный день ${clear} ч, в непогоду до ${foul} ч`)
    expect(foul).toBeGreaterThan(clear)
  })
})

describe('Я3: ярмарка изнутри', () => {
  it('ярмарка — люди: купцы, скоморохи, вербовщики и воры', () => {
    let where = ''
    let when = 0
    for (const place of Object.values(world.locations)) {
      for (let day = 1; day <= DAYS_PER_YEAR && !where; day += 1) {
        if (fairAt(world, place.id, day)) {
          where = place.id
          when = day
        }
      }
      if (where) break
    }
    expect(where).not.toBe('')
    const folk = fairFolkAt(world, where, when)
    console.log(
      `${world.locations[where]?.name}, день ${when}: ${folk.map((one) => one.label).join(', ')}`,
    )
    expect(folk.length).toBeGreaterThan(0)
    expect(folk.some((one) => one.kind === 'merchant')).toBe(true)
    // Не в ярмарочный день на площади никого.
    const quiet = Object.values(world.locations).find(
      (one) => !fairAt(world, one.id, when) && one.archetype === 'village',
    )
    if (quiet) expect(fairFolkAt(world, quiet.id, when)).toHaveLength(0)

    // Скоморохи поднимают дух — за деньги и за час.
    if (hasFairFolk(world, where, when, 'jester')) {
      const state: GameState = {
        ...atDay(where, when, 300),
        party: { units: { militia: 6 }, morale: 50, hungryDays: 0, gear: 0 },
      }
      const watched = ok(applyCommand(state, { type: 'watchJesters' }))
      expect(watched.party.morale).toBe(50 + JESTER_MORALE)
      expect(watched.character.money).toBeLessThan(state.character.money)
    }
    expect(RECRUITER_PRICE).toBeLessThan(1)
  })
})

describe('Я5 и Я6: годовщины и календарь', () => {
  it('годовщины помнятся, и год виден вперёд', () => {
    if (!village) return
    const base = atDay(village.id, DAYS_PER_YEAR * 2 + 40)
    // День рождения героя лежит до начала мира: возраст отсчитан назад от
    // первого дня. Годовщина — тот же день года, но уже в игре.
    const born = base.character.bornDay
    const years = Math.ceil((2 - born) / DAYS_PER_YEAR)
    const onBirthday: GameState = {
      ...base,
      time: WORLD_START + (born + DAYS_PER_YEAR * years - 1) * MINUTES_PER_DAY,
    }
    const marks = anniversariesOf(onBirthday, dayOf(onBirthday.time))
    console.log(
      `день ${dayOf(onBirthday.time)}: ${marks.map((one) => `${one.label} (${one.years})`).join(', ') || 'ничего'}`,
    )
    expect(marks.some((one) => one.id === 'birthday')).toBe(true)
    // И в обычный день их нет.
    expect(anniversariesOf(base, dayOf(base.time) + 3)).toHaveLength(0)

    // Календарь: что будет в этом году.
    const ahead = calendarOf(base, dayOf(base.time), 180)
    console.log(
      `впереди 180 суток: ${ahead
        .slice(0, 6)
        .map((one) => `${one.kind} «${one.label}» на ${one.day}`)
        .join('; ')}`,
    )
    expect(ahead.length).toBeGreaterThan(2)
    // Список отсортирован по дням и не заглядывает дальше срока.
    for (const [index, entry] of ahead.entries()) {
      expect(entry.day).toBeGreaterThanOrEqual(dayOf(base.time))
      expect(entry.day).toBeLessThanOrEqual(dayOf(base.time) + 180)
      if (index > 0) expect(entry.day).toBeGreaterThanOrEqual(ahead[index - 1]?.day ?? 0)
    }
    // Повороты года в нём есть всегда: их не миновать.
    expect(ahead.some((one) => one.kind === 'season')).toBe(true)
  })
})
