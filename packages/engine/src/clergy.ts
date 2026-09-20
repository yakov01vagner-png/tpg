import { churchOf } from './church'
import { CENSURE_DEFS } from './content/church'
import {
  CLERGY,
  CLERGY_DEFS,
  CLERGY_TEMPERS,
  CLERGY_TEMPER_DEFS,
  CLERGY_WORDS,
  type ClergyRank,
  type ClergyTemper,
} from './content/clergy'
import { PRIEST_NAMES } from './content/faith'
import { PLAYER, holdingsOf } from './holding'
import type { GameState } from './state'
import { pietyOf } from './temple'
import { atWar } from './war'
import type { World } from './world/types'

/**
 * Церковь как сила (этап 183).
 *
 * С этапа 96 у церкви есть земля обителей, десятина, замыслы и счёт
 * недовольства. Чего не было — людей: обители безымянны, епископов не
 * существует, а спор с церковью решался одной кнопкой «уступить». Оттого
 * церковь была погодой: она случалась, но с ней нельзя было говорить.
 *
 * Здесь у неё появляются люди, своя выгода и разговор. Ничего нового в
 * состоянии: настоятель выводится из обители, епископ — из округи, счёт
 * недовольства и десятина остаются теми же, что были.
 */

export interface Churchman {
  readonly id: string
  readonly name: string
  readonly rank: ClergyRank
  readonly temper: ClergyTemper
  readonly locationId: string
  readonly says: string
}

/** Люди церкви в этой земле (Цр1). */
export function clergyOf(state: GameState, world: World, day: number): readonly Churchman[] {
  const rows: Churchman[] = []
  for (const one of Object.values(world.locations)) {
    if (one.archetype !== 'monastery') continue
    rows.push(manAt(one.id, one.name, 'abbot'))
  }
  // Епископ сидит там, где людей много: округа, а не обитель.
  const cities = Object.values(state.settlements)
    .filter((one) => one.population > 4000)
    .slice(0, 4)
  for (const one of cities) {
    rows.push(
      manAt(one.locationId, world.locations[one.locationId]?.name ?? one.locationId, 'bishop'),
    )
  }
  // Проповедник ходит там, где худо: голод и разбой собирают слушателей.
  const uneasy = Object.values(state.settlements).find((one) => one.banditry >= 0.4)
  if (uneasy) {
    rows.push(
      manAt(
        uneasy.locationId,
        world.locations[uneasy.locationId]?.name ?? uneasy.locationId,
        'preacher',
      ),
    )
  }
  // Легат приезжает, когда счёт недовольства дошёл до кары.
  const church = churchOf(state, world, day)
  if (church.anger >= CENSURE_DEFS.interdict.from) {
    const seat = holdingsOf(state.settlements, PLAYER)[0]
    if (seat) {
      rows.push(
        manAt(seat.locationId, world.locations[seat.locationId]?.name ?? seat.locationId, 'legate'),
      )
    }
  }
  return rows
}

function manAt(locationId: string, place: string, rank: ClergyRank): Churchman {
  const seed = hashOf(`clergy|${locationId}|${rank}`)
  const name = PRIEST_NAMES[seed % PRIEST_NAMES.length] ?? 'Отец Безымянный'
  const temper = CLERGY_TEMPERS[(seed >>> 7) % CLERGY_TEMPERS.length] ?? 'strict'
  return {
    id: `clergy:${locationId}:${rank}`,
    name,
    rank,
    temper,
    locationId,
    says: `${CLERGY_DEFS[rank].label} ${name} (${place}): ${CLERGY_TEMPER_DEFS[temper].label}. ${CLERGY_DEFS[rank].about}`,
  }
}

