import { LIEGE, LIEGE_WORDS, type LordTrouble, TROUBLE_DEFS } from './content/liege'
import { LORD_DEED_DEFS } from './content/lords'
import { vassalsOf } from './court'
import { lordBonds, lordMemory } from './lordlife'
import type { GameState } from './state'
import { fiefsOf, oathOf } from './vassal'
import type { Lord } from './war'
import type { World } from './world/types'

/**
 * Вассал как человек (этап 169).
 *
 * С 0.6 у него есть имя, нрав, годы, дружина и верность, с 0.7 — присяга с
 * условиями. Не хватало его собственной жизни: у него ничего не случалось.
 * Верность двигалась твоими делами, сам он не судился с соседом, не беднел,
 * не растил сына и ничего не просил — и оттого оставался строкой «верность 62».
 *
 * Здесь у него заводится жизнь, и снова — **из того, что в мире уже есть**:
 * голод считается по его деревням, набеги по разбою в них, вражда по соседям,
 * с которыми он делит провинцию, долги по твоим войнам. Хранится одно: письмо,
 * которое он послал, и день, когда послал.
 */

export interface LordLife {
  readonly lord: Lord
  readonly fiefs: number
  readonly people: number
  readonly troubles: readonly LordTrouble[]
  readonly says: string
}

/** Что у него сейчас происходит (Вл1). */
export function lordLifeOf(state: GameState, world: World, lord: Lord, day: number): LordLife {
  const fiefs = fiefsOf(state.settlements, lord.id)
  const people = fiefs.reduce((sum, one) => sum + one.population, 0)
  const troubles: LordTrouble[] = []
  // Голод: его деревни живут хуже, чем начинали.
  const started = fiefs.reduce(
    (sum, one) => sum + (world.locations[one.locationId]?.population ?? 0),
    0,
  )
  if (started > 0 && people / started < LIEGE.hungryAt) troubles.push('hunger')
  // Набеги: в его землях разбой.
  const banditry = fiefs.reduce((sum, one) => sum + one.banditry, 0) / Math.max(1, fiefs.length)
  if (banditry >= LIEGE.raidedAt) troubles.push('raid')
  // Вражда: сосед по провинции, с которым он делит землю.
  const rivals = lordBonds(state.politics, state.settlements, world, lord).rivals
  if (rivals.length > 0) troubles.push('feud')
  // Тяжба и сын — вещи его дома: выводятся из него самого и его лет.
  const seed = hashOf(`life|${lord.id}`)
  if ((day + (seed % 900)) % 900 < 300) troubles.push('suit')
  if ((lord.age ?? 40) >= 42 + (seed % 7)) troubles.push('heir')
  // Долги: твоя война, в которой он участвовал.
  if (state.politics.wars.length > 0 && seed % 3 === 0) troubles.push('debt')
  return {
    lord,
    fiefs: fiefs.length,
    people,
    troubles,
    says:
      troubles.length === 0
        ? `${lord.title} ${lord.name}: ${fiefs.length} держаний, ${people} душ. Ничего не случилось — и это тоже новость.`
        : `${lord.title} ${lord.name}: ${fiefs.length} держаний, ${people} душ. ${troubles
            .map((one) => TROUBLE_DEFS[one].label)
            .join(', ')}. ${LIEGE_WORDS.own}`,
  }
}

/** Письмо, которое он шлёт (Вл2): одно, и о самом больном. */
export function letterFrom(
  state: GameState,
  world: World,
  lord: Lord,
  day: number,
): { readonly trouble: LordTrouble; readonly says: string } | null {
  const life = lordLifeOf(state, world, lord, day)
  const worst = [...life.troubles].sort((a, b) => TROUBLE_DEFS[a].drags - TROUBLE_DEFS[b].drags)[0]
  if (!worst) return null
  return {
    trouble: worst,
    says: `${lord.title} ${lord.name} пишет: «${TROUBLE_DEFS[worst].writes}» Просит: ${TROUBLE_DEFS[worst].asks}.`,
  }
}

/** Открытое письмо от этого вассала, если оно есть. */
export function askOpen(
  state: GameState,
  lordId: string,
): { readonly trouble: LordTrouble; readonly day: number } | null {
  const row = state.lordAsks?.[lordId]
  return row ? { trouble: row.kind as LordTrouble, day: row.day } : null
}

