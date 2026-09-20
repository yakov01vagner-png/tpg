import { type Band, bandSize } from './band'
import { LEARN } from './content/learning'
import { RUSE, RUSE_DEFS, RUSE_WORDS, type RuseKind } from './content/ruse'
import { visibleTo } from './fog'
import { PLAYER } from './holding'
import type { Word } from './known'
import type { GameState } from './state'
import { atWar } from './war'
import { neighbourSettlements } from './world/queries'
import type { World } from './world/types'

/**
 * Обман на войне (этап 112).
 *
 * Пока все всё видели, врать было некому: ложь требует чужого незнания.
 * Туман этапов 109–111 его завёл, и здесь оно наконец обращается в ход.
 *
 * Обман — это не бросок и не невидимая прибавка. Это весть, которую ты кладёшь
 * в чужое знание тем же слоем, каким туда попадает правда (этап 99). Оттого
 * его можно раскусить: смотрит тот же код, что смотрит на правду.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

export interface Ruse {
  readonly id: string
  readonly kind: RuseKind
  /** Кто врёт. */
  readonly by: string
  /** Где показано. */
  readonly locationId: string
  /** Сколько людей показано (для лагеря и демонстрации). */
  readonly men: number
  /** Чья часть этим занята, если занята. */
  readonly hostId: string | null
  readonly sinceDay: number
  readonly untilDay: number
}

/**
 * Сколько раз этот приём уже показывали — и насколько он от этого выдохся
 * (этап 198, Ош3).
 *
 * Считается по тем же обманам, что уже записаны: ничего нового не хранится.
 * Старое забывается, и через `LEARN.forgetsDays` приём снова идёт как новый.
 */
export function wiseTo(
  state: Pick<GameState, 'ruses'>,
  kind: RuseKind,
  day: number,
  skipId?: string,
): { readonly times: number; readonly adds: number } {
  const times = (state.ruses ?? []).filter(
    (one) =>
      one.kind === kind &&
      one.id !== skipId &&
      one.sinceDay <= day &&
      day - one.sinceDay < LEARN.forgetsDays,
  ).length
  return { times, adds: Math.round(times * LEARN.perRepeat * 100) / 100 }
}

export function ruseDef(kind: RuseKind) {
  return RUSE_DEFS[kind]
}

export function rusesOf(state: Pick<GameState, 'ruses'>): readonly Ruse[] {
  return state.ruses ?? []
}

export function aliveRuses(state: Pick<GameState, 'ruses'>, day: number): readonly Ruse[] {
  return rusesOf(state).filter((one) => day < one.untilDay)
}

/** Завести обман: срок и цена — из содержимого, а не из кода. */
export function ruseFrom(
  kind: RuseKind,
  by: string,
  locationId: string,
  men: number,
  day: number,
  hostId: string | null = null,
): Ruse {
  return {
    id: `ruse:${kind}:${locationId}:${day}`,
    kind,
    by,
    locationId,
    men,
    hostId,
    sinceDay: day,
    untilDay: day + RUSE_DEFS[kind].days,
  }
}

/**
 * Весть, которую обман кладёт в чужое знание (О1 и О3).
 *
 * Ложный лагерь — это не «минус к видимости», а строка того же вида, какую
 * приносит настоящий дозор. Потому она и работает: чужая сторона не может
 * отличить её иначе, чем разобравшись.
 */
export function ruseWord(ruse: Ruse, to: string, day: number): Word {
  return {
    id: `${ruse.id}:${to}`,
    to,
    kind: 'host',
    about: ruse.id,
    value: ruse.locationId,
    source: ruse.kind === 'rumour' ? 'rumour' : 'own',
    from: null,
    day,
  }
}

/**
 * Раскусили ли (О5).
 *
 * Смотрит то же самое, чем смотрят на правду: дозор рядом, ум того, кто
 * смотрит, и то, насколько обман вообще плотен. Ничего скрытого: разоблачение
 * выводится, а не разыгрывается.
 */
