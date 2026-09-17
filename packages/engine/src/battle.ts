import { TROOPS, type TroopId } from './content/troops'
import type { Party } from './party'
import { partySize } from './party'
import type { Rng } from './rng'
import { nextFloat, rollChance, variance } from './rng'
import type { Terrain } from './world/types'

/**
 * Бой (DESIGN.md, п.5).
 *
 * Игрок командует группами, а не людьми: раунд — это приказы авангарду,
 * стрелкам, флангу и резерву. Исход считается числами (состав, снаряжение,
 * выучка, приказы, рельеф, усталость), случайность только подкручивает. Отряды
 * бегут при падении морали, а не умирают до последнего — разгром должен
 * выглядеть как разгром.
 */

export const GROUP_IDS = ['vanguard', 'archers', 'flank', 'reserve'] as const
export type GroupId = (typeof GROUP_IDS)[number]

export const GROUP_LABELS: Record<GroupId, string> = {
  vanguard: 'Авангард',
  archers: 'Стрелки',
  flank: 'Фланг',
  reserve: 'Резерв',
}

export const ORDER_IDS = ['hold', 'charge', 'shoot', 'flank', 'fallBack'] as const
export type OrderId = (typeof ORDER_IDS)[number]

export const ORDER_LABELS: Record<OrderId, string> = {
  hold: 'Держать строй',
  charge: 'В атаку',
  shoot: 'Стрелять',
  flank: 'Обойти с фланга',
  fallBack: 'Отойти',
}

export type Units = Readonly<Partial<Record<TroopId, number>>>

export interface BattleSide {
  readonly name: string
  readonly units: Units
  readonly morale: number
  readonly fatigue: number
}

export type BattleOutcome = 'ongoing' | 'won' | 'lost' | 'fled'

export interface Battle {
  readonly enemy: BattleSide
  readonly enemyStart: number
  readonly groups: Readonly<Record<GroupId, Units>>
  readonly morale: number
  readonly fatigue: number
  readonly round: number
  readonly outcome: BattleOutcome
  readonly terrain: Terrain
  readonly log: readonly string[]
  /** Заполняется, когда бой окончен. */
  readonly spoils: { readonly money: number; readonly prisoners: number }
}

/** Ниже этого рубежа отряд перестаёт драться и бежит. */
export const ROUT_MORALE = 20

export function unitsSize(units: Units): number {
  return Object.values(units).reduce((sum, count) => sum + (count ?? 0), 0)
}

export function groupsSize(groups: Readonly<Record<GroupId, Units>>): number {
  return GROUP_IDS.reduce((sum, id) => sum + unitsSize(groups[id]), 0)
}

/** Собрать группы из отряда: стрелки к стрелкам, конные во фланг, прочие в строй. */
export function formUp(party: Party): Record<GroupId, Units> {
  const groups: Record<GroupId, Record<string, number>> = {
    vanguard: {},
    archers: {},
    flank: {},
    reserve: {},
  }
  for (const [id, count] of Object.entries(party.units)) {
    const troop = id as TroopId
    const def = TROOPS[troop]
    const total = count ?? 0
    if (total <= 0) continue
    if (def.ranged > 0) groups.archers[troop] = total
    else if (def.mounted) groups.flank[troop] = total
    else {
      // Четверть строя держим в резерве: он вступает свежим.
      const reserve = Math.floor(total / 4)
      if (reserve > 0) groups.reserve[troop] = reserve
      groups.vanguard[troop] = total - reserve
    }
  }
  return groups as Record<GroupId, Units>
}

/** Свести группы обратно в отряд — после боя. */
export function unformUp(groups: Readonly<Record<GroupId, Units>>): Units {
  const units: Record<string, number> = {}
  for (const id of GROUP_IDS) {
    for (const [troop, count] of Object.entries(groups[id])) {
      units[troop] = (units[troop] ?? 0) + (count ?? 0)
    }
  }
  return units
}

export function startBattle(party: Party, enemy: BattleSide, terrain: Terrain): Battle {
  return {
    enemy,
    enemyStart: unitsSize(enemy.units),
    groups: formUp(party),
    morale: party.morale,
    fatigue: 0,
    round: 0,
    outcome: 'ongoing',
    terrain,
    log: [`${enemy.name} — ${unitsSize(enemy.units)} против ${partySize(party)}.`],
    spoils: { money: 0, prisoners: 0 },
  }
}

// --- разрешение раунда ------------------------------------------------------

