import {
  ENVOY,
  ENVOY_EYE_DEFS,
  ENVOY_WORDS,
  type EnvoyEye,
  SHOW_DEFS,
  type ShowKind,
} from './content/envoy'
import type { EnvoyChoice } from './embassy'
import { PLAYER } from './holding'
import type { Word } from './known'
import { crownGame } from './mind'
import { strengthOf } from './mind'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Посол как глаза (этап 114).
 *
 * До 0.8 посольство привозило одно слово — да или нет, — потому что всё
 * остальное о чужой короне игрок и так знал точно. Теперь не знает, и посол
 * становится тем, чем он был в жизни: единственным способом посмотреть на
 * чужой двор. Смотрит при этом он, а не ты, — и привозит своё.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

/** Каким глазом смотрит этот человек (Пс2 и Пс3). */
export function eyeOf(envoy: EnvoyChoice | null): EnvoyEye {
  if (!envoy) return 'timid'
  const eyes = Object.keys(ENVOY_EYE_DEFS) as EnvoyEye[]
  // Вассал за державой видит силу; приметливость приходит с умением.
  if (envoy.skill >= 7) return 'keen'
  if (envoy.kind === 'vassal') return 'bold'
  return eyes[hashOf(`eye:${envoy.id}`) % eyes.length] ?? 'timid'
}

/** Что посол видит на чужом дворе и с какой поправкой (Пс1 и Пс2). */
export interface EnvoySight {
  readonly eye: EnvoyEye
  readonly strength: number
  readonly purse: number
  readonly aim: string
  readonly truthStrength: number
  readonly truthPurse: number
  readonly off: number
  readonly says: string
}

export function envoySight(
  state: GameState,
  world: World,
  to: string,
  envoy: EnvoyChoice | null,
  day: number,
): EnvoySight {
  const eye = eyeOf(envoy)
  const def = ENVOY_EYE_DEFS[eye]
  const truth = strengthOf(state, world, to, day)
  const purse = Math.round(truth.places * 420)
  // Умение сужает поправку, но не меняет её знака: робкий умелый боится меньше,
  // но всё равно боится.
  const narrow = Math.max(0.25, 1 - (envoy?.skill ?? 0) * ENVOY.skillNarrows)
  const offStrength = Math.round(def.onStrength * narrow * 100) / 100
  const offPurse = Math.round(def.onPurse * narrow * 100) / 100
  const plan = crownGame(state, world, to, day)
  const right = (hashOf(`aim:${to}:${envoy?.id ?? 'letter'}:${day}`) % 1000) / 1000 < def.onAim
  return {
    eye,
    strength: Math.max(0, Math.round(truth.score * (1 + offStrength))),
    purse: Math.max(0, Math.round(purse * (1 + offPurse))),
    aim: right ? plan.aim : 'unclear',
    truthStrength: truth.score,
    truthPurse: purse,
    off: offStrength,
    says: `${ENVOY_WORDS.brought} ${envoy?.name ?? 'Письмо'} (${def.label}): ${def.about}`,
  }
}

/** Вести, которые посольство привозит: они ложатся в общий слой знания (Пс1). */
export function envoyWords(
  sight: EnvoySight,
  to: string,
  day: number,
  id: string,
): readonly Word[] {
  return [
    {
      id: `envoy:${id}:strength`,
      to: PLAYER,
      kind: 'strength',
      about: to,
      value: sight.strength,
      source: 'envoy',
      from: null,
      day,
    },
    {
      id: `envoy:${id}:purse`,
      to: PLAYER,
      kind: 'purse',
      about: to,
      value: sight.purse,
      source: 'envoy',
      from: null,
      day,
    },
    ...(sight.aim === 'unclear'
      ? []
      : [
          {
            id: `envoy:${id}:aim`,
            to: PLAYER,
            kind: 'aim' as const,
            about: to,
            value: sight.aim,
            source: 'envoy' as const,
            from: null,
            day,
          },
        ]),
  ]
}

