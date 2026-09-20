import {
  JUSTICE_DEFS,
  type JusticeLevel,
  LEVY_DEFS,
  type LevyLevel,
  TAX_DEFS,
  TOLL_DEFS,
  type TaxLevel,
  type TollLevel,
} from './content/estate'
import { WRIT, WRIT_WORDS } from './content/writ'
import { vassalsOf } from './court'
import { type Law, lawOf } from './estate'
import { customAt } from './face'
import { PLAYER, holdingsOf } from './holding'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Закон, который применяют (этап 181).
 *
 * Закон с 0.7 — четыре ползунка: подать, пошлина, ополчение, суд. Поставил — и
 * он действует везде одинаково. Оттого власть была настройкой, а не занятием:
 * никто не сопротивлялся, ничего не стоило переменить, и обычай земли ничего
 * не значил.
 *
 * Здесь у закона появляется исполнение. Ни одной новой величины: кто исполняет
 * хуже, выводится из верности вассалов, грамот городов и порядков мест (этап
 * 176), а цена перемены — из памяти этих же мест.
 */

/** Две стороны всякого правила (Зк1). */
export function lawSides(law: Law): readonly {
  readonly rule: string
  readonly is: string
  readonly gives: string
  readonly costs: string
}[] {
  return [
    {
      rule: 'подать',
      is: TAX_DEFS[law.tax].label,
      gives: `в казну ×${TAX_DEFS[law.tax].take}`,
      costs: `память мест ${TAX_DEFS[law.tax].mood > 0 ? '+' : ''}${TAX_DEFS[law.tax].mood}. ${TAX_DEFS[law.tax].about}`,
    },
    {
      rule: 'пошлина',
      is: TOLL_DEFS[law.toll].label,
      gives: `с проезжих ×${TOLL_DEFS[law.toll].take}`,
      costs: TOLL_DEFS[law.toll].about,
    },
    {
      rule: 'ополчение',
      is: LEVY_DEFS[law.levy].label,
      gives: `людей ×${LEVY_DEFS[law.levy].recruits}`,
      costs: `память мест ${LEVY_DEFS[law.levy].mood > 0 ? '+' : ''}${LEVY_DEFS[law.levy].mood}. ${LEVY_DEFS[law.levy].about}`,
    },
    {
      rule: 'суд',
      is: JUSTICE_DEFS[law.justice].label,
      gives: `разбой ${JUSTICE_DEFS[law.justice].banditry >= 0 ? '+' : ''}${JUSTICE_DEFS[law.justice].banditry}`,
      costs: `память мест ${JUSTICE_DEFS[law.justice].mood > 0 ? '+' : ''}${JUSTICE_DEFS[law.justice].mood}. ${JUSTICE_DEFS[law.justice].about}`,
    },
  ]
}

/**
 * Как исполняют указ в этом месте (Зк2, Зк4).
 *
 * Долей от единицы: единица — исполняют как сказано. Меньше — не исполняют, и
 * сказано, почему: грамота города, сход, цех или вассал, которому ты не мил.
 */
export function obeyedAt(
  state: GameState,
  world: World,
  locationId: string,
  rule: 'tax' | 'levy' | 'justice' | 'toll',
): { readonly share: number; readonly why: string } {
  const place = state.settlements[locationId]
  if (!place) return { share: 1, why: WRIT_WORDS.obeyed }
  const why: string[] = []
  let share = 1
  if (state.charters?.[locationId]) {
    share *= WRIT.chartered
    why.push('город держит грамоту')
  }
  const custom = customAt(state, world, locationId)
  if (custom === 'elders' && rule === 'justice') {
    share *= WRIT.elders
    why.push('здесь судит сход')
  }
  if (custom === 'guild' && rule === 'tax') {
    share *= WRIT.guild
    why.push('цех считает подать своим делом')
  }
  if (custom === 'clan') {
    share *= WRIT.elders
    why.push('чужому здесь не подчиняются')
  }
  const owner = place.owner
  if (owner && owner !== PLAYER) {
    const lord = state.politics.lords.find((one) => one.id === owner)
    if (lord && lord.kingdomId === PLAYER && lord.loyalty < WRIT.sulksBelow) {
      share *= WRIT.sulks
      why.push(`${lord.title} ${lord.name} даёт вполсилы (верность ${Math.round(lord.loyalty)})`)
    }
  }
  return {
    share: Math.round(share * 100) / 100,
    why:
      why.length === 0
        ? WRIT_WORDS.obeyed
        : `${share < 1 ? WRIT_WORDS.sulked : WRIT_WORDS.obeyed} ${why.join('; ')}. ${custom === 'elders' || custom === 'clan' ? WRIT_WORDS.custom : ''}`.trim(),
  }
}