/** Что приказ делает с силой и с прикрытием группы. */
const ORDER_EFFECT: Record<OrderId, { attack: number; defense: number }> = {
  hold: { attack: 0.55, defense: 1.7 },
  charge: { attack: 1.45, defense: 0.65 },
  shoot: { attack: 1.2, defense: 0.75 },
  flank: { attack: 1.6, defense: 0.55 },
  fallBack: { attack: 0.15, defense: 1.4 },
}

export interface RoundContext {
  /** Навык «Командование» героя: он множит силу всего отряда. */
  readonly command: number
}

export interface RoundResult {
  readonly battle: Battle
  readonly rng: Rng
}

export function resolveRound(
  battle: Battle,
  orders: Readonly<Record<GroupId, OrderId>>,
  context: RoundContext,
  rng: Rng,
): RoundResult {
  if (battle.outcome !== 'ongoing') return { battle, rng }

  let generator = rng
  const log: string[] = []
  const round = battle.round + 1

  // Свои: считаем силу по группам и приказам.
  let attack = 0
  let defense = 0
  const engaged = GROUP_IDS.some(
    (id) => unitsSize(battle.groups[id]) > 0 && (orders[id] === 'hold' || orders[id] === 'charge'),
  )

  for (const id of GROUP_IDS) {
    const units = battle.groups[id]
    if (unitsSize(units) === 0) continue
    const order = orders[id] ?? 'hold'
    const effect = ORDER_EFFECT[order]
    const power = groupPower(units, order, battle.terrain)

    if (order === 'shoot' && power.ranged === 0) {
      log.push(`${GROUP_LABELS[id]}: стрелять нечем.`)
    }
    if (order === 'flank' && !engaged) {
      // Обход работает, только когда врага кто-то держит перед собой.
      log.push(`${GROUP_LABELS[id]} заходит в пустоту: враг не связан боем.`)
      attack += power.attack * effect.attack * 0.4
    } else {
      attack += power.attack * effect.attack
    }
    defense += power.defense * effect.defense
  }

  const commandBonus = 1 + context.command / 120
  const fatiguePenalty = 1 - battle.fatigue / 250
  const moraleFactor = 0.6 + battle.morale / 250
  attack *= commandBonus * fatiguePenalty * moraleFactor
  defense *= commandBonus * fatiguePenalty * moraleFactor

  // Враг: простой выбор — сильный лезет вперёд, слабый держится, разбитый пятится.
  const enemyOrder = chooseEnemyOrder(battle)
  const enemyPower = groupPower(battle.enemy.units, enemyOrder, battle.terrain)
  const enemyEffect = ORDER_EFFECT[enemyOrder]
  const enemyMoraleFactor = 0.6 + battle.enemy.morale / 250
  const enemyFatiguePenalty = 1 - battle.enemy.fatigue / 250
  const enemyAttack =
    enemyPower.attack * enemyEffect.attack * enemyMoraleFactor * enemyFatiguePenalty
  const enemyDefense =
    enemyPower.defense * enemyEffect.defense * enemyMoraleFactor * enemyFatiguePenalty

  log.push(`${battle.enemy.name}: ${ORDER_LABELS[enemyOrder].toLowerCase()}.`)

  // Потери: доля от численности, а не абсолютные числа.
  const [swing, afterSwing] = variance(generator, 0.15)
  generator = afterSwing
  const [enemySwing, afterEnemySwing] = variance(generator, 0.15)
  generator = afterEnemySwing

  const enemyLossShare = lossShare(attack * swing, enemyDefense)
  const ownLossShare = lossShare(enemyAttack * enemySwing, defense)

  const enemySize = unitsSize(battle.enemy.units)
  const ownSize = groupsSize(battle.groups)
  const [enemyRolled, afterEnemyRound] = roundLosses(enemySize * enemyLossShare, generator)
  generator = afterEnemyRound
  const [ownRolled, afterOwnRound] = roundLosses(ownSize * ownLossShare, generator)
  generator = afterOwnRound
  const enemyLosses = Math.min(enemySize, enemyRolled)
  const ownLosses = Math.min(ownSize, ownRolled)

  const [enemyUnits] = takeLosses(battle.enemy.units, enemyLosses, generator)
  const [groups, afterOwn] = takeGroupLosses(battle.groups, ownLosses, orders, generator)
  generator = afterOwn

  log.push(
    ownLosses > 0 || enemyLosses > 0
      ? `Раунд ${round}: их потери ${enemyLosses}, наши ${ownLosses}.`
      : `Раунд ${round}: сошлись, но никто не дрогнул.`,
  )

  // Потери бьют по духу сильнее, чем по численности: строй ломается раньше,
  // чем кончаются люди. Сравниваем доли, а не головы: двое из троих — разгром,
  // двое из сотни — царапина.
  const MORALE_PER_LOSS = 35
  const ownShare = ownSize > 0 ? ownLosses / ownSize : 0
  const enemyShare = enemySize > 0 ? enemyLosses / enemySize : 0
  const morale = clampMorale(
    battle.morale -
      ownShare * MORALE_PER_LOSS +
      (enemyShare > ownShare ? 4 : 0) -
      outnumberedPenalty(ownSize, enemySize),
  )
  const enemyMorale = clampMorale(
    battle.enemy.morale -
      enemyShare * MORALE_PER_LOSS +
      (ownShare > enemyShare ? 4 : 0) -
      outnumberedPenalty(enemySize, ownSize),
  )

  const nextEnemy: BattleSide = {
    ...battle.enemy,
    units: enemyUnits,
    morale: enemyMorale,
    fatigue: Math.min(100, battle.enemy.fatigue + 8),
  }

  let outcome: BattleOutcome = 'ongoing'
  if (unitsSize(enemyUnits) === 0 || enemyMorale < ROUT_MORALE) outcome = 'won'
  if (groupsSize(groups) === 0 || morale < ROUT_MORALE) outcome = 'lost'
  // Если дрогнули оба — побеждает тот, кто держится крепче.
  if (unitsSize(enemyUnits) === 0 && groupsSize(groups) === 0) outcome = 'lost'
  else if (outcome === 'lost' && (unitsSize(enemyUnits) === 0 || enemyMorale < ROUT_MORALE)) {
    outcome = morale > enemyMorale ? 'won' : 'lost'
  }

  let spoils = battle.spoils
  if (outcome === 'won') {
    const [captured, afterCapture] = capture(nextEnemy, battle.enemyStart, generator)
    generator = afterCapture
    spoils = captured
    log.push(
      spoils.prisoners > 0
        ? `Поле за нами. Пленных: ${spoils.prisoners}, добычи на ${spoils.money}.`
        : `Поле за нами. Добычи на ${spoils.money}.`,
    )
  } else if (outcome === 'lost') {
    log.push('Строй рассыпался. Уцелевшие бегут.')
  }

  return {
    battle: {
      ...battle,
      enemy: nextEnemy,
      groups,
      morale,
      fatigue: Math.min(100, battle.fatigue + 8),
      round,
      outcome,
      log: [...battle.log, ...log],
      spoils,
    },
    rng: generator,
  }
}

