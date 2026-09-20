import { shadedBy } from './bias'
import { TIDINGS, TIDINGS_WORDS } from './content/tidings'
import { PLAYER } from './holding'
import { type Word, knownTo, wordsTo } from './known'
import { strengthOf } from './mind'
import { seenBy } from './picture'
import type { GameState } from './state'
import { allied, enemyOf, warsOf } from './war'
import { provinceCentersOf } from './world/layout'
import type { World } from './world/types'

/**
 * Короны видят друг друга (этап 164).
 *
 * Слой знания 0.8 умел всё, что нужно, но работал в одну сторону: вести заводил
 * игрок, а между коронами мир оставался прозрачным. Чужую силу корона считала
 * догадкой из расстояния и нрава — догадка не старела, не ходила по карте и не
 * бывала чужой ошибкой. Оттого обмануть можно было только того, с кем говоришь
 * сам, а мир за спиной жил при открытых картах.
 *
 * Здесь вести ходят сами. Правило прежнее и не меняется: **второго состояния
 * не заводится** — весть кладётся в тот же `words`, читается тем же `knownTo` и
 * так же стареет. Ново только то, что её приносят не игроку.
 */

/** Откуда эта корона узнаёт о той (Зн2). */
export function sourceBetween(
  state: GameState,
  world: World,
  watcher: string,
  about: string,
  near: Readonly<Record<string, readonly string[]>> = bordersOf(state, world),
): 'own' | 'envoy' | 'rumour' {
  // Сосед знает соседа своими людьми: его земля видна с его же границы.
  if ((near[watcher] ?? []).includes(about)) return 'own'
  // С тем, с кем союз, дань или родство, говорят послы.
  if (
    allied(state.politics, watcher, about) ||
    state.politics.tributes.some(
      (one) =>
        (one.from === watcher && one.to === about) || (one.from === about && one.to === watcher),
    )
  ) {
    return 'envoy'
  }
  return 'rumour'
}

/**
 * Кто с кем граничит (Зн2).
 *
 * Соседство — свойство карты, а не дорог: `neighbourSettlements` нарочно
 * останавливается на первом же поселении («это уже его округа»), и потому от
 * столицы до чужой земли по нему не дойти никогда. Меряем по земле: две
 * стороны соседи, если у них есть провинции ближе `borderSpan` друг к другу.
 * Провинция считается чужой по укладу земли, а держава игрока — по тому, где
 * он взял большинство мест.
 */
const centersByWorld = new WeakMap<World, ReturnType<typeof provinceCentersOf>>()

export function bordersOf(
  state: GameState,
  world: World,
): Readonly<Record<string, readonly string[]>> {
  // Середины провинций — свойство скелета мира: он не меняется, и считать их
  // заново на каждом такте незачем. Память здесь, а не в состоянии: в сейв это
  // не попадает и попасть не может.
  let centers = centersByWorld.get(world)
  if (!centers) {
    centers = provinceCentersOf(world)
    centersByWorld.set(world, centers)
  }
  const owner: Record<string, string> = {}
  for (const [id, province] of Object.entries(world.provinces)) {
    const region = world.regions[province.regionId]
    if (!region) continue
    let mine = 0
    for (const locationId of province.locationIds) {
      const place = state.settlements[locationId]
      if (place?.owner === PLAYER && place.population > 0) mine += 1
    }
    owner[id] = mine * 2 > province.locationIds.length ? PLAYER : region.kingdomId
  }
  const near: Record<string, Set<string>> = {}
  const ids = Object.keys(centers)
  for (let i = 0; i < ids.length; i += 1) {
    const a = ids[i] as string
    const first = centers[a]
    if (!first) continue
    for (let j = i + 1; j < ids.length; j += 1) {
      const b = ids[j] as string
      const second = centers[b]
      if (!second) continue
      const sideA = owner[a]
      const sideB = owner[b]
      if (!sideA || !sideB || sideA === sideB) continue
      if (Math.hypot(first.x - second.x, first.y - second.y) > TIDINGS.borderSpan) continue
      const forA = near[sideA] ?? new Set<string>()
      forA.add(sideB)
      near[sideA] = forA
      const forB = near[sideB] ?? new Set<string>()
      forB.add(sideA)
      near[sideB] = forB
    }
  }
  const rows: Record<string, readonly string[]> = {}
  for (const [side, set] of Object.entries(near)) rows[side] = [...set]
  return rows
}

export function borders(state: GameState, world: World, side: string, other: string): boolean {
  return (bordersOf(state, world)[side] ?? []).includes(other)
}

/** О ком эта корона хочет знать сегодня (Зн2). */
export function caresAbout(
  state: GameState,
  world: World,
  watcher: string,
  day: number,
  scores: Readonly<Record<string, number>> = {},
): string {
  const war = warsOf(state.politics, watcher)[0]
  if (war) return enemyOf(war, watcher)
  let best: { side: string; score: number } | null = null
  for (const side of [...Object.keys(world.kingdoms), PLAYER]) {
    if (side === watcher) continue
    // Силы считаются по разу на сторону, а не по разу на пару: иначе такт не
    // уложится в бюджет (то же правило, что у такта страха, этап 135).
    const score = scores[side] ?? strengthOf(state, world, side, day).score
    if (!best || score > best.score) best = { side, score }
  }
  return best?.side ?? PLAYER
}

