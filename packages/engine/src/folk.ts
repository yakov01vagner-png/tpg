import { FOLK, FOLK_BYNAMES, FOLK_FEARS, FOLK_GIVEN, FOLK_WAS, FOLK_WORDS } from './content/folk'
import { TROOPS, type TroopId } from './content/troops'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Отряд из людей (этап 166).
 *
 * Отряд был строкой «копейщиков 12»: двенадцать одинаковых чисел, которые
 * нельзя потерять по имени и нельзя вспомнить. В игре про людей это самая
 * дорогая бедность — всё, что вокруг человека, считается честно, а человека
 * нет.
 *
 * Людей здесь не заводят: их **выводят**. В состоянии лежит только книга
 * набора — кого, где и когда ты взял, — а имя, годы, прошлое, страх, выслуга и
 * привычка к командиру считаются из неё. Оттого сейв не растёт от числа людей,
 * и двенадцать копейщиков остаются двенадцатью числами там, где на них никто
 * не смотрит.
 */

/** Запись набора: сколько людей взято, где и когда. */
export interface Enlist {
  readonly id: string
  readonly troop: TroopId
  readonly count: number
  /** Где набраны. Пусто — пришли сами. */
  readonly from: string | null
  readonly sinceDay: number
}

/** Человек в отряде. Считается, а не хранится. */
export interface Soldier {
  readonly id: string
  readonly name: string
  readonly troop: TroopId
  readonly age: number
  readonly from: string | null
  /** Кем он был до отряда. */
  readonly was: string
  /** Чего боится. */
  readonly fears: string
  /** Сколько лет служит. */
  readonly years: number
  /** Усталость от походов, 0..1. */
  readonly weary: number
  /** Насколько прикипел к командиру, 0..1. */
  readonly bond: number
  readonly says: string
}

/** Имя, которое помнят: павший или ушедший. */
export interface Remembered {
  readonly name: string
  readonly troop: TroopId
  readonly day: number
  readonly where: string | null
  readonly how: 'fell' | 'left'
}

export function rollOf(state: Pick<GameState, 'roll'>): readonly Enlist[] {
  // В состоянии род войск лежит строкой (там нельзя ссылаться на содержимое):
  // здесь он снова становится родом войск.
  return (state.roll ?? []) as readonly Enlist[]
}

export function rememberedOf(state: Pick<GameState, 'graves'>): readonly Remembered[] {
  return (state.graves ?? []) as readonly Remembered[]
}

/** Кто этот человек (От1, От2). Выводится из записи набора и его места в ней. */
export function soldierIn(
  group: Enlist,
  index: number,
  day: number,
  back: readonly Remembered[] = [],
): Soldier {
  const seed = hashOf(`${group.id}|${index}`)
  // Разные вещи берутся из разных зёрен: на одном числе прошлое и страх
  // ложились полосами, и половина отряда боялась одного и того же.
  const other = hashOf(`${group.id}|${index}|был`)
  const third = hashOf(`${group.id}|${index}|боится`)
  // Вернувшийся приходит под своим именем: отряд помнит, кто уходил (От5).
  const same = back[index]
  const name =
    same?.name ??
    `${FOLK_GIVEN[seed % FOLK_GIVEN.length]} ${FOLK_BYNAMES[(other >>> 3) % FOLK_BYNAMES.length]}`
  const years = Math.max(0, (day - group.sinceDay) / 365)
  const age = Math.round(17 + ((seed >>> 3) % 24) + years)
  const weary = Math.min(1, years / FOLK.wearyYears)
  const bond = Math.min(1, years / FOLK.bondYears)
  const was = FOLK_WAS[other % FOLK_WAS.length] ?? FOLK_WAS[0] ?? ''
  const fears = FOLK_FEARS[third % FOLK_FEARS.length] ?? FOLK_FEARS[0] ?? ''
  return {
    id: `${group.id}#${index}`,
    name,
    troop: group.troop,
    age,
    from: group.from,
    was,
    fears,
    years: Math.round(years * 10) / 10,
    weary: Math.round(weary * 100) / 100,
    bond: Math.round(bond * 100) / 100,
    says: `${name}, ${age} лет, ${TROOPS[group.troop].label.toLowerCase()}: ${was}. Боится ${fears}. В отряде ${Math.round(years * 10) / 10} г.`,
  }
}

/** Весь отряд поимённо (От1). */
export function soldiersOf(state: GameState, world: World, day: number): readonly Soldier[] {
  const back = rememberedOf(state).filter((one) => one.how === 'left')
  const people: Soldier[] = []
  for (const group of rollOf(state)) {
    const theirs = back.filter(
      (one) =>
        one.troop === group.troop &&
        one.where !== null &&
        one.where === group.from &&
        group.sinceDay - one.day <= FOLK.returns,
    )
    for (let i = 0; i < group.count; i += 1) people.push(soldierIn(group, i, day, theirs))
  }
  return people
}

