import { ATTRIBUTE_IDS, ATTRIBUTE_LABELS, type AttributeId } from './attributes'
import type { Character } from './character'
import { skillLevel } from './character'
import { ROLE_DEFS } from './content/scout'
import { ATTRIBUTE_PLACES, SHEET, SHEET_WORDS, SKILL_PLACES } from './content/sheet'
import { SKILLS, SKILL_IDS, type SkillId } from './skills'

/**
 * Что на что влияет (этап 122).
 *
 * Лист героя перестаёт быть списком чисел: против каждой строки стоит её дело,
 * посчитанное здесь и сейчас. Это не украшение — это проверка. Если против
 * строки нечего написать, значит строка мёртвая, и её надо оживить, а не
 * подписать.
 */

/** Насколько это очко навыка уже работает: доля от десяти очков. */
function over(level: number): number {
  return Math.max(0, level)
}

// --- дела навыков (А1 и А2) -------------------------------------------------

/** Тяжёлый труд: подкоп идёт быстрее. */
export function digsFaster(character: Character): number {
  return Math.round((1 + over(skillLevel(character, 'hardLabour')) * SHEET.labourDigs) * 100) / 100
}

/** Стойкость: дорога и голод отнимают меньше. */
export function holdsOut(character: Character): number {
  return (
    Math.round(
      Math.max(0.5, 1 - over(skillLevel(character, 'fortitude')) * SHEET.fortitudeHolds) * 100,
    ) / 100
  )
}

/** Стойкость: и внезапность бьёт слабее. */
export function steadyUnder(character: Character): number {
  return (
    Math.round(
      Math.max(0.4, 1 - over(skillLevel(character, 'fortitude')) * SHEET.fortitudeSteady) * 100,
    ) / 100
  )
}

/** Концентрация: сколько суток вести держатся в голове. */
export function remembersDays(character: Character, base: number): number {
  return Math.round(base + over(skillLevel(character, 'concentration')) * SHEET.focusRemembers)
}

/** Ловкость рук: насколько реже ловят твоего соглядатая. */
export function hidesSpy(character: Character): number {
  return (
    Math.round(
      Math.max(0.35, 1 - over(skillLevel(character, 'sleight')) * SHEET.sleightHides) * 100,
    ) / 100
  )
}

/** Ловкость рук: насколько дешевле выходит кража доказательства. */
export function stealsCheaper(character: Character): number {
  return (
    Math.round(
      Math.max(0.4, 1 - over(skillLevel(character, 'sleight')) * SHEET.sleightSteals) * 100,
    ) / 100
  )
}

/** Атлетика: насколько быстрее объезд державы. */
export function ridesQuicker(character: Character): number {
  return (
    Math.round(
      Math.max(0.5, 1 - over(skillLevel(character, 'athletics')) * SHEET.athleticsRides) * 100,
    ) / 100
  )
}

/** Атлетика: насколько меньше людей оставляет разведка боем. */
export function sparesMen(character: Character): number {
  return (
    Math.round(
      Math.max(0.4, 1 - over(skillLevel(character, 'athletics')) * SHEET.athleticsSpares) * 100,
    ) / 100
  )
}

/** Верховая езда: насколько быстрее едут гонцы. */
export function ridersSpeed(character: Character): number {
  return (
    Math.round(
      Math.max(0.5, 1 - over(skillLevel(character, 'riding')) * SHEET.ridingSpeeds) * 100,
    ) / 100
  )
}

/** Верховая езда: на сколько переходов дальше видит дозор. */
export function scoutReach(character: Character): number {
  return ROLE_DEFS.scout.hops + Math.floor(over(skillLevel(character, 'riding')) * SHEET.ridingSees)
}

// --- дела власти и знания (этап 123) ---------------------------------------

/** Командование: насколько точнее исполняют твой приказ. */
export function obeysBetter(character: Character): number {
  return Math.round((1 + over(skillLevel(character, 'command')) * SHEET.commandObeys) * 100) / 100
}

