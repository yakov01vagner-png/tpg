import type { GoodId } from './content/goods'
import { GOOD_IDS } from './content/goods'
import type { Settlement } from './economy'
import {
  FOOD_PER_PERSON,
  RECRUIT_RECOVERY,
  localNeed,
  recruitPool,
  supplyRatiosOf,
  targetStock,
} from './economy'
import { hasBuilding } from './holding'
import type { Rng } from './rng'
import { nextFloat } from './rng'
import { titheFor, titheSupport } from './temple'
import type { Season } from './time'
import { daysToHarvest, seasonOf } from './time'
import { kingdomOf } from './world/queries'
import type { LocationArchetype, PlaceKind, Terrain, World } from './world/types'
import { isSettlement } from './world/types'

/**
 * Жизнь поселений: еда, голод, рост и вымирание (DESIGN.md, п.7).
 *
 * Считается сутками и только числами: сколько земля дала, сколько людей съело,
 * сколько осталось. Голод здесь не надпись, а следствие — сперва пустеют
 * амбары, потом растут цены, потом умирают и уходят люди, и только после этого
 * деревня исчезает с карты.
 */

export interface LifeConfig {
  /** Сколько еды съедает один человек за сутки. */
  readonly foodPerPerson: number
  /** Сколько еды даёт земля средней провинции за сутки. */
  readonly landFood: number
  /** На сколько суток поселение старается держать запас еды. */
  readonly daysOfStock: number
  /**
   * Какую долю излишка отдают нуждающимся за сутки — на четырёх кругах.
   * Чем дальше везти, тем меньше доходит: соседняя деревня делится охотно,
   * другое королевство — по чуть-чуть и за деньги.
   */
  readonly provinceTransfer: number
  readonly regionTransfer: number
  readonly kingdomTransfer: number
  readonly worldTransfer: number
  /** Доля населения, умирающая за сутки полного голода. */
  readonly starvationDeaths: number
  /** Доля населения, уходящая за сутки полного голода. */
  readonly starvationMigration: number
  /**
   * Наибольший суточный прирост: столько прибавляет место, которому есть куда
   * расти. Чем теснее, тем прибавка меньше, и у предела земли она сходит на
   * нет (см. `produceAndEat`).
   *
   * Девять процентов в год — это скорость, с какой отстраивается разорённое
   * место, а не скорость, с какой растёт мир: у предела прирост нулевой.
   * Пока рост был ровным, выбор стоял между «мир у предела рождает и хоронит
   * по тридцать тысяч в год» и «сожжённая деревня не поднимается никогда».
   */
  readonly growth: number
  /** Ниже этого числа жителей место считается брошенным. */
  readonly abandonAt: number
  /** Скорость возврата прочих товаров к норме. */
  readonly goodsRecovery: number
}

export const LIFE: LifeConfig = {
  foodPerPerson: FOOD_PER_PERSON,
  landFood: 30,
  daysOfStock: 100,
  provinceTransfer: 0.15,
  regionTransfer: 0.08,
  kingdomTransfer: 0.04,
  worldTransfer: 0.015,
  starvationDeaths: 0.008,
  starvationMigration: 0.015,
  growth: 0.00025,
  abandonAt: 15,
  goodsRecovery: 0.08,
}

/**
 * Сколько людей кормит земля, принадлежащая месту.
 *
 * Земля считается не «полем под стеной», а всей округой, которая на это место
 * работает: у деревни это её поля, у столицы — округа на день пути. Крупное
 * место потому и выросло, что под ним больше земли, — но выросло оно всё равно
 * сильнее, чем земля может прокормить, и разницу довозят соседи. В этом и
 * состоит хрупкость городов: перекрой подвоз, и начнётся голод.
 *
 * Хлеб для этого привоза родит деревня, и потому её округа так велика: село в
 * семь сотен душ стоит на земле, которая кормит две тысячи. Пока это было не
 * так, мир заводился на 93% своей еды — выше того запаса, при котором людям
 * позволено множиться (GROWTH_HEADROOM), — и потому не мог расти вовсе: земля
 * уставала, урожай падал, и рудники с крепостями таяли век напролёт. Теперь
 * мир начинается на четырёх пятых: расти есть куда, но запас не бездонный —
 * перерезанный подвоз по-прежнему доводит до голода.
 */
export const LAND_CAPACITY: Record<LocationArchetype, number> = {
  village: 2000,
  town: 5000,
  city: 9000,
  capital: 22000,
  port: 7000,
  mine: 250,
  fortress: 300,
  monastery: 200,
}

/**
 * Что даёт земля в это время года (этап 37).
 *
 * До 0.5 земля родила каждый день одинаково: «урожай» был числом, на которое
 * умножалось производство, и в феврале деревня жала хлеб ровно так же, как в
 * августе. Теперь год — это год: весной сеют и доедают прошлогоднее, летом
 * растёт, осенью жнут, зимой живут запасом.
 *
 * Средний по году — единица: мир кормится столько же, сколько кормился, но
 * теперь ему приходится держать запас. Поэтому вместе с временами года выросла
 * и норма запаса (`daysOfStock`): десять суток были мерой мира, в котором хлеб
 * родится ежедневно, а в мире с зимой десять суток — это голодная смерть в
 * студне.
 *
 * Рыба сюда не входит: море ловится круглый год (лёд приходит на этапе 38).
 */
