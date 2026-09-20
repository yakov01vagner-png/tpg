import { DREAD } from './content/dread'
import { KEYS, KEY_DEFS, type KeyId, LEAGUE, LEAGUE_WORDS } from './content/league'
import { dreadSeen, sideName } from './dread'
import { PLAYER, holdingsOf } from './holding'
import { crownDebtsOf } from './lever'
import type { GameState } from './state'
import { allied, atWar, relationOf } from './war'
import type { Walker } from './way'
import type { World } from './world/types'

/**
 * Коалиция против первого (этап 136).
 *
 * Правило одно: **мир складывается против того, кто ближе всех к концу**, и
 * видит он это продвижение вестями (этап 135), а не правдой. Оттого коалиция
 * может собраться и против того, кто на деле не первый.
 *
 * Связанный с первым в коалицию не идёт: родня, данник, должник и союзник
 * остаются в стороне. И это видно заранее — до того, как сходиться.
 */

export function keyDef(id: KeyId) {
  return KEY_DEFS[id]
}

/** Чем эта корона связана с тем, против кого сходятся (Ко2). */
export function boundTo(
  state: GameState,
  world: World,
  target: Walker,
  who: string,
  day: number,
): { readonly bound: boolean; readonly why: string } {
  if (who === target) return { bound: true, why: 'Против себя не сходятся.' }
  if (target === PLAYER) {
    if ((state.marriages ?? []).some((one) => one.kingdomId === who)) {
      return { bound: true, why: 'родня' }
    }
    if (crownDebtsOf(state).some((one) => one.kingdomId === who)) {
      return { bound: true, why: 'должник' }
    }
  }
  if (state.politics.tributes.some((one) => one.from === who && one.to === target)) {
    return { bound: true, why: 'данник' }
  }
  if (allied(state.politics, target, who)) return { bound: true, why: 'союзник' }
  // Под чьей рукой стоишь, против того не идёшь — и рука не идёт против своих
  // (этап 137, Га2).
  if (
    (state.hands ?? []).some(
      (one) =>
        (one.ward === who && one.patron === target) || (one.ward === target && one.patron === who),
    )
  ) {
    return { bound: true, why: 'под рукой' }
  }
  if ((state.leagueBought?.[who] ?? 0) > 0) return { bound: true, why: 'куплен' }
  return { bound: false, why: '' }
}

/** Кто в коалицию не войдёт и почему — видно заранее (Ко2). */
export function whoStaysOut(
  state: GameState,
  world: World,
  target: Walker,
  day: number,
): readonly { readonly who: string; readonly why: string }[] {
  return Object.keys(world.kingdoms)
    .filter((id) => id !== target)
    .map((id) => ({ who: id, ...boundTo(state, world, target, id, day) }))
    .filter((one) => one.bound)
    .map((one) => ({ who: one.who, why: one.why }))
}

/** Кто пошёл бы против этого — сегодня и по тому, что до них дошло (Ко1, Ко2). */
export function wouldJoin(
  state: GameState,
  world: World,
  target: Walker,
  day: number,
): readonly string[] {
  return Object.keys(world.kingdoms).filter((who) => {
    if (who === target) return false
    if (boundTo(state, world, target, who, day).bound) return false
    return dreadSeen(state, world, who, target, day).dread.score >= DREAD.scares
  })
}

export interface League {
  readonly against: Walker | null
  readonly members: readonly string[]
  readonly out: readonly { readonly who: string; readonly why: string }[]
  readonly sinceDay: number
  readonly says: string
}

/**
 * Кто и против кого сошёлся бы сегодня (Ко1).
 *
 * Цель — тот, кого боится больше всего корон; счёт страха берётся не с правды,
 * а с того, что до них дошло (этап 135). Участники — те, кто боится и ничем с
 * ним не связан.
 */
export function leagueAgainst(state: GameState, world: World, day: number): League {
  const sides: Walker[] = [PLAYER, ...Object.keys(world.kingdoms)]
  let best: { against: Walker; members: readonly string[] } | null = null
  for (const target of sides) {
    const members = wouldJoin(state, world, target, day)
    if (!best || members.length > best.members.length) best = { against: target, members }
  }
  const out = best ? whoStaysOut(state, world, best.against, day) : []
  if (!best || best.members.length < LEAGUE.least) {
    return { against: null, members: [], out, sinceDay: 0, says: LEAGUE_WORDS.none }
  }
  return {
    against: best.against,
    members: best.members,
    out,
    sinceDay: state.league?.sinceDay ?? 0,
    says: `${LEAGUE_WORDS.why} Против ${sideName(world, best.against)} сходятся ${best.members.length}: ${best.members.map((id) => world.kingdoms[id]?.name ?? id).join(', ')}.${out.length > 0 ? ` В стороне ${out.map((one) => `${world.kingdoms[one.who]?.name} (${one.why})`).join(', ')}.` : ''}`,
  }
}

