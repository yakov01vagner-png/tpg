import { type BattleSide, type Units, resolveRound, startBattle, unitsSize } from './battle'
import type { GroupId, OrderId } from './battle'
import { WAR_MAGES } from './content/lore'
import type { TroopId } from './content/troops'
import type { Settlement } from './economy'
import { takeLand } from './holding'
import { ARMY_PACE, legHoursFor } from './journey'
import type { Party } from './party'
import { type Rng, nextFloat, nextInt, rollChance } from './rng'
import type { Season } from './time'
import { seasonOf } from './time'
import type { Lord, Politics } from './war'
import { atWar, isRebel } from './war'
import { neighbourSettlements, roadsFrom } from './world/queries'
import { fordShut, isFlood } from './world/rivers'
import type { Terrain, World } from './world/types'

/**
 * Дружина на карте.
 *
 * До этого войну считал кубик: раз в сутки бросок, и где-то в мире «случалось
 * разорение». Прогон на сто лет показал, чем это кончается — набеги убили
 * больше людей, чем живёт в мире, и не изменили ничего, потому что войну некому
 * было вести, а землю некому отнять. Здесь войско становится вещью, которая
 * стоит в определённом месте, идёт по дорогам с той же скоростью, что и игрок,
 * и до цели доходит не сразу.
 *
 * Отряд — сериализуемые данные, как и всё в состоянии. Решения принимаются в
 * такте мира и только из того, что в мире видно.
 */
export type BandGoal =
  /** Стоит дома, собирает людей. */
  | { readonly type: 'muster' }
  /** Идёт разорять чужое. */
  | { readonly type: 'raid'; readonly targetId: string }
  /** Идёт брать место осадой. */
  | { readonly type: 'siege'; readonly targetId: string }
  /** Идёт оборонять своё. */
  | { readonly type: 'defend'; readonly targetId: string }
  /** Идёт бить мятежника: у мятежа должен быть не только вход. */
  | { readonly type: 'crush'; readonly targetId: string; readonly lordId: string }
  /** Возвращается домой. Без этого войско грабит без передышки и без обоза. */
  | { readonly type: 'home'; readonly targetId: string }

export interface Band {
  readonly id: string
  readonly lordId: string
  /** Кому служит. Пусто — мятежник. */
  readonly kingdomId: string | null
  readonly units: Units
  readonly morale: number
  /** Где стоит. Если идёт — откуда вышел. */
  readonly locationId: string
  /** Путь до соседнего места: часы, а не телепорт. */
  readonly travel: { readonly toLocationId: string; readonly hoursLeft: number } | null
  readonly goal: BandGoal
  /** Сколько суток стоит под стенами. */
  readonly siegeDays: number
}

export type BandEvent =
  | {
      readonly type: 'bandRaid'
      readonly bandId: string
      readonly locationId: string
      readonly lost: number
    }
  | { readonly type: 'bandSiege'; readonly bandId: string; readonly locationId: string }
  | { readonly type: 'bandTook'; readonly bandId: string; readonly locationId: string }
  | {
      readonly type: 'bandClash'
      readonly locationId: string
      readonly winner: string
      readonly loser: string
      readonly fallen: number
    }
  | { readonly type: 'bandBroken'; readonly bandId: string; readonly lordId: string }
  | { readonly type: 'lordSubmits'; readonly lordId: string; readonly kingdomId: string }
  | { readonly type: 'lordFell'; readonly lordId: string }

export interface BandResult {
  readonly bands: readonly Band[]
  readonly settlements: Readonly<Record<string, Settlement>>
  readonly politics: Politics
  readonly rng: Rng
  readonly events: readonly BandEvent[]
}

/** Сколько суток осады нужно, прежде чем идти на приступ. */
export const SIEGE_DAYS = 12

/**
 * Кто встанет на стены.
 *
 * Место защищает себя само: гарнизон, если он есть, плюс ополчение от числа
 * жителей. Без этого столица в двадцать тысяч душ падала от сорока человек —
 * за двадцать лет земля меняла хозяина сто пятьдесят раз.
 */
export function defendersOf(settlement: Settlement): Units {
  const levy = Math.floor(settlement.population / 260)
  const units: Partial<Record<TroopId, number>> = {}
  for (const [troop, count] of Object.entries(settlement.garrison)) {
    if (count) units[troop as TroopId] = count
  }
  if (levy > 0) units.militia = (units.militia ?? 0) + levy
  return units
}
/** С какой вероятностью дружина добирает дома человека за сутки. */
const MUSTER_CHANCE = 0.6
/**
 * С какой вероятностью стоящее дома войско надумает выступить за сутки.
 *
 * При 0.12 выходило по походу на дружину каждые восемь дней: за век мир видел
 * шестьсот взятых городов и три с половиной тысячи разорений — война без
 * передышки. Раз в месяц — это уже война, а не погода.
 */
const CAMPAIGN_CHANCE = 0.03

/**
 * Сезон войны (этап 39).
 *
 * В поход выступают по сроку, а не когда выпало: весной, как только сошла вода
 * и подрос конь, — чаще всего; летом идут; осенью уже редко — впереди
 * распутица и жатва, которую войску надо успеть отнять или защитить. Зима стоит
 * (этап 38), и здесь она ноль только для порядка.
 */
const CAMPAIGN_SEASON: Record<Season, number> = {
  spring: 1.8,
  summer: 1.1,
  autumn: 0.5,
  winter: 0,
}