/** Чужой посол у тебя: кто приехал и до какого дня гостит (Пс4). */
export interface Guest {
  readonly from: string
  readonly name: string
  readonly eye: EnvoyEye
  readonly sinceDay: number
  readonly untilDay: number
  readonly says: string
}

export function guestNow(state: GameState, world: World, day: number): Guest | null {
  // Приезжают те, с кем у тебя вообще есть дело: сосед, союзник или враг.
  const sides = Object.keys(world.kingdoms).filter((one) => one !== PLAYER)
  if (sides.length === 0 || !state.realm) return null
  const turn = Math.floor(day / ENVOY.guestBeat)
  const seed = hashOf(`guest:${turn}`)
  if (seed % 3 !== 0) return null
  const from = sides[seed % sides.length]
  if (!from) return null
  const eyes = Object.keys(ENVOY_EYE_DEFS) as EnvoyEye[]
  const eye = eyes[(seed >>> 8) % eyes.length] ?? 'keen'
  const since = turn * ENVOY.guestBeat
  return {
    from,
    name: `посол ${world.kingdoms[from]?.name ?? from}`,
    eye,
    sinceDay: since,
    untilDay: since + ENVOY.guestDays,
    says: `${ENVOY_WORDS.guest} ${ENVOY_EYE_DEFS[eye].label} ${world.kingdoms[from]?.name ?? from}: гостит до ${since + ENVOY.guestDays}-го дня.`,
  }
}

/**
 * Что увидел гость (Пс4 и Пс5).
 *
 * Показать можно и то, чего нет, — но перестараться значит попасться:
 * приметливый гость видит показное, и тогда он уезжает с обратным выводом.
 */
export function showTo(
  state: GameState,
  world: World,
  guest: Guest,
  show: ShowKind,
  day: number,
): {
  readonly sees: number
  readonly truth: number
  readonly caught: boolean
  readonly says: string
} {
  const def = SHOW_DEFS[show]
  const truth = strengthOf(state, world, PLAYER, day).score
  const keen = guest.eye === 'keen'
  // Приметливый берёт показное тем вернее, чем сильнее ты перестарался. Но
  // убеждение — дело хозяина (этап 123, Н4): краснобая слушают и приметливые.
  const overdone = Math.abs(def.strength - 1) - state.character.skills.persuasion.level * 0.004
  const caught = keen && overdone > 0.3
  const sees = Math.max(0, Math.round(truth * (caught ? 1 : def.strength)))
  return {
    sees,
    truth,
    caught,
    says: caught
      ? `${ENVOY_WORDS.caught} ${guest.name} уехал с правдой: ${sees}.`
      : `${ENVOY_WORDS.shown} ${def.label}: ${guest.name} уехал с ${sees} при правде ${truth}.`,
  }
}

export interface EnvoyLedger {
  readonly sent: number
  readonly brought: number
  readonly offBy: number
  readonly guests: number
  readonly says: string
}

/** Посольства в числах (Пс6). */
export function envoyLedger(state: Pick<GameState, 'envoyLog'>): EnvoyLedger {
  const log = state.envoyLog ?? { sent: 0, brought: 0, offSum: 0, guests: 0 }
  const offBy = log.brought === 0 ? 0 : Math.round((log.offSum / log.brought) * 100) / 100
  return {
    sent: log.sent,
    brought: log.brought,
    offBy,
    guests: log.guests,
    says:
      log.sent === 0
        ? 'Послов ты ещё не слал.'
        : `Посольств ${log.sent}, привезли вестей ${log.brought}; в среднем их числа расходились с правдой на ${Math.round(Math.abs(offBy) * 100)} из ста. Чужих послов принято ${log.guests}.`,
  }
}

export { ENVOY, ENVOY_EYE_DEFS, ENVOY_WORDS, SHOW_DEFS, type EnvoyEye, type ShowKind }
