import { GROUNDS, type Ground, type GroundId, ORDER_NEEDS, TERRAIN_GROUND } from './content/field'
import type { GoodId } from './content/goods'
import { TROOPS, type TroopId } from './content/troops'
import type { Terrain } from './world/types'

/**
 * Место боя и всё, что из него следует (этап 58).
 *
 * Здесь считается то, чего раньше не было: сколько людей вообще доходит до
 * сшибки. Остальное — трофеи, раненые и ветераны — живёт рядом, потому что
 * держится на тех же числах: кто дошёл, кто уцелел, кто помнит прошлый бой.
 */

export function groundOf(id: GroundId | undefined): Ground {
  return GROUNDS[id ?? 'open']
}

/** Где случится бой: у стен — у стен, в дороге — по земле. */
export function groundFor(terrain: Terrain, kind: 'road' | 'walls' | 'camp'): GroundId {
  if (kind === 'walls') return 'walls'
  if (kind === 'camp') return 'camp'
  return TERRAIN_GROUND[terrain]
}

/**
 * Какая доля войска дерётся, а какая стоит за спинами.
 *
 * Это и есть главное правило поля: строй шириной в тридцать человек не
 * становится шире от того, что за ним стоит триста. Малому отряду узкое место
 * возвращает то, чего у него нет, — число.
 */
export function engagedShare(ground: Ground, size: number): number {
  if (size <= 0) return 0
  return Math.min(1, ground.frontage / size)
}

/** Открыт ли приказ при таком командовании. */
export function orderAllowed(order: string, command: number): boolean {
  return command >= (ORDER_NEEDS[order] ?? 0)
}

export function orderNeeds(order: string): number {
  return ORDER_NEEDS[order] ?? 0
}

/**
 * Ветераны (этап 58, Б5).
 *
 * Отряд помнит бои. Человек, однажды переживший сшибку, стоит в строю крепче
 * новобранца и бежит позже: доля ветеранов множит силу и держит дух. Сами
 * ветераны — число в отряде, а не разряд у каждого: один бой делает ветераном
 * всякого, кто с поля ушёл живым.
 */
export function veteranShare(size: number, veterans: number): number {
  if (size <= 0) return 0
  return Math.min(1, Math.max(0, veterans) / size)
}

/** Что даёт выучка боем: до пятой части силы и до трети стойкости. */
export function veteranPower(share: number): number {
  return 1 + share * 0.2
}

export function veteranNerve(share: number): number {
  return 1 - share * 0.35
}

/**
 * Трофеи по счёту (этап 58, Б3).
 *
 * Победа — это не «добычи на столько-то». С чужого строя снимают то, что на
 * нём было: с латника — железо, с обоза — хлеб, с лагеря — всё остальное.
 */
export function spoilsGoods(
  units: Readonly<Partial<Record<TroopId, number>>>,
): Partial<Record<GoodId, number>> {
  const goods: Partial<Record<GoodId, number>> = {}
  const add = (good: GoodId, amount: number) => {
    if (amount <= 0) return
    goods[good] = (goods[good] ?? 0) + amount
  }
  for (const [id, count] of Object.entries(units)) {
    const def = TROOPS[id as TroopId]
    const total = count ?? 0
    if (total <= 0) continue
    // Железо — с того, кто был в железе; чем выше разряд, тем больше снимут.
    add('weapons', Math.floor((total * def.tier) / 4))
    if (def.defense >= 8) add('iron', Math.floor((total * def.tier) / 6))
    if (def.mounted) add('leather', Math.floor(total / 2))
    // Обоз: люди шли с едой.
    add('grain', Math.floor(total / 2))
  }
  return goods
}

/**
 * Свои раненые (этап 58, Б3).
 *
 * Не всякий упавший убит. Кто держит поле — подбирает своих, кто бежит —
 * оставляет их там же, где они легли. Потому цена проигранного боя не в
 * потерях, а в том, что потери становятся окончательными.
 */
export const WOUNDED_SHARE = 0.35

export function woundedOf(
  fallen: Readonly<Partial<Record<TroopId, number>>>,
  held: boolean,
): Partial<Record<TroopId, number>> {
  if (!held) return {}
  const back: Partial<Record<TroopId, number>> = {}
  for (const [id, count] of Object.entries(fallen)) {
    const saved = Math.floor((count ?? 0) * WOUNDED_SHARE)
    if (saved > 0) back[id as TroopId] = saved
  }
  return back
}
