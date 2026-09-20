import { KEEPER_DEFS, type KeeperKind, SECRET, SECRET_WORDS } from './content/secret'
import { courtiersOf } from './courtier'
import { PLAYER } from './holding'
import type { GameState } from './state'
import { type Treaty, breachCost, secretDef, treatiesOf } from './treaty'
import { atWar } from './war'
import type { World } from './world/types'

/**
 * Тайные переговоры (этап 115).
 *
 * С этапа 80 у грамоты была тайная статья, но утекала она броском. Здесь тайну
 * держат люди: канцлер, писец, свидетель, человек двора, чужая сторона — и
 * утечка выводится из того, кто именно был в комнате.
 *
 * Отсюда берутся три вещи, которых не было: можно заплатить за молчание, можно
 * посчитать, чего стоит раскрытие, и можно попасться на двойной игре.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

export interface Keeper {
  readonly kind: KeeperKind
  readonly name: string
  readonly leaks: number
}

/** Кто держит эту тайну (Тн2). */
export function keepersOf(state: GameState, treaty: Treaty, day: number): readonly Keeper[] {
  const out: Keeper[] = []
  const court = courtiersOf(state, day)
  const chancellor = court.find((one) => one.office === 'chancellor')
  if (chancellor) {
    // Дошлый канцлер течёт вдвое: у него свои дела с теми, кому он расскажет.
    const slyer = chancellor.temper === 'sly' ? 2 : chancellor.temper === 'zealous' ? 0.5 : 1
    out.push({
      kind: 'chancellor',
      name: chancellor.name,
      leaks: KEEPER_DEFS.chancellor.leaks * slyer,
    })
  }
  out.push({ kind: 'clerk', name: 'писец', leaks: KEEPER_DEFS.clerk.leaks })
  if (treaty.guarantor) {
    out.push({
      kind: 'guarantor',
      name: KEEPER_DEFS.guarantor.label,
      leaks: KEEPER_DEFS.guarantor.leaks,
    })
  }
  // Кто ещё был в комнате: чем больше двор, тем меньше тайн.
  const others = court.filter((one) => one.office !== 'chancellor')
  const inRoom = others.slice(0, 1 + (hashOf(treaty.id) % 2))
  for (const one of inRoom) {
    out.push({ kind: 'courtier', name: one.name, leaks: KEEPER_DEFS.courtier.leaks })
  }
  out.push({ kind: 'theirs', name: KEEPER_DEFS.theirs.label, leaks: KEEPER_DEFS.theirs.leaks })
  return out
}

/**
 * Кто и с какой вероятностью проговорится за сутки (Тн2).
 *
 * Не «шанс утечки», а сумма людей: у каждого своя доля, и молчание каждого
 * можно купить отдельно. Купленное молчание держится своё время и кончается.
 */
export function leakNow(
  state: GameState,
  treaty: Treaty,
  day: number,
): { readonly chance: number; readonly who: Keeper | null; readonly says: string } {
  if (!treaty.secret || treaty.secret.known) {
    return { chance: 0, who: null, says: 'Тут уже нечего скрывать.' }
  }
  const hushedUntil = state.hushed?.[treaty.id] ?? 0
  const keepers = keepersOf(state, treaty, day)
  const age = Math.max(0, day - treaty.sinceDay) / 365
  let worst: Keeper | null = null
  let chance = 0
  for (const keeper of keepers) {
    const own = (keeper.leaks * (1 + age)) / 365
    chance += own
    if (!worst || keeper.leaks > worst.leaks) worst = keeper
  }
  if (day < hushedUntil) chance *= 0.25
  return {
    chance: Math.round(chance * 10000) / 10000,
    who: worst,
    says: `${SECRET_WORDS.keepers} Их ${keepers.length}: ${keepers.map((one) => one.name).join(', ')}. За сутки ${Math.round(chance * 10000) / 100} из ста${day < hushedUntil ? ' (молчание куплено)' : ''}.`,
  }
}

/** Во что встанет молчание всех, кто в комнате (Тн1). */
export function hushCost(state: GameState, treaty: Treaty, day: number): number {
  return keepersOf(state, treaty, day).length * SECRET.hushPerKeeper
}

/**
 * Чего стоит раскрытие (Тн3).
 *
 * Раскрытая тайна бьёт по слову сильнее нарушенной явной грамоты: нарушенное
 * слово хотя бы было словом, а тайное — это то, что ты говорил не вслух.
 */
export function exposeCost(treaty: Treaty): {
  readonly other: number
  readonly world: number
  readonly says: string
} {
  const open = breachCost(treaty)
  const secret = treaty.secret ? secretDef(treaty.secret.id) : null
  const other = Math.round(open.other * SECRET.worseThanBreach + (secret?.angers ?? 0) / 2)
  const world = Math.round(open.world * SECRET.worseThanBreach)
  return {
    other,
    world,
    says: `${SECRET_WORDS.worse} Явное нарушение: ${open.other} и ${open.world}; раскрытая тайна: ${other} и ${world}.`,
  }
}