/**
 * Из чего его верность (Вл3).
 *
 * Не «верность 62», а счёт: годы под рукой, дела, которые он помнит, условия
 * присяги и то, что у него сейчас болит. Число остаётся тем же — объяснённым.
 */
export function loyaltySays(state: GameState, world: World, lord: Lord, day: number): string {
  const oath = oathOf(state, lord.id)
  const memory = lordMemory(state, lord.id)
  const parts: string[] = []
  // Первое, что держит вассала, — годы под рукой: это не дело и не обида, но
  // считается наравне с ними.
  if (oath) {
    const years = Math.max(0, Math.round(((day - oath.sinceDay) / 365) * 10) / 10)
    parts.push(`под рукой ${years} г.`)
    if (oath.share > 0) parts.push(`отдаёт ${Math.round(oath.share * 100)}% подати (−)`)
    if (oath.levy > 0) parts.push(`приводит ${Math.round(oath.levy * 100)}% своих (−)`)
  }
  for (const deed of memory) {
    const def = LORD_DEED_DEFS[deed]
    parts.push(`${def.label} (${def.weight > 0 ? '+' : ''}${def.weight})`)
  }
  if (oath) parts.push(oath.justice ? 'суд свой (+)' : 'суд твой (−)')
  const life = lordLifeOf(state, world, lord, day)
  for (const trouble of life.troubles) {
    const def = TROUBLE_DEFS[trouble]
    if (def.drags !== 0) parts.push(`${def.label} (${def.drags})`)
  }
  const open = askOpen(state, lord.id)
  if (open) parts.push(`ждёт ответа: ${TROUBLE_DEFS[open.trouble].asks}`)
  return `${lord.title} ${lord.name}, верность ${Math.round(lord.loyalty)}: ${
    parts.join('; ') || 'ничего между вами не было'
  }.`
}

/** Насколько его беды тянут верность за такт (Вл1, Вл3). */
export function troubleDrift(state: GameState, world: World, lord: Lord, day: number): number {
  return lordLifeOf(state, world, lord, day).troubles.reduce(
    (sum, one) => sum + TROUBLE_DEFS[one].drags,
    0,
  )
}

/**
 * Торг о присяге (Вл4).
 *
 * Присяга не камень: своим судом, долей подати и числом людей можно
 * обменяться. Он согласен, если ему отдают больше, чем берут, — и помнит, что
 * с ним торговались, а не приказывали.
 */
export function bargainFor(
  state: GameState,
  lord: Lord,
  gives: 'justice' | 'share' | 'levy',
): { readonly accepts: boolean; readonly says: string } {
  const oath = oathOf(state, lord.id)
  if (!oath) {
    return { accepts: false, says: `${lord.name} тебе не присягал: торговаться не о чем.` }
  }
  if (gives === 'justice' && oath.justice) {
    return { accepts: false, says: `Суд у ${lord.name} и так свой.` }
  }
  const accepts = gives === 'justice' || oath.share > 0.2 || oath.levy > 0.3
  return {
    accepts,
    says: accepts
      ? `${lord.name} согласен: ${LIEGE_WORDS.bargain}`
      : `${lord.name}: отдавать больше нечего — уступка вышла бы пустой.`,
  }
}

/** Что сын помнит об отце (Вл5). */
export function heirMemory(
  state: GameState,
  fatherId: string,
): { readonly deeds: readonly string[]; readonly says: string } {
  const memory = lordMemory(state, fatherId)
  const deeds = memory.map((one) => LORD_DEED_DEFS[one].recalls)
  return {
    deeds,
    says:
      deeds.length === 0
        ? 'Сын не помнит о тебе ничего: с его отцом у тебя ничего не было.'
        : `${LIEGE_WORDS.heir} ${deeds.join(' ')}`,
  }
}

/** Вассалы в числах (Вл6). */
export function liegeRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly vassals: number
  readonly troubled: number
  readonly waiting: number
  readonly says: string
} {
  const mine = vassalsOf(state)
  const rows = mine.map((lord) => lordLifeOf(state, world, lord, day))
  const troubled = rows.filter((one) => one.troubles.length > 0).length
  const waiting = Object.keys(state.lordAsks ?? {}).length
  return {
    vassals: mine.length,
    troubled,
    waiting,
    says:
      mine.length === 0
        ? 'Своей знати у тебя нет.'
        : `Вассалов ${mine.length}; с бедой ${troubled}; ждут ответа ${waiting}. ${LIEGE_WORDS.own}`,
  }
}

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}
