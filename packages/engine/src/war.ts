import type { BattleSide } from './battle'
import type { TroopId } from './content/troops'
import { LORD_NAMES, LORD_TITLES } from './content/world'
import type { Settlement } from './economy'
import { foodSecurity } from './life'
import type { Rng } from './rng'
import { nextFloat, nextInt, rollChance } from './rng'
import type { World } from './world/types'

/**
 * Война и разбой (DESIGN.md, п.8).
 *
 * Войны объявляются по причинам, а не броском кубика, и бьют не по строчке в
 * журнале, а по хлебу: разорённая провинция теряет людей и запасы, враждующие
 * королевства перестают делиться зерном, а голод рождает шайки. Разбой, в свою
 * очередь, душит подвоз — и круг замыкается.
 */

export interface War {
  readonly a: string
  readonly b: string
  readonly since: number
  readonly reason: string
}

/**
 * Лорд — держатель земель (DESIGN.md, п.3.2 и п.8).
 *
 * Именных спутников в игре нет, но именные владетели есть: без них некому
 * ссориться с короной и не с кем воевать за землю.
 */
export interface Lord {
  readonly id: string
  readonly name: string
  readonly title: string
  /** Кому служит. Для мятежника — пусто. */
  readonly kingdomId: string | null
  /** Верность короне, 0..100. */
  readonly loyalty: number
  /** Сила дружины — условное число, из него собирается отряд в бою. */
  readonly strength: number
}

/**
 * Архимаг короны (DESIGN.md, п.8): естественный ограничитель мятежей.
 * Своеволен — бывает свободен, занят или вовсе отказался служить.
 */
export interface Archmage {
  readonly kingdomId: string
  readonly state: 'free' | 'busy' | 'refused'
  /** До какого дня он в этом состоянии. */
  readonly untilDay: number
}

export interface Politics {
  readonly wars: readonly War[]
  /** День, до которого политика уже посчитана. */
  readonly lastDay: number
  readonly lords: readonly Lord[]
  readonly archmages: Readonly<Record<string, Archmage>>
}

export const NO_POLITICS: Politics = { wars: [], lastDay: 0, lords: [], archmages: {} }

export function lordById(politics: Politics, id: string): Lord | null {
  return politics.lords.find((lord) => lord.id === id) ?? null
}

export function lordsOf(politics: Politics, kingdomId: string): readonly Lord[] {
  return politics.lords.filter((lord) => lord.kingdomId === kingdomId)
}

/** Мятежник — лорд, оставшийся без сюзерена. */
export function isRebel(lord: Lord): boolean {
  return lord.kingdomId === null
}

export const WAR_REASONS: readonly string[] = [
  'старые претензии на пограничные земли',
  'оскорбление, нанесённое послу',
  'спор о вере',
  'набеги, оставленные без ответа',
  'перехваченный караван с податью',
  'брак, который расторгли со скандалом',
]

/**
 * Раздать землю: корона держит столицу, остальное — лорды по провинциям.
 *
 * Делается один раз при создании мира. Дальше земля переходит из рук в руки
 * только по итогам войн, мятежей и пожалований.
 */