/**
 * Двойная игра (Тн4).
 *
 * Обещать одно и то же против одного и того же двоим можно — пока оба об этом
 * не узнали. Считается не броском, а сличением грамот: две тайные статьи
 * против одной короны и есть двойная игра.
 */
export function doubleGames(
  state: Pick<GameState, 'treaties'>,
  day: number,
): readonly { readonly against: string; readonly with: readonly string[] }[] {
  const byTarget = new Map<string, string[]>()
  for (const treaty of treatiesOf(state)) {
    if (!treaty.secret?.against || treaty.brokenBy) continue
    if (treaty.untilDay !== 0 && treaty.untilDay <= day) continue
    if (treaty.a !== PLAYER && treaty.b !== PLAYER) continue
    const other = treaty.a === PLAYER ? treaty.b : treaty.a
    const had = byTarget.get(treaty.secret.against) ?? []
    byTarget.set(treaty.secret.against, [...had, other])
  }
  const out: { against: string; with: readonly string[] }[] = []
  for (const [against, sides] of byTarget) {
    if (sides.length < 2) continue
    out.push({ against, with: sides })
  }
  return out
}

/** Поймали ли на двойной игре: ловит тот, у кого есть свои глаза при дворе. */
export function caughtDouble(
  state: GameState,
  world: World,
  day: number,
): { readonly caught: boolean; readonly against: string | null; readonly says: string } {
  const games = doubleGames(state, day)
  if (games.length === 0)
    return { caught: false, against: null, says: 'Двойной игры ты не ведёшь.' }
  const game = games[0]
  if (!game) return { caught: false, against: null, says: 'Двойной игры ты не ведёшь.' }
  // Ловится тем скорее, чем дольше игра идёт и чем больше сторон в ней.
  const roll = (hashOf(`double:${game.against}:${Math.floor(day / SECRET.beat)}`) % 1000) / 1000
  const chance = Math.min(0.9, 0.2 * game.with.length)
  return {
    caught: roll < chance,
    against: game.against,
    says:
      roll < chance
        ? `${SECRET_WORDS.caught} ${SECRET_WORDS.double} Против ${world.kingdoms[game.against]?.name ?? game.against} — с ${game.with.length} дворами.`
        : `${SECRET_WORDS.double} Пока не поймали (ловят в ${Math.round(chance * 100)} случаях из ста).`,
  }
}

/**
 * Чужие тайные сговоры (Тн5).
 *
 * Выводятся из мира, а не хранятся: две короны, у которых общий враг и нет
 * между собой войны, договариваются не вслух. Узнать об этом можно, и это
 * стоит серебра.
 */
export interface OtherSecret {
  readonly a: string
  readonly b: string
  readonly against: string
  readonly sinceDay: number
  readonly says: string
}

export function theirSecrets(state: GameState, world: World, day: number): readonly OtherSecret[] {
  const sides = Object.keys(world.kingdoms)
  const beat = Math.floor(day / SECRET.beat)
  const out: OtherSecret[] = []
  for (let i = 0; i < sides.length; i += 1) {
    for (let j = i + 1; j < sides.length; j += 1) {
      const a = sides[i]
      const b = sides[j]
      if (!a || !b || atWar(state.politics, a, b)) continue
      // Общий враг — тот, с кем воюют оба (или ты, если воюешь с обоими).
      const against = sides.find(
        (one) =>
          one !== a && one !== b && atWar(state.politics, a, one) && atWar(state.politics, b, one),
      )
      const common =
        against ??
        (atWar(state.politics, a, PLAYER) && atWar(state.politics, b, PLAYER) ? PLAYER : null)
      if (!common) continue
      if (hashOf(`pact:${a}:${b}:${beat}`) % 3 !== 0) continue
      out.push({
        a,
        b,
        against: common,
        sinceDay: beat * SECRET.beat,
        says: `${world.kingdoms[a]?.name ?? a} и ${world.kingdoms[b]?.name ?? b} сговорились против ${common === PLAYER ? 'тебя' : (world.kingdoms[common]?.name ?? common)}.`,
      })
    }
  }
  return out
}

export interface SecretLedger {
  readonly made: number
  readonly leaked: number
  readonly hushed: number
  readonly caught: number
  readonly says: string
}

/** Тайны в числах (Тн6). */
export function secretLedger(state: Pick<GameState, 'secretLog'>): SecretLedger {
  const log = state.secretLog ?? { made: 0, leaked: 0, hushed: 0, caught: 0 }
  return {
    ...log,
    says:
      log.made === 0 && log.hushed === 0
        ? 'Тайных статей за тобой пока нет.'
        : `Тайн ${log.made}: утекло ${log.leaked}, куплено молчание ${log.hushed} раз, на двойной игре поймали ${log.caught} раз.`,
  }
}

export { SECRET, SECRET_WORDS, KEEPER_DEFS, type KeeperKind }
