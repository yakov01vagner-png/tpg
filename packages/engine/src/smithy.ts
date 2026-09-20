import type { EquippedItem } from './content/equipment'
import { ITEMS_BY_ID } from './content/equipment'
import { SMITHY, SMITHY_WORDS } from './content/smithy'
import { qualityFactor, qualityLabel } from './craft'
import type { GameState } from './state'
import { yearOf } from './time'
import type { World } from './world/types'

/**
 * Ремесло и вещи (этап 179).
 *
 * С этапа 50 у выкованной вещи есть клеймо: чья работа, где и какова. Дальше
 * этого дело не шло: вещь не помнила ни года, ни починок; мастер был строкой с
 * умением; заказать у него было нельзя, а разницы между добрым железом и
 * плохим нигде не было видно словами.
 *
 * Здесь у вещи появляется история, у мастера — имя и слава, а у заказа — цена и
 * срок. Ни одной новой сущности: клеймо то же, мастер тот же, качество то же.
 */

/** История вещи (Рм1, Рм2). */
export function storyOf(
  item: EquippedItem,
  day: number,
): { readonly line: string; readonly state: 'new' | 'worn' | 'ruined' } {
  const def = ITEMS_BY_ID[item.id]
  const mark = item.mark
  const shape = item.condition >= 85 ? 'new' : item.condition >= SMITHY.poorAt ? 'worn' : 'ruined'
  const parts: string[] = [def?.label ?? item.id]
  if (mark) {
    // Имена не склоняются нарочно: клеймо и в жизни пишут как есть.
    parts.push(`клеймо: ${mark.maker}, ${mark.place}`)
    parts.push(qualityLabel(mark.quality))
    const madeDay = (mark as { readonly day?: number }).day
    if (madeDay !== undefined) parts.push(`${yearOf(madeDay)}-й год`)
    const repairs = (mark as { readonly repairs?: number }).repairs ?? 0
    if (repairs > 0) parts.push(`починок ${repairs}`)
  } else {
    parts.push(SMITHY_WORDS.cheap)
  }
  parts.push(`состояние ${item.condition}`)
  return {
    line: `${parts.join('; ')}. ${
      shape === 'new'
        ? SMITHY_WORDS.new
        : shape === 'worn'
          ? SMITHY_WORDS.worn
          : SMITHY_WORDS.ruined
    }`,
    state: shape,
  }
}

/** Сколько вещь теряет за бой и за год (Рм2). */
export function wearAfter(item: EquippedItem, fights: number, years: number): number {
  const keeps = 1 + (item.mark?.quality ?? 0) * 0.12
  const worn = (fights * SMITHY.wearPerFight + years * SMITHY.wearPerYear) / keeps
  return Math.max(0, Math.round(item.condition - worn))
}

/**
 * Мастер как человек (Рм3).
 *
 * Имя и нрав у него с этапа 50; здесь к ним прибавляется слава — она считается
 * из того, сколько его клейм ходит по миру, — и то, берётся ли он за заказ.
 */
export function masterFame(state: GameState, maker: string): number {
  let marks = 0
  for (const slot of Object.values(state.character.equipment)) {
    if (slot?.mark?.maker === maker) marks += 1
  }
  return marks
}

/** Заказ: цена, срок и каково выйдет (Рм4). */
export function orderPrice(
  itemId: string,
  masterQuality: number,
): {
  readonly cost: number
  readonly days: number
  readonly quality: number
  readonly says: string
} {
  const def = ITEMS_BY_ID[itemId]
  const cost = Math.round((def?.price ?? 100) * SMITHY.orderCosts)
  const quality = Math.max(0, Math.min(4, masterQuality + SMITHY.orderQuality))
  return {
    cost,
    days: SMITHY.orderDays,
    quality,
    says: `${def?.label ?? itemId} на заказ: ${cost} серебра и ${SMITHY.orderDays} сут. Выйдет — ${qualityLabel(quality)}. ${SMITHY_WORDS.order}`,
  }
}

/** Чего стоит хорошее железо там, где это видно (Рм5). */
export function worthOf(item: EquippedItem): {
  readonly inFight: number
  readonly says: string
} {
  const quality = item.mark?.quality
  const factor = qualityFactor(quality)
  const worn = item.condition < SMITHY.poorAt ? 0.5 : item.condition / 100
  const inFight = Math.round(factor * worn * 100) / 100
  return {
    inFight,
    says: `${qualityLabel(quality ?? 0)}: в бою ×${factor}, с нынешним состоянием ×${inFight}.${
      item.condition < SMITHY.poorAt ? ' Изношенная вещь бьёт вполсилы.' : ''
    }`,
  }
}

/** Ремесло в числах (Рм6). */
export function smithyRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly marked: number
  readonly quality: number
  readonly condition: number
  readonly says: string
} {
  const rows = Object.values(state.character.equipment).filter(
    (one): one is EquippedItem => one !== undefined,
  )
  const marked = rows.filter((one) => one.mark !== undefined)
  const quality =
    marked.length === 0
      ? 0
      : Math.round(
          (marked.reduce((sum, one) => sum + (one.mark?.quality ?? 0), 0) / marked.length) * 10,
        ) / 10
  const condition =
    rows.length === 0
      ? 0
      : Math.round(rows.reduce((sum, one) => sum + one.condition, 0) / rows.length)
  return {
    marked: marked.length,
    quality,
    condition,
    says:
      rows.length === 0
        ? 'На тебе ничего нет.'
        : `Вещей ${rows.length}, из них с клеймом ${marked.length}; среднее качество ${quality}, состояние ${condition}.`,
  }
}