/** Попытка выйти из боя. Конные уходят, пешие теряют людей. */
export function fleeBattle(battle: Battle, rng: Rng): RoundResult {
  const mounted = unitsSize(battle.groups.flank)
  const size = groupsSize(battle.groups)
  const share = size > 0 ? mounted / size : 0
  const [roll, next] = nextFloat(rng)
  const lossShareOnFlight = Math.max(0.05, 0.3 - share * 0.25) * (0.7 + roll * 0.6)
  const losses = Math.min(size, Math.round(size * lossShareOnFlight))
  const [groups, afterLosses] = takeGroupLosses(battle.groups, losses, null, next)

  return {
    battle: {
      ...battle,
      groups,
      outcome: 'fled',
      morale: clampMorale(battle.morale - 15),
      log: [...battle.log, `Отход. Отстало и полегло ${losses}.`],
    },
    rng: afterLosses,
  }
}

// --- расчёты ---------------------------------------------------------------

function groupPower(units: Units, order: OrderId, terrain: Terrain) {
  let attack = 0
  let defense = 0
  let ranged = 0
  for (const [id, count] of Object.entries(units)) {
    const def = TROOPS[id as TroopId]
    const total = count ?? 0
    const horseFactor = def.mounted ? cavalryFactor(terrain) : 1
    attack += def.attack * total * horseFactor
    defense += def.defense * total
    ranged += def.ranged * total
  }
  // Стрельба заменяет ближний бой, а не дополняет его.
  if (order === 'shoot') attack = ranged * 1.1
  return { attack, defense, ranged }
}

