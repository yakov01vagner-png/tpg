import { housesOf } from './brother'
import { lordTemper } from './castle'
import { BUILDINGS, type BuildingId } from './content/buildings'
import { GOODS, type GoodId } from './content/goods'
import { ARCHMAGE_DEED_LABELS } from './content/lore'
import { ORDERS, type OrderDef } from './content/orders'
import {
  AIM_YEARS,
  CROWN_WANT_DEFS,
  type CrownWantId,
  LORD_CALLS,
  LORD_WANT_DEFS,
  type LordWantId,
  ORDER_AIMS,
  ORDER_AIM_DEFS,
  type OrderAimId,
  TEMPER_BUILDS,
  TEMPER_PEACE,
  VENTURE_DAYS,
  VENTURE_LOAD,
  VENTURE_SHARE,
} from './content/plans'
import { overgrown } from './diplomacy'
import { type Settlement, localNeed, priceOf, withStock } from './economy'
import { foodSecurity } from './life'
import { crownOf, crownWarlust, deedWeight, lordBonds, lordMemory, temperDeeds } from './lordlife'
import { MERCHANT_POPULATION, type Merchant, merchantGone, merchantsAt } from './merchant'
import { GAMBIT_DEFS, crownGame, gambitWords } from './mind'
import type { GameState } from './state'
import { DAYS_PER_YEAR } from './time'
import { pairOf } from './war'
import type { Lord, Politics } from './war'
import { kingdomOf, regionOf } from './world/queries'
import type { World } from './world/types'