export function seesThrough(
  state: GameState,
  world: World,
  who: string,
  ruse: Ruse,
  day: number,
): { readonly seen: boolean; readonly chance: number; readonly says: string } {
  const def = RUSE_DEFS[ruse.kind]
  const area = visibleTo(state, world, who)
  const eye = area.get(ruse.locationId)
  const near = eye?.eye === 'host' ? RUSE.scoutSees : eye ? RUSE.scoutSees / 2 : 0
  const wits =
    who === PLAYER ? Math.max(0, state.character.attributes.mind - 6) * RUSE.witsPerPoint : 0.1
  // Чем дольше держится костёр, в который никто не подкладывает, тем виднее.
  const age = Math.max(0, day - ruse.sinceDay) / Math.max(1, def.days)
  // Плотность обмана делит всё, а не вычитает: плотную ложь не берут ни глаза,
  // ни ум по отдельности — её берёт их сумма, и то не сразу.
  // Тот же приём в третий раз ждут (этап 198, Ош3): каждый прежний обман того
  // же рода прибавляет смотрящему зоркости, пока о нём не забыли.
  const wiser = who === PLAYER ? 0 : wiseTo(state, ruse.kind, day, ruse.id).adds
  const looking = (near + wits + age * 0.4 + wiser) * (1 - def.holds) * 2
  const chance = Math.round(Math.min(0.95, Math.max(0, looking)) * 100) / 100
  // Не бросок: один и тот же взгляд на один и тот же обман видит одно и то же.
  const roll = (hashOf(`${ruse.id}:${who}:${Math.floor(day / 3)}`) % 1000) / 1000
  const seen = roll < chance
  return {
    seen,
    chance,
    says: seen
      ? `${RUSE_WORDS.seen} (${Math.round(chance * 100)} из ста)`
      : `${RUSE_WORDS.held} (раскусили бы в ${Math.round(chance * 100)} случаях из ста)`,
  }
}

/**
 * Кого оттянула демонстрация (О2).
 *
 * Работает не на силе, а на чужом незнании: чужая сторона поворачивает на то,
 * что показано, ровно пока верит показанному.
 */
export function pulledBy(state: GameState, world: World, ruse: Ruse, day: number): readonly Band[] {
  if (ruse.kind !== 'demo') return []
  const near = neighbourSettlements(world, ruse.locationId, RUSE.pullHops)
  const reach = new Set([ruse.locationId, ...near.map((one) => one.id)])
  return state.bands.filter((band) => {
    if (band.lordId === PLAYER || band.kingdomId === PLAYER) return false
    if (!reach.has(band.locationId)) return false
    if (band.kingdomId && !atWar(state.politics, ruse.by, band.kingdomId)) return false
    const eyes = seesThrough(state, world, band.kingdomId ?? band.lordId, ruse, day)
    return !eyes.seen
  })
}

/** Кто вошёл в засаду (О4). */
export function walkedInto(state: GameState, ruse: Ruse): readonly Band[] {
  if (ruse.kind !== 'ambush') return []
  return state.bands.filter(
    (band) =>
      band.lordId !== PLAYER &&
      band.kingdomId !== PLAYER &&
      band.locationId === ruse.locationId &&
      !band.travel &&
      bandSize(band) > 0,
  )
}

/**
 * Чужие обманы (О5).
 *
 * Выводятся из мира, а не хранятся: у воюющей короны с осаждённым или
 * оспариваемым местом раз в несколько суток заводится свой ложный лагерь. Тем
 * же способом, каким ты заводишь свой, — и раскусывается тем же.
 */
export function theirRuses(state: GameState, world: World, day: number): readonly Ruse[] {
  const made: Ruse[] = []
  const beat = Math.floor(day / RUSE.beat)
  for (const band of state.bands) {
    if (band.lordId === PLAYER || band.kingdomId === PLAYER) continue
    const side = band.kingdomId ?? band.lordId
    if (!atWar(state.politics, PLAYER, side)) continue
    // Не всякий и не всегда: примерно один из шести отрядов в эти сутки.
    if (hashOf(`${band.id}:${beat}`) % 6 !== 0) continue
    const near = neighbourSettlements(world, band.locationId, 4)
    const where = near[hashOf(`${band.id}:where:${beat}`) % Math.max(1, near.length)]?.id
    if (!where) continue
    made.push({
      ...ruseFrom('camp', side, where, Math.round(bandSize(band) * 1.5), day),
      id: `ruse:theirs:${band.id}:${beat}`,
    })
  }
  return made
}

export interface RuseLedger {
  readonly made: number
  readonly worked: number
  readonly seen: number
  readonly live: number
  readonly says: string
}

/** Обман в числах (О6). */
export function ruseLedger(state: Pick<GameState, 'ruses' | 'ruseLog'>, day: number): RuseLedger {
  const log = state.ruseLog ?? { made: 0, worked: 0, seen: 0 }
  const live = aliveRuses(state, day).length
  return {
    ...log,
    live,
    says:
      log.made === 0
        ? 'Врать на войне ты ещё не пробовал.'
        : `Обманов заведено ${log.made}: сработало ${log.worked}, раскусили ${log.seen}. Сейчас живых ${live}.`,
  }
}

export { RUSE, RUSE_DEFS, RUSE_WORDS, type RuseKind }