/** Насколько указ исполняется по всей твоей земле (Зк2). */
export function obeyedAll(
  state: GameState,
  world: World,
  rule: 'tax' | 'levy' | 'justice' | 'toll',
): { readonly share: number; readonly worst: string | null; readonly says: string } {
  const mine = holdingsOf(state.settlements, PLAYER)
  if (mine.length === 0) return { share: 1, worst: null, says: 'Своей земли у тебя нет.' }
  let sum = 0
  let worst: { id: string; share: number } | null = null
  for (const one of mine) {
    const row = obeyedAt(state, world, one.locationId, rule)
    sum += row.share
    if (!worst || row.share < worst.share) worst = { id: one.locationId, share: row.share }
  }
  const share = Math.round((sum / mine.length) * 100) / 100
  return {
    share,
    worst: worst?.id ?? null,
    says: `Исполняют на ${Math.round(share * 100)} из ста. Хуже всего — ${
      world.locations[worst?.id ?? '']?.name ?? '—'
    }: ${obeyedAt(state, world, worst?.id ?? '', rule).why}`,
  }
}

/**
 * Чего стоит переменить закон (Зк3).
 *
 * Кто за, кто против и во что это обойдётся памяти мест. Считается из того, что
 * закон даёт и отнимает: смягчил — рады те, с кого берут; ужесточил — рады те,
 * кому с этого идёт.
 */
export function changeCost(
  state: GameState,
  world: World,
  from: Law,
  to: Law,
): {
  readonly steps: number
  readonly forIt: readonly string[]
  readonly against: readonly string[]
  readonly memory: number
  readonly says: string
} {
  const forIt: string[] = []
  const against: string[] = []
  let steps = 0
  let memory = 0
  if (to.tax !== from.tax) {
    steps += 1
    const harder = TAX_DEFS[to.tax].take > TAX_DEFS[from.tax].take
    memory += TAX_DEFS[to.tax].mood - TAX_DEFS[from.tax].mood
    ;(harder ? against : forIt).push('места, с которых берут')
    ;(harder ? forIt : against).push('казна и те, кому из неё платят')
  }
  if (to.levy !== from.levy) {
    steps += 1
    const harder = LEVY_DEFS[to.levy].recruits > LEVY_DEFS[from.levy].recruits
    memory += LEVY_DEFS[to.levy].mood - LEVY_DEFS[from.levy].mood
    ;(harder ? against : forIt).push('дворы, из которых берут людей')
    ;(harder ? forIt : against).push('войско')
  }
  if (to.justice !== from.justice) {
    steps += 1
    memory += JUSTICE_DEFS[to.justice].mood - JUSTICE_DEFS[from.justice].mood
    forIt.push('те, кому нужен порядок')
    against.push('те, кого судят')
  }
  if (to.toll !== from.toll) {
    steps += 1
    forIt.push('казна')
    against.push('купцы и города')
  }
  return {
    steps,
    forIt: [...new Set(forIt)],
    against: [...new Set(against)],
    memory,
    says:
      steps === 0
        ? 'Менять нечего.'
        : `Перемен ${steps}. За: ${[...new Set(forIt)].join(', ')}. Против: ${[...new Set(against)].join(', ')}. Память мест ${memory >= 0 ? '+' : ''}${memory}. ${WRIT_WORDS.changed}`,
  }
}

/** Что закон делает с жизнью этого места — словами (Зк5). */
export function lawSays(state: GameState, world: World, locationId: string): string {
  const law = lawOf(state)
  const tax = obeyedAt(state, world, locationId, 'tax')
  const justice = obeyedAt(state, world, locationId, 'justice')
  return `${TAX_DEFS[law.tax].label}: ${TAX_DEFS[law.tax].about} Здесь её платят на ${Math.round(tax.share * 100)} из ста. ${JUSTICE_DEFS[law.justice].label}: ${JUSTICE_DEFS[law.justice].about} Судят по-твоему на ${Math.round(justice.share * 100)} из ста.`
}

/** Закон в числах (Зк6). */
export function writRoll(
  state: GameState,
  world: World,
): {
  readonly places: number
  readonly tax: number
  readonly levy: number
  readonly justice: number
  readonly vassals: number
  readonly says: string
} {
  const mine = holdingsOf(state.settlements, PLAYER)
  const tax = obeyedAll(state, world, 'tax').share
  const levy = obeyedAll(state, world, 'levy').share
  const justice = obeyedAll(state, world, 'justice').share
  const sulking = vassalsOf(state).filter((one) => one.loyalty < WRIT.sulksBelow).length
  return {
    places: mine.length,
    tax,
    levy,
    justice,
    vassals: sulking,
    says: `Мест ${mine.length}: подать исполняют на ${Math.round(tax * 100)}, набор на ${Math.round(levy * 100)}, суд на ${Math.round(justice * 100)} из ста. Вассалов, дающих вполсилы: ${sulking}. ${WRIT_WORDS.both}`,
  }
}
