import { SHOW_DEFS } from './content/envoy'
import { SENESCHAL_NAMES } from './content/estate'
import { RESIDENT, RESIDENT_WORDS, RISK_DEFS, type ResidentRisk } from './content/resident'
import { PLAYER } from './holding'
import type { Word } from './known'
import { crownGame, strengthOf } from './mind'
import type { GameState } from './state'
import { atWar, relationOf } from './war'
import type { World } from './world/types'

/**
 * Постоянный посол (этап 117).
 *
 * Выездное посольство (этап 114) привозит картину раз в несколько месяцев и
 * стареет в дороге. Постоянный посол пишет каждые десять суток, и вилка его
 * вестей вдвое уже. За это платят три раза: серебром каждый день, риском — и
 * тем, что человек, живущий там годами, начинает смотреть их глазами.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

export interface Resident {
  readonly id: string
  /** При какой короне сидит. */
  readonly at: string
  readonly name: string
  readonly sinceDay: number
  readonly skill: number
  /** Куплен ли он ими. */
  readonly bought?: boolean
}

export function residentsOf(state: Pick<GameState, 'residents'>): readonly Resident[] {
  return state.residents ?? []
}

export function residentAt(state: Pick<GameState, 'residents'>, at: string): Resident | null {
  return residentsOf(state).find((one) => one.at === at) ?? null
}

/** Сколько стоит держать всех своих послов в сутки (Рп1). */
export function residentCost(state: Pick<GameState, 'residents'>): number {
  return residentsOf(state).length * RESIDENT.perDay
}

/**
 * Насколько он уже их человек (Рп3).
 *
 * Не предательство, а привычка: он живёт их жизнью, слушает их доводы и
 * начинает считать их правыми. Этого нельзя купить обратно — можно только
 * сменить человека.
 */
export function nativeShare(resident: Resident, day: number): number {
  if (resident.bought) return RESIDENT.nativeMax
  const years = Math.max(0, day - resident.sinceDay - RESIDENT.nativeAfter) / 365
  if (years <= 0) return 0
  return Math.round(Math.min(RESIDENT.nativeMax, years * RESIDENT.nativePerYear) * 100) / 100
}

/** Вести, которые он присылает (Рп2 и Рп3). */
export function residentWords(
  state: GameState,
  world: World,
  resident: Resident,
  day: number,
): readonly Word[] {
  const truth = strengthOf(state, world, resident.at, day)
  const native = nativeShare(resident, day)
  // Приросший к месту показывает их слабее и добрее, чем они есть.
  const shade = 1 - native * 0.4
  const plan = crownGame(state, world, resident.at, day)
  return [
    {
      id: `resident:${resident.id}:strength:${day}`,
      to: PLAYER,
      kind: 'strength',
      about: resident.at,
      value: Math.max(0, Math.round(truth.score * shade)),
      source: 'own',
      from: resident.name,
      day,
    },
    ...(native >= 0.5
      ? []
      : [
          {
            id: `resident:${resident.id}:aim:${day}`,
            to: PLAYER,
            kind: 'aim' as const,
            about: resident.at,
            value: plan.aim,
            source: 'own' as const,
            from: resident.name,
            day,
          },
        ]),
  ]
}

/**
 * Что с ним может случиться (Рп4).
 *
 * Высылают там, где тебя не терпят; покупают там, где богато; уличают там, где
 * ты слишком много спрашиваешь. Считается нравом мира, а не броском.
 */
