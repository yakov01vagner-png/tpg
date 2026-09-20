import { beliefOf } from './bias'
import { BIAS } from './content/bias'
import { PICTURE, PICTURE_WORDS } from './content/picture'
import { PLAYER } from './holding'
import { type Known, knownTo } from './known'
import { strengthOf } from './mind'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Своя картина мира (этап 118).
 *
 * Корона видит мир так же, как игрок: из вестей, у которых есть источник,
 * возраст и вилка. Где вестей нет — там догадка, выведенная из расстояния и
 * нрава (этап 89). Где есть — весть весит больше догадки, и потому твой ложный
 * лагерь, твой прибеднившийся двор и твой купленный резидент попадают не в
 * текст, а в её решения.
 */

export interface PictureRow {
  readonly about: string
  /** Сколько, по её мнению. */
  readonly value: number
  /** Сколько на деле. */
  readonly truth: number
  /** Откуда она это взяла. */
  readonly from: 'words' | 'guess'
  readonly age: number
  readonly spread: number
  readonly says: string
}

/**
 * Что эта корона знает о чужой силе (К1–К3).
 *
 * Сначала вести: если ей что-то принесли и это не слишком старо, она считает по
 * принесённому. Иначе — догадка, тем шире, чем дальше.
 */
export function seenBy(
  state: GameState,
  world: World,
  watcher: string,
  about: string,
  day: number,
  guess: { readonly score: number; readonly error: number },
): PictureRow {
  const truth = strengthOf(state, world, about, day).score
  // Во что он уже верит (этап 120): пока его не опровергли громко, он держится
  // прежнего, и решения идут по прежнему.
  const held = beliefOf(state, watcher, about)
  if (held && day - held.day <= BIAS.holds) {
    return {
      about,
      value: held.value,
      truth,
      from: 'words',
      age: day - held.day,
      spread: 0,
      says: `${watcher} держится того, во что поверил ${day - held.day} суток назад: ${held.value} (на деле ${truth}).`,
    }
  }
  const known: Known = knownTo(state, world, watcher, { kind: 'strength', about }, day)
  const fresh = known.value !== null && known.age <= PICTURE.freshDays
  if (fresh && typeof known.value === 'number') {
    // Весть весит больше догадки, но не заменяет её вовсе: она смешивается.
    const value = Math.max(
      0,
      Math.round(known.value * PICTURE.trustsWords + guess.score * (1 - PICTURE.trustsWords)),
    )
    return {
      about,
      value,
      truth,
      from: 'words',
      age: known.age,
      spread: known.spread,
      says: `${PICTURE_WORDS.fromWords} ${watcher} считает силу ${about} равной ${value} (на деле ${truth}; ${known.says})`,
    }
  }
  return {
    about,
    value: guess.score,
    truth,
    from: 'guess',
    age: 0,
    spread: Math.abs(guess.error),
    says: `${PICTURE_WORDS.guess} ${watcher} считает силу ${about} равной ${guess.score} (на деле ${truth}).`,
  }
}

/** Вся картина этой короны (К6). */
export function crownPicture(
  state: GameState,
  world: World,
  watcher: string,
  day: number,
  seen: (about: string) => { readonly score: number; readonly error: number },
): readonly PictureRow[] {
  const others = [PLAYER, ...Object.keys(world.kingdoms)].filter((one) => one !== watcher)
  return others
    .map((about) => seenBy(state, world, watcher, about, day, seen(about)))
    .sort((a, b) => b.value - a.value)
}

/** Насколько её картина расходится с правдой и в чью пользу (К6). */
export function pictureError(rows: readonly PictureRow[]): {
  readonly off: number
  readonly aboutPlayer: PictureRow | null
  readonly says: string
} {
  const mine = rows.find((one) => one.about === PLAYER) ?? null
  if (!mine || mine.truth === 0) {
    return { off: 0, aboutPlayer: mine, says: 'О тебе она пока не думает ничего.' }
  }
  const off = Math.round(((mine.value - mine.truth) / mine.truth) * 100) / 100
  return {
    off,
    aboutPlayer: mine,
    says:
      off < -0.1
        ? `${PICTURE_WORDS.wrong} Она думает, что у тебя ${mine.value} при ${mine.truth}.`
        : off > 0.1
          ? `${PICTURE_WORDS.costly} Она думает, что у тебя ${mine.value} при ${mine.truth}.`
          : `Её картина о тебе близка к правде: ${mine.value} при ${mine.truth}.`,
  }
}

/** Из чего она исходит — словами (К5 и К6). */
export function pictureSays(rows: readonly PictureRow[], watcher: string, world: World): string {
  const name = world.kingdoms[watcher]?.name ?? watcher
  const top = rows
    .slice(0, 3)
    .map(
      (one) =>
        `${one.about === PLAYER ? 'ты' : (world.kingdoms[one.about]?.name ?? one.about)} — ${one.value}${one.from === 'words' ? ` (со слов, ${one.age} сут.)` : ' (догадка)'}`,
    )
    .join('; ')
  return `${PICTURE_WORDS.own} ${name} считает сильнейшими: ${top}.`
}

/** Можно ли вообще заглянуть в её голову: нужен свой человек там (К5). */
export function canSeePicture(state: GameState, watcher: string): { can: boolean; why: string } {
  const spy = (state.spies ?? []).some((one) => one.kingdomId === watcher)
  const resident = (state.residents ?? []).some((one) => one.at === watcher && !one.bought)
  if (spy || resident) {
    return { can: true, why: resident ? 'твой посол сидит при их дворе' : 'твой соглядатай там' }
  }
  return { can: false, why: 'Некому подслушать: ни соглядатая, ни посольства при их дворе.' }
}

export { PICTURE, PICTURE_WORDS }
