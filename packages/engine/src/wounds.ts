import type { Attributes } from './attributes'
import { clampAttribute } from './attributes'
import { type Rng, nextInt, rollChance } from './rng'

/**
 * Раны и плен.
 *
 * До этого проигранный бой значил одно — смерть, и пермадэт из редкого
 * становился обыденным: любая неудачная стычка кончала игру. Поражение должно
 * быть поражением, а не концом: чаще всего героя выносят с поля раненым, реже
 * берут в плен, и лишь иногда он не встаёт. Смерть остаётся настоящей — иначе
 * рана перестанет пугать.
 */
export interface Wound {
  /** Сколько суток до выздоровления. */
  readonly daysLeft: number
  /** Тяжесть 0..1: на сколько ослабляет тело, пока не зажило. */
  readonly severity: number
}

export interface Captivity {
  /** У кого: лорд или корона. */
  readonly captorId: string
  /** Сколько суток до выкупа или побега. */
  readonly daysLeft: number
  /** Сколько с тебя спросят. */
  readonly ransom: number
}

export type DefeatOutcome =
  | { readonly type: 'wounded'; readonly wound: Wound }
  | { readonly type: 'captured'; readonly captivity: Captivity }
  | { readonly type: 'killed' }

/** Шансы исхода поражения. Смерть — одна из десяти: редкая, но настоящая. */
export const DEFEAT_ODDS = { wounded: 0.6, captured: 0.3 } as const

export function defeatOutcome(
  rng: Rng,
  captorId: string,
  money: number,
  fortitude: number,
): [DefeatOutcome, Rng] {
  const [roll, afterRoll] = rollChance(rng, DEFEAT_ODDS.wounded)
  if (roll) {
    const [days, afterDays] = nextInt(afterRoll, 10, 30)
    // Стойкость сокращает постель: крепкий встаёт раньше.
    const daysLeft = Math.max(5, days - fortitude)
    return [
      { type: 'wounded', wound: { daysLeft, severity: Math.min(1, daysLeft / 30) } },
      afterDays,
    ]
  }
  const [captured, afterCapture] = rollChance(
    afterRoll,
    DEFEAT_ODDS.captured / (1 - DEFEAT_ODDS.wounded),
  )
  if (captured) {
    const [days, afterDays] = nextInt(afterCapture, 12, 40)
    return [
      {
        type: 'captured',
        captivity: { captorId, daysLeft: days, ransom: Math.max(50, Math.round(money * 0.5)) },
      },
      afterDays,
    ]
  }
  return [{ type: 'killed' }, afterCapture]
}

/** Тяжелее этого — постель: ни дороги, ни работы, ни боя. */
export const BEDRIDDEN = 0.5

export function bedridden(wound: Wound | null): boolean {
  return wound !== null && wound.severity >= BEDRIDDEN
}

/** Что рана делает с телом: сила и ловкость просаживаются, пока не заживёт. */
export function woundedAttributes(attributes: Attributes, wound: Wound | null): Attributes {
  if (!wound) return attributes
  const drop = Math.round(wound.severity * 3)
  return {
    ...attributes,
    strength: clampAttribute(attributes.strength - drop),
    agility: clampAttribute(attributes.agility - drop),
    endurance: clampAttribute(attributes.endurance - drop),
  }
}

/** Сутки заживления. Лекарь рядом — вдвое быстрее. */
export function healWound(wound: Wound, days: number, healer: boolean): Wound | null {
  const daysLeft = wound.daysLeft - days * (healer ? 2 : 1)
  if (daysLeft <= 0) return null
  return { ...wound, daysLeft, severity: Math.min(wound.severity, daysLeft / 30) }
}