export const SEASON_FOOD: Record<Season, number> = {
  spring: 0.7,
  summer: 1.35,
  autumn: 1.8,
  winter: 0.15,
}

/**
 * Сколько съедают в это время года.
 *
 * Зимой человек ест больше: холод отнимает то, что летом уходит в работу. Из-за
 * этих полутора десятых доля голода перестала приходиться на одну весну —
 * пустеть амбары начинают ещё в лютне, и «дожить до нового хлеба» становится
 * счётом, который ведут с осени.
 */
export const SEASON_EATING: Record<Season, number> = {
  spring: 1,
  summer: 0.95,
  autumn: 1,
  winter: 1.15,
}

/** Что земля родит: на равнине много, в горах почти ничего. */
export const TERRAIN_FOOD: Record<Terrain, number> = {
  plains: 1.2,
  forest: 0.9,
  hills: 0.85,
  mountains: 0.5,
  marsh: 0.7,
  coast: 1.1,
  steppe: 0.9,
  desert: 0.35,
}

/**
 * Сколько человек эта земля способна прокормить.
 * Город всегда больше своего предела — он живёт привозом, и в этом его слабость.
 */
export function landCapacityOf(
  archetype: LocationArchetype,
  terrain: Terrain,
  fertility: number,
): number {
  return Math.round(LAND_CAPACITY[archetype] * (0.6 + fertility * 0.8) * TERRAIN_FOOD[terrain])
}

/**
 * Море кормит (этап 36).
 *
 * До 0.5 «побережье» было названием местности: деревня в получасе от прибоя и
 * деревня в трёх днях от него кормились одинаково, если обе стояли в провинции
 * с ярлыком «coast». Теперь кормит вода, а не ярлык: место на берегу держит
 * больше людей, чем та же земля без моря, а гавань — ещё больше, потому что
 * рыбой она живёт, а не подъедает её.
 *
 * Прибавка невелика нарочно: море не отменяет землю, оно её дополняет. Рыбой
 * можно пережить недород, но нельзя вырастить город.
 */
export function seaCatch(archetype: PlaceKind, shore: boolean | undefined): number {
  if (!shore) return 1
  return archetype === 'port' ? 1.35 : 1.18
}

export function carryingCapacity(
  world: World,
  locationId: string,
  settlement?: Settlement,
): number {
  const location = world.locations[locationId]
  // Место без жителей не кормит никого: это не поселение с нулём людей, а
  // земля, на которой людей не бывает.
  if (!location || !isSettlement(location.archetype)) return 0
  const fertility = world.provinces[location.provinceId]?.fertility ?? 0.5
  const base =
    landCapacityOf(location.archetype, location.terrain, fertility) *
    seaCatch(location.archetype, location.shore)
  // Обитель держится не пашней, а округой (этап 51): к её двум сотням душ
  // прибавляются те, кого кормит десятина провинции. Без этого обитель была
  // обречена на свою землю и за век усыхала на две трети.
  const kept = base + titheSupport(world, locationId)
  // Мельница кормит больше ртов с той же земли — значит, и предел выше.
  // Усталость земли сюда не входит: она бьёт по урожаю, а не по тому, сколько
  // народу тут поместится. Когда било по пределу, мир вставал намертво — все
  // места оказывались выше него, расти было некуда, а голода всё равно не было.
  // Мельница кормит больше ртов, колодец снимает нужду в воде: и то и другое
  // поднимает предел. Это и есть «земля растёт, если ты ей дал» (этап 61, В6):
  // своя деревня становится городком по тем же правилам, что и чужая, — просто
  // у чужой некому поставить мельницу.
  const mill = settlement && hasBuilding(settlement, 'mill') ? 1.18 : 1
  const well = settlement && hasBuilding(settlement, 'well') ? 1.08 : 1
  return Math.round(kept * mill * well)
}

/**
 * Во что усталость обходится земле.
 *
 * Выжатое досуха поле кормит вдвое меньше целины. Половина — не случайное
 * число: при меньшем провале мир по-прежнему упирался в потолок и стоял, при
 * большем — вымирал начисто после первой же тесноты.
 */
export function landHealth(strain: number): number {
  return 1 - Math.max(0, Math.min(1, strain)) * 0.3
}

/**
 * Какая доля лишнего хлеба доживает до завтра.
 *
 * Не ноль: запасливое место всё-таки держит больше беспечного, и амбар этим
 * ценен. Но и не единица: куча выше двух норм тает за неделю.
 */
const SPOILAGE = 0.85

/**
 * Во сколько раз быстрее растёт место, которое отстраивают.
 *
 * Не прирост, а возвращение: на пепелище зовут соседскую молодёжь, сажают
 * пришлых, прощают подати на три года. Вдесятеро — это то, при чём город,
 * потерявший людей в голодную весну, возвращает их за несколько лет, а не за
 * век (этап 57, Е3). Втрое было мало: голод отнимал у города восемь процентов
 * в год, а возвращалось три, и за сорок лет от него оставалась половина.
 * Война всё ещё дороже мира: разорённое место поднимается людьми, которых
 * больше нигде не прибавилось.
 */
const REBUILD_SPEED = 10

/** Насколько быстро усталость догоняет ту, какой заслуживает нынешняя пашня. */
const STRAIN_SPEED = 0.0025

