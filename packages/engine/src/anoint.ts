import { churchAsk, churchOf, wantDef } from './church'
import {
  BINDS,
  BIND_DEFS,
  type BindId,
  FAITH,
  FAITH_WORDS,
  HOLY_DEEDS,
  HOLY_DEED_DEFS,
  type HolyDeedId,
} from './content/anoint'
import { CENSURE_DEFS } from './content/church'
import { PLAYER, holdingsOf } from './holding'
import type { GameState } from './state'
import { pietyOf } from './temple'
import { warsOf } from './war'
import { wayOf } from './way'
import type { World } from './world/types'

/**
 * Путь веры (этап 134).
 *
 * Путь веры кончается не титулом, а положением: церковь называет тебя своим
 * государем. Положение это держится делами и потому может кончиться; и пока оно
 * есть, часть решений принимает не игрок.
 */

export function deedDef(id: HolyDeedId) {
  return HOLY_DEED_DEFS[id]
}

export function bindDef(id: BindId) {
  return BIND_DEFS[id]
}

/** Во что обходится дело веры и можно ли за него взяться сейчас (Вр2). */
export function deedCost(
  state: GameState,
  deed: HolyDeedId,
  day: number,
): {
  readonly money: number
  readonly hours: number
  readonly can: boolean
  readonly waitDays: number
  readonly says: string
} {
  const def = HOLY_DEED_DEFS[deed]
  const places = Math.max(1, holdingsOf(state.settlements, PLAYER).length)
  const money = def.perPlace * places
  const last = state.deeds?.[deed] ?? 0
  const waitDays = last > 0 ? Math.max(0, last + def.again - day) : 0
  return {
    money,
    hours: def.hours,
    can: waitDays === 0 && state.character.money >= money,
    waitDays,
    says:
      waitDays > 0
        ? `${def.label}: снова об этом говорить через ${waitDays} сут.`
        : `${def.label}: ${money} серебра и ${def.hours} ч. Благочестия +${def.piety}, счёт церкви ${def.anger}${def.others < 0 ? `, отношение прочих корон ${def.others}` : ''}. ${def.after}`,
  }
}

/** Помазание: церковь назвала тебя своим (Вр1). */
export function anointedOf(
  state: GameState,
  world: World,
  day: number,
): { readonly is: boolean; readonly sinceDay: number; readonly says: string } {
  const way = wayOf(state, world, PLAYER, 'faith', day)
  const since = state.anointed?.sinceDay ?? 0
  if (!way.finished) {
    return {
      is: false,
      sinceDay: 0,
      says: `${way.says} Пока церковь зовёт тебя сыном, а не государем.`,
    }
  }
  return {
    is: true,
    sinceDay: since,
    says: `${FAITH_WORDS.anointed}${since > 0 ? ` С ${since}-го дня.` : ''}`,
  }
}

/**
 * Свой путь церкви (Вр3).
 *
 * У неё тоже есть конец, до которого она идёт, и он не твой: мир под верой,
 * обители по всей земле и государь, который слушает. Оттого она и бывает не с
 * тобой — не по вредности, а по своему счёту.
 */
export function churchWay(
  state: GameState,
  world: World,
  day: number,
): {
  readonly places: number
  readonly warsLeft: number
  readonly obedient: boolean
  readonly done: number
  readonly says: string
} {
  const church = churchOf(state, world, day)
  const wars = state.politics.wars.length
  const obedient =
    church.anger < CENSURE_DEFS.warning.from && pietyOf(state) >= FAITH.anointedAt / 2
  const done =
    (church.places >= FAITH.churchPlaces ? 1 : 0) + (wars === 0 ? 1 : 0) + (obedient ? 1 : 0)
  return {
    places: church.places,
    warsLeft: wars,
    obedient,
    done,
    says: `${FAITH_WORDS.ownWay} Обителей ${church.places} из ${FAITH.churchPlaces}, войн в мире ${wars}, государь ${obedient ? 'слушает' : 'не слушает'}: пройдено ${done} из 3.`,
  }
}