export function bandSize(band: Band): number {
  return unitsSize(band.units)
}

export function bandStrength(band: Band): number {
  return Math.round(bandSize(band) * (0.5 + band.morale / 200))
}

/** Место, из которого лорд водит дружину: самое людное из его владений. */
export function seatOf(
  settlements: Readonly<Record<string, Settlement>>,
  lordId: string,
): string | null {
  let best: string | null = null
  let most = -1
  for (const [id, settlement] of Object.entries(settlements)) {
    if (settlement.owner !== lordId) continue
    if (settlement.population > most) {
      most = settlement.population
      best = id
    }
  }
  return best
}

/** Дружины по числу лордов: у каждого держателя земли своё войско. */
export function musterBands(
  politics: Politics,
  settlements: Readonly<Record<string, Settlement>>,
  rng: Rng,
): [readonly Band[], Rng] {
  let generator = rng
  const bands: Band[] = []

  // Рать короны. Век без неё показал, чем это кончается: когда вассалы уходят в
  // мятеж один за другим, унимать их становится некому, и к сотому году
  // двенадцать владетелей из четырнадцати сидели в мятеже, держа все 62 места.
  // У короля должны быть свои люди, а не только чужие.
  for (const kingdomId of Object.keys(politics.archmages)) {
    const crown = `crown:${kingdomId}`
    const seat = seatOf(settlements, crown)
    if (!seat) continue
    let people = 0
    for (const settlement of Object.values(settlements)) {
      if (settlement.owner === crown) people += settlement.population
    }
    const [units, next] = retinue(
      Math.max(12, Math.round(people / 55)),
      generator,
      magesFor(politics, kingdomId),
    )
    generator = next
    bands.push({
      id: `band:${crown}`,
      lordId: crown,
      kingdomId,
      units,
      morale: 70,
      locationId: seat,
      travel: null,
      goal: { type: 'muster' },
      siegeDays: 0,
    })
  }

  for (const lord of politics.lords) {
    const seat = seatOf(settlements, lord.id)
    if (!seat) continue
    const [units, next] = retinue(lord.strength, generator, magesFor(politics, lord.kingdomId))
    generator = next
    bands.push({
      id: `band:${lord.id}`,
      lordId: lord.id,
      kingdomId: lord.kingdomId,
      units,
      morale: 65,
      locationId: seat,
      travel: null,
      goal: { type: 'muster' },
      siegeDays: 0,
    })
  }
  return [bands, generator]
}

/**
 * Состав дружины по силе лорда: от ополчения до латников.
 *
 * С версии 0.6 (этап 60, А2) в строю бывает круг: когда архимаг короны при
 * войске, с дружинами идут маги, и это видно по потерям — не в описании, а в
 * отчёте века.
 */
export function retinue(strength: number, rng: Rng, mages = 0): [Units, Rng] {
  const [roll, next] = nextFloat(rng)
  const size = Math.max(6, Math.round(strength * (0.7 + roll * 0.6)))
  const units: Partial<Record<TroopId, number>> = {
    militia: Math.max(1, Math.round(size * 0.4)),
    spearman: Math.max(1, Math.round(size * 0.3)),
    archer: Math.max(1, Math.round(size * 0.2)),
    manAtArms: Math.max(1, Math.round(size * 0.1)),
  }
  if (mages > 0) units.mage = mages
  return [units, next]
}

/** Сколько магов даёт корона этой дружине: столько, сколько привёл архимаг. */
export function magesFor(politics: Politics, kingdomId: string | null): number {
  if (!kingdomId) return 0
  return politics.archmages[kingdomId]?.deed === 'war' ? WAR_MAGES : 0
}

/**
 * Следующий шаг по дороге к цели. Дорог мало, поиск дешёвый.
 *
 * День нужен из-за половодья: весной брод под водой, и войско обходит его так
 * же, как обходит герой (rivers.ts). Без дня — время неизвестно, и река не
 * разливается: так ходят тесты и старые вызовы.
 */
export function nextHop(
  world: World,
  fromId: string,
  toId: string,
  day: number | null = null,
): string | null {
  if (fromId === toId) return null
  // Дерево шагов к цели помнится (этап 48): дружин сотня, и каждая каждые
  // сутки искала путь заново — обход мира ради одного шага стоил шестой части
  // такта. Обход от цели даёт шаг к ней из любого места разом; зависит он
  // только от мира и от того, стоит ли половодье. Мир неизменен, пока его не
  // пополнили, — а тогда и память новая.
  const flood = day !== null && isFlood(day) ? '~' : ''
  const key = `${toId}${flood}`
  let memo = trees.get(world)
  if (!memo) {
    memo = new Map()
    trees.set(world, memo)
  }
  let tree = memo.get(key)
  if (!tree) {
    tree = towards(world, toId, day)
    memo.set(key, tree)
  }
  return tree.get(fromId) ?? null
}

const trees = new WeakMap<World, Map<string, Map<string, string>>>()

/**
 * Шаг к цели из каждого места: обход в ширину от самой цели. Дороги
 * двусторонние, поэтому кратчайший путь туда — это кратчайший путь оттуда.
 * Брод под водой не проходят ни в ту, ни в другую сторону.
 */
function towards(world: World, toId: string, day: number | null): Map<string, string> {
  const next = new Map<string, string>()
  const queue = [toId]
  const seen = new Set([toId])
  while (queue.length > 0) {
    const current = queue.shift() as string
    for (const road of roadsFrom(world, current)) {
      if (seen.has(road.to)) continue
      if (fordShut(world, road.to, day)) continue
      seen.add(road.to)
      next.set(road.to, current)
      queue.push(road.to)
    }
  }
  return next
}

