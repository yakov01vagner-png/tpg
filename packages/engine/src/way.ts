import { skillLevel } from './character'
import { houseOf } from './chronicle'
import { crownPlaces } from './company'
import {
  WAY,
  WAYS,
  WAY_DEFS,
  WAY_WORDS,
  type WayId,
  type WayMeasure,
  type WayStep,
} from './content/way'
import { vassalsOf } from './court'
import { PLAYER, holdingsOf } from './holding'
import { MIGHT, crownDebtsOf, mightOf } from './lever'
import { rankTier } from './magic'
import { strengthOf } from './mind'
import { reignOf } from './royal'
import type { GameState } from './state'
import { atWar, relationOf } from './war'
import type { World } from './world/types'

/**
 * Путь как состояние мира (этап 130).
 *
 * Цель этапа 70 была личной: она называла, ради чего живёт герой, и отмечалась
 * галочками. Путь — другое: он называет, чем кончится мир, если по нему дойти, и
 * потому меряется состоянием мира, а не делами игрока.
 *
 * Из этого следуют три правила, на которых стоит вся версия. Первое: **ни одной
 * новой величины** — пути считаются землями, присягами, поколениями, деньгами,
 * рангами и признанием, которые в состоянии уже есть. Второе: **одна мерка на
 * всех** — `wayOf` считает корону тем же кодом, что игрока, и отдельного
 * «прогресса ИИ» не существует. Третье: **остаток называется словами** — не «60
 * из 100», а «не признали трое: Робл, Рахим, Лига».
 */

/** Кто идёт: игрок или корона. */
export type Walker = string

export function wayDef(id: WayId) {
  return WAY_DEFS[id]
}

/** Признаёт ли `other` того, кто идёт. Считается из мира, а не из записи. */
export function recognises(
  state: GameState,
  world: World,
  who: Walker,
  other: string,
  day: number,
): boolean {
  if (who === other) return true
  // Воюющий не признаёт: война и есть отказ признать.
  if (atWar(state.politics, who, other)) return false
  // Данник признаёт всегда: он это уже признал деньгами.
  if (state.politics.tributes.some((one) => one.from === other && one.to === who)) return true
  // Четыре двери этапа 131. Родня не признаёт — родня уже родня.
  if (who === PLAYER && (state.marriages ?? []).some((one) => one.kingdomId === other)) return true
  // Союз — это признание на бумаге.
  if (
    (state.treaties ?? []).some(
      (one) =>
        one.kind === 'alliance' &&
        one.brokenBy === undefined &&
        ((one.a === who && one.b === other) || (one.a === other && one.b === who)),
    )
  ) {
    return true
  }
  // И то, что взято договором, дарами или разбитым войском, записано.
  if (who === PLAYER && (state.recognitions?.[other] ?? 0) > 0) return true
  // Признание игрока — его поступок, а не расчёт мира (этап 138, Пр5): он
  // решает сам, и этим двигает чужой путь.
  if (other === PLAYER) {
    if ((state.given?.[who] ?? 0) > 0) return true
    if ((state.hands ?? []).some((one) => one.ward === who && one.patron === PLAYER)) return true
  }
  // Пятая дверь — церковь (этап 138, Пр2): за помазанника говорит не он сам.
  // Проверяется по состоянию, без обращения к слою веры: помазание там и лежит.
  if (who === PLAYER && state.anointed && relationOf(state.politics, who, other) >= -20) {
    return true
  }
  // Пятая дверь — сила без войска (этап 133, Тс3). Ранг, с которым считаются,
  // стоит войска: его считают в чужую силу и спорят с ним вровень, а не в
  // полтора раза сверху. На сильнейших это не действует — на слабых да.
  const reckoned = who === PLAYER && mightOf(state, day).reckoned
  const mine = strengthOf(state, world, who, day).score + (reckoned ? MIGHT.fearWorth : 0)
  const theirs = strengthOf(state, world, other, day).score
  const warm = relationOf(state.politics, who, other) >= -20
  return warm && mine >= theirs * (reckoned ? 1 : 1.5)
}

/** Сколько сторон признало того, кто идёт, и кто не признал (Пт3). */
export function recognisedBySides(
  state: GameState,
  world: World,
  who: Walker,
  day: number,
): { readonly yes: readonly string[]; readonly no: readonly string[] } {
  const yes: string[] = []
  const no: string[] = []
  // Считаются все стороны мира, включая игрока: чужой путь короны идёт и через
  // его признание тоже (этап 138, Пр5).
  const sides =
    who === PLAYER ? Object.keys(world.kingdoms) : [...Object.keys(world.kingdoms), PLAYER]
  for (const side of sides) {
    if (side === who) continue
    if (recognises(state, world, who, side, day)) yes.push(side)
    else no.push(side)
  }
  return { yes, no }
}