/** Идёт ли церковь туда же, куда ты (Вр3). */
export function withYou(
  state: GameState,
  world: World,
  day: number,
): { readonly agrees: boolean; readonly says: string } {
  const ask = churchAsk(state, world, day)
  const mine = warsOf(state.politics, PLAYER).length
  // Спорят они о том же, о чём спорили всегда: о войне, о земле и о суде.
  const clash =
    (ask === 'peace' && mine > 0) ||
    (ask === 'land' && holdingsOf(state.settlements, PLAYER).length >= 8) ||
    (ask === 'penance' && pietyOf(state) < 0)
  return {
    agrees: !clash,
    says: clash
      ? `${FAITH_WORDS.apart} Она просит своё: ${wantDef(ask).label} — «${wantDef(ask).says}»`
      : `${FAITH_WORDS.together} Просит она немногого: ${wantDef(ask).label}.`,
  }
}

/** Чего нельзя помазаннику (Вр4). */
export function holyBinds(
  state: GameState,
  world: World,
  day: number,
): { readonly binds: readonly BindId[]; readonly says: string } {
  if (!anointedOf(state, world, day).is) {
    return { binds: [], says: 'Пока ты не помазанник, тебе можно всё, что можно прочим.' }
  }
  return {
    binds: BINDS,
    says: `${FAITH_WORDS.bound} ${BINDS.map((id) => BIND_DEFS[id].says).join(' ')}`,
  }
}

/** Связан ли ты этим запретом сейчас. */
export function boundBy(state: GameState, world: World, bind: BindId, day: number): boolean {
  return holyBinds(state, world, day).binds.includes(bind)
}

/**
 * Каким выходит мир, где государь и церковь — одно (Вр5).
 *
 * Прочие короны холодеют: с таким соседом спорит уже не сосед, а вера. А своя
 * земля шатается с другой стороны: иноверцы и недовольные знают, что суд теперь
 * церковный.
 */
export function faithWorld(
  state: GameState,
  world: World,
  day: number,
): { readonly fear: number; readonly unrest: number; readonly says: string } {
  const anointed = anointedOf(state, world, day)
  if (!anointed.is) return { fear: 0, unrest: 0, says: anointed.says }
  const places = holdingsOf(state.settlements, PLAYER).length
  return {
    fear: FAITH.fear,
    unrest: FAITH.unrest,
    says: `${FAITH_WORDS.world} Короны ${FAITH.fear} за такт, свои места (${places}) ${FAITH.unrest}.`,
  }
}

/** Во что обходится путь веры по нынешнему состоянию (Вр6). */
export function faithCost(
  state: GameState,
  world: World,
  day: number,
): {
  readonly years: number
  readonly gifts: number
  readonly wars: number
  readonly says: string
} {
  const need = Math.max(0, FAITH.anointedAt - pietyOf(state))
  // Дар — самое частое из дел веры, по нему и считаются годы: раз в 90 суток.
  const gifts = Math.ceil(need / HOLY_DEED_DEFS.gift.piety)
  const years = Math.round(((gifts * HOLY_DEED_DEFS.gift.again) / 365) * 10) / 10
  const way = wayOf(state, world, PLAYER, 'faith', day)
  const wars = way.steps.find((one) => one.step.id === 'crusade')?.done ? 0 : 1
  return {
    years,
    gifts,
    wars,
    says: `Благочестия не хватает ${need}: это ${gifts} даров и примерно ${years} года. Походов по призыву осталось ${wars}. ${way.says}`,
  }
}

export {
  HOLY_DEEDS,
  HOLY_DEED_DEFS,
  BINDS,
  BIND_DEFS,
  FAITH,
  FAITH_WORDS,
  type HolyDeedId,
  type BindId,
}
