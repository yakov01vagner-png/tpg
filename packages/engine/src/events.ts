import type { MagicRankId } from './magic'
import { MAGIC_RANKS } from './magic'
import type { SkillId } from './skills'
import { SKILLS } from './skills'

/**
 * События — единственный способ, которым движок рассказывает о результате
 * команды. UI не считает ничего сам: он рисует то, что пришло в событиях.
 */
/**
 * Вид записи журнала. По нему лента ставит знак и группирует: деньги отдельно
 * от войны, война отдельно от людей. Виды — это то, о чём мир вообще умеет
 * рассказывать, поэтому список короткий и закрытый.
 */
export type LogKind =
  | 'money'
  | 'skill'
  | 'level'
  | 'rank'
  | 'war'
  | 'plague'
  | 'world'
  | 'people'
  | 'trade'
  | 'notice'

export const LOG_KIND_LABELS: Record<LogKind, string> = {
  money: 'деньги',
  skill: 'навык',
  level: 'уровень',
  rank: 'ранг',
  war: 'война',
  plague: 'мор',
  world: 'мир',
  people: 'люди',
  trade: 'дело',
  notice: 'событие',
}

export function kindOf(event: GameEvent): LogKind {
  switch (event.type) {
    case 'money':
      return 'money'
    case 'skillUp':
      return 'skill'
    case 'levelUp':
      return 'level'
    case 'rankGranted':
    case 'examFailed':
      return 'rank'
    case 'notice':
      return event.kind ?? 'notice'
    default:
      return 'notice'
  }
}

export type GameEvent =
  | { readonly type: 'timeAdvanced'; readonly minutes: number }
  | { readonly type: 'money'; readonly delta: number }
  | { readonly type: 'fatigue'; readonly delta: number }
  | { readonly type: 'skillUp'; readonly skill: SkillId; readonly level: number }
  | {
      readonly type: 'levelUp'
      readonly level: number
      readonly skillPoints: number
      readonly attributePoints: number
    }
  | { readonly type: 'rankGranted'; readonly rank: MagicRankId }
  | { readonly type: 'examFailed'; readonly rank: MagicRankId }
  | { readonly type: 'notice'; readonly text: string; readonly kind?: LogKind }

/**
 * Текст для лога. Возвращает null для событий, которые не стоит проговаривать
 * отдельной строкой (их видно по шапке экрана).
 */
export function describeEvent(event: GameEvent): string | null {
  switch (event.type) {
    case 'timeAdvanced':
    case 'fatigue':
      return null
    case 'money':
      return event.delta >= 0
        ? `Получено ${event.delta} монет.`
        : `Потрачено ${Math.abs(event.delta)} монет.`
    case 'skillUp':
      return `${SKILLS[event.skill].label}: уровень ${event.level}.`
    case 'levelUp': {
      const parts = [`Уровень ${event.level}.`]
      if (event.skillPoints > 0) parts.push(`Очков навыков: +${event.skillPoints}.`)
      if (event.attributePoints > 0) parts.push(`Очков атрибутов: +${event.attributePoints}.`)
      return parts.join(' ')
    }
    case 'rankGranted':
      return `Присвоен ранг: ${MAGIC_RANKS[event.rank].label}.`
    case 'examFailed':
      return `Испытание на ранг «${MAGIC_RANKS[event.rank].label}» не пройдено.`
    case 'notice':
      return event.text
  }
}
