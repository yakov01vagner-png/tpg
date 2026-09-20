import type { BuildingId } from './content/buildings'
import { FIELD_WORK_DEFS, type FieldWork, TILLAGE, TILLAGE_WORDS } from './content/tillage'
import type { Settlement } from './economy'
import { storeDays } from './fort'
import { PLAYER, dailyTax, garrisonWages, holdingsOf } from './holding'
import { foodSecurity } from './life'
import { courtWages } from './office'
import type { GameState } from './state'
import { dayOfYear } from './time'
import { ledger } from './treasury'
import { atWar } from './war'
import type { World } from './world/types'

/**
 * Хозяйство, которое видно (этап 177).
 *
 * Считается оно с 0.1 и считается честно: подать, пошлины, запасы, голод. Видно
 * его плохо — в казну капает число, и почему оно такое, не сказано нигде.
 * Оттого хозяйство было не решением, а фоном: игроку нечего было в нём менять,
 * потому что он не знал, что на что влияет.
 *
 * Здесь оно объясняется. Ни одной новой величины: год земли выводится из дня,
 * всякая статья дохода — из тех же чисел, из которых её считает `treasury.ts`,
 * а нужда места — из того, чего в нём нет.
 */

/** Какая сейчас работа в поле (Хз1). */
export function fieldWork(day: number): FieldWork {
  const at = dayOfYear(day)
  for (const [id, def] of Object.entries(FIELD_WORK_DEFS)) {
    if (def.from <= def.to ? at >= def.from && at <= def.to : at >= def.from || at <= def.to) {
      return id as FieldWork
    }
  }
  return 'rest'
}

/** Год земли словами (Хз1). */
export function fieldSays(state: GameState, day: number): string {
  const work = fieldWork(day)
  const def = FIELD_WORK_DEFS[work]
  const fighting = state.politics.wars.some((war) => war.a === PLAYER || war.b === PLAYER)
  const hurts = fighting && (work === 'sowing' || work === 'reaping')
  return `${def.label}: ${def.about}${hurts ? ` ${TILLAGE_WORDS.war}` : ''}`
}

/** Во сколько война обходится полю в эту пору (Хз1). */
export function warHarvest(state: GameState, day: number): number {
  const work = fieldWork(day)
  const fighting = state.politics.wars.some((war) => war.a === PLAYER || war.b === PLAYER)
  if (!fighting) return 1
  if (work === 'sowing') return TILLAGE.warSowing
  if (work === 'reaping') return TILLAGE.warReaping
  return 1
}

/**
 * Откуда берутся деньги (Хз2).
 *
 * Не «подать 214», а из чего эти 214 вышли: сколько мест, сколько душ, какой
 * закон, сколько недоимок. Числа берутся из того же счёта, что в казне, —
 * второго не заводится.
 */
export function whyIncome(
  state: GameState,
  world: World,
  day: number,
): readonly { readonly what: string; readonly sum: number; readonly why: string }[] {
  const sheet = ledger(state, world, day)
  const mine = holdingsOf(state.settlements, PLAYER)
  const people = mine.reduce((sum, one) => sum + one.population, 0)
  const markets = mine.filter((one) => one.buildings.includes('market')).length
  const rows = [
    {
      what: 'подать',
      sum: sheet.tax,
      why: `${mine.length} мест, ${people} душ; рынков ${markets}. Подать идёт с души и растёт с достатка места.`,
    },
    {
      what: 'пошлины',
      sum: sheet.tolls,
      why: 'С проезжих и с торга: считается по дорогам, которые через тебя идут.',
    },
    {
      what: 'с вассалов',
      sum: sheet.vassals,
      why: 'Доля подати, записанная в их присяге. Уступил долю — уступил и это.',
    },
    { what: 'дань', sum: sheet.tribute, why: 'То, что платят тебе по миру после войны.' },
  ]
  return rows.filter((one) => one.sum !== 0)
}

/** Куда они уходят и что можно срезать (Хз3). */
export function whySpent(
  state: GameState,
  world: World,
  day: number,
): {
  readonly rows: readonly { readonly what: string; readonly sum: number; readonly why: string }[]
  readonly cut: string
} {
  const sheet = ledger(state, world, day)
  const mine = holdingsOf(state.settlements, PLAYER)
  const guards = mine.reduce((sum, one) => sum + garrisonWages(one), 0)
  const rows = [
    {
      what: 'гарнизоны',
      sum: sheet.garrison,
      why: `Жалованье тем, кто стоит по твоим местам (${Math.round(guards)} в сутки). Снять гарнизон — сберечь и остаться без стен.`,
    },
    {
      what: 'двор',
      sum: sheet.court,
      why: `Должности: ${Math.round(courtWages(state))} в сутки. Отставить — сберечь и лишиться того, что они делают.`,
    },
    {
      what: 'проценты',
      sum: sheet.interest,
      why: 'Долги растут сами. Это единственная статья, которая дорожает от того, что её не трогают.',
    },
  ].filter((one) => one.sum !== 0)
  const worst = [...rows].sort((a, b) => b.sum - a.sum)[0]
  return {
    rows,
    cut: worst
      ? `${TILLAGE_WORDS.cut}: ${worst.what} (${worst.sum} в сутки) — ${worst.why}`
      : 'Срезать нечего: ты ничего не тратишь.',
  }
}

