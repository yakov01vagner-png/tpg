/**
 * Публичный вход в ядро симуляции.
 *
 * Правило пакета: здесь нет и не должно появиться ни одного импорта из React,
 * React Native или платформенных API. Всё, что отсюда экспортируется, обязано
 * одинаково работать в приложении и в Node — иначе серверную версию мира
 * (п.2 дизайн-документа) придётся писать заново.
 */
export * from './attributes'
export * from './biography'
export * from './character'
export * from './commands'
export * from './content'
export * from './place'
export * from './events'
export * from './magic'
export * from './progression'
export * from './rng'
export * from './save'
export * from './skills'
export * from './state'
export * from './time'
export * from './world/types'
export * from './world/queries'
export * from './world/generate'
