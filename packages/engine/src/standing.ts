import { STANDING, STANDING_BOND_DEFS, STANDING_WORDS, type StandingBond } from './content/standing'
import { SECRET_DEFS } from './content/treaties'
import { sideName } from './dread'
import { PLAYER } from './holding'
import { crownPlan } from './plans'
import type { GameState } from './state'
import { treatiesOf } from './treaty'
import { relationOf } from './war'
import type { World } from './world/types'

/**
 * Дипломатия в числах (этап 195).
 *
 * К 1.0 дипломатии много: союзы, дань, договоры с тайными статьями, съезды,
 * посольства, резиденты. И всё это лежало по разным экранам — игрок видел
 * строки, но не расклад: с кем он связан, против кого, с какого дня и что
 * будет, если ничего не менять.
 *
 * Здесь всё сводится в одно место. Ни одной новой величины: союзы, дань,
 * бумаги и отношения уже записаны — их только читают, с твоего места или с
 * чужого.
 */

export interface StandingRow {
  readonly other: string
  readonly kind: StandingBond
  /** День, с которого связь есть. Ноль — с начала мира, то есть ниоткуда. */
  readonly since: number
  readonly why: string
  readonly says: string
}

/** Кто с кем и с какого дня — с места выбранной стороны (Дп1, Дп2, Дп5). */
export function bondsOf(
  state: GameState,
  world: World,
  side: string,
  day: number,
): readonly StandingRow[] {
  const rows: StandingRow[] = []
  const seen = new Set<string>()
  const put = (other: string, kind: StandingBond, since: number, why: string) => {
    if (seen.has(other)) return
    seen.add(other)
    rows.push({
      other,
      kind,
      since,
      why,
      says: `${sideName(world, other)}: ${STANDING_BOND_DEFS[kind].label}${
        since > 0 ? ` с ${since} сут` : ''
      } — ${why}`,
    })
  }
  // Порядок важен: война перебивает всё, потом союз, дань, бумага, и лишь
  // после — голое отношение. Одна сторона — одна строка, самая важная.
  for (const war of state.politics.wars) {
    const other = war.a === side ? war.b : war.b === side ? war.a : null
    if (other) put(other, 'war', war.since, `повод: ${war.reason}`)
  }
  for (const pact of state.politics.alliances) {
    const other = pact.a === side ? pact.b : pact.b === side ? pact.a : null
    if (other) {
      put(other, 'ally', pact.since, pact.byMarriage ? 'скреплён браком' : 'на слове')
    }
  }
  for (const due of state.politics.tributes) {
    if (due.untilDay <= day) continue
    const other = due.from === side ? due.to : due.to === side ? due.from : null
    if (other) {
      put(
        other,
        'tribute',
        0,
        `${due.from === side ? 'платишь' : 'платят'} ${due.perDay} в сутки до ${due.untilDay} сут`,
      )
    }
  }
  for (const paper of papersOf(state, side, day)) {
    const other = paper.a === side ? paper.b : paper.a
    put(other, 'paper', paper.sinceDay, paperWhy(paper))
  }
  for (const other of Object.keys(world.kingdoms)) {
    if (other === side) continue
    const relation = relationOf(state.politics, side, other)
    if (relation >= STANDING.warmAt) put(other, 'warm', 0, `отношение ${relation}`)
    else if (relation <= STANDING.coldAt) put(other, 'cold', 0, `отношение ${relation}`)
  }
  if (side !== PLAYER && !seen.has(PLAYER)) {
    put(PLAYER, 'cold', 0, `отношение ${relationOf(state.politics, side, PLAYER)}`)
  }
  return rows
}

function papersOf(state: GameState, side: string, day: number) {
  return treatiesOf(state).filter(
    (one) =>
      (one.a === side || one.b === side) &&
      one.brokenBy === undefined &&
      (one.untilDay === 0 || one.untilDay > day),
  )
}

/**
 * Что за бумагой стоит — и сколько из этого видно читающему (Дп2, Дп5).
 *
 * Сводку читает игрок, с чьего бы места она ни была написана. Тайную статью
 * знают только те, кто её подписал, и те, кто её раскрыл: в чужом раскладе на
 * том же месте стоит честное «есть тайная статья, и не тебе о ней знать».
 */
function paperWhy(paper: ReturnType<typeof papersOf>[number]): string {
  const term = paper.untilDay === 0 ? 'бессрочно' : `до ${paper.untilDay} сут`
  if (!paper.secret) return term
  const mine = paper.a === PLAYER || paper.b === PLAYER
  if (!mine && paper.secret.known !== true) return `${term}, ${STANDING_WORDS.hidden}`
  return `${term}, тайно: ${SECRET_DEFS[paper.secret.id].label}`
}

