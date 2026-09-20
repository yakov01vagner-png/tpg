import { bandSize } from './band'
import type { Band } from './band'
import { EYE_DEFS, type EyeKind, FOG, FOG_WORDS } from './content/fog'
import type { SourceKind } from './content/known'
import { ROLE_DEFS, SCOUT } from './content/scout'
import { PLAYER } from './holding'
import { type Word, bring } from './known'
import { placeRep } from './reputation'
import type { GameState } from './state'
import { atWar } from './war'
import { neighbourSettlements, roadsFrom } from './world/queries'
import type { World } from './world/types'

/**
 * Где чужое войско (этап 109).
 *
 * До 0.8 карта знала всё: чужая дружина стояла на ней всегда и точно. Здесь у
 * войска появляется две разные вещи — где оно есть и где его видели. Первое
 * знает мир, второе знаешь ты, и разница между ними растёт со временем: чем
 * дольше о войске не было вестей, тем шире круг, в котором оно может быть.
 *
 * Хранится при этом только увиденное — вести о войске (`host`) ложатся в общий
 * слой знания этапа 99. Круг неизвестности не хранится: он считается из
 * возраста вести, как и всё остальное в этой версии.
 */

/** Что известно о чужой дружине. */
export interface Sighting {
  readonly bandId: string
  /** Где её видели. Пусто — не видели вовсе. */
  readonly seenAt: string | null
  /** Кто видел и когда. */
  readonly by: SourceKind | null
  readonly day: number
  readonly age: number
  /** В скольких переходах от того места она может быть теперь. */
  readonly drift: number
  /** Стоит ли она там, где её видели, прямо сейчас. */
  readonly sure: boolean
  readonly says: string
}

/** Насколько расплылось место войска за столько суток без вестей. */
export function driftOf(age: number): number {
  if (age <= 0) return 0
  return Math.min(FOG.maxDrift, Math.round(age * FOG.driftPerDay * 10) / 10)
}

/** Где оно может быть теперь: круг тем шире, чем старее весть (Т2). */
export function mightBeIn(world: World, seenAt: string | null, drift: number): readonly string[] {
  if (!seenAt) return []
  if (drift < 1) return [seenAt]
  const near = neighbourSettlements(world, seenAt, Math.ceil(drift))
  return [seenAt, ...near.filter((one) => one.hops <= drift).map((one) => one.id)]
}

/**
 * Чей глаз видит это войско сейчас (Т3).
 *
 * Своё место видит на переход вокруг, своя часть в поле — на два, купец ходит
 * дорогами, а местные говорят только там, где тебя любят. Оттого разведка —
 * это не кнопка, а расположение: видишь ровно там, где у тебя кто-то есть.
 */
export function whoSees(
  state: GameState,
  world: World,
  who: string,
  band: Band,
  day: number,
): { readonly eye: EyeKind; readonly from: string } | null {
  const where = band.locationId
  const mine = eyesOf(state, who)
  // Глаз видит не соседние поселения, а округу по дорогам: войско стоит и в
  // поле, и на броде, и под курганом, и увидеть его там тоже можно.
  const shut = screenedArea(state, world, who)
  if (shut.has(where)) return null
  let best: { eye: EyeKind; from: string } | null = null
  for (const eye of mine) {
    const reach = eye.reach ?? EYE_DEFS[eye.eye].hops
    if (eye.eye === 'peasant' && placeRep(state.reputation, eye.from) < FOG.peasantRep) continue
    const hops = roadHops(world, eye.from, where, reach)
    if (hops === null) continue
    if (!best || EYE_DEFS[eye.eye].delay < EYE_DEFS[best.eye].delay) best = eye
  }
  return best
}

