import { TAX_DEFS } from './content/estate'
import {
  ARREARS_DEFS,
  type ArrearsAnswer,
  CHARTER_DEFS,
  type CharterKind,
  DEBTOR_FACTOR,
  LIBERTY_POPULATION,
  LIBERTY_PRICE,
  RELIEF_DAYS,
  YEAR_WORDS,
} from './content/realm'
import { vassalsOf } from './court'
import type { Settlement } from './economy'
import { arrearsFactor, lawOf, taxTake } from './estate'
import { PLAYER, dailyTax, garrisonWages, holdingsOf } from './holding'
import { foodSecurity } from './life'
import { courtWages } from './office'
import { placeRep } from './reputation'
import type { GameState } from './state'
import { oathOf, shareOf } from './vassal'

/**
 * Закон державы (этап 76).
 *
 * Своё владение считалось само: подать, мыто, суд — и управляющий, который
 * ворует. Держава добавляет к этому три вещи, которых у владения не было: города,
 * с которыми приходится договариваться; недоимщиков, у которых есть причина; и
 * год, который подводит итог всему разом.
 *
 * В состоянии лежат только грамоты (`charters`) — то, что ты кому-то обещал.
 * Остальное выводится из мира, как и прежде.
 */

/** Грамота: вольность городу или послабление месту. */
export interface Charter {
  readonly kind: CharterKind
  readonly sinceDay: number
  /** Послабление кончается; вольность — нет. */
  readonly untilDay?: number
  /** Что за неё заплатили разом. */
  readonly paid: number
}

export type Charters = Readonly<Record<string, Charter>>

export function charterOf(
  state: Pick<GameState, 'charters'>,
  locationId: string,
  day: number,
): Charter | null {
  const charter = state.charters?.[locationId]
  if (!charter) return null
  if (charter.untilDay !== undefined && charter.untilDay <= day) return null
  return charter
}

export function charterDef(kind: CharterKind) {
  return CHARTER_DEFS[kind]
}

/** Какую долю подати ты берёшь с этого места по закону и по грамотам. */
export function takeAt(state: GameState, locationId: string, day: number): number {
  const charter = charterOf(state, locationId, day)
  return taxTake(lawOf(state)) * (charter ? CHARTER_DEFS[charter.kind].take : 1)
}

/**
 * Город просит вольность (З4).
 *
 * Просят не всякие: большой торговый город, который и так себя кормит и
 * охраняет. Цена — с души, разом; после неё ты берёшь с него меньше половины
 * прежнего, зато получаешь деньги сейчас и город, который тебя помнит.
 */
export interface LibertyOffer {
  readonly locationId: string
  readonly price: number
  readonly asks: string
}

export function libertyOffers(state: GameState, day: number): readonly LibertyOffer[] {
  const out: LibertyOffer[] = []
  for (const settlement of holdingsOf(state.settlements, PLAYER)) {
    if (settlement.population < LIBERTY_POPULATION) continue
    if (charterOf(state, settlement.locationId, day)) continue
    const price = Math.round(settlement.population * LIBERTY_PRICE)
    const name = state.world.locations[settlement.locationId]?.name ?? 'город'
    out.push({
      locationId: settlement.locationId,
      price,
      asks: `${name} просит вольность: ${price} разом, и дальше по договору, а не по подати.`,
    })
  }
  return out
}

// --- недоимки (З3) ----------------------------------------------------------

export interface Debtor {
  readonly locationId: string
  /** Сколько не дошло до казны за то время, что тебя не видели. */
  readonly owed: number
  /** Почему не платят — словами. */
  readonly why: string
}

/**
 * Кто не платит и почему.
 *
 * Недоимка не бунт: где хозяина давно не видели, платят хуже просто потому, что
 * его давно не видели (этап 61). Здесь эта доля превращается в счёт, на который
 * можно ответить тремя разными способами.
 */