/**
 * Голод и излишек по твоей земле (Хз4).
 *
 * Меряется тем же, чем меряют запас в осаде (`storeDays`): на сколько суток в
 * закромах хлеба. `stockDays` в `life.ts` — не про это: там сколько место
 * вообще способно хранить.
 */
export function bread(
  state: GameState,
  world: World,
  day: number,
): {
  readonly hungry: readonly string[]
  readonly spare: readonly string[]
  readonly says: string
} {
  const hungry: string[] = []
  const spare: string[] = []
  for (const one of holdingsOf(state.settlements, PLAYER)) {
    const days = storeDays(one)
    if (days <= TILLAGE.hungryDays)
      hungry.push(world.locations[one.locationId]?.name ?? one.locationId)
    else if (days >= TILLAGE.surplusDays) {
      spare.push(world.locations[one.locationId]?.name ?? one.locationId)
    }
  }
  return {
    hungry,
    spare,
    says:
      hungry.length === 0 && spare.length === 0
        ? TILLAGE_WORDS.even
        : `${hungry.length > 0 ? `${TILLAGE_WORDS.hungry} Голодают: ${hungry.join(', ')}.` : ''}${
            spare.length > 0 ? ` ${TILLAGE_WORDS.surplus} Лишнее есть: ${spare.join(', ')}.` : ''
          }`.trim(),
  }
}

/**
 * Что этому месту нужно построить (Хз5).
 *
 * Не список того, что можно, а нужда: где тонок запас — амбар, где неспокойно —
 * стены, где торг — рынок, где ропщут — часовня. Нужда выводится из места, и
 * потому подсказка не врёт.
 */
export function needsAt(
  state: GameState,
  world: World,
  locationId: string,
): { readonly build: BuildingId | null; readonly why: string } {
  const place = state.settlements[locationId]
  if (!place) return { build: null, why: 'Строить негде.' }
  const has = (id: BuildingId) => place.buildings.includes(id)
  const days = storeDays(place)
  if (!has('granary') && days < TILLAGE.needsGranary) {
    return { build: 'granary', why: `Хлеба на ${days} сут.: до нового года не дотянут без амбара.` }
  }
  if (!has('walls') && place.banditry >= TILLAGE.needsWalls) {
    return {
      build: 'walls',
      why: `Разбой ${Math.round(place.banditry * 100)} из ста: место открыто.`,
    }
  }
  if (!has('market') && place.population >= TILLAGE.needsMarket) {
    return { build: 'market', why: `${place.population} душ без рынка: торг идёт мимо тебя.` }
  }
  if (!has('chapel') && foodSecurity(place) < 0.6) {
    return {
      build: 'chapel',
      why: 'Голодно и неспокойно: людям нужно место, где им скажут доброе.',
    }
  }
  if (!has('mill'))
    return { build: 'mill', why: 'Мельница прибавляет хлеба там, где хлеб уже есть.' }
  return { build: null, why: 'Здесь построено всё, что нужно этому месту.' }
}

/** Хозяйство в числах — по всему миру, а не только у игрока (Хз6). */
export function tillageRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly places: number
  readonly hungry: number
  readonly spare: number
  readonly net: number
  readonly says: string
} {
  let hungry = 0
  let spare = 0
  let places = 0
  for (const one of Object.values(state.settlements) as readonly Settlement[]) {
    if (one.population <= 0) continue
    places += 1
    const days = storeDays(one)
    if (days <= TILLAGE.hungryDays) hungry += 1
    else if (days >= TILLAGE.surplusDays) spare += 1
  }
  const sheet = ledger(state, world, day)
  return {
    places,
    hungry,
    spare,
    net: sheet.net,
    says: `Мест в мире ${places}: голодают ${hungry}, с излишком ${spare}. Твоя казна: ${sheet.income} прихода против ${sheet.spent} расхода (${sheet.net} в сутки). ${fieldSays(state, day)}`,
  }
}
