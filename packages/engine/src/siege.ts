import { lordTemper } from './castle'
import { BREACH_RELIEF, BRIBE_PER_HEAD, SAP_DAYS, type SiegeMove } from './content/field'
import type { Settlement } from './economy'
import { garrisonSize } from './holding'
import { foodSecurity } from './life'
import { lordRep } from './reputation'
import type { GameState } from './state'
import { lordById } from './war'

/**
 * Осада как дело, а не отсчёт (этап 58, Б2).
 *
 * До 0.6 осада была тремя кнопками: стоять, лезть, уйти. Стоять означало
 * умножить чужие запасы на число меньше единицы. Теперь под стенами есть чем
 * заняться и есть чем рискнуть: подкоп роняет кладку, но роняет и копателей;
 * переговоры берут город без крови, если в нём уже нечего есть; за ворота
 * можно заплатить, и цена — по тому, сколько теряет тот, кто их откроет.
 * Гарнизон при этом не сидит: он делает вылазки.
 */
export interface Siege {
  readonly locationId: string
  readonly days: number
  /** Сколько суток ведут подкоп. */
  readonly sapDays?: number
  /** Села ли кладка. */
  readonly breached?: boolean
}

/** Во сколько раз стены помогают обороне: пролом снимает большую часть помощи. */
export function wallsUnderSiege(walls: number, siege: Siege): number {
  if (!siege.breached) return walls
  return Math.max(1, walls - (walls - 1) * BREACH_RELIEF)
}

/** Сколько суток осталось копать. */
export function sapLeft(siege: Siege): number {
  if (siege.breached) return 0
  return Math.max(0, SAP_DAYS - (siege.sapDays ?? 0))
}

/**
 * Насколько гарнизон готов слушать о сдаче.
 *
 * Голод, пролом и время под стенами — три довода. Сытый гарнизон за целыми
 * стенами не слушает ничего.
 */
export function surrenderChance(settlement: Settlement, siege: Siege): number {
  const hunger = 1 - foodSecurity(settlement)
  const chance = hunger * 0.7 + (siege.breached ? 0.25 : 0) + Math.min(0.2, siege.days / 120)
  return Math.max(0, Math.min(0.9, chance - 0.1))
}

/** Цена измены: платят тому, кому есть что терять. */
export function bribePrice(state: GameState, settlement: Settlement): number {
  const heads = Math.max(4, garrisonSize(settlement))
  const lord = settlement.owner ? lordById(state.politics, settlement.owner) : null
  const temper = lord ? lordTemper(lord) : 'shrewd'
  // У скупого хозяина ворота дешевле: его люди не слишком ему должны.
  const loyalty = temper === 'greedy' ? 0.7 : temper === 'jovial' ? 0.85 : 1
  const sated = 0.6 + foodSecurity(settlement) * 0.8
  return Math.round(heads * BRIBE_PER_HEAD * loyalty * sated)
}

/**
 * Откроют ли ворота за серебро.
 *
 * Голодному гарнизону измена кажется разумной; сытому — нет. Милость хозяина к
 * тебе тоже считается: у того, кого в городе уважают, находятся охотники.
 */
export function bribeChance(state: GameState, settlement: Settlement, siege: Siege): number {
  const hunger = 1 - foodSecurity(settlement)
  const known = settlement.owner ? lordRep(state.reputation, settlement.owner) : 0
  const chance = 0.2 + hunger * 0.45 + Math.min(0.15, siege.days / 160) - known / 400
  return Math.max(0.05, Math.min(0.85, chance))
}

/** Пойдёт ли гарнизон на вылазку в эти сутки. */
export function sallyChance(settlement: Settlement, siege: Siege): number {
  // Вылазку делают, пока есть силы: голодные сидят за стенами до конца.
  const strength = foodSecurity(settlement)
  const garrison = garrisonSize(settlement)
  if (garrison < 6) return 0
  return Math.max(
    0,
    Math.min(0.5, strength * 0.22 + (siege.sapDays ?? 0) * 0.04 - siege.days / 400),
  )
}

/** Какие ходы под стенами вообще есть. */
export function siegeMoves(state: GameState, siege: Siege): readonly SiegeMove[] {
  const settlement = state.settlements[siege.locationId]
  if (!settlement) return ['lift']
  const moves: SiegeMove[] = ['wait', 'sap', 'parley', 'bribe', 'assault', 'lift']
  if (siege.breached) return moves.filter((move) => move !== 'sap')
  return moves
}
