import type { Battle } from './battle'
import { ORDER_LABELS, groupsSize, unitsSize } from './battle'
import { GROUNDS, type GroundId } from './content/field'
import {
  MELEE,
  MELEE_WORDS,
  PHASE_DEFS,
  type PhaseId,
  WEATHERS,
  WEATHER_DEFS,
  type WeatherId,
} from './content/melee'
import type { Soldier } from './folk'
import { soldiersOf } from './folk'
import type { GameState } from './state'
import { seasonOf } from './time'
import type { World } from './world/types'

/**
 * Бой, который хочется смотреть (этап 171).
 *
 * Бой считался честно — строй, приказы, место, усталость, ветераны, — а
 * смотреть его было нечем: раунды шли ровной чередой, и один не отличался от
 * другого. Не видно было, когда сошлись, когда сломалось и когда началась
 * погоня; не видно было, кто дрогнул и кто выстоял.
 *
 * Здесь у боя появляется ход. И снова без новых величин: пора боя выводится из
 * духа и раунда, погода — из дня и времени года, отличившиеся — из книги
 * набора (этап 166). Разбор после боя не хранится: он пересказывает то, что
 * уже лежит в самом бою.
 */

/** Какая сейчас пора боя (Бй1). */
export function phaseOf(battle: Battle): PhaseId {
  if (battle.outcome !== 'ongoing') return 'chase'
  if (battle.round < MELEE.arrayRounds) return 'array'
  if (battle.morale < MELEE.breaks || battle.enemy.morale < MELEE.breaks) return 'break'
  return 'clash'
}

/** Кто дрогнул — свои или чужие. Пусто, пока держатся оба. */
export function brokenSide(battle: Battle): 'own' | 'enemy' | null {
  const own = battle.morale < MELEE.breaks
  const theirs = battle.enemy.morale < MELEE.breaks
  if (own && theirs) return battle.morale <= battle.enemy.morale ? 'own' : 'enemy'
  if (own) return 'own'
  if (theirs) return 'enemy'
  return null
}

/**
 * Какая над полем погода (Бй2).
 *
 * Не бросок: день и время года решают, что за небо над боем. Из одного сейва
 * один и тот же дождь, и это важнее, чем кажется, — погода меняет и конницу, и
 * стрельбу, и то, как быстро люди выматываются.
 */
export function weatherFor(day: number, ground: GroundId = 'open'): WeatherId {
  const season = seasonOf(day)
  const seed = hashOf(`weather|${day}|${ground}`)
  const winter = season === 'winter'
  const spring = season === 'spring'
  const summer = season === 'summer'
  if (winter && (seed % 100) / 100 < MELEE.winterShare) return seed % 3 === 0 ? 'fog' : 'snow'
  if (spring && seed % 3 === 0) return 'mud'
  if (summer && seed % 4 === 0) return 'heat'
  const rest: readonly WeatherId[] = ['clear', 'clear', 'rain', 'fog', 'clear']
  return rest[seed % rest.length] ?? 'clear'
}

/** Насколько эта погода меняет видимость: тем же числом, что туман 0.7 (Бй2). */
export function sightIn(weather: WeatherId): number {
  return WEATHER_DEFS[weather].sight
}

/**
 * Что можно решить прямо сейчас (Бй3).
 *
 * Три-четыре настоящих решения, и у каждого названа цена. Ни одно из них не
 * ново: это те же приказы, что были, — но сказанные так, чтобы выбирать можно
 * было, не считая в уме.
 */
export function battleChoices(
  battle: Battle,
): readonly { readonly id: string; readonly label: string; readonly says: string }[] {
  const ground = GROUNDS[battle.ground ?? 'open']
  const phase = phaseOf(battle)
  const broken = brokenSide(battle)
  const rows: { id: string; label: string; says: string }[] = []
  rows.push({
    id: 'charge',
    label: ORDER_LABELS.charge,
    says:
      phase === 'array'
        ? 'Сойтись сразу: стрелки не успеют отработать, зато и чужие не успеют.'
        : broken === 'enemy'
          ? 'Они поплыли. Удар сейчас решает бой — или доламывает твой строй.'
          : 'Бить в лоб: дороже всего и быстрее всего.',
  })
  rows.push({
    id: 'hold',
    label: ORDER_LABELS.hold,
    says:
      battle.fatigue > battle.enemy.fatigue
        ? 'Держать. Ты устал сильнее — время работает против тебя.'
        : 'Держать: пусть они бьются о строй и выматываются первыми.',
  })
  if (ground.flanks) {
    rows.push({
      id: 'flank',
      label: ORDER_LABELS.flank,
      says: `Обойти: на этом поле фланг есть (${ground.label.toLowerCase()}), и обход стоит вдвое против лобового.`,
    })
  } else {
    rows.push({
      id: 'feint',
      label: ORDER_LABELS.feint,
      says: `Обходить негде (${ground.label.toLowerCase()}): остаётся выманить их на себя.`,
    })
  }
  rows.push({
    id: 'flee',
    label: 'Отступить',
    says: `Уйти: с этого поля уходит ${Math.round(ground.escape * 100)} из ста. ${
      ground.escape < 0.6 ? 'Отход здесь дороже боя.' : 'Уйти можно, и это не позор.'
    }`,
  })
  return rows
}

