import type { Party } from './party'
import { partySize, troopCount } from './party'
import type { Passage } from './ship'
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
  /**
   * Путь идёт морем (этап 35).
   *
   * Тот же путь и те же часы, но всё остальное другое: в море не встают
   * лагерем, не встречают обозов и не попадают в засаду — там шторм, штиль и
   * те, кто ходит под чёрным парусом. Необязательное поле: сухопутный путь
   * версии 0.4 остаётся сухопутным.
   */
  readonly sea?: boolean
  /** Чьим судном идут: своим, нанятым или попутным. */
  readonly manner?: Passage
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

/**
 * Шаг войска и шаг обоза.
 *
 * Те же числа, что у отряда игрока, только считать состав дружины незачем:
 * войско идёт обозом всегда. Обоз купца — ещё медленнее: телега не человек.
 */
export const ARMY_PACE = 1.35
export const WAGON_PACE = 1.5

/** Часы отрезка для этого отряда: дорога плюс то, кто по ней идёт. */
export function legHoursFor(roadHours: number, pace: number): number {
  return Math.max(1, Math.round(roadHours * pace))
}

/**
 * Путь до дальнего места: из каких отрезков он складывается.
 *
 * Дальнее место выбирается целью, а не одним нажатием: до него надо дойти через
 * то, что лежит между. Считается Дейкстрой по часам — тем же, чем считает
 * дорогу войско, — и теми же часами, которыми пойдёт этот отряд.
 */
export interface Route {
  /** Места по порядку, начиная со следующего шага и кончая целью. */
  readonly steps: readonly string[]
  /** Часы для того, кто пойдёт: дорога, умноженная на шаг отряда. */
  readonly hours: number
}

export function routeTo(world: World, fromId: string, toId: string, pace = 1): Route | null {
  if (fromId === toId) return { steps: [], hours: 0 }
  const spent = new Map<string, number>([[fromId, 0]])
  const back = new Map<string, string>()
  const queue: string[] = [fromId]
  while (queue.length > 0) {
    let bestIndex = 0
    for (let i = 1; i < queue.length; i += 1) {
      const one = queue[i] as string
      const other = queue[bestIndex] as string
      if ((spent.get(one) ?? 0) < (spent.get(other) ?? 0)) bestIndex = i
    }
    const current = queue.splice(bestIndex, 1)[0] as string
    if (current === toId) break
    const done = spent.get(current) ?? 0
    for (const road of world.roads[current] ?? []) {
      const reached = done + legHoursFor(road.hours, pace)
      const known = spent.get(road.to)
      if (known !== undefined && known <= reached) continue
      spent.set(road.to, reached)
      back.set(road.to, current)
      queue.push(road.to)
    }
  }
  if (!spent.has(toId)) return null
  const steps: string[] = []
  let current = toId
  while (current !== fromId) {
    steps.unshift(current)
    const previous = back.get(current)
    if (!previous) break
    current = previous
  }
  return { steps, hours: spent.get(toId) ?? 0 }
}

/**
 * Где идущий находится сейчас — между двумя точками карты.
 *
 * Тем же считается положение дружины и обоза: на карте видно не только тех, кто
 * стоит, но и тех, кто идёт.
 */
export function pointBetween(
  world: World,
  fromId: string,
  toId: string,
  share: number,
): { readonly x: number; readonly y: number } | null {
  const from = world.locations[fromId]
  const to = world.locations[toId]
  if (!from || !to) return null
  const part = Math.max(0, Math.min(1, share))
  return {
    x: Math.round(from.x + (to.x - from.x) * part),
    y: Math.round(from.y + (to.y - from.y) * part),
  }
}

/** Куда ведёт этот путь — словами. */
export function describeJourney(world: World, journey: Journey): string {
  const to = world.locations[journey.toId]?.name ?? 'неизвестно куда'
  return `в ${to}`
}