/**
 * Свести книгу набора с числами отряда (От1, От3).
 *
 * Числа остаются правдой: сколько в отряде копейщиков, знает `party.units`, и
 * весь бой считается ими. Книга только следует за числами — прибыло, значит
 * набрали; убыло, значит кого-то не стало, и этот кто-то назван. Убывает
 * сперва последний набранный: старый в отряде дольше и живучее новичка.
 */
export function syncRoll(
  roll: readonly Enlist[],
  units: Readonly<Partial<Record<TroopId, number>>>,
  day: number,
  where: string | null,
  how: 'fell' | 'left',
): { readonly roll: readonly Enlist[]; readonly gone: readonly Remembered[] } {
  let rows = [...roll]
  const gone: Remembered[] = []
  const troops = new Set<TroopId>([
    ...rows.map((one) => one.troop),
    ...(Object.keys(units) as TroopId[]),
  ])
  for (const troop of troops) {
    const want = units[troop] ?? 0
    const mine = rows.filter((one) => one.troop === troop)
    const have = mine.reduce((sum, one) => sum + one.count, 0)
    if (want === have) continue
    if (want > have) {
      rows.push({
        id: `roll:${troop}:${day}:${have}:${where ?? 'нигде'}`,
        troop,
        count: want - have,
        from: where,
        sinceDay: day,
      })
      continue
    }
    let lose = have - want
    for (let i = rows.length - 1; i >= 0 && lose > 0; i -= 1) {
      const group = rows[i]
      if (!group || group.troop !== troop) continue
      const taken = Math.min(lose, group.count)
      for (let k = 0; k < taken; k += 1) {
        const person = soldierIn(group, group.count - 1 - k, day)
        gone.push({ name: person.name, troop, day, where, how })
      }
      lose -= taken
      rows =
        group.count - taken > 0
          ? rows.map((one, at) => (at === i ? { ...one, count: group.count - taken } : one))
          : rows.filter((_, at) => at !== i)
    }
  }
  return { roll: rows, gone }
}

/** Помнить столько имён, сколько помнит отряд, и не больше. */
export function rememberNames(
  graves: readonly Remembered[],
  gone: readonly Remembered[],
): readonly Remembered[] {
  return [...graves, ...gone].slice(-FOLK.remembers)
}

/**
 * Кому с тобой не по пути (От5).
 *
 * Уходят не случайно: по деньгам (жалованье не плачено), по усталости и по
 * годам. Держит привычка к командиру: тот, кто с тобой давно, уходит последним.
 */
export function whoLeaves(state: GameState, world: World, day: number): readonly Soldier[] {
  const hungry = state.party.hungryDays ?? 0
  const unpaid = hungry >= FOLK.patience
  // Бегство от голода и безденежья считается своим счётом (побег при низком
  // духе, 0.2): здесь уходят не от отчаяния, а по-человечески — надоело,
  // состарился, не платят. Оттого доля за деньги мала и не растёт без края.
  const scared = state.party.morale < FOLK.afraidBelow
  return soldiersOf(state, world, day).filter((one) => {
    const wants =
      (unpaid ? FOLK.unpaidLeaves : 0) +
      (scared ? FOLK.afraidLeaves : 0) +
      one.weary * FOLK.wearyLeaves +
      (one.age >= FOLK.oldAt ? FOLK.oldLeaves : 0)
    return wants - one.bond * FOLK.bondHolds >= 0.5
  })
}

/** Отряд в числах (От6). */
export function folkRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly men: number
  readonly oldest: Soldier | null
  readonly longest: Soldier | null
  readonly fell: number
  readonly left: number
  readonly says: string
} {
  const people = [...soldiersOf(state, world, day)]
  const remembered = rememberedOf(state)
  const fell = remembered.filter((one) => one.how === 'fell').length
  const left = remembered.filter((one) => one.how === 'left').length
  const oldest = [...people].sort((a, b) => b.age - a.age)[0] ?? null
  const longest = [...people].sort((a, b) => b.years - a.years)[0] ?? null
  return {
    men: people.length,
    oldest,
    longest,
    fell,
    left,
    says:
      people.length === 0
        ? `В отряде никого. Помнят ${remembered.length}: пало ${fell}, ушло ${left}.`
        : `${FOLK_WORDS.named} В отряде ${people.length}; дольше всех — ${longest?.name} (${longest?.years} г.), старше всех — ${oldest?.name} (${oldest?.age}). Помнят ${remembered.length}: пало ${fell}, ушло ${left}.`,
  }
}

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}
