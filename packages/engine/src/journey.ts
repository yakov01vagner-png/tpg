import type { Party } from './party'
import { partySize, troopCount } from './party'
import type { World } from './world/types'

/**
 * Путь между местами.
 *
 * До 0.4 перемещение было мгновенным: одна команда — время скакнуло, герой уже
 * на месте. Из этого следовало всё остальное: засаду разыгрывали в точке
 * прибытия, отряд нельзя было встретить в пути, войско проходило мимо, пока ты
 * стоял в деревне. Теперь между местами можно находиться: дорога занимает часы,
 * и эти часы идут вместе с миром.
 *
 * Дружины и караваны шли так всегда (`band.travel`, `enterprise.travel`) —
 * герой был единственным, кто перескакивал.
 */
export interface Journey {
  readonly fromId: string
  readonly toId: string
  /** Сколько часов занимает весь отрезок для этого отряда. */
  readonly hours: number
  /** Сколько часов уже прошли. */
  readonly done: number
}

/** Доля пройденного, 0..1: ею и заполняется полоса. */
export function journeyProgress(journey: Journey): number {
  if (journey.hours <= 0) return 1
  return Math.max(0, Math.min(1, journey.done / journey.hours))
}

/** Сколько часов осталось идти. */
export function journeyLeft(journey: Journey): number {
  return Math.max(0, journey.hours - journey.done)
}

/**
 * Насколько отряд медленнее одиночки.
 *
 * Пеший обоз тянется, конный идёт вдвое быстрее, раненый задерживает всех.
 * Число берётся до выхода и показывается игроку: выбор «взять ли ещё сотню
 * ополчения» должен быть виден в часах, а не только в силе.
 */
export function paceOf(party: Party, wounded: boolean): number {
  const people = partySize(party)
  if (people === 0) return wounded ? 1.35 : 1
  const horses = troopCount(party, 'horseman')
  const mounted = horses / people
  // Конные идут быстрее пеших, но обоз равняется по самому медленному: полностью
  // конный отряд выигрывает треть времени, наполовину конный — шестую часть.
  const speed = 1 - mounted * 0.33
  // Большая толпа растягивается на дороге: полсотни человек идут на пятую часть
  // дольше десятка.
  const crowd = 1 + Math.min(0.35, people / 150)
  return Math.round(speed * crowd * (wounded ? 1.35 : 1) * 100) / 100
}

/** Часы отрезка для этого отряда: дорога плюс то, кто по ней идёт. */
export function legHoursFor(roadHours: number, pace: number): number {
  return Math.max(1, Math.round(roadHours * pace))
}

/** Куда ведёт этот путь — словами. */
export function describeJourney(world: World, journey: Journey): string {
  const to = world.locations[journey.toId]?.name ?? 'неизвестно куда'
  return `в ${to}`
}
