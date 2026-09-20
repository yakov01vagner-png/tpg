import {
  NOT_OUR_VOICE,
  TELLING,
  TELLING_DEFS,
  TELLING_WORDS,
  type TellingId,
} from './content/telling'
import { PLAYER, holdingsOf } from './holding'
import type { Line, Screen } from './screens'
import type { GameState } from './state'
import { DAYS_PER_YEAR } from './time'
import { warsOf } from './war'
import type { World } from './world/types'

/**
 * Мир говорит словами (этап 203).
 *
 * Событие было строкой лога: «Набег. Потеряно 12 человек». Такая строка
 * сообщает, но не рассказывает — в ней нет ни причины, ни того, что из неё
 * вышло, — а двадцатый набег звучал ровно как первый.
 *
 * Здесь у события появляется рассказ: зачин, причина из мира, само дело и
 * последствие. Ничего не разыгрывается: какой зачин достанется этому набегу,
 * решает счёт прежних, а не кубик, — оттого рассказ повторяется так же редко,
 * как повторяется положение.
 */

/**
 * Рассказать событие (Тк1, Тк2).
 *
 * `times` — сколько такого уже было: он и разводит слова. Первый набег и
 * двадцатый берут разные зачины, и два подряд одинаковыми не выйдут.
 */
export function tell(
  id: TellingId,
  what: string,
  why: string,
  times: number,
  day: number,
): { readonly opens: string; readonly ends: string; readonly says: string } {
  const def = TELLING_DEFS[id]
  const opens = def.opens[times % def.opens.length] as string
  // Концовка меняется реже зачина — раз в круг зачинов: иначе они ходили бы
  // парой и всех рассказов было бы столько же, сколько зачинов, а не вчетверо
  // больше.
  const ends = def.ends[Math.floor(times / def.opens.length) % def.ends.length] as string
  return {
    opens,
    ends,
    says: `${opens}. ${what} Причина: ${why}. Дальше — ${ends}.`,
  }
}

/** Сколько всего разных рассказов выходит на один повод (Тк6). */
export function tellings(id: TellingId): number {
  const def = TELLING_DEFS[id]
  return def.opens.length * def.ends.length
}

/** Итог года словами (Тк3). */
export function yearTold(state: GameState, world: World, day: number): string {
  const year = Math.floor(day / DAYS_PER_YEAR)
  const mine = holdingsOf(state.settlements, PLAYER)
  const wars = warsOf(state.politics, PLAYER).length
  const what = `${year}-й год: мест под твоей рукой ${mine.length}, войн ${wars}, серебра ${state.character.money}.`
  const why =
    wars > 0
      ? 'война берёт людей и серебро быстрее, чем земля их даёт'
      : mine.length > 0
        ? 'год без войны — год, когда считают, а не тратят'
        : 'пока нет ни земли, ни войны, год меряется дорогой'
  return tell('harvest', what, why, year, day).says
}

/** Итог жизни словами (Тк3). */
export function lifeTold(state: GameState, world: World, day: number): string {
  const years = Math.floor(day / DAYS_PER_YEAR)
  const mine = holdingsOf(state.settlements, PLAYER)
  const heirs = state.character.family.children.length
  const what = `Прожито ${years} лет; оставлено мест ${mine.length}, детей ${heirs}, битв выиграно ${state.battlesWon}.`
  const why = heirs > 0 ? 'есть кому оставить' : 'оставить некому, и это знают соседи'
  return tell('death', what, why, years, day).says
}

/**
 * Числа, у которых нет объяснения (Тк4).
 *
 * Не описание правила, а проверка: экран отдаёт строки, и у всякой строки с
 * числом обязан быть `hint`. Что не объяснено — здесь и выйдет списком.
 */
export function numbersBare(screens: readonly Screen[]): readonly string[] {
  const bare: string[] = []
  for (const screen of screens) {
    for (const line of screen.lines as readonly Line[]) {
      if (line.hint === undefined || line.hint.trim() === '') {
        bare.push(`${screen.id}: ${line.label}`)
      }
    }
  }
  return bare
}

/**
 * Чужой голос (Тк5).
 *
 * Канцелярит и пафос ищутся по словам, а не по вкусу: список лежит в
 * содержимом, и всякий, кто напишет «осуществляется», увидит это в проверке.
 */
export function notOurVoice(text: string): readonly string[] {
  const lower = text.toLowerCase()
  return NOT_OUR_VOICE.filter((one) => lower.includes(one))
}

/** Текст в числах (Тк6). */
export function tellingRoll(): {
  readonly kinds: number
  readonly least: number
  readonly says: string
} {
  const ids = Object.keys(TELLING_DEFS) as TellingId[]
  const counts = ids.map((id) => tellings(id))
  return {
    kinds: ids.length,
    least: Math.min(...counts),
    says: `${TELLING_WORDS.story} ${TELLING_WORDS.fresh} Поводов ${ids.length}, разных рассказов на каждый не меньше ${Math.min(
      ...counts,
    )}; подряд одинаковых не бывает (проверяется окном в ${TELLING.window}). ${TELLING_WORDS.voice}`,
  }
}