/** Сколько переходов до каждого места. Один обход на решение, а не по обходу на цель. */
/**
 * Докуда войско вообще смотрит.
 *
 * Меряется сутками пути, а не переходами. Двенадцать переходов было мерой
 * прежнего мира: в нём отрезок занимал полдня, и дюжина шагов складывалась в
 * неделю марша. С версии 0.4 между поселениями лежит земля, отрезок стоит
 * три-четыре часа, и те же двенадцать шагов стали двумя сутками — войска
 * перестали находить друг друга. За век это видно числом: набегов 962 вместо
 * 3496 при том же числе объявленных войн. Десять суток марша — это и есть
 * расстояние, на которое сосед ходит воевать.
 */
const MAX_MARCH_HOURS = 240

function distancesFrom(world: World, fromId: string, limit = MAX_MARCH_HOURS): Map<string, number> {
  // Дейкстра по часам: дорога через горы дальше, чем та же дорога по равнине,
  // и войско это чувствует.
  const distance = new Map<string, number>([[fromId, 0]])
  const queue: string[] = [fromId]
  while (queue.length > 0) {
    let bestIndex = 0
    for (let i = 1; i < queue.length; i += 1) {
      if (
        (distance.get(queue[i] as string) ?? 0) < (distance.get(queue[bestIndex] as string) ?? 0)
      ) {
        bestIndex = i
      }
    }
    const current = queue.splice(bestIndex, 1)[0] as string
    const spent = distance.get(current) ?? 0
    for (const road of roadsFrom(world, current)) {
      const reached = spent + road.hours
      if (reached > limit) continue
      const known = distance.get(road.to)
      if (known !== undefined && known <= reached) continue
      distance.set(road.to, reached)
      queue.push(road.to)
    }
  }
  return distance
}

/** Часы отрезка для войска: то же правило, что у героя (journey.ts). */
function hoursTo(world: World, fromId: string, toId: string, day: number | null): number {
  const road = roadsFrom(world, fromId).find((candidate) => candidate.to === toId)
  return legHoursFor(road?.hours ?? 12, ARMY_PACE, day === null ? null : seasonOf(day))
}

/** Какая доля уведённых не гибнет, а уходит к соседям. */
const FLEE_SHARE = 0.4

/** Ближайшее место с людьми: туда и бегут с пепелища. */
function nearestSettlement(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  fromId: string,
): string | null {
  for (const near of neighbourSettlements(world, fromId, 4)) {
    const place = settlements[near.id]
    if (place && place.population > 0) return near.id
  }
  return null
}

/**
 * Кто сейчас на этом отрезке дороги.
 *
 * Отрезок — это не точка: на нём стоят те, кто задержался на его концах, и идут
 * те, кто идёт по нему в любую сторону. С версии 0.4 по дорогам ходят все
 * одинаково, поэтому встретиться можно не только в деревне — и перехватить
 * войско можно до того, как оно дошло.
 */
export function bandsOnLeg(bands: readonly Band[], fromId: string, toId: string): readonly Band[] {
  return bands.filter((band) => {
    if (band.travel) {
      const ends = [band.locationId, band.travel.toLocationId]
      return ends.includes(fromId) && ends.includes(toId)
    }
    return band.locationId === fromId || band.locationId === toId
  })
}

/** Дорога к мёртвому месту зарастает: идти туда вдвое дольше. */
export const OVERGROWN = 2

export function roadHours(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  fromId: string,
  toId: string,
): number {
  const road = roadsFrom(world, fromId).find((candidate) => candidate.to === toId)
  const base = road?.hours ?? 12
  return (settlements[toId]?.population ?? 1) <= 0 ? base * OVERGROWN : base
}

// --- выбор цели -------------------------------------------------------------

/**
 * Куда идти.
 *
 * Решение выводится из того, что в мире видно, а не из отдельного «плана ИИ»:
 * воюет ли моя корона, есть ли рядом чужое, стоит ли враг на моей земле, есть
 * ли мятежник, которого корона обязана унять. Поэтому одни и те же правила
 * годятся и мятежнику, и верному лорду.
 */
function chooseGoal(
  world: World,
  politics: Politics,
  settlements: Readonly<Record<string, Settlement>>,
  bands: readonly Band[],
  band: Band,
  rng: Rng,
): [BandGoal, Rng] {
  const lord = politics.lords.find((candidate) => candidate.id === band.lordId)
  const crownOf = band.lordId.startsWith('crown:') ? band.kingdomId : (lord?.kingdomId ?? null)
  if (!lord && !band.lordId.startsWith('crown:')) return [{ type: 'muster' }, rng]

  // Своё под ударом — идём домой. Оборона важнее добычи.
  const threatened = bands.find(
    (other) =>
      other.id !== band.id &&
      hostile(politics, band, other) &&
      settlements[other.locationId]?.owner === band.lordId,
  )
  if (threatened) return [{ type: 'defend', targetId: threatened.locationId }, rng]

  // Мятеж унимают в первую очередь: иначе мятежник сидит на земле вечно.
  if (crownOf) {
    const rebels = politics.lords.filter(
      (candidate) => isRebel(candidate) && atWar(politics, crownOf, candidate.id),
    )
    for (const rebel of rebels) {
      const seat = seatOf(settlements, rebel.id)
      if (seat) return [{ type: 'crush', targetId: seat, lordId: rebel.id }, rng]
    }
  }

  // Войско не ходит через весь мир за добычей: воюют с соседом.
  const reach = distancesFrom(world, band.locationId)
  const enemies = enemyPlaces(world, politics, settlements, band)
    .filter((id) => reach.has(id))
    .sort((a, b) => (reach.get(a) ?? 99) - (reach.get(b) ?? 99))
    .slice(0, 5)
  if (enemies.length === 0) return [{ type: 'muster' }, rng]

  const [index, afterIndex] = nextInt(rng, 0, enemies.length - 1)
  const target = enemies[index] ?? enemies[0]
  if (!target) return [{ type: 'muster' }, afterIndex]

  // Большая дружина берёт место осадой, малая — грабит и уходит.
  const [wantsSiege, afterRoll] = rollChance(afterIndex, bandSize(band) > 24 ? 0.45 : 0.12)
  return [{ type: wantsSiege ? 'siege' : 'raid', targetId: target }, afterRoll]
}