export function riskNow(
  state: GameState,
  world: World,
  resident: Resident,
  day: number,
): { readonly risk: ResidentRisk; readonly chance: number; readonly says: string } {
  const relation = relationOf(state.politics, PLAYER, resident.at)
  const warring = atWar(state.politics, PLAYER, resident.at)
  const years = Math.max(0, day - resident.sinceDay) / 365
  const spies = (state.spies ?? []).filter((one) => one.kingdomId === resident.at).length
  const expel = warring ? 0.5 : relation < RESIDENT.expelAt ? 0.2 : 0.03
  const buy = Math.min(0.25, 0.04 * years)
  const caught = Math.min(0.3, spies * 0.12)
  const roll =
    (hashOf(`resident:${resident.id}:${Math.floor(day / RESIDENT.riskBeat)}`) % 1000) / 1000
  const risk: ResidentRisk =
    roll < expel
      ? 'expelled'
      : roll < expel + buy
        ? 'bought'
        : roll < expel + buy + caught
          ? 'caught'
          : 'none'
  return {
    risk,
    chance: Math.round((expel + buy + caught) * 100) / 100,
    says: `${RISK_DEFS[risk].label}: ${RISK_DEFS[risk].about} (выслать ${Math.round(expel * 100)}, купить ${Math.round(buy * 100)}, уличить ${Math.round(caught * 100)} из ста)`,
  }
}

/** Чужие постоянные послы у тебя (Рп5). Выводятся из мира, а не хранятся. */
export interface TheirResident {
  readonly from: string
  readonly name: string
  readonly sinceDay: number
  readonly says: string
}

export function theirResidents(
  state: GameState,
  world: World,
  day: number,
): readonly TheirResident[] {
  if (!state.realm) return []
  const out: TheirResident[] = []
  for (const side of Object.keys(world.kingdoms)) {
    const relation = relationOf(state.politics, PLAYER, side)
    // Сидят те, кому ты интересен: друзья и враги. Равнодушные не тратятся.
    if (Math.abs(relation) < 15 && !atWar(state.politics, PLAYER, side)) continue
    const seed = hashOf(`theirs:${side}`)
    const name = SENESCHAL_NAMES[seed % SENESCHAL_NAMES.length] ?? 'посол'
    const since = state.realm.sinceDay ?? 1
    out.push({
      from: side,
      name: `${name}, посол ${world.kingdoms[side]?.name ?? side}`,
      sinceDay: since,
      says: `${name} сидит при твоём дворе от ${world.kingdoms[side]?.name ?? side} с ${since}-го дня.`,
    })
  }
  return out
}

/** Что чужой резидент увозит о тебе: решает то, что ты показываешь (Рп5). */
export function theyLearn(
  state: GameState,
  world: World,
  theirs: TheirResident,
  day: number,
): { readonly sees: number; readonly truth: number; readonly says: string } {
  const truth = strengthOf(state, world, PLAYER, day).score
  const show = state.showing?.[theirs.from] ?? 'plain'
  const def = SHOW_DEFS[show]
  // Постоянный посол видит больше гостя: показное держится вполовину.
  const held = 1 + (def.strength - 1) * 0.5
  const sees = Math.max(0, Math.round(truth * held))
  return {
    sees,
    truth,
    says: `${theirs.name}: пишет своим, что у тебя ${sees} при правде ${truth} (${def.label}; постоянного не обманешь вполне).`,
  }
}

export interface ResidentLedger {
  readonly seated: number
  readonly words: number
  readonly lost: number
  readonly live: number
  readonly perDay: number
  readonly says: string
}

/** Резиденты в числах (Рп6). */
export function residentLedger(
  state: Pick<GameState, 'residents' | 'residentLog'>,
): ResidentLedger {
  const log = state.residentLog ?? { seated: 0, words: 0, lost: 0 }
  const live = residentsOf(state).length
  return {
    ...log,
    live,
    perDay: residentCost(state),
    says:
      log.seated === 0
        ? 'Постоянных послов ты не держишь.'
        : `Посольств посажено ${log.seated}, стоит сейчас ${live} (${residentCost(state)} серебра в сутки); прислали ${log.words} вестей, потеряно ${log.lost}.`,
  }
}

export { RESIDENT, RESIDENT_WORDS, RISK_DEFS, type ResidentRisk }