/** Командование: насколько быстрее едет гонец с приказом. */
export function ordersRideFaster(character: Character): number {
  return (
    Math.round(
      Math.max(0.5, 1 - over(skillLevel(character, 'command')) * SHEET.commandSpeeds) * 100,
    ) / 100
  )
}

/** Учёность: насколько отчёт наместника ближе к правде. */
export function readsLetters(character: Character): number {
  return (
    Math.round(
      Math.max(0.3, 1 - over(skillLevel(character, 'scholarship')) * SHEET.lettersNarrow) * 100,
    ) / 100
  )
}

/** Учёность: при каком расхождении вестей ты замечаешь, что кто-то врёт. */
export function noticesClash(character: Character, base: number): number {
  return (
    Math.round(
      Math.max(0.05, base - over(skillLevel(character, 'scholarship')) * SHEET.lettersClash) * 100,
    ) / 100
  )
}

/** Выживание: на сколько переходов дальше берёт дозор. */
export function survivalReach(character: Character): number {
  return Math.floor(over(skillLevel(character, 'survival')) * SHEET.survivalSees)
}

/** Выживание: насколько быстрее выходит посмотреть на месте. */
export function looksQuicker(character: Character): number {
  return (
    Math.round(
      Math.max(0.4, 1 - over(skillLevel(character, 'survival')) * SHEET.survivalScouts) * 100,
    ) / 100
  )
}

/** Убеждение: насколько охотнее уступают за столом мира. */
export function persuadesAt(character: Character): number {
  return Math.round(over(skillLevel(character, 'persuasion')) * SHEET.wordsPersuade * 100) / 100
}

/** Убеждение: насколько легче обмануть чужого посла. */
export function foolsGuest(character: Character): number {
  return Math.round(over(skillLevel(character, 'persuasion')) * SHEET.wordsFool * 100) / 100
}

/** Инженерия: насколько крепче своя крепость. */
export function wallsBetter(character: Character): number {
  return Math.round((1 + over(skillLevel(character, 'engineering')) * SHEET.worksWalls) * 100) / 100
}

/** Стойкость: насколько дольше держится своя осада на измор. */
export function siegeHolds(character: Character): number {
  return (
    Math.round((1 + over(skillLevel(character, 'fortitude')) * SHEET.fortitudeSiege) * 100) / 100
  )
}

// --- лист (А5) --------------------------------------------------------------

export interface SheetRow {
  readonly id: string
  readonly kind: 'attribute' | 'skill'
  readonly label: string
  readonly level: number
  /** Что это даёт здесь и сейчас — числом. */
  readonly does: readonly string[]
}