/** Чужие места, до которых есть дорога: цели для похода. */
function enemyPlaces(
  world: World,
  politics: Politics,
  settlements: Readonly<Record<string, Settlement>>,
  band: Band,
): readonly string[] {
  const found: string[] = []
  for (const [id, settlement] of Object.entries(settlements)) {
    if (settlement.population <= 0) continue
    const owner = settlement.owner
    if (owner === band.lordId) continue
    // Ничья земля — цель для всякого, и войны для этого не нужно: пограничье
    // тем и живёт, что его всё время пробуют на зуб. Пока ничьё пропускали,
    // марка была заповедником, в который никто не ходил.
    if (!owner) {
      found.push(id)
      continue
    }
    const side = sideOf(politics, owner)
    if (side === null) continue
    if (!hostileSides(politics, band.kingdomId ?? band.lordId, side)) continue
    found.push(id)
  }
  return found
}

/** К какой стороне принадлежит держатель: корона, королевство лорда или он сам. */
function sideOf(politics: Politics, owner: string): string | null {
  if (owner.startsWith('crown:')) return owner.slice('crown:'.length)
  const lord = politics.lords.find((candidate) => candidate.id === owner)
  if (!lord) return owner
  return lord.kingdomId ?? lord.id
}

function hostileSides(politics: Politics, a: string, b: string): boolean {
  if (a === b) return false
  return atWar(politics, a, b)
}

function hostile(politics: Politics, a: Band, b: Band): boolean {
  const first = a.kingdomId ?? a.lordId
  const second = b.kingdomId ?? b.lordId
  return hostileSides(politics, first, second)
}

// --- стычка -----------------------------------------------------------------

/**
 * Бой двух дружин без игрока.
 *
 * Считается тем же движком, что и бой игрока (`battle.ts`), иначе мир разойдётся
 * на две ветки — ту, что для ИИ, и ту, что для игрока, — и числа этапа 4
 * перестанут что-либо значить. Приказы простые: строй держит, лучники стреляют,
 * фланг заходит. Лорд — не игрок, тонко он не воюет.
 */
const AI_ORDERS: Record<GroupId, OrderId> = {
  vanguard: 'charge',
  archers: 'shoot',
  flank: 'flank',
  reserve: 'hold',
  mages: 'fireball',
}

export interface ClashResult {
  readonly attacker: Units
  readonly defender: Units
  readonly attackerWon: boolean
  readonly fallen: number
  readonly rng: Rng
}

export function clash(
  attacker: Band,
  defender: Band,
  terrain: Terrain,
  wallBonus: number,
  rng: Rng,
): ClashResult {
  const party: Party = {
    units: attacker.units,
    morale: attacker.morale,
    hungryDays: 0,
    gear: 0.3,
  }
  const enemy: BattleSide = {
    name: defender.id,
    units: defender.units,
    morale: defender.morale,
    fatigue: 0,
  }
  let battle = startBattle(party, enemy, terrain, { wallBonus })
  let generator = rng
  const before = bandSize(attacker) + bandSize(defender)

  // Предел раундов: бой без победителя всё равно кончается — обе стороны
  // расходятся обескровленными.
  for (let round = 0; round < 12 && battle.outcome === 'ongoing'; round += 1) {
    const result = resolveRound(battle, AI_ORDERS, { command: 3, magic: 0, gear: 0.3 }, generator)
    battle = result.battle
    generator = result.rng
  }

  const attackerUnits = unformUpUnits(battle.groups)
  const defenderUnits = battle.enemy.units
  const after = unitsSize(attackerUnits) + unitsSize(defenderUnits)
  return {
    attacker: attackerUnits,
    defender: defenderUnits,
    attackerWon: battle.outcome === 'won',
    fallen: Math.max(0, before - after),
    rng: generator,
  }
}

function unformUpUnits(groups: Readonly<Record<GroupId, Units>>): Units {
  const units: Partial<Record<TroopId, number>> = {}
  for (const group of Object.values(groups)) {
    for (const [troop, count] of Object.entries(group)) {
      if (!count) continue
      units[troop as TroopId] = (units[troop as TroopId] ?? 0) + count
    }
  }
  return units
}

// --- такт мира --------------------------------------------------------------

