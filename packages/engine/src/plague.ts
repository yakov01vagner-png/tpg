import type { Settlement } from './economy'
import { foodSecurity } from './life'
import { type Rng, nextFloat, nextInt, rollChance } from './rng'
import { neighbourSettlements } from './world/queries'
import type { World } from './world/types'

/**
 * Мор.
 *
 * Голод у нас уже есть, но он приходит оттуда же, откуда и всё остальное, — от
 * нехватки еды. Мор устроен иначе: он рождается в скученности, идёт по дорогам
 * и торговле и не спрашивает, сыто место или нет. Из-за него дорога перестаёт
 * быть только пользой, а у бедствия появляется география: одна область в
 * трауре, соседняя цела и наживается на этом.
 *
 * Как и всё в состоянии — простые данные: где идёт, сколько дней осталось.
 */
export interface Plague {
  readonly locationId: string
  /** Сколько суток мор ещё продержится здесь. */
  readonly daysLeft: number
  /** Сила, 0..1: сколько людей уносит за сутки. */
  readonly severity: number
}

export type PlagueEvent =
  | { readonly type: 'plagueBegan'; readonly locationId: string }
  | { readonly type: 'plagueSpread'; readonly from: string; readonly to: string }
  | { readonly type: 'plagueDeaths'; readonly locationId: string; readonly deaths: number }
  | { readonly type: 'plagueEnded'; readonly locationId: string }
  /** От мора бегут (этап 64, Ж3): столько людей ушло туда, где его ещё нет. */
  | {
      readonly type: 'plagueFlight'
      readonly from: string
      readonly to: string
      readonly people: number
    }

export interface PlagueResult {
  readonly plagues: readonly Plague[]
  readonly settlements: Readonly<Record<string, Settlement>>
  readonly rng: Rng
  readonly events: readonly PlagueEvent[]
}

/** С какого числа жителей место вообще может стать началом мора. */
const CROWD = 2500
/**
 * Шанс, что мор начнётся где-то в мире за сутки.
 *
 * Полвспышки в год — это не бедствие, а погода: при таком мор шёл почти
 * непрерывно, держал население ниже предела земли и заодно вычистил из мира
 * голод, а с ним недовольство и мятеж. Раз в пять лет — то, что запоминают.
 */
const OUTBREAK_CHANCE = 0.0005
/** Сколько суток мор держится в одном месте. */
const DURATION = [25, 70] as const
/** Шанс перекинуться к соседу за сутки. */
const SPREAD_CHANCE = 0.02
/** Какую долю жителей мор уносит за сутки при полной силе. */
const DEATHS_PER_DAY = 0.003
/**
 * Насколько вероятно за сутки, что из заражённого места побегут (этап 64, Ж3).
 *
 * Бегут не все и не сразу: сперва запираются по домам, потом уходят те, кому
 * есть куда. Из запертого места не бегут вовсе — в этом и смысл ворот.
 */
const FLIGHT_CHANCE = 0.04
/** Какая доля жителей уходит за один раз. */
const FLIGHT_SHARE = 0.06

