import { describe, expect, it } from 'vitest'
import {
  type Band,
  bandSize,
  defendersOf,
  holderKingdom,
  holderOf,
  musterBands,
  nextHop,
  seatOf,
  tickBands,
} from '../src/band'
import { createSettlements } from '../src/economy'
import type { Settlement } from '../src/economy'
import { tickDays } from '../src/life'
import { createRng } from '../src/rng'
import { createPolitics, isRebel, tickPolitics } from '../src/war'
import type { Politics } from '../src/war'
import { generateWorld } from '../src/world/generate'
import { kingdomOf, roadsFrom } from '../src/world/queries'

const world = generateWorld(1)

function freshWorld(): { settlements: Record<string, Settlement>; politics: Politics } {
  const [politics, owned] = createPolitics(world, createSettlements(world), createRng(1))
  return { settlements: owned, politics }
}

/** Прогон мира без игрока: те же три такта, что и в игре. */
function live(years: number, seed = 1) {
  const { settlements: owned, politics: start } = freshWorld()
  let settlements: Readonly<Record<string, Settlement>> = owned
  let politics = start
  const [initial, afterMuster] = musterBands(politics, settlements, createRng(seed + 7))
  let bands = initial
  let rng = afterMuster
  const taken: string[] = []
  let rebellions = 0
  for (let day = 1; day <= years * 365; day += 1) {
    settlements = tickDays(world, settlements, 1).settlements
    const turn = tickPolitics(world, politics, settlements, day, rng)
    politics = turn.politics
    settlements = turn.settlements
    rng = turn.rng
    rebellions += turn.events.filter((event) => event.type === 'rebellion').length
    const march = tickBands(world, politics, settlements, bands, rng)
    bands = march.bands
    settlements = march.settlements
    politics = march.politics
    rng = march.rng
    for (const event of march.events) {
      if (event.type === 'bandTook') taken.push(event.locationId)
    }
  }
  return { settlements, politics, bands, taken, rebellions }
}

describe('дружины на карте', () => {
  it('у каждого держателя земли есть войско, и оно стоит дома', () => {
    const { settlements, politics } = freshWorld()
    const [bands] = musterBands(politics, settlements, createRng(7))
    expect(bands.length).toBeGreaterThanOrEqual(politics.lords.length)
    for (const band of bands) {
      expect(bandSize(band)).toBeGreaterThan(0)
      expect(settlements[band.locationId]?.owner).toBe(band.lordId)
    }
  })

  it('у каждой короны своя рать: когда вассалы бунтуют, унимать их есть кому', () => {
    const { settlements, politics } = freshWorld()
    const [bands] = musterBands(politics, settlements, createRng(7))
    const crowns = bands.filter((band) => band.lordId.startsWith('crown:'))
    expect(crowns.length).toBe(Object.keys(world.kingdoms).length)
  })

  it('шаг по дороге ведёт к цели, а не куда попало', () => {
    const from = Object.keys(world.locations)[0] as string
    const to = Object.keys(world.locations)[40] as string
    const step = nextHop(world, from, to)
    expect(step).not.toBeNull()
    expect(roadsFrom(world, from).some((road) => road.to === step)).toBe(true)
  })

  it('войско не телепортируется: до соседа идут не меньше суток', () => {
    const { settlements, politics } = freshWorld()
    const [bands] = musterBands(politics, settlements, createRng(7))
    const band = bands[0] as Band
    const far = Object.keys(world.locations).find((id) => id !== band.locationId) as string
    const marching: Band = {
      ...band,
      goal: { type: 'raid', targetId: far },
      travel: { toLocationId: far, hoursLeft: 30 },
    }
    const after = tickBands(world, politics, settlements, [marching], createRng(3))
    const moved = after.bands[0] as Band
    expect(moved.locationId).toBe(band.locationId)
    expect(moved.travel?.hoursLeft).toBe(6)
  })

  it('место защищается само: гарнизон плюс ополчение от числа жителей', () => {
    const { settlements } = freshWorld()
    const big = Object.values(settlements).sort((a, b) => b.population - a.population)[0]
    const small = Object.values(settlements)
      .filter((s) => s.population > 0)
      .sort((a, b) => a.population - b.population)[0]
    if (!big || !small) throw new Error('мир пуст')
    const many = Object.values(defendersOf(big)).reduce((sum, n) => sum + (n ?? 0), 0)
    const few = Object.values(defendersOf(small)).reduce((sum, n) => sum + (n ?? 0), 0)
    expect(many).toBeGreaterThan(few)
    expect(many).toBeGreaterThan(20)
  })

  it('дружина без лорда уходит с карты: ничьих войск не бывает', () => {
    const { settlements, politics } = freshWorld()
    const [bands] = musterBands(politics, settlements, createRng(7))
    const orphan: Band = { ...(bands[0] as Band), lordId: 'lord:которого:нет' }
    const after = tickBands(world, politics, settlements, [orphan], createRng(5))
    expect(after.bands.length).toBe(
      after.bands.filter((band) => band.lordId !== 'lord:которого:нет').length,
    )
  })
})

