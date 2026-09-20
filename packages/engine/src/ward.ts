import {
  BONDS,
  BOND_DEFS,
  type BondId,
  TIED,
  TIED_DEFS,
  type TiedId,
  WARD,
  WARD_WORDS,
} from './content/ward'
import { nearTo, sideName } from './dread'
import { PLAYER } from './holding'
import { strengthOf } from './mind'
import type { GameState } from './state'
import { allied, atWar, warsOf } from './war'
import type { Walker } from './way'
import type { World } from './world/types'

/**
 * Гарантия и покровительство (этап 137).
 *
 * Третий способ связать себя с чужой короной, кроме договора и дани: ручаться
 * за слабого. Слабый не обещает ничего; сильный получает то, ради чего это
 * делается, — слово, которое видно всем, и руки, связанные этим словом.
 *
 * Нарушенное поручительство стоит дороже нарушенного договора: бумагу рвут
 * многие, не приходят на зов — немногие.
 */

export function bondDef(id: BondId) {
  return BOND_DEFS[id]
}

export function tiedDef(id: TiedId) {
  return TIED_DEFS[id]
}

export interface Guarantee {
  readonly by: Walker
  readonly of: string
  readonly sinceDay: number
  /** День, когда поручившийся не пришёл. */
  readonly brokenDay?: number
  /** День, когда позвали. */
  readonly calledDay?: number
}

export interface Hand {
  readonly patron: Walker
  readonly ward: string
  readonly sinceDay: number
}

export function guaranteesOf(state: Pick<GameState, 'guarantees'>): readonly Guarantee[] {
  return state.guarantees ?? []
}

export function handsOf(state: Pick<GameState, 'hands'>): readonly Hand[] {
  return state.hands ?? []
}

/** Кто ручается за эту землю сейчас. */
export function guarantorOf(state: GameState, of: string): Guarantee | null {
  return guaranteesOf(state).find((one) => one.of === of && one.brokenDay === undefined) ?? null
}

/** Под чьей рукой эта корона. */
export function handOver(state: GameState, ward: string): Hand | null {
  return handsOf(state).find((one) => one.ward === ward) ?? null
}

/** Можно ли поручиться за эту землю (Га1). */
export function canGuarantee(
  state: GameState,
  world: World,
  by: Walker,
  of: string,
  day: number,
): { readonly can: boolean; readonly says: string } {
  if (by === of) return { can: false, says: 'За себя не ручаются.' }
  if (guarantorOf(state, of)) {
    return { can: false, says: `За ${sideName(world, of)} уже поручились.` }
  }
  if (atWar(state.politics, by, of)) {
    return { can: false, says: 'За того, с кем воюешь, не ручаются.' }
  }
  const mine = strengthOf(state, world, by, day).score
  const theirs = strengthOf(state, world, of, day).score
  const can = mine >= theirs * WARD.strongerBy
  return {
    can,
    says: can
      ? `За ${sideName(world, of)} можно поручиться: твоя сила ${mine} против его ${theirs}. ${BOND_DEFS.guarantee.after}`
      : `За ${sideName(world, of)} ручаться нечем: нужна сила ${Math.round(theirs * WARD.strongerBy)}, у тебя ${mine}.`,
  }
}

/** Чего нельзя, пока ты поручился (Га3). */
export function tiedHands(
  state: GameState,
  world: World,
  by: Walker,
  day: number,
): readonly { readonly tied: TiedId; readonly about: string; readonly says: string }[] {
  const mine = guaranteesOf(state).filter((one) => one.by === by && one.brokenDay === undefined)
  if (mine.length === 0) return []
  const names = mine.map((one) => sideName(world, one.of)).join(', ')
  return TIED.map((id) => ({
    tied: id,
    about: names,
    says: `${TIED_DEFS[id].label} (${names}): ${TIED_DEFS[id].says}`,
  }))
}

/** Связан ли ты этим запретом в отношении этой короны. */
export function tiedTo(state: GameState, by: Walker, of: string): boolean {
  return guaranteesOf(state).some(
    (one) => one.by === by && one.of === of && one.brokenDay === undefined,
  )
}

