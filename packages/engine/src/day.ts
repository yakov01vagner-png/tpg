import { churchAsk, churchOf } from './church'
import { citiesOf, cityAsks } from './city'
import { AUDIENCE, AUDIENCE_WORDS, MATTER_DEFS, type MatterKind } from './content/audience'
import { OFFICES, type OfficeId } from './content/offices'
import { vassalsOf } from './court'
import { type CourtPerson, asksNow, courtierAt, courtiersOf } from './courtier'
import { PLAYER, holdingsOf } from './holding'
import { overturesOf } from './overture'
import { plotAgainst } from './revolt'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * День государя (этап 107).
 *
 * Самая дорогая вещь во власти — не серебро и не войско, а внимание. До 0.8
 * государь успевал всё: приказов можно было отдать сколько угодно, и каждый
 * доходил. Оттого управление державой было работой без цены.
 *
 * Здесь у дня есть дно. Дел у дверей всегда больше, чем часов; что-то можно
 * отдать своим — и тогда оно решится их глазами и их рукой; а то, на что никто
 * не посмотрел, решается само и обычно не в твою пользу.
 */

export interface Matter {
  readonly id: string
  readonly kind: MatterKind
  readonly label: string
  /** О ком или о чём. */
  readonly about: string
  readonly weight: number
  /** С какого дня ждёт. */
  readonly sinceDay: number
  /** Что будет, если не посмотреть. */
  readonly ignored: string
  readonly says: string
}

export function matterDef(kind: MatterKind) {
  return MATTER_DEFS[kind]
}

/**
 * Кто стоит у дверей (Дн2).
 *
 * Очередь не хранится: она выводится из мира — из просьб мест, обид вассалов,
 * желаний двора, чужих послов, городов, церкви и того, о чём шепчут. Поэтому её
 * нельзя «накопить»: чего в мире нет, того и у дверей нет.
 */
export function doorway(state: GameState, world: World, day: number): readonly Matter[] {
  const out: Matter[] = []
  const say = (kind: MatterKind, id: string, about: string, says: string, since: number) => {
    const def = MATTER_DEFS[kind]
    out.push({
      id,
      kind,
      label: def.label,
      about,
      weight: def.weight,
      sinceDay: since,
      ignored: def.ignored,
      says,
    })
  }
  // Просители: места, чья просьба висит без ответа (этап 61).
  for (const [locationId, plea] of Object.entries(state.pleas ?? {})) {
    say(
      'plea',
      `plea:${locationId}`,
      locationId,
      `${world.locations[locationId]?.name ?? locationId}: просят о своём с ${plea.askedDay} дня.`,
      plea.askedDay,
    )
  }
  // Вассалы: те, у кого верность просела.
  for (const lord of vassalsOf(state)) {
    if (lord.loyalty >= 55) continue
    say(
      'vassal',
      `vassal:${lord.id}`,
      lord.id,
      `${lord.title} ${lord.name} ждёт разговора: верность ${Math.round(lord.loyalty)}.`,
      day - AUDIENCE.waitsDays,
    )
  }
  // Свои люди: те, кто просит.
  for (const one of courtiersOf(state, day)) {
    if (!asksNow(one, day)) continue
    say('courtier', `courtier:${one.office}`, one.office, `${one.name} просит о своём.`, day)
  }
  // Чужие послы.
  for (const one of overturesOf(state)) {
    if (one.untilDay < day) continue
    say('envoy', `envoy:${one.id}`, one.fromKingdom, one.says, one.sinceDay)
  }
  // Города.
  for (const city of citiesOf(state, world)) {
    const asks = cityAsks(state, world, city)
    const first = asks[0]
    if (!first) continue
    say('city', `city:${city.locationId}`, city.locationId, `${city.name}: ${first.says}`, day)
  }
  // Церковь.
  const church = churchOf(state, world, day)
  if (church.anger > 0) {
    say('church', 'church', 'church', `Церковь: ${church.says}`, day)
  }
  // Шёпот.
  const plot = plotAgainst(state, world, day)
  if (plot?.seen) say('plot', 'plot', plot.leaderId, plot.says, day)
  return out.sort((a, b) => a.sinceDay - b.sinceDay)
}

/**
 * Сколько дел государь возьмёт на себя сегодня (Дн1).
 *
 * Основа — три дела; обаяние и воля прибавляют, усталость отнимает. Это и есть
 * потолок власти: всё прочее придётся отдать или не заметить.
 */
export function attentionOf(state: GameState): number {
  const mind = state.character.attributes.charisma + state.character.attributes.will
  const over = Math.max(0, mind - 6) * AUDIENCE.perAttribute
  const tired = state.character.fatigue >= AUDIENCE.tiredFrom ? AUDIENCE.tiredCuts : 0
  return Math.max(1, Math.round(AUDIENCE.base + over - tired))
}

export interface DayPlan {
  readonly waiting: readonly Matter[]
  readonly canTake: number
  readonly overflow: number
  readonly says: string
}

/** Что у тебя за день (Дн1 и Дн2). */
export function dayOfRule(state: GameState, world: World, day: number): DayPlan {
  const waiting = doorway(state, world, day)
  const canTake = attentionOf(state)
  const weight = waiting.reduce((sum, one) => sum + one.weight, 0)
  return {
    waiting,
    canTake,
    overflow: Math.max(0, weight - canTake),
    says:
      waiting.length === 0
        ? AUDIENCE_WORDS.empty
        : weight > canTake
          ? `${AUDIENCE_WORDS.full} Дел у дверей ${waiting.length} (весом ${weight}), взять можешь ${canTake}.`
          : `У дверей ${waiting.length} дел, и ты успеваешь все.`,
  }
}

/** Кому можно передать это дело (Дн4). */
export function whoTakes(state: GameState, matter: Matter, day: number): CourtPerson | null {
  const wanted: Record<MatterKind, OfficeId> = {
    plea: 'seneschal',
    vassal: 'chancellor',
    courtier: 'seneschal',
    envoy: 'chancellor',
    city: 'treasurer',
    church: 'chancellor',
    plot: 'marshal',
  }
  const office = wanted[matter.kind]
  const one = courtierAt(state, office, day)
  if (one) return one
  for (const other of OFFICES) {
    const some = courtierAt(state, other, day)
    if (some) return some
  }
  return null
}

/** Насколько хуже выйдет дело в чужих руках (Дн4). */
export function delegatedWorth(one: CourtPerson | null): number {
  if (!one) return 0
  return Math.round(AUDIENCE.delegated * (0.6 + one.worth / 10) * 100) / 100
}

/** Сколько дней ждало дело и не пора ли ему решиться без тебя (Дн3). */
export function overdue(matter: Matter, day: number): boolean {
  return day - matter.sinceDay >= AUDIENCE.waitsDays
}

export interface RuleYear {
  readonly heard: number
  readonly handed: number
  readonly missed: number
  readonly says: string
}

/** На что ушёл твой год (Дн6). */
export function ruleYear(state: Pick<GameState, 'ruleLog'>): RuleYear {
  const rows = state.ruleLog ?? { heard: 0, handed: 0, missed: 0 }
  const all = rows.heard + rows.handed + rows.missed
  return {
    ...rows,
    says:
      all === 0
        ? 'Год ещё не начинался: дел ты не разбирал.'
        : `За год: разобрано тобой ${rows.heard}, передано своим ${rows.handed}, решилось без тебя ${rows.missed}. Своей рукой — ${Math.round((rows.heard / all) * 100)} из ста.`,
  }
}

export { AUDIENCE, AUDIENCE_WORDS, MATTER_DEFS, type MatterKind }