/**
 * Сколько у этой стороны того, чем меряется веха (Пт2).
 *
 * Одна функция на всех: где у игрока личное поле, у короны стоит то же самое,
 * выведенное из мира. Чего у короны быть не может — то и не считается: такие
 * пути ей просто закрыты (`forCrowns`).
 */
export function measureFor(
  state: GameState,
  world: World,
  who: Walker,
  measure: WayMeasure,
  day: number,
): number {
  const player = who === PLAYER
  if (measure === 'recognised') return recognisedBySides(state, world, who, day).yes.length
  if (measure === 'places') {
    return player ? holdingsOf(state.settlements, PLAYER).length : crownPlaces(state, who)
  }
  if (measure === 'realm') return player ? (state.realm ? 1 : 0) : 1
  if (measure === 'crowned') return player ? (state.crowned ? 1 : 0) : 1
  if (measure === 'vassals') {
    return player
      ? vassalsOf(state).length
      : state.politics.lords.filter((one) => one.kingdomId === who).length
  }
  if (measure === 'generations') {
    // У игрока колена считает летопись дома, у короны — сменившиеся государи.
    return player ? houseOf(state).length : reignOf(who, day)
  }
  if (measure === 'heir') {
    if (!player) return 1
    return state.house !== undefined && state.character.age >= 0 && hasHeir(state) ? 1 : 0
  }
  if (measure === 'kin') {
    return player
      ? (state.marriages ?? []).length
      : (state.marriages ?? []).filter((one) => one.kingdomId === who).length
  }
  if (measure === 'purse') {
    // Чужая казна не лежит в состоянии: её считают по земле, как в слое знания.
    return player
      ? state.character.money
      : Math.round(strengthOf(state, world, who, day).places * 420)
  }
  if (measure === 'ventures') return player ? state.enterprises.length : 0
  if (measure === 'debtors') {
    // Короны в долгу у тебя: дань в твою пользу — тот же долг, только признанный,
    // а заём (этап 133) — долг названный, и считаются они вместе.
    const paying = state.politics.tributes.filter((one) => one.to === who).map((one) => one.from)
    const owing = player ? crownDebtsOf(state).map((one) => one.kingdomId) : []
    return new Set([...paying, ...owing]).size
  }
  if (measure === 'magicRank') return player ? rankTier(state.character.magicRank) : 0
  if (measure === 'magicSkill') return player ? skillLevel(state.character, 'magic') : 0
  if (measure === 'artifacts') return player ? (state.artifacts ?? []).length : 0
  if (measure === 'piety') return player ? (state.piety ?? 0) : 0
  if (measure === 'churchCalm') {
    if (!player) return 1
    return (state.churchAnger ?? 0) < 20 && !state.censure ? 1 : 0
  }
  if (measure === 'crusade') {
    return player ? (state.quests.some((one) => one.id.includes('crusade')) ? 1 : 0) : 0
  }
  return 0
}

function hasHeir(state: GameState): boolean {
  return state.house !== undefined && (state.marriages ?? []).length + houseOf(state).length > 0
}

export interface WayStepState {
  readonly step: WayStep
  readonly have: number
  readonly done: boolean
  readonly says: string
}

export interface WayState {
  readonly way: WayId
  readonly who: Walker
  /** Сколько вех пройдено из всех. */
  readonly done: number
  readonly of: number
  /** Доля пройденного, 0..1. */
  readonly share: number
  readonly steps: readonly WayStepState[]
  /** Что осталось — названное словами, а не числом (Пт3). */
  readonly left: readonly string[]
  readonly finished: boolean
  readonly says: string
}

/**
 * Где эта сторона на этом пути (Пт1).
 *
 * Считает и игрока, и корону. Ничего не хранит: состояние пути целиком
 * выводится из состояния мира на этот день.
 */
