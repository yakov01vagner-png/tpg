import {
  BURIAL_RITE_DEFS,
  DEATH_DEFS,
  type DeathId,
  PASSING,
  PASSING_WORDS,
  type RiteId,
} from './content/passing'
import { heirBeside } from './elder'
import { bodyOf } from './flesh'
import { PLAYER, holdingsOf } from './holding'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Смерть (этап 190).
 *
 * Смерть есть с 0.5, и приходит она сменой цифр: без причины, без последнего
 * дня, без похорон и без того, чтобы мир заметил. Оттого конец жизни — самое
 * важное, что с героем случается, — был техническим событием.
 *
 * Здесь у смерти появляется причина, у последних дней — дела, у похорон — цена
 * и память. Ничего нового для этого не хранится: причина выводится из тела,
 * память — из летописи, переход — из наследования 0.7.
 */

/** Отчего умирает этот человек, если умирает сейчас (См1). */
export function deathFrom(
  state: GameState,
  day: number,
): { readonly what: DeathId; readonly says: string } {
  const body = bodyOf(state, day)
  const wound = state.character.wound
  const ailment = state.ailment ?? null
  const what: DeathId = wound?.festering
    ? 'wound'
    : ailment
      ? 'sickness'
      : state.character.age >= PASSING.timely
        ? 'age'
        : body.fit
          ? 'blade'
          : 'fall'
  return {
    what,
    says: `${PASSING_WORDS.came} ${DEATH_DEFS[what].label}: ${DEATH_DEFS[what].says}`,
  }
}

/** Что можно успеть (См2). */
export function lastDays(
  state: GameState,
  world: World,
  day: number,
): { readonly days: number; readonly can: readonly string[]; readonly says: string } {
  const heir = heirBeside(state, day)
  const can = [
    heir.who ? `сказать слово наследнику (${heir.who})` : 'назвать наследника, пока есть кому',
    'разделить землю по своей воле, а не по закону',
    'простить долги и вспомнить обещанное',
    'решить, как хоронить и за чей счёт',
  ]
  return {
    days: PASSING.lastDays,
    can,
    says: `${PASSING_WORDS.last} Осталось ${PASSING.lastDays} сут.: ${can.join('; ')}.`,
  }
}

/** Похороны и память (См3). */
export function ritesFor(
  state: GameState,
  world: World,
  day: number,
  rite: RiteId,
): { readonly costs: number; readonly remembers: number; readonly says: string } {
  const def = BURIAL_RITE_DEFS[rite]
  const remembers =
    rite === 'great' ? PASSING.greatRemembers : rite === 'none' ? PASSING.noneShames : 5
  return {
    costs: def.costs,
    remembers,
    says: `${def.label}: ${def.costs} серебра. ${def.says} ${PASSING_WORDS.rites} Память рода ${remembers > 0 ? '+' : ''}${remembers}.`,
  }
}

/** Переход как событие (См4). */
export function passingSays(state: GameState, world: World, day: number): string {
  const heir = heirBeside(state, day)
  const places = holdingsOf(state.settlements, PLAYER).length
  return heir.who
    ? `${PASSING_WORDS.passes} ${heir.who} принимает ${places} мест${heir.ready ? '' : ' при регенте: он ещё мал'}.`
    : `${PASSING_WORDS.passes} Наследника нет: ${places} мест разойдутся по чужим рукам.`
}

/** Чужая смерть (См5). */
export function othersPassing(
  state: GameState,
  world: World,
  day: number,
): readonly { readonly who: string; readonly says: string }[] {
  const rows: { who: string; says: string }[] = []
  for (const one of state.companions) {
    const age = 24 + ((one.since ?? 0) % 20) + Math.floor((day - (one.since ?? 0)) / 365)
    if (age < PASSING.timely) continue
    rows.push({
      who: one.name,
      says: `${one.name}: ${age} лет. ${DEATH_DEFS.age.says} ${PASSING_WORDS.others}`,
    })
  }
  return rows
}

/** Смерть в числах (См6). */
export function passingRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly from: DeathId
  readonly age: number
  readonly places: number
  readonly heir: boolean
  readonly says: string
} {
  const from = deathFrom(state, day)
  const heir = heirBeside(state, day)
  return {
    from: from.what,
    age: state.character.age,
    places: holdingsOf(state.settlements, PLAYER).length,
    heir: heir.who !== null,
    says: `${from.says} ${passingSays(state, world, day)}`,
  }
}
