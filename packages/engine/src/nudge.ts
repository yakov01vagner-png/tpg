import { skillLevel } from './character'
import { NUDGE, NUDGES, NUDGE_DEFS, NUDGE_WORDS, type NudgeId, SCREEN_DEEDS } from './content/nudge'
import { sideName } from './dread'
import { PLAYER, holdingsOf } from './holding'
import { unrestOf } from './impost'
import { screensOpen } from './opening'
import { SKILLS, type SkillId } from './skills'
import type { GameState } from './state'
import { bread } from './tillage'
import { debtsOf } from './treasury'
import { warsOf } from './war'
import type { World } from './world/types'

/**
 * Что делать дальше (этап 202).
 *
 * Список заданий — самый простой способ сказать игроку, чем заняться, и самый
 * скверный: он превращает песочницу в очередь и врёт о том, чем игра является.
 *
 * Здесь совет выводится из состояния: где пусто, там о нём и говорят. Совет
 * ничего не меняет и ни к чему не обязывает — он только называет то, что и так
 * видно тому, кто умеет читать свои же экраны.
 */

export interface Nudge {
  readonly id: NudgeId
  readonly side: string
  readonly why: string
  /** Чего это будет стоить, если не слушать. Пусто — ничего сверх обычного. */
  readonly costs: string | null
  readonly says: string
}

/** Что делать дальше — из мира, а не из списка (Дл1, Дл2, Дл4). */
export function nudgesNow(state: GameState, world: World, day: number): readonly Nudge[] {
  const money = state.character.money
  const owed = debtsOf(state).reduce((sum, one) => sum + one.owed, 0)
  const wars = warsOf(state.politics, PLAYER)
  const mine = holdingsOf(state.settlements, PLAYER)
  const unrest = mine.length > 0 ? unrestOf(state, world, day).score : 0
  const hungry = mine.length > 0 ? bread(state, world, day).hungry : []
  const idle = (Object.keys(SKILLS) as SkillId[]).filter(
    (id) => skillLevel(state.character, id) === 0,
  ).length
  const seen = Object.keys(state.marks ?? {}).length
  const heirs = state.character.family.children.length
  const rows: Record<NudgeId, { on: boolean; why: string; costs: string | null }> = {
    coin: {
      on: money < NUDGE.poorAt,
      why: `в кошеле ${money}, а нанять и купить не на что`,
      costs: null,
    },
    debt: {
      on: owed > 0,
      // Долг — единственный совет с настоящей ценой молчания: он растёт сам.
      why: `должен ${owed}, и долг растёт сам`,
      costs: 'долг растёт и без твоего участия',
    },
    war: {
      on: wars.length > 0,
      why: `войн идёт ${wars.length}: ${wars
        .map((one) => sideName(world, one.a === PLAYER ? one.b : one.a))
        .join(', ')}`,
      costs: 'война идёт и без тебя, и счёт её растёт',
    },
    land: {
      on: hungry.length > 0,
      why: `мест без хлеба ${hungry.length}`,
      costs: 'голодное место пустеет само',
    },
    folk: {
      on: unrest >= NUDGE.angryAt,
      why: `недовольство ${unrest}`,
      costs: 'недовольство зреет и без напоминаний',
    },
    learn: { on: idle > 0, why: `нетронутых умений ${idle}`, costs: null },
    road: { on: seen < NUDGE.seenEnough, why: `видено мест ${seen}`, costs: null },
    kin: { on: mine.length > 0 && heirs === 0, why: 'наследника нет, а земля есть', costs: null },
  }
  const out: Nudge[] = []
  const sides = new Set<string>()
  for (const id of NUDGES) {
    const row = rows[id]
    if (!row.on) continue
    const def = NUDGE_DEFS[id]
    // Два совета об одном и том же — это один совет, повторённый дважды.
    if (sides.has(def.side)) continue
    sides.add(def.side)
    out.push({
      id,
      side: def.side,
      why: row.why,
      costs: row.costs,
      says: `${def.label}: ${def.about} Почему сейчас: ${row.why}.${
        row.costs ? ` Не станешь — ${row.costs}.` : ''
      }`,
    })
    if (out.length >= NUDGE.shows) break
  }
  return out
}

/**
 * Совет ничего не назначает (Дл3).
 *
 * Проверяемое обещание, а не слово: совет читает состояние и не трогает его, а
 * цена бездействия называется только там, где она есть и без совета, — долг,
 * война, голод, недовольство. Ни одного срока, заведённого ради подсказки.
 */
export function ignoring(
  state: GameState,
  world: World,
  day: number,
): { readonly free: number; readonly costly: number; readonly says: string } {
  const rows = nudgesNow(state, world, day)
  const costly = rows.filter((one) => one.costs !== null)
  return {
    free: rows.length - costly.length,
    costly: costly.length,
    says: `${NUDGE_WORDS.free} Советов ${rows.length}, из них без всякой цены ${
      rows.length - costly.length
    }; у остальных цена та же, что была бы и без совета: ${
      costly.map((one) => one.costs).join('; ') || '—'
    }.`,
  }
}

/** Нужное — в один жест (Дл5). */
export function oneGesture(
  state: GameState,
  world: World,
  day: number,
): readonly { readonly screen: string; readonly deed: string }[] {
  const open = screensOpen(state, world, day).open
  const first = nudgesNow(state, world, day)
  const bySide: Record<string, string> = {
    way: 'self',
    news: 'none',
    realm: 'land',
    talks: 'sword',
    war: 'sword',
    court: 'people',
    house: 'people',
    growth: 'self',
  }
  return open.map((screen) => {
    // Экран называет своё срочное дело, а не чужое: если по его части ничего
    // не горит, стоит то, ради чего этот экран вообще открыт.
    const found = first.find((one) => one.side === bySide[screen])
    return {
      screen,
      deed: found
        ? NUDGE_DEFS[found.id].label
        : (SCREEN_DEEDS[screen as keyof typeof SCREEN_DEEDS] ?? 'ничего срочного'),
    }
  })
}

/** Подсказка в числах (Дл6). */
export function nudgeRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly shown: number
  readonly sides: number
  readonly free: number
  readonly says: string
} {
  const rows = nudgesNow(state, world, day)
  const sides = new Set(rows.map((one) => one.side)).size
  const free = rows.filter((one) => one.costs === null).length
  return {
    shown: rows.length,
    sides,
    free,
    says: `${NUDGE_WORDS.world} Советов ${rows.length} о ${sides} разных сторонах жизни, из них ни к чему не обязывают ${free}. ${NUDGE_WORDS.why} ${NUDGE_WORDS.one}`,
  }
}