/**
 * Сутки дружин.
 *
 * Порядок внутри суток важен и одинаков всегда, иначе из одного сейва выйдут
 * разные миры: сначала все, кто в пути, делают шаг; потом те, кто дошёл,
 * дерутся; потом стоящие на месте делают своё дело; и только потом бездельники
 * выбирают новую цель.
 */
export function tickBands(
  world: World,
  politics: Politics,
  settlements: Readonly<Record<string, Settlement>>,
  bands: readonly Band[],
  rng: Rng,
  day: number | null = null,
): BandResult {
  let generator = rng
  let places = settlements
  let lords = politics.lords
  let wars = politics.wars
  const events: BandEvent[] = []
  let moved: Band[] = []

  // Дружина без лорда никому не служит и воевать ей не за что: павший
  // владетель уводит своих людей с карты, иначе по миру копятся ничьи войска.
  const living = new Set(lords.map((lord) => lord.id))
  const standing = bands.filter(
    (band) => living.has(band.lordId) || band.lordId.startsWith('crown:'),
  )

  // У всякого, кто держит землю, есть дружина: и у нового лорда, которого
  // корона только что посадила, и у короны, вернувшей себе домен.
  const withBand = new Set(standing.map((band) => band.lordId))
  const raised: Band[] = []
  for (const lord of lords) {
    if (withBand.has(lord.id)) continue
    const seat = seatOf(places, lord.id)
    if (!seat) continue
    const [units, afterRetinue] = retinue(
      lord.strength,
      generator,
      magesFor(politics, lord.kingdomId),
    )
    generator = afterRetinue
    raised.push({
      id: `band:${lord.id}`,
      lordId: lord.id,
      kingdomId: lord.kingdomId,
      units,
      morale: 60,
      locationId: seat,
      travel: null,
      goal: { type: 'muster' },
      siegeDays: 0,
    })
  }
  for (const kingdomId of Object.keys(politics.archmages)) {
    const crown = `crown:${kingdomId}`
    if (withBand.has(crown)) continue
    const seat = seatOf(places, crown)
    if (!seat) continue
    const [units, afterRetinue] = retinue(14, generator)
    generator = afterRetinue
    raised.push({
      id: `band:${crown}`,
      lordId: crown,
      kingdomId,
      units,
      morale: 70,
      locationId: seat,
      travel: null,
      goal: { type: 'muster' },
      siegeDays: 0,
    })
  }
  const all = raised.length > 0 ? [...standing, ...raised] : standing

  // 1. Шаг по дороге.
  for (const band of all) {
    if (!band.travel) {
      moved.push(band)
      continue
    }
    const hoursLeft = band.travel.hoursLeft - 24
    if (hoursLeft > 0) {
      moved.push({ ...band, travel: { ...band.travel, hoursLeft } })
      continue
    }
    moved.push({
      ...band,
      locationId: band.travel.toLocationId,
      travel: null,
      siegeDays: 0,
    })
  }

  // 2. Встреча: два враждебных войска в одном месте.
  const broken = new Set<string>()
  for (let i = 0; i < moved.length; i += 1) {
    const first = moved[i]
    if (!first || first.travel || broken.has(first.id)) continue
    for (let j = i + 1; j < moved.length; j += 1) {
      const second = moved[j]
      if (!second || second.travel || broken.has(second.id)) continue
      if (second.locationId !== first.locationId) continue
      if (!hostile({ ...politics, lords, wars }, first, second)) continue

      const here = world.locations[first.locationId]
      const defending = places[first.locationId]?.owner === second.lordId
      const walls = defending ? wallsOf(places[first.locationId]) : 1
      const result = clash(first, second, here?.terrain ?? 'plains', walls, generator)
      generator = result.rng

      const winner = result.attackerWon ? first : second
      const loser = result.attackerWon ? second : first
      events.push({
        type: 'bandClash',
        locationId: first.locationId,
        winner: winner.lordId,
        loser: loser.lordId,
        fallen: result.fallen,
      })

      moved[i] = { ...first, units: result.attacker, morale: Math.max(20, first.morale - 8) }
      moved[j] = { ...second, units: result.defender, morale: Math.max(20, second.morale - 8) }

      // Разбитая дружина уходит домой зализывать раны; если лорд был мятежником,
      // это и есть конец мятежа — дверь наконец открывается в обе стороны.
      const beaten = result.attackerWon ? moved[j] : moved[i]
      const beatenIndex = result.attackerWon ? j : i
      if (beaten && bandSize(beaten) <= 2) {
        events.push({ type: 'bandBroken', bandId: beaten.id, lordId: beaten.lordId })
        const outcome = submit(lords, wars, places, beaten.lordId, generator)
        lords = outcome.lords
        wars = outcome.wars
        places = outcome.settlements
        generator = outcome.rng
        events.push(...outcome.events)

        // Дружину разбили — но не лорда. Он уходит домой и собирает новую;
        // иначе один проигранный бой выбивал бы владетеля из мира навсегда.
        const stillAlive = lords.some((candidate) => candidate.id === beaten.lordId)
        if (stillAlive && !seatOf(places, beaten.lordId)) {
          places = grantFromCrown(lords, places, beaten.lordId)
        }
        const seat = stillAlive ? seatOf(places, beaten.lordId) : null
        if (!stillAlive) {
          // Лорда не стало, но его земля кому-то досталась — у наследника своя дружина.
          for (const heir of lords) {
            if (!heir.id.startsWith(`${beaten.lordId}:h`)) continue
            const heirSeat = seatOf(places, heir.id)
            if (!heirSeat) continue
            const [units, afterRetinue] = retinue(heir.strength, generator)
            generator = afterRetinue
            moved.push({
              id: `band:${heir.id}`,
              lordId: heir.id,
              kingdomId: heir.kingdomId,
              units,
              morale: 60,
              locationId: heirSeat,
              travel: null,
              goal: { type: 'muster' },
              siegeDays: 0,
            })
          }
        }
        if (seat) {
          moved[beatenIndex] = {
            ...beaten,
            units: { militia: 2 },
            morale: 40,
            locationId: seat,
            travel: null,
            goal: { type: 'muster' },
            siegeDays: 0,
          }
        } else {
          broken.add(beaten.id)
        }
      }
      break
    }
  }

  moved = moved.filter((band) => !broken.has(band.id))

  // 3. Дело на месте: осада, разорение, сбор.
  const acted: Band[] = []
  for (const band of moved) {
    if (band.travel) {
      acted.push(band)
      continue
    }
    const arrived = goalTarget(band.goal) === band.locationId

    if (arrived && band.goal.type === 'siege') {
      const siegeDays = band.siegeDays + 1
      const target = places[band.locationId]
      if (!target) {
        acted.push({ ...band, goal: { type: 'muster' }, siegeDays: 0 })
        continue
      }
      // Блокада: под стенами едят запас, а не поле.
      places = {
        ...places,
        [band.locationId]: {
          ...target,
          stock: { ...target.stock, grain: Math.round(target.stock.grain * 0.88) },
        },
      }
      if (siegeDays === 1) {
        events.push({ type: 'bandSiege', bandId: band.id, locationId: band.locationId })
      }
      if (siegeDays >= SIEGE_DAYS) {
        // Приступ: те же правила боя, что и у игрока, только стены выше.
        const held = places[band.locationId] as Settlement
        const garrison: Band = {
          ...band,
          id: `${band.id}:defenders`,
          lordId: held.owner ?? 'crown',
          units: defendersOf(held),
          morale: 70,
        }
        const assault = clash(
          band,
          garrison,
          world.locations[band.locationId]?.terrain ?? 'plains',
          wallsOf(held),
          generator,
        )
        generator = assault.rng
        if (!assault.attackerWon) {
          // Отбились. Войско уходит зализывать раны.
          acted.push({
            ...band,
            units: assault.attacker,
            morale: Math.max(20, band.morale - 15),
            goal: goHome(places, band),
            siegeDays: 0,
          })
          events.push({
            type: 'bandClash',
            locationId: band.locationId,
            winner: garrison.lordId,
            loser: band.lordId,
            fallen: assault.fallen,
          })
          continue
        }
        // Провинция следует за главным местом: взяв его, берут и остальное,
        // что держал прежний хозяин здесь же (holding.ts, `takeLand`).
        places = takeLand(world, places, band.locationId, conquerorSide(lords, band))
        const seized = places[band.locationId]
        if (seized) places = { ...places, [band.locationId]: { ...seized, garrison: {} } }
        // Победа связывает: лорд, берущий города для своей короны, реже уходит
        // от неё. Без этого вечная война обнуляет верность всем подряд.
        lords = lords.map((candidate) =>
          candidate.id === band.lordId
            ? { ...candidate, loyalty: Math.min(100, candidate.loyalty + 8) }
            : candidate,
        )
        events.push({ type: 'bandTook', bandId: band.id, locationId: band.locationId })
        // Отняли последнее — мятежу конец. Проверяем только здесь: земля
        // меняет хозяина лишь так, и обходить весь мир каждые сутки незачем.
        const previous = held.owner
        if (previous && previous !== band.lordId && !seatOf(places, previous)) {
          const outcome = submit(lords, wars, places, previous, generator)
          lords = outcome.lords
          wars = outcome.wars
          places = outcome.settlements
          generator = outcome.rng
          events.push(...outcome.events)
        }
        acted.push({
          ...band,
          units: assault.attacker,
          goal: goHome(places, band),
          siegeDays: 0,
        })
        continue
      }
      acted.push({ ...band, siegeDays })
      continue
    }

    if (arrived && band.goal.type === 'crush') {
      // Мятеж унимают, отнимая землю, а не разоряя округу: пограбленный
      // мятежник остаётся мятежником, а обезземеленный — уже нет. Поэтому
      // «унять» — это осада, и дальше всё идёт по её правилам.
      acted.push({ ...band, goal: { type: 'siege', targetId: band.goal.targetId }, siegeDays: 0 })
      continue
    }

    if (arrived && band.goal.type === 'raid') {
      const victim = places[band.locationId]
      if (victim && victim.population > 0 && band.goal.type === 'raid') {
        const [severity, afterSeverity] = nextFloat(generator)
        generator = afterSeverity
        // Дозорная башня: люди успевают уйти за стены, набег берёт вдвое меньше.
        const warned = victim.buildings.includes('watchtower') ? 0.5 : 1
        const lost = Math.round(victim.population * (0.005 + severity * 0.015) * warned)
        // Не всех уводят и не все гибнут: часть уходит к соседям и вернётся,
        // когда всё утихнет. Пока этого не было, набег был чистым вычитанием, и
        // за век войны большие места худели на пятую часть (долг версии 0.3).
        const fled = Math.round(lost * FLEE_SHARE)
        const refuge = fled > 0 ? nearestSettlement(world, places, band.locationId) : null
        places = {
          ...places,
          [band.locationId]: {
            ...victim,
            population: Math.max(0, victim.population - lost),
            banditry: Math.min(1, victim.banditry + 0.12 + severity * 0.15),
            stock: {
              ...victim.stock,
              grain: Math.round(victim.stock.grain * 0.5),
              fish: Math.round(victim.stock.fish * 0.6),
            },
          },
        }
        if (refuge) {
          const host = places[refuge]
          if (host)
            places = { ...places, [refuge]: { ...host, population: host.population + fled } }
        }
        events.push({ type: 'bandRaid', bandId: band.id, locationId: band.locationId, lost })
      }
      acted.push({ ...band, goal: goHome(places, band), siegeDays: 0 })
      continue
    }

    if (band.goal.type === 'home' && band.goal.targetId === band.locationId) {
      acted.push({ ...band, goal: { type: 'muster' }, siegeDays: 0 })
      continue
    }

    // Оборонять больше некого — распускать караул и домой.
    if (band.goal.type === 'defend' && arrived) {
      const threat = moved.some(
        (other) => other.id !== band.id && other.locationId === band.locationId && !other.travel,
      )
      if (!threat) {
        acted.push({ ...band, goal: goHome(places, band), siegeDays: 0 })
        continue
      }
    }

    if (band.goal.type === 'muster') {
      const home = places[band.locationId]
      // Людей берут своих и целыми: половина ополченца не воюет.
      const own = home?.owner === band.lordId
      const [takes, afterTake] = rollChance(generator, MUSTER_CHANCE)
      generator = afterTake
      if (own && home && takes && home.recruits >= 1 && bandSize(band) < 60) {
        places = {
          ...places,
          [band.locationId]: { ...home, recruits: Math.round((home.recruits - 1) * 100) / 100 },
        }
        acted.push({
          ...band,
          units: { ...band.units, militia: (band.units.militia ?? 0) + 1 },
          morale: Math.min(90, band.morale + 0.4),
        })
        continue
      }
      acted.push({ ...band, morale: Math.min(90, band.morale + 0.4) })
      continue
    }

    acted.push(band)
  }

  // 4. Новая цель и шаг в её сторону.
  //
  // Зимой походов не бывает (этап 38): дороги стоят, обоз не пройдёт, а войско
  // надо кормить каждый день. Объявленная война зимой не отменяется — она
  // просто не идёт: дружины расходятся по своим местам и ждут весны. Отсюда и
  // весеннее вскипание: к березню накопилось всё, что не решилось осенью.
  const frozen = day !== null && seasonOf(day) === 'winter'
  const finished: Band[] = []
  for (const band of acted) {
    if (band.travel) {
      finished.push(band)
      continue
    }
    if (frozen) {
      // Тот, кто в походе, поворачивает домой; тот, кто дома, стоит.
      finished.push(band.goal.type === 'muster' ? band : { ...band, goal: { type: 'muster' } })
      continue
    }
    let goal = band.goal
    // Цель выбирает только тот, кто её не имеет. Раньше дошедший до места
    // немедленно выбирал новую — и осада снималась в тот же день, не начавшись.
    // И не каждый день: войско сидит дома между походами, а не выступает с утра
    // по любому поводу. Заодно это главный расход такта — поиск пути к целям.
    const [stirs, afterStir] = rollChance(
      generator,
      CAMPAIGN_CHANCE * (day === null ? 1 : CAMPAIGN_SEASON[seasonOf(day)]),
    )
    generator = afterStir
    if (goal.type === 'muster' && stirs) {
      const [chosen, afterChoice] = chooseGoal(
        world,
        { ...politics, lords, wars },
        places,
        acted,
        band,
        generator,
      )
      generator = afterChoice
      goal = chosen
    }
    const target = goalTarget(goal)
    if (!target || target === band.locationId) {
      finished.push({ ...band, goal })
      continue
    }
    const step = nextHop(world, band.locationId, target, day)
    if (!step) {
      finished.push({ ...band, goal: { type: 'muster' } })
      continue
    }
    finished.push({
      ...band,
      goal,
      travel: { toLocationId: step, hoursLeft: hoursTo(world, band.locationId, step, day) },
    })
  }

  return {
    bands: finished,
    settlements: places,
    politics: { ...politics, lords, wars },
    rng: generator,
    events,
  }
}