describe('война, у которой есть последствия', () => {
  it('за двадцать лет земля меняет хозяина: границы двигаются', () => {
    const { settlements: before } = freshWorld()
    const { settlements, taken } = live(20)
    const changed = Object.entries(settlements).filter(
      ([id, settlement]) => before[id]?.owner !== settlement.owner,
    )
    console.log(`за 20 лет: взято осадой ${taken.length}, сменили хозяина ${changed.length} мест`)
    expect(taken.length).toBeGreaterThan(0)
    expect(changed.length).toBeGreaterThan(0)
  })

  it('двадцать лет живых армий не съедают мир', () => {
    const { settlements: before } = freshWorld()
    const { settlements, politics } = live(20)
    const was = Object.values(before).reduce((sum, s) => sum + s.population, 0)
    const now = Object.values(settlements).reduce((sum, s) => sum + s.population, 0)
    const alive = Object.values(settlements).filter((s) => s.population > 0).length
    // Пять корон никуда не делись, и большинство мест на карте.
    const crowns = new Set(
      politics.lords.map((lord) => lord.kingdomId).filter((id): id is string => id !== null),
    )
    console.log(
      `за 20 лет войн: население ${was} → ${now}, живых мест ${alive}, корон ${crowns.size}`,
    )
    expect(now).toBeGreaterThan(was * 0.5)
    // Считаем от поселений, а не от всех мест карты: половина мест — перевалы
    // и курганы, жителей в них не бывает и не должно быть.
    expect(alive).toBeGreaterThan(Object.keys(before).length * 0.8)
    expect(crowns.size).toBeGreaterThanOrEqual(3)
  })

  it('у мятежа есть выход: за двадцать лет мятежники не копятся без конца', () => {
    const { politics, rebellions } = live(20)
    const rebels = politics.lords.filter(isRebel)
    // Раньше мятеж был дверью в одну сторону: пятнадцать лордов из шестнадцати
    // уходили в мятеж и оставались там навсегда. Выход — это когда мятежей за
    // двадцать лет было много больше, чем мятежников осталось: их унимают.
    // На материке (этап 44) север и юг голодают по замыслу, мятежей от голода
    // больше, и в мятеже стоит около половины владетелей — но не больше трёх
    // пятых, и большинство мятежей кончается.
    console.log(
      `мятежников через 20 лет: ${rebels.length} из ${politics.lords.length}, мятежей было ${rebellions}`,
    )
    expect(rebels.length).toBeLessThan(politics.lords.length * 0.6)
    expect(rebels.length).toBeLessThan(rebellions / 2)
    expect(politics.lords.length).toBeGreaterThan(5)
  })

  it('у каждого лорда есть земля: безземельных владетелей не остаётся', () => {
    const { politics, settlements } = live(20)
    for (const lord of politics.lords) {
      expect(seatOf(settlements, lord.id)).not.toBeNull()
    }
  })

  it('из одного зерна выходит один и тот же век', () => {
    const first = live(5)
    const second = live(5)
    expect(first.taken).toEqual(second.taken)
    expect(first.politics.lords).toEqual(second.politics.lords)
  })
})

describe('чья земля', () => {
  it('различает корону, лорда, мятежника, игрока и ничью землю', () => {
    const { politics } = freshWorld()
    const lord = politics.lords[0]
    if (!lord) throw new Error('в мире нет лордов')
    const rebel = { ...lord, id: 'lord:re:9', kingdomId: null }
    const withRebel: Politics = { ...politics, lords: [...politics.lords, rebel] }

    expect(holderOf(withRebel, `crown:${lord.kingdomId}`, 'player')).toEqual({
      kind: 'crown',
      kingdomId: lord.kingdomId,
    })
    expect(holderOf(withRebel, lord.id, 'player')).toEqual({
      kind: 'lord',
      lordId: lord.id,
      kingdomId: lord.kingdomId,
    })
    expect(holderOf(withRebel, 'lord:re:9', 'player')).toEqual({
      kind: 'rebel',
      lordId: 'lord:re:9',
    })
    expect(holderOf(withRebel, 'player', 'player')).toEqual({ kind: 'player' })
    expect(holderOf(withRebel, null, 'player')).toEqual({ kind: 'nobody' })
  })

  it('к двадцатому году держатель расходится со скелетом мира', () => {
    // Ради этого и заведён holderOf: карта, покрашенная по скелету, к этому
    // времени показывает пять целых королевств там, где земля уже поделена иначе.
    const { settlements, politics } = live(20)
    let moved = 0
    for (const [id, settlement] of Object.entries(settlements)) {
      const skeleton = kingdomOf(world, id)?.id ?? null
      const actual = holderKingdom(politics, settlement.owner, 'player')
      if (actual !== skeleton) moved += 1
    }
    console.log(`мест, где держатель не совпадает со скелетом: ${moved} из 62`)
    expect(moved).toBeGreaterThan(0)
  })
})