/** За кого взялись из тех, за кого ты поручился, и сколько осталось прийти (Га4). */
export function calledOn(
  state: GameState,
  world: World,
  by: Walker,
  day: number,
): readonly {
  readonly of: string
  readonly against: string
  readonly left: number
  readonly says: string
}[] {
  const out: {
    readonly of: string
    readonly against: string
    readonly left: number
    readonly says: string
  }[] = []
  for (const one of guaranteesOf(state)) {
    if (one.by !== by || one.brokenDay !== undefined) continue
    for (const war of warsOf(state.politics, one.of)) {
      const against = war.a === one.of ? war.b : war.a
      if (against === by) continue
      if (atWar(state.politics, by, against)) continue
      const since = Math.max(war.since, one.calledDay ?? war.since)
      const left = Math.max(0, WARD.comeDays - (day - since))
      out.push({
        of: one.of,
        against,
        left,
        says: `${WARD_WORDS.called} ${sideName(world, against)} пошёл на ${sideName(world, one.of)}; прийти остаётся ${left} сут.`,
      })
    }
  }
  return out
}

/** Во что обходится не прийти — и насколько это дороже порванной грамоты (Га4). */
export function breakingWord(): {
  readonly world: number
  readonly timesTreaty: number
  readonly says: string
} {
  return {
    world: WARD.breaksWord,
    timesTreaty: WARD.worseThanTreaty,
    says: `${WARD_WORDS.broken} Отношение всего мира ${WARD.breaksWord} — вдвое против нарушенной грамоты (0.7).`,
  }
}

/** Может ли эта слабая корона пойти под руку — и к кому (Га2, Га5). */
export function wantsHand(
  state: GameState,
  world: World,
  ward: string,
  day: number,
): { readonly patron: string | null; readonly says: string } {
  if (handOver(state, ward)) {
    return { patron: null, says: `${sideName(world, ward)} уже под рукой.` }
  }
  const theirs = strengthOf(state, world, ward, day).score
  const sides: Walker[] = [PLAYER, ...Object.keys(world.kingdoms)]
  // Под руку идут не к самому сильному в мире, а к сильному соседу: до дальнего
  // ещё надо дожить, а придут за тобой завтра.
  const best = sides
    .filter((one) => one !== ward)
    .map((one) => ({
      one,
      score: strengthOf(state, world, one, day).score,
      near: nearTo(state, world, one, ward),
    }))
    .filter((row) => row.score >= theirs * WARD.strongerBy)
    .map((row) => ({ ...row, weight: row.score * (WARD.farPatron + row.near) }))
    .sort((a, b) => b.weight - a.weight)[0]
  if (!best) {
    return { patron: null, says: `${sideName(world, ward)} ни под чью руку не пойдёт: сам силён.` }
  }
  // Платы рука не берёт — в том и разница с данью. Берёт она признание: под
  // рукой корона признаёт не за себя (этап 131).
  return {
    patron: best.one,
    says: `${sideName(world, ward)} пошёл бы под руку ${sideName(world, best.one)}: сила ${theirs} против ${best.score}, соседство ${best.near}. ${BOND_DEFS.hand.after}`,
  }
}

/** Гарантии и руки в числах (Га6). */
export function wardLedger(
  state: GameState,
  world: World,
  day: number,
): {
  readonly mine: number
  readonly theirs: number
  readonly hands: number
  readonly broken: number
  readonly says: string
} {
  const all = guaranteesOf(state)
  const mine = all.filter((one) => one.by === PLAYER && one.brokenDay === undefined)
  const theirs = all.filter((one) => one.by !== PLAYER && one.brokenDay === undefined)
  const broken = all.filter((one) => one.brokenDay !== undefined)
  const hands = handsOf(state)
  return {
    mine: mine.length,
    theirs: theirs.length,
    hands: hands.length,
    broken: broken.length,
    says: `${WARD_WORDS.theirs} Поручился ты за ${mine.length}${mine.length > 0 ? ` (${mine.map((one) => sideName(world, one.of)).join(', ')})` : ''}, прочие — за ${theirs.length}; под рукой ${hands.length}${hands.length > 0 ? ` (${hands.map((one) => `${sideName(world, one.ward)} под ${sideName(world, one.patron)}`).join(', ')})` : ''}; слово нарушено ${broken.length} раз.`,
  }
}

export { WARD, WARD_WORDS, BONDS, BOND_DEFS, TIED, TIED_DEFS, type BondId, type TiedId }
