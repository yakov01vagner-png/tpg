import type { Command } from './commands'
import { TOWNS } from './content/availability'
import type { Activity, QuarterId } from './content/quarters'
import { QUARTERS, QUARTER_IDS, QUARTER_POPULATION } from './content/quarters'
import { orderById } from './order'
import { schoolAt } from './school'
import type { GameState } from './state'
import { lanesFrom } from './world/lanes'
import type { World } from './world/types'

/**
 * Кварталы места (этап 45).
 *
 * Выводятся из того, что в месте есть, а не хранятся: у гавани есть
 * пристань, у столицы — замок и храм, у города со школой — школа. Ворота и
 * рынок есть у всякого места, которое вообще делится на кварталы. Мелкое место
 * не делится вовсе — там всё в одном.
 */
export function quartersOf(
  state: Pick<GameState, 'world' | 'settlements'>,
  locationId: string = (state as GameState).locationId,
): readonly QuarterId[] {
  const place = state.world.locations[locationId]
  if (!place || !TOWNS.includes(place.archetype)) return []
  const population = state.settlements[locationId]?.population ?? place.population
  const big = place.archetype === 'city' || place.archetype === 'capital'
  if (!big && population < QUARTER_POPULATION) return []
  const out: QuarterId[] = ['gate', 'market']
  if (big || population >= QUARTER_POPULATION * 2) out.push('craft')
  if (big) out.push('temple')
  if (schoolAt(state.world, locationId)) out.push('school')
  // Замок — там, где сидит лорд: в столице и городе всегда, в городке — если
  // им держит не корона.
  const owner = state.settlements[locationId]?.owner ?? ''
  if (big || owner.startsWith('lord:') || owner === 'player') out.push('castle')
  if (place.archetype === 'port' || lanesFrom(state.world, locationId).length > 0) {
    out.push('harbour')
  }
  return QUARTER_IDS.filter((id) => out.includes(id))
}

/** Делится ли место на кварталы. */
export function hasQuarters(
  state: Pick<GameState, 'world' | 'settlements'>,
  locationId: string,
): boolean {
  return quartersOf(state, locationId).length > 0
}

/** Где в этом месте занимаются таким делом. Пусто — нигде особо, то есть везде. */
export function quarterFor(
  state: Pick<GameState, 'world' | 'settlements'>,
  activity: Activity,
  locationId: string,
): QuarterId | null {
  const here = quartersOf(state, locationId)
  // Ремесло без своих рядов идёт на рынок: чинят и там.
  const wanted = activity === 'craft' && !here.includes('craft') ? 'trade' : activity
  return here.find((id) => QUARTERS[id].hosts.includes(wanted)) ?? null
}

/** С чего начинают в месте: приходят к воротам. */
export function arrivalQuarter(
  state: Pick<GameState, 'world' | 'settlements'>,
  locationId: string,
): QuarterId | null {
  return hasQuarters(state, locationId) ? 'gate' : null
}

/**
 * Сколько идти из квартала в квартал.
 *
 * Стоит часов, но немного: столицу не обойдёшь за минуту, а городок — почти.
 */
export function walkMinutes(world: World, locationId: string): number {
  const kind = world.locations[locationId]?.archetype
  return kind === 'capital' ? 40 : kind === 'city' ? 30 : 15
}

/**
 * К какому делу относится команда. Пусто — дело без места: спать, ждать, идти
 * можно из любого квартала.
 */
export function activityOf(command: Command): Activity | null {
  switch (command.type) {
    case 'work':
    case 'takeQuest':
    case 'finishQuest':
    case 'deliverGoods':
    case 'startChain':
    case 'foundCaravan':
      return 'work'
    case 'study':
    case 'takeExam':
      return 'learn'
    case 'buy':
    case 'sell':
    case 'buyItem':
    // Купцы стоят на рынке, и говорят с ними там же (этап 49).
    case 'haggle':
    case 'buyFrom':
    case 'sellTo':
    case 'takeOrder':
    case 'askPrices':
      return 'trade'
    case 'craftItem':
    case 'repairItem':
    case 'foundWorkshop':
    // Цех сидит в ремесленных рядах (этап 50).
    case 'joinCech':
    case 'leaveCech':
    case 'takeApprentice':
      return 'craft'
    case 'hire':
    case 'recruitCompanion':
      return 'hire'
    // Двор лорда (этап 52): приём, дела двора, турнир и суд — в замке.
    case 'seekAudience':
    case 'courtIntrigue':
    case 'tourney':
    case 'petition':
    case 'askForFief':
    case 'inviteLord':
    case 'judge':
    case 'proposeMarriage':
    case 'takeService':
    case 'grantFief':
    case 'revokeFief':
    case 'build':
      return 'lord'
    case 'sail':
    case 'buyShip':
    case 'repairShip':
    case 'sellShip':
    case 'foundShipping':
      return 'sea'
    // Храм (этап 51): обряды, вклады и благословение — у алтаря.
    case 'rite':
    case 'donate':
      return 'order:church'
    case 'joinOrder': {
      const kind = orderById(command.orderId)?.kind
      return kind ? `order:${kind}` : null
    }
    default:
      return null
  }
}

/** Как зовётся квартал в предложении: «на рынке», «в замке». */
export function quarterWhere(id: QuarterId): string {
  switch (id) {
    case 'gate':
      return 'у ворот'
    case 'market':
      return 'на рынке'
    case 'craft':
      return 'в ремесленных рядах'
    case 'temple':
      return 'в храме'
    case 'school':
      return 'в школе'
    case 'castle':
      return 'в замке'
    case 'harbour':
      return 'на пристани'
  }
}