/**
 * Запас, с которым живёт мир.
 *
 * Люди перестают множиться раньше, чем съедят последнее зерно. Без этого мир
 * стоял ровно на ста процентах своей еды, и **любая** потеря урожая тут же
 * оборачивалась голодом: усталость земли в шесть процентов давала сорок три
 * тысячи голодных случаев за век вместо двух. Десятая часть запаса — это то,
 * что отличает тяжёлый год от мора.
 */
const GROWTH_HEADROOM = 0.85

/**
 * Докуда месту позволено расти.
 *
 * Обычно — до запаса от того, что кормит его земля. Но рудник и крепость
 * заводились больше, чем земля под ними (IMPORT_RELIANCE): они с первого дня
 * живут привозом. Запрет расти выше земли превращал для них любой голодный год
 * в ступеньку вниз без возврата — за век рудники таяли на две трети. Поэтому
 * своё место возвращает всегда: потолок роста не ниже того числа, с каким оно
 * было основано.
 */
function growthRoom(world: World, locationId: string, ceiling: number): number {
  const founded = world.locations[locationId]?.population ?? 0
  const kind = world.locations[locationId]?.archetype
  // Рудник, крепость и обитель не растут сами: сколько людей им положено,
  // столько и держат. Иначе накормленная короной крепость за сорок лет
  // удваивалась — гарнизон, который сам себя рожает (этап 57).
  if (kind === 'mine' || kind === 'fortress' || kind === 'monastery') return founded
  return Math.max(ceiling * GROWTH_HEADROOM, founded)
}

/**
 * Какой усталости заслуживает нынешняя нагрузка.
 *
 * Считается от **исходного** предела земли, а не от нынешнего: иначе выходит
 * замкнутый круг — устала земля, предел упал, нагрузка выросла, земля устала
 * сильнее. Первый прогон так и кончился: восемьдесят один процент усталости по
 * всему миру и население, срезанное втрое.
 */
function strainTarget(load: number): number {
  // Порог высокий нарочно. При 0.7 усталость садилась на сорок пять процентов
  // по всему миру и не отпускала: земля была не «уставшей», а навсегда вдвое
  // худшей, голод шёл непрерывно (78 тысяч случаев за век), а с ним и мятеж
  // становился погодой — 452 за век. Устаёт только то поле, которое и правда
  // жмут к пределу.
  // Порог чуть ниже запаса, с которым живёт мир (GROWTH_HEADROOM): иначе
  // усталость просыпается только в мгновения, когда место превысило свой
  // предел, и за век земля устаёт на четыре процента — то есть никак.
  return Math.max(0, Math.min(1, (load - 0.75) / 0.4))
}

/** Сколько еды место производит за сутки. */
export function foodCapacity(
  world: World,
  locationId: string,
  config: LifeConfig = LIFE,
  settlement?: Settlement,
): number {
  // Вот где усталость земли видна: выжатое поле родит меньше. Дальше всё
  // работает само — нехватка идёт в голод, голод в разбой и недовольство,
  // люди уходят, пашни отдыхают, урожай возвращается.
  const health = landHealth(settlement?.strain ?? 0)
  // Урожай года — вторая, куда более резкая, причина недорода. Усталость земли
  // приходит годами и отпускает годами, а недород случается за один год и бьёт
  // сразу по всей провинции.
  const year = settlement?.harvest ?? 1
  return carryingCapacity(world, locationId, settlement) * config.foodPerPerson * health * year
}

export function foodStock(settlement: Settlement): number {
  return settlement.stock.grain + settlement.stock.fish
}

/** Насколько место обеспечено едой: 1 — полный амбар, 0 — пусто. */
export function stockDays(settlement: Settlement, config: LifeConfig = LIFE): number {
  // Сколько держит это место: у деревни год, у рудника неделя (economy.ts,
  // `STORE_DAYS`). Амбар не родит хлеба, но позволяет держать запас дольше.
  const own = settlement.storeDays ?? config.daysOfStock
  return own * (hasBuilding(settlement, 'granary') ? 1.8 : 1)
}

export function foodSecurity(settlement: Settlement, config: LifeConfig = LIFE): number {
  const wanted = settlement.population * config.foodPerPerson * stockDays(settlement, config)
  if (wanted <= 0) return 1
  return Math.min(1, foodStock(settlement) / wanted)
}

export type LifeEvent =
  | { readonly type: 'famine'; readonly locationId: string; readonly deaths: number }
  | { readonly type: 'abandoned'; readonly locationId: string }

/** Каким вышел год в провинции. */
export interface HarvestEvent {
  readonly provinceId: string
  /** Доля от обычного урожая. */
  readonly harvest: number
}

export interface HarvestResult {
  readonly settlements: Readonly<Record<string, Settlement>>
  /** Только те провинции, где год не задался: о хорошем годе новостей нет. */
  readonly events: readonly HarvestEvent[]
  readonly rng: Rng
}

/**
 * Границы года.
 *
 * Обычный год — около единицы: земля даёт то, на что рассчитана. Тощий год
 * (`LEAN_CHANCE`) срезает пятую-третью часть, и его переживают запасом и
 * подвозом. Недород (`FAILED_CHANCE`) — это уже беда: половины хлеба нет, и
 * первыми ложатся те, кто своей еды не растит.
 *
 * Числа выбраны по веку: при недороде раз в пятьдесят лет на провинцию мир за
 * сто лет знает голод в каждом десятилетии, но не голодает подряд.
 */
export const LEAN_CHANCE = 0.1
export const FAILED_CHANCE = 0.02