/** Сколько переходов по дорогам между двумя местами, но не дальше предела. */
export function roadHops(world: World, from: string, to: string, limit: number): number | null {
  if (from === to) return 0
  const seen = new Set<string>([from])
  let edge = [from]
  for (let hop = 1; hop <= limit; hop += 1) {
    const next: string[] = []
    for (const at of edge) {
      for (const road of roadsFrom(world, at)) {
        if (seen.has(road.to)) continue
        seen.add(road.to)
        if (road.to === to) return hop
        next.push(road.to)
      }
    }
    edge = next
  }
  return null
}

/** Все глаза этой стороны: где они стоят и какого рода. */
function eyesOf(
  state: GameState,
  who: string,
): readonly { readonly eye: EyeKind; readonly from: string; readonly reach?: number }[] {
  const eyes: { eye: EyeKind; from: string; reach?: number }[] = []
  if (who === PLAYER) eyes.push({ eye: 'host', from: state.locationId })
  for (const band of state.bands) {
    const theirs = who === PLAYER ? band.lordId === PLAYER : band.kingdomId === who
    if (!theirs || band.travel) continue
    // Дозор видит вдвое дальше обычной части: он для того и послан (этап 110).
    const role = state.roles?.[band.id]
    eyes.push({
      eye: 'host',
      from: band.locationId,
      ...(role === 'scout' ? { reach: ROLE_DEFS.scout.hops } : {}),
    })
  }
  for (const one of Object.values(state.settlements)) {
    if (one.population <= 0) continue
    const theirs =
      who === PLAYER
        ? one.owner === PLAYER
        : one.owner === `crown:${who}` ||
          state.politics.lords.some((lord) => lord.id === one.owner && lord.kingdomId === who)
    if (!theirs) continue
    eyes.push({ eye: 'place', from: one.locationId })
    if (who === PLAYER && placeRep(state.reputation, one.locationId) >= FOG.peasantRep) {
      eyes.push({ eye: 'peasant', from: one.locationId })
    }
  }
  return eyes
}

/** Весть о войске: то, что глаз увидел и что дойдёт с задержкой своего рода. */
export function sightingWord(
  who: string,
  band: Band,
  eye: EyeKind,
  day: number,
  from: string,
): Word {
  const source: SourceKind = eye === 'host' ? 'eyes' : eye === 'place' ? 'own' : 'rumour'
  return {
    id: `saw:${band.id}:${day}`,
    to: who,
    kind: 'host',
    about: band.id,
    value: band.locationId,
    source,
    from,
    day: Math.round(day + EYE_DEFS[eye].delay),
  }
}

/**
 * Вся округа, которую эта сторона видит: место → чей глаз его берёт.
 *
 * Считается разом на всех, а не на каждое войско отдельно: обход дорог от
 * каждого глаза один раз вместо обхода на каждую дружину. Без этого такт суток
 * выходил за бюджет — туман войны не должен стоить дороже самой войны.
 */
export function visibleTo(
  state: GameState,
  world: World,
  who: string,
): ReadonlyMap<string, { readonly eye: EyeKind; readonly from: string }> {
  const seen = new Map<string, { eye: EyeKind; from: string }>()
  for (const eye of eyesOf(state, who)) {
    if (eye.eye === 'peasant' && placeRep(state.reputation, eye.from) < FOG.peasantRep) continue
    for (const at of withinHops(world, eye.from, eye.reach ?? EYE_DEFS[eye.eye].hops)) {
      const had = seen.get(at)
      if (!had || EYE_DEFS[eye.eye].delay < EYE_DEFS[had.eye].delay) seen.set(at, eye)
    }
  }
  // Завеса: чужие глаза не доезжают до того, что закрыто заслоном (этап 110, Дз2).
  for (const at of screenedArea(state, world, who)) seen.delete(at)
  return seen
}

/**
 * Что закрыто от этой стороны чужой завесой (Дз2).
 *
 * Заслон стоит кругом своих и не даёт чужим дозорам проехать. Видеть сквозь
 * него можно только одним способом — стоять там самому.
 */
