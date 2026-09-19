import {
  CENSURE_DEFS,
  CHURCH,
  CHURCH_WANT_DEFS,
  CHURCH_WORDS,
  type CensureId,
  type ChurchWant,
} from './content/church'
import { PLAYER, holdingsOf } from './holding'
import type { GameState } from './state'
import { pietyOf } from './temple'
import { atWar, warsOf } from './war'
import type { World } from './world/types'

/**
 * Церковь как держава (этап 96).
 *
 * Церковь была местом, где служат обряды, и запретом на одно место (этап 59).
 * Силой она не была: ни земли, ни воли, ни счёта к тебе. Оттого в игре не было
 * той власти, которая не воюет, но которой боятся все воюющие.
 *
 * Здесь у неё появляется своё: земля обителей, десятина, замыслы и счёт
 * недовольства, который растёт от отказов и падает от уступок. На счёт она
 * отвечает — словом, интердиктом на всю державу и походом, в который зовёт
 * других корон.
 */

/** Запрет на всю державу — не на одно место (Ц2). */
export interface Censure {
  readonly kind: CensureId
  readonly sinceDay: number
  readonly untilDay: number
  readonly why: ChurchWant
}

export function censureOf(state: Pick<GameState, 'censure'>): Censure | null {
  return state.censure ?? null
}

export function wantDef(want: ChurchWant) {
  return CHURCH_WANT_DEFS[want]
}

export function censureDef(kind: CensureId) {
  return CENSURE_DEFS[kind]
}

// --- церковь как держава (Ц1) -----------------------------------------------

export interface Church {
  /** Сколько мест держат обители. */
  readonly places: number
  /** Сколько серебра в год даёт ей твоя земля. */
  readonly tithe: number
  /** Счёт её недовольства тобой. */
  readonly anger: number
  /** Благочестие: то, что она видит с твоей стороны. */
  readonly piety: number
  readonly says: string
}

/**
 * Какова церковь сегодня и что она о тебе думает (Ц1).
 *
 * Её сила выводится из мира: обители на карте и десятина с твоей земли. Счёт
 * недовольства хранится — это память об отказах, а не сиюминутное настроение.
 */
export function churchOf(state: GameState, world: World, day: number): Church {
  let places = 0
  for (const one of Object.values(world.locations)) {
    if (one.archetype === 'monastery') places += 1
  }
  const mine = holdingsOf(state.settlements, PLAYER)
  const tithe = Math.round(
    mine.reduce((sum, one) => sum + one.population * 0.02, 0) * CHURCH.tithe * 10,
  )
  const anger = state.churchAnger ?? 0
  const piety = pietyOf(state)
  return {
    places,
    tithe,
    anger,
    piety,
    says:
      anger >= CENSURE_DEFS.crusade.from
        ? CHURCH_WORDS.called
        : anger >= CENSURE_DEFS.interdict.from
          ? CHURCH_WORDS.angry
          : anger >= CENSURE_DEFS.warning.from
            ? CHURCH_WORDS.patient
            : CHURCH_WORDS.pleased,
  }
}

/**
 * Чего церковь просит у тебя сейчас (Ц1 и Ц4).
 *
 * Просьба берётся из положения: воюющего просят кончить войну, богатого — дать
 * земли обители, грешного — покаяться, а того, у кого всё ровно, — десятины и
 * суда по вере.
 */
export function churchAsk(state: GameState, world: World, day: number): ChurchWant {
  const fighting = warsOf(state.politics, PLAYER).length > 0
  const shamed = (state.shames ?? []).length > 0
  const mine = holdingsOf(state.settlements, PLAYER).length
  if (shamed) return 'penance'
  if (fighting) return 'peace'
  if (mine >= 8) return 'land'
  if (pietyOf(state) < 0) return 'penance'
  const season = Math.floor(day / 180)
  return season % 2 === 0 ? 'tithe' : 'law'
}

// --- кара (Ц2, Ц3) ----------------------------------------------------------

/** До какой кары дошёл счёт недовольства. */
export function censureDue(anger: number): CensureId | null {
  if (anger >= CENSURE_DEFS.crusade.from) return 'crusade'
  if (anger >= CENSURE_DEFS.interdict.from) return 'interdict'
  if (anger >= CENSURE_DEFS.warning.from) return 'warning'
  return null
}

/** Во что обходится интердикт на всю державу. */
export function interdictBite(state: GameState): {
  readonly places: number
  readonly mood: number
  readonly says: string
} {
  const mine = holdingsOf(state.settlements, PLAYER)
  return {
    places: mine.length,
    mood: CHURCH.interdictMood,
    says: `${CHURCH_WORDS.interdict} Он лежит на всех ${mine.length} твоих местах: каждая декада — ${Math.abs(CHURCH.interdictMood)} памяти в каждом и ${Math.abs(CHURCH.interdictCommons)} к настроению черни в городах.`,
  }
}

/**
 * Кто пойдёт по призыву (Ц3).
 *
 * Идут те, кому это выгодно и кто не связан с тобой: сначала соседи, потом
 * дальние. Церковь не воюет сама — она называет имя, и этого довольно.
 */
export function crusadersAgainst(
  state: GameState,
  world: World,
  target: string,
  day: number,
): readonly string[] {
  const out: string[] = []
  for (const kingdomId of Object.keys(world.kingdoms)) {
    if (kingdomId === target) continue
    if (atWar(state.politics, kingdomId, target)) continue
    if (
      state.politics.alliances.some(
        (one) =>
          (one.a === kingdomId && one.b === target) || (one.b === kingdomId && one.a === target),
      )
    ) {
      continue
    }
    out.push(kingdomId)
    if (out.length >= CHURCH.crusaders) break
  }
  return out
}

// --- своя вера (Ц5) ---------------------------------------------------------

export interface Defiance {
  /** Насколько отказ поднимет счёт. */
  readonly anger: number
  /** Чего это будет стоить благочестием. */
  readonly piety: number
  readonly says: string
}

/** Чего будет стоить спор с церковью (Ц5). */
export function defianceCost(want: ChurchWant): Defiance {
  const def = CHURCH_WANT_DEFS[want]
  return {
    anger: CHURCH.refusal,
    piety: -Math.round(def.piety / 2),
    says: `Отказ: счёт церкви вырастет на ${CHURCH.refusal}, благочестие упадёт на ${Math.round(def.piety / 2)}. За это же самое она и терпит: спорить с ней можно, бесплатно — нет.`,
  }
}

// --- вера в отчёте (Ц6) -----------------------------------------------------

export interface ChurchLedger {
  readonly anger: number
  readonly censure: CensureId | null
  readonly interdictDays: number
  readonly piety: number
  readonly says: string
}

export function churchLedger(state: GameState, world: World, day: number): ChurchLedger {
  const church = churchOf(state, world, day)
  const censure = censureOf(state)
  const left = censure ? Math.max(0, censure.untilDay - day) : 0
  return {
    anger: church.anger,
    censure: censure?.kind ?? null,
    interdictDays: censure?.kind === 'interdict' ? left : 0,
    piety: church.piety,
    says: `Счёт церкви к тебе ${church.anger}${censure ? `, кара — ${CENSURE_DEFS[censure.kind].label} (осталось ${left} сут.)` : ''}; благочестия ${church.piety}. ${church.says}`,
  }
}

export { CHURCH, CHURCH_WANT_DEFS, CENSURE_DEFS, CHURCH_WORDS, type ChurchWant, type CensureId }