/**
 * Вести, которые расходятся по миру в этот день (Зн1, Зн2, Зн4).
 *
 * Считается из состояния, без кубика: кто о ком спрашивает, решают война,
 * соседство и сила, а насколько соврут — источник и нрав спрашивающего. Молва
 * идёт вторым слоем: то, во что уже поверил один, переходит к соседу как молва
 * — вместе с ошибкой. Оттого соврать одному значит соврать троим.
 */
export function tidingsAt(state: GameState, world: World, day: number): readonly Word[] {
  const said: Word[] = []
  const crowns = Object.keys(world.kingdoms)
  const near = bordersOf(state, world)
  const scores: Record<string, number> = {}
  for (const side of [...crowns, PLAYER]) scores[side] = strengthOf(state, world, side, day).score
  for (const watcher of crowns) {
    const about = caresAbout(state, world, watcher, day, scores)
    if (about === watcher) continue
    const source = sourceBetween(state, world, watcher, about, near)
    const off =
      source === 'own' ? TIDINGS.ownOff : source === 'envoy' ? TIDINGS.envoyOff : TIDINGS.rumourOff
    const truth = scores[about] ?? strengthOf(state, world, about, day).score
    // Врёт не кубик, а источник и нрав: надменный слышит меньше, пугливый
    // больше, и врут они всегда в свою сторону (этап 118).
    const value = shadedBy(watcher, Math.round(truth * (1 - off * lean(watcher, about))))
    said.push({
      id: `word:tidings:${watcher}:${about}:${day}`,
      to: watcher,
      kind: 'strength',
      about,
      value,
      source,
      from: source === 'rumour' ? null : watcher,
      day,
    })
  }
  // Молва (Зн4): чужая ошибка идёт дальше по карте, а не рождается заново.
  let hops = 0
  for (const teller of crowns) {
    if (hops >= TIDINGS.hops) break
    const mine = wordsTo(state, teller).filter(
      (one) => one.kind === 'strength' && day - one.day <= TIDINGS.stale,
    )
    const word = mine[mine.length - 1]
    if (!word) continue
    for (const hearer of crowns) {
      if (hearer === teller || hearer === word.about) continue
      if (!(near[teller] ?? []).includes(hearer)) continue
      said.push({
        id: `word:molva:${teller}:${hearer}:${word.about}:${day}`,
        to: hearer,
        kind: 'strength',
        about: word.about,
        value: word.value,
        source: 'rumour',
        from: null,
        day,
      })
      hops += 1
      break
    }
  }
  return said
}

/** В какую сторону врёт весть: воюющему занижают врага, союзнику — завышают. */
function lean(watcher: string, about: string): number {
  return (hashOf(`${watcher}|${about}`) % 2 === 0 ? 1 : -1) * 1
}

/**
 * Решают ли они по тому, что знают (Зн3, Зн6).
 *
 * Считает не новое знание, а то же `seenBy`: насколько картина короны разошлась
 * с правдой и сколько сторон смотрят на мир неверно. Решение по неверной вести
 * — не ошибка расчёта, а то, ради чего слой знания заводился.
 */
export function tidingsRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly words: number
  readonly between: number
  readonly off: number
  readonly wrong: number
  readonly says: string
} {
  const crowns = Object.keys(world.kingdoms)
  const words = (state.words ?? []).length
  const between = (state.words ?? []).filter((one) => one.to !== PLAYER).length
  let sum = 0
  let count = 0
  let wrong = 0
  for (const watcher of crowns) {
    for (const about of crowns) {
      if (watcher === about) continue
      const known = knownTo(state, world, watcher, { kind: 'strength', about }, day)
      if (known.value === null || typeof known.value !== 'number') continue
      const truth = strengthOf(state, world, about, day).score
      if (truth <= 0) continue
      const off = Math.abs(known.value - truth) / truth
      sum += off
      count += 1
      if (off >= TIDINGS.wrongAt) wrong += 1
    }
  }
  const off = count > 0 ? Math.round((sum / count) * 100) / 100 : 0
  return {
    words,
    between,
    off,
    wrong,
    says:
      count === 0
        ? 'Короны ещё ничего друг о друге не слышали.'
        : `Вестей в мире ${words}, между коронами ${between}; средняя ошибка ${Math.round(off * 100)} из ста, решений по неверной ${wrong} из ${count}. ${TIDINGS_WORDS.travels}`,
  }
}

/** Что эта корона думает о той — тем же счётом, что и обо всех (Зн3). */
export function theyThink(
  state: GameState,
  world: World,
  watcher: string,
  about: string,
  day: number,
): ReturnType<typeof seenBy> {
  const truth = strengthOf(state, world, about, day).score
  return seenBy(state, world, watcher, about, day, { score: truth, error: 0 })
}

function sideOf(state: GameState, owner: string): string | null {
  if (owner === PLAYER) return PLAYER
  if (owner.startsWith('crown:')) return owner.slice('crown:'.length)
  return state.politics.lords.find((lord) => lord.id === owner)?.kingdomId ?? null
}

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}