/** Та коалиция, что уже стоит: она держится сроком, а не сегодняшним страхом. */
export function leagueNow(state: GameState, world: World, day: number): League {
  const standing = state.league
  if (!standing) return leagueAgainst(state, world, day)
  const members = standing.members.filter(
    (who) => (state.leagueBought?.[who] ?? 0) === 0 && who !== standing.against,
  )
  return {
    against: standing.against,
    members,
    out: whoStaysOut(state, world, standing.against, day),
    sinceDay: standing.sinceDay,
    says: `Против ${sideName(world, standing.against)} стоят ${members.length} с ${standing.sinceDay}-го дня: ${members.map((id) => world.kingdoms[id]?.name ?? id).join(', ')}. ${LEAGUE_WORDS.uneven}`,
  }
}

/**
 * Каким ключом разбирается этот участник и чего он стоит (Ко3).
 *
 * Ключ берётся из того, зачем он вошёл: холодному нужен выкуп, обиженному —
 * уступка, дальнему — тайная статья, а тому, с кем можно породниться, — брак.
 */
export function keyTo(
  state: GameState,
  world: World,
  who: string,
  day: number,
): { readonly key: KeyId; readonly cost: number; readonly says: string } {
  const places = Math.max(1, holdingsOf(state.settlements, PLAYER).length)
  const relation = relationOf(state.politics, PLAYER, who)
  const kin = (state.marriages ?? []).some((one) => one.kingdomId === who)
  const key: KeyId = atWar(state.politics, PLAYER, who)
    ? 'yield'
    : kin
      ? 'coin'
      : relation < -10
        ? 'secret'
        : relation > 10
          ? 'kin'
          : 'coin'
  const cost = key === 'coin' ? LEAGUE.coinPerPlace * places : 0
  return {
    key,
    cost,
    says: `${world.kingdoms[who]?.name ?? who}: ${KEY_DEFS[key].label}${cost > 0 ? ` — ${cost} серебра` : ''}. ${KEY_DEFS[key].about}`,
  }
}

/** Война всех против одного: каждый воюет свою войну (Ко4). */
export function leagueWar(
  state: GameState,
  world: World,
  day: number,
): { readonly wars: number; readonly years: number; readonly says: string } {
  const league = leagueNow(state, world, day)
  if (!league.against) return { wars: 0, years: 0, says: LEAGUE_WORDS.none }
  const wars = league.members.filter((who) =>
    atWar(state.politics, league.against as string, who),
  ).length
  const years = league.sinceDay > 0 ? Math.round(((day - league.sinceDay) / 365) * 10) / 10 : 0
  return {
    wars,
    years,
    says: `${LEAGUE_WORDS.uneven} Войн против ${sideName(world, league.against)} идёт ${wars} из ${league.members.length}; тянется ${years} года.`,
  }
}

/** Можно ли собрать мир против чужого — и против кого (Ко5). */
export function whoToCall(
  state: GameState,
  world: World,
  day: number,
): { readonly against: string | null; readonly members: readonly string[]; readonly says: string } {
  const rows = Object.keys(world.kingdoms)
    .map((id) => ({
      id,
      fear: dreadSeen(state, world, PLAYER, id, day).dread.score,
    }))
    .sort((a, b) => b.fear - a.fear)
  const first = rows[0]
  if (!first || first.fear < DREAD.scares) {
    return { against: null, members: [], says: 'Такого, против кого пошли бы все, пока нет.' }
  }
  const members = Object.keys(world.kingdoms).filter(
    (who) =>
      who !== first.id &&
      !boundTo(state, world, first.id, who, day).bound &&
      dreadSeen(state, world, who, first.id, day).dread.score >= DREAD.scares,
  )
  return {
    against: first.id,
    members,
    says: `${LEAGUE_WORDS.called} Ближе тебя ${world.kingdoms[first.id]?.name}: страх ${first.fear}. Пойдут ${members.length}.`,
  }
}

/** Коалиции в числах (Ко6). */
export function leagueLedger(
  state: GameState,
  world: World,
  day: number,
): { readonly formed: number; readonly bought: number; readonly says: string } {
  const log = state.leagueLog ?? { formed: 0, bought: 0, against: [] }
  const now = leagueNow(state, world, day)
  return {
    formed: log.formed,
    bought: log.bought,
    says: `Коалиций сложилось ${log.formed}, участников выкуплено ${log.bought}${log.against.length > 0 ? `; сходились против ${log.against.map((id) => sideName(world, id)).join(', ')}` : ''}. Сейчас: ${now.says}`,
  }
}

export { LEAGUE, LEAGUE_WORDS, KEYS, KEY_DEFS, type KeyId }