export function debtors(state: GameState, day: number): readonly Debtor[] {
  const out: Debtor[] = []
  for (const settlement of holdingsOf(state.settlements, PLAYER)) {
    const factor = arrearsFactor(state, settlement.locationId, day)
    if (factor >= DEBTOR_FACTOR) continue
    const daily = dailyTax(settlement, foodSecurity(settlement))
    const owed = Math.round(daily * (1 - factor) * 60)
    if (owed <= 0) continue
    const hungry = foodSecurity(settlement) < 0.4
    const robbed = settlement.banditry > 0.4
    out.push({
      locationId: settlement.locationId,
      owed,
      why: hungry
        ? 'Год выдался голодный: платить нечем.'
        : robbed
          ? 'По дорогам шалят: обоз с податью не дошёл.'
          : 'Хозяина давно не видели — и платить перестали.',
    })
  }
  return out
}

export function arrearsDef(answer: ArrearsAnswer) {
  return ARREARS_DEFS[answer]
}

export { RELIEF_DAYS, type ArrearsAnswer, type CharterKind }

// --- год державы (З6) -------------------------------------------------------

export interface RealmYear {
  readonly day: number
  /** Приход за год: подати своих мест и доля вассалов. */
  readonly income: number
  /** Расход: гарнизоны, двор, постройки. */
  readonly spent: number
  /** Кто недоволен: места с дурной памятью и вассалы с низкой верностью. */
  readonly unhappy: readonly string[]
  readonly says: string
}

/**
 * Итог года (З6).
 *
 * Не бухгалтерия, а ответ на вопрос «как идут дела»: сколько принесло, сколько
 * съело и кто этим недоволен. Считается из мира, ничего не хранит и потому не
 * может разойтись с ним.
 */
export function realmYear(state: GameState, day: number): RealmYear {
  const mine = holdingsOf(state.settlements, PLAYER)
  let income = 0
  let spent = courtWages(state) * 365
  for (const settlement of mine) {
    income +=
      dailyTax(settlement, foodSecurity(settlement)) *
      takeAt(state, settlement.locationId, day) *
      365
    spent += garrisonWages(settlement) * 365
  }
  for (const vassal of vassalsOf(state)) {
    const share = shareOf(oathOf(state, vassal.id))
    for (const held of holdingsOf(state.settlements, vassal.id)) {
      income += dailyTax(held, foodSecurity(held)) * share * 365
    }
  }
  const unhappy: string[] = []
  for (const settlement of mine) {
    if (placeRep(state.reputation, settlement.locationId) >= -10) continue
    unhappy.push(state.world.locations[settlement.locationId]?.name ?? settlement.locationId)
  }
  for (const vassal of vassalsOf(state)) {
    if (vassal.loyalty >= 35) continue
    unhappy.push(`${vassal.title} ${vassal.name}`)
  }
  const balance = income - spent
  const purse =
    balance > spent * 0.2 ? YEAR_WORDS.rich : balance > 0 ? YEAR_WORDS.thin : YEAR_WORDS.poor
  const mood =
    unhappy.length === 0
      ? YEAR_WORDS.quiet
      : unhappy.length > 2
        ? YEAR_WORDS.dangerous
        : YEAR_WORDS.grumbling
  return {
    day,
    income: Math.round(income),
    spent: Math.round(spent),
    unhappy,
    says: `${purse} ${mood}`,
  }
}

/**
 * Как закон державы ложится на людей (З5). Не `lawMood` владения (этап 61),
 * который меряет строгость закона самого по себе, а то, что от него остаётся в
 * памяти места за сутки.
 *
 * Тяжёлая подать и суровый суд помнятся местом, а не только считаются в казне;
 * вольность помнится дольше всего. Возвращается сдвиг памяти места за сутки.
 */
export function realmMood(state: GameState, settlement: Settlement, day: number): number {
  const law = lawOf(state)
  const charter = charterOf(state, settlement.locationId, day)
  const tax = TAX_DEFS[law.tax].mood / 600
  const granted = charter ? CHARTER_DEFS[charter.kind].mood / 900 : 0
  return tax + granted
}
