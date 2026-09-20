import { casusDef } from './casus'
import type { PeaceTermKind } from './content/casus'
import { TALLY, TALLY_WORDS } from './content/tally'
import { strengthOf } from './mind'
import type { GameState } from './state'
import type { War } from './war'
import { allied } from './war'
import { guarantorOf } from './ward'
import type { World } from './world/types'

/**
 * Война, которая кончается по счёту (этап 163).
 *
 * Кончалась она броском: 0.006 в сутки, делённые на упрямство повода и на нрав
 * корон. Из-за этого сто с лишним войн за век были одной и той же войной — они
 * начинались по расчёту (этап 143) и обрывались наугад, ничего не решив. Счёт
 * ставит на место броска четыре вещи, каждая из которых в мире уже есть:
 * сколько зим война идёт, взята ли цель, можно ли её ещё взять и давят ли со
 * стороны. Бросок остаётся — но он теперь взвешен, и войну нельзя дотянуть до
 * бесконечности, как и нельзя кончить в первый день.
 */

export interface WarTally {
  readonly war: War
  readonly days: number
  readonly years: number
  /** Сколько зим пережила война: по ним считается её цена (Вс4). */
  readonly winters: number
  /** Во что обходится нынешняя зима — серебром в сутки на сторону. */
  readonly cost: number
  /** Усталость обеих сторон, 0..1. */
  readonly weariness: number
  /** Чего добивается зачинщик (Вс2). */
  readonly aim: PeaceTermKind
  /** Взял ли он это (Вс2). */
  readonly reached: boolean
  /** И не взять ли этого уже никогда. */
  readonly hopeless: boolean
  /** Чужое давление, 0..1 и выше (Вс5). */
  readonly outside: number
  /** Во сколько раз охотнее мирятся сегодня, чем по общему правилу (Вс1). */
  readonly haste: number
  /** Кто вышел с прибытком — или никто (Вс3). */
  readonly winner: string | null
  /** Чем кончится, если кончится сегодня (Вс3). */
  readonly term: PeaceTermKind
  readonly says: string
}

/** Чего добивается тот, кто объявил (Вс2). */
export function warAim(war: War): PeaceTermKind {
  if (!war.casus) return 'tribute'
  return casusDef(war.casus.kind).wants[0] ?? 'nothing'
}

/** Держит ли эта сторона спорную провинцию (Вс2, Вс3). */
export function holdsAim(state: GameState, world: World, war: War, side: string): boolean {
  const provinceId = war.casus?.provinceId
  if (!provinceId) return false
  const ids = world.provinces[provinceId]?.locationIds ?? []
  let alive = 0
  let held = 0
  for (const id of ids) {
    const place = state.settlements[id]
    if (!place || place.population <= 0) continue
    alive += 1
    if (sideOf(place.owner) === side) held += 1
  }
  return alive > 0 && held / alive >= TALLY.holdsProvince
}

/**
 * Давление со стороны (Вс5).
 *
 * Войну кончают не только воюющие. Третий, с кем в союзе оба, — посредник;
 * поручитель за одну из сторон не хочет, чтобы его слово проверяли; коалиция,
 * сошедшаяся против выросшего, торопит его помириться на востоке, чтобы он
 * ответил на западе. Всё это уже есть в состоянии — здесь оно только сложено.
 */
export function outsidePressure(state: GameState, world: World, war: War, day: number): number {
  let pressure = 0
  for (const third of Object.keys(world.kingdoms)) {
    if (third === war.a || third === war.b) continue
    if (allied(state.politics, third, war.a) && allied(state.politics, third, war.b)) {
      pressure += TALLY.mediator
      break
    }
  }
  if (guarantorOf(state, war.a) || guarantorOf(state, war.b)) pressure += TALLY.guarantee
  // Коалиция берётся из той, что уже стоит (этап 136): она записана в
  // состоянии, и спрашивать её — О(1). Считать сегодняшнюю заново (`coalitionAgainst`)
  // здесь нельзя: счёт войны идёт каждые сутки на каждую войну, а тот счёт
  // меряет силу всех девяти сторон.
  const giant = state.league?.against ?? null
  if (giant === war.a || giant === war.b) pressure += TALLY.coalition
  return Math.round(pressure * 100) / 100
}

