import { ELDER, ELDER_WORDS } from './content/elder'
import { ageKind, bodyOf } from './flesh'
import { PLAYER, holdingsOf } from './holding'
import { canRetire } from './home'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Старость (этап 189).
 *
 * Годы отнимали: сила, выносливость, потолки. Не прибавляли ничего — и оттого
 * старость была наказанием за долгую игру, а не временем, в котором играют
 * иначе.
 *
 * Здесь годы начинают давать. Потерянное в силе возвращается в слове, в суде и
 * в связях: со старшим говорят иначе, и это считается тем же числом, каким
 * считается всё прочее.
 */

/** Насколько годы прибавляют слову (Ст2). */
export function wordWeight(state: GameState, day: number): number {
  const age = state.character.age
  if (age < ELDER.weighsFrom) return 1
  return Math.min(ELDER.most, 1 + (age - ELDER.weighsFrom) * ELDER.perYear)
}

/** Что годы дают и что отнимают (Ст1, Ст2, Ст5). */
export function elderSays(state: GameState, world: World, day: number): string {
  const body = bodyOf(state, day)
  const weight = wordWeight(state, day)
  const age = state.character.age
  const parts = [
    `${age} лет, ${body.says}`,
    weight > 1 ? `${ELDER_WORDS.weighs} Слово ×${Math.round(weight * 100) / 100}.` : '',
    age >= ELDER.noWarFrom ? ELDER_WORDS.body : '',
    age >= ELDER.weighsFrom ? ELDER_WORDS.late : '',
  ].filter((one) => one !== '')
  return parts.join(' ')
}

/** Наследник рядом (Ст3). */
export function heirBeside(
  state: GameState,
  day: number,
): { readonly ready: boolean; readonly who: string | null; readonly says: string } {
  const heir = state.character.family.children.find((one) => one.heir)
  if (!heir) return { ready: false, who: null, says: 'Наследника нет, и передавать некому.' }
  const years = Math.floor((day - heir.bornDay) / 365)
  const ready = years >= ELDER.heirReady
  return {
    ready,
    who: heir.name,
    says: ready
      ? `${ELDER_WORDS.heir} ${heir.name}, ${years} лет: принять дела может хоть завтра.`
      : `${heir.name}, ${years} лет: рано. Ждать ещё ${ELDER.heirReady - years}.`,
  }
}

/** Отход от дел (Ст4). */
export function retireNow(
  state: GameState,
  world: World,
  day: number,
): { readonly can: boolean; readonly says: string } {
  const can = canRetire(state, day)
  const places = holdingsOf(state.settlements, PLAYER).length
  return {
    can,
    says: can
      ? `${ELDER_WORDS.retire} Передать придётся ${places} мест и всё, что к ним.`
      : 'Отойти пока нельзя: или годы не те, или наследник мал.',
  }
}

/** Старость в числах (Ст6). */
export function elderRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly age: number
  readonly word: number
  readonly fit: boolean
  readonly heir: boolean
  readonly says: string
} {
  const body = bodyOf(state, day)
  const heir = heirBeside(state, day)
  return {
    age: state.character.age,
    word: Math.round(wordWeight(state, day) * 100) / 100,
    fit: body.fit && state.character.age < ELDER.noWarFrom,
    heir: heir.ready,
    says: `${ageKind(state.character.age)}: слово ×${Math.round(wordWeight(state, day) * 100) / 100}, в поход ${
      body.fit && state.character.age < ELDER.noWarFrom ? 'ещё можно' : 'уже нет'
    }, наследник ${heir.ready ? 'готов' : 'не готов'}.`,
  }
}