/** Дела этого навыка, посчитанные при нынешнем уровне (А1 и А5). */
export function skillDoes(character: Character, id: SkillId): readonly string[] {
  const level = skillLevel(character, id)
  if (id === 'hardLabour') {
    return [
      `подкоп и осадные работы идут в ${digsFaster(character)} раза быстрее`,
      `переноска: +${Math.round(level * 0.3)} к весу`,
    ]
  }
  if (id === 'fortitude') {
    return [
      `дорога и голод отнимают ${Math.round(holdsOut(character) * 100)} из ста обычного`,
      `внезапность бьёт на ${Math.round((1 - steadyUnder(character)) * 100)} из ста слабее`,
      `своя осада на измор держится в ${siegeHolds(character)} раза дольше`,
    ]
  }
  if (id === 'concentration') {
    return [
      `вести держатся ${remembersDays(character, 1080)} суток вместо 1080`,
      'чары держатся дольше и срываются реже',
    ]
  }
  if (id === 'sleight') {
    return [
      `соглядатая ловят на ${Math.round((1 - hidesSpy(character)) * 100)} из ста реже`,
      `кража доказательства дешевле на ${Math.round((1 - stealsCheaper(character)) * 100)} из ста`,
    ]
  }
  if (id === 'athletics') {
    return [
      `объезд державы быстрее на ${Math.round((1 - ridesQuicker(character)) * 100)} из ста`,
      `разведка боем стоит на ${Math.round((1 - sparesMen(character)) * 100)} из ста меньше людей`,
    ]
  }
  if (id === 'riding') {
    return [
      `гонцы едут на ${Math.round((1 - ridersSpeed(character)) * 100)} из ста быстрее`,
      `дозор видит на ${scoutReach(character)} переходов`,
    ]
  }
  if (id === 'command') {
    return [
      `приказ исполняют в ${obeysBetter(character)} раза точнее`,
      `гонец с приказом едет на ${Math.round((1 - ordersRideFaster(character)) * 100)} из ста быстрее`,
    ]
  }
  if (id === 'scholarship') {
    return [
      `приписка наместника меньше на ${Math.round((1 - readsLetters(character)) * 100)} из ста`,
      `расхождение вестей видишь от ${Math.round(noticesClash(character, 0.25) * 100)} из ста`,
    ]
  }
  if (id === 'survival') {
    return [
      `дозор видит на ${survivalReach(character)} переходов дальше`,
      `посмотреть на месте — на ${Math.round((1 - looksQuicker(character)) * 100)} из ста быстрее`,
    ]
  }
  if (id === 'persuasion') {
    return [
      `за столом мира уступают на ${Math.round(persuadesAt(character) * 100)} из ста охотнее`,
      `чужого посла обманываешь на ${Math.round(foolsGuest(character) * 100)} из ста вернее`,
    ]
  }
  if (id === 'engineering') {
    return [
      `свои стены крепче в ${wallsBetter(character)} раза`,
      'осадные машины строятся и считаются лучше',
    ]
  }
  return SKILL_PLACES[id] ?? []
}

/** Прямое дело атрибута при нынешнем значении (А3 и А5). */
export function attributeDoes(character: Character, id: AttributeId): readonly string[] {
  const value = character.attributes[id]
  const over6 = Math.max(0, value - 6)
  if (id === 'mind') {
    return [
      `вилка твоего знания уже на ${Math.round(over6 * 5)} из ста`,
      `обман видишь на ${Math.round(over6 * 6)} из ста чаще`,
    ]
  }
  if (id === 'will') {
    return [
      `приёмы отнимают на ${Math.round(over6 * 6)} из ста меньше усталости`,
      `внимания в сутках: +${Math.round(over6 * 0.5 * 10) / 10} дела`,
    ]
  }
  if (id === 'charisma') {
    return [
      `внимания в сутках: +${Math.round(over6 * 0.5 * 10) / 10} дела`,
      `чужая рука в делах выходит на ${Math.round(over6 * 6)} из ста ближе к твоей`,
    ]
  }
  if (id === 'strength') {
    return [`переноска: ${15 + value * 5} веса`, 'требования снаряжения и дуэль']
  }
  if (id === 'agility') return ['снаряжение и дуэль', 'уклонение в бою']
  return ['раны заживают быстрее', 'усталость копится медленнее']
}

/** Весь лист: не уровень, а то, что уровень даёт (А5). */
export function sheetOf(character: Character): readonly SheetRow[] {
  const rows: SheetRow[] = []
  for (const id of ATTRIBUTE_IDS) {
    rows.push({
      id,
      kind: 'attribute',
      label: ATTRIBUTE_LABELS[id],
      level: character.attributes[id],
      does: attributeDoes(character, id),
    })
  }
  for (const id of SKILL_IDS) {
    rows.push({
      id,
      kind: 'skill',
      label: SKILLS[id].label,
      level: skillLevel(character, id),
      does: skillDoes(character, id),
    })
  }
  return rows
}

/** Счёт мест: ни одного навыка меньше чем в двух делах (А6). */
export function deadRows(): readonly string[] {
  const dead: string[] = []
  for (const id of SKILL_IDS) {
    if ((SKILL_PLACES[id] ?? []).length < 2) dead.push(id)
  }
  for (const id of ATTRIBUTE_IDS) {
    if ((ATTRIBUTE_PLACES[id] ?? []).length < 1) dead.push(id)
  }
  return dead
}

export { SHEET, SHEET_WORDS, SKILL_PLACES, ATTRIBUTE_PLACES }