export function wayOf(
  state: GameState,
  world: World,
  who: Walker,
  way: WayId,
  day: number,
): WayState {
  const def = WAY_DEFS[way]
  const steps = def.steps.map((step) => {
    const have = measureFor(state, world, who, step.measure, day)
    const done = have >= step.need
    return {
      step,
      have,
      done,
      says: done ? `${step.label}: есть` : `${step.label}: ${have} из ${step.need} — ${step.about}`,
    }
  })
  const done = steps.filter((one) => one.done).length
  const left = steps.filter((one) => !one.done).map((one) => one.says)
  // Остаток по признанию называется именами, а не числом.
  const recognition = steps.find((one) => one.step.measure === 'recognised' && !one.done)
  if (recognition) {
    const missing = recognisedBySides(state, world, who, day).no
    const names = missing.map((side) => world.kingdoms[side]?.name ?? side)
    left[left.indexOf(recognition.says)] =
      `не признали ${missing.length}: ${names.join(', ')} — ${recognition.step.about}`
  }
  // Доля считается не вехами, а тем, сколько набрано в каждой: корона,
  // которую признали семеро из восьми, ближе к концу той, которую не признал
  // никто, — а по вехам обе одинаковы (этап 135 меряет страх этой долей).
  const share =
    Math.round(
      (steps.reduce((sum, one) => sum + Math.min(1, one.have / Math.max(1, one.step.need)), 0) /
        steps.length) *
        100,
    ) / 100
  const finished = done === steps.length
  return {
    way,
    who,
    done,
    of: steps.length,
    share,
    steps,
    left,
    finished,
    says: finished
      ? `${def.label}: ${WAY_WORDS.done} ${def.ends}.`
      : `${def.label}: пройдено ${done} из ${steps.length}. ${WAY_WORDS.left} ${left.join('; ')}.`,
  }
}

/** Все пути этой стороны, от самого пройденного к самому далёкому. */
export function waysOf(
  state: GameState,
  world: World,
  who: Walker,
  day: number,
): readonly WayState[] {
  const open = WAYS.filter((id) => who === PLAYER || WAY_DEFS[id].forCrowns)
  return open.map((id) => wayOf(state, world, who, id, day)).sort((a, b) => b.share - a.share)
}

/**
 * Путь начат, если сделан вход в него.
 *
 * Первая веха каждого пути — это дверь: держава, четыре дела, магия
 * семидесятой, благочестие. Пока дверь не пройдена, случайно совпавшая веха
 * («церковь не в гневе» бывает и у нищего) путём не считается.
 */
export function wayStarted(one: WayState): boolean {
  return (one.steps[0]?.done ?? false) && one.done >= WAY.startedAt
}

/** Тот путь, по которому эта сторона зашла дальше всех — из начатых. */
export function nearestWay(
  state: GameState,
  world: World,
  who: Walker,
  day: number,
): WayState | null {
  return waysOf(state, world, who, day).find(wayStarted) ?? null
}

/** Чем этот путь платится (Пт4). */
export function waySays(def: (typeof WAY_DEFS)[WayId]): string {
  return `${def.label}: ${def.about} Конец — «${def.ends}». ${WAY_WORDS.costs} ${def.costs}.`
}

/**
 * Два пути разом (Пт5).
 *
 * Идти можно по двум, и это не запрещено — но часть дел годится только для
 * одного, и потому оба идут медленнее. Здесь это названо числом: насколько
 * медленнее и из-за чего именно.
 */
export function bothWays(
  state: GameState,
  world: World,
  who: Walker,
  first: WayId,
  second: WayId,
  day: number,
): {
  readonly slower: number
  readonly shared: readonly string[]
  readonly says: string
} {
  const a = WAY_DEFS[first]
  const b = WAY_DEFS[second]
  const shared = a.steps
    .filter((one) => b.steps.some((two) => two.measure === one.measure))
    .map((one) => one.label)
  // Общие вехи идут в зачёт обоим; своих у каждого тем больше, тем дороже разом.
  const own = a.steps.length + b.steps.length - shared.length * 2
  const slower = Math.round((1 - (shared.length * 2) / (own + shared.length * 2)) * 100) / 100
  return {
    slower,
    shared,
    says:
      shared.length === 0
        ? `${a.label} и ${b.label} не сходятся ни в одной вехе: все дела годятся только для одного. ${WAY_WORDS.both}`
        : `${a.label} и ${b.label} сходятся в ${shared.length}: ${shared.join(', ')}. Прочие ${Math.round(slower * 100)} из ста дел годятся только для одного — на столько оба и медленнее.`,
  }
}

export { WAY, WAY_DEFS, WAY_WORDS, WAYS, type WayId, type WayMeasure }