function goalTarget(goal: BandGoal): string | null {
  return goal.type === 'muster' ? null : goal.targetId
}

/**
 * Кому достаётся взятое: тому, кто взял.
 *
 * Сначала было иначе — завоёванное уходило короне напрямую. Век показал, к чему
 * это ведёт: земля копилась у корон, лорды пустели, без земли у лорда нет
 * дружины, и унимать мятеж становилось некому. К сотому году десять из
 * двенадцати владетелей сидели в мятеже и держали 58 мест из 62. Лен за службу —
 * это и есть феодальный уклад (DESIGN.md, п.3.2): земля у того, кто её взял, а
 * корона сильна ровно настолько, насколько сильны её вассалы.
 */
function conquerorSide(_lords: readonly Lord[], band: Band): string {
  return band.lordId
}

/**
 * Безземельному лорду корона жалует место из своего домена.
 *
 * Лорд без земли — не лорд: у него нет ни дружины, ни причин служить. Домен
 * короны для того и держится.
 */
function grantFromCrown(
  lords: readonly Lord[],
  settlements: Readonly<Record<string, Settlement>>,
  lordId: string,
): Readonly<Record<string, Settlement>> {
  const lord = lords.find((candidate) => candidate.id === lordId)
  if (!lord?.kingdomId) return settlements
  const crown = `crown:${lord.kingdomId}`
  let pick: string | null = null
  let smallest = Number.POSITIVE_INFINITY
  for (const [id, settlement] of Object.entries(settlements)) {
    if (settlement.owner !== crown || settlement.population <= 0) continue
    if (settlement.population < smallest) {
      smallest = settlement.population
      pick = id
    }
  }
  if (!pick) return settlements
  const granted = settlements[pick]
  if (!granted) return settlements
  return { ...settlements, [pick]: { ...granted, owner: lordId } }
}