/** Кто отличился, кто дрогнул и кто выстоял (Бй4). */
export function standouts(
  state: GameState,
  world: World,
  battle: Battle,
  day: number,
): {
  readonly stood: Soldier | null
  readonly broke: Soldier | null
  readonly shone: Soldier | null
  readonly says: string
} {
  const people = [...soldiersOf(state, world, day)]
  if (people.length === 0) {
    return { stood: null, broke: null, shone: null, says: 'В строю некому отличаться.' }
  }
  // Выстоял тот, кто дольше служит; дрогнул новичок; отличился — тот, на кого
  // указал этот бой: число раундов и потерь, а не кубик.
  const byYears = [...people].sort((a, b) => b.years - a.years)
  const stood = byYears[0] ?? null
  const broke = byYears[byYears.length - 1] ?? null
  const seed = hashOf(`shone|${battle.round}|${battle.enemy.name}|${day}`)
  const shone = people[seed % people.length] ?? null
  return {
    stood,
    broke,
    shone,
    says: `Выстоял ${stood?.name} (${stood?.years} г. в строю). Дрогнул ${broke?.name} (${broke?.years} г.). Отличился ${shone?.name}: ${shone?.was}.`,
  }
}

/**
 * Разбор боя (Бй5).
 *
 * Не «вы победили», а почему: что решило место, что погода, где переломилось и
 * чей строй устал раньше. Всё берётся из самого боя.
 */
export function battleReport(
  battle: Battle,
  weather: WeatherId = 'clear',
): { readonly lines: readonly string[]; readonly says: string } {
  const ground = GROUNDS[battle.ground ?? 'open']
  const theirs = unitsSize(battle.enemy.units)
  const ours = groupsSize(battle.groups)
  const lines: string[] = []
  lines.push(
    `${ground.label}: до сшибки доходит по ${ground.frontage} с каждой стороны — ${
      battle.enemyStart > ground.frontage
        ? 'перевес в числе здесь стоил меньше, чем в поле'
        : 'встать успели все'
    }.`,
  )
  lines.push(`${WEATHER_DEFS[weather].label}: ${WEATHER_DEFS[weather].about}`)
  lines.push(
    `Дух: твой ${Math.round(battle.morale)}, их ${Math.round(battle.enemy.morale)}; усталость ${Math.round(battle.fatigue)} против ${Math.round(battle.enemy.fatigue)}.`,
  )
  const broken = brokenSide(battle)
  lines.push(
    broken === null
      ? MELEE_WORDS.held
      : broken === 'enemy'
        ? `${MELEE_WORDS.turned} Они дрогнули на ${battle.round}-м раунде.`
        : `${MELEE_WORDS.turned} Дрогнули твои, на ${battle.round}-м раунде.`,
  )
  lines.push(
    `Осталось: у тебя ${ours}, у них ${theirs} из ${battle.enemyStart}. Ветеранов в строю ${battle.veterans ?? 0}.`,
  )
  return {
    lines,
    says: `${MELEE_WORDS.why}: ${lines.join(' ')}`,
  }
}

/** Ход боя одной строкой: пора и что она значит (Бй1). */
export function phaseSays(battle: Battle): string {
  const phase = phaseOf(battle)
  const def = PHASE_DEFS[phase]
  return `${def.label} (раунд ${battle.round}): ${def.about}`
}

/** Бои в числах (Бй6). */
export function meleeRoll(rows: readonly { readonly outcome: string; readonly rounds: number }[]): {
  readonly fought: number
  readonly won: number
  readonly lost: number
  readonly fled: number
  readonly rounds: number
  readonly says: string
} {
  const won = rows.filter((one) => one.outcome === 'won').length
  const lost = rows.filter((one) => one.outcome === 'lost').length
  const fled = rows.filter((one) => one.outcome === 'fled').length
  const rounds = rows.reduce((sum, one) => sum + one.rounds, 0) / Math.max(1, rows.length)
  return {
    fought: rows.length,
    won,
    lost,
    fled,
    rounds: Math.round(rounds * 10) / 10,
    says: `Боёв ${rows.length}: выиграно ${won}, проиграно ${lost}, ушли ${fled}; средняя длина ${Math.round(rounds * 10) / 10} раундов.`,
  }
}

export { PHASE_DEFS, WEATHER_DEFS, WEATHERS, type PhaseId, type WeatherId }

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}