/**
 * Год не только у провинции, но и у всего мира.
 *
 * Провинциальный недород мир переживает не заметив: соседи довозят, и голода
 * не выходит — за век ни одного случая. Голод начинается тогда, когда не
 * задалось у всех сразу: холодное лето, дождливая жатва. Тогда возить нечего и
 * некому, и первыми ложатся те, кто своей еды не растит. Раз в тридцать лет —
 * это тот самый голодный год, который помнят и о котором рассказывают.
 */
export const COLD_YEAR_CHANCE = 0.03
export const GREY_YEAR_CHANCE = 0.15

/** Каким вышел год для всего мира: холодное лето берёт разом все провинции. */
function rollWorldYear(rng: Rng): [number, Rng] {
  const [roll, next] = nextFloat(rng)
  if (roll < COLD_YEAR_CHANCE) {
    return [0.62 + (roll / COLD_YEAR_CHANCE) * 0.16, next]
  }
  if (roll < GREY_YEAR_CHANCE) {
    const share = (roll - COLD_YEAR_CHANCE) / (GREY_YEAR_CHANCE - COLD_YEAR_CHANCE)
    return [0.82 + share * 0.13, next]
  }
  return [0.97 + ((roll - GREY_YEAR_CHANCE) / (1 - GREY_YEAR_CHANCE)) * 0.09, next]
}

/**
 * Новый год на земле: каким он вышел в каждой провинции.
 *
 * Катится раз в году и на провинцию целиком — недород берёт округу, а не
 * отдельный двор. Без этого мир, в котором еды с запасом, не знал голода вовсе:
 * производство было константой, и единственной бедой оставалась война.
 */
export function rollHarvest(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  rng: Rng,
): HarvestResult {
  let generator = rng
  const next: Record<string, Settlement> = { ...settlements }
  const events: HarvestEvent[] = []
  const [worldYear, afterWorld] = rollWorldYear(generator)
  generator = afterWorld
  for (const province of Object.values(world.provinces)) {
    const [roll, afterRoll] = nextFloat(generator)
    generator = afterRoll
    let harvest: number
    if (roll < FAILED_CHANCE) {
      harvest = 0.45 + (roll / FAILED_CHANCE) * 0.2
    } else if (roll < LEAN_CHANCE) {
      harvest = 0.7 + ((roll - FAILED_CHANCE) / (LEAN_CHANCE - FAILED_CHANCE)) * 0.15
    } else {
      harvest = 0.92 + ((roll - LEAN_CHANCE) / (1 - LEAN_CHANCE)) * 0.23
    }
    // Год провинции ложится на год мира: в холодное лето плохо везде, а где-то
    // ещё и вымокло.
    harvest = Math.round(harvest * worldYear * 100) / 100
    if (harvest < 0.9) events.push({ provinceId: province.id, harvest })
    for (const id of province.locationIds) {
      const settlement = next[id]
      if (!settlement) continue
      next[id] = { ...settlement, harvest }
    }
  }
  return { settlements: next, events, rng: generator }
}

export interface LifeResult {
  readonly settlements: Readonly<Record<string, Settlement>>
  readonly events: readonly LifeEvent[]
}

/** Сутки мира: производство, еда, обмен с соседями, голод и рост. */
export function tickDays(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  days: number,
  config: LifeConfig = LIFE,
  fromDay = 1,
): LifeResult {
  if (days <= 0) return { settlements, events: [] }
  const byProvince = groupByProvince(world, settlements)
  const byRegion = groupByRegion(world, settlements)
  const byKingdom = groupByKingdom(world, settlements)
  // По именам, а не по порядку ключей (этап 208, Пр1): дальняя хлебная
  // торговля складывает излишки всего мира, а сложение чисел с точкой от
  // порядка зависит — и мир расходился в последнем знаке.
  const everywhere = [Object.keys(settlements).sort()]

  let current: Record<string, Settlement> = { ...settlements }
  const events: LifeEvent[] = []

  for (let day = 0; day < days; day += 1) {
    current = produceAndEat(world, current, config, events, fromDay + day)
    const today = fromDay + day
    // Обитель живёт не землёй, а тем, что ей несут (этап 51, Х3): своей пашни
    // под ней на две сотни душ. Десятина берётся с людей её провинции — это
    // перенос, а не подарок: сколько пришло в обитель, столько ушло из округи.
    current = collectTithe(world, current, config)
    current = fillGranaries(world, current, config, today)
    current = share(world, current, byProvince, config.provinceTransfer, config, today)
    current = share(world, current, byRegion, config.regionTransfer, config, today)
    current = share(world, current, byKingdom, config.kingdomTransfer, config, today)
    // Дальняя хлебная торговля: горное королевство кормится равнинным.
    current = share(world, current, everywhere, config.worldTransfer, config, today)
  }
  return { settlements: current, events: mergeEvents(events) }
}

// --- сутки ------------------------------------------------------------------