/** Домой: если дома не осталось, войско просто стоит там, где стоит. */
function goHome(settlements: Readonly<Record<string, Settlement>>, band: Band): BandGoal {
  const seat = seatOf(settlements, band.lordId)
  return seat && seat !== band.locationId ? { type: 'home', targetId: seat } : { type: 'muster' }
}

function wallsOf(settlement: Settlement | undefined): number {
  if (!settlement) return 1
  return settlement.buildings.includes('walls') ? 2.2 : 1.3
}

/**
 * Конец мятежа.
 *
 * Разбитый мятежник либо снова присягает — с верностью на нуле и обидой, — либо
 * гибнет, и тогда его земля отходит короне. До этого мятеж был дверью в одну
 * сторону: за сто лет пятнадцать лордов из шестнадцати уходили в никуда и там
 * оставались.
 */
function submit(
  lords: readonly Lord[],
  wars: Politics['wars'],
  settlements: Readonly<Record<string, Settlement>>,
  lordId: string,
  rng: Rng,
): {
  lords: readonly Lord[]
  wars: Politics['wars']
  settlements: Readonly<Record<string, Settlement>>
  rng: Rng
  events: readonly BandEvent[]
} {
  const lord = lords.find((candidate) => candidate.id === lordId)
  if (!lord || !isRebel(lord)) return { lords, wars, settlements, rng, events: [] }

  // Кому он присягал раньше — видно по его же идентификатору: lord:<корона>:<n>.
  const crown = lord.id.split(':')[1] ?? null
  const [dies, afterRoll] = rollChance(rng, 0.35)
  const remaining = wars.filter((war) => war.a !== lordId && war.b !== lordId)

  if (dies || !crown) {
    // Земля не висит в воздухе: корона сажает на неё нового человека. Иначе
    // за двадцать лет знать вымирает, и воевать становится некому.
    const heirId = `${lordId}:h${lords.length}`
    const places: Record<string, Settlement> = { ...settlements }
    let land = 0
    for (const [id, settlement] of Object.entries(places)) {
      if (settlement.owner === lordId) {
        places[id] = { ...settlement, owner: crown ? heirId : null }
        land += settlement.population
      }
    }
    const heir: Lord | null =
      crown && land > 0
        ? {
            id: heirId,
            name: `${lord.name} Второй`,
            title: lord.title,
            kingdomId: crown,
            loyalty: 60,
            strength: Math.max(8, Math.round(land / 60)),
          }
        : null
    return {
      lords: [...lords.filter((candidate) => candidate.id !== lordId), ...(heir ? [heir] : [])],
      wars: remaining,
      settlements: places,
      rng: afterRoll,
      events: [{ type: 'lordFell', lordId }],
    }
  }

  return {
    lords: lords.map((candidate) =>
      // Присягнувший заново получает не ноль, а передышку: с верностью 15 он
      // уходил в мятеж снова через сезон, и мятеж опять становился нормой.
      candidate.id === lordId ? { ...candidate, kingdomId: crown, loyalty: 45 } : candidate,
    ),
    wars: remaining,
    settlements,
    rng: afterRoll,
    events: [{ type: 'lordSubmits', lordId, kingdomId: crown }],
  }
}