export function tickPlague(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  plagues: readonly Plague[],
  rng: Rng,
  /** Где стоит лекарь: там мор уносит на треть меньше. */
  healerAt: string | null = null,
): PlagueResult {
  let generator = rng
  const events: PlagueEvent[] = []
  let places = settlements
  const next: Plague[] = []
  const infected = new Set(plagues.map((one) => one.locationId))

  // 1. Мор идёт своим чередом там, где уже начался.
  for (const plague of plagues) {
    const place = places[plague.locationId]
    if (!place || place.population <= 0) {
      events.push({ type: 'plagueEnded', locationId: plague.locationId })
      continue
    }
    // Голодный мрёт охотнее сытого: бедствия складываются.
    let weakness = 1 + (1 - foodSecurity(place)) * 0.8
    // Лекарь при больных и закрытые ворота — то, чем на мор отвечают.
    if (healerAt === plague.locationId) weakness *= 0.65
    if (place.quarantined) weakness *= 0.8
    // Чистая вода и бани: город, который моется, болеет меньше.
    if (place.buildings.includes('well')) weakness *= 0.85
    if (place.buildings.includes('bathhouse')) weakness *= 0.7
    // Доля в сутки, а не в разы: при одном проценте мор за век уносил
    // семьсот пятьдесят тысяч душ — втрое больше, чем в мире вообще живёт.
    // Теперь вспышка съедает от десятой до пятой части места, как и положено.
    const deaths = Math.round(place.population * plague.severity * DEATHS_PER_DAY * weakness)
    if (deaths > 0) {
      places = {
        ...places,
        [plague.locationId]: {
          ...place,
          population: Math.max(0, place.population - deaths),
          // Мор рвёт порядок не хуже войны.
          banditry: Math.min(1, place.banditry + 0.004),
        },
      }
      events.push({ type: 'plagueDeaths', locationId: plague.locationId, deaths })
    }

    // 1а. От мора бегут (этап 64, Ж3). Из запертого места не бегут — в этом
    // и смысл запертых ворот: карантин держит не только мор, но и людей.
    if (!place.quarantined && place.population > 0) {
      const [runs, afterRun] = rollChance(generator, FLIGHT_CHANCE * plague.severity)
      generator = afterRun
      if (runs) {
        const away = Object.values(neighbourSettlements(world, plague.locationId)).filter(
          (near) => !infected.has(near.id) && (places[near.id]?.population ?? 0) > 0,
        )
        const to = away[0]
        const from = places[plague.locationId]
        if (to && from) {
          const fled = Math.min(from.population * FLIGHT_SHARE, from.population * 0.2)
          const receiver = places[to.id]
          if (receiver && fled >= 1) {
            places = {
              ...places,
              [plague.locationId]: { ...from, population: from.population - fled },
              [to.id]: { ...receiver, population: receiver.population + fled },
            }
            events.push({
              type: 'plagueFlight',
              from: plague.locationId,
              to: to.id,
              people: Math.round(fled),
            })
          }
        }
      }
    }

    // 2. Перекидывается по дорогам: чем больше ездят, тем дальше уходит.
    // Сосед — ближайшее поселение, а не первое место за околицей: с версии 0.4
    // за околицей лежит земля, и по курганам мор не ходит.
    for (const near of neighbourSettlements(world, plague.locationId)) {
      if (infected.has(near.id)) continue
      const neighbour = places[near.id]
      if (!neighbour || neighbour.population <= 0) continue
      // Из-за закрытых ворот мор выходит втрое реже.
      const gate = place.quarantined ? 0.3 : 1
      const [spreads, afterSpread] = rollChance(generator, SPREAD_CHANCE * plague.severity * gate)
      generator = afterSpread
      if (!spreads) continue
      const [span, afterSpan] = nextInt(generator, DURATION[0], DURATION[1])
      generator = afterSpan
      infected.add(near.id)
      next.push({ locationId: near.id, daysLeft: span, severity: plague.severity * 0.9 })
      events.push({ type: 'plagueSpread', from: plague.locationId, to: near.id })
    }

    const daysLeft = plague.daysLeft - 1
    if (daysLeft <= 0) {
      events.push({ type: 'plagueEnded', locationId: plague.locationId })
      // Мор ушёл — ворота открывают.
      const healed = places[plague.locationId]
      if (healed?.quarantined) {
        places = { ...places, [plague.locationId]: { ...healed, quarantined: false } }
      }
      continue
    }
    next.push({ ...plague, daysLeft })
  }

  // 3. Новый мор рождается в скученности, а не где попало.
  const [begins, afterBegin] = rollChance(generator, OUTBREAK_CHANCE)
  generator = afterBegin
  if (begins) {
    const crowded = Object.values(places).filter(
      (one) => one.population >= CROWD && !infected.has(one.locationId),
    )
    if (crowded.length > 0) {
      const [index, afterIndex] = nextInt(generator, 0, crowded.length - 1)
      const [strength, afterStrength] = nextFloat(afterIndex)
      const [span, afterSpan] = nextInt(afterStrength, DURATION[0], DURATION[1])
      generator = afterSpan
      const victim = crowded[index]
      if (victim) {
        next.push({
          locationId: victim.locationId,
          daysLeft: span,
          severity: 0.5 + strength * 0.5,
        })
        events.push({ type: 'plagueBegan', locationId: victim.locationId })
      }
    }
  }

  return { plagues: next, settlements: places, rng: generator, events }
}

/** Идёт ли мор в этом месте: нужно и экрану, и решению «ехать ли туда». */
/**
 * Мор по соседству (этап 64, Ж3).
 *
 * Мор видно заранее: слухи приходят раньше самого мора, и в этом вся разница
 * между «умерли внезапно» и «мы знали и заперлись». Возвращает те из соседних
 * мест, где он уже идёт.
 */
export function plagueNearby(
  world: World,
  plagues: readonly Plague[],
  locationId: string,
): readonly Plague[] {
  const near = new Set(neighbourSettlements(world, locationId).map((one) => one.id))
  return plagues.filter((one) => near.has(one.locationId))
}

export function plagueAt(plagues: readonly Plague[], locationId: string): Plague | null {
  return plagues.find((one) => one.locationId === locationId) ?? null
}
