import { DOORS, DOOR_DEFS, type DoorId, UNION, UNION_WORDS } from './content/union'
import { PLAYER } from './holding'
import { strengthOf } from './mind'
import { dowryFor } from './royal'
import type { GameState } from './state'
import { atWar, relationOf } from './war'
import { recognisedBySides, recognises } from './way'
import type { World } from './world/types'

/**
 * Путь короны (этап 131).
 *
 * Признание выводится из мира (этап 130), но его же можно и добывать — четырьмя
 * разными дверями, у каждой своя цена и своя прочность. Отсюда главная черта
 * пути: последние признания берутся не тем, чем первые. Первые пять даёт сила;
 * последние трое сильному не уступают вовсе — с ними договариваются, роднятся
 * или платят.
 *
 * И конец пути — не день, когда все признали, а десять лет после него: держава,
 * рассыпавшаяся на другой год, объединением не была.
 */

export function doorDef(id: DoorId) {
  return DOOR_DEFS[id]
}

export interface Door {
  readonly door: DoorId
  readonly can: boolean
  /** Во что встанет: серебро, если дверь считается серебром; иначе 0. */
  readonly cost: number
  readonly says: string
}

/**
 * Насколько дороже идёт признание, когда осталось мало (Кр3).
 *
 * Считается не числом взятых, а числом оставшихся: пока не признали восьмеро,
 * каждый следующий стоит своё; когда осталось трое, цена растёт.
 */
export function harderNow(left: number): number {
  if (left > UNION.lastFrom) return 1
  const steps = UNION.lastFrom - left + 1
  return Math.round(UNION.lastHarder ** steps * 100) / 100
}

/**
 * Четыре двери к признанию этой короны (Кр2).
 *
 * Каждая либо открыта, либо нет, и это выводится из мира: воевать можно, если
 * есть чем; договориться — если отношение не ниже дна; породниться — если у них
 * есть кому; заплатить — если у тебя есть чем.
 */
export function doorsTo(
  state: GameState,
  world: World,
  who: string,
  other: string,
  day: number,
): readonly Door[] {
  const mine = strengthOf(state, world, who, day)
  const theirs = strengthOf(state, world, other, day)
  const relation = relationOf(state.politics, who, other)
  const { no } = recognisedBySides(state, world, who, day)
  const harder = harderNow(no.length)
  const crowned = who === PLAYER && state.crowned ? UNION.crownedEasier : 1
  const gift = Math.round(theirs.places * UNION.giftPerPlace * harder * crowned)
  const dowry = who === PLAYER ? dowryFor(state, other, day, mine.score >= theirs.score) : gift
  const purse = who === PLAYER ? state.character.money : Math.round(mine.places * 420)
  const name = world.kingdoms[other]?.name ?? other
  return DOORS.map((door): Door => {
    if (door === 'war') {
      const can = mine.score >= theirs.score * 0.8
      return {
        door,
        can,
        cost: 0,
        says: can
          ? `${name}: ${DOOR_DEFS.war.about} Силы твоей ${mine.score} против ${theirs.score}. ${DOOR_DEFS.war.after}`
          : `${name}: войной не выйдет — ${mine.score} против ${theirs.score}.`,
      }
    }
    if (door === 'treaty') {
      const can = relation > -60 && !atWar(state.politics, who, other)
      return {
        door,
        can,
        cost: 0,
        says: can
          ? `${name}: ${DOOR_DEFS.treaty.about} Отношение ${relation}. ${DOOR_DEFS.treaty.after}`
          : `${name}: договариваться не с кем — ${atWar(state.politics, who, other) ? 'вы в войне' : `отношение ${relation}`}.`,
      }
    }
    if (door === 'kin') {
      const already = (state.marriages ?? []).some((one) => one.kingdomId === other)
      return {
        door,
        can: !already && relation > -40,
        cost: Math.round(dowry * harder),
        says: already
          ? `${name}: вы уже в родстве — эта дверь пройдена.`
          : `${name}: ${DOOR_DEFS.kin.about} Приданое ${Math.round(dowry * harder)}. ${DOOR_DEFS.kin.after}`,
      }
    }
    return {
      door,
      can: purse >= gift,
      cost: gift,
      says:
        purse >= gift
          ? `${name}: ${DOOR_DEFS.coin.about} Дар ${gift}. ${DOOR_DEFS.coin.after}`
          : `${name}: серебром не выйдет — нужно ${gift}, у тебя ${purse}.`,
    }
  })
}

/** Все, кто ещё не признал, и чем их брать (Кр2 и Кр3). */
export function whoIsLeft(
  state: GameState,
  world: World,
  who: string,
  day: number,
): readonly {
  readonly side: string
  readonly name: string
  readonly doors: readonly Door[]
  readonly says: string
}[] {
  const { no } = recognisedBySides(state, world, who, day)
  const harder = harderNow(no.length)
  return no.map((side) => {
    const doors = doorsTo(state, world, who, side, day)
    const open = doors.filter((one) => one.can)
    return {
      side,
      name: world.kingdoms[side]?.name ?? side,
      doors,
      says: `${world.kingdoms[side]?.name ?? side}: открыто ${open.length} из ${doors.length} (${open.map((one) => DOOR_DEFS[one.door].label).join(', ') || 'ничего'})${harder > 1 ? `; цена ×${harder}` : ''}`,
    }
  })
}

/**
 * Состояние объединения (Кр1 и Кр4).
 *
 * Объединение — не день, а срок. Пока все признают, он идёт; отвалился
 * кто-нибудь — идёт заново. Концом считается только выдержанный срок.
 */
export interface Union {
  readonly all: boolean
  readonly sinceDay: number | null
  readonly heldYears: number
  readonly finished: boolean
  readonly says: string
}

export function unionOf(state: GameState, world: World, who: string, day: number): Union {
  const { no } = recognisedBySides(state, world, who, day)
  const all = no.length === 0
  const since = who === PLAYER ? (state.union?.sinceDay ?? null) : null
  const held = all && since !== null ? Math.round(((day - since) / 365) * 10) / 10 : 0
  const finished = all && held >= UNION.holdYears
  return {
    all,
    sinceDay: since,
    heldYears: held,
    finished,
    says: !all
      ? `${UNION_WORDS.notPlaces} Не признали ${no.length}.`
      : finished
        ? `Все признали и держится ${held} лет: это объединение.`
        : `Все признали ${since === null ? 'только что' : `${held} лет назад`}. ${UNION_WORDS.hold} Осталось ${Math.max(0, UNION.holdYears - held)} лет.`,
  }
}

/**
 * Мир под одной рукой (Кр5).
 *
 * Объединённый мир не «выигран»: в нём нет чужих войн, зато своих недовольных
 * больше, и войны приходят изнутри.
 */
export function unionWorld(
  state: GameState,
  world: World,
  day: number,
): { readonly unrest: number; readonly revolts: number; readonly says: string } {
  const union = unionOf(state, world, PLAYER, day)
  if (!union.all) return { unrest: 0, revolts: 1, says: 'Мир ещё не под одной рукой.' }
  const vassals = state.politics.lords.filter((one) => one.kingdomId === PLAYER).length
  return {
    unrest: UNION.unionUnrest,
    revolts: UNION.unionRevolts,
    says: `${UNION_WORDS.world} Недовольство +${UNION.unionUnrest}, своих мятежей в ${UNION.unionRevolts} раза больше обычного; под рукой ${vassals} владетелей, и каждому есть о чём вспомнить.`,
  }
}

export { UNION, UNION_WORDS, DOOR_DEFS, DOORS, type DoorId }