/**
 * Чья это земля на самом деле.
 *
 * Скелет мира говорит, в чьём королевстве место было заведено, — но держателя
 * меняют осадой и мятежом. Прогон на век показал, что разница огромна: карта
 * рисовала пять целых королевств, когда большая часть земли уже не подчинялась
 * никакой короне. Поэтому всё, что показывает владение, спрашивает здесь.
 */
export type Holder =
  | { readonly kind: 'crown'; readonly kingdomId: string }
  | { readonly kind: 'lord'; readonly lordId: string; readonly kingdomId: string }
  | { readonly kind: 'rebel'; readonly lordId: string }
  | { readonly kind: 'player' }
  | { readonly kind: 'nobody' }

export function holderOf(politics: Politics, owner: string | null, player: string): Holder {
  if (!owner) return { kind: 'nobody' }
  if (owner === player) return { kind: 'player' }
  if (owner.startsWith('crown:')) return { kind: 'crown', kingdomId: owner.slice('crown:'.length) }
  const lord = politics.lords.find((candidate) => candidate.id === owner)
  if (!lord) return { kind: 'nobody' }
  if (lord.kingdomId === null) return { kind: 'rebel', lordId: lord.id }
  return { kind: 'lord', lordId: lord.id, kingdomId: lord.kingdomId }
}

/** Королевство держателя, если он вообще кому-то служит. */
export function holderKingdom(
  politics: Politics,
  owner: string | null,
  player: string,
): string | null {
  const holder = holderOf(politics, owner, player)
  if (holder.kind === 'crown') return holder.kingdomId
  if (holder.kind === 'lord') return holder.kingdomId
  return null
}