export function screenedArea(state: GameState, world: World, who: string): ReadonlySet<string> {
  const shut = new Set<string>()
  const roles = state.roles ?? {}
  for (const band of state.bands) {
    if (roles[band.id] !== 'screen') continue
    const theirs = who === PLAYER ? band.lordId === PLAYER : band.kingdomId === who
    // Своя завеса своим глазам не мешает.
    if (theirs) continue
    for (const at of withinHops(world, band.locationId, SCOUT.screenHops)) shut.add(at)
  }
  // Но там, где ты стоишь сам, никакая завеса не поможет.
  if (who === PLAYER) shut.delete(state.locationId)
  for (const band of state.bands) {
    const mine = who === PLAYER ? band.lordId === PLAYER : band.kingdomId === who
    if (mine && !band.travel) shut.delete(band.locationId)
  }
  return shut
}

/** Все места в стольких-то переходах по дорогам, считая само место. */
function withinHops(world: World, from: string, limit: number): readonly string[] {
  const seen = new Set<string>([from])
  let edge = [from]
  for (let hop = 0; hop < limit; hop += 1) {
    const next: string[] = []
    for (const at of edge) {
      for (const road of roadsFrom(world, at)) {
        if (seen.has(road.to)) continue
        seen.add(road.to)
        next.push(road.to)
      }
    }
    edge = next
  }
  return [...seen]
}

/** Донесения дозорных глаз за эти сутки (Т1 и Т3). */
export function sightingsNow(
  state: GameState,
  world: World,
  who: string,
  day: number,
): readonly Word[] {
  const area = visibleTo(state, world, who)
  const seen: Word[] = []
  for (const band of state.bands) {
    if (who === PLAYER && band.lordId === PLAYER) continue
    if (who !== PLAYER && band.kingdomId === who) continue
    if (bandSize(band) <= 0) continue
    const eye = area.get(band.locationId)
    if (!eye) continue
    seen.push(sightingWord(who, band, eye.eye, day, eye.from))
  }
  return seen
}

/** Куда положить донесения, не потеряв прежних. */
export function withSightings(words: readonly Word[], seen: readonly Word[]): readonly Word[] {
  let all = words
  for (const word of seen) all = bring(all, word)
  return all
}

/**
 * Где, по-твоему, стоит это войско (Т1, Т2 и Т5).
 *
 * Симметрично: тем же способом чужая корона узнаёт, где твои части. Никакого
 * отдельного знания для ИИ нет — он смотрит теми же глазами и так же слепнет.
 */
export function lastSeen(
  state: GameState,
  world: World,
  who: string,
  bandId: string,
  day: number,
): Sighting {
  const band = state.bands.find((one) => one.id === bandId)
  const blank: Sighting = {
    bandId,
    seenAt: null,
    by: null,
    day: 0,
    age: 0,
    drift: FOG.maxDrift,
    sure: false,
    says: FOG_WORDS.never,
  }
  // Войска может и не быть вовсе: ложный лагерь — это весть без войска
  // (этап 112). Туман показывает, что доложено, а не что есть.
  if (!band) return fromWords(state, world, who, bandId, day, blank)
  // Своими глазами: то, что видно сейчас, не стареет и не расплывается.
  const eye = whoSees(state, world, who, band, day)
  if (eye && eye.eye === 'host') {
    return {
      bandId,
      seenAt: band.locationId,
      by: 'eyes',
      day,
      age: 0,
      drift: 0,
      sure: true,
      says: `${FOG_WORDS.here} ${world.locations[band.locationId]?.name ?? band.locationId}, ${bandSize(band)} человек.`,
    }
  }
  return fromWords(state, world, who, bandId, day, blank)
}