function produceAndEat(
  world: World,
  settlements: Record<string, Settlement>,
  config: LifeConfig,
  events: LifeEvent[],
  day: number,
): Record<string, Settlement> {
  const season = seasonOf(day)
  const growth = SEASON_FOOD[season]
  const next: Record<string, Settlement> = {}
  const arrivals: Record<string, number> = {}

  for (const [id, settlement] of Object.entries(settlements)) {
    if (settlement.population <= 0) {
      next[id] = settlement
      continue
    }

    const stock = { ...settlement.stock }
    // Что даёт земля. Мельница выжимает из того же поля больше.
    const produced =
      foodCapacity(world, id, config, settlement) *
      (hasBuilding(settlement, 'mill') ? 1.18 : 1) *
      growth
    const location = world.locations[id]
    // Рыбу ловят там, где есть вода, а не там, где в провинции написано
    // «побережье» (этап 36). В топях ловят тоже, но меньше: там не море.
    const shore = location?.shore === true
    const marsh = location?.terrain === 'marsh'
    if (shore || marsh) {
      const share = shore ? 0.6 : 0.35
      stock.fish += produced * share
      stock.grain += produced * (1 - share)
    } else {
      stock.grain += produced
    }

    // Что съедают люди: сперва рыбу, она не ждёт. Зимой едят больше — мороз
    // берёт своё, и печь тоже надо чем-то топить (этап 38).
    const needed = settlement.population * config.foodPerPerson * SEASON_EATING[season]
    const fromFish = Math.min(stock.fish, needed)
    stock.fish -= fromFish
    const fromGrain = Math.min(stock.grain, needed - fromFish)
    stock.grain -= fromGrain
    const shortfall = needed - fromFish - fromGrain
    const hunger = needed > 0 ? shortfall / needed : 0

    // Что не съели и не увезли — портится. Без этого хлебная деревня за век
    // накапливала горы зерна: излишек ей девать некуда, а гнить он не гнил.
    // Мир от этого переставал знать голод вовсе — к восьмидесятому году в
    // амбарах лежало на две с половиной тысячи суток вперёд, и холодное лето
    // просто съедало часть кучи. Больше двух норм запаса место не удержит:
    // мыши, сырость, долгоносик.
    const keep = settlement.population * config.foodPerPerson * stockDays(settlement, config) * 2
    const spare = stock.grain + stock.fish
    if (spare > keep && spare > 0) {
      const kept = (keep + (spare - keep) * SPOILAGE) / spare
      stock.grain *= kept
      stock.fish *= kept
    }

    // Прочие товары потихоньку возвращаются к обычному для места уровню.
    const smithy = hasBuilding(settlement, 'smithy')
    // Склад: запасов больше, и возвращаются они быстрее.
    const warehouse = hasBuilding(settlement, 'warehouse')
    const recovery = config.goodsRecovery * (warehouse ? 1.5 : 1)
    const ratios = supplyRatiosOf(world, id)
    for (const good of GOOD_IDS) {
      if (good === 'grain' || good === 'fish') continue
      const craft = smithy && (good === 'tools' || good === 'weapons') ? 1.4 : 1
      const target =
        Math.max(1, Math.round(localNeed(good, settlement.population) * ratios[good])) *
        craft *
        (warehouse ? 1.3 : 1)
      stock[good] = stock[good] + (target - stock[good]) * recovery
    }

    // Стройка идёт своим чередом, пока хозяин в отъезде.
    const building =
      settlement.building && settlement.building.daysLeft > 1
        ? { ...settlement.building, daysLeft: settlement.building.daysLeft - 1 }
        : null
    const buildings =
      settlement.building && settlement.building.daysLeft <= 1
        ? [...settlement.buildings, settlement.building.id]
        : settlement.buildings

    // Голод рождает разбой, сытость его гасит — медленно. Часовня даёт людям
    // терпение, дозорная башня — гасит разбой вдвое быстрее.
    const patience = hasBuilding(settlement, 'chapel') ? 0.6 : 1
    const watch = hasBuilding(settlement, 'watchtower') ? 2 : 1
    const banditry = Math.min(
      1,
      Math.max(0, settlement.banditry + (hunger > 0 ? hunger * 0.03 * patience : -0.004 * watch)),
    )
    // Рекруты возвращаются: подросли, вернулись с отхожих промыслов.
    // При казармах идут охотнее: есть куда прийти и кому учить; корчма зовёт.
    const pool =
      recruitPool(settlement.population) *
      (hasBuilding(settlement, 'barracks') ? 1.5 : 1) *
      (hasBuilding(settlement, 'tavern') ? 1.3 : 1)
    const recruits = Math.min(pool, settlement.recruits + pool * RECRUIT_RECOVERY)

    // Земля устаёт от того, что с неё берут. Пашут в полную силу — беднеет;
    // людей мало, поля под паром — отходит. Отсюда и колебание вместо потолка:
    // упёршийся в предел мир сам себе его опускает, а потом земля отдыхает.
    const ceiling = carryingCapacity(world, id, settlement)
    const target = strainTarget(settlement.population / Math.max(1, ceiling))
    const strain = settlement.strain + (target - settlement.strain) * STRAIN_SPEED

    let population = settlement.population
    if (hunger > 0) {
      const deaths = Math.round(population * config.starvationDeaths * hunger)
      const leaving = Math.round(population * config.starvationMigration * hunger)
      population = Math.max(0, population - deaths - leaving)
      if (deaths > 0) events.push({ type: 'famine', locationId: id, deaths })
      if (leaving > 0) {
        const refuge = bestFedNeighbour(world, settlements, id, config)
        if (refuge) arrivals[refuge] = (arrivals[refuge] ?? 0) + leaving
      }
    } else {
      // Рост тем медленнее, чем теснее. У пустого места прибавка полная, у
      // дошедшего до своего предела — никакой. Так и должно быть: разорённая
      // деревня отстраивается за поколение, а сытый мир у предела не рождает
      // и не хоронит по тридцать тысяч в год — голод в нём снова событие, а
      // не погода.
      // Дробь не округляем — по той же причине, что и рекрутов. Округление
      // сюда уже стоило дорого: пока прибавка не могла быть меньше человека в
      // сутки, любое место меньше пяти тысяч душ росло на триста шестьдесят
      // человек в год независимо от своего размера.
      const room = growthRoom(world, id, ceiling)
      // Разорённое место отстраивают: хозяин зовёт людей, прощает подати,
      // ставит новые дворы. Пока этого не было, за век войны столицы, города и
      // порты теряли пятую часть — набег уносил людей быстрее, чем их успевало
      // народиться, и никто не возвращал их назад (долг версии 0.3).
      const founded = world.locations[id]?.population ?? 0
      // Место зовёт людей, пока не вернуло своё (этап 57, Е3): прежний порог
      // в девять десятых оставлял городу дыру, которую он не мог закрыть —
      // у самого предела прибавка нулевая, и всякая голодная весна опускала
      // город на ступеньку без возврата. За сорок лет это стоило городам
      // сорока пяти процентов людей.
      const ruined = settlement.owner !== null && population < founded
      const speed = config.growth * (ruined ? REBUILD_SPEED : 1)
      if (population < room) population += population * speed * (1 - population / room)
    }

    if (population > 0 && population < config.abandonAt) {
      events.push({ type: 'abandoned', locationId: id })
      population = 0
    }

    next[id] = {
      ...settlement,
      population: Math.round(population * 100) / 100,
      stock: clampStock(stock),
      // Дробь не округляем: суточная прибавка меньше человека, и округление
      // до целого съело бы её полностью — рекруты не восполнялись бы никогда.
      recruits: Math.round(recruits * 100) / 100,
      banditry: Math.round(banditry * 1000) / 1000,
      strain: Math.round(strain * 10000) / 10000,
      building,
      buildings,
    }
  }

  // Беженцы приходят туда, где есть что есть.
  for (const [id, count] of Object.entries(arrivals)) {
    const settlement = next[id]
    if (!settlement) continue
    next[id] = { ...settlement, population: settlement.population + count }
  }
  return next
}