export function createPolitics(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  rng: Rng,
): [Politics, Record<string, Settlement>, Rng] {
  let generator = rng
  const lords: Lord[] = []
  const owned: Record<string, Settlement> = { ...settlements }
  const archmages: Record<string, Archmage> = {}
  const usedNames = new Set<string>()

  for (const kingdom of Object.values(world.kingdoms)) {
    archmages[kingdom.id] = { kingdomId: kingdom.id, state: 'free', untilDay: 0 }
    const crown = `crown:${kingdom.id}`
    const titles = LORD_TITLES[kingdom.id] ?? LORD_TITLES.reEstiz ?? ['барон']
    let index = 0

    for (const regionId of kingdom.regionIds) {
      const region = world.regions[regionId]
      if (!region) continue
      for (const provinceId of region.provinceIds) {
        const province = world.provinces[provinceId]
        if (!province) continue

        // Домен короны: провинция со столицей держится сюзереном напрямую
        // (DESIGN.md, п.3.2). Из неё же потом и жалуют землю за службу.
        if (province.locationIds.includes(kingdom.capitalId)) {
          for (const locationId of province.locationIds) {
            const settlement = owned[locationId]
            if (settlement) owned[locationId] = { ...settlement, owner: crown }
          }
          continue
        }

        const [nameIndex, afterName] = nextInt(generator, 0, LORD_NAMES.length - 1)
        const [titleIndex, afterTitle] = nextInt(afterName, 0, titles.length - 1)
        const [loyalty, afterLoyalty] = nextInt(afterTitle, 55, 85)
        generator = afterLoyalty

        let name = LORD_NAMES[nameIndex] ?? 'Безымянный'
        while (usedNames.has(name)) name = `${name} Младший`
        usedNames.add(name)

        const id = `lord:${kingdom.id}:${index}`
        index += 1
        let people = 0

        for (const locationId of province.locationIds) {
          const settlement = owned[locationId]
          if (!settlement) continue
          owned[locationId] = { ...settlement, owner: id }
          people += settlement.population
        }

        lords.push({
          id,
          name,
          title: titles[titleIndex] ?? 'барон',
          kingdomId: kingdom.id,
          loyalty,
          strength: Math.max(8, Math.round(people / 60)),
        })
      }
    }
  }

  return [{ wars: [], lastDay: 0, lords, archmages }, owned, generator]
}

export function atWar(politics: Politics, a: string, b: string): boolean {
  if (a === b) return false
  return politics.wars.some((war) => (war.a === a && war.b === b) || (war.a === b && war.b === a))
}

export function warsOf(politics: Politics, kingdomId: string): readonly War[] {
  return politics.wars.filter((war) => war.a === kingdomId || war.b === kingdomId)
}

export function enemyOf(war: War, kingdomId: string): string {
  return war.a === kingdomId ? war.b : war.a
}

export type WarEvent =
  | { readonly type: 'warDeclared'; readonly war: War }
  | { readonly type: 'peace'; readonly war: War }
  | { readonly type: 'raid'; readonly locationId: string; readonly lost: number }
  | { readonly type: 'rebellion'; readonly lordId: string }
  | { readonly type: 'archmage'; readonly kingdomId: string; readonly state: Archmage['state'] }

export interface PoliticsResult {
  readonly politics: Politics
  readonly settlements: Readonly<Record<string, Settlement>>
  readonly rng: Rng
  readonly events: readonly WarEvent[]
}

/** Шанс, что за сутки кто-то кому-то объявит войну. */
const DECLARE_CHANCE = 0.004
/** Шанс, что за сутки война закончится миром. */
const PEACE_CHANCE = 0.006
/** Шанс, что за сутки враг разорит одно поселение противника. */
const RAID_CHANCE = 0.12