/** Весь счёт войны (Вс1–Вс5). */
export function warTally(state: GameState, world: World, war: War, day: number): WarTally {
  const days = Math.max(0, day - war.since)
  const years = Math.round((days / 365) * 100) / 100
  const winters = Math.max(1, Math.ceil(years))
  const cost = Math.round(TALLY.winterCost * TALLY.winterGrows ** (winters - 1))
  const weariness = Math.min(1, years / TALLY.wearyYears)
  const aim = warAim(war)
  const mine = strengthOf(state, world, war.a, day).score
  const theirs = strengthOf(state, world, war.b, day).score
  // Цель взята, если спорная земля в руках зачинщика — или, когда земли в
  // поводе нет, если он уже вдвое сильнее и добивать больше нечего.
  const reached = war.casus?.provinceId
    ? holdsAim(state, world, war, war.a)
    : mine >= theirs * TALLY.beatenBy && years >= 1
  // Безнадёжна она тогда, когда цель у противника и сил её взять нет: это не
  // «не повезло», это видно обеим сторонам.
  const hopeless =
    !reached &&
    years >= TALLY.hopelessYears &&
    (war.casus?.provinceId
      ? holdsAim(state, world, war, war.b) && mine < theirs * TALLY.beatenBy
      : mine * TALLY.beatenBy < theirs)
  const outside = outsidePressure(state, world, war, day)
  const haste =
    Math.round(
      (1 + weariness * TALLY.wearyHaste) *
        (reached ? TALLY.reachedHaste : 1) *
        (hopeless ? TALLY.hopelessHaste : 1) *
        (1 + outside * TALLY.outsideHaste) *
        100,
    ) / 100
  // Условия следуют из хода войны, а не из того, кто крупнее (Вс3): взявший
  // своё берёт то, за чем шёл; отбившийся берёт дань за беспокойство;
  // выдохшиеся расходятся ни с чем.
  const winner = reached ? war.a : hopeless ? war.b : null
  const term: PeaceTermKind = reached
    ? aim
    : hopeless
      ? mine * TALLY.beatenBy * TALLY.beatenBy < theirs
        ? 'tribute'
        : 'nothing'
      : 'nothing'
  const why = reached
    ? TALLY_WORDS.reached
    : hopeless
      ? TALLY_WORDS.hopeless
      : outside > 0
        ? TALLY_WORDS.outside
        : weariness >= 0.6
          ? TALLY_WORDS.weary
          : TALLY_WORDS.fresh
  return {
    war,
    days,
    years,
    winters,
    cost,
    weariness,
    aim,
    reached,
    hopeless,
    outside,
    haste,
    winner,
    term,
    says: `${war.a} против ${war.b}, ${years} г. (${winters}-я зима, ${cost} серебра в сутки на сторону): ${why} Мирятся охотнее обычного ×${haste}${winner ? `, с прибытком у ${winner}` : ', без прибытка'} — ${term}.`,
  }
}

/**
 * Что сказать такту войны (Вс1, Вс3).
 *
 * `war.ts` не знает ни путей, ни поручительств, ни коалиций, и знать не должен:
 * иначе ядро войны потянет за собой полмира. Поэтому счёт считается здесь, а
 * такту передаётся только итог — насколько охотнее мирятся и чем кончат.
 */
export function warReckon(
  state: GameState,
  world: World,
  war: War,
  day: number,
): { readonly haste: number; readonly winner: string | null; readonly term: PeaceTermKind } {
  const tally = warTally(state, world, war, day)
  return { haste: tally.haste, winner: tally.winner, term: tally.term }
}

/** Войны мира в числах (Вс6). */
export function warRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly count: number
  readonly years: number
  readonly reached: number
  readonly hopeless: number
  readonly rows: readonly WarTally[]
  readonly says: string
} {
  const rows = state.politics.wars.map((war) => warTally(state, world, war, day))
  const years = rows.reduce((sum, one) => sum + one.years, 0)
  const reached = rows.filter((one) => one.reached).length
  const hopeless = rows.filter((one) => one.hopeless).length
  return {
    count: rows.length,
    years: Math.round(years * 10) / 10,
    reached,
    hopeless,
    rows,
    says:
      rows.length === 0
        ? 'Войн в мире нет.'
        : `Войн ${rows.length}, всего ${Math.round(years * 10) / 10} г.: своего добились ${reached}, безнадёжных ${hopeless}, прочие идут.`,
  }
}

function sideOf(owner: string | null): string | null {
  if (!owner) return null
  if (owner.startsWith('crown:')) return owner.slice('crown:'.length)
  const parts = owner.split(':')
  return parts[0] === 'lord' ? (parts[1] ?? null) : null
}