/**
 * Обмен с соседями: у кого излишек, тот делится с теми, кто в нужде.
 *
 * Это и есть «живой мир без игрока» из п.7: пока в провинции есть хлебная
 * деревня, её город переживёт неурожай. Когда деревни не станет — не переживёт.
 */
/**
 * Сколько суток запаса место держит при себе, прежде чем поделиться.
 *
 * Не норму амбара, а то, сколько осталось до нового хлеба: в вересне, сразу
 * после жатвы, делятся скупо — впереди зима; в червене, когда до жатвы месяц,
 * отдают охотно — всё равно сгниёт. Пока норма была одна на весь год, выходило
 * два зла сразу: либо деревня раздавала зимний запас и вымирала сама, либо, при
 * годовой норме, никто никогда не просил помощи — и разбой на дорогах перестал
 * что-либо значить, потому что возить стало нечего.
 */
function keepDays(settlement: Settlement, config: LifeConfig, day: number): number {
  return Math.min(stockDays(settlement, config), daysToHarvest(day) + 10)
}

/**
 * Десятина обителям (этап 51, Х3).
 *
 * Обитель кормится не пашней, а вкладами: с людей своей провинции идёт малая
 * доля хлеба. Берётся только с тех, у кого он есть, и только сверх своего
 * дневного прокорма — голодная деревня обители не подаёт.
 */
function collectTithe(
  world: World,
  settlements: Record<string, Settlement>,
  config: LifeConfig,
): Record<string, Settlement> {
  const next = settlements
  for (const province of Object.values(world.provinces)) {
    const monasteries = province.locationIds.filter(
      (id) => world.locations[id]?.archetype === 'monastery' && next[id],
    )
    if (monasteries.length === 0) continue
    for (const monasteryId of monasteries) {
      const wanted = titheFor(world, next, monasteryId) * config.foodPerPerson
      if (wanted <= 0) continue
      let got = 0
      for (const id of province.locationIds) {
        if (id === monasteryId) continue
        const donor = next[id]
        if (!donor || donor.population <= 0) continue
        const eats = donor.population * config.foodPerPerson
        const spare = Math.max(0, donor.stock.grain - eats * 2)
        if (spare <= 0) continue
        const give = Math.min(spare * 0.02, wanted - got)
        if (give <= 0) continue
        next[id] = takeGrain(donor, give)
        got += give
        if (got >= wanted) break
      }
      const monastery = next[monasteryId]
      if (monastery && got > 0) {
        next[monasteryId] = {
          ...monastery,
          stock: { ...monastery.stock, grain: monastery.stock.grain + got },
        }
      }
    }
  }
  return next
}

/**
 * Житницы (этап 57, Е2).
 *
 * У большого места нет своего поля: город и столица кормятся привозом, а
 * привоз идёт не сам по себе — его собирают податями в натуре и свозят в
 * городской амбар. Крепость и рудник живут тем же: им платят жалованье, на
 * которое покупают хлеб у округи.
 *
 * Считается как перенос: сколько пришло в амбар, столько ушло из деревень —
 * и только из тех, у кого сверх своего прокорма есть излишек.
 */