export function tickPolitics(
  world: World,
  politics: Politics,
  settlements: Readonly<Record<string, Settlement>>,
  day: number,
  rng: Rng,
): PoliticsResult {
  let generator = rng
  let wars = [...politics.wars]
  let current = settlements
  const events: WarEvent[] = []
  const kingdomIds = Object.keys(world.kingdoms)
  const days = Math.max(0, day - politics.lastDay)

  for (let i = 0; i < days; i += 1) {
    // Мир кончается.
    const [declares, afterDeclare] = rollChance(generator, DECLARE_CHANCE)
    generator = afterDeclare
    if (declares && kingdomIds.length > 1) {
      const [first, afterFirst] = nextInt(generator, 0, kingdomIds.length - 1)
      const [second, afterSecond] = nextInt(afterFirst, 0, kingdomIds.length - 1)
      generator = afterSecond
      const a = kingdomIds[first]
      const b = kingdomIds[second]
      if (a && b && a !== b && !wars.some((war) => sameWar(war, a, b))) {
        const [reasonIndex, afterReason] = nextInt(generator, 0, WAR_REASONS.length - 1)
        generator = afterReason
        const war: War = {
          a,
          b,
          since: politics.lastDay + i,
          reason: WAR_REASONS[reasonIndex] ?? WAR_REASONS[0] ?? 'старые счёты',
        }
        wars.push(war)
        events.push({ type: 'warDeclared', war })
      }
    }

    // Война кончается.
    for (const war of [...wars]) {
      const [peace, afterPeace] = rollChance(generator, PEACE_CHANCE)
      generator = afterPeace
      if (peace) {
        wars = wars.filter((other) => other !== war)
        events.push({ type: 'peace', war })
      }
    }

    // Пока идёт война — разоряют.
    for (const war of wars) {
      const [raids, afterRaid] = rollChance(generator, RAID_CHANCE)
      generator = afterRaid
      if (!raids) continue
      const [attacker, afterSide] = rollChance(generator, 0.5)
      generator = afterSide
      const victimKingdom = attacker ? war.b : war.a
      const [result, afterPick] = raid(world, current, victimKingdom, generator)
      generator = afterPick
      current = result.settlements
      if (result.event) events.push(result.event)
    }
  }

  const afterLords = tickLords(
    world,
    { wars, lastDay: day, lords: politics.lords, archmages: politics.archmages },
    current,
    days,
    generator,
  )
  return {
    politics: afterLords.politics,
    settlements: current,
    rng: afterLords.rng,
    events: [...events, ...afterLords.events],
  }
}

/**
 * Лорды: верность, своеволие архимагов и мятежи.
 *
 * Мятеж — не бросок кубика: верность падает по причинам (голод на его землях,
 * проигранные войны, разорение), а решается лорд тогда, когда архимаг короны
 * не под рукой. Это открытая информация, как и договаривались в п.8: игрок
 * видит состояние архимагов и считает момент сам.
 */
function tickLords(
  world: World,
  politics: Politics,
  settlements: Readonly<Record<string, Settlement>>,
  days: number,
  rng: Rng,
): { politics: Politics; rng: Rng; events: readonly WarEvent[] } {
  if (days <= 0) return { politics, rng, events: [] }
  let generator = rng
  const events: WarEvent[] = []
  const archmages: Record<string, Archmage> = { ...politics.archmages }
  let wars = [...politics.wars]

  // Архимаг то занят своими делами, то снова свободен.
  for (const kingdomId of Object.keys(archmages)) {
    const current = archmages[kingdomId]
    if (!current || politics.lastDay + days < current.untilDay) continue
    const [roll, afterRoll] = nextFloat(generator)
    generator = afterRoll
    const state: Archmage['state'] = roll < 0.55 ? 'free' : roll < 0.9 ? 'busy' : 'refused'
    const [span, afterSpan] = nextInt(generator, 20, 90)
    generator = afterSpan
    if (state !== current.state) events.push({ type: 'archmage', kingdomId, state })
    archmages[kingdomId] = { kingdomId, state, untilDay: politics.lastDay + days + span }
  }

  const lords: Lord[] = []
  for (const lord of politics.lords) {
    if (lord.kingdomId === null) {
      lords.push(lord)
      continue
    }
    const holdings = Object.values(settlements).filter((settlement) => settlement.owner === lord.id)
    const hunger =
      holdings.length > 0
        ? holdings.reduce((sum, s) => sum + foodSecurity(s), 0) / holdings.length
        : 1
    const unrest =
      holdings.length > 0 ? holdings.reduce((sum, s) => sum + s.banditry, 0) / holdings.length : 0
    const kingdomAtWar = warsOf({ ...politics, wars }, lord.kingdomId).length > 0

    let drift = 0.02
    if (hunger < 0.5) drift -= 0.12
    if (unrest > 0.3) drift -= 0.1
    if (kingdomAtWar) drift -= 0.05
    const loyalty = Math.max(0, Math.min(100, lord.loyalty + drift * days))

    // Момент для мятежа: верности нет, а архимаг короны занят своим.
    const crownMage = archmages[lord.kingdomId]?.state ?? 'free'
    if (loyalty < 20 && crownMage !== 'free') {
      const [rebels, afterRebel] = rollChance(generator, 0.04 * days)
      generator = afterRebel
      if (rebels) {
        const war: War = {
          a: lord.kingdomId,
          b: lord.id,
          since: politics.lastDay + days,
          reason: 'мятеж: корона не слышала своих вассалов',
        }
        wars = [...wars, war]
        events.push({ type: 'rebellion', lordId: lord.id })
        events.push({ type: 'warDeclared', war })
        lords.push({ ...lord, kingdomId: null, loyalty: 0 })
        continue
      }
    }
    lords.push({ ...lord, loyalty })
  }

  return { politics: { wars, lastDay: politics.lastDay, lords, archmages }, rng: generator, events }
}

