import type { MagicRankId } from './magic'
import { MAGIC_RANKS } from './magic'
import type { SkillId } from './skills'
import { SKILLS } from './skills'

/**
 * События — единственный способ, которым движок рассказывает о результате
 * команды. UI не считает ничего сам: он рисует то, что пришло в событиях.
 */
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
  | { readonly type: 'notice'; readonly text: string }

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