const GRANARY_KINDS: readonly LocationArchetype[] = [
  'town',
  'city',
  'capital',
  'port',
  'fortress',
  'mine',
]
/** Какую долю недостачи амбар закрывает за сутки. */
const GRANARY_RATE = 0.12

/** Сколько хлеба у места сверх месячной прокормки: с этого и берут подать. */
function spareGrain(one: Settlement | undefined, config: LifeConfig): number {
  if (!one || one.population <= 0) return 0
  return Math.max(0, one.stock.grain - one.population * config.foodPerPerson * 30)
}

function fillGranaries(
  world: World,
  settlements: Record<string, Settlement>,
  config: LifeConfig,
  day: number,
): Record<string, Settlement> {
  const next = settlements
  const byKingdom = new Map<string, string[]>()
  for (const id of Object.keys(next)) {
    const kingdomId = kingdomOf(world, id)?.id ?? 'none'
    const list = byKingdom.get(kingdomId) ?? []
    list.push(id)
    byKingdom.set(kingdomId, list)
  }

  for (const [, ids] of byKingdom) {
    const hungry = ids.filter((id) => {
      const kind = world.locations[id]?.archetype
      if (!kind || !isSettlement(kind) || !GRANARY_KINDS.includes(kind as LocationArchetype)) {
        return false
      }
      const one = next[id]
      if (!one || one.population <= 0) return false
      const wanted = one.population * config.foodPerPerson * keepDays(one, config, day)
      return foodStock(one) < wanted
    })
    if (hungry.length === 0) continue
    // Корона наполняет по чину: сперва престол, потом города, потом крепости и
    // городки. Пока очередь была случайной, престол оставался без хлеба, если
    // до него добрались последним.
    // Сортировка полная (этап 208, Пр2): чин, потом число рта, потом имя. Пока
    // равных разводил порядок ключей в словаре, очередь за хлебом зависела от
    // того, в каком порядке поселения когда-то записались, — то есть ни от чего.
    const queue = [...hungry].sort((a, b) => {
      const kindA = world.locations[a]?.archetype
      const kindB = world.locations[b]?.archetype
      const pullA =
        kindA && isSettlement(kindA) ? (IMPORT_PULL[kindA as LocationArchetype] ?? 1) : 1
      const pullB =
        kindB && isSettlement(kindB) ? (IMPORT_PULL[kindB as LocationArchetype] ?? 1) : 1
      return (
        pullB - pullA || (next[b]?.population ?? 0) - (next[a]?.population ?? 0) || (a < b ? -1 : 1)
      )
    })

    // Подать берут с того, у кого излишка больше, а не с того, кто первым
    // попался в словаре: и правило понятнее, и от порядка ключей не зависит.
    const donors = [...ids].sort((a, b) => {
      const spareA = spareGrain(next[a], config)
      const spareB = spareGrain(next[b], config)
      return spareB - spareA || (a < b ? -1 : 1)
    })

    for (const id of queue) {
      const receiver = next[id]
      if (!receiver) continue
      const wanted = receiver.population * config.foodPerPerson * keepDays(receiver, config, day)
      let need = (wanted - foodStock(receiver)) * GRANARY_RATE
      if (need <= 0) continue
      for (const donorId of donors) {
        if (need <= 0) break
        if (donorId === id) continue
        const donor = next[donorId]
        if (!donor || donor.population <= 0) continue
        // Подать берут с излишка, а не с последнего: голодная деревня податей
        // не платит.
        const spare = spareGrain(donor, config)
        if (spare <= 0) continue
        // По разбойной дороге подать не доезжает — как и всякий обоз.
        const safety = (1 - donor.banditry * 0.5) * (1 - (receiver.banditry ?? 0) * 0.5)
        const give = Math.min(spare * 0.05 * safety, need)
        if (give <= 0) continue
        next[donorId] = takeGrain(donor, give)
        need -= give
      }
      const got = (wanted - foodStock(receiver)) * GRANARY_RATE - need
      if (got > 0) {
        const now = next[id]
        if (now) {
          next[id] = { ...now, stock: { ...now.stock, grain: now.stock.grain + got } }
        }
      }
    }
  }
  return next
}

/**
 * Насколько сильно место тянет привоз (этап 57, Е1).
 *
 * Обоз идёт туда, где за хлеб платят и где его ждут: в город и столицу — в
 * первую очередь, в рудник и крепость — потому что им иначе не жить, в
 * деревню — в последнюю: у неё своё поле.
 */
export const IMPORT_PULL: Record<LocationArchetype, number> = {
  village: 1,
  town: 1.3,
  city: 1.8,
  capital: 2,
  port: 1.4,
  mine: 1.7,
  fortress: 1.7,
  monastery: 1.2,
}