/** Что сложится, если не менять ничего (Дп3). */
export function drift(
  state: GameState,
  world: World,
  side: string,
  day: number,
): readonly string[] {
  const out: string[] = []
  for (const bond of bondsOf(state, world, side, day)) {
    const name = sideName(world, bond.other)
    if (bond.kind === 'war') {
      out.push(`${name}: война идёт ${day - bond.since} сут и сама не кончится.`)
    }
  }
  for (const due of state.politics.tributes) {
    if (due.untilDay <= day || (due.from !== side && due.to !== side)) continue
    if (due.untilDay - day <= STANDING.soonDays) {
      out.push(
        `Дань ${due.from === side ? 'твоя' : 'тебе'} кончается через ${due.untilDay - day} сут.`,
      )
    }
  }
  for (const paper of papersOf(state, side, day)) {
    if (paper.untilDay === 0) continue
    if (paper.untilDay - day <= STANDING.soonDays) {
      out.push(
        `${sideName(world, paper.a === side ? paper.b : paper.a)}: бумага истекает через ${paper.untilDay - day} сут — и не продлевается сама.`,
      )
    }
  }
  for (const other of Object.keys(world.kingdoms)) {
    if (other === side) continue
    const plan = crownPlan(world, state.politics, state.settlements, other)
    if (plan.targetId === side && plan.want === 'foe') {
      out.push(`${sideName(world, other)} метит в тебя: ${plan.why}`)
    }
  }
  return out
}

/** Чем это меняют (Дп4). */
export function standingMoves(
  state: GameState,
  world: World,
  side: string,
  day: number,
): readonly string[] {
  const out: string[] = []
  for (const bond of bondsOf(state, world, side, day)) {
    const name = sideName(world, bond.other)
    if (bond.kind === 'war') out.push(`${name}: послать о мире первым, пока не пришли к тебе.`)
    if (bond.kind === 'cold') out.push(`${name}: начать с малого — торговая бумага дешевле союза.`)
    if (bond.kind === 'warm') out.push(`${name}: скрепить приязнь браком, пока она не остыла.`)
    if (bond.kind === 'ally' && bond.since > 0 && day - bond.since > STANDING.soonDays) {
      out.push(
        `${name}: спросить по старому союзу — за ${day - bond.since} сут не спрошено ни разу.`,
      )
    }
  }
  for (const paper of papersOf(state, side, day)) {
    if (paper.untilDay !== 0 && paper.untilDay - day <= STANDING.soonDays) {
      out.push(`${sideName(world, paper.a === side ? paper.b : paper.a)}: продлить бумагу заранее.`)
    }
  }
  return out.slice(0, STANDING.shows)
}

/** Весь расклад на одном месте (Дп1, Дп5). */
export function standingOf(
  state: GameState,
  world: World,
  side: string,
  day: number,
): {
  readonly bonds: readonly StandingRow[]
  readonly ahead: readonly string[]
  readonly moves: readonly string[]
  readonly weight: number
  readonly says: string
} {
  const bonds = bondsOf(state, world, side, day)
  const weight = bonds.reduce((sum, one) => sum + STANDING_BOND_DEFS[one.kind].weight, 0)
  const wars = bonds.filter((one) => one.kind === 'war').length
  const allies = bonds.filter((one) => one.kind === 'ally').length
  return {
    bonds,
    ahead: drift(state, world, side, day),
    moves: standingMoves(state, world, side, day),
    weight,
    says: `${side === PLAYER ? STANDING_WORDS.one : STANDING_WORDS.theirs} ${sideName(world, side)}: связей ${bonds.length}, из них войн ${wars}, союзов ${allies}; расклад ${weight > 0 ? `+${weight}` : weight}. ${STANDING_WORDS.why}`,
  }
}

/** Век дипломатии (Дп6). */
export function standingRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly papers: number
  readonly broken: number
  readonly allies: number
  readonly wars: number
  readonly congresses: number
  readonly says: string
} {
  const all = treatiesOf(state)
  const broken = all.filter((one) => one.brokenBy !== undefined).length
  const allies = state.politics.alliances.filter(
    (one) => one.a === PLAYER || one.b === PLAYER,
  ).length
  const wars = state.politics.wars.filter((one) => one.a === PLAYER || one.b === PLAYER).length
  const congresses = (state.congresses ?? []).length
  return {
    papers: all.length,
    broken,
    allies,
    wars,
    congresses,
    says: `Бумаг ${all.length}, из них порвано ${broken}; союзов ${allies}, войн ${wars}, съездов ${congresses}. ${STANDING_WORDS.moves}`,
  }
}