function sameWar(war: War, a: string, b: string): boolean {
  return (war.a === a && war.b === b) || (war.a === b && war.b === a)
}

/** Разорение: у поселения уводят хлеб и людей, а по округе расходятся шайки. */
function raid(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  kingdomId: string,
  rng: Rng,
): [{ settlements: Readonly<Record<string, Settlement>>; event: WarEvent | null }, Rng] {
  const kingdom = world.kingdoms[kingdomId]
  if (!kingdom) return [{ settlements, event: null }, rng]

  const targets = kingdom.regionIds
    .flatMap((regionId) => world.regions[regionId]?.provinceIds ?? [])
    .flatMap((provinceId) => world.provinces[provinceId]?.locationIds ?? [])
    .filter((id) => (settlements[id]?.population ?? 0) > 0)
  if (targets.length === 0) return [{ settlements, event: null }, rng]

  const [index, afterIndex] = nextInt(rng, 0, targets.length - 1)
  const locationId = targets[index]
  const victim = locationId ? settlements[locationId] : undefined
  if (!locationId || !victim) return [{ settlements, event: null }, afterIndex]

  const [severity, afterSeverity] = nextFloat(afterIndex)
  const lost = Math.round(victim.population * (0.01 + severity * 0.03))
  const next: Settlement = {
    ...victim,
    population: Math.max(0, victim.population - lost),
    banditry: Math.min(1, victim.banditry + 0.15 + severity * 0.2),
    stock: {
      ...victim.stock,
      grain: Math.round(victim.stock.grain * 0.5),
      fish: Math.round(victim.stock.fish * 0.6),
    },
  }
  return [
    {
      settlements: { ...settlements, [locationId]: next },
      event: { type: 'raid', locationId, lost },
    },
    afterSeverity,
  ]
}

/**
 * Шайка, поджидающая на дороге.
 * Чем беднее и голоднее округа, тем их больше: разбой — следствие, а не декорация.
 */
export function banditBand(banditry: number, population: number, rng: Rng): [BattleSide, Rng] {
  const base = 3 + banditry * 14 + Math.min(8, population / 400)
  const [roll, next] = nextFloat(rng)
  const size = Math.max(2, Math.round(base * (0.6 + roll * 0.8)))
  const archers = Math.round(size * 0.3)
  const units: Partial<Record<TroopId, number>> = { militia: size - archers }
  if (archers > 0) units.archer = archers
  return [{ name: 'Разбойники', units, morale: 45 + Math.round(banditry * 25), fatigue: 0 }, next]
}

/** Отряд враждебного лорда: настоящее войско, а не шайка. */
export function warband(strength: number, rng: Rng): [BattleSide, Rng] {
  const [roll, next] = nextFloat(rng)
  const size = Math.max(6, Math.round(strength * (0.7 + roll * 0.7)))
  const units: Partial<Record<TroopId, number>> = {
    militia: Math.round(size * 0.4),
    spearman: Math.round(size * 0.3),
    archer: Math.round(size * 0.2),
    manAtArms: Math.max(1, Math.round(size * 0.1)),
  }
  return [{ name: 'Вражеский отряд', units, morale: 70, fatigue: 0 }, next]
}