/** Своя выгода церкви (Цр2). */
export function churchWealth(
  state: GameState,
  world: World,
  day: number,
): {
  readonly houses: number
  readonly income: number
  readonly share: number
  readonly says: string
} {
  const church = churchOf(state, world, day)
  const places = Object.values(state.settlements).filter((one) => one.population > 0).length
  const income = church.places * CLERGY.perHouse + church.tithe
  const share = places > 0 ? Math.round((church.places / places) * 100) / 100 : 0
  return {
    houses: church.places,
    income: Math.round(income),
    share,
    says: `Обителей ${church.places} (${Math.round(share * 100)} из ста мест мира), дохода ${Math.round(income)} в сутки вместе с десятиной. ${CLERGY_WORDS.grows}`,
  }
}

/** Вера в людях (Цр3): что благочестие делает с местом. */
export function devoutAt(
  state: GameState,
  world: World,
  locationId: string,
): { readonly devout: boolean; readonly says: string } {
  const place = state.settlements[locationId]
  const near = world.locations[locationId]?.archetype === 'monastery'
  const chapel = place?.buildings.includes('chapel') === true
  const devout = near || chapel || pietyOf(state) >= CLERGY.devoutAt
  return {
    devout,
    says: devout
      ? `${CLERGY_WORDS.devout} Здесь ${near ? 'обитель' : chapel ? 'часовня' : 'благочестивый государь'}.`
      : 'Место как место: в храм ходят по праздникам.',
  }
}

/**
 * Спор с церковью разговором (Цр4).
 *
 * Три двери, и у каждой цена: покаяние платится серебром и гордостью, собор —
 * временем и тем, что о тебе там скажут, упорство — счётом, который растёт.
 * Нрав того, с кем говоришь, решает, насколько дверь дешевле.
 */
export function churchTalk(
  state: GameState,
  world: World,
  with_: Churchman,
  day: number,
): readonly { readonly door: string; readonly costs: string; readonly worth: number }[] {
  const church = churchOf(state, world, day)
  const temper = CLERGY_TEMPER_DEFS[with_.temper]
  const penance = Math.round(church.anger * CLERGY.penancePerAnger * temper.takes)
  return [
    {
      door: 'покаяние',
      costs: `${penance} серебра и поклон при всех. ${CLERGY_WORDS.penance}`,
      worth: Math.round(church.anger * temper.forgives),
    },
    {
      door: 'собор',
      costs: `${CLERGY.councilDays} сут. и то, что о тебе там скажут. ${CLERGY_WORDS.council}`,
      worth: Math.round(church.anger * 0.5),
    },
    {
      door: 'стоять на своём',
      costs: 'ничего сейчас и всё потом: счёт растёт, а за ним идут кара и поход.',
      worth: 0,
    },
  ]
}

/** Церковь и чужие короны (Цр5). */
export function churchAbroad(
  state: GameState,
  world: World,
  day: number,
): readonly { readonly side: string; readonly with: boolean; readonly says: string }[] {
  const church = churchOf(state, world, day)
  return Object.keys(world.kingdoms).map((side) => {
    const holy = (world.kingdoms[side]?.flavor ?? '').toLowerCase().includes('свят')
    const fighting = atWar(state.politics, PLAYER, side)
    const withChurch = holy || (!fighting && church.anger < CENSURE_DEFS.warning.from)
    return {
      side,
      with: withChurch,
      says: `${world.kingdoms[side]?.name ?? side}: ${
        withChurch ? 'с церковью заодно' : 'у церкви к ней свой счёт'
      }${holy ? ' (уклад её на том и стоит)' : ''}.`,
    }
  })
}

/** Церковь в числах (Цр6). */
export function clergyRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly people: number
  readonly houses: number
  readonly income: number
  readonly anger: number
  readonly says: string
} {
  const people = clergyOf(state, world, day)
  const wealth = churchWealth(state, world, day)
  const church = churchOf(state, world, day)
  return {
    people: people.length,
    houses: wealth.houses,
    income: wealth.income,
    anger: church.anger,
    says: `Людей церкви ${people.length}, обителей ${wealth.houses}, дохода ${wealth.income} в сутки; счёт к тебе ${church.anger}. ${CLERGY_WORDS.own}`,
  }
}

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}