/**
 * Свои головы — ИИ мира (этап 72).
 *
 * Лорды, короны, купцы и ордена до сих пор жили бросками: раз в сутки кубик
 * решал, объявить ли войну и кому, куда пойти войском, что лежит на прилавке.
 * Прогон на век показывал мир, который шевелится, но ничего не хочет.
 *
 * Здесь у каждого появляется замысел: не разум и не отдельная «система ИИ», а
 * правила, выведенные из того, что в мире и так видно — нрав, земля, соседи,
 * цены, память. Замысел ничего не хранит: он считается заново, как купцы (этап
 * 49) и лорды (этап 66), и потому не может разойтись с миром. Зато он объясним
 * словами — и эти слова видны игроку (Ч6).
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Близкие строки дают близкие хеши: перемешиваем прежде, чем брать остаток. */
function mix(hash: number): number {
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

function pick<T>(list: readonly T[], hash: number): T | null {
  return list.length === 0 ? null : (list[mix(hash) % list.length] ?? null)
}

// --- Ч1: лорд решает по-своему ----------------------------------------------

export interface LordPlan {
  readonly lordId: string
  readonly want: LordWantId
  /** Место или человек, о которых замысел. Пусто — замысел ни о ком. */
  readonly targetId: string | null
  /** Чем он это объясняет. */
  readonly why: string
}

/** Ниже этой сытости на его землях лорду не до войны. */
const LORD_HUNGRY = 0.35

function holdingsOf(
  settlements: Readonly<Record<string, Settlement>>,
  lordId: string,
): readonly Settlement[] {
  return Object.values(settlements).filter((one) => one.owner === lordId && one.population > 0)
}

/**
 * Экспортируется ради этапа 197: объяснение должно читать то же условие, что и
 * решение, а не своё похожее.
 */
export function crownWars(politics: Politics, kingdomId: string): readonly string[] {
  const out: string[] = []
  for (const war of politics.wars) {
    if (war.a === kingdomId) out.push(war.b)
    else if (war.b === kingdomId) out.push(war.a)
  }
  return out
}

/**
 * Чего хочет этот лорд.
 *
 * Складывается из трёх вещей, которые лорд видит сам: своей земли (сыта ли,
 * отстроена ли), своих соседей (есть ли с кем делить провинцию) и своего нрава
 * (мрачный идёт войной там, где благочестивый сидит дома). Войны короны лорд не
 * выбирает — но выбирает, воевать в них по-настоящему или сходить за добычей.
 */
export function lordPlan(
  world: World,
  politics: Politics,
  settlements: Readonly<Record<string, Settlement>>,
  lord: Lord,
): LordPlan {
  const temper = temperDeeds(lord)
  const own = holdingsOf(settlements, lord.id)
  const hungry = own.filter((one) => foodSecurity(one) < LORD_HUNGRY).length
  const said = (want: LordWantId, why: string, targetId: string | null = null): LordPlan => ({
    lordId: lord.id,
    want,
    targetId,
    why,
  })

  // Голодная земля держит хозяина дома крепче любого нрава: с пустых амбаров
  // войска не соберёшь, а собранное придётся кормить. Мятежника это касается
  // вдвойне: ему никто не поможет, и от этого зависит, долго ли он мятежник
  // (`tickBands`).
  if (own.length > 0 && hungry * 2 >= own.length) {
    return said(
      'hoard',
      lord.kingdomId === null
        ? 'На его землях недород, и помощи ждать неоткуда: мятеж дороже, чем он может заплатить.'
        : 'На его землях недород: сейчас он свозит хлеб, а не собирает войско.',
    )
  }

  // В остальном мятежнику середины нет: он или возьмёт своё, или ляжет.
  if (lord.kingdomId === null) {
    return said('war', 'Мятежнику мира не дадут: он или возьмёт своё, или ляжет.')
  }

  const enemies = crownWars(politics, lord.kingdomId)
  if (enemies.length > 0) {
    const enemyName = world.kingdoms[enemies[0] as string]?.name ?? 'чужие'
    if (temper.warlike >= 1.1) {
      return said(
        'war',
        `Корона воюет с ${enemyName}, и он идёт воевать всерьёз — не за добычей.`,
        enemies[0] ?? null,
      )
    }
    return said(
      'loot',
      `Война с ${enemyName} — чужая забота; своё он возьмёт добычей и уйдёт.`,
      enemies[0] ?? null,
    )
  }

  // Мира лорд не сидит без дела, и дело у него по нраву (`TEMPER_PEACE`).
  const peace = TEMPER_PEACE[lordTemper(lord)]
  const bonds = lordBonds(politics, settlements, world, lord)
  const rival = bonds.rivals[0]
  if (rival && peace !== 'guard') {
    return said(
      'wed',
      `В одной провинции с ${rival.title} ${rival.name} тесно; он ищет родства, а не войны.`,
      rival.id,
    )
  }
  if (peace === 'guard') {
    const seat = own[0]
    return said(
      'guard',
      rival
        ? `Своего он не отдаст и вершка — а ${rival.title} ${rival.name} сидит в той же провинции.`
        : 'Чужого ему не надо, своё он не отдаст никому.',
      seat?.locationId ?? null,
    )
  }
  if (peace === 'build') {
    const wants: readonly BuildingId[] = TEMPER_BUILDS[lordTemper(lord)] ?? []
    const bare = own.find((one) => wants.some((id) => !one.buildings.includes(id)))
    if (bare) {
      const where = world.locations[bare.locationId]?.name ?? 'своей земле'
      const what = wants.find((id) => !bare.buildings.includes(id))
      return said(
        'build',
        `Пока тихо, он строит в ${where}${what ? ` (${BUILDINGS[what]?.label.toLowerCase() ?? ''})` : ''}: ${temper.warlike >= 1.3 ? 'в мир он не верит' : 'это переживёт его самого'}.`,
        bare.locationId,
      )
    }
  }
  return said(
    'hoard',
    temper.cruel >= 1.2
      ? 'Воевать не с кем: он считает своё и прикидывает, чьё бы ещё сосчитать.'
      : 'Воевать не с кем, строить нечего: он копит и ждёт своего часа.',
  )
}

export function lordWantLabel(want: LordWantId): string {
  return LORD_WANT_DEFS[want].label
}

/**
 * Куда он пойдёт из того, что ему доступно.
 *
 * Дружина выбирала цель кубиком — и потому воевала без смысла: шла на пустую
 * деревню, стоя рядом с городом. Теперь у выбора есть вкус, и он следует из
 * замысла: воюющий берёт добычу покрупнее, идущий за добычей — ту, что хуже
 * охраняется.
 */
export function rankTargets(
  settlements: Readonly<Record<string, Settlement>>,
  candidates: readonly string[],
  want: LordWantId,
): readonly string[] {
  return [...candidates].sort(
    (a, b) => scoreOf(settlements, b, want) - scoreOf(settlements, a, want),
  )
}

function scoreOf(
  settlements: Readonly<Record<string, Settlement>>,
  id: string,
  want: LordWantId,
): number {
  const settlement = settlements[id]
  if (!settlement) return 0
  const guards = Object.values(settlement.garrison).reduce((sum, one) => sum + (one ?? 0), 0)
  if (want === 'loot') return settlement.population / (guards + 20)
  return settlement.population
}

/** Во сколько раз замысел меняет охоту брать место осадой, а не разорять. */
export function siegeTaste(want: LordWantId): number {
  return LORD_WANT_DEFS[want].siege
}

export function marchesOut(want: LordWantId): boolean {
  return LORD_WANT_DEFS[want].marches
}

// --- Ч2: корона ведёт политику ----------------------------------------------

export interface CrownPlan {
  readonly kingdomId: string
  readonly want: CrownWantId
  /** О какой короне замысел. */
  readonly targetId: string | null
  readonly why: string
}

/** Отношение, выше которого корона думает о родстве, а не о войне. */
const WARM = 20

/** Насколько близкие отношения считаются одинаково плохими. */
const TIE = 5

export function crownPlan(
  world: World,
  politics: Politics,
  settlements: Readonly<Record<string, Settlement>>,
  kingdomId: string,
  giantSide?: string | null,
): CrownPlan {
  const crown = crownOf(kingdomId)
  const name = (id: string) => world.kingdoms[id]?.name ?? id
  const said = (want: CrownWantId, why: string, targetId: string | null = null): CrownPlan => ({
    kingdomId,
    want,
    targetId,
    why,
  })

  // Начатая война — уже выбор: пока она не кончена, второй корона не откроет,
  // если только не воинственна настолько, что ей всё равно.
  const enemies = crownWars(politics, kingdomId)
  if (enemies.length > 0) {
    const foe = enemies[0] as string
    return said(
      'foe',
      `${crown.title} ${crown.name} ведёт войну с ${name(foe)} и не станет заводить второй, пока эта не кончена.`,
      foe,
    )
  }

  // Дань тяжелее войны: корона, которая платит, ищет, как перестать.
  const owes = politics.tributes.find((one) => one.from === kingdomId)
  if (owes) {
    return said(
      'tribute',
      `Дань в ${name(owes.to)} — позор и убыток; ${crown.title} ${crown.name} ищет, как её сбросить.`,
      owes.to,
    )
  }

  const giant = giantSide === undefined ? overgrown(world, settlements) : giantSide
  if (giant && giant !== kingdomId) {
    if (crownWarlust(kingdomId) >= 1.2) {
      return said(
        'foe',
        `${name(giant)} забрал слишком много; ${crown.title} ${crown.name} считает, что дальше будет хуже.`,
        giant,
      )
    }
    const friend = crownBestRelation(world, politics, kingdomId, [giant])
    if (friend) {
      return said(
        'ally',
        `Против ${name(giant)} в одиночку не встать: ${crown.title} ${crown.name} ищет союза с ${name(friend)}.`,
        friend,
      )
    }
  }
  if (giant === kingdomId) {
    return said(
      'rest',
      `Взято много; теперь ${crown.title} ${crown.name} думает, как это удержать.`,
    )
  }

  const friend = crownBestRelation(world, politics, kingdomId, [])
  if (friend && (politics.relations[pairOf(kingdomId, friend)] ?? 0) > WARM) {
    return said(
      'marry',
      `С ${name(friend)} давно в ладу: ${crown.title} ${crown.name} говорит о наследниках, а не о войне.`,
      friend,
    )
  }
  return said('rest', `${crown.title} ${crown.name} ничего не затевает: год без войны — тоже дело.`)
}

/**
 * С кем у этой короны лучше всего.
 *
 * Близкие отношения разбираются своим счётом — по той же причине, что и у
 * выбора врага: в мире, где все в ладу со всеми (а мир без войны к этому и
 * приходит), «лучший сосед» иначе определялся бы порядком в списке королевств,
 * и все восемь корон сватались бы к одной и той же.
 */
/** Экспортируется ради этапа 197: см. `crownWars`. */
export function crownBestRelation(
  world: World,
  politics: Politics,
  kingdomId: string,
  skip: readonly string[],
): string | null {
  const others = Object.keys(world.kingdoms).filter((id) => id !== kingdomId && !skip.includes(id))
  let most = Number.NEGATIVE_INFINITY
  for (const id of others) {
    const value = politics.relations[pairOf(kingdomId, id)] ?? 0
    if (value > most) most = value
  }
  const near = others.filter((id) => (politics.relations[pairOf(kingdomId, id)] ?? 0) >= most - TIE)
  let best: string | null = null
  let mark = Number.POSITIVE_INFINITY
  for (const id of near) {
    const own = mix(hashOf(`${kingdomId}|родство|${id}`))
    if (own < mark) {
      mark = own
      best = id
    }
  }
  return best
}

/**
 * Кого корона выберет врагом, если дойдёт до объявления.
 *
 * Врага выбирал кубик — оттого войны выходили без смысла: сосед, с которым
 * только что заключили союз, получал объявление на следующий день. Теперь
 * выбор следует из замысла и из отношений, а кубик решает лишь, дойдёт ли до
 * объявления вообще.
 */
export function crownFoe(
  world: World,
  politics: Politics,
  settlements: Readonly<Record<string, Settlement>>,
  kingdomId: string,
  giantSide?: string | null,
): string | null {
  const plan = crownPlan(world, politics, settlements, kingdomId, giantSide)
  if (plan.want === 'foe' || plan.want === 'tribute') return plan.targetId
  // Прочие замыслы врага не ищут — но если корона всё же пошла на войну, она
  // пойдёт на того, с кем хуже всего, а не на первого попавшегося.
  //
  // С одной оговоркой: на того, кто уже воюет, не идут скопом. Без неё война
  // портит отношение, испорченное отношение приводит следующую войну, и мир
  // за век сводится к одному врагу всех: расчётливая корона проводила в войне
  // вдвое больше лет, чем воинственная, — не по нраву, а по колее.
  const others = Object.keys(world.kingdoms).filter((id) => id !== kingdomId)
  const free = others.filter((id) => crownWars(politics, id).length === 0)
  const candidates = free.length > 0 ? free : others
  let worst: string | null = null
  let least = Number.POSITIVE_INFINITY
  for (const id of candidates) {
    const value = politics.relations[pairOf(kingdomId, id)] ?? 0
    if (value < least) {
      least = value
      worst = id
    }
  }
  if (worst === null) return null
  // Пока отношения равны — а в первый день мира они равны все, — «худший»
  // определялся порядком в списке королевств, и весь мир объявлял войну одному
  // и тому же соседу. Поэтому близкие отношения разбираются своим счётом: у
  // каждой короны свой давний недруг, и он у каждой свой.
  const near = candidates.filter(
    (id) => (politics.relations[pairOf(kingdomId, id)] ?? 0) <= least + TIE,
  )
  if (near.length <= 1) return worst
  let chosen = worst
  let best = Number.POSITIVE_INFINITY
  for (const id of near) {
    const mark = mix(hashOf(`${kingdomId}|недруг|${id}`))
    if (mark < best) {
      best = mark
      chosen = id
    }
  }
  return chosen
}

/** Открывает ли корона вторую войну: только очень воинственная. */
export function opensSecondWar(politics: Politics, kingdomId: string): boolean {
  if (crownWars(politics, kingdomId).length === 0) return true
  return crownWarlust(kingdomId) >= 1.2
}

export function crownWantLabel(want: CrownWantId): string {
  return CROWN_WANT_DEFS[want].label
}

// --- Ч3: купец водит свои обозы ---------------------------------------------

export interface Venture {
  readonly merchantId: string
  readonly name: string
  readonly good: GoodId
  /** Откуда везёт: тот конец дороги, где товар дешевле. */
  readonly fromId: string
  readonly toId: string
  /** Сколько мер уходит с обозом. */
  readonly load: number
  /** Что он на этом берёт: за вычетом дороги может выйти и убыток. */
  readonly gain: number
  /** Поедет ли он вообще. */
  readonly runs: boolean
  readonly why: string
}

/** Города, в которых есть свои купцы: только они водят обозы. */
export function marketTowns(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
): readonly string[] {
  const out: string[] = []
  for (const [id, settlement] of Object.entries(settlements)) {
    if (settlement.population >= MERCHANT_POPULATION && world.locations[id]) out.push(id)
  }
  return out
}

/**
 * Чего стоит дорога: сколько теряется на каждой мере груза.
 *
 * Без этого купец возил бы за грош разницы, и торговать было бы нечем: прогореть
 * невозможно там, где дорога ничего не стоит. Столько же теряет и игрок на
 * своих обозах (`enterprise.ts`) — телега, корм, мыто.
 */
const ROAD_TOLL = 2

/**
 * Куда и с чем ходит этот купец.
 *
 * Дорога у него своя и постоянная: он завёл дело с одним торгом и возит между
 * ним и своим. Товар идёт в тот конец, где дороже, — иначе купец не купец; а
 * прибыль считается по нынешним ценам и за вычетом дороги, и потому обоз может
 * прийти в убыток: пока он ехал, цена сошлась. Это и есть купеческое дело, а не
 * таблица цен.
 */
export function ventureOf(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  merchant: Merchant,
): Venture | null {
  const here = settlements[merchant.locationId]
  if (!here || here.population <= 0) return null
  const region = regionOf(world, merchant.locationId)
  if (!region) return null
  const partners = region.provinceIds
    .flatMap((provinceId) => world.provinces[provinceId]?.locationIds ?? [])
    .filter(
      (id) =>
        id !== merchant.locationId && (settlements[id]?.population ?? 0) >= MERCHANT_POPULATION,
    )
  const partnerId = pick(partners, hashOf(`${merchant.id}|дорога`))
  const partner = partnerId ? settlements[partnerId] : null
  if (!partnerId || !partner) return null
  const good = pick(merchant.goods, hashOf(`${merchant.id}|товар`))
  if (!good) return null

  const priceHere = priceOf(world, here, good)
  const priceThere = priceOf(world, partner, good)
  const [fromId, toId, cheap, dear] =
    priceThere >= priceHere
      ? [merchant.locationId, partnerId, priceHere, priceThere]
      : [partnerId, merchant.locationId, priceThere, priceHere]
  const source = fromId === merchant.locationId ? here : partner
  const load = Math.min(VENTURE_LOAD, Math.max(1, Math.round(source.stock[good] * VENTURE_SHARE)))
  const gain = Math.round((dear - cheap - ROAD_TOLL) * load)
  const label = GOODS[good].label.toLowerCase()
  const where = world.locations[toId]?.name ?? 'соседний торг'
  const runs = dear > cheap
  return {
    merchantId: merchant.id,
    name: merchant.name,
    good,
    fromId,
    toId,
    load,
    gain,
    runs,
    why: !runs
      ? `Возил ${label} в ${where}, да цены сошлись: ехать не с чем.`
      : gain >= 0
        ? `Возит ${label} в ${where}: берёт по ${cheap}, отдаёт по ${dear}.`
        : `Возит ${label} в ${where} и прогорает: разницу съедает дорога.`,
  }
}

export interface TradeResult {
  readonly settlements: Readonly<Record<string, Settlement>>
  readonly moves: readonly Venture[]
}

/** Сколько ходок подряд досчитывается за один такт: дальше это уже не мир, а счёт. */
const MAX_RUNS = 3

/**
 * Обозы купцов за прошедшие сутки (Ч3).
 *
 * Цены двигала таблица: запас место тратило само, и товар ниоткуда не приходил.
 * Теперь товар возят люди — и цены сходятся оттого, что купец повёз, а не
 * оттого, что так написано. Из голодного города обоз не выйдет: берут только
 * то, что сверх годовой нужды, иначе торговля кормилась бы голодом.
 */
export function tickTrade(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  fromDay: number,
  toDay: number,
): TradeResult {
  const runs = Math.min(
    MAX_RUNS,
    Math.floor(toDay / VENTURE_DAYS) - Math.floor(fromDay / VENTURE_DAYS),
  )
  if (runs <= 0) return { settlements, moves: [] }
  let current = settlements
  const moves: Venture[] = []
  const towns = marketTowns(world, settlements)
  for (let run = 0; run < runs; run += 1) {
    for (const townId of towns) {
      for (const merchant of merchantsAt(world, current, townId)) {
        const venture = ventureOf(world, current, merchant)
        if (!venture || !venture.runs) continue
        const source = current[venture.fromId]
        const target = current[venture.toId]
        if (!source || !target) continue
        const spare = source.stock[venture.good] - localNeed(venture.good, source.population)
        const load = Math.min(venture.load, Math.floor(spare))
        if (load <= 0) continue
        current = {
          ...current,
          [venture.fromId]: withStock(source, venture.good, -load),
          [venture.toId]: withStock(target, venture.good, load),
        }
        moves.push({ ...venture, load })
      }
    }
  }
  return { settlements: current, moves }
}

// --- Ч4: ордена и маги со своими целями -------------------------------------

export interface OrderAim {
  readonly orderId: string
  readonly want: OrderAimId
  readonly targetId: string | null
  readonly why: string
}

/** Сколько дней орден держится одного замысла. */
export const AIM_DAYS = AIM_YEARS * DAYS_PER_YEAR

export function aimEra(day: number): number {
  return Math.floor(day / AIM_DAYS)
}

/**
 * Чего добивается орден сейчас.
 *
 * У ордена был устав и вражда, но не было дела: братья сидели в домах и ждали
 * игрока. Замысел меняется раз в пять лет — за колено брат успевает увидеть
 * два-три — и выводится из самого ордена и года, а не хранится: летопись мира
 * не должна зависеть от того, заходил ли игрок в этот дом.
 */
export function orderAim(world: World, order: OrderDef, day: number): OrderAim {
  const era = aimEra(day)
  const hash = hashOf(`${order.id}|${era}`)
  const want = ORDER_AIMS[mix(hash) % ORDER_AIMS.length] ?? 'alms'
  const houses = housesOf(world, order.id)
  const def = ORDER_AIM_DEFS[want]
  const nameOf = (id: string | null) => (id ? (world.locations[id]?.name ?? id) : 'где-то')

  if (want === 'house') {
    // Хочет стоять там, где его ещё нет, и где есть кого звать в братья.
    const candidates = Object.values(world.locations)
      .filter(
        (place) =>
          !houses.includes(place.id) &&
          order.seats.includes(place.archetype) &&
          place.population > 0,
      )
      .map((place) => place.id)
    const targetId = pick(candidates, hashOf(`${order.id}|${era}|дом`))
    return {
      orderId: order.id,
      want,
      targetId,
      why: `${def.about} Смотрит на ${nameOf(targetId)}.`,
    }
  }
  if (want === 'feud') {
    const foeId = pick(order.feud.orders, hashOf(`${order.id}|${era}|враг`))
    const foe = ORDERS.find((one) => one.id === foeId)
    const targetId = foe
      ? (pick(housesOf(world, foe.id), hashOf(`${order.id}|${era}|дом врага`)) ?? null)
      : null
    return {
      orderId: order.id,
      want,
      targetId,
      why: foe
        ? `${def.about} Речь о ${foe.name}: их дом в ${nameOf(targetId)}.`
        : `${def.about} Соперника пока не назвали.`,
    }
  }
  const targetId = pick(houses, hashOf(`${order.id}|${era}|где`))
  return {
    orderId: order.id,
    want,
    targetId,
    why: `${def.about} Нынче — в ${nameOf(targetId)}.`,
  }
}

export function orderAimLabel(want: OrderAimId): string {
  return ORDER_AIM_DEFS[want].label
}

/** Чем занят архимаг этой короны — словами (этап 60 дал ему дело, Ч4 — слова). */
export function archmageAim(politics: Politics, kingdomId: string): string | null {
  const mage = politics.archmages[kingdomId]
  if (!mage) return null
  if (!mage.deed) return mage.state === 'refused' ? 'Отказался служить короне.' : 'При дворе.'
  const def = ARCHMAGE_DEED_LABELS[mage.deed]
  return `${def.label}. ${def.about}`
}

// --- Ч5: все помнят и отвечают ----------------------------------------------

/**
 * Зовёт ли тебя лорд к себе (Ч5).
 *
 * Лорд помнил добро милостью в приёмной (этап 66) — и только. Теперь спасённый
 * лорд, собравшийся в поход, звал бы с собой того, кому обязан: память
 * превращается в дело, а не в надбавку к приёму.
 */
export function lordCall(
  world: World,
  politics: Politics,
  settlements: Readonly<Record<string, Settlement>>,
  state: Pick<GameState, 'lordDeeds'>,
  lord: Lord,
): { readonly targetId: string; readonly why: string } | null {
  const memory = lordMemory(state, lord.id)
  const good = memory.reduce((sum, deed) => sum + Math.max(0, deedWeight(deed)), 0)
  if (good < LORD_CALLS) return null
  const plan = lordPlan(world, politics, settlements, lord)
  if (!marchesOut(plan.want)) return null
  const candidates = rankTargets(
    settlements,
    Object.keys(settlements).filter((id) => {
      const settlement = settlements[id]
      if (!settlement || settlement.population <= 0) return false
      if (settlement.owner === lord.id) return false
      const side = sideOfOwner(settlement.owner)
      return side !== null && lord.kingdomId !== null && plan.targetId === side
    }),
    plan.want,
  )
  const targetId = candidates[0]
  if (!targetId) return null
  return {
    targetId,
    why: `${lord.title} ${lord.name} помнит, чем тебе обязан, и зовёт с собой на ${world.locations[targetId]?.name ?? 'чужую землю'}.`,
  }
}

function sideOfOwner(owner: string | null): string | null {
  if (!owner) return null
  if (owner.startsWith('crown:')) return owner.slice('crown:'.length)
  const parts = owner.split(':')
  return parts[0] === 'lord' ? (parts[1] ?? null) : null
}

// --- Ч6: видно, почему ------------------------------------------------------

export interface AimCard {
  readonly id: string
  /** Кто: корона, лорд, орден, архимаг, купец. */
  readonly kind: 'crown' | 'lord' | 'order' | 'mage' | 'merchant'
  readonly who: string
  readonly wants: string
  readonly why: string
}

/**
 * Кто чего хочет — так, как это видно отсюда.
 *
 * Сводка мира показывала войны и цены: что случилось. Чего хотят — не
 * показывала, и мир выглядел набором происшествий. Здесь то же состояние
 * читается с другой стороны: замыслы тех, кто рядом.
 */
export function worldAims(state: GameState, locationId: string = state.locationId): AimCard[] {
  const cards: AimCard[] = []
  const world = state.world
  const day = Math.floor(state.time / 1440) + 1
  const here = kingdomOf(world, locationId)?.id ?? null
  const giant = overgrown(world, state.settlements)

  // Короны: своя первой, чужие следом.
  const kingdomIds = Object.keys(world.kingdoms).sort((a, b) =>
    a === here ? -1 : b === here ? 1 : 0,
  )
  for (const kingdomId of kingdomIds) {
    const plan = crownPlan(world, state.politics, state.settlements, kingdomId, giant)
    const crown = crownOf(kingdomId)
    cards.push({
      id: `aim:crown:${kingdomId}`,
      kind: 'crown',
      who: `${world.kingdoms[kingdomId]?.name ?? kingdomId}: ${crown.title} ${crown.name}`,
      wants: crownWantLabel(plan.want),
      why: plan.why,
    })
    // Замысел — на один шаг, партия — на годы (этап 89, И1 и И6). Обе видны в
    // сводке, и вторая объясняет, зачем корона делает то, что делает сегодня.
    const gambit = crownGame(state, world, kingdomId, day)
    cards.push({
      id: `aim:game:${kingdomId}`,
      kind: 'crown',
      who: `${world.kingdoms[kingdomId]?.name ?? kingdomId}: партия на годы`,
      wants: GAMBIT_DEFS[gambit.aim].label,
      why: gambitWords(gambit, world),
    })
    const mage = archmageAim(state.politics, kingdomId)
    if (mage && kingdomId === here) {
      cards.push({
        id: `aim:mage:${kingdomId}`,
        kind: 'mage',
        who: `Архимаг ${world.kingdoms[kingdomId]?.name ?? kingdomId}`,
        wants: 'своё дело',
        why: mage,
      })
    }
  }

  // Лорды округи: те, чью землю отсюда видно.
  const region = regionOf(world, locationId)
  const nearby = new Set(
    (region?.provinceIds ?? []).flatMap((id) => world.provinces[id]?.locationIds ?? []),
  )
  const seen = new Set<string>()
  for (const id of nearby) {
    const owner = state.settlements[id]?.owner
    if (!owner || owner.startsWith('crown:') || seen.has(owner)) continue
    const lord = state.politics.lords.find((one) => one.id === owner)
    if (!lord) continue
    seen.add(owner)
    const plan = lordPlan(world, state.politics, state.settlements, lord)
    cards.push({
      id: `aim:lord:${lord.id}`,
      kind: 'lord',
      who: `${lord.title} ${lord.name}`,
      wants: lordWantLabel(plan.want),
      why: plan.why,
    })
    if (seen.size >= 4) break
  }

  // Ордена: те, у кого дом в этой округе.
  for (const order of ORDERS) {
    if (!housesOf(world, order.id).some((id) => nearby.has(id))) continue
    const aim = orderAim(world, order, day)
    cards.push({
      id: `aim:order:${order.id}`,
      kind: 'order',
      who: order.name,
      wants: orderAimLabel(aim.want),
      why: aim.why,
    })
  }

  // Купцы этого торга: чей обоз куда идёт.
  for (const merchant of merchantsAt(world, state.settlements, locationId)) {
    if (merchantGone(state, merchant.id)) continue
    const venture = ventureOf(world, state.settlements, merchant)
    if (!venture) continue
    cards.push({
      id: `aim:merchant:${merchant.id}`,
      kind: 'merchant',
      who: merchant.name,
      wants: venture.gain >= 0 ? 'свой обоз' : 'выбраться из убытка',
      why: venture.why,
    })
  }
  return cards
}
