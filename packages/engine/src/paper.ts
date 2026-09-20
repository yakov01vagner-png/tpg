import { CLAUSE_DEFS, type ClauseId, PAPER, PAPER_WORDS } from './content/paper'
import { TREATY_DEFS } from './content/treaties'
import { PLAYER } from './holding'
import type { GameState } from './state'
import { type Treaty, liveTreaties, treatiesOf } from './treaty'
import { guarantorOf } from './ward'
import type { World } from './world/types'

/**
 * Договор, который читается (этап 192).
 *
 * Договор был записью: кто, с кем, какого рода, до какого дня. Условия в нём
 * не разложены, повода разорвать нет, исполнение не считается — и потому
 * бумага ничего не весила: её нельзя было ни прочитать, ни проверить.
 *
 * Здесь грамота собирается из условий, у каждого своя цена и свой повод быть
 * порванным, а исполнение считается тем, что в мире уже есть.
 */

/** Из чего состоит эта бумага (Дг1). */
export function clausesOf(treaty: Treaty): readonly ClauseId[] {
  switch (treaty.kind) {
    case 'peace':
      return ['keep']
    case 'alliance':
      return ['serve', 'keep']
    case 'tribute':
      return ['pay', 'keep']
    case 'passage':
      return ['open']
    case 'trade':
      return ['open', 'keep']
    case 'neutrality':
      return ['keep']
    case 'handover':
      return ['yield']
  }
}

/** Срок и повод разорвать (Дг2). */
export function termOf(
  treaty: Treaty,
  day: number,
): { readonly left: number; readonly breaks: readonly string[]; readonly says: string } {
  const left = treaty.untilDay === 0 ? PAPER.plainDays : Math.max(0, treaty.untilDay - day)
  const breaks = clausesOf(treaty).map((one) => CLAUSE_DEFS[one].breaks)
  return {
    left,
    breaks,
    says: `${treaty.untilDay === 0 ? 'Бессрочно' : `Осталось ${left} сут.`} Порвать можно так: ${breaks.join(' ')}`,
  }
}

/** Исполняется ли она (Дг3). */
export function keptSoFar(
  state: GameState,
  world: World,
  treaty: Treaty,
  day: number,
): { readonly kept: boolean; readonly says: string } {
  if (treaty.brokenBy) {
    return { kept: false, says: `${PAPER_WORDS.dead} Порвал ${treaty.brokenBy}.` }
  }
  const owes = treaty.perDay ?? 0
  const paying =
    owes === 0 ||
    state.politics.tributes.some(
      (one) =>
        (one.from === treaty.a && one.to === treaty.b) ||
        (one.from === treaty.b && one.to === treaty.a),
    )
  return {
    kept: paying,
    says: paying ? PAPER_WORDS.kept : PAPER_WORDS.slipping,
  }
}

/** Свидетель и порука (Дг4). */
export function witnessOf(
  state: GameState,
  treaty: Treaty,
): { readonly who: string | null; readonly holds: number; readonly says: string } {
  const other = treaty.a === PLAYER ? treaty.b : treaty.a
  const ward = guarantorOf(state, other)
  const who = treaty.guarantor ?? ward?.by ?? null
  return {
    who,
    holds: who ? PAPER.guarantorHolds : 1,
    says: who
      ? `${PAPER_WORDS.witness} Свидетель: ${who}; порвать при нём дороже в ${PAPER.guarantorHolds} раза.`
      : 'Свидетеля нет: бумага держится только на слове.',
  }
}

/** Грамота словами (Дг5). */
export function paperSays(state: GameState, world: World, treaty: Treaty, day: number): string {
  const def = TREATY_DEFS[treaty.kind]
  const clauses = clausesOf(treaty).map((one) => CLAUSE_DEFS[one].says)
  const term = termOf(treaty, day)
  const kept = keptSoFar(state, world, treaty, day)
  const witness = witnessOf(state, treaty)
  return `${def.label} между ${treaty.a} и ${treaty.b}, с ${treaty.sinceDay}-го дня. ${clauses.join(' ')} ${term.says} ${kept.says} ${witness.says} ${PAPER_WORDS.reads}`
}

/** Договоры в числах (Дг6). */
export function paperRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly all: number
  readonly live: number
  readonly broken: number
  readonly witnessed: number
  readonly says: string
} {
  const all = treatiesOf(state)
  const live = liveTreaties(state, day)
  const broken = all.filter((one) => one.brokenBy !== undefined).length
  const witnessed = all.filter((one) => witnessOf(state, one).who !== null).length
  return {
    all: all.length,
    live: live.length,
    broken,
    witnessed,
    says: `Грамот ${all.length}: в силе ${live.length}, порвано ${broken}, со свидетелем ${witnessed}.`,
  }
}