/** Конница хороша в поле и бесполезна в горах и болотах. */
function cavalryFactor(terrain: Terrain): number {
  if (terrain === 'plains' || terrain === 'steppe') return 1.2
  if (terrain === 'mountains' || terrain === 'marsh' || terrain === 'forest') return 0.65
  return 1
}

/**
 * Доля павших за раунд.
 *
 * Числа подобраны так, чтобы бой равных шёл пять-семь раундов и стоил трети
 * отряда: короче — и приказы ничего не решают, длиннее — и раунд превращается
 * в рутину.
 */
function lossShare(attack: number, defense: number): number {
  const ratio = attack / Math.max(1, attack + defense)
  return Math.min(0.45, Math.max(0.02, ratio * 0.45))
}

function chooseEnemyOrder(battle: Battle): OrderId {
  if (battle.enemy.morale < 35) return 'fallBack'
  const enemySize = unitsSize(battle.enemy.units)
  const ownSize = groupsSize(battle.groups)
  if (enemySize > ownSize * 1.3) return 'charge'
  if (enemySize < ownSize * 0.7) return 'hold'
  return battle.round % 2 === 0 ? 'charge' : 'hold'
}

/** Потери ложатся сперва на тех, кто хуже защищён. */
function takeLosses(units: Units, losses: number, rng: Rng): [Units, Rng] {
  if (losses <= 0) return [units, rng]
  const order = Object.keys(units).sort(
    (a, b) => TROOPS[a as TroopId].defense - TROOPS[b as TroopId].defense,
  )
  const next: Record<string, number> = { ...units } as Record<string, number>
  let left = losses
  for (const id of order) {
    if (left <= 0) break
    const have = next[id] ?? 0
    const taken = Math.min(have, left)
    const rest = have - taken
    if (rest === 0) delete next[id]
    else next[id] = rest
    left -= taken
  }
  return [next, rng]
}

/** Потери по группам: кто лез вперёд, тот и получил. */
function takeGroupLosses(
  groups: Readonly<Record<GroupId, Units>>,
  losses: number,
  orders: Readonly<Record<GroupId, OrderId>> | null,
  rng: Rng,
): [Record<GroupId, Units>, Rng] {
  const exposure: Record<GroupId, number> = { vanguard: 0, archers: 0, flank: 0, reserve: 0 }
  for (const id of GROUP_IDS) {
    const size = unitsSize(groups[id])
    if (size === 0) continue
    const order = orders?.[id] ?? 'hold'
    const weight =
      order === 'charge' || order === 'flank'
        ? 1.4
        : order === 'hold'
          ? 1
          : order === 'shoot'
            ? 0.5
            : 0.35
    exposure[id] = size * (id === 'reserve' ? weight * 0.3 : weight)
  }
  const total = GROUP_IDS.reduce((sum, id) => sum + exposure[id], 0)
  const next: Record<GroupId, Units> = { ...groups }
  if (total <= 0) return [next, rng]

  let generator = rng
  let left = losses
  for (const id of GROUP_IDS) {
    if (left <= 0) break
    const share = Math.round(losses * (exposure[id] / total))
    const take = Math.min(left, share)
    const [units, after] = takeLosses(groups[id], take, generator)
    generator = after
    next[id] = units
    left -= take
  }
  return [next, generator]
}

function capture(
  enemy: BattleSide,
  enemyStart: number,
  rng: Rng,
): [{ money: number; prisoners: number }, Rng] {
  const survivors = unitsSize(enemy.units)
  const [roll, afterRoll] = nextFloat(rng)
  const prisoners = Math.round(survivors * (0.2 + roll * 0.3))
  const [lucky, afterLucky] = rollChance(afterRoll, 0.5)
  const money = Math.round(enemyStart * (lucky ? 6 : 3.5))
  return [{ money, prisoners }, afterLucky]
}

/**
 * Потери округляются броском, а не в ближайшее целое.
 *
 * Иначе доля меньше половины человека округляется в ноль, и последний
 * уцелевший становится неуязвимым: именно так один ополченец однажды перебил
 * два десятка разбойников.
 */
function roundLosses(value: number, rng: Rng): [number, Rng] {
  const whole = Math.floor(value)
  const [roll, next] = nextFloat(rng)
  return [whole + (roll < value - whole ? 1 : 0), next]
}

/** Численный перевес давит на дух сам по себе. */
function outnumberedPenalty(size: number, enemySize: number): number {
  if (size <= 0) return 0
  if (enemySize >= size * 3) return 10
  if (enemySize >= size * 2) return 6
  return 0
}

function clampMorale(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)))
}