function share(
  world: World,
  settlements: Record<string, Settlement>,
  groups: readonly (readonly string[])[],
  rate: number,
  config: LifeConfig,
  day: number,
): Record<string, Settlement> {
  const next = { ...settlements }

  for (const group of groups) {
    const donors: { id: string; surplus: number }[] = []
    const receivers: { id: string; deficit: number }[] = []

    for (const id of group) {
      const settlement = next[id]
      if (!settlement || settlement.population <= 0) continue
      // Отдают по тому, сколько надо дожить до нового хлеба; просят по тому,
      // сколько место вообще держит (этап 57). Пока и то и другое считалось
      // одним числом, город весной переставал просить ровно тогда, когда у
      // него кончался хлеб: до жатвы оставалось мало дней, и «нужно» падало
      // вместе с ними.
      const wanted = settlement.population * config.foodPerPerson * stockDays(settlement, config)
      const giving =
        settlement.population * config.foodPerPerson * keepDays(settlement, config, day)
      const have = foodStock(settlement)
      // По опасным дорогам возят осторожнее и меньше.
      const safety = 1 - settlement.banditry * 0.5
      // Возят хлеб, а не рыбу: рыба не доезжает. С версии 0.5 у берега появился
      // свой улов, и если бы его развозили по всему королевству, приморская
      // провинция кормила бы горы — мир переставал голодать вовсе.
      if (have > giving * 1.2) {
        const spare = Math.min(have - giving * 1.2, settlement.stock.grain)
        if (spare > 0) donors.push({ id, surplus: spare * rate * safety })
      } else if (have < wanted) {
        // Город тянет сильнее деревни (этап 57): он платит, и обоз идёт к нему
        // первым. Без этого большое место сидело на том же ручейке, что и
        // хутор, а весной теряло людей — за сорок лет города усыхали вдвое.
        const kind = world.locations[id]?.archetype
        const pull = kind && isSettlement(kind) ? (IMPORT_PULL[kind as LocationArchetype] ?? 1) : 1
        receivers.push({ id, deficit: (wanted - have) * pull })
      }
    }
    if (donors.length === 0 || receivers.length === 0) continue

    const offered = donors.reduce((sum, donor) => sum + donor.surplus, 0)
    const wanted = receivers.reduce((sum, receiver) => sum + receiver.deficit, 0)
    const moved = Math.min(offered, wanted)
    if (moved <= 0) continue

    for (const donor of donors) {
      const settlement = next[donor.id]
      if (!settlement) continue
      const give = moved * (donor.surplus / offered)
      next[donor.id] = takeGrain(settlement, give)
    }
    for (const receiver of receivers) {
      const settlement = next[receiver.id]
      if (!settlement) continue
      const sent = moved * (receiver.deficit / wanted)
      // Часть обоза до места не доходит: её берут по дороге. Так голод и
      // разбой начинают кормить друг друга.
      const delivered = sent * (1 - settlement.banditry * 0.8)
      next[receiver.id] = {
        ...settlement,
        stock: { ...settlement.stock, grain: settlement.stock.grain + delivered },
      }
    }
  }
  return next
}

/**
 * Что увозят из амбара: хлеб.
 *
 * Рыбу не увозят — она не доедет. Улов кормит тот берег, который его взял, и в
 * этом вся разница между морем и полем: поле кормит королевство, море кормит
 * побережье (этап 36).
 */
function takeGrain(settlement: Settlement, amount: number): Settlement {
  const fromGrain = Math.min(settlement.stock.grain, amount)
  return {
    ...settlement,
    stock: { ...settlement.stock, grain: settlement.stock.grain - fromGrain },
  }
}

function bestFedNeighbour(
  world: World,
  settlements: Record<string, Settlement>,
  fromId: string,
  config: LifeConfig,
): string | null {
  const location = world.locations[fromId]
  const province = location ? world.provinces[location.provinceId] : undefined
  const region = province ? world.regions[province.regionId] : undefined
  const candidates = region
    ? region.provinceIds.flatMap((id) => world.provinces[id]?.locationIds ?? [])
    : []

  let best: string | null = null
  let bestSecurity = 0
  for (const id of candidates) {
    if (id === fromId) continue
    const settlement = settlements[id]
    if (!settlement || settlement.population <= 0) continue
    const security = foodSecurity(settlement, config)
    if (security > bestSecurity) {
      best = id
      bestSecurity = security
    }
  }
  return best
}

function clampStock(stock: Record<GoodId, number>): Record<GoodId, number> {
  const clean = {} as Record<GoodId, number>
  for (const good of GOOD_IDS) clean[good] = Math.max(0, Math.round(stock[good] * 10) / 10)
  return clean
}

function groupByProvince(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
): readonly (readonly string[])[] {
  return Object.values(world.provinces).map((province) =>
    province.locationIds.filter((id) => id in settlements),
  )
}

function groupByKingdom(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
): readonly (readonly string[])[] {
  return Object.values(world.kingdoms).map((kingdom) =>
    kingdom.regionIds
      .flatMap((regionId) => world.regions[regionId]?.provinceIds ?? [])
      .flatMap((provinceId) => world.provinces[provinceId]?.locationIds ?? [])
      .filter((id) => id in settlements),
  )
}

function groupByRegion(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
): readonly (readonly string[])[] {
  return Object.values(world.regions).map((region) =>
    region.provinceIds
      .flatMap((id) => world.provinces[id]?.locationIds ?? [])
      .filter((id) => id in settlements),
  )
}

/** Слить повторы: за тридцать суток голода незачем тридцать одинаковых строк. */
function mergeEvents(events: readonly LifeEvent[]): readonly LifeEvent[] {
  const famine = new Map<string, number>()
  const merged: LifeEvent[] = []
  for (const event of events) {
    if (event.type === 'famine') {
      famine.set(event.locationId, (famine.get(event.locationId) ?? 0) + event.deaths)
      continue
    }
    if (
      !merged.some((other) => other.type === event.type && other.locationId === event.locationId)
    ) {
      merged.push(event)
    }
  }
  for (const [locationId, deaths] of famine) merged.push({ type: 'famine', locationId, deaths })
  return merged
}
