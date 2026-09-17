import type { BattleSide } from './battle'
import type { TroopId } from './content/troops'
import type { Settlement } from './economy'
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

export interface Politics {
  readonly wars: readonly War[]
  /** День, до которого политика уже посчитана. */
  readonly lastDay: number
}

export const NO_POLITICS: Politics = { wars: [], lastDay: 0 }

export const WAR_REASONS: readonly string[] = [
  'старые претензии на пограничные земли',
  'оскорбление, нанесённое послу',
  'спор о вере',
  'набеги, оставленные без ответа',
  'перехваченный караван с податью',
  'брак, который расторгли со скандалом',
]

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

  return { politics: { wars, lastDay: day }, settlements: current, rng: generator, events }
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