/** То, что о нём доложено: работает и тогда, когда докладывать было не о чем. */
function fromWords(
  state: GameState,
  world: World,
  who: string,
  bandId: string,
  day: number,
  blank: Sighting,
): Sighting {
  const words = (state.words ?? []).filter(
    (one) => one.to === who && one.kind === 'host' && one.about === bandId && one.day <= day,
  )
  const newest = words.reduce<Word | null>(
    (best, one) => (!best || one.day > best.day ? one : best),
    null,
  )
  if (!newest) return blank
  const age = day - newest.day
  if (age > FOG.staleDays) return { ...blank, says: FOG_WORDS.lost }
  const drift = driftOf(age)
  const where = String(newest.value)
  const name = world.locations[where]?.name ?? where
  return {
    bandId,
    seenAt: where,
    by: newest.source,
    day: newest.day,
    age,
    drift,
    sure: age === 0,
    says:
      age === 0
        ? `Видели сегодня: ${name}.`
        : drift >= FOG.maxDrift
          ? `Видели в ${name} ${age} суток назад. ${FOG_WORDS.lost}`
          : `Видели в ${name} ${age} суток назад: теперь может быть где угодно в ${drift} переходах оттуда.`,
  }
}

/**
 * Застали ли врасплох (Т4).
 *
 * Войско, о котором не знали, ломает строй прежде первого удара. Считается не
 * броском, а знанием: знал — встал как надо, не знал — платишь духом.
 */
export function surpriseOf(
  state: GameState,
  world: World,
  who: string,
  band: Band,
  day: number,
): { readonly surprised: boolean; readonly moraleHit: number; readonly says: string } {
  const known = lastSeen(state, world, who, band.id, day)
  if (known.sure || (known.seenAt === band.locationId && known.age <= FOG.lostAfter)) {
    return { surprised: false, moraleHit: 0, says: FOG_WORDS.ready }
  }
  // Чем шире был круг, тем полнее внезапность: о пропавшем войске не знали вовсе.
  const share = known.seenAt ? Math.min(1, known.drift / FOG.maxDrift) : 1
  return {
    surprised: true,
    moraleHit: Math.round(FOG.surpriseMorale * share),
    says: `${FOG_WORDS.surprise} ${known.says}`,
  }
}

/** Кого вообще стоит высматривать: те, с кем ты воюешь. */
export function foeBands(state: GameState, who: string): readonly Band[] {
  return state.bands.filter((band) => {
    if (bandSize(band) <= 0) return false
    if (who === PLAYER && band.lordId === PLAYER) return false
    if (!band.kingdomId) return true
    if (who === PLAYER) return atWar(state.politics, PLAYER, band.kingdomId)
    return band.kingdomId !== who && atWar(state.politics, who, band.kingdomId)
  })
}

export interface FogRow {
  readonly bandId: string
  readonly name: string
  readonly seenAt: string | null
  readonly age: number
  readonly drift: number
  readonly says: string
}

/** Туман на карте (Т6): что известно и насколько это старо. */
export function fogMap(state: GameState, world: World, day: number): readonly FogRow[] {
  const rows: FogRow[] = []
  for (const band of foeBands(state, PLAYER)) {
    const known = lastSeen(state, world, PLAYER, band.id, day)
    if (!known.seenAt && known.says === FOG_WORDS.never) continue
    const lord = state.politics.lords.find((one) => one.id === band.lordId)
    rows.push({
      bandId: band.id,
      name: lord ? `${lord.title} ${lord.name}` : 'Королевская рать',
      seenAt: known.seenAt,
      age: known.age,
      drift: known.drift,
      says: known.says,
    })
  }
  return rows.sort((a, b) => a.age - b.age)
}

/** Доля чужих войск, о которых ты не знаешь ничего (Т6). */
export function blindToShare(state: GameState, world: World, day: number): number {
  const foes = foeBands(state, PLAYER)
  if (foes.length === 0) return 0
  const blind = foes.filter(
    (band) => lastSeen(state, world, PLAYER, band.id, day).seenAt === null,
  ).length
  return Math.round((blind / foes.length) * 100) / 100
}

export { FOG, FOG_WORDS, EYE_DEFS, type EyeKind }
