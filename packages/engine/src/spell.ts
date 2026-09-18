import type { Character } from './character'
import { skillLevel } from './character'
import type { SpellDef, SpellFamily, SpellWhere } from './content/spells'
import { SPELLS } from './content/spells'

/**
 * Что маг умеет (этап 41).
 *
 * Заклинания открываются навыком: всё, до чего дорос, — твоё, без списка
 * выученного и без книги. Это нарочно просто: книга заклинаний — ещё одно
 * состояние, которому есть чему рассинхронизироваться, а навык уже лежит в
 * персонаже и уже растёт.
 */
export function knownSpells(character: Character): readonly SpellDef[] {
  const magic = skillLevel(character, 'magic')
  return SPELLS.filter((spell) => spell.requiredSkill <= magic)
}

/** Заклинания, которые творят здесь: на дороге, в море, у костра, на месте. */
export function spellsFor(character: Character, where: SpellWhere): readonly SpellDef[] {
  return knownSpells(character).filter(
    (spell) => spell.where === where || (spell.where === 'anywhere' && where !== 'battle'),
  )
}

/**
 * Сильнейшее из известных в этом роду: этим маг и бьёт в бою.
 *
 * Приказ кругу — «огонь», «порча», «оберег» — один и тот же на всех ступенях,
 * а что за ним стоит, решает навык: искра у неофита, солнечное копьё у
 * архимага. Так бой читает содержимое, а не ветвится по рангам.
 */
export function bestSpell(character: Character, family: SpellFamily): SpellDef | null {
  let best: SpellDef | null = null
  for (const spell of knownSpells(character)) {
    if (spell.family !== family || spell.where !== 'battle') continue
    if (!best || spell.requiredSkill > best.requiredSkill) best = spell
  }
  return best
}

/** Сила заклинания в бою: единица — «огненный шар» подмастерья. */
export function battlePower(character: Character, family: 'fire' | 'curse' | 'ward'): number {
  const spell = bestSpell(character, family)
  if (!spell) return 0
  const effect = spell.effect
  return effect.kind === 'damage' || effect.kind === 'fear' || effect.kind === 'ward'
    ? effect.power
    : 0
}

/**
 * Удаётся ли заклинание.
 *
 * Впритык к порогу удаётся через раз, с запасом в пятнадцать ступеней — почти
 * всегда. Неудача стоит того же, что удача: усталость и время уходят, чуда нет.
 * Это и есть цена (DESIGN.md, п.4): магия дорога, иначе она съедает остальную
 * игру.
 */
export function castChance(magicSkill: number, spell: SpellDef): number {
  const margin = Math.min(1, Math.max(0, (magicSkill - spell.requiredSkill) / 15))
  return 0.5 + 0.45 * margin
}
