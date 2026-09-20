import { DRAGS, DRAG_DEFS, type DragId, RACE, RACE_WORDS } from './content/race'
import { dreadSeen, sideName, wayTruth } from './dread'
import { PLAYER } from './holding'
import { leagueNow } from './league'
import type { GameState } from './state'
import { crownWay, theirWay } from './theirway'
import { warsOf } from './war'
import type { Walker } from './way'
import type { World } from './world/types'

/**
 * Продвижение и гонка (этап 141).
 *
 * Гонка складывается из четырёх вещей: шаг вперёд виден, соперники на одном
 * пути мешают друг другу, у конца начинают рисковать, а коалиция и война
 * откатывают назад. Ведущий виден всегда — но с той вилкой, с какой видно
 * всякое чужое продвижение (этап 135).
 */

export function dragDef(id: DragId) {
  return DRAG_DEFS[id]
}

/** Кто идёт тем же путём — и потому мешает (Гн2). */
export function rivalsOf(
  state: GameState,
  world: World,
  who: Walker,
  day: number,
): readonly string[] {
  const mine = who === PLAYER ? null : crownWay(state, world, who, day)
  return Object.keys(world.kingdoms).filter(
    (id) => id !== who && mine !== null && crownWay(state, world, id, day) === mine,
  )
}

/** Насколько медленнее идёт тот, у кого есть соперник на том же пути (Гн2). */
export function raceSpeed(
  state: GameState,
  world: World,
  who: Walker,
  day: number,
): { readonly speed: number; readonly rivals: readonly string[]; readonly says: string } {
  const rivals = rivalsOf(state, world, who, day)
  const speed = rivals.length === 0 ? 1 : Math.round(RACE.sameWay ** rivals.length * 100) / 100
  return {
    speed,
    rivals,
    says:
      rivals.length === 0
        ? `${sideName(world, who)} идёт своим путём один.`
        : `${RACE_WORDS.rivals} ${sideName(world, who)}: соперников ${rivals.length} (${rivals.map((id) => sideName(world, id)).join(', ')}), шаг ×${speed}.`,
  }
}

/** Что тормозит идущего сейчас (Гн4). */
export function dragsOn(
  state: GameState,
  world: World,
  who: Walker,
  day: number,
): readonly DragId[] {
  const out: DragId[] = []
  const league = leagueNow(state, world, day)
  if (league.against === who && league.members.length > 0) out.push('league')
  if (warsOf(state.politics, who).length >= 2) out.push('fronts')
  const best = state.crownWays?.[who]?.places ?? 0
  const now =
    who === PLAYER
      ? 0
      : (theirWay(state, world, who, day).steps.find((one) => one.step.measure === 'places')
          ?.have ?? 0)
  if (who !== PLAYER && best > now) out.push('land')
  return out
}

/** Рискует ли идущий: у конца берут займы и нарушают слово (Гн3). */
export function risking(
  state: GameState,
  world: World,
  who: Walker,
  day: number,
): { readonly risks: boolean; readonly share: number; readonly says: string } {
  // Считается доля того пути, которым сторона идёт (этап 140), а не лучшего из
  // возможных: рискуют ради своего конца, а не ради случайно совпавшей вехи.
  const share =
    who === PLAYER
      ? wayTruth(state, world, PLAYER, day) / 100
      : theirWay(state, world, who, day).share
  const risks = share >= RACE.risksAt
  return {
    risks,
    share,
    says: risks
      ? `${RACE_WORDS.risks} ${sideName(world, who)}: пройдено ${Math.round(share * 100)} из ста, верность своих ${RACE.risksLoyalty} за такт, мир холодеет на ${RACE.risksWord}.`
      : `${sideName(world, who)} пока не рискует: пройдено ${Math.round(share * 100)} из ста из ${Math.round(RACE.risksAt * 100)}.`,
  }
}

/** Кто ведёт гонку — по тому, что до тебя дошло (Гн5). */
export function whoLeads(
  state: GameState,
  world: World,
  day: number,
): { readonly who: Walker; readonly seen: number; readonly gap: number; readonly says: string } {
  const rows = [
    { who: PLAYER as Walker, seen: wayTruth(state, world, PLAYER, day) },
    ...Object.keys(world.kingdoms).map((id) => {
      const known = dreadSeen(state, world, PLAYER, id, day).known
      return { who: id as Walker, seen: typeof known.value === 'number' ? known.value : 0 }
    }),
  ].sort((a, b) => b.seen - a.seen)
  const first = rows[0] ?? { who: PLAYER as Walker, seen: 0 }
  const second = rows[1] ?? { who: PLAYER as Walker, seen: 0 }
  return {
    who: first.who,
    seen: first.seen,
    gap: first.seen - second.seen,
    says: `${RACE_WORDS.leads} Ведёт ${sideName(world, first.who)}: ${first.seen} из ста, отрыв ${first.seen - second.seen}.`,
  }
}

/** Гонка в числах (Гн6). */
export function raceLedger(
  state: GameState,
  world: World,
  day: number,
): { readonly steps: number; readonly done: number; readonly says: string } {
  const log = state.raceLog ?? { steps: 0, done: [] }
  const leads = whoLeads(state, world, day)
  return {
    steps: log.steps,
    done: log.done.length,
    says: `Шагов вперёд замечено ${log.steps}; дошли до конца ${log.done.length}${log.done.length > 0 ? ` (${log.done.map((id) => sideName(world, id)).join(', ')})` : ''}. ${leads.says}`,
  }
}

export { RACE, RACE_WORDS, DRAGS, DRAG_DEFS, type DragId }
