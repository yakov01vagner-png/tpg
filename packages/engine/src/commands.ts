import type { AttributeId } from './attributes'
import { ATTRIBUTE_LABELS, ATTRIBUTE_MAX } from './attributes'
import type { Band, BandEvent } from './band'
import { bandSize, bandsOnLeg, clash, nextHop, roadHours, tickBands } from './band'
import type { Battle, BattleSide, GroupId, OrderId } from './battle'
import {
  ROUT_MORALE,
  fleeBattle,
  resolveDuel,
  resolveRound,
  startBattle,
  unformUp,
  unitsSize,
} from './battle'
import type { IntrigueKind } from './castle'
import {
  FAVOUR_AUDIENCE,
  courtOf,
  denounceTargets,
  favourOf,
  intriguesFor,
  judgeOf,
  lordHere,
  receptionFor,
} from './castle'
import type { ChainProgress } from './chain'
import { chainDef, chainsOfferedAt, stepDone } from './chain'
import type { Character } from './character'
import {
  FATIGUE_MAX,
  attributeForSkill,
  carried,
  carriedWeight,
  carryCapacity,
  fatigueFactor,
  skillLevel,
} from './character'
import type { CompanionRole } from './companion'
import type { Companion } from './companion'
import { bestSkill, companionDef, following, hireCompanion, witness } from './companion'
import type { Availability, Content, Requirements } from './content'
import { CONTENT } from './content'
import type { BuildingId } from './content/buildings'
import { BUILDINGS } from './content/buildings'
import { TOURNEY_FEE, TOURNEY_PURSE } from './content/castle'
import type { ChainDef } from './content/chains'
import type { CompanionDef, DeedId } from './content/companions'
import { COMPANIONS, DEED_LABELS, TEMPERS } from './content/companions'
import { CRAFT_MASTERS } from './content/craft'
import type { SlotId } from './content/equipment'
import { ITEMS_BY_ID, SLOT_IDS } from './content/equipment'
import { FEAST_DOINGS, PILGRIM_DAYS, PILGRIM_PIETY, RITES_BY_ID } from './content/faith'
import { EXCOMMUNICATED } from './content/faith'
import type { GoodId } from './content/goods'
import { GOODS } from './content/goods'
import { TEMPER_LINES } from './content/lines'
import { ROWS_BY_ID } from './content/merchants'
import type { QuarterId } from './content/quarters'
import type { ShipKind } from './content/ships'
import { SHIPS, SHIP_NAMES } from './content/ships'
import { SITES } from './content/sites'
import type { SpellDef, SpellWhere } from './content/spells'
import { SPELLS_BY_ID } from './content/spells'
import type { TroopId } from './content/troops'
import { TROOPS, TROOP_FOOD_PER_DAY } from './content/troops'
import type { CourtChoice } from './court'
import { courtCase, vassalsOf } from './court'
import type { CechMembership } from './craft'
import {
  CECH_DUES,
  CECH_DUES_DAYS,
  cechAt,
  cechLets,
  cechPay,
  experienceOf,
  masterHires,
  masterOf,
  masterPay,
  masterPraises,
  masterTeaches,
  qualityFrom,
  qualityLabel,
  rankOfShifts,
  shiftsOf,
} from './craft'
import { tickDiplomacy } from './diplomacy'
import {
  PRIME_AGE,
  ageOf,
  agedAttributes,
  deathChance,
  heirCharacter,
  heirOf,
  maybeBirth,
} from './dynasty'
import type { Settlement } from './economy'
import { quoteBuy, quoteSell, withStock } from './economy'
import type { Enterprise } from './enterprise'
import { CARAVAN_COST, SHIPPING_COST, WORKSHOP_COST, tickEnterprises } from './enterprise'
import { gearBonus, horseCarry, repairCost, withItem } from './equipment'
import type { GameEvent, LogKind } from './events'
import { FAIR_TRADE_BONUS, fairAt, feastAt } from './fair'
import {
  PLAYER,
  dailyTax,
  dailyTolls,
  freeSlots,
  garrisonLimit,
  garrisonSize,
  garrisonWages,
  hasBuilding,
  holdingsOf,
  isOwnedByPlayer,
  takeLand,
} from './holding'
import type { Journey } from './journey'
import { journeyLeft, legHoursFor, paceOf } from './journey'
import type { Knowledge } from './knowledge'
import {
  BLIND_DANGER,
  BLIND_SLOW,
  describeLand,
  knowsPlace,
  mapsFor,
  reveal,
  rumourAt,
  seenFrom,
} from './knowledge'
import type { HarvestEvent, LifeEvent } from './life'
import { LIFE, foodSecurity, rollHarvest, tickDays } from './life'
import { MAGIC_RANKS, nextRank, rankTier } from './magic'
import type { PriceLog } from './market'
import { recordPrices } from './market'
import type { Dealing, HagglePush } from './merchant'
import {
  NO_DEALING,
  dealingWith,
  haggle,
  merchantBuyPrice,
  merchantById,
  merchantSellPrice,
  merchantsAt,
  orderFrom,
  talesOf,
} from './merchant'
import type { Membership } from './order'
import {
  DUES_DAYS,
  EXPELLED,
  charterFeels,
  feudChill,
  orderById,
  ordersAt,
  ownOrder,
  ownOrderHere,
  rankLabel,
  rankOf,
} from './order'
import type { Party } from './party'
import {
  DESERTION_MORALE,
  EDIBLE,
  dailyFood,
  dailyWages,
  gearFactor,
  partyCapacity,
  partySize,
  partyStrength,
  troopCount,
  withUnits,
} from './party'
import { isAvailableAt } from './place'
import type { Plague, PlagueEvent } from './plague'
import { plagueAt, tickPlague } from './plague'
import { PROGRESSION, applyCharacterXp, applySkillXp } from './progression'
import {
  activityOf,
  arrivalQuarter,
  hasQuarters,
  quarterFor,
  quarterWhere,
  quartersOf,
  walkMinutes,
} from './quarter'
import { describeQuest, isComplete, offersAt } from './quest'
import type { Quest } from './quest'
import { isShunned, lordRep, placeRep, priceFactor, withLordRep, withPlaceRep } from './reputation'
import type { Reputation } from './reputation'
import type { Rng } from './rng'
import { nextFloat, nextInt, rollChance } from './rng'
import {
  SELF_TAUGHT_FEE,
  canGrantHere,
  isSelfTaught,
  masterAttitude,
  masterStance,
  schoolAt,
} from './school'
import type { SettleEvent } from './settle'
import { tickSettling } from './settle'
import type { Passage, Ship } from './ship'
import {
  ABOARD_MAX,
  HIRE_MAX,
  PASSAGE_LABELS,
  battered,
  fits,
  passageCost,
  repairPrice,
  resalePrice,
  seaHours,
  shipCarries,
  shipDef,
  shipUpkeep,
  waitHours,
} from './ship'
import type { SkillId } from './skills'
import { SKILLS } from './skills'
import { battlePower, bestSpell, castChance } from './spell'
import type { GameState } from './state'
import { appendLog } from './state'
import {
  canPilgrimage,
  feastDoingsAt,
  feastHere,
  graceFor,
  isHolySite,
  offeringFor,
  pietyOf,
  priestAt,
  templeAccepts,
} from './temple'
import { DAYS_PER_YEAR, timeOfDay } from './time'
import type { GameTime } from './time'
import type { TimeWindow } from './time'
import {
  DAY_WINDOW,
  HARVEST_DAY,
  MINUTES_PER_DAY,
  MINUTES_PER_HOUR,
  crossedDayOfYear,
  dayOf,
  formatDuration,
  formatWindow,
  hours,
  isWithinWindow,
  nextTimeOfDay,
  seasonOf,
} from './time'
import type { Lord } from './war'
import { allied, pairOf } from './war'
import type { Politics } from './war'
import type { WarEvent } from './war'
import { atWar, banditBand, lordById, tickPolitics, warband, warsOf } from './war'
import { iceBound, lanesFrom } from './world/lanes'
import { kingdomOf, regionOf, roadsFrom } from './world/queries'
import { fordShut } from './world/rivers'
import type { World } from './world/types'
import { TERRAIN_LABELS, isSettlement, isSite } from './world/types'
import { bedridden, defeatOutcome, healWound } from './wounds'

/**
 * Команды — единственный способ изменить состояние (п.2 дизайн-документа).
 * UI не мутирует состояние сам: он отправляет команду и получает новое.
 */
export type Command =
  /** Просто идущее время: мир живёт, пока игрок стоит и смотрит. */
  | { readonly type: 'tick'; readonly minutes: number }
  | { readonly type: 'travel'; readonly toLocationId: string }
  | { readonly type: 'goQuarter'; readonly quarterId: QuarterId }
  | { readonly type: 'askAround' }
  | { readonly type: 'buyMap'; readonly regionId: string }
  | { readonly type: 'haggle'; readonly merchantId: string; readonly push: HagglePush }
  | {
      readonly type: 'buyFrom'
      readonly merchantId: string
      readonly good: GoodId
      readonly amount: number
    }
  | {
      readonly type: 'sellTo'
      readonly merchantId: string
      readonly good: GoodId
      readonly amount: number
    }
  | { readonly type: 'takeOrder'; readonly merchantId: string }
  | { readonly type: 'askPrices'; readonly merchantId: string }
  /** Цех города (этап 50): вступить и выйти. */
  | { readonly type: 'joinCech' }
  | { readonly type: 'leaveCech' }
  /** Взять ученика в свою мастерскую (этап 50). */
  | { readonly type: 'takeApprentice' }
  /** Храм и вера (этап 51): обряд, вклад, праздник, паломничество. */
  | { readonly type: 'rite'; readonly riteId: string }
  | { readonly type: 'donate'; readonly amount: number }
  | { readonly type: 'joinFeast'; readonly doingId: string }
  | { readonly type: 'pilgrimage' }
  /** Двор чужого лорда (этап 52): приём, дела двора, турнир, суд. */
  | { readonly type: 'seekAudience'; readonly lordId: string; readonly gift: number }
  | {
      readonly type: 'courtIntrigue'
      readonly lordId: string
      readonly kind: IntrigueKind
      readonly targetId?: string
    }
  | { readonly type: 'tourney'; readonly lordId: string }
  | { readonly type: 'petition'; readonly lordId: string }
  /** Уйти морем: своим судном, нанятым или попутным (этап 35). */
  | { readonly type: 'sail'; readonly toLocationId: string; readonly manner: Passage }
  /** Купить судно в порту, починить своё, продать своё. */
  | { readonly type: 'buyShip'; readonly kind: ShipKind }
  | { readonly type: 'repairShip' }
  | { readonly type: 'sellShip' }
  | { readonly type: 'hire'; readonly troop: TroopId; readonly count: number }
  | { readonly type: 'disband'; readonly troop: TroopId; readonly count: number }
  | { readonly type: 'battleOrders'; readonly orders: Readonly<Record<GroupId, OrderId>> }
  | { readonly type: 'battleFlee' }
  | { readonly type: 'battleEnd'; readonly prisoners: 'ransom' | 'recruit' | 'release' }
  /** Поединок: герой лично против лучшего из чужих. Один на бой. */
  | { readonly type: 'duel' }
  /** Откупиться от морских разбойников: заплатить и разойтись (этап 36). */
  | { readonly type: 'payTribute' }
  /** Выкупиться из плена сейчас, не дожидаясь, пока отпустят. */
  | { readonly type: 'payRansom' }
  | { readonly type: 'takeService'; readonly kingdomId: string }
  | { readonly type: 'leaveService' }
  | { readonly type: 'seekEnemy' }
  /** Напасть на войско, стоящее здесь же: война перестаёт быть фоном. */
  | { readonly type: 'attackBand'; readonly bandId: string }
  /** Позвать с собой именного человека. */
  | { readonly type: 'recruitCompanion'; readonly companionId: string }
  | { readonly type: 'dismissCompanion'; readonly companionId: string }
  /** Встать лагерем там, где нет крыши. */
  | { readonly type: 'camp' }
  /** Осмотреться в глуши: что здесь лежит, кроме земли. */
  | { readonly type: 'search' }
  /** Взяться за поручение с лицом. */
  | { readonly type: 'startChain'; readonly chainId: string }
  /** Выкупить пленного спутника: дорого, зато сразу. */
  | { readonly type: 'ransomCompanion'; readonly companionId: string }
  /** Поручить спутнику дело: держать лен или вести караван. */
  | { readonly type: 'assignCompanion'; readonly companionId: string; readonly role: CompanionRole }
  /** Завести своё дело. */
  | { readonly type: 'foundCaravan'; readonly awayId: string }
  /** Отдать своё судно в морской торг: оно ходит само и однажды не вернётся. */
  | { readonly type: 'foundShipping'; readonly awayId: string }
  | { readonly type: 'foundWorkshop' }
  | { readonly type: 'closeEnterprise'; readonly enterpriseId: string }
  /** Закрыть ворота своего места от мора. */
  | { readonly type: 'quarantine' }
  /** Посвататься к дому лорда: брак — это договор, а не украшение. */
  | { readonly type: 'proposeMarriage'; readonly lordId: string }
  | { readonly type: 'build'; readonly building: BuildingId }
  | { readonly type: 'station'; readonly troop: TroopId; readonly count: number }
  | { readonly type: 'withdraw'; readonly troop: TroopId; readonly count: number }
  | { readonly type: 'besiege' }
  | { readonly type: 'siegeWait'; readonly days: number }
  | { readonly type: 'siegeAssault' }
  | { readonly type: 'siegeLift' }
  | { readonly type: 'askForFief' }
  | { readonly type: 'buyItem'; readonly itemId: string }
  | { readonly type: 'craftItem'; readonly itemId: string }
  | { readonly type: 'repairItem'; readonly slot: SlotId }
  | { readonly type: 'outfitParty'; readonly weapons: number }
  | { readonly type: 'giveFood'; readonly amount: number }
  /** Вступить в орден или гильдию там, где они стоят, и выйти (этап 42). */
  | { readonly type: 'joinOrder'; readonly orderId: string }
  | { readonly type: 'leaveOrder' }
  /** Сотворить заклинание вне боя (этап 41). */
  | { readonly type: 'cast'; readonly spellId: string }
  /** Сдать товар тому, кто ждёт его к ярмарке (этап 39). */
  | { readonly type: 'deliverGoods'; readonly good: GoodId; readonly amount: number }
  | { readonly type: 'takeQuest'; readonly questId: string }
  | { readonly type: 'finishQuest'; readonly questId: string }
  | { readonly type: 'abandonQuest'; readonly questId: string }
  | { readonly type: 'proclaimRealm'; readonly name: string }
  | { readonly type: 'inviteLord'; readonly lordId: string }
  /** Двор (этап 43): пожаловать лен вассалу, отнять его, рассудить дело. */
  | { readonly type: 'grantFief'; readonly lordId: string; readonly locationId: string }
  | { readonly type: 'revokeFief'; readonly locationId: string }
  | { readonly type: 'judge'; readonly caseId: string; readonly choice: CourtChoice }
  | { readonly type: 'buy'; readonly good: GoodId; readonly amount: number }
  | { readonly type: 'sell'; readonly good: GoodId; readonly amount: number }
  | { readonly type: 'work'; readonly jobId: string }
  | { readonly type: 'study'; readonly courseId: string }
  | { readonly type: 'takeExam'; readonly examId: string }
  | { readonly type: 'rest'; readonly hours: number }
  | { readonly type: 'sleep' }
  | { readonly type: 'turnBack' }
  | { readonly type: 'spendSkillPoint'; readonly skillId: SkillId }
  | { readonly type: 'spendAttributePoint'; readonly attributeId: AttributeId }

export type FailureCode =
  | 'unknownAction'
  | 'requirements'
  | 'noMoney'
  | 'exhausted'
  | 'closed'
  | 'noPoints'
  | 'maxed'
  | 'rankNotEligible'
  | 'unavailableHere'
  | 'inBattle'
  | 'noRecruits'
  | 'notYours'
  | 'shunned'
  | 'noRoom'
  | 'noGoods'
  | 'overloaded'
  | 'captive'
  | 'wounded'
  | 'onTheRoad'
  | 'flood'
  | 'ice'
  | 'elsewhere'
  | 'invalid'

export type CommandResult =
  | { readonly ok: true; readonly state: GameState; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly code: FailureCode; readonly message: string }

/** Сколько усталости снимает час отдыха и час сна. */
export const REST_RECOVERY_PER_HOUR = 6
export const SLEEP_RECOVERY_PER_HOUR = 12
/** Максимум, который можно «переждать» одной командой. */
export const MAX_REST_HOURS = 12

/**
 * Что можно делать в пути.
 *
 * Всё остальное требует места, а места под ногами нет: под открытым небом не с
 * кем торговать, некому платить за учёбу и негде наниматься. Список нарочно
 * лежит одним куском, а не проверками по всем пятидесяти командам: так видно,
 * чем дорога отличается от деревни.
 */
const ROAD_COMMANDS: ReadonlySet<Command['type']> = new Set([
  'tick',
  'turnBack',
  'camp',
  'rest',
  'sleep',
  'battleOrders',
  'battleFlee',
  'battleEnd',
  'payTribute',
  'cast',
  'duel',
  'payRansom',
  'attackBand',
  'assignCompanion',
  'dismissCompanion',
  'disband',
  'giveFood',
  'outfitParty',
  'abandonQuest',
  'spendSkillPoint',
  'spendAttributePoint',
])

export function applyCommand(
  state: GameState,
  command: Command,
  content: Content = CONTENT,
): CommandResult {
  // Пока идёт бой, мир стоит: ничем, кроме боя, заняться нельзя.
  const fighting = state.battle !== null
  const isBattleCommand =
    command.type === 'battleOrders' ||
    command.type === 'battleFlee' ||
    command.type === 'battleEnd' ||
    command.type === 'duel' ||
    command.type === 'payTribute'
  if (state.over) return fail('invalid', 'Эта история закончена.')
  if (fighting && !isBattleCommand) return fail('inBattle', 'Сейчас не до того — идёт бой.')
  if (!fighting && isBattleCommand) return fail('invalid', 'Боя нет.')
  // В плену можно только ждать, спать и платить: остальное решает тот, кто держит.
  const captivity = state.character.captivity
  if (captivity && !CAPTIVE_COMMANDS.has(command.type)) {
    return fail(
      'captive',
      `Ты в плену, держит ${foeName(state, captivity.captorId)}: жди или плати.`,
    )
  }
  // Рана тяжелее половины — постель: ни дороги, ни работы, ни боя.
  const wound = state.character.wound
  if (wound && bedridden(wound) && BEDRIDDEN_BLOCKS.has(command.type)) {
    return fail('wounded', `Рана не пускает: ещё ${wound.daysLeft} суток в постели.`)
  }
  // В пути — только то, что делают в пути.
  if (state.journey && !ROAD_COMMANDS.has(command.type)) {
    const to = state.world.locations[state.journey.toId]?.name ?? 'дальше'
    return fail(
      'onTheRoad',
      `Ты в пути в ${to}: осталось ${formatDuration(hours(Math.ceil(journeyLeft(state.journey))))}.`,
    )
  }

  // В большом месте дело делают в своём квартале (этап 45): за работой — на
  // рынок, к наставнику — в школу, к лорду — в замок. Мелкое место кварталов не
  // знает, и там всё под рукой.
  // Пустой квартал не держит: это сейв до 0.5 или герой, которого в город
  // поставили минуя дорогу; первый же переход по кварталам всё расставит.
  const activity = activityOf(command)
  if (activity && !state.journey && state.quarter) {
    const needed = quarterFor(state, activity, state.locationId)
    if (needed && state.quarter !== needed) {
      return fail(
        'elsewhere',
        `Это ${quarterWhere(needed)}, а ты ${quarterWhere(state.quarter ?? 'gate')}: ${formatDuration(walkMinutes(state.world, state.locationId))} ходу.`,
      )
    }
  }

  switch (command.type) {
    case 'tick':
      return tick(state, command.minutes)
    case 'goQuarter':
      return goQuarter(state, command.quarterId)
    case 'askAround':
      return askAround(state)
    case 'buyMap':
      return buyMap(state, command.regionId)
    case 'haggle':
      return haggleWith(state, command.merchantId, command.push)
    case 'buyFrom':
      return buyFrom(state, command.merchantId, command.good, command.amount)
    case 'sellTo':
      return sellTo(state, command.merchantId, command.good, command.amount)
    case 'takeOrder':
      return takeOrder(state, command.merchantId)
    case 'askPrices':
      return askPrices(state, command.merchantId)
    case 'joinCech':
      return joinCech(state)
    case 'leaveCech':
      return leaveCech(state)
    case 'takeApprentice':
      return takeApprentice(state)
    case 'rite':
      return rite(state, command.riteId)
    case 'donate':
      return donate(state, command.amount)
    case 'joinFeast':
      return joinFeast(state, command.doingId)
    case 'pilgrimage':
      return pilgrimage(state)
    case 'seekAudience':
      return seekAudience(state, command.lordId, command.gift)
    case 'courtIntrigue':
      return courtIntrigue(state, command.lordId, command.kind, command.targetId)
    case 'tourney':
      return tourney(state, command.lordId)
    case 'petition':
      return petition(state, command.lordId)
    case 'travel':
      return travel(state, command.toLocationId)
    case 'sail':
      return sail(state, command.toLocationId, command.manner)
    case 'buyShip':
      return buyShip(state, command.kind)
    case 'repairShip':
      return repairShip(state)
    case 'sellShip':
      return sellShip(state)
    case 'turnBack':
      return turnBack(state)
    case 'hire':
      return hire(state, command.troop, command.count)
    case 'disband':
      return disband(state, command.troop, command.count)
    case 'battleOrders':
      return battleOrders(state, command.orders)
    case 'battleFlee':
      return battleFlee(state)
    case 'battleEnd':
      return battleEnd(state, command.prisoners)
    case 'duel':
      return duel(state)
    case 'payTribute':
      return payTribute(state)
    case 'payRansom':
      return payRansom(state)
    case 'takeService':
      return takeService(state, command.kingdomId)
    case 'leaveService':
      return leaveService(state)
    case 'seekEnemy':
      return seekEnemy(state)
    case 'attackBand':
      return attackBand(state, command.bandId)
    case 'recruitCompanion':
      return recruitCompanion(state, command.companionId)
    case 'camp':
      return camp(state)
    case 'search':
      return search(state)
    case 'startChain':
      return startChain(state, command.chainId)
    case 'ransomCompanion':
      return ransomCompanion(state, command.companionId)
    case 'dismissCompanion':
      return dismissCompanion(state, command.companionId)
    case 'assignCompanion':
      return assignCompanion(state, command.companionId, command.role)
    case 'foundCaravan':
      return foundCaravan(state, command.awayId)
    case 'foundShipping':
      return foundShipping(state, command.awayId)
    case 'foundWorkshop':
      return foundWorkshop(state)
    case 'closeEnterprise':
      return closeEnterprise(state, command.enterpriseId)
    case 'proposeMarriage':
      return proposeMarriage(state, command.lordId)
    case 'quarantine':
      return quarantine(state)
    case 'build':
      return build(state, command.building)
    case 'station':
      return moveToGarrison(state, command.troop, command.count)
    case 'withdraw':
      return moveFromGarrison(state, command.troop, command.count)
    case 'besiege':
      return besiege(state)
    case 'siegeWait':
      return siegeWait(state, command.days)
    case 'siegeAssault':
      return siegeAssault(state)
    case 'siegeLift':
      return siegeLift(state)
    case 'askForFief':
      return askForFief(state)
    case 'buyItem':
      return buyItem(state, command.itemId)
    case 'craftItem':
      return craftItem(state, command.itemId)
    case 'repairItem':
      return repairItem(state, command.slot)
    case 'outfitParty':
      return outfitParty(state, command.weapons)
    case 'giveFood':
      return giveFood(state, command.amount)
    case 'deliverGoods':
      return deliverGoods(state, command.good, command.amount)
    case 'cast':
      return cast(state, command.spellId)
    case 'joinOrder':
      return joinOrder(state, command.orderId)
    case 'leaveOrder':
      return leaveOrder(state)
    case 'takeQuest':
      return takeQuest(state, command.questId)
    case 'finishQuest':
      return finishQuest(state, command.questId)
    case 'abandonQuest':
      return abandonQuest(state, command.questId)
    case 'proclaimRealm':
      return proclaimRealm(state, command.name)
    case 'inviteLord':
      return inviteLord(state, command.lordId)
    case 'grantFief':
      return grantFief(state, command.lordId, command.locationId)
    case 'revokeFief':
      return revokeFief(state, command.locationId)
    case 'judge':
      return judge(state, command.caseId, command.choice)
    case 'buy':
      return buy(state, command.good, command.amount)
    case 'sell':
      return sell(state, command.good, command.amount)
    case 'work':
      return work(state, command.jobId, content)
    case 'study':
      return study(state, command.courseId, content)
    case 'takeExam':
      return takeExam(state, command.examId, content)
    case 'rest':
      return rest(state, command.hours)
    case 'sleep':
      return sleep(state)
    case 'spendSkillPoint':
      return spendSkillPoint(state, command.skillId)
    case 'spendAttributePoint':
      return spendAttributePoint(state, command.attributeId)
  }
}

/**
 * Можно ли выполнить команду прямо сейчас — и если нет, то почему.
 *
 * Специально сделано прогоном самой команды: `applyCommand` — чистая функция,
 * результат просто выбрасывается. Так интерфейс показывает ровно ту причину
 * отказа, которую получит при нажатии, и правила не приходится дублировать
 * второй раз «для кнопок» (а потом ловить расхождения).
 */
export function canApply(
  state: GameState,
  command: Command,
  content: Content = CONTENT,
):
  | { readonly ok: true }
  | { readonly ok: false; readonly code: FailureCode; readonly message: string } {
  const result = applyCommand(state, command, content)
  return result.ok ? { ok: true } : { ok: false, code: result.code, message: result.message }
}

/** Что доступно в плену. */
const CAPTIVE_COMMANDS: ReadonlySet<Command['type']> = new Set<Command['type']>([
  'tick',
  'rest',
  'sleep',
  'payRansom',
  'spendSkillPoint',
  'spendAttributePoint',
])

/** Чего не сделать с постели. */
const BEDRIDDEN_BLOCKS: ReadonlySet<Command['type']> = new Set<Command['type']>([
  'travel',
  'work',
  'study',
  'takeExam',
  'seekEnemy',
  'attackBand',
  'besiege',
  'siegeAssault',
  'foundCaravan',
])

/**
 * Праздник: в этот день не работают и не учат (этап 39).
 *
 * У каждой короны год немного свой: в Робле неделя поста, у племён конский
 * праздник. Отказ говорит, какой именно, — чтобы игрок знал, что это не
 * поломка, а обычай.
 */
function checkFeast(state: GameState, what: string): CommandResult | null {
  const feast = feastAt(state.world, state.locationId, dayOf(state.time))
  if (!feast) return null
  return fail('closed', `Сегодня ${feast.name}: ${what}.`)
}

/** Как зовут того, кто стоит напротив: лорд, корона или просто разбойники. */
export function foeName(state: GameState, foeId: string | null): string {
  if (!foeId || foeId === 'bandits') return 'разбойники'
  if (foeId === 'pirates') return 'морские разбойники'
  if (foeId.startsWith('crown:')) {
    return state.world.kingdoms[foeId.slice('crown:'.length)]?.name ?? 'короны'
  }
  const lord = lordById(state.politics, foeId)
  return lord ? `${lord.title} ${lord.name}` : 'чужих'
}

// --- команды ---------------------------------------------------------------

/**
 * Переход в соседнюю по дороге локацию.
 *
 * Дорога — это просто длинное действие: модель времени из п.11.1 принимает её
 * без переделки. Ходить можно только к соседу, дальний путь складывается из
 * нескольких переходов — потом в них будет чему случаться.
 */
/**
 * Выйти в путь.
 *
 * Команда больше не переносит героя: она ставит его на дорогу. Дальше идут
 * часы — те же самые, которыми живёт мир, — и путь двигается вместе с ними
 * (`walk`). Прийти можно только дойдя.
 */
/**
 * Перейти в другой квартал (этап 45).
 *
 * Стоит времени, но немного, и ничего больше: город не дорога, засад в нём
 * нет. В месте без кварталов идти некуда.
 */
/** Пришёл — увидел: земля под ногами и то, куда отсюда ведут дороги (этап 46). */
function see(draft: Draft, locationId: string): void {
  if (!draft.knowledge) return
  draft.knowledge = reveal(draft.knowledge, seenFrom(draft.world, locationId))
}

function goQuarter(state: GameState, quarterId: QuarterId): CommandResult {
  const here = quartersOf(state, state.locationId)
  if (!here.includes(quarterId)) return fail('unavailableHere', 'Такого квартала здесь нет.')
  if ((state.quarter ?? null) === quarterId)
    return fail('invalid', `Ты уже ${quarterWhere(quarterId)}.`)
  const draft = open(state)
  advance(draft, walkMinutes(state.world, state.locationId))
  draft.quarter = quarterId
  return close(draft)
}

/**
 * Расспросить в корчме (этап 46).
 *
 * Слух — то, что тут все знают: ближайшая незнакомая герою земля. Стоит
 * кружки и часа. Ничего незнакомого поблизости — и слухов нет.
 */
const RUMOUR_PRICE = 5

function askAround(state: GameState): CommandResult {
  if (!state.knowledge) return fail('invalid', 'Ты и так знаешь всё, что здесь знают.')
  if (!state.settlements[state.locationId]) {
    return fail('unavailableHere', 'Расспрашивать здесь некого.')
  }
  if (state.character.money < RUMOUR_PRICE) {
    return fail('noMoney', `Без кружки не разговорятся: нужно ${RUMOUR_PRICE}.`)
  }
  const rumour = rumourAt(state, state.locationId)
  const draft = open(state)
  addMoney(draft, -RUMOUR_PRICE)
  advance(draft, hours(1))
  if (!rumour) {
    notice(draft, 'В корчме говорят о том, что ты и сам видел: ничего нового.')
    return close(draft)
  }
  draft.knowledge = reveal(state.knowledge, [rumour.provinceId])
  const via = state.world.locations[rumour.viaId]?.name ?? 'дорога'
  notice(draft, `В корчме слышал: за ${via} лежит ${describeLand(state.world, rumour.provinceId)}.`)
  return close(draft)
}

/** Купить карту области (этап 46): знание — товар. */
function buyMap(state: GameState, regionId: string): CommandResult {
  if (!state.knowledge) return fail('invalid', 'Карта тебе ни к чему: ты знаешь эти земли.')
  const map = mapsFor(state, state.locationId).find((one) => one.regionId === regionId)
  if (!map) return fail('unavailableHere', 'Такой карты здесь не продают.')
  if (state.character.money < map.price) {
    return fail('noMoney', `За карту просят ${map.price}, а у тебя ${state.character.money}.`)
  }
  const region = state.world.regions[regionId]
  const draft = open(state)
  addMoney(draft, -map.price)
  advance(draft, 30)
  draft.knowledge = reveal(state.knowledge, region?.provinceIds ?? [])
  notice(draft, `Куплена карта: ${map.name}. Открыто земель: ${map.fresh}.`)
  return close(draft)
}

function travel(state: GameState, toLocationId: string): CommandResult {
  const destination = state.world.locations[toLocationId]
  if (!destination) return fail('unknownAction', 'Такого места нет.')

  const road = roadsFrom(state.world, state.locationId).find(
    (candidate) => candidate.to === toLocationId,
  )
  if (!road) return fail('unknownAction', `Отсюда нет прямой дороги в ${destination.name}.`)

  // Весной брод уходит под воду: мелкое место — не мост (rivers.ts). Обход
  // есть всегда, потому что реку переходят не в одном месте.
  if (fordShut(state.world, toLocationId, dayOf(state.time))) {
    return fail('flood', `Половодье: ${destination.name} под большой водой, вброд не пройти.`)
  }

  // К мёртвому месту дорога заросла: идти вдвое дольше (band.ts, OVERGROWN).
  const roadHoursNow = roadHours(state.world, state.settlements, state.locationId, road.to)
  // Незнакомой землёй идут дольше: дороги не знаешь, спрашиваешь, плутаешь
  // (этап 46). Незнание чего-то стоит — и считается.
  const blind = !knowsPlace(state, toLocationId)
  const walking = Math.round(
    legHoursFor(
      roadHoursNow,
      paceOf(state.party, state.character.wound !== null),
      seasonOf(dayOf(state.time)),
    ) * (blind ? BLIND_SLOW : 1),
  )
  const blocked = checkFatigue(state.character, travelFatigue(walking))
  if (blocked) return blocked

  const from = state.world.locations[state.locationId]
  const draft = open(state)
  notice(
    draft,
    `Дорога${from ? ` из ${from.name}` : ''} в ${destination.name}: ${formatDuration(hours(walking))} пути${
      roadHoursNow > road.hours ? ' — заросла, идти дольше' : ''
    }${blind ? ' — земля незнакомая, идти вслепую' : ''}.`,
  )
  draft.journey = { fromId: state.locationId, toId: toLocationId, hours: walking, done: 0 }
  return close(draft)
}

/**
 * Уйти морем.
 *
 * Тот же путь, что и по дороге, только часы считает вода: расстояние по морю,
 * судно и то, чьё оно. Способов три, и это не три кнопки одного и того же.
 * Своё судно уходит когда хочешь и берёт всю дружину, но стоит как три
 * каравана и тонет вместе с тобой. Нанятое — дорого за раз, зато сразу и
 * почти на всех. Попутное — гроши, но ждать отплытия, идти дольше и взять с
 * собой шестерых: чужому шкиперу рать на палубе не нужна.
 */
function sail(state: GameState, toLocationId: string, manner: Passage): CommandResult {
  const destination = state.world.locations[toLocationId]
  if (!destination) return fail('unknownAction', 'Такого места нет.')
  const lane = lanesFrom(state.world, state.locationId).find((one) => one.to === toLocationId)
  if (!lane) return fail('unknownAction', `Отсюда нет морского пути в ${destination.name}.`)
  // Зимой море встаёт: до весны никто никуда не идёт (этап 38).
  if (iceBound(dayOf(state.time))) {
    return fail('ice', 'Море встало. До весны из гавани не выйти.')
  }
  if (manner === 'own' && !state.ship) {
    return fail('requirements', 'Своего судна у тебя нет.')
  }
  if (!fits(manner, state.party, state.ship)) {
    const people = partySize(state.party) + 1
    return fail(
      'noRoom',
      manner === 'own'
        ? `На борт влезет ${shipCarries(state.ship as NonNullable<typeof state.ship>)}, а вас ${people}.`
        : manner === 'hire'
          ? `Столько на нанятое судно не берут: ${people} против ${HIRE_MAX}.`
          : `Попутный шкипер возьмёт шестерых, а не ${people}. Рать на чужой палубе никому не нужна.`,
    )
  }

  const hours = seaHours(lane.hours, manner, state.ship)
  const people = partySize(state.party) + 1
  const cost = Math.round(
    passageCost(manner, hours, people) * (ownOrderHere(state)?.perks.sea ?? 1),
  )
  if (cost > state.character.money) {
    return fail('noMoney', `За перевоз просят ${cost}, а у тебя ${state.character.money}.`)
  }
  const blocked = checkFatigue(state.character, travelFatigue(hours) / 2)
  if (blocked) return blocked

  const draft = open(state)
  const wait = waitHours(manner)
  if (cost > 0) addMoney(draft, -cost)
  notice(
    draft,
    `Морем в ${destination.name}: ${formatDuration(hoursOf(hours))} ходу, ${PASSAGE_LABELS[manner]}${
      cost > 0 ? `, за ${cost}` : ''
    }.${wait > 0 ? ` Отплытие ждали ${formatDuration(hoursOf(wait))}.` : ''}`,
  )
  // Ожидание отплытия — это уже время: чужое судно уходит по своей надобности.
  if (wait > 0) advance(draft, hoursOf(wait))
  draft.journey = {
    fromId: state.locationId,
    toId: toLocationId,
    hours,
    done: 0,
    sea: true,
    manner,
  }
  return close(draft)
}

/** Часы в минуты — в этом файле `hours` уже занято именем импорта. */
function hoursOf(count: number): number {
  return hours(count)
}

/**
 * Купить судно.
 *
 * Только в гавани, из которой есть куда плыть: судно продают там, где его
 * строят и держат. Цена — как у трёх караванов, и это правильная цена: корабль
 * открывает половину карты и тонет вместе со всем, что на нём.
 */
function buyShip(state: GameState, kind: ShipKind): CommandResult {
  const def = SHIPS[kind]
  if (!def) return fail('unknownAction', 'Таких судов не строят.')
  if (lanesFrom(state.world, state.locationId).length === 0) {
    return fail('unavailableHere', 'Судно покупают в гавани, а не здесь.')
  }
  if (state.ship) return fail('requirements', 'У тебя уже есть судно. Двумя сразу не ходят.')
  if (state.character.money < def.price) {
    return fail(
      'noMoney',
      `За ${def.label.toLowerCase()} просят ${def.price}, а у тебя ${state.character.money}.`,
    )
  }

  const draft = open(state)
  const [index, afterName] = nextInt(draft.rng, 0, SHIP_NAMES.length - 1)
  draft.rng = afterName
  const name = SHIP_NAMES[index] ?? 'Чайка'
  addMoney(draft, -def.price)
  advance(draft, hoursOf(3))
  draft.ship = { kind, name, condition: 1 }
  notice(draft, `Куплено судно: ${def.label.toLowerCase()} «${name}» за ${def.price}.`, 'trade')
  return close(draft)
}

function repairShip(state: GameState): CommandResult {
  const ship = state.ship
  if (!ship) return fail('requirements', 'Чинить нечего: судна нет.')
  if (lanesFrom(state.world, state.locationId).length === 0) {
    return fail('unavailableHere', 'Судно чинят в гавани.')
  }
  const price = Math.round(repairPrice(ship) * (ownOrderHere(state)?.perks.sea ?? 1))
  if (price <= 0) return fail('invalid', `«${ship.name}» и так цела.`)
  if (state.character.money < price) {
    return fail('noMoney', `Починка стоит ${price}, а у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -price)
  advance(draft, hoursOf(8))
  draft.ship = { ...ship, condition: 1 }
  notice(draft, `«${ship.name}» проконопачена и просмолена. Отдано ${price}.`, 'trade')
  return close(draft)
}

function sellShip(state: GameState): CommandResult {
  const ship = state.ship
  if (!ship) return fail('requirements', 'Продавать нечего.')
  if (lanesFrom(state.world, state.locationId).length === 0) {
    return fail('unavailableHere', 'Судно продают в гавани.')
  }
  const price = resalePrice(ship)
  const draft = open(state)
  addMoney(draft, price)
  advance(draft, hoursOf(2))
  draft.ship = null
  notice(draft, `«${ship.name}» продана за ${price}.`, 'trade')
  return close(draft)
}

/**
 * Откупиться.
 *
 * Морскому разбойнику нужен не бой, а груз: он берёт мзду и уходит, потому что
 * драка на воде дорога обеим сторонам. На суше такого выбора нет — там от
 * разбойников уходят или отбиваются, — и в этом разница между дорогой и морем:
 * в море есть с кем договориться, но платить приходится всегда.
 *
 * Цена — по головам на чужой палубе: чем их больше, тем наглее запрос. Отряд
 * это запоминает: платить вместо драки дёшево для кошелька и дорого для духа.
 */
const TRIBUTE_PER_HEAD = 22

function payTribute(state: GameState): CommandResult {
  const battle = state.battle
  if (!battle) return fail('invalid', 'Боя нет.')
  if (battle.foeId !== 'pirates') {
    return fail('invalid', 'С этими не договариваются.')
  }
  if (battle.outcome !== 'ongoing') return fail('invalid', 'Всё уже решилось.')
  const asked = Math.max(40, Math.round(unitsSize(battle.enemy.units) * TRIBUTE_PER_HEAD))
  if (state.character.money < asked) {
    return fail('noMoney', `За проход просят ${asked}, а у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -asked)
  draft.battle = null
  // Дух падает: люди видели, как их провели мимо драки за деньги.
  draft.party = { ...draft.party, morale: Math.max(0, draft.party.morale - 8) }
  notice(draft, `Заплачено ${asked} — и чёрный парус отвернул. Люди молчат.`)
  return close(draft)
}

/** Повернуть назад: то, чего у мгновенного перемещения быть не могло. */
function turnBack(state: GameState): CommandResult {
  const journey = state.journey
  if (!journey) return fail('invalid', 'Ты никуда не идёшь.')
  const draft = open(state)
  const home = state.world.locations[journey.fromId]?.name ?? 'откуда вышел'
  notice(draft, `Поворот назад: обратно в ${home}.`)
  // Пройденное становится оставшимся: назад идти ровно столько, сколько прошёл.
  draft.journey = {
    fromId: journey.toId,
    toId: journey.fromId,
    hours: journey.hours,
    done: journey.hours - journey.done,
  }
  return close(draft)
}

/**
 * Часы пути.
 *
 * Дорога идёт вместе с миром: сколько прошло времени, столько и прошли. Отсюда
 * же берутся усталость и навык — не разом на выходе, а по мере ходьбы.
 */
/**
 * Ночью идут медленнее.
 *
 * Не запрет, а цена: в темноте можно идти, но за час проходишь три пятых
 * дневного. Вместе с ночной опасностью (`NIGHT_DANGER`) это и делает привал
 * решением: встать лагерем до света или тащиться впотьмах.
 */
const NIGHT_PACE = 0.6

function walk(draft: Draft, minutes: number): void {
  const journey = draft.journey
  if (!journey || minutes <= 0) return
  // Море идёт по своим правилам: там не ночуют на обочине и не встречают
  // обозов (этап 35).
  if (journey.sea) {
    float(draft, minutes)
    return
  }
  const dark =
    timeOfDay(draft.base.time) === 'night' && (draft.character.lit ?? 0) <= draft.base.time
  const walked = Math.min(
    (minutes / MINUTES_PER_HOUR) * (dark ? NIGHT_PACE : 1),
    journeyLeft(journey),
  )
  if (walked <= 0) return
  addFatigue(draft, travelFatigue(walked))
  practice(draft, 'athletics', walked * 2.5)
  practice(draft, 'survival', walked * 1.5)
  const done = Math.round((journey.done + walked) * 100) / 100
  if (done < journey.hours) {
    draft.journey = { ...journey, done }
    // Пока идём — дорога сама по себе: кто ждёт впереди и кто говорит рядом.
    roadWatch(draft, journey)
    roadTalk(draft)
    // Опасность считается по часам на дороге, а не по пройденному: ночью и
    // идёшь медленнее, и ждут чаще, поэтому ночной переход стоит вдвое дороже
    // дневного при той же земле.
    roadAmbush(draft, journey, minutes / MINUTES_PER_HOUR)
    roadMeet(draft, journey, minutes / MINUTES_PER_HOUR)
    return
  }

  // Пришли.
  draft.journey = null
  draft.locationId = journey.toId
  draft.quarter = arrivalQuarter(draft, journey.toId)
  see(draft, journey.toId)
  const place = draft.world.locations[journey.toId]
  notice(draft, `Пришли: ${place?.name ?? 'место'}.`)
  roadTalk(draft)
}

/**
 * Час под парусом.
 *
 * Тот же счётчик часов, что и на дороге, но всё остальное другое. Ночь не
 * замедляет: судно идёт и в темноте, вахту стоят по очереди. Устают вдвое
 * меньше — идёт судно, а не ты. И вместо засады на отрезке — погода и те, кто
 * ходит под чужим флагом.
 */
const SEA_FATIGUE = 0.5

function float(draft: Draft, minutes: number): void {
  const journey = draft.journey
  if (!journey || minutes <= 0) return
  const sailed = Math.min(minutes / MINUTES_PER_HOUR, journeyLeft(journey))
  if (sailed <= 0) return
  addFatigue(draft, Math.round(travelFatigue(sailed) * SEA_FATIGUE))
  practice(draft, 'survival', sailed * 1.2)
  const done = Math.round((journey.done + sailed) * 100) / 100
  if (done < journey.hours) {
    draft.journey = { ...journey, done }
    seaWeather(draft, sailed)
    seaRaiders(draft, sailed)
    return
  }

  // Пришли.
  draft.journey = null
  draft.locationId = journey.toId
  // С моря сходят на пристань, а не к воротам.
  draft.quarter = hasQuarters(draft, journey.toId) ? 'harbour' : null
  see(draft, journey.toId)
  const place = draft.world.locations[journey.toId]
  notice(draft, `Сошли на берег: ${place?.name ?? 'гавань'}.`)
  roadTalk(draft)
}

/**
 * Погода в море.
 *
 * Шторм и штиль — это одно и то же с точки зрения пути: время, которого не
 * было в расчёте. Разница в том, что штиль только держит, а шторм ещё и треплет
 * судно и заставляет выбрасывать за борт товар. Своё судно от этого ветшает —
 * потому его и чинят в порту, а не «оно само».
 */
const STORM_CHANCE = 0.022
const CALM_CHANCE = 0.03

function seaWeather(draft: Draft, hoursAtSea: number): void {
  const journey = draft.journey
  if (!journey || hoursAtSea <= 0) return
  // Тишь (этап 41): море спит до самого берега.
  if (journey.calm) return

  const [calm, afterCalm] = rollChance(draft.rng, Math.min(0.5, CALM_CHANCE * hoursAtSea))
  draft.rng = afterCalm
  if (calm) {
    const [lost, afterLost] = nextInt(draft.rng, 1, 4)
    draft.rng = afterLost
    draft.journey = { ...journey, hours: journey.hours + lost }
    notice(draft, `Штиль. Парус повис, и ${formatDuration(hours(lost))} прошли впустую.`, 'world')
    return
  }

  const [storm, afterStorm] = rollChance(draft.rng, Math.min(0.5, STORM_CHANCE * hoursAtSea))
  draft.rng = afterStorm
  if (!storm) return
  const [blown, afterBlown] = nextInt(draft.rng, 2, 7)
  draft.rng = afterBlown
  const current = draft.journey
  if (current) draft.journey = { ...current, hours: current.hours + blown }
  notice(draft, `Шторм. Судно отнесло, и до берега ещё ${formatDuration(hours(blown))}.`, 'world')

  // За борт идёт то, что тяжелее людей.
  const [share, afterShare] = nextFloat(draft.rng)
  draft.rng = afterShare
  if (share < 0.45) tossCargo(draft)

  const ship = draft.ship
  if (!ship) return
  const [force, afterForce] = nextInt(draft.rng, 6, 18)
  draft.rng = afterForce
  const beaten = battered(ship, force / 100)
  draft.ship = beaten
  if (beaten.condition > 0) {
    notice(draft, `«${ship.name}» приняла воды: целость ${Math.round(beaten.condition * 100)}%.`)
    return
  }
  // Судно не пережило. Хозяина подобрали — судно нет.
  draft.ship = null
  notice(draft, `«${ship.name}» не выдержала. Судна больше нет; вас сняли с обломков.`, 'world')
  // Вместе с судном тонет и чужой груз: за фрахт теперь не заплатят, а тот, кто
  // его доверил, это запомнит.
  const freight = draft.quests.filter((quest) => quest.type === 'freight')
  if (freight.length > 0) {
    draft.quests = draft.quests.filter((quest) => quest.type !== 'freight')
    for (const lost of freight) {
      draft.reputation = withPlaceRep(draft.reputation, lost.issuerLocationId, -6)
    }
    notice(draft, 'Чужой груз ушёл на дно вместе с судном. Об этом узнают в порту.', 'trade')
  }
}

/** Что выбрасывают за борт: половину самого тяжёлого из котомки. */
function tossCargo(draft: Draft): void {
  const inventory = { ...draft.character.inventory }
  let worst: GoodId | null = null
  let most = 0
  for (const [good, amount] of Object.entries(inventory)) {
    if ((amount ?? 0) > most) {
      most = amount ?? 0
      worst = good as GoodId
    }
  }
  if (!worst || most <= 0) return
  const lost = Math.max(1, Math.round(most / 2))
  inventory[worst] = most - lost
  draft.character = { ...draft.character, inventory }
  notice(draft, `За борт пошло ${lost} — ${GOODS[worst].label.toLowerCase()}. Волна не спрашивает.`)
}

/**
 * Те, кто ходит под чужим флагом.
 *
 * В море разбойник опаснее дорожного: уйти некуда, и свидетелей не остаётся.
 * Отряд принимает бой на палубе, одиночку обирают до нитки — как и на дороге,
 * только дороже.
 */
const PIRATE_CHANCE = 0.012

/**
 * Насколько чаще ждут в дальних водах.
 *
 * Пути к островам идут мимо бухт, в которые заходят не спрашивая позволения:
 * там чужого паруса вдвое больше, чем на виду у корон. Это и есть разница
 * между морем внутренним и морем открытым.
 */
const WILD_WATERS = 2

function seaRaiders(draft: Draft, hoursAtSea: number): void {
  if (draft.battle || hoursAtSea <= 0) return
  const journey = draft.journey
  const offshore = [journey?.fromId, journey?.toId].some((id) => {
    const provinceId = id ? draft.base.world.locations[id]?.provinceId : undefined
    return provinceId ? draft.base.world.provinces[provinceId]?.island === true : false
  })
  const risk = PIRATE_CHANCE * (offshore ? WILD_WATERS : 1)
  const [met, afterMet] = rollChance(draft.rng, Math.min(0.4, risk * hoursAtSea))
  draft.rng = afterMet
  if (!met) return

  if (partySize(draft.party) >= 3) {
    const [band, afterBand] = banditBand(0.6, 400, draft.rng)
    draft.rng = afterBand
    draft.battle = startBattle(draft.party, band, 'coast', { foeId: 'pirates' })
    notice(draft, 'Из-за мыса вышли под чёрным парусом. Уйти некуда — только драться.')
    return
  }
  const loss = Math.round(draft.character.money * 0.4)
  if (loss > 0) addMoney(draft, -loss)
  tossCargo(draft)
  notice(
    draft,
    loss > 0
      ? `Пираты взяли ${loss} монет и ушли. Могли и за борт.`
      : 'Пираты обшарили и отпустили: взять нечего.',
  )
}

/**
 * Что видно с дороги.
 *
 * Войско на том конце отрезка видно заранее — это и есть разница между «идти» и
 * «оказаться»: у мгновенного перемещения предупредить было некогда.
 */
function roadWatch(draft: Draft, journey: Journey): void {
  if (journey.done > 0) return
  const hosts = draft.bands.filter((band) => band.locationId === journey.toId && !band.travel)
  const host = hosts[0]
  if (!host) return
  const where = draft.base.world.locations[journey.toId]?.name ?? 'впереди'
  notice(
    draft,
    `Впереди на дороге войско: ${foeName(draft.base, host.lordId)} у ${where}.`,
    'world',
  )
}

/**
 * Насколько часто на отрезке сходятся лицом к лицу.
 *
 * Не каждый час: дорога широка, обозы расходятся, войско видит путника раньше,
 * чем путник войско. Но за долгий переход мимо чужой рати не пройти.
 */
const MEET_CHANCE = 0.2

/**
 * Встреча с чужой дружиной на отрезке.
 *
 * Перехват работает в обе стороны: не только игрок ловит идущих грабить, но и
 * его самого можно поймать в поле. Воюющие берут в бой, прочие расходятся — и о
 * них говорят.
 */
function roadMeet(draft: Draft, journey: Journey, hoursOnRoad: number): void {
  if (draft.battle || hoursOnRoad <= 0) return
  const met = bandsOnLeg(draft.bands, journey.fromId, journey.toId)[0]
  if (!met) return
  const [meets, afterMeet] = rollChance(draft.rng, Math.min(0.6, MEET_CHANCE * hoursOnRoad))
  draft.rng = afterMeet
  if (!meets) return

  const side = draft.service ?? draft.realm?.name ?? null
  const theirs = met.kingdomId ?? met.lordId
  const hostile = side !== null && atWar(draft.politics, side, theirs)
  const who = foeName(draft.base, met.lordId)
  if (!hostile || partySize(draft.party) < 2) {
    notice(draft, `Разминулись на дороге: ${who} идёт своей дорогой.`, 'world')
    return
  }
  const ahead = draft.base.world.locations[journey.toId]
  draft.bands = draft.bands.filter((one) => one.id !== met.id)
  const enemy: BattleSide = { name: who, units: met.units, morale: met.morale, fatigue: 0 }
  draft.battle = startBattle(draft.party, enemy, ahead?.terrain ?? 'plains', {
    foeId: met.kingdomId ? `crown:${met.kingdomId}` : met.lordId,
  })
  notice(draft, `На дороге встретились: ${who}. Расходиться поздно.`)
}

/** Сколько народу «водится» в глуши: у места без жителей своего населения нет. */
const WILD_PARTY = 500

/**
 * Встреча на дороге.
 *
 * Шайки водятся там, где голодно и разорено, поэтому опасность дороги — прямое
 * следствие экономики, а не случайное событие по таймеру. Одиночку не убивают,
 * а обирают: драться с ним незачем.
 */
/**
 * Насколько опасна земля места: разбой округи и дурная слава самой глуши.
 *
 * Опасность пути — свойство земли, а не только разбойной округи. Пока она
 * считалась по разбою места назначения, в урочище и на перевале не могло
 * случиться ничего: поселения там нет, а значит нет и разбоя.
 */
function dangerAt(draft: Draft, locationId: string): number {
  const here = draft.base.world.locations[locationId]
  if (!here) return 0
  const banditry = draft.settlements[locationId]?.banditry ?? 0
  const wild = isSite(here.archetype) ? SITES[here.archetype].danger : 0
  // Незнакомая земля опаснее: не знаешь, где ждут (этап 46).
  const blind = knowsPlace(draft.base, locationId) ? 1 : BLIND_DANGER
  return Math.min(0.45, (0.02 + banditry * 0.5 + wild * 0.3) * blind)
}

/**
 * Встреча на отрезке пути.
 *
 * Засада случается **на дороге**, а не в точке прибытия: земля отрезка — это
 * оба его конца, и хуже тот, что хуже. Считается на каждый час пути, поэтому
 * долгая дорога и правда опаснее короткой, а ночь опаснее дня — в темноте на
 * тракте ждут чаще.
 */
const NIGHT_DANGER = 1.6
/** За сколько часов пути набирается опасность целого отрезка старого мира. */
const AMBUSH_SPAN = 4

function roadAmbush(draft: Draft, journey: Journey, hoursOnRoad: number): void {
  if (hoursOnRoad <= 0) return
  const ahead = dangerAt(draft, journey.toId)
  const behind = dangerAt(draft, journey.fromId)
  const land = Math.max(ahead, behind)
  const night = timeOfDay(draft.time) === 'night' ? NIGHT_DANGER : 1
  const risk = Math.min(0.5, (land / AMBUSH_SPAN) * hoursOnRoad * night)
  const [meets, afterMeet] = rollChance(draft.rng, risk)
  draft.rng = afterMeet
  if (!meets) return
  // Ждут там, где хуже: у того конца отрезка, чья земля опаснее.
  ambush(draft, ahead >= behind ? journey.toId : journey.fromId, true)
}

function ambush(draft: Draft, locationId: string, onTheRoad = false): void {
  const here = draft.base.world.locations[locationId]
  if (!here) return
  // Оберег (этап 41): пока он держится, засада ждёт кого-то другого.
  if ((draft.character.warded ?? 0) > draft.time) return
  // На земле своего ордена своих трогают реже (этап 42).
  const roads = ownOrderHere(draft.base, locationId)?.perks.roads ?? 1
  if (roads < 1) {
    const [spared, afterSpare] = rollChance(draft.rng, 1 - roads)
    draft.rng = afterSpare
    if (spared) return
  }
  const settlement = draft.settlements[locationId]
  const banditry = settlement?.banditry ?? 0
  const wild = isSite(here.archetype) ? SITES[here.archetype].danger : 0
  if (!onTheRoad) {
    const risk = Math.min(0.45, 0.02 + banditry * 0.5 + wild * 0.3)
    const [meets, afterMeet] = rollChance(draft.rng, risk)
    draft.rng = afterMeet
    if (!meets) return
  }

  const terrain = here.terrain
  const lurking = Math.max(banditry, wild)
  const around = settlement?.population ?? WILD_PARTY
  if (partySize(draft.party) >= 3) {
    const [band, afterBand] = banditBand(lurking, around, draft.rng)
    draft.rng = afterBand
    draft.battle = startBattle(draft.party, band, terrain, { foeId: 'bandits' })
    notice(
      draft,
      onTheRoad
        ? `На дороге ждали: разбойники. ${TERRAIN_LABELS[terrain]} — хорошее место для засады.`
        : 'На дороге ждали: разбойники.',
    )
    return
  }

  const loss = Math.round(draft.character.money * 0.3)
  if (loss > 0) addMoney(draft, -loss)
  notice(
    draft,
    loss > 0
      ? `Разбойники вытрясли ${loss} монет и отпустили.`
      : 'Разбойники обшарили и отпустили: взять нечего.',
  )
}

/**
 * Мороз забирает своё.
 *
 * Ночь в поле зимой — это не «отдохнул хуже»: это отмороженные пальцы у того,
 * кто не умеет ночевать в снегу. Выживание убирает беду почти совсем, и это тот
 * случай, когда навык виден не числом в листе, а тем, что с тобой не случилось.
 */
function frostbite(draft: Draft): void {
  if (draft.character.wound) return
  if ((draft.character.warded ?? 0) > draft.time) return
  const skill = skillLevel(draft.character, 'survival')
  const risk = Math.max(0, 0.3 - skill * 0.04)
  const [bitten, afterRoll] = rollChance(draft.rng, risk)
  draft.rng = afterRoll
  if (!bitten) return
  const [days, afterDays] = nextInt(draft.rng, 3, 7)
  draft.rng = afterDays
  draft.character = { ...draft.character, wound: { daysLeft: days, severity: 0.2 } }
  notice(draft, 'Мороз достал: пальцы не гнутся, лицо в белых пятнах. Это пройдёт, но не завтра.')
}

/** Дорога выматывает примерно как работа: три с половиной единицы за час хода. */
export function travelFatigue(roadHours: number): number {
  return Math.round(roadHours * 3.5)
}

/**
 * Ход времени сам по себе.
 *
 * Отдельная команда, а не часть каждой другой: мир должен идти и тогда, когда
 * игрок ничего не делает. Стоять — не то же самое, что отдыхать: усталость
 * сходит вдвое медленнее, чем на привале.
 */
function tick(state: GameState, minutes: number): CommandResult {
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > MINUTES_PER_DAY) {
    return fail('invalid', 'Столько времени за раз не проходит.')
  }
  const draft = open(state)
  advance(draft, Math.round(minutes))
  // Час часов — это час ходьбы, если герой в пути. Отдых и лагерь время тратят,
  // но с места не двигают: идут тогда, когда идут.
  walk(draft, Math.round(minutes))
  if (!state.journey) {
    addFatigue(draft, (-REST_RECOVERY_PER_HOUR / 2) * (minutes / MINUTES_PER_HOUR))
  }
  return close(draft)
}

/**
 * Содержание судна.
 *
 * Корабль ест деньги и тогда, когда стоит у причала: смола, канаты и те, кто
 * его стережёт. Нечем платить — судно не исчезает, оно просто ветшает: команда
 * расходится, течь не конопатят. Это и есть разница между «купил корабль» и
 * «держу корабль».
 */
function paySailors(draft: Draft, days: number): void {
  const ship = draft.ship
  if (!ship || days <= 0) return
  const due = shipUpkeep(ship) * days
  if (draft.character.money >= due) {
    addMoney(draft, -due)
    return
  }
  addMoney(draft, -draft.character.money)
  const rot = Math.min(0.5, 0.015 * days)
  const worn = Math.max(0, Math.round((ship.condition - rot) * 100) / 100)
  draft.ship = worn > 0 ? { ...ship, condition: worn } : null
  notice(
    draft,
    worn > 0
      ? `Платить команде «${ship.name}» нечем: судно ветшает у причала.`
      : `«${ship.name}» брошена и растащена: на содержание не нашлось денег.`,
    'trade',
  )
}

/**
 * Взнос ордену.
 *
 * Раз в месяц, сам собой: есть деньги — уплачено, нет — положение падает, и
 * тот, кто не платит долго, вылетает. Это и есть «служат и вылетают»: орден
 * держит своих не клятвой, а счётом.
 */
function payDues(draft: Draft): void {
  const membership = draft.guild
  const order = membership ? orderById(membership.orderId) : null
  if (!membership || !order) return
  const today = dayOf(draft.time)
  while (draft.guild && today > draft.guild.paidUntil) {
    const next = draft.guild.paidUntil + DUES_DAYS
    if (draft.character.money >= order.dues) {
      addMoney(draft, -order.dues)
      draft.guild = { ...draft.guild, paidUntil: next }
    } else {
      draft.guild = { ...draft.guild, paidUntil: next }
      addStanding(draft, -10, `${order.name}: взнос не внесён.`)
    }
  }
}

/** Сдвинуть положение в ордене — и вылететь, если упало ниже терпимого. */
function addStanding(draft: Draft, delta: number, why: string): void {
  const membership = draft.guild
  const order = membership ? orderById(membership.orderId) : null
  if (!membership || !order) return
  const standing = Math.max(-100, Math.min(200, membership.standing + delta))
  const before = rankOf(order, membership.standing)
  draft.guild = { ...membership, standing }
  if (standing <= EXPELLED) {
    draft.guild = null
    notice(draft, `${order.name} отказал тебе от дома: ${why}`, 'world')
    draft.reputation = withLordRep(draft.reputation, `order:${order.id}`, -30)
    return
  }
  const after = rankOf(order, standing)
  if (after > before)
    notice(draft, `${order.name}: теперь ты ${rankLabel(order, standing)}.`, 'world')
  else if (delta < 0) notice(draft, why, 'world')
}

function joinOrder(state: GameState, orderId: string): CommandResult {
  const order = orderById(orderId)
  if (!order) return fail('unknownAction', 'Такого ордена нет.')
  if (state.guild) return fail('invalid', 'Ты уже в ордене. Двум господам не служат.')
  if (!ordersAt(state.world, state.locationId).some((one) => one.id === orderId)) {
    return fail('unavailableHere', `${order.name} здесь не стоит.`)
  }
  // Кого выгнали, обратно не берут скоро: память у ордена долгая.
  if (lordRep(state.reputation, `order:${order.id}`) <= -20) {
    return fail('shunned', `${order.name} тебя помнит и не примет.`)
  }
  // Церковь и корона (этап 51, Х6): отлучённого в церковный орден не берут, и
  // это не мелочь — отлучение закрывает двери, а не портит настроение.
  if (order.kind === 'church' && pietyOf(state) <= EXCOMMUNICATED) {
    return fail('shunned', `${order.name} не принимает отлучённого. Сперва покайся.`)
  }
  const draft = open(state)
  advance(draft, hours(2))
  draft.guild = {
    orderId,
    standing: 0,
    since: dayOf(draft.time),
    paidUntil: dayOf(draft.time) + DUES_DAYS,
  }
  if (draft.character.money >= order.dues) addMoney(draft, -order.dues)
  notice(
    draft,
    `Принят: ${order.name}, ${order.ranks[0]?.label ?? ''}. Взнос ${order.dues} в месяц.`,
    'world',
  )
  return close(draft)
}

function leaveOrder(state: GameState): CommandResult {
  const order = ownOrder(state)
  if (!order) return fail('invalid', 'Ты ни в чём не состоишь.')
  const draft = open(state)
  draft.guild = null
  // Ушёл сам — не враг, но и не свой: берут обратно не сразу.
  draft.reputation = withLordRep(draft.reputation, `order:${order.id}`, -10)
  notice(draft, `${order.name} оставлен.`, 'world')
  return close(draft)
}

/** Сколько времени уходит на сделку — торг не бывает мгновенным. */
export const TRADE_MINUTES = 15

/** Сколько времени уходит на набор людей. */
export const HIRE_MINUTES = 60

function hire(state: GameState, troop: TroopId, count: number): CommandResult {
  const def = TROOPS[troop]
  if (!def) return fail('unknownAction', 'Таких не бывает.')
  if (!Number.isInteger(count) || count <= 0) return fail('invalid', 'Сколько именно?')

  const here = state.world.locations[state.locationId]
  const settlement = state.settlements[state.locationId]
  if (!here || !settlement) return fail('invalid', 'Непонятно, где находится герой.')
  // На ярмарку приходят наёмники (этап 39): в дни торга здесь можно найти
  // тех, кого в этом месте обычно не найдёшь, лишь бы людей хватало.
  const fair = fairAt(state.world, state.locationId, dayOf(state.time)) !== null
  if (
    !isSettlement(here.archetype) ||
    (!fair && !def.where.includes(here.archetype)) ||
    settlement.population < def.minPopulation
  ) {
    return fail('unavailableHere', `${def.label} здесь не найдёшь.`)
  }
  if (settlement.recruits < count) {
    return fail(
      'noRecruits',
      `Столько людей тут не наберёшь: готовых идти всего ${Math.floor(settlement.recruits)}.`,
    )
  }
  // Свой орден нанимает своим дешевле (этап 42).
  const cost = Math.round(def.hireCost * count * (ownOrderHere(state)?.perks.hire ?? 1))
  if (state.character.money < cost) {
    return fail('noMoney', `Не хватает денег: нужно ${cost}, есть ${state.character.money}.`)
  }

  const draft = open(state)
  notice(draft, `Нанято: ${def.label.toLowerCase()} — ${count}, за ${cost}.`)
  advance(draft, HIRE_MINUTES)
  addMoney(draft, -cost)
  draft.party = withUnits(draft.party, troop, count)
  draft.settlements = {
    ...draft.settlements,
    [state.locationId]: { ...settlement, recruits: settlement.recruits - count },
  }
  practice(draft, 'command', count * 4)
  return close(draft)
}

function disband(state: GameState, troop: TroopId, count: number): CommandResult {
  if (!TROOPS[troop]) return fail('unknownAction', 'Таких не бывает.')
  if (!Number.isInteger(count) || count <= 0) return fail('invalid', 'Сколько именно?')
  if (troopCount(state.party, troop) < count) return fail('invalid', 'Столько у тебя нет.')

  const draft = open(state)
  notice(draft, `Распущено: ${TROOPS[troop].label.toLowerCase()} — ${count}.`)
  draft.party = withUnits(draft.party, troop, -count)
  return close(draft)
}

function battleOrders(state: GameState, orders: Readonly<Record<GroupId, OrderId>>): CommandResult {
  const battle = state.battle
  if (!battle) return fail('invalid', 'Боя нет.')
  if (battle.outcome !== 'ongoing') return fail('invalid', 'Бой окончен — пора подводить итоги.')

  const draft = open(state)
  const hero = gearBonus(state.character)
  // Раненый герой стоит в строю вполсилы.
  const woundFactor = 1 - (state.character.wound?.severity ?? 0) * 0.5
  const result = resolveRound(
    battle,
    orders,
    {
      command: skillLevel(state.character, 'command'),
      magic: skillLevel(state.character, 'magic'),
      spells: {
        fire: spellInBattle(state.character, 'fire'),
        curse: spellInBattle(state.character, 'curse'),
        ward: spellInBattle(state.character, 'ward'),
      },
      // Снаряжение отряда множит силу строя, железо героя прибавляет своё.
      gear: gearFactor(state.party),
      heroAttack: hero.attack * woundFactor,
      heroDefense: hero.defense * woundFactor,
    },
    draft.rng,
  )
  draft.rng = result.rng
  draft.battle = battleTalk(draft, result.battle)
  draft.party = {
    ...draft.party,
    units: unformUp(result.battle.groups),
    morale: result.battle.morale,
  }
  // Бой идёт по своим часам, но не бесплатно: раунд — это время, силы и железо.
  advance(draft, 20)
  addFatigue(draft, 4)
  practice(draft, 'command', 12)
  wearGear(draft)
  if (result.battle.outcome !== 'ongoing') {
    notice(draft, result.battle.outcome === 'won' ? 'Бой выигран.' : 'Бой проигран.')
  }
  return close(draft)
}

function battleFlee(state: GameState): CommandResult {
  const battle = state.battle
  if (!battle) return fail('invalid', 'Боя нет.')
  if (battle.outcome !== 'ongoing') return fail('invalid', 'Бой уже окончен.')

  const draft = open(state)
  const result = fleeBattle(battle, draft.rng)
  draft.rng = result.rng
  draft.battle = result.battle
  draft.party = {
    ...draft.party,
    units: unformUp(result.battle.groups),
    morale: result.battle.morale,
  }
  advance(draft, 30)
  addFatigue(draft, 12)
  notice(draft, 'Отход.')
  return close(draft)
}

/**
 * Поединок.
 *
 * Клинок мастера должен быть виден в бою, а не только в цифре навыка: герой
 * выходит один против лучшего из чужих. Выигрыш ломает чужой дух и может
 * кончить бой без сечи, проигрыш — расстраивает своих и оставляет рану.
 */
function duel(state: GameState): CommandResult {
  const battle = state.battle
  if (!battle) return fail('invalid', 'Боя нет.')
  if (battle.outcome !== 'ongoing') return fail('invalid', 'Бой окончен.')
  if (battle.duel !== 'none') return fail('invalid', 'Второго поединка не принимают.')
  if (state.character.wound) return fail('wounded', 'С раной на поединок не выходят.')

  const draft = open(state)
  const gear = gearBonus(state.character)
  const skill = Math.max(
    skillLevel(state.character, 'lightWeapons'),
    skillLevel(state.character, 'heavyWeapons'),
  )
  const result = resolveDuel(
    battle,
    {
      skill,
      strength: state.character.attributes.strength,
      agility: state.character.attributes.agility,
      attack: gear.attack,
      defense: gear.defense,
    },
    draft.rng,
  )
  draft.rng = result.rng
  draft.battle = result.battle
  draft.party = { ...draft.party, morale: result.battle.morale }
  advance(draft, 15)
  addFatigue(draft, 10)
  const weapon: SkillId =
    skillLevel(state.character, 'heavyWeapons') > skillLevel(state.character, 'lightWeapons')
      ? 'heavyWeapons'
      : 'lightWeapons'
  practice(draft, weapon, 30)
  wearGear(draft)
  if (result.won) {
    draft.renown += 1
    notice(draft, `Поединок выигран: их ${TROOPS[result.champion].label.toLowerCase()} пал.`, 'war')
  } else {
    // Проигранный поединок — не смерть, но и не царапина: неделя вполсилы.
    patch(draft, { wound: { daysLeft: 7, severity: 0.25 } })
    notice(draft, 'Поединок проигран: тебя оттащили к своим с раной.', 'war')
  }
  if (result.battle.outcome !== 'ongoing') {
    notice(draft, result.battle.outcome === 'won' ? 'Бой выигран.' : 'Бой проигран.')
  }
  return close(draft)
}

/** Выкуп: заплатить сейчас и выйти на волю, не дожидаясь, пока отпустят сами. */
function payRansom(state: GameState): CommandResult {
  const captivity = state.character.captivity
  if (!captivity) return fail('invalid', 'Ты на воле.')
  if (state.character.money < captivity.ransom) {
    return fail(
      'noMoney',
      `Просят ${captivity.ransom}, а у тебя ${state.character.money}. Остаётся ждать.`,
    )
  }
  const draft = open(state)
  addMoney(draft, -captivity.ransom)
  patch(draft, { captivity: null })
  notice(draft, `Выкуп уплачен: ${captivity.ransom}. Ты на воле.`, 'war')
  advance(draft, hours(2))
  return close(draft)
}

/** Итоги боя: добыча, пленные и то, что с ними делать. */
function battleEnd(state: GameState, prisoners: 'ransom' | 'recruit' | 'release'): CommandResult {
  const battle = state.battle
  if (!battle) return fail('invalid', 'Боя нет.')
  if (battle.outcome === 'ongoing') return fail('invalid', 'Бой ещё идёт.')

  const draft = open(state)
  draft.battle = null

  if (battle.outcome === 'won') {
    addMoney(draft, battle.spoils.money)
    draft.renown += 1
    draft.battlesWon += 1
    seeDeed(draft, 'winBattle')

    // Побитая шайка — это меньше разбоя в округе и доброе слово в месте.
    if (!battle.stake) {
      const settlement = draft.settlements[state.locationId]
      if (settlement && settlement.banditry > 0) {
        draft.settlements = {
          ...draft.settlements,
          [state.locationId]: { ...settlement, banditry: Math.max(0, settlement.banditry - 0.25) },
        }
        draft.reputation = withPlaceRep(draft.reputation, state.locationId, 6)
      }
    }

    // Взятие: место меняет хозяина и надолго это запоминает.
    if (battle.stake?.type === 'siege') {
      const taken = draft.settlements[battle.stake.locationId]
      const name = state.world.locations[battle.stake.locationId]?.name ?? 'место'
      if (taken) {
        // Провинция следует за главным местом: взяв его, берёшь и остальное,
        // что держал прежний хозяин здесь же (holding.ts, `takeLand`).
        const before = holdingsOf(draft.settlements, PLAYER).length
        draft.settlements = takeLand(
          draft.base.world,
          draft.settlements,
          battle.stake.locationId,
          PLAYER,
        )
        draft.settlements = {
          ...draft.settlements,
          [battle.stake.locationId]: {
            ...taken,
            owner: PLAYER,
            garrison: {},
            population: Math.round(taken.population * 0.93),
            banditry: Math.min(1, taken.banditry + 0.25),
            stock: { ...taken.stock, grain: Math.round(taken.stock.grain * 0.6) },
          },
        }
        const gained = holdingsOf(draft.settlements, PLAYER).length - before
        notice(draft, `${name} взят. Людей поубавилось, и они это запомнят.`)
        if (gained > 1) {
          notice(draft, `С ним пошла вся провинция: мест стало на ${gained} больше.`, 'world')
        }
        seeDeed(draft, 'sack')
        draft.reputation = withPlaceRep(draft.reputation, battle.stake.locationId, -45)
        if (taken.owner && !taken.owner.startsWith('crown:') && taken.owner !== PLAYER) {
          draft.reputation = withLordRep(draft.reputation, taken.owner, -25)
        }
      }
      draft.siege = null
    }
    // Стены устояли: уцелевшие из гарнизона возвращаются на них, ополчение
    // расходится по домам, место это помнит.
    if (battle.stake?.type === 'defense') {
      restoreGarrison(draft, battle.stake)
      const name = state.world.locations[battle.stake.locationId]?.name ?? 'место'
      draft.reputation = withPlaceRep(draft.reputation, battle.stake.locationId, 10)
      draft.renown += 1
      notice(draft, `${name}: стены устояли.`, 'war')
    }
    const captured = battle.spoils.prisoners
    if (captured > 0) {
      if (prisoners === 'ransom') {
        addMoney(draft, captured * 8)
        notice(draft, `Пленных продали за ${captured * 8}.`)
      } else if (prisoners === 'recruit') {
        const joined = Math.max(1, Math.round(captured / 2))
        draft.party = withUnits(draft.party, 'militia', joined)
        notice(draft, `К отряду пристало ${joined} из пленных.`)
      } else {
        draft.party = { ...draft.party, morale: Math.min(100, draft.party.morale + 5) }
        notice(draft, 'Пленных отпустили восвояси.')
        seeDeed(draft, 'sparePrisoners')
      }
    }
    draft.party = { ...draft.party, morale: Math.min(100, draft.party.morale + 10) }
  } else if (battle.outcome === 'lost') {
    // Своё место пало: оно уходит тому, кто взял его.
    if (battle.stake?.type === 'defense') {
      const fallen = draft.settlements[battle.stake.locationId]
      const name = state.world.locations[battle.stake.locationId]?.name ?? 'место'
      if (fallen && battle.foeId) {
        draft.settlements = {
          ...draft.settlements,
          [battle.stake.locationId]: {
            ...fallen,
            owner: battle.foeId === 'bandits' ? null : battle.foeId,
            garrison: {},
            population: Math.round(fallen.population * 0.93),
          },
        }
        notice(draft, `${name} взят: стены не удержали.`, 'war')
      }
    }
    defeat(draft, battle.foeId)
  } else if (battle.stake?.type === 'defense') {
    // Отошли со стен: гарнизон уцелевших держит их дальше, но осада не снята.
    restoreGarrison(draft, battle.stake)
  }
  return close(draft)
}

/** Уцелевшие из гарнизона — обратно на стены, ополчение — по домам. */
function restoreGarrison(
  draft: Draft,
  stake: Extract<NonNullable<Battle['stake']>, { type: 'defense' }>,
): void {
  const settlement = draft.settlements[stake.locationId]
  if (!settlement) return
  let units = draft.party.units
  const garrison: Partial<Record<TroopId, number>> = {}
  for (const [troop, count] of Object.entries(stake.garrison)) {
    const back = Math.min(count ?? 0, units[troop as TroopId] ?? 0)
    if (back <= 0) continue
    garrison[troop as TroopId] = back
    units = withUnits({ ...draft.party, units }, troop as TroopId, -back).units
  }
  const levyLeft = Math.min(stake.levy, units.militia ?? 0)
  if (levyLeft > 0) units = withUnits({ ...draft.party, units }, 'militia', -levyLeft).units
  draft.party = { ...draft.party, units }
  draft.settlements = { ...draft.settlements, [stake.locationId]: { ...settlement, garrison } }
}

/**
 * Поражение.
 *
 * Раньше проигранный бой значил обобранный кошель и полтора процента смерти —
 * то есть ничего. Теперь его выносят с поля раненым, реже берут в плен и лишь
 * иногда он не встаёт; смерть — настоящая, дальше играет наследник.
 */
function defeat(draft: Draft, foeId: string | null): void {
  const lost = Math.round(draft.character.money * 0.5)
  addMoney(draft, -lost)
  addFatigue(draft, 40)
  if (lost > 0) notice(draft, `Разбитых обобрали: потеряно ${lost}.`)

  const captor = foeId ?? 'bandits'
  const [outcome, afterOutcome] = defeatOutcome(
    draft.rng,
    captor,
    draft.character.money,
    skillLevel(draft.character, 'fortitude'),
  )
  draft.rng = afterOutcome
  if (outcome.type === 'wounded') {
    patch(draft, { wound: outcome.wound })
    notice(draft, `Тебя вынесли с поля раненым: ${outcome.wound.daysLeft} суток в постели.`, 'war')
    return
  }
  if (outcome.type === 'captured') {
    patch(draft, { captivity: outcome.captivity })
    // Отряд разбежался, спутники — кто как: часть попадает в плен вместе с тобой.
    const scattered: Partial<Record<TroopId, number>> = {}
    for (const [troop, count] of Object.entries(draft.party.units)) {
      const left = Math.floor((count ?? 0) / 2)
      if (left > 0) scattered[troop as TroopId] = left
    }
    draft.party = { ...draft.party, units: scattered, morale: 30 }
    draft.companions = draft.companions.map((companion) => {
      if (companion.captive || companion.role.type !== 'party') return companion
      const [taken, next] = rollChance(draft.rng, 0.3)
      draft.rng = next
      if (taken) notice(draft, `${companion.name} тоже в плену.`, 'people')
      return taken ? { ...companion, captive: true } : companion
    })
    notice(
      draft,
      `Ты в плену, держит ${foeName(draft.base, captor)}. Выкуп — ${outcome.captivity.ransom}, иначе ждать ${outcome.captivity.daysLeft} суток.`,
      'war',
    )
    return
  }
  notice(draft, 'Этот бой стал последним.', 'war')
  succeed(draft, dayOf(draft.time))
}

/**
 * Своя земля: строить, ставить гарнизон и снимать его.
 *
 * Всё это доступно только держателю. Владеть — значит платить: постройка стоит
 * денег и суток, гарнизон стоит жалованья и ест местный хлеб.
 */
function build(state: GameState, building: BuildingId): CommandResult {
  const def = BUILDINGS[building]
  if (!def) return fail('unknownAction', 'Такого не строят.')
  const settlement = state.settlements[state.locationId]
  const here = state.world.locations[state.locationId]
  if (!settlement || !here) return fail('invalid', 'Непонятно, где находится герой.')
  if (!isOwnedByPlayer(settlement)) return fail('notYours', 'Это не твоя земля.')
  if (!isSettlement(here.archetype) || (def.where && !def.where.includes(here.archetype))) {
    return fail('unavailableHere', 'В таком месте это не построишь.')
  }
  if (hasBuilding(settlement, building)) return fail('invalid', 'Уже стоит.')
  if (settlement.building) return fail('noRoom', 'Здесь уже идёт стройка.')
  if (freeSlots(state.world, settlement) <= 0) return fail('noRoom', 'Свободного места больше нет.')
  if (state.character.money < def.cost) {
    return fail('noMoney', `Не хватает денег: нужно ${def.cost}, есть ${state.character.money}.`)
  }

  const draft = open(state)
  notice(draft, `Заложено: ${def.label.toLowerCase()} — ${def.days} суток работы.`)
  advance(draft, hours(2))
  addMoney(draft, -def.cost)
  draft.settlements = {
    ...draft.settlements,
    [state.locationId]: { ...settlement, building: { id: building, daysLeft: def.days } },
  }
  return close(draft)
}

function moveToGarrison(state: GameState, troop: TroopId, count: number): CommandResult {
  if (!TROOPS[troop]) return fail('unknownAction', 'Таких не бывает.')
  if (!Number.isInteger(count) || count <= 0) return fail('invalid', 'Сколько именно?')
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')
  if (!isOwnedByPlayer(settlement)) return fail('notYours', 'Это не твоя земля.')
  if (troopCount(state.party, troop) < count) return fail('invalid', 'Столько у тебя нет.')
  if (garrisonSize(settlement) + count > garrisonLimit(state.world, settlement)) {
    return fail('noRoom', 'Столько здесь не разместить — нужны казармы.')
  }

  const draft = open(state)
  notice(draft, `В гарнизон: ${TROOPS[troop].label.toLowerCase()} — ${count}.`)
  draft.party = withUnits(draft.party, troop, -count)
  draft.settlements = {
    ...draft.settlements,
    [state.locationId]: {
      ...settlement,
      garrison: { ...settlement.garrison, [troop]: (settlement.garrison[troop] ?? 0) + count },
    },
  }
  return close(draft)
}

function moveFromGarrison(state: GameState, troop: TroopId, count: number): CommandResult {
  if (!TROOPS[troop]) return fail('unknownAction', 'Таких не бывает.')
  if (!Number.isInteger(count) || count <= 0) return fail('invalid', 'Сколько именно?')
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')
  if (!isOwnedByPlayer(settlement)) return fail('notYours', 'Это не твоя земля.')
  if ((settlement.garrison[troop] ?? 0) < count) return fail('invalid', 'Столько в гарнизоне нет.')

  const draft = open(state)
  notice(draft, `Из гарнизона: ${TROOPS[troop].label.toLowerCase()} — ${count}.`)
  draft.party = withUnits(draft.party, troop, count)
  const garrison = { ...settlement.garrison }
  const left = (garrison[troop] ?? 0) - count
  if (left <= 0) delete garrison[troop]
  else garrison[troop] = left
  draft.settlements = { ...draft.settlements, [state.locationId]: { ...settlement, garrison } }
  return close(draft)
}

/**
 * Осада (DESIGN.md, п.5: осады — отдельная фаза того же боя).
 *
 * Стены не делают отдельной игры: это множитель обороны в тех же раундах.
 * Зато у осаждающего есть второе оружие — время: сидеть под стенами дешевле,
 * чем лезть на них, но пока сидишь, тебя самого надо кормить.
 */
function besiege(state: GameState): CommandResult {
  if (state.siege) return fail('invalid', 'Ты уже стоишь под стенами.')
  const settlement = state.settlements[state.locationId]
  const here = state.world.locations[state.locationId]
  if (!settlement || !here) return fail('invalid', 'Непонятно, где находится герой.')
  if (isOwnedByPlayer(settlement)) return fail('invalid', 'Это и так твоё.')
  if (partySize(state.party) < 8) return fail('invalid', 'С такими силами стены не обложишь.')
  if (!hostileTo(state, settlement)) {
    return fail('invalid', 'Это место тебе не враг — на него незачем идти.')
  }

  const draft = open(state)
  notice(draft, `${here.name} обложен. Дальше — ждать или штурмовать.`)
  advance(draft, hours(6))
  addFatigue(draft, 10)
  draft.siege = { locationId: state.locationId, days: 0 }
  return close(draft)
}

/** Сидеть под стенами: у осаждённых кончается хлеб, у осаждающих — терпение. */
function siegeWait(state: GameState, days: number): CommandResult {
  const siege = state.siege
  if (!siege) return fail('invalid', 'Ты никого не осаждаешь.')
  if (!Number.isInteger(days) || days <= 0 || days > 10) {
    return fail('invalid', 'Ждать можно от суток до десяти.')
  }
  const settlement = state.settlements[siege.locationId]
  if (!settlement) return fail('invalid', 'Осаждать нечего.')

  const draft = open(state)
  notice(draft, `Осада: ${days} сут. под стенами.`)
  advance(draft, hours(24 * days))
  addFatigue(draft, days * 4)
  // Блокада: в город не везут ничего, запасы тают быстрее обычного.
  draft.settlements = {
    ...draft.settlements,
    [siege.locationId]: {
      ...settlement,
      stock: {
        ...settlement.stock,
        grain: Math.max(0, settlement.stock.grain * (1 - 0.15 * days)),
        fish: Math.max(0, settlement.stock.fish * (1 - 0.2 * days)),
      },
    },
  }
  draft.siege = { ...siege, days: siege.days + days }
  return close(draft)
}

function siegeAssault(state: GameState): CommandResult {
  const siege = state.siege
  if (!siege) return fail('invalid', 'Ты никого не осаждаешь.')
  const settlement = state.settlements[siege.locationId]
  const here = state.world.locations[siege.locationId]
  if (!settlement || !here) return fail('invalid', 'Осаждать нечего.')

  const draft = open(state)
  // Изголодавшийся гарнизон дерётся хуже: за это и сидят под стенами.
  const starving = Math.max(0.35, foodSecurity(settlement))
  const defenders: BattleSide = {
    name: `Гарнизон: ${here.name}`,
    units:
      garrisonSize(settlement) > 0
        ? settlement.garrison
        : { militia: Math.max(4, Math.round(settlement.population / 120)) },
    morale: Math.round(45 + starving * 35 - siege.days * 2),
    fatigue: 0,
  }
  const walls = wallsFor(settlement)
  // Союзное войско под теми же стенами идёт на приступ первым.
  const softened = allyStrikesFirst(draft, defenders, siege.locationId, walls, 1)
  if (!softened) {
    draft.siege = null
    notice(draft, `${here.name} взяли союзники: тебе остались стены без ворот.`, 'war')
    advance(draft, hours(2))
    return close(draft)
  }
  draft.battle = startBattle(draft.party, softened, here.terrain, {
    stake: { type: 'siege', locationId: siege.locationId },
    wallBonus: walls,
    foeId: settlement.owner,
  })
  notice(draft, `Штурм: ${here.name}.`)
  advance(draft, hours(2))
  addFatigue(draft, 8)
  return close(draft)
}

function siegeLift(state: GameState): CommandResult {
  if (!state.siege) return fail('invalid', 'Ты никого не осаждаешь.')
  const draft = open(state)
  notice(draft, 'Осада снята.')
  draft.siege = null
  return close(draft)
}

/** Земля за службу: корона жалует лен тому, кто себя показал. */
function askForFief(state: GameState): CommandResult {
  if (!state.service) return fail('invalid', 'Земли просят у того, кому служат.')
  if (state.renown < 3) {
    return fail('requirements', `За тобой мало славы: нужно 3 победы, есть ${state.renown}.`)
  }
  const crown = `crown:${state.service}`
  const here = kingdomOf(state.world, state.locationId)
  if (here?.id !== state.service) {
    return fail('unavailableHere', 'Просить надо там, где тебя слышат, — на землях сюзерена.')
  }

  // Жалуют не лучшее: самое мелкое из того, что держит корона.
  const candidates = Object.values(state.settlements)
    .filter((settlement) => settlement.owner === crown)
    .filter((settlement) => state.world.locations[settlement.locationId]?.archetype !== 'capital')
    .sort((a, b) => a.population - b.population)
  const granted = candidates[0]
  if (!granted) return fail('unavailableHere', 'У короны нет свободной земли для тебя.')

  const draft = open(state)
  const name = state.world.locations[granted.locationId]?.name ?? 'земля'
  notice(draft, `Пожалован лен: ${name}.`)
  seeDeed(draft, 'takeFief')
  advance(draft, hours(3))
  draft.settlements = {
    ...draft.settlements,
    [granted.locationId]: { ...granted, owner: PLAYER },
  }
  draft.renown = Math.max(0, draft.renown - 3)
  return close(draft)
}

/** Враждебно ли место: воюет ли его держатель с тем, за кого стоит игрок. */
function hostileTo(state: GameState, settlement: Settlement): boolean {
  const owner = settlement.owner
  if (!owner) return true
  const side = state.service
  if (!side) return false
  const ownerSide = owner.startsWith('crown:')
    ? owner.slice('crown:'.length)
    : (lordById(state.politics, owner)?.kingdomId ?? owner)
  return atWar(state.politics, side, ownerSide)
}

/**
 * Снаряжение (этап 6, блок E).
 *
 * Купленное надевается сразу, прежнее уходит за полцены: возиться со складом на
 * телефоне незачем. Вещь не по силам и не по выучке помогает хуже — это
 * считается числом, а не запрещается.
 */
function buyItem(state: GameState, itemId: string): CommandResult {
  const item = ITEMS_BY_ID[itemId]
  if (!item) return fail('unknownAction', 'Такого не продают.')
  const here = state.world.locations[state.locationId]
  if (!here) return fail('invalid', 'Непонятно, где находится герой.')
  if (!isSettlement(here.archetype) || !item.where.includes(here.archetype)) {
    return fail('unavailableHere', 'Здесь такого не делают и не возят.')
  }
  // Именную вещь делают в одной короне и за её пределы не возят.
  if (item.kingdomId && kingdomOf(state.world, state.locationId)?.id !== item.kingdomId) {
    return fail('unavailableHere', 'Такое делают не здесь, и сюда не возят.')
  }
  const shunned = checkWelcome(state)
  if (shunned) return shunned

  const price = Math.round(item.price * priceFactor(placeRep(state.reputation, state.locationId)))
  if (state.character.money < price) {
    return fail('noMoney', `Не хватает денег: нужно ${price}, есть ${state.character.money}.`)
  }

  const draft = open(state)
  const old = state.character.equipment[item.slot]
  const oldItem = old ? ITEMS_BY_ID[old.id] : null
  notice(draft, `Куплено: ${item.label.toLowerCase()} за ${price}.`)
  advance(draft, TRADE_MINUTES)
  addMoney(draft, -price)
  if (oldItem && old) {
    const resale = Math.round((oldItem.price * old.condition) / 100 / 2)
    addMoney(draft, resale)
    notice(draft, `Прежнее сдано за ${resale}.`)
  }
  patch(draft, {
    equipment: withItem(draft.character.equipment, item.slot, { id: item.id, condition: 100 }),
  })
  practice(draft, 'trade', 6)
  return close(draft)
}

/** Ковка: из железа и инструментов, купленных там, где они дёшевы. */
function craftItem(state: GameState, itemId: string): CommandResult {
  const item = ITEMS_BY_ID[itemId]
  if (!item?.craft) return fail('unknownAction', 'Это не выковать.')
  const settlement = state.settlements[state.locationId]
  const here = state.world.locations[state.locationId]
  if (!settlement || !here) return fail('invalid', 'Непонятно, где находится герой.')
  const canForge =
    hasBuilding(settlement, 'smithy') || here.archetype === 'city' || here.archetype === 'capital'
  if (!canForge) return fail('unavailableHere', 'Здесь нет кузницы.')

  const skill = skillLevel(state.character, 'engineering')
  if (skill < item.craft.engineering) {
    return fail('requirements', `Нужна «Инженерия» ${item.craft.engineering} (есть ${skill}).`)
  }
  if ((state.character.inventory.iron ?? 0) < item.craft.iron) {
    return fail('noGoods', `Нужно железа: ${item.craft.iron}.`)
  }
  if ((state.character.inventory.tools ?? 0) < item.craft.tools) {
    return fail('noGoods', `Нужно инструментов: ${item.craft.tools}.`)
  }

  const draft = open(state)
  // Вещь выходит с клеймом (этап 50): чья работа, где сделана и какова.
  const [roll, afterRoll] = nextFloat(draft.rng)
  draft.rng = afterRoll
  const rank = rankOfShifts(shiftsOf(state, 'forgeBlade') + shiftsOf(state, 'smithyHand'))
  const quality = qualityFrom(skill, rank, roll)
  const mark = {
    maker: state.character.name,
    place: here.name,
    quality,
  }
  notice(draft, `Выковано: ${item.label.toLowerCase()} — ${qualityLabel(quality)}.`)
  advance(draft, hours(10))
  addFatigue(draft, 25)
  addGoods(draft, 'iron', -item.craft.iron)
  addGoods(draft, 'tools', -item.craft.tools)
  patch(draft, {
    equipment: withItem(draft.character.equipment, item.slot, {
      id: item.id,
      condition: 100,
      mark,
    }),
  })
  practice(draft, 'engineering', 45)
  return close(draft)
}

function repairItem(state: GameState, slot: SlotId): CommandResult {
  const worn = state.character.equipment[slot]
  const item = worn ? ITEMS_BY_ID[worn.id] : null
  if (!worn || !item) return fail('invalid', 'Тут нечего чинить.')
  if (worn.condition >= 100) return fail('invalid', 'Вещь и так цела.')
  const cost = repairCost(item, worn.condition, worn.mark?.quality)
  if (state.character.money < cost) {
    return fail('noMoney', `Починка стоит ${cost}, есть ${state.character.money}.`)
  }

  const draft = open(state)
  notice(draft, `Починено: ${item.label.toLowerCase()} за ${cost}.`)
  advance(draft, hours(3))
  addMoney(draft, -cost)
  patch(draft, {
    equipment: withItem(draft.character.equipment, slot, { id: worn.id, condition: 100 }),
  })
  return close(draft)
}

/** Снарядить отряд: оружие из поклажи идёт людям, а не на рынок. */
function outfitParty(state: GameState, weapons: number): CommandResult {
  if (!Number.isInteger(weapons) || weapons <= 0) return fail('invalid', 'Сколько именно?')
  if ((state.character.inventory.weapons ?? 0) < weapons) {
    return fail('noGoods', `Оружия столько нет: есть ${state.character.inventory.weapons ?? 0}.`)
  }
  const size = partySize(state.party)
  if (size === 0) return fail('invalid', 'Снаряжать некого.')

  const draft = open(state)
  const gain = Math.min(1 - draft.party.gear, weapons / size / 2)
  if (gain <= 0.001) return fail('invalid', 'Отряд и так одет во всё, что нашлось.')
  addGoods(draft, 'weapons', -weapons)
  draft.party = { ...draft.party, gear: Math.min(1, draft.party.gear + gain) }
  notice(draft, `Отряд снаряжён лучше: ${Math.round(draft.party.gear * 100)}%.`)
  advance(draft, hours(2))
  return close(draft)
}

/**
 * Привезти хлеб.
 *
 * Самое прямое доброе дело в этой игре: у тебя есть зерно, здесь голодают.
 * Это же и самый честный источник хорошего имени.
 */
function giveFood(state: GameState, amount: number): CommandResult {
  if (!Number.isInteger(amount) || amount <= 0) return fail('invalid', 'Сколько именно?')
  if ((state.character.inventory.grain ?? 0) < amount) {
    return fail('noGoods', `Зерна столько нет: есть ${state.character.inventory.grain ?? 0}.`)
  }
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')

  const draft = open(state)
  const hungry = foodSecurity(settlement) < 0.6
  addGoods(draft, 'grain', -amount)
  draft.settlements = {
    ...draft.settlements,
    [state.locationId]: {
      ...settlement,
      stock: { ...settlement.stock, grain: settlement.stock.grain + amount },
    },
  }
  // За хлеб в голод благодарны втрое: сытому городу подарок — просто товар.
  const gain = Math.round((amount / 20) * (hungry ? 3 : 1))
  draft.reputation = withPlaceRep(draft.reputation, state.locationId, gain)
  const owner = settlement.owner
  if (owner && !owner.startsWith('crown:') && owner !== PLAYER) {
    draft.reputation = withLordRep(draft.reputation, owner, Math.round(gain / 2))
  }
  draft.quests = draft.quests.map((quest) =>
    quest.type === 'bringFood' && quest.targetLocationId === state.locationId
      ? { ...quest, progress: quest.progress + amount }
      : quest,
  )
  notice(draft, hungry ? 'Хлеб роздан. Здесь это запомнят.' : 'Хлеб оставлен в амбаре.')
  if (hungry) seeDeed(draft, 'feedHungry')
  advance(draft, hours(2))
  return close(draft)
}

// --- поручения --------------------------------------------------------------

/** Что стоит за приказом кругу: сильнейшее известное заклинание рода. */
function spellInBattle(
  character: Character,
  family: 'fire' | 'curse' | 'ward',
): { readonly power: number; readonly label: string } | null {
  const spell = bestSpell(character, family)
  return spell ? { power: battlePower(character, family), label: spell.label } : null
}

/**
 * Сотворить заклинание вне боя (этап 41).
 *
 * Заклинание — содержимое: команда читает, что оно делает и чего стоит, и
 * ветвится только по роду действия. Неудача стоит того же, что удача, —
 * усталость и время уходят, чуда нет. Это и есть цена: магия дорога, иначе она
 * съедает остальную игру.
 */
function cast(state: GameState, spellId: string): CommandResult {
  const spell = SPELLS_BY_ID[spellId]
  if (!spell) return fail('unknownAction', 'Такого заклинания нет.')
  if (spell.where === 'battle') return fail('invalid', 'Это творят в бою, по приказу кругу.')
  const magic = skillLevel(state.character, 'magic')
  if (magic < spell.requiredSkill) {
    return fail(
      'requirements',
      `«${spell.label}» даётся с навыка ${spell.requiredSkill}, у тебя ${magic}.`,
    )
  }
  const where = castingPlace(state)
  if (spell.where !== 'anywhere' && spell.where !== where) {
    return fail('unavailableHere', `«${spell.label}» здесь не творят: не то место.`)
  }
  const blocked = checkFatigue(state.character, spell.fatigue)
  if (blocked) return blocked

  const draft = open(state)
  advance(draft, spell.minutes)
  addFatigue(draft, spell.fatigue)
  practice(draft, 'magic', 6 + spell.requiredSkill / 4)
  const [done, afterRoll] = rollChance(draft.rng, castChance(magic, spell))
  draft.rng = afterRoll
  if (!done) {
    notice(draft, `«${spell.label}» не далось: сила ушла в песок.`)
    return close(draft)
  }
  applySpell(draft, spell)
  return close(draft)
}

/** Где герой сейчас — для того, какие чары уместны. */
function castingPlace(state: GameState): SpellWhere {
  if (state.journey?.sea) return 'sea'
  if (state.journey) return 'road'
  const here = state.world.locations[state.locationId]
  if (here && isSite(here.archetype)) return 'site'
  return 'place'
}

function applySpell(draft: Draft, spell: SpellDef): void {
  const effect = spell.effect
  switch (effect.kind) {
    case 'heal': {
      const wound = draft.character.wound
      if (!wound) {
        notice(draft, `«${spell.label}»: лечить некого — ты цел.`)
        return
      }
      const left = wound.daysLeft - effect.days
      draft.character = {
        ...draft.character,
        wound: left > 0 ? { ...wound, daysLeft: left } : null,
      }
      notice(
        draft,
        left > 0
          ? `«${spell.label}»: рана затянется на ${effect.days} суток раньше.`
          : `«${spell.label}»: рана закрылась.`,
      )
      return
    }
    case 'calm': {
      const journey = draft.journey
      if (!journey) return
      // Снимает то, что прибавил шторм, но не короче самого пути.
      const hours = Math.max(journey.done + 1, journey.hours - effect.hours)
      draft.journey = { ...journey, hours, calm: true }
      notice(draft, `«${spell.label}»: волна легла, и шторм этот переход обойдёт.`)
      return
    }
    case 'wind': {
      const journey = draft.journey
      if (!journey) return
      const left = journey.hours - journey.done
      const hours = Math.max(journey.done + 1, Math.round(journey.hours - left * effect.share))
      draft.journey = { ...journey, hours }
      notice(draft, `«${spell.label}»: до берега на ${journey.hours - hours} ч ближе.`)
      return
    }
    case 'guard':
      draft.character = { ...draft.character, warded: draft.time + hours(effect.hours) }
      notice(draft, `«${spell.label}»: до утра тебя обойдут и засада, и мороз.`)
      return
    case 'light':
      draft.character = { ...draft.character, lit: draft.time + hours(effect.hours) }
      notice(draft, `«${spell.label}»: ночь над дорогой светла, как день.`)
      return
    case 'insight':
      draft.character = { ...draft.character, insight: true }
      notice(draft, `«${spell.label}»: видно, где лежит. Осталось взять.`)
      return
    case 'mend': {
      const ship = draft.ship
      if (!ship) {
        notice(draft, `«${spell.label}»: чинить нечего — судна нет.`)
        return
      }
      draft.ship = {
        ...ship,
        condition: Math.min(1, Math.round((ship.condition + effect.condition) * 100) / 100),
      }
      notice(
        draft,
        `«${spell.label}»: «${ship.name}» держит воду. Целость ${Math.round((draft.ship.condition ?? 0) * 100)}%.`,
      )
      return
    }
    case 'bless': {
      const settlement = draft.settlements[draft.locationId]
      if (!settlement) return
      const grain = settlement.population * LIFE.foodPerPerson * effect.days
      draft.settlements = {
        ...draft.settlements,
        [draft.locationId]: {
          ...settlement,
          stock: { ...settlement.stock, grain: settlement.stock.grain + grain },
        },
      }
      draft.reputation = withPlaceRep(draft.reputation, draft.locationId, 1 + effect.days)
      notice(
        draft,
        `«${spell.label}»: хлеба в амбарах прибавилось на ${effect.days} ${effect.days === 1 ? 'день' : 'дня'}. Здесь это запомнят.`,
      )
      return
    }
    case 'cleanse':
      draft.cleansed = { locationId: draft.locationId, untilDay: dayOf(draft.time) + effect.days }
      notice(draft, `«${spell.label}»: мор здесь берёт вполовину на ${effect.days} суток.`)
      return
    default:
      return
  }
}

/**
 * Сдать товар к ярмарке.
 *
 * Поручение «к ярмарке» — единственное, у которого срок и есть условие: товар
 * нужен к торгу, а не вообще. Сдают его тому, кто просил, и в счёт идёт только
 * тот товар, что просили.
 */
function deliverGoods(state: GameState, good: GoodId, amount: number): CommandResult {
  if (!Number.isInteger(amount) || amount <= 0) return fail('invalid', 'Сколько именно?')
  if (carried(state.character, good) < amount) {
    return fail('noGoods', `У тебя нет столько: ${GOODS[good].label.toLowerCase()}.`)
  }
  // Сдают и к ярмарке (этап 39), и по заказу купца (этап 49): дело одно —
  // привезённое перекладывают из своей поклажи в чужой амбар.
  const waiting = state.quests.filter(
    (quest) =>
      (quest.type === 'fairGoods' || quest.type === 'merchantOrder') &&
      quest.issuerLocationId === state.locationId &&
      quest.good === good &&
      quest.progress < quest.amount,
  )
  if (waiting.length === 0) return fail('unavailableHere', 'Этого здесь никто не ждёт.')
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')

  const draft = open(state)
  addGoods(draft, good, -amount)
  draft.settlements = {
    ...draft.settlements,
    [state.locationId]: {
      ...settlement,
      stock: { ...settlement.stock, [good]: settlement.stock[good] + amount },
    },
  }
  let left = amount
  draft.quests = draft.quests.map((quest) => {
    if (!waiting.some((one) => one.id === quest.id) || left <= 0) return quest
    const take = Math.min(left, quest.amount - quest.progress)
    left -= take
    return { ...quest, progress: quest.progress + take }
  })
  notice(draft, `Сдано: ${GOODS[good].label.toLowerCase()}, ${amount}.`)
  advance(draft, TRADE_MINUTES)
  return close(draft)
}

function takeQuest(state: GameState, questId: string): CommandResult {
  if (state.quests.some((quest) => quest.id === questId)) {
    return fail('invalid', 'Это уже на тебе.')
  }
  const offer = offersAt(state).find((quest) => quest.id === questId)
  if (!offer) return fail('unknownAction', 'Такого здесь не просят.')
  // Чужой груз кладут в свой трюм: без судна фрахт не берут (этап 36).
  if (offer.type === 'freight' && !state.ship) {
    return fail('requirements', 'Груз возят своим судном, а его у тебя нет.')
  }

  const draft = open(state)
  notice(draft, `Взято: ${describeQuest(state, offer).toLowerCase()}.`)
  draft.quests = [...draft.quests, offer]
  advance(draft, 30)
  return close(draft)
}

function finishQuest(state: GameState, questId: string): CommandResult {
  const quest = state.quests.find((candidate) => candidate.id === questId)
  if (!quest) return fail('unknownAction', 'Ты такого не брал.')
  // За фрахт платят там, где груз ждут, а не там, где его взяли: судно идёт в
  // один конец, и возвращаться за деньгами было бы разорением.
  const payAt = quest.type === 'freight' ? quest.targetLocationId : quest.issuerLocationId
  if (state.locationId !== payAt) {
    return fail(
      'unavailableHere',
      quest.type === 'freight'
        ? 'Груз ждут в другой гавани.'
        : 'За наградой идут к тому, кто просил.',
    )
  }
  if (!isComplete(state, quest)) return fail('requirements', 'Дело ещё не сделано.')

  const draft = open(state)
  // Дело, взятое в месте ордена, — служба ордену: платят больше и помнят (этап 42).
  const order = ownOrderHere(state, quest.issuerLocationId)
  const reward = Math.round(quest.reward * (order?.perks.reward ?? 1))
  notice(draft, `Награда за дело: ${reward}.`)
  addMoney(draft, reward)
  if (order) addStanding(draft, 12, `${order.name}: службу заметили.`)
  // Купец помнит, кто привёз в срок: это и есть «рынок помнит тебя» (этап 49).
  if (quest.merchantId) {
    rememberDeal(draft, quest.merchantId, { standing: 12, deals: 1 })
    notice(draft, 'Заказ сдан в срок — такое на рынке помнят.')
  }
  draft.reputation = withPlaceRep(draft.reputation, quest.issuerLocationId, 10)
  const owner = state.settlements[quest.issuerLocationId]?.owner
  if (owner && !owner.startsWith('crown:') && owner !== PLAYER) {
    draft.reputation = withLordRep(draft.reputation, owner, 8)
  }
  draft.renown += 1
  draft.quests = draft.quests.filter((candidate) => candidate.id !== questId)
  advance(draft, 30)
  return close(draft)
}

function abandonQuest(state: GameState, questId: string): CommandResult {
  const quest = state.quests.find((candidate) => candidate.id === questId)
  if (!quest) return fail('unknownAction', 'Ты такого не брал.')
  const draft = open(state)
  notice(draft, 'Дело брошено. Об этом узнают.')
  seeDeed(draft, 'abandonQuest')
  draft.reputation = withPlaceRep(draft.reputation, quest.issuerLocationId, -8)
  if (quest.merchantId) failedOrder(draft, quest.merchantId)
  draft.quests = draft.quests.filter((candidate) => candidate.id !== questId)
  return close(draft)
}

// --- своё имя на карте ------------------------------------------------------

/** Провозгласить своё владение: шестая сила на карте (DESIGN.md, п.9). */
function proclaimRealm(state: GameState, name: string): CommandResult {
  if (state.realm) return fail('invalid', 'Твоё имя уже на карте.')
  const holdings = holdingsOf(state.settlements, PLAYER)
  if (holdings.length < 2) {
    return fail('requirements', `Мало земли: нужно два владения, есть ${holdings.length}.`)
  }
  const title = name.trim() === '' ? 'Вольное владение' : name.trim()

  const draft = open(state)
  notice(draft, `Провозглашено: ${title}. Соседи это заметят.`)
  draft.realm = { name: title }
  // Тот, чью землю ты держишь, воспримет это как мятеж.
  const former = state.service
  if (former) {
    draft.service = null
    draft.politics = {
      ...draft.politics,
      wars: [
        ...draft.politics.wars,
        { a: former, b: PLAYER, since: dayOf(state.time), reason: 'самозванство и захват земель' },
      ],
    }
    notice(draft, 'Прежний сюзерен объявил тебя мятежником.')
  }
  advance(draft, hours(4))
  return close(draft)
}

/**
 * Что вассалы думают о поступках сюзерена.
 *
 * Не устав и не нрав — просто здравый смысл человека, чья земля рядом:
 * тому, кто жжёт города, не хочется служить, тому, кто щадит и платит, — легче.
 */
const VASSALS_FEEL: Readonly<Partial<Record<DeedId, number>>> = {
  sack: -5,
  raid: -3,
  sparePrisoners: 2,
  winBattle: 2,
  feedHungry: 1,
  starve: -3,
}

/** Доля подати, которую вассал отдаёт с пожалованной земли. */
export const VASSAL_SHARE = 0.3

/** Сдвинуть верность своих лордов: всех или одного. */
function shiftVassals(draft: Draft, delta: number, only: string | null): void {
  draft.politics = {
    ...draft.politics,
    lords: draft.politics.lords.map((lord) =>
      lord.kingdomId === PLAYER && (only === null || lord.id === only)
        ? { ...lord, loyalty: Math.max(0, Math.min(100, lord.loyalty + delta)) }
        : lord,
    ),
  }
}

/**
 * Пожаловать лен (этап 43).
 *
 * Своё место — своему лорду: земля переходит к нему, он платит с неё долю и
 * верит тебе крепче. Отдать можно только своё и только тому, кто под твоей
 * рукой: чужому лорду не жалуют, чужую землю не раздают.
 */
function grantFief(state: GameState, lordId: string, locationId: string): CommandResult {
  if (!state.realm) return fail('requirements', 'Жалуют от имени: у тебя нет своего.')
  const lord = lordById(state.politics, lordId)
  if (!lord || lord.kingdomId !== PLAYER) return fail('invalid', 'Он не под твоей рукой.')
  const settlement = state.settlements[locationId]
  if (!settlement || settlement.owner !== PLAYER) return fail('notYours', 'Это не твоя земля.')
  const draft = open(state)
  draft.settlements = {
    ...draft.settlements,
    [locationId]: { ...settlement, owner: lordId },
  }
  shiftVassals(draft, 20, lordId)
  advance(draft, hours(3))
  const name = state.world.locations[locationId]?.name ?? 'земля'
  notice(draft, `${name} пожалована: ${lord.title} ${lord.name} держит её от тебя.`, 'world')
  return close(draft)
}

/**
 * Отнять лен.
 *
 * Земля возвращается, лорд помнит, остальные — смотрят: отнятое у одного
 * пугает всех. Это и есть цена, без которой раздача земли была бы бесплатной.
 */
function revokeFief(state: GameState, locationId: string): CommandResult {
  const settlement = state.settlements[locationId]
  const holder = settlement ? lordById(state.politics, settlement.owner ?? '') : null
  if (!settlement || !holder || holder.kingdomId !== PLAYER) {
    return fail('invalid', 'Эту землю не твой вассал держит.')
  }
  const draft = open(state)
  draft.settlements = {
    ...draft.settlements,
    [locationId]: { ...settlement, owner: PLAYER },
  }
  shiftVassals(draft, -5, null)
  shiftVassals(draft, -25, holder.id)
  advance(draft, hours(3))
  const name = state.world.locations[locationId]?.name ?? 'земля'
  notice(
    draft,
    `${name} отнята у ${holder.title.toLowerCase()} ${holder.name}. Остальные это заметили.`,
    'world',
  )
  return close(draft)
}

/**
 * Рассудить дело (этап 43).
 *
 * Дело выводится из земли и дня (`courtCase`); здесь — только последствия.
 * Выбор всегда кому-то стоит: земле, лорду или казне.
 */
function judge(state: GameState, caseId: string, choice: CourtChoice): CommandResult {
  const current = courtCase(state)
  if (!current || current.id !== caseId) return fail('invalid', 'Такого дела на суде нет.')
  if (!current.choices.some((one) => one.id === choice)) {
    return fail('invalid', 'Так это дело не решают.')
  }
  const here = state.settlements[state.locationId]
  if (!here || here.owner !== PLAYER) {
    return fail('unavailableHere', 'Двор держат на своей земле.')
  }
  const draft = open(state)
  draft.courtDay = dayOf(draft.time)
  advance(draft, hours(4))
  const [first, second] = current.lords
  switch (choice) {
    case 'first':
    case 'second': {
      const won = choice === 'first' ? first : second
      const lost = choice === 'first' ? second : first
      if (won) shiftVassals(draft, 12, won.id)
      if (lost) shiftVassals(draft, -10, lost.id)
      notice(
        draft,
        `Межа отдана: ${won?.title ?? ''} ${won?.name ?? ''}. ${lost?.name ?? ''} ушёл молча.`,
        'world',
      )
      break
    }
    case 'split':
      if (first) shiftVassals(draft, -3, first.id)
      if (second) shiftVassals(draft, -3, second.id)
      notice(draft, 'Пустошь поделена пополам. Довольных нет, врагов тоже.', 'world')
      break
    case 'peasants':
      if (first) shiftVassals(draft, -12, first.id)
      if (current.locationId)
        draft.reputation = withPlaceRep(draft.reputation, current.locationId, 12)
      notice(draft, 'Ты взял сторону крестьян. Лорд поклонился и запомнил.', 'world')
      break
    case 'lord':
      if (first) shiftVassals(draft, 8, first.id)
      if (current.locationId)
        draft.reputation = withPlaceRep(draft.reputation, current.locationId, -8)
      notice(draft, 'Ты оставил суд лорду. Крестьяне разошлись без слов.', 'world')
      break
    case 'grant': {
      const held = current.locationId ? draft.settlements[current.locationId] : undefined
      const lost = held ? Math.round(dailyTax(held, foodSecurity(held)) * 30) : 0
      addMoney(draft, -lost)
      if (current.locationId)
        draft.reputation = withPlaceRep(draft.reputation, current.locationId, 10)
      notice(draft, `Подати прощены на месяц: казна недосчитается ${lost}.`, 'world')
      break
    }
    case 'refuse':
      if (current.locationId)
        draft.reputation = withPlaceRep(draft.reputation, current.locationId, -6)
      notice(draft, 'Подати взяты в срок. Старшины ушли, не поклонившись.', 'world')
      break
    default:
      break
  }
  return close(draft)
}

/** Принять лорда под свою руку: уходят к тому, кому верят больше, чем короне. */
function inviteLord(state: GameState, lordId: string): CommandResult {
  if (!state.realm) return fail('requirements', 'Под чью руку? У тебя нет своего имени.')
  const lord = lordById(state.politics, lordId)
  if (!lord) return fail('unknownAction', 'Такого лорда нет.')
  if (lord.kingdomId === PLAYER) return fail('invalid', 'Он и так твой.')
  if (lord.loyalty > 35) return fail('requirements', 'Он слишком верен своей короне.')
  if (lordRep(state.reputation, lordId) < 30) {
    return fail('requirements', 'Он тебя недостаточно знает, чтобы idти под твою руку.')
  }

  const draft = open(state)
  notice(draft, `${lord.title} ${lord.name} пошёл под твою руку.`)
  draft.politics = {
    ...draft.politics,
    lords: draft.politics.lords.map((candidate) =>
      candidate.id === lordId ? { ...candidate, kingdomId: PLAYER, loyalty: 55 } : candidate,
    ),
  }
  advance(draft, hours(3))
  return close(draft)
}

/** Не пускают ли тебя на порог: разорённые города помнят. */
function checkWelcome(state: GameState): CommandResult | null {
  // Вражда ордена с короной холодит приём на её земле (этап 42): свой орден
  // здесь — чужак, и это вычитается из того, что о тебе помнят.
  return isShunned(
    placeRep(state.reputation, state.locationId) + feudChill(state, state.locationId),
  )
    ? fail('shunned', 'Тебя тут помнят и не ждут.')
    : null
}

function takeService(state: GameState, kingdomId: string): CommandResult {
  const kingdom = state.world.kingdoms[kingdomId]
  if (!kingdom) return fail('unknownAction', 'Такого королевства нет.')
  if (state.service === kingdomId) return fail('invalid', 'Ты уже на этой службе.')
  const here = kingdomOf(state.world, state.locationId)
  if (here?.id !== kingdomId) {
    return fail('unavailableHere', 'На службу нанимают на своей земле, а не по слухам.')
  }
  // Корона не берёт на службу людей ордена, с которым в ссоре (этап 42).
  const own = ownOrder(state)
  if (own?.feud.kingdoms.includes(kingdomId)) {
    return fail('shunned', `${kingdom.name} не берёт на службу людей ордена «${own.name}».`)
  }

  const draft = open(state)
  notice(draft, `Служба принята: ${kingdom.name}.`)
  advance(draft, hours(2))
  draft.service = kingdomId
  return close(draft)
}

function leaveService(state: GameState): CommandResult {
  if (!state.service) return fail('invalid', 'Ты никому не служишь.')
  const draft = open(state)
  notice(draft, 'Служба оставлена.')
  draft.service = null
  return close(draft)
}

/** Выйти на врага: имеет смысл только на службе и только пока идёт война. */
function seekEnemy(state: GameState): CommandResult {
  if (!state.service) return fail('invalid', 'Воевать не за кого: ты никому не служишь.')
  if (warsOf(state.politics, state.service).length === 0) {
    return fail('unavailableHere', 'Сейчас твоё королевство ни с кем не воюет.')
  }
  if (partySize(state.party) < 3) return fail('invalid', 'С такими силами на войну не ходят.')

  const here = state.world.locations[state.locationId]
  const draft = open(state)
  const [enemy, afterEnemy] = warband(partyStrength(state.party) / 24, draft.rng)
  draft.rng = afterEnemy
  const war = warsOf(state.politics, state.service)[0]
  const foe = war ? (war.a === state.service ? war.b : war.a) : null
  draft.battle = startBattle(draft.party, enemy, here?.terrain ?? 'plains', {
    foeId: foe ? (state.world.kingdoms[foe] ? `crown:${foe}` : foe) : null,
  })
  notice(draft, 'Впереди чужие знамёна.')
  advance(draft, hours(4))
  addFatigue(draft, 10)
  return close(draft)
}

/**
 * Напасть на чужую дружину.
 *
 * До этого война шла мимо игрока: лорды воевали где-то, а он мог только
 * услышать об этом в журнале. Войско, стоящее в том же месте, — это то, во что
 * можно вмешаться: разбить осаждающих, перехватить идущих грабить, вступиться
 * за своего сюзерена. Бой идёт обычным порядком, как со всяким противником.
 */
function attackBand(state: GameState, bandId: string): CommandResult {
  if (state.battle) return fail('invalid', 'Сначала кончи бой, который идёт.')
  const band = state.bands.find((candidate) => candidate.id === bandId)
  if (!band) return fail('invalid', 'Этого войска здесь уже нет.')
  // В пути перехватывают тех, кто на том же отрезке: стоит на его конце или
  // идёт по нему навстречу. Это и есть перехват — встретить до того, как дошли.
  const onLeg = state.journey
    ? bandsOnLeg(state.bands, state.journey.fromId, state.journey.toId).some(
        (one) => one.id === bandId,
      )
    : false
  if (!onLeg && (band.locationId !== state.locationId || band.travel)) {
    return fail('unavailableHere', 'Это войско не здесь.')
  }
  if (partySize(state.party) < 2) {
    return fail('invalid', 'В одиночку на войско не ходят.')
  }
  const size = bandSize(band)
  if (size <= 0) return fail('invalid', 'Воевать там уже не с кем.')

  const here = state.world.locations[state.locationId]
  const lord = lordById(state.politics, band.lordId)
  const name = lord ? `${lord.title} ${lord.name}` : 'Королевская рать'
  const draft = open(state)
  // Разбитое войско снимается с карты сразу: исход боя решит, что с ним стало,
  // но стоять рядом целым, пока его бьют, оно не может.
  draft.bands = draft.bands.filter((candidate) => candidate.id !== bandId)

  // Оборона своих стен: войско стоит под твоим местом — гарнизон и ополчение
  // встают в строй рядом с отрядом, камень помогает тебе.
  const settlement = state.settlements[state.locationId]
  const defending =
    settlement &&
    isOwnedByPlayer(settlement) &&
    band.goal.type === 'siege' &&
    band.goal.targetId === state.locationId
  let stake: Battle['stake'] = null
  let ownWalls = 1
  if (defending) {
    const levy = Math.floor(settlement.population / 260)
    let party = draft.party
    for (const [troop, count] of Object.entries(settlement.garrison)) {
      if (count) party = withUnits(party, troop as TroopId, count)
    }
    if (levy > 0) party = withUnits(party, 'militia', levy)
    draft.party = party
    draft.settlements = {
      ...draft.settlements,
      [state.locationId]: { ...settlement, garrison: {} },
    }
    stake = { type: 'defense', locationId: state.locationId, garrison: settlement.garrison, levy }
    ownWalls = wallsFor(settlement)
  }

  const enemy: BattleSide = { name, units: band.units, morale: band.morale, fatigue: 0 }
  const softened = allyStrikesFirst(draft, enemy, state.locationId, 1, ownWalls)
  if (!softened) {
    notice(draft, `${name} разбит союзниками: тебе досталось только поле.`, 'war')
    if (stake) restoreGarrison(draft, stake)
    advance(draft, hours(2))
    return close(draft)
  }
  draft.battle = startBattle(draft.party, softened, here?.terrain ?? 'plains', {
    ...(stake ? { stake } : {}),
    ownWalls,
    foeId: band.lordId,
  })
  notice(draft, defending ? `${name} идёт на приступ. Ты на стенах.` : `${name} принимает бой.`)
  advance(draft, hours(2))
  addFatigue(draft, 8)
  return close(draft)
}

function wallsFor(settlement: Settlement): number {
  return hasBuilding(settlement, 'walls') ? 2.1 : 1.35
}

/** Своё ли это войско: своей короны, союзной или своего владения. */
function friendlyBand(state: GameState, band: Band): boolean {
  if (band.kingdomId === PLAYER) return true
  if (!band.kingdomId || !state.service) return false
  return band.kingdomId === state.service || allied(state.politics, state.service, band.kingdomId)
}

/**
 * Союзники бьют первыми.
 *
 * Своё войско, стоящее там же, не смотрит со стороны: оно сходится с врагом
 * до тебя, теми же правилами боя, что и дружины между собой. Тебе достаётся
 * то, что осталось; если не осталось ничего — пусто, и боя нет.
 */
function allyStrikesFirst(
  draft: Draft,
  enemy: BattleSide,
  locationId: string,
  enemyWalls: number,
  ownWalls: number,
): BattleSide | null {
  const ally = draft.bands.find(
    (band) =>
      band.locationId === locationId &&
      !band.travel &&
      bandSize(band) > 0 &&
      friendlyBand(draft.base, band),
  )
  if (!ally) return enemy
  const terrain = draft.base.world.locations[locationId]?.terrain ?? 'plains'
  const foe: Band = {
    ...ally,
    id: 'foe',
    lordId: 'foe',
    units: enemy.units,
    morale: enemy.morale,
  }
  // Кто за стенами, того стены и берегут: при обороне враг штурмует союзника.
  const behindWalls = ownWalls > 1
  const fight = behindWalls
    ? clash(foe, ally, terrain, ownWalls, draft.rng)
    : clash(ally, foe, terrain, enemyWalls, draft.rng)
  draft.rng = fight.rng
  const allyUnits = behindWalls ? fight.defender : fight.attacker
  const enemyUnits = behindWalls ? fight.attacker : fight.defender
  const allyWon = behindWalls ? !fight.attackerWon : fight.attackerWon

  draft.bands = draft.bands
    .map((band) => (band.id === ally.id ? { ...band, units: allyUnits } : band))
    .filter((band) => bandSize(band) > 0)
  const lord = lordById(draft.base.politics, ally.lordId)
  const allyName = lord ? `${lord.title} ${lord.name}` : 'Союзное войско'
  notice(draft, `${allyName} ударил первым: пало ${fight.fallen}.`, 'war')
  if (unitsSize(enemyUnits) === 0) return null
  return {
    ...enemy,
    units: enemyUnits,
    morale: Math.max(ROUT_MORALE + 5, enemy.morale - (allyWon ? 15 : 0)),
  }
}

// --- спутники ---------------------------------------------------------------

/** Кого можно встретить в этом месте: тех, кого ты ещё не звал. */
export function companionsAt(
  state: GameState,
  locationId = state.locationId,
): readonly CompanionDef[] {
  const location = state.world.locations[locationId]
  if (!location) return []
  const population = state.settlements[locationId]?.population ?? location.population
  const taken = new Set(state.companions.map((one) => one.id))
  const kingdom = kingdomOf(state.world, locationId)?.id ?? null
  return Object.values(COMPANIONS).filter(
    (def) =>
      !taken.has(def.id) &&
      isAvailableAt(def.where, location, population) &&
      (!def.kingdomId || def.kingdomId === kingdom),
  )
}

/**
 * Поступок на виду у спутников: нрав считает, реплики — говорят.
 *
 * До этого нрав только лежал в данных: `witness` никто не звал, и спутники
 * терпели всё. Теперь каждый заметный поступок проходит через них: кто-то
 * скажет слово, кто-то уйдёт — и об этом будет строка в летописи.
 */
function seeDeed(draft: Draft, deed: DeedId): void {
  // И церковь смотрит (этап 51): разорение и брошенное слово — грех, накормить
  // голодного и пощадить пленных — нет. Вера здесь счёт, а не украшение.
  const sin = PIETY_DEEDS[deed] ?? 0
  if (sin !== 0) draft.piety = Math.max(-100, Math.min(100, draft.piety + sin))
  // Свои лорды тоже смотрят (этап 43): разорение — не то, чему хотят служить.
  const felt = VASSALS_FEEL[deed] ?? 0
  if (felt !== 0 && vassalsOf(draft.base).length > 0) shiftVassals(draft, felt, null)
  // Орден судит по уставу (этап 42): тем же языком поступков, что и спутники.
  const own = ownOrder(draft.base)
  if (own && charterFeels(own, deed) !== 0) {
    addStanding(draft, charterFeels(own, deed), `${own.name}: ${DEED_LABELS[deed]}.`)
  }
  const present = following(draft.companions)
  if (present.length === 0) return
  const result = witness(draft.companions, deed)
  draft.companions = result.companions
  // Говорит тот, кого поступок задел сильнее всего.
  let speaker: Companion | null = null
  let strongest = 0
  for (const companion of present) {
    const shift = Math.abs(TEMPERS[companion.temper]?.feels[deed] ?? 0)
    if (shift > strongest) {
      strongest = shift
      speaker = companion
    }
  }
  if (speaker) {
    const lines = TEMPER_LINES[speaker.temper].onDeed[deed] ?? []
    const line = pickLine(draft, lines)
    if (line) notice(draft, `${speaker.name}: «${line}»`, 'people')
  }
  for (const gone of result.left) {
    notice(draft, `${gone.name} уходит: «${TEMPER_LINES[gone.temper].leaving}»`, 'people')
  }
}

/** В дороге спутники иногда говорят — не каждый переход, чтобы не надоесть. */
function roadTalk(draft: Draft): void {
  const present = following(draft.companions)
  if (present.length === 0) return
  const [talks, afterTalk] = rollChance(draft.rng, 0.12)
  draft.rng = afterTalk
  if (!talks) return
  const [index, afterPick] = nextInt(draft.rng, 0, present.length - 1)
  draft.rng = afterPick
  const who = present[index]
  if (!who) return
  const line = pickLine(draft, TEMPER_LINES[who.temper].onRoad)
  if (line) notice(draft, `${who.name}: «${line}»`, 'people')
}

/** В бою между раундами: реплика ложится в рассказ боя. */
function battleTalk(draft: Draft, battle: Battle): Battle {
  const present = following(draft.companions)
  if (present.length === 0 || battle.outcome !== 'ongoing') return battle
  const [talks, afterTalk] = rollChance(draft.rng, 0.2)
  draft.rng = afterTalk
  if (!talks) return battle
  const [index, afterPick] = nextInt(draft.rng, 0, present.length - 1)
  draft.rng = afterPick
  const who = present[index]
  if (!who) return battle
  const line = pickLine(draft, TEMPER_LINES[who.temper].inBattle)
  if (!line) return battle
  return { ...battle, log: [...battle.log, `${who.name.split(' ')[0]}: «${line}»`] }
}

function pickLine(draft: Draft, lines: readonly string[]): string | null {
  if (lines.length === 0) return null
  const [index, next] = nextInt(draft.rng, 0, lines.length - 1)
  draft.rng = next
  return lines[index] ?? null
}

/** Выкуп пленного спутника: сто монет и сутки — и он снова с тобой. */
function ransomCompanion(state: GameState, companionId: string): CommandResult {
  const companion = state.companions.find((one) => one.id === companionId)
  if (!companion) return fail('invalid', 'Такого спутника у тебя нет.')
  if (!companion.captive) return fail('invalid', `${companion.name} не в плену.`)
  if (state.character.money < COMPANION_RANSOM) {
    return fail('noMoney', `За него просят ${COMPANION_RANSOM}, а у тебя ${state.character.money}.`)
  }
  const draft = open(state)
  addMoney(draft, -COMPANION_RANSOM)
  draft.companions = draft.companions.map((one) =>
    one.id === companionId ? { ...one, captive: false, mood: Math.min(100, one.mood + 10) } : one,
  )
  notice(draft, `${companion.name} выкуплен за ${COMPANION_RANSOM} и снова с тобой.`, 'people')
  advance(draft, hours(6))
  return close(draft)
}

export const COMPANION_RANSOM = 100

// --- глушь ------------------------------------------------------------------

/** Сколько часов занимает ночёвка под открытым небом. */
export const CAMP_HOURS = 8

/**
 * Лагерь.
 *
 * Сутки вне поселения были невозможны: спать можно было только там, где есть
 * крыша, поэтому дорога длиннее одного дня не существовала. Лагерь — это
 * ночёвка на земле: отдыхаешь хуже, чем в доме, и не знаешь, кто выйдет к огню.
 */
function camp(state: GameState): CommandResult {
  const here = state.world.locations[state.locationId]
  if (!here) return fail('invalid', 'Непонятно, где находится герой.')
  // В пути крыши нет по определению: заночевать можно прямо на дороге, и это
  // то решение, которого у мгновенного перемещения быть не могло.
  if (!state.journey && state.settlements[state.locationId]) {
    return fail('unavailableHere', 'Здесь есть крыша: лагерем встают там, где её нет.')
  }
  // В море костра не разводят: палуба — не обочина.
  if (state.journey?.sea) {
    return fail('unavailableHere', 'Ты в море. Тут не встают лагерем — тут стоят вахту.')
  }

  const draft = open(state)
  // Зимняя ночёвка — другое дело (этап 38): под открытым небом в мороз не
  // отдыхают, а пережидают. Выживание здесь не украшение: оно решает, встанешь
  // ты утром отдохнувшим или отмороженным.
  const winter = seasonOf(dayOf(state.time)) === 'winter'
  notice(
    draft,
    winter
      ? 'Ночёвка в мороз: костёр, лапник и очередь не дать огню погаснуть.'
      : state.journey
        ? 'Ночёвка у дороги: костёр и очередь караулить.'
        : 'Костёр, котелок и очередь караулить.',
  )
  advance(draft, hours(CAMP_HOURS))
  // Под небом отдыхают хуже, чем под крышей: три четверти от сна в доме. В
  // мороз — вдвое хуже того.
  addFatigue(draft, -Math.round(SLEEP_RECOVERY_PER_HOUR * CAMP_HOURS * (winter ? 0.4 : 0.75)))
  practice(draft, 'survival', winter ? 30 : 18)
  if (winter) frostbite(draft)
  // Ночь в глуши — это ещё и ночь в глуши. В пути опасность берётся у той
  // земли, к которой идёшь: она и лежит вокруг костра.
  ambush(draft, state.journey ? state.journey.toId : state.locationId)
  return close(draft)
}

/**
 * Осмотреться.
 *
 * Место без жителей не пустое: в кургане лежит то, ради чего его насыпали, у
 * брода стоит непривезённый тюк, в отвале — недобранная жила. Находка одна на
 * место за всю игру, иначе курган становится станком для денег.
 */
function search(state: GameState): CommandResult {
  const here = state.world.locations[state.locationId]
  if (!here || !isSite(here.archetype)) {
    return fail('unavailableHere', 'Искать имеет смысл там, где не живут люди.')
  }
  const find = SITES[here.archetype].find
  if (!find) return fail('unavailableHere', 'Здесь нечего искать.')
  if (state.searchedSites.includes(state.locationId)) {
    return fail('invalid', 'Здесь уже всё осмотрено.')
  }
  const blocked = checkFatigue(state.character, 16)
  if (blocked) return blocked

  const draft = open(state)
  draft.searchedSites = [...draft.searchedSites, state.locationId]
  advance(draft, hours(3))
  addFatigue(draft, 16)
  practice(draft, 'survival', 14)

  // Ищут выживанием либо ловкостью рук: следопыт и вор находят разное, но оба
  // находят. Ниже нужной ступени находят только следы чужой удачи.
  const skill = Math.max(
    skillLevel(state.character, 'survival'),
    skillLevel(state.character, 'sleight'),
  )
  const odds = Math.max(0.05, Math.min(0.92, 0.25 + (skill - find.need) * 0.09))
  // Зрение (этап 41): кто видел сквозь насыпь, тот не ищет вслепую.
  const insight = state.character.insight === true
  const [found, afterRoll] = insight ? [true, draft.rng] : rollChance(draft.rng, odds)
  draft.rng = afterRoll
  if (insight) draft.character = { ...draft.character, insight: false }
  if (!found) {
    notice(draft, 'Обошёл кругом, обстучал, обшарил. Ничего.')
    return close(draft)
  }

  notice(draft, find.text, 'money')
  if (find.money) {
    const [low, high] = find.money
    const [amount, afterAmount] = nextInt(draft.rng, low, high)
    draft.rng = afterAmount
    addMoney(draft, amount)
    notice(draft, `Взято: ${amount} монет.`, 'money')
  }
  if (find.good && find.amount) {
    const [low, high] = find.amount
    const [amount, afterAmount] = nextInt(draft.rng, low, high)
    draft.rng = afterAmount
    addGoods(draft, find.good, amount)
    notice(draft, `Взято: ${GOODS[find.good].label.toLowerCase()} — ${amount}.`, 'money')
  }
  if (find.grim) {
    // Могилу разрыли, приношение унесли. Округа этого не забудет.
    draft.reputation = withPlaceRep(draft.reputation, state.locationId, -12)
    seeDeed(draft, 'sack')
  }
  return close(draft)
}

// --- поручения руками -------------------------------------------------------

function startChain(state: GameState, chainId: string): CommandResult {
  const chain = chainDef(chainId)
  if (!chain) return fail('unknownAction', 'Такого поручения нет.')
  if (!chainsOfferedAt(state).some((one) => one.id === chainId)) {
    return fail('unavailableHere', 'Здесь этого не просят.')
  }
  const draft = open(state)
  draft.chains = [
    ...draft.chains,
    {
      chainId,
      step: 0,
      startedDay: dayOf(state.time),
      winsAtStart: state.battlesWon,
      givenAt: state.locationId,
    },
  ]
  notice(draft, `${chain.giver.name}: «${chain.intro}»`, 'people')
  const first = chain.steps[0]
  if (first) notice(draft, first.text, 'notice')
  advance(draft, 30)
  return close(draft)
}

/**
 * Шаги цепочек проверяются после каждой команды: мир решает, сделано ли.
 * Доставка забирает товар; последний шаг — награда и строка на прощание.
 */
function advanceChains(draft: Draft): void {
  if (draft.chains.length === 0) return
  const still: ChainProgress[] = []
  for (const progress of draft.chains) {
    const chain = chainDef(progress.chainId)
    if (!chain) continue
    let current = progress
    for (;;) {
      const step = chain.steps[current.step]
      if (!step || !stepDone(snapshotOf(draft), step, current)) break
      if (step.type === 'deliver') addGoods(draft, step.good, -step.amount)
      current = { ...current, step: current.step + 1 }
      const next = chain.steps[current.step]
      if (next) notice(draft, `${chain.title}: ${next.text}`, 'notice')
    }
    if (current.step >= chain.steps.length) {
      rewardChain(draft, chain)
      draft.doneChains = [...draft.doneChains, chain.id]
      continue
    }
    still.push(current)
  }
  draft.chains = still
}

function rewardChain(draft: Draft, chain: ChainDef): void {
  notice(draft, `${chain.giver.name}: «${chain.outro}»`, 'people')
  if (chain.reward.money > 0) addMoney(draft, chain.reward.money)
  if (chain.reward.renown) draft.renown += chain.reward.renown
  if (chain.reward.placeRep) {
    draft.reputation = withPlaceRep(draft.reputation, draft.locationId, chain.reward.placeRep)
  }
  if (chain.reward.tag && !draft.character.tags.includes(chain.reward.tag)) {
    patch(draft, { tags: [...draft.character.tags, chain.reward.tag] })
  }
  notice(draft, `Поручение «${chain.title}» исполнено: ${chain.reward.money} монет.`, 'money')
}

/** Состояние как его видят чистые проверки, собранное из черновика. */
function snapshotOf(draft: Draft): GameState {
  return {
    ...draft.base,
    world: draft.world,
    character: draft.character,
    locationId: draft.locationId,
    settlements: draft.settlements,
    companions: draft.companions,
    chains: draft.chains,
    doneChains: draft.doneChains,
    battlesWon: draft.battlesWon,
  }
}

function recruitCompanion(state: GameState, companionId: string): CommandResult {
  const def = companionDef(companionId)
  if (!def) return fail('invalid', 'Такого человека нет.')
  if (state.companions.some((one) => one.id === companionId)) {
    return fail('invalid', 'Он уже с тобой.')
  }
  if (!companionsAt(state).some((one) => one.id === companionId)) {
    return fail('unavailableHere', 'Здесь его не встретишь.')
  }
  if (state.character.money < def.fee) {
    return fail('noMoney', `Он просит ${def.fee}, а у тебя ${state.character.money}.`)
  }
  const draft = open(state)
  addMoney(draft, -def.fee)
  draft.companions = [...draft.companions, hireCompanion(def)]
  notice(draft, `${def.name} идёт с тобой.`, 'people')
  advance(draft, hours(1))
  return close(draft)
}

function dismissCompanion(state: GameState, companionId: string): CommandResult {
  const companion = state.companions.find((one) => one.id === companionId)
  if (!companion) return fail('invalid', 'Такого спутника у тебя нет.')
  const draft = open(state)
  draft.companions = draft.companions.filter((one) => one.id !== companionId)
  // Дело без управляющего не бросают, а ведут вполсилы — см. tickEnterprises.
  draft.enterprises = draft.enterprises.map((one) =>
    one.managerId === companionId ? { ...one, managerId: null } : one,
  )
  notice(draft, `${companion.name} уходит своей дорогой.`, 'people')
  advance(draft, hours(1))
  return close(draft)
}

function assignCompanion(
  state: GameState,
  companionId: string,
  role: CompanionRole,
): CommandResult {
  const companion = state.companions.find((one) => one.id === companionId)
  if (!companion) return fail('invalid', 'Такого спутника у тебя нет.')
  if (companion.captive) return fail('invalid', `${companion.name} в плену.`)

  if (role.type === 'steward') {
    if (state.settlements[role.locationId]?.owner !== PLAYER) {
      return fail('invalid', 'Это владение не твоё.')
    }
  }
  if (role.type === 'factor') {
    const enterprise = state.enterprises.find((one) => one.id === role.enterpriseId)
    if (!enterprise) return fail('invalid', 'Такого дела у тебя нет.')
  }

  const draft = open(state)
  // Управляющий у дела один: прежнего освобождаем.
  draft.enterprises = draft.enterprises.map((one) =>
    one.managerId === companionId ? { ...one, managerId: null } : one,
  )
  if (role.type === 'factor') {
    draft.enterprises = draft.enterprises.map((one) =>
      one.id === role.enterpriseId ? { ...one, managerId: companionId } : one,
    )
  }
  draft.companions = draft.companions.map((one) =>
    one.id === companionId ? { ...one, role } : one,
  )
  notice(
    draft,
    role.type === 'party'
      ? `${companion.name} снова идёт с тобой.`
      : role.type === 'steward'
        ? `${companion.name} остаётся управлять владением.`
        : `${companion.name} берёт дело в свои руки.`,
  )
  advance(draft, hours(1))
  return close(draft)
}

// --- дела -------------------------------------------------------------------

function foundCaravan(state: GameState, awayId: string): CommandResult {
  if (state.character.money < CARAVAN_COST) {
    return fail('noMoney', `На караван нужно ${CARAVAN_COST}.`)
  }
  if (!state.world.locations[awayId]) return fail('invalid', 'Такого места нет.')
  if (awayId === state.locationId) return fail('invalid', 'Караван должен куда-то ходить.')
  if (!nextHop(state.world, state.locationId, awayId)) {
    return fail('invalid', 'Туда нет дороги.')
  }
  const draft = open(state)
  addMoney(draft, -CARAVAN_COST)
  draft.enterprises = [
    ...draft.enterprises,
    {
      id: `caravan:${dayOf(draft.time)}:${draft.enterprises.length}`,
      kind: 'caravan',
      locationId: state.locationId,
      homeId: state.locationId,
      awayId,
      travel: null,
      travelTarget: null,
      invested: CARAVAN_COST,
      managerId: null,
      cargo: {},
      earned: 0,
    },
  ]
  const where = state.world.locations[awayId]?.name ?? 'дальнее место'
  notice(draft, `Караван снаряжён: отсюда и до ${where}.`, 'trade')
  advance(draft, hours(4))
  return close(draft)
}

/**
 * Отдать судно в дело.
 *
 * Своё судно перестаёт быть твоим ходом и становится доходом: оно ходит между
 * двумя гаванями, торгует разницей цен и приносит вдвое против обоза — потому
 * что и рискует вдвое. Однажды оно не вернётся, и тогда не станет ни дохода, ни
 * корабля. Пока оно в деле, плавать самому не на чем: судно одно.
 */
function foundShipping(state: GameState, awayId: string): CommandResult {
  const ship = state.ship
  if (!ship) return fail('requirements', 'Морской торг заводят судном, а его у тебя нет.')
  if (state.character.money < SHIPPING_COST) {
    return fail('noMoney', `На товар в трюм нужно ${SHIPPING_COST}.`)
  }
  if (!state.world.locations[awayId]) return fail('invalid', 'Такого места нет.')
  if (awayId === state.locationId) return fail('invalid', 'Судно должно куда-то ходить.')
  const lane = lanesFrom(state.world, state.locationId).find((one) => one.to === awayId)
  if (!lane) return fail('invalid', 'Отсюда туда нет морского пути.')

  const draft = open(state)
  addMoney(draft, -SHIPPING_COST)
  draft.ship = null
  draft.enterprises = [
    ...draft.enterprises,
    {
      id: `shipping:${dayOf(draft.time)}:${draft.enterprises.length}`,
      kind: 'shipping',
      locationId: state.locationId,
      homeId: state.locationId,
      awayId,
      travel: null,
      travelTarget: null,
      invested: SHIPPING_COST,
      managerId: null,
      cargo: {},
      earned: 0,
      ship: ship.kind,
    },
  ]
  const where = state.world.locations[awayId]?.name ?? 'дальняя гавань'
  notice(draft, `«${ship.name}» пошла в торг: отсюда и до ${where}.`, 'trade')
  advance(draft, hours(4))
  return close(draft)
}

function foundWorkshop(state: GameState): CommandResult {
  if (state.character.money < WORKSHOP_COST) {
    return fail('noMoney', `На мастерскую нужно ${WORKSHOP_COST}.`)
  }
  const here = state.world.locations[state.locationId]
  if (
    !here ||
    (here.archetype !== 'city' && here.archetype !== 'capital' && here.archetype !== 'town')
  ) {
    return fail('unavailableHere', 'Мастерскую держат в городе, а не в поле.')
  }
  if (
    state.enterprises.some((one) => one.kind === 'workshop' && one.locationId === state.locationId)
  ) {
    return fail('invalid', 'Здесь у тебя уже есть мастерская.')
  }
  const draft = open(state)
  addMoney(draft, -WORKSHOP_COST)
  draft.enterprises = [
    ...draft.enterprises,
    {
      id: `workshop:${state.locationId}`,
      kind: 'workshop',
      locationId: state.locationId,
      homeId: null,
      awayId: null,
      travel: null,
      travelTarget: null,
      invested: WORKSHOP_COST,
      managerId: null,
      cargo: {},
      earned: 0,
    },
  ]
  notice(draft, `Мастерская открыта в месте ${here.name}.`, 'trade')
  advance(draft, hours(6))
  return close(draft)
}

function closeEnterprise(state: GameState, enterpriseId: string): CommandResult {
  const enterprise = state.enterprises.find((one) => one.id === enterpriseId)
  if (!enterprise) return fail('invalid', 'Такого дела у тебя нет.')
  const draft = open(state)
  // Половину вложенного возвращают: остальное осело в чужих карманах.
  addMoney(draft, Math.round(enterprise.invested / 2))
  // А судно возвращается целиком — если, конечно, оно ещё на плаву и хозяину
  // есть куда его принять.
  if (enterprise.ship && !draft.ship) {
    draft.ship = { kind: enterprise.ship, name: SHIP_NAMES[0] ?? 'Чайка', condition: 0.8 }
    notice(
      draft,
      `Судно вернулось к хозяину: ${SHIPS[enterprise.ship].label.toLowerCase()}.`,
      'trade',
    )
  }
  draft.enterprises = draft.enterprises.filter((one) => one.id !== enterpriseId)
  draft.companions = draft.companions.map((one) =>
    one.role.type === 'factor' && one.role.enterpriseId === enterpriseId
      ? { ...one, role: { type: 'party' } }
      : one,
  )
  notice(draft, 'Дело свёрнуто.', 'trade')
  advance(draft, hours(2))
  return close(draft)
}

// --- брак -------------------------------------------------------------------

/** За кого можно посвататься: за дом того, кто тебя знает и здесь сидит. */
export function matchesAt(state: GameState, locationId = state.locationId): readonly Lord[] {
  if (state.character.family.spouse) return []
  const owner = state.settlements[locationId]?.owner
  if (!owner || owner === PLAYER) return []
  const lord = lordById(state.politics, owner)
  return lord ? [lord] : []
}

/**
 * Сватовство.
 *
 * Дом отдаёт дочь или сына не всякому: смотрят на славу и на то, как о тебе
 * говорят. Согласие — это союз: с коронами, которым служит дом, отношения
 * теплеют, и такой союз держится дольше обычного (diplomacy.ts).
 */
function proposeMarriage(state: GameState, lordId: string): CommandResult {
  if (state.character.family.spouse) return fail('invalid', 'Ты уже в браке.')
  if (state.character.age < 16) return fail('invalid', 'Рано.')
  const lord = lordById(state.politics, lordId)
  if (!lord) return fail('invalid', 'Такого дома нет.')
  if (!matchesAt(state).some((one) => one.id === lordId)) {
    return fail('unavailableHere', 'Свататься надо там, где сидит дом.')
  }
  // Смотрят на славу и на то, что о тебе помнят.
  const opinion = lordRep(state.reputation, lordId)
  const weight = state.renown + opinion * 2
  if (weight < 40) {
    return fail('invalid', `${lord.title} ${lord.name} не отдаст своей крови безвестному.`)
  }

  // Венчает церковь (этап 51): отлучённого не венчают нигде, а в Святом
  // королевстве не венчают и нерадивого.
  const devout = kingdomOf(state.world, state.locationId)?.id === 'robl'
  if (pietyOf(state) <= EXCOMMUNICATED || (devout && pietyOf(state) < -15)) {
    return fail('shunned', 'Церковь не благословит этот брак: с тобой не станут служить.')
  }
  const draft = open(state)
  const day = dayOf(draft.time)
  const [name, afterName] = spouseName(draft.rng)
  draft.rng = afterName
  patch(draft, {
    family: {
      ...draft.character.family,
      spouse: { name, lordId, kingdomId: lord.kingdomId, sinceDay: day },
    },
  })
  // Приданое: земля даётся не всегда, а деньги — всегда.
  const dowry = 80 + Math.round(lord.strength * 6)
  addMoney(draft, dowry)
  draft.renown += 15

  // Брак с домом короны — это союз с самой короной.
  if (lord.kingdomId && draft.realm) {
    const pact = { a: draft.realm.name, b: lord.kingdomId, since: day, byMarriage: true }
    draft.politics = { ...draft.politics, alliances: [...draft.politics.alliances, pact] }
  }
  if (lord.kingdomId) {
    const key = pairOf(lord.kingdomId, lord.kingdomId)
    draft.politics = {
      ...draft.politics,
      relations: { ...draft.politics.relations, [key]: 100 },
    }
  }
  notice(draft, `Сговорено: ${name} из дома ${lord.name}. Приданое — ${dowry}.`, 'people')
  advance(draft, hours(8))
  return close(draft)
}

const SPOUSE_NAMES = ['Мирава', 'Ждана', 'Бранимир', 'Любава', 'Радогост', 'Веселина']

function spouseName(rng: Rng): [string, Rng] {
  const [index, next] = nextInt(rng, 0, SPOUSE_NAMES.length - 1)
  return [SPOUSE_NAMES[index] ?? 'Мирава', next]
}

/**
 * Закрыть ворота.
 *
 * Единственное, что против мора может сделать владетель, кроме как привести
 * лекаря: закрыть место. Мор внутри не выходит наружу и уносит меньше, но
 * торговля стоит, а люди помнят, кто их запер. Только на своей земле и только
 * пока мор идёт — открываются ворота сами, когда он отступит.
 */
function quarantine(state: GameState): CommandResult {
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')
  if (settlement.owner !== PLAYER) return fail('invalid', 'Запирать ворота может только хозяин.')
  if (!plagueAt(state.plagues, state.locationId))
    return fail('invalid', 'Мора здесь нет — запирать не от чего.')
  if (settlement.quarantined) return fail('invalid', 'Ворота уже закрыты.')
  const draft = open(state)
  draft.settlements = {
    ...draft.settlements,
    [state.locationId]: { ...settlement, quarantined: true },
  }
  draft.reputation = withPlaceRep(draft.reputation, state.locationId, -6)
  notice(draft, 'Ворота закрыты. Мор останется внутри — и люди это запомнят.', 'plague')
  advance(draft, hours(2))
  return close(draft)
}

/**
 * С каким навыком торгуются здесь и сейчас.
 *
 * На ярмарке продавцов много и все на виду: разница между «купить» и «продать»
 * сходится сама, как у того, кого на рынке знают (этап 39). Поэтому ярмарка —
 * прибавка к навыку, а не скидка: одна и та же линейка на все цены.
 */
export function tradeSkillAt(state: GameState): number {
  const fair = fairAt(state.world, state.locationId, dayOf(state.time))
  // Своя гильдия торгует со своими как со своими (этап 42).
  const guild = ownOrderHere(state)
  return (
    skillLevel(state.character, 'trade') + (fair ? FAIR_TRADE_BONUS : 0) + (guild?.perks.trade ?? 0)
  )
}

/**
 * Торг словом (этап 49).
 *
 * Не кнопка «скидка», а разговор: просишь уступить мягко, твёрдо или нахально.
 * Уступка держится до конца дня и только у этого купца; наглость он запомнит.
 * Торгуются раз в день: приставать к человеку каждый час — не торг.
 */
/**
 * Приём у лорда (этап 52, З1).
 *
 * В замок входят по чину: свой вассал и слуга короны — сразу, чужой — по славе
 * и милости, незнакомец — с подарком или никак. Ждать в сенях приходится тем
 * дольше, чем выше сидит хозяин.
 */
function seekAudience(state: GameState, lordId: string, gift: number): CommandResult {
  const lord = lordById(state.politics, lordId)
  if (!lord) return fail('unknownAction', 'Такого лорда нет.')
  if (!lordHere(state, state.locationId) || lordHere(state)?.id !== lordId) {
    return fail('unavailableHere', 'Этот лорд сидит не здесь.')
  }
  if (!Number.isInteger(gift) || gift < 0) return fail('invalid', 'Сколько именно?')
  if (state.character.money < gift) return fail('noMoney', 'Такого подарка у тебя нет.')
  const reception = receptionFor(state, lord, gift)
  const draft = open(state)
  if (gift > 0) addMoney(draft, -gift)
  advance(draft, hours(Math.max(1, reception.waitHours)))
  if (!reception.admits) {
    // Подарок, за который не пустили, не возвращают: его уже взяли у ворот.
    notice(draft, `${lord.title} ${lord.name}: «${reception.says}»`)
    if (reception.gift > 0) {
      notice(draft, `Говорят, с даром в ${reception.gift} тебя бы и выслушали.`)
    }
    return close(draft)
  }
  const gained = 4 + Math.round(gift / 25)
  draft.reputation = withLordRep(draft.reputation, lordId, Math.min(20, gained))
  notice(draft, `${lord.title} ${lord.name} принял тебя: «${reception.says}»`)
  return close(draft)
}

/**
 * Дела двора (этап 52, З4).
 *
 * Услуга за услугу, донос, покровительство. Каждое что-то даёт и чем-то
 * платит: донос слышат обе стороны, покровительство стоит денег и связывает.
 */
function courtIntrigue(
  state: GameState,
  lordId: string,
  kind: IntrigueKind,
  targetId?: string,
): CommandResult {
  const lord = lordById(state.politics, lordId)
  if (!lord) return fail('unknownAction', 'Такого лорда нет.')
  if (lordHere(state)?.id !== lordId) return fail('unavailableHere', 'Этот лорд сидит не здесь.')
  const def = intriguesFor(state, lord).find((one) => one.id === kind)
  if (!def) return fail('requirements', 'До такого разговора ты у него ещё не дорос.')
  if (state.character.money < def.cost) return fail('noMoney', `Нужно ${def.cost}.`)

  const draft = open(state)
  if (def.cost > 0) addMoney(draft, -def.cost)
  advance(draft, def.minutes)

  if (kind === 'service') {
    // Услуга — это взятое поручение двора: его дают, а не выдумывают.
    const offers = offersAt(state)
    const errand = offers[0]
    if (!errand) return fail('unavailableHere', 'Сейчас у двора нет дела для тебя.')
    if (state.quests.some((one) => one.id === errand.id)) {
      return fail('invalid', 'Это дело у тебя уже есть.')
    }
    draft.quests = [...draft.quests, { ...errand, reward: Math.round(errand.reward * 1.3) }]
    draft.reputation = withLordRep(draft.reputation, lordId, 5)
    notice(draft, `${lord.title} ${lord.name} принял твою услугу: ${describeQuest(state, errand)}.`)
    return close(draft)
  }

  if (kind === 'denounce') {
    const target = targetId ? lordById(state.politics, targetId) : null
    if (!target) return fail('invalid', 'На кого доносить?')
    if (!denounceTargets(state, lord).some((one) => one.id === target.id)) {
      return fail('invalid', 'Про этого человека лорду слушать неинтересно.')
    }
    draft.reputation = withLordRep(draft.reputation, lordId, 10)
    draft.reputation = withLordRep(draft.reputation, target.id, -25)
    // Донос — грех, и церковь это считает (этап 51).
    draft.piety = Math.max(-100, Math.min(100, draft.piety - 5))
    notice(
      draft,
      `Ты рассказал ${lord.title === '' ? '' : `${lord.title} `}${lord.name} о ${target.name}. Тот узнает, от кого.`,
    )
    return close(draft)
  }

  // Покровительство: он говорит за тебя, ты отвечаешь за него.
  draft.reputation = withLordRep(draft.reputation, lordId, 15)
  draft.renown += 1
  notice(draft, `${lord.title} ${lord.name} взял тебя под руку. Теперь ты его человек при дворе.`)
  return close(draft)
}

/**
 * Турнир при дворе (этап 52, З5).
 *
 * Слава и раны: взнос, бой на копьях и кошель победителю. Судит не кубик, а
 * то, чем ты дерёшься и на чём сидишь.
 */
function tourney(state: GameState, lordId: string): CommandResult {
  const lord = lordById(state.politics, lordId)
  if (!lord) return fail('unknownAction', 'Такого лорда нет.')
  if (lordHere(state)?.id !== lordId) return fail('unavailableHere', 'Этот лорд сидит не здесь.')
  // На турнир зовут тех, кого уже принимали: с улицы на ристалище не выходят.
  if (favourOf(state, lordId) < TOURNEY_FAVOUR) {
    return fail('shunned', 'На турнир зовут тех, кого принимают. Тебя пока нет.')
  }
  if (state.character.money < TOURNEY_FEE) return fail('noMoney', `Взнос ${TOURNEY_FEE}.`)
  const blocked = checkFatigue(state.character, 30)
  if (blocked) return blocked

  const draft = open(state)
  addMoney(draft, -TOURNEY_FEE)
  advance(draft, hours(6))
  addFatigue(draft, 30)
  const [roll, next] = nextFloat(draft.rng)
  draft.rng = next
  const gear = gearBonus(state.character)
  const skill =
    skillLevel(state.character, 'riding') * 0.5 + skillLevel(state.character, 'heavyWeapons') * 0.5
  const chance = Math.min(0.85, 0.15 + skill * 0.012 + gear.attack * 0.01)
  practice(draft, 'riding', 30)
  practice(draft, 'heavyWeapons', 25)
  if (roll < chance) {
    addMoney(draft, TOURNEY_PURSE)
    draft.renown += 2
    draft.reputation = withLordRep(draft.reputation, lordId, 12)
    notice(draft, `Турнир у ${lord.name}: кошель твой — ${TOURNEY_PURSE}. О тебе говорят.`)
    return close(draft)
  }
  // Проигравший падает: турнирное копьё тупое, но земля твёрдая.
  if (roll > 0.85) {
    // Турнирное копьё тупое, но земля твёрдая: пара суток в постели.
    if (!draft.character.wound) {
      draft.character = { ...draft.character, wound: { daysLeft: 3, severity: 0.25 } }
      notice(draft, 'Сбит с седла: рёбра целы, но дышать больно.')
    }
  }
  draft.reputation = withLordRep(draft.reputation, lordId, 3)
  notice(draft, `Турнир у ${lord.name}: тебя выбили из седла. Взнос остался у распорядителя.`)
  return close(draft)
}

/**
 * Суд лорда (этап 52, З6).
 *
 * Пожаловаться на то, что тебя обидели на его земле: шайка, пошлина, чужой
 * произвол. Решает он по нраву и по тому, в какой ты милости.
 */
function petition(state: GameState, lordId: string): CommandResult {
  const lord = lordById(state.politics, lordId)
  if (!lord) return fail('unknownAction', 'Такого лорда нет.')
  if (lordHere(state)?.id !== lordId) return fail('unavailableHere', 'Этот лорд сидит не здесь.')
  // Жалобу слушают у того, кто тебя знает: незнакомца отправят к сенешалю.
  const favour = favourOf(state, lordId)
  if (favour <= 0) return fail('shunned', 'Твою жалобу здесь не станут слушать: тебя не знают.')

  const draft = open(state)
  advance(draft, hours(2))
  const [roll, next] = nextFloat(draft.rng)
  draft.rng = next
  const verdict = judgeOf(lord, favour, roll)
  if (verdict === 'granted') {
    const paid = 60 + Math.round(favour * 2)
    addMoney(draft, paid)
    draft.reputation = withPlaceRep(draft.reputation, state.locationId, 5)
    notice(draft, `${lord.title} ${lord.name} рассудил в твою пользу: ${paid} в возмещение.`)
    return close(draft)
  }
  if (verdict === 'fined') {
    const fine = Math.min(state.character.money, 50)
    addMoney(draft, -fine)
    draft.reputation = withLordRep(draft.reputation, lordId, -5)
    notice(draft, `${lord.title} ${lord.name} счёл жалобу вздорной и взял с тебя ${fine}.`)
    return close(draft)
  }
  notice(draft, `${lord.title} ${lord.name} выслушал и не сделал ничего. Так тоже судят.`)
  return close(draft)
}

/**
 * Обряд (этап 51, Х1).
 *
 * В храме есть кто-то и есть что сделать: молебен, исповедь, отпевание,
 * благословение владыки. Каждый обряд стоит времени, жертвы на храм и даёт
 * благочестие; исповедь снимает вину, отпевание поднимает дух отряда.
 */
function rite(state: GameState, riteId: string): CommandResult {
  const def = RITES_BY_ID[riteId]
  if (!def) return fail('unknownAction', 'Такого обряда нет.')
  const priest = priestAt(state.world, state.settlements, state.locationId)
  if (!priest) return fail('unavailableHere', 'Здесь некому служить: храма нет.')
  if (def.needsBishop && priest.cloth !== 'bishop') {
    return fail('unavailableHere', `${priest.name} такого не служит: тут нужен владыка.`)
  }
  const piety = pietyOf(state)
  const welcome = templeAccepts(priest, piety, def)
  if (!welcome.accepts) return fail('shunned', `${priest.name}: «${welcome.says}»`)
  const offering = offeringFor(priest, def)
  if (state.character.money < offering) {
    return fail('noMoney', `На храм просят ${offering}, а у тебя ${state.character.money}.`)
  }

  const draft = open(state)
  addMoney(draft, -offering)
  advance(draft, def.minutes)
  const grace = graceFor(priest, def)
  draft.piety = Math.max(-100, Math.min(100, draft.piety + grace))
  notice(draft, `${priest.name}: «${welcome.says}» ${def.label}: на храм ${offering}.`)
  // Исповедь снимает не только вину: место видит, что ты покаялся.
  if (def.id === 'confession') {
    draft.reputation = withPlaceRep(draft.reputation, state.locationId, 4)
  }
  // Отпевание — по тем, кто остался в поле: отряд наутро идёт ровнее.
  if (def.id === 'funeral') {
    draft.party = { ...draft.party, morale: Math.min(100, draft.party.morale + 8) }
  }
  if (def.id === 'blessing') {
    draft.reputation = withPlaceRep(draft.reputation, state.locationId, 8)
    draft.renown += 1
  }
  practice(draft, 'concentration', 10)
  return close(draft)
}

/** Вклад в обитель или храм: деньги за благочестие, без обряда и без слов. */
function donate(state: GameState, amount: number): CommandResult {
  if (!Number.isInteger(amount) || amount <= 0) return fail('invalid', 'Сколько именно?')
  const priest = priestAt(state.world, state.settlements, state.locationId)
  if (!priest) return fail('unavailableHere', 'Здесь некому жертвовать.')
  if (state.character.money < amount) {
    return fail('noMoney', `У тебя нет столько: ${amount}.`)
  }
  const draft = open(state)
  addMoney(draft, -amount)
  advance(draft, 20)
  // Благочестие покупается плохо: сотня монет — это шесть-семь очков, не больше.
  const grace = Math.min(15, Math.round(Math.sqrt(amount) * 0.7))
  draft.piety = Math.max(-100, Math.min(100, draft.piety + grace))
  draft.reputation = withPlaceRep(draft.reputation, state.locationId, 2)
  notice(draft, `Вклад на храм: ${amount}. ${priest.name} записал тебя в поминание.`)
  return close(draft)
}

/**
 * Праздник (этап 51, Х2).
 *
 * В праздник не работают — и это уже было. Теперь в праздник есть что делать:
 * идти в шествии, сесть за общий стол, выйти на кулачный бой. Каждое даёт
 * своё, и каждое чем-то рискует.
 */
function joinFeast(state: GameState, doingId: string): CommandResult {
  const doing = FEAST_DOINGS.find((one) => one.id === doingId)
  if (!doing) return fail('unknownAction', 'Такого на празднике не делают.')
  const day = dayOf(state.time)
  const name = feastHere(state.world, state.locationId, day)
  if (!name) return fail('unavailableHere', 'Нынче не праздник.')
  const doings = feastDoingsAt(state.world, state.locationId, day)
  if (!doings.some((one) => one.id === doingId)) {
    return fail('unavailableHere', `На этом празднике такого нет: ${name}.`)
  }
  if (state.character.money < doing.cost) {
    return fail('noMoney', `Нужно ${doing.cost}.`)
  }

  const draft = open(state)
  addMoney(draft, -doing.cost)
  advance(draft, doing.minutes)
  if (doing.id === 'procession') {
    draft.piety = Math.max(-100, Math.min(100, draft.piety + 6))
    draft.reputation = withPlaceRep(draft.reputation, state.locationId, 5)
    notice(draft, `${name}: ты шёл в шествии, и тебя видели рядом со святыней.`)
    return close(draft)
  }
  if (doing.id === 'feastTable') {
    draft.reputation = withPlaceRep(draft.reputation, state.locationId, 8)
    draft.party = { ...draft.party, morale: Math.min(100, draft.party.morale + 6) }
    addFatigue(draft, 10)
    notice(draft, `${name}: за общим столом тебя запомнили — и твоих людей тоже.`)
    return close(draft)
  }
  // Кулачный бой: слава и синяки. Побеждает сила и ловкость, а не железо.
  const [roll, next] = nextFloat(draft.rng)
  draft.rng = next
  const strength = state.character.attributes.strength + state.character.attributes.agility
  const won = roll < Math.min(0.85, 0.25 + strength * 0.04)
  addFatigue(draft, 25)
  practice(draft, 'athletics', 25)
  if (won) {
    draft.renown += 1
    draft.reputation = withPlaceRep(draft.reputation, state.locationId, 10)
    addMoney(draft, 20)
    notice(draft, `${name}: стенка на стенку — и ты устоял. Посад это запомнит.`)
  } else {
    draft.reputation = withPlaceRep(draft.reputation, state.locationId, 2)
    notice(draft, `${name}: тебя уронили на глазах у всего посада. Бывает.`)
  }
  return close(draft)
}

/**
 * Паломничество (этап 51, Х5).
 *
 * Святое место в глуши — цель пути. Даёт много благочестия, но раз в
 * несколько месяцев: ходить к одному роднику каждую неделю — не паломничество,
 * а прогулка.
 */
function pilgrimage(state: GameState): CommandResult {
  if (!isHolySite(state.world, state.locationId)) {
    return fail('unavailableHere', 'Это место не свято: тут не молятся, тут ходят.')
  }
  const day = dayOf(state.time)
  if (!canPilgrimage(state, day)) {
    const left = PILGRIM_DAYS - (day - (state.pilgrimDay ?? 0))
    return fail('closed', `Ты был у святого места недавно. Придёшь через ${left} суток.`)
  }
  const draft = open(state)
  advance(draft, hours(3))
  draft.piety = Math.max(-100, Math.min(100, draft.piety + PILGRIM_PIETY))
  draft.pilgrimDay = day
  practice(draft, 'concentration', 30)
  const here = state.world.locations[state.locationId]?.name ?? 'святое место'
  notice(draft, `Ты дошёл до ${here} и стоял, пока не стемнело. Это помнят на небе и в людях.`)
  return close(draft)
}

function haggleWith(state: GameState, merchantId: string, push: HagglePush): CommandResult {
  const settlement = state.settlements[state.locationId]
  const merchant = settlement
    ? merchantById(state.world, state.settlements, state.locationId, merchantId)
    : null
  if (!merchant || !settlement) return fail('unavailableHere', 'Здесь такого купца нет.')
  const day = dayOf(state.time)
  const dealing = dealingWith(state, merchantId)
  if (dealing.haggledDay === day) {
    return fail('closed', `${merchant.name} уже наторговался с тобой на сегодня.`)
  }
  const draft = open(state)
  const [roll, next] = nextFloat(draft.rng)
  draft.rng = next
  const result = haggle(merchant, tradeSkillAt(state), dealing.standing, push, roll)
  advance(draft, HAGGLE_MINUTES)
  practice(draft, 'trade', result.outcome === 'cut' ? 12 : 5)
  rememberDeal(draft, merchantId, {
    standing: result.standing,
    haggledDay: day,
    cut: result.cut,
  })
  notice(draft, `${merchant.name}: «${result.says}»`)
  return close(draft)
}

/** С какой милости лорда зовут на турнир. */
const TOURNEY_FAVOUR = 10

/** Сколько времени уходит на торг. */
const HAGGLE_MINUTES = 20

/** Купить у человека, а не у места (этап 49). */
function buyFrom(
  state: GameState,
  merchantId: string,
  good: GoodId,
  amount: number,
): CommandResult {
  const problem = checkTradeRequest(good, amount)
  if (problem) return problem
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')
  const merchant = merchantById(state.world, state.settlements, state.locationId, merchantId)
  if (!merchant) return fail('unavailableHere', 'Здесь такого купца нет.')
  if (!merchant.goods.includes(good)) {
    return fail('noGoods', `${merchant.name} этим не торгует: он в ${rowWhere(merchant.rowId)}.`)
  }
  const dealing = dealingWith(state, merchantId)
  if (dealing.standing <= REFUSED) {
    return fail('shunned', `${merchant.name} с тобой больше не торгует.`)
  }
  const cut = dealing.haggledDay === dayOf(state.time) ? (dealing.cut ?? 0) : 0
  const tradeSkill = tradeSkillAt(state)
  const welcome = priceFactor(placeRep(state.reputation, state.locationId))

  let market = settlement
  let total = 0
  for (let i = 0; i < amount; i += 1) {
    if (market.stock[good] <= 1) {
      return fail('noGoods', `Столько у него нет: ${GOODS[good].label.toLowerCase()} в обрез.`)
    }
    total += merchantBuyPrice(
      state.world,
      market,
      merchant,
      good,
      tradeSkill,
      dealing.standing,
      cut,
    )
    market = withStock(market, good, -1)
  }
  total = Math.round(total * welcome)
  if (state.character.money < total) {
    return fail('noMoney', `Не хватает денег: нужно ${total}, есть ${state.character.money}.`)
  }
  const weight = GOODS[good].weight * amount
  const capacity = partyCapacity(state.character, state.party) + horseCarry(state.character)
  if (carriedWeight(state.character) + weight > capacity) {
    return fail('overloaded', 'Столько не унести — ни на себе, ни на людях.')
  }

  const draft = open(state)
  notice(draft, `У ${merchant.name}: ${GOODS[good].label.toLowerCase()}, ${amount} — за ${total}.`)
  advance(draft, TRADE_MINUTES)
  addMoney(draft, -total)
  addGoods(draft, good, amount)
  draft.settlements = { ...draft.settlements, [state.locationId]: market }
  practice(draft, 'trade', Math.min(30, total * 0.12))
  rememberDeal(draft, merchantId, { standing: dealStanding(total), deals: 1 })
  return close(draft)
}

/** И продать ему же. */
function sellTo(state: GameState, merchantId: string, good: GoodId, amount: number): CommandResult {
  const problem = checkTradeRequest(good, amount)
  if (problem) return problem
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')
  const merchant = merchantById(state.world, state.settlements, state.locationId, merchantId)
  if (!merchant) return fail('unavailableHere', 'Здесь такого купца нет.')
  if (!merchant.goods.includes(good)) {
    return fail('noGoods', `${merchant.name} этим не торгует: он в ${rowWhere(merchant.rowId)}.`)
  }
  if (carried(state.character, good) < amount) {
    return fail('noGoods', `У тебя нет столько: ${GOODS[good].label.toLowerCase()}.`)
  }
  const dealing = dealingWith(state, merchantId)
  if (dealing.standing <= REFUSED) {
    return fail('shunned', `${merchant.name} с тобой больше не торгует.`)
  }
  const cut = dealing.haggledDay === dayOf(state.time) ? (dealing.cut ?? 0) : 0
  const tradeSkill = tradeSkillAt(state)

  let market = settlement
  let total = 0
  for (let i = 0; i < amount; i += 1) {
    total += merchantSellPrice(
      state.world,
      market,
      merchant,
      good,
      tradeSkill,
      dealing.standing,
      cut,
    )
    market = withStock(market, good, 1)
  }

  const draft = open(state)
  notice(draft, `${merchant.name} берёт: ${GOODS[good].label.toLowerCase()}, ${amount} — ${total}.`)
  advance(draft, TRADE_MINUTES)
  addMoney(draft, total)
  addGoods(draft, good, -amount)
  draft.settlements = { ...draft.settlements, [state.locationId]: market }
  practice(draft, 'trade', Math.min(30, total * 0.12))
  rememberDeal(draft, merchantId, { standing: dealStanding(total), deals: 1 })
  return close(draft)
}

/**
 * Сколько торговля прибавляет к расположению: крупная сделка помнится, мелкая
 * — нет. Потолок нарочно низкий: своим становятся за годы, а не за один обоз.
 */
function dealStanding(total: number): number {
  return Math.min(3, Math.max(1, Math.round(total / 400)))
}

/**
 * Чем церковь считает поступки (этап 51, Х4).
 *
 * Разорение города — тяжкий грех, набег — грех, брошенное слово — тоже.
 * Накормить голодного и пощадить пленных — то, за что и прощают.
 */
const PIETY_DEEDS: Readonly<Partial<Record<DeedId, number>>> = {
  sack: -18,
  raid: -8,
  abandonQuest: -5,
  starve: -6,
  feedHungry: 7,
  sparePrisoners: 6,
}

/** Ниже этого купец не подаёт руки. */
const REFUSED = -60

function rowWhere(rowId: string): string {
  const row = ROWS_BY_ID[rowId]
  return row ? row.label.toLowerCase() : 'своём ряду'
}

/** Запомнить встречу: память купца — единственное, что уходит от рынка в сейв. */
function rememberDeal(
  draft: Draft,
  merchantId: string,
  change: {
    standing?: number
    deals?: number
    haggledDay?: number
    cut?: number
  },
): void {
  const before = draft.dealings[merchantId] ?? NO_DEALING
  const next: Dealing = {
    standing: Math.max(-100, Math.min(100, before.standing + (change.standing ?? 0))),
    deals: before.deals + (change.deals ?? 0),
    ...(change.haggledDay !== undefined
      ? { haggledDay: change.haggledDay }
      : before.haggledDay !== undefined
        ? { haggledDay: before.haggledDay }
        : {}),
    ...(change.cut !== undefined
      ? { cut: change.cut }
      : before.cut !== undefined
        ? { cut: before.cut }
        : {}),
  }
  draft.dealings = { ...draft.dealings, [merchantId]: next }
}

/**
 * Взял задаток и не привёз.
 *
 * Обманутый купец помнит крепче, чем облагодетельствованный, — и не он один:
 * весь ряд стоит рядом и слышит. Поэтому память портится не у него одного, а у
 * всех купцов этого места, хоть и слабее (этап 49, Р4).
 */
function failedOrder(draft: Draft, merchantId: string): void {
  rememberDeal(draft, merchantId, { standing: -35 })
  const locationId = merchantId.split(':')[1] ?? ''
  for (const other of merchantsAt(draft.world, draft.settlements, locationId)) {
    if (other.id === merchantId) continue
    rememberDeal(draft, other.id, { standing: -12 })
  }
  notice(draft, 'Задаток взят, товар не привезён. Весь ряд это запомнил.')
}

/**
 * Взять заказ купца (этап 49, Р3).
 *
 * Задаток вперёд — и потому подвести его дороже, чем не взяться: он помнит и
 * говорит другим.
 */
function takeOrder(state: GameState, merchantId: string): CommandResult {
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')
  const merchant = merchantById(state.world, state.settlements, state.locationId, merchantId)
  if (!merchant) return fail('unavailableHere', 'Здесь такого купца нет.')
  const day = dayOf(state.time)
  const order = orderFrom(state.world, settlement, merchant, day)
  if (!order) return fail('unavailableHere', `${merchant.name} нынче ни в чём не нуждается.`)
  const questId = `order:${merchant.id}`
  if (state.quests.some((quest) => quest.id === questId)) {
    return fail('invalid', 'Этот заказ у тебя уже есть.')
  }
  const dealing = dealingWith(state, merchantId)
  if (dealing.standing <= REFUSED) {
    return fail('shunned', `${merchant.name} тебе ничего не доверит.`)
  }

  const draft = open(state)
  advance(draft, 20)
  addMoney(draft, order.advance)
  draft.quests = [
    ...draft.quests,
    {
      id: questId,
      type: 'merchantOrder',
      issuerLocationId: state.locationId,
      targetLocationId: state.locationId,
      amount: order.amount,
      reward: order.reward,
      deadlineDay: day + order.days,
      progress: 0,
      good: order.good,
      merchantId: merchant.id,
    },
  ]
  notice(
    draft,
    `${merchant.name}: «${order.says}» — ${GOODS[order.good].label.toLowerCase()}, ${order.amount} мер, задаток ${order.advance}.`,
  )
  return close(draft)
}

/**
 * Расспросить о ценах (этап 49, Р6).
 *
 * Купец знает, почём его товар там, куда он его возит. Рассказывает не всякому:
 * чужому — общими словами, своему — с числами. Это та же записная книжка цен,
 * только заполненная устами, а не ногами.
 */
function askPrices(state: GameState, merchantId: string): CommandResult {
  const merchant = merchantById(state.world, state.settlements, state.locationId, merchantId)
  if (!merchant) return fail('unavailableHere', 'Здесь такого купца нет.')
  const dealing = dealingWith(state, merchantId)
  if (dealing.standing < 0) {
    return fail('shunned', `${merchant.name} о делах с тобой не говорит.`)
  }
  const tales = talesOf(state.world, state.settlements, merchant)
  if (tales.length === 0) return fail('unavailableHere', 'Ему и рассказать-то не о чем.')

  const draft = open(state)
  advance(draft, hours(1))
  const day = dayOf(draft.time)
  let log = draft.priceLog
  for (const tale of tales) {
    const known = log[tale.locationId] ?? {}
    const samples = [...(known[tale.good] ?? []), { day, price: tale.price }]
    log = { ...log, [tale.locationId]: { ...known, [tale.good]: samples } }
  }
  draft.priceLog = log
  const places = new Set(tales.map((tale) => tale.locationId))
  const names = [...places]
    .map((id) => state.world.locations[id]?.name ?? '')
    .filter(Boolean)
    .join(', ')
  rememberDeal(draft, merchantId, { standing: 1 })
  notice(draft, `${merchant.name} рассказал, почём нынче в: ${names}.`)
  return close(draft)
}

function buy(state: GameState, good: GoodId, amount: number): CommandResult {
  const problem = checkTradeRequest(good, amount)
  if (problem) return problem
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')

  const tradeSkill = tradeSkillAt(state)
  // Своим уступают, чужих обдирают.
  const welcome = priceFactor(placeRep(state.reputation, state.locationId))
  const quote = quoteBuy(state.world, settlement, good, amount, tradeSkill)
  if (quote.amount < amount) {
    return fail('noGoods', `Столько тут не купить: ${GOODS[good].label.toLowerCase()} в обрез.`)
  }
  const total = Math.round(quote.total * welcome)
  if (state.character.money < total) {
    return fail('noMoney', `Не хватает денег: нужно ${total}, есть ${state.character.money}.`)
  }
  const weight = GOODS[good].weight * amount
  // Поклажу несут все: отряд, конь и своя спина.
  const capacity = partyCapacity(state.character, state.party) + horseCarry(state.character)
  if (carriedWeight(state.character) + weight > capacity) {
    return fail('overloaded', 'Столько не унести — ни на себе, ни на людях.')
  }

  const draft = open(state)
  notice(draft, `Куплено: ${GOODS[good].label.toLowerCase()}, ${amount} — за ${total}.`)
  advance(draft, TRADE_MINUTES)
  addMoney(draft, -total)
  addGoods(draft, good, amount)
  draft.settlements = { ...draft.settlements, [state.locationId]: quote.settlement }
  practice(draft, 'trade', Math.min(30, quote.total * 0.12))
  return close(draft)
}

function sell(state: GameState, good: GoodId, amount: number): CommandResult {
  const problem = checkTradeRequest(good, amount)
  if (problem) return problem
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')
  if (carried(state.character, good) < amount) {
    return fail('noGoods', `У тебя нет столько: ${GOODS[good].label.toLowerCase()}.`)
  }

  const tradeSkill = tradeSkillAt(state)
  const quote = quoteSell(state.world, settlement, good, amount, tradeSkill)

  const draft = open(state)
  notice(draft, `Продано: ${GOODS[good].label.toLowerCase()}, ${amount} — за ${quote.total}.`)
  advance(draft, TRADE_MINUTES)
  addMoney(draft, quote.total)
  addGoods(draft, good, -amount)
  draft.settlements = { ...draft.settlements, [state.locationId]: quote.settlement }
  practice(draft, 'trade', Math.min(30, quote.total * 0.12))
  return close(draft)
}

function checkTradeRequest(good: GoodId, amount: number): CommandResult | null {
  if (!GOODS[good]) return fail('unknownAction', 'Такого товара нет.')
  if (!Number.isInteger(amount) || amount <= 0) return fail('invalid', 'Сколько именно?')
  return null
}

function work(state: GameState, jobId: string, content: Content): CommandResult {
  const job = content.jobs[jobId]
  if (!job) return fail('unknownAction', 'Такой работы здесь нет.')
  const blocked =
    checkWelcome(state) ??
    checkFeast(state, 'не работают') ??
    checkPlace(state, job.where, 'Здесь такой работы нет.') ??
    checkWindow(state.time, job.window, 'На эту работу нанимают') ??
    checkRequirements(state.character, job.requires) ??
    checkFatigue(state.character, job.fatigue)
  if (blocked) return blocked

  // У работы есть хозяин (этап 50): он берёт или гонит, платит по-своему и
  // по-своему учит. Но только там, где есть кому нанимать: в глуши работают
  // сами на себя, и каменоломне всё равно, кто ты.
  const shifts = shiftsOf(state, jobId)
  const rank = rankOfShifts(shifts)
  const hired = state.settlements[state.locationId] !== undefined
  const master = hired ? masterOf(state.locationId, job) : null
  if (master) {
    const welcome = placeRep(state.reputation, state.locationId)
    const hiring = masterHires(master, experienceOf(state), welcome)
    if (!hiring.hires) {
      return fail('requirements', `${master.name} (${craftMasterLabel(master)}): «${hiring.says}»`)
    }
  }
  // И цех: выше подмастерья чужого к делу не поставят (этап 50, М6).
  const cech = cechAt(state.world, state.settlements, state.locationId)
  if (!cechLets(cech, state.cech ?? null, job, rank, state.locationId)) {
    return fail(
      'requirements',
      `${cech?.label ?? 'Цех'} не пускает нецеховых к работе мастера. Вступай или иди подмастерьем.`,
    )
  }

  const draft = open(state)
  const efficiency = fatigueFactor(state.character.fatigue)
  const pay = Math.max(
    1,
    Math.round(
      job.pay *
        rank.pay *
        (master ? masterPay(master) : 1) *
        cechPay(cech, state.cech ?? null, job, state.locationId),
    ),
  )
  notice(draft, `Смена окончена: ${job.label.toLowerCase()} — ${rank.label}, ${pay}.`)
  advance(draft, job.durationMinutes)
  addMoney(draft, pay)
  addFatigue(draft, job.fatigue)
  const teaching = rank.practice * (master ? masterTeaches(master) : 1)
  for (const [skill, rawXp] of Object.entries(job.practice)) {
    practice(draft, skill as SkillId, (rawXp ?? 0) * efficiency * teaching)
  }
  // Смена зачтена: из числа смен и растёт ступень.
  draft.craft = { ...draft.craft, [jobId]: shifts + 1 }
  const grown = rankOfShifts(shifts + 1)
  if (grown.id !== rank.id) {
    notice(
      draft,
      master
        ? `${master.name}: «${masterPraises(master)}» Теперь ты ${grown.label}.`
        : `Руки помнят: теперь ты ${grown.label}.`,
    )
  }
  return close(draft)
}

function craftMasterLabel(master: ReturnType<typeof masterOf>): string {
  return CRAFT_MASTERS[master.temper].label
}

/**
 * Вступить в цех (этап 50, М6).
 *
 * Цех местный: он есть в ремесленном городе и кончается на его околице. Быть
 * можно в одном — как и в ордене.
 */
function joinCech(state: GameState): CommandResult {
  const cech = cechAt(state.world, state.settlements, state.locationId)
  if (!cech) return fail('unavailableHere', 'Цеха здесь нет: ремесло тут домашнее.')
  if (state.cech) {
    return state.cech.locationId === state.locationId
      ? fail('invalid', 'Ты уже в этом цехе.')
      : fail('invalid', 'Ты состоишь в цехе другого города. В двух не бывают.')
  }
  if (state.character.money < CECH_DUES) {
    return fail('noMoney', `Вступный взнос — ${CECH_DUES}.`)
  }
  const day = dayOf(state.time)
  const draft = open(state)
  addMoney(draft, -CECH_DUES)
  advance(draft, hours(2))
  draft.cech = {
    locationId: state.locationId,
    cechId: cech.id,
    since: day,
    paidUntil: day + CECH_DUES_DAYS,
  }
  notice(draft, `${cech.label} принял тебя. Взнос — ${CECH_DUES} раз в месяц.`)
  return close(draft)
}

function leaveCech(state: GameState): CommandResult {
  if (!state.cech) return fail('invalid', 'Ты ни в каком цехе не состоишь.')
  const draft = open(state)
  notice(draft, 'Ты вышел из цеха. Книгу закрыли без слов.')
  draft.cech = null
  return close(draft)
}

/**
 * Взять ученика (этап 50, М3).
 *
 * Мастерская без людей — это вложенные деньги; с учениками это дело. Каждый
 * прибавляет к обороту треть и портит работу примерно раз в месяц. Брать
 * может тот, кто сам мастер: подёнщику учить нечему.
 */
const APPRENTICE_FEE = 120
const APPRENTICE_LIMIT = 3

function takeApprentice(state: GameState): CommandResult {
  const workshop = state.enterprises.find(
    (one) => one.kind === 'workshop' && one.locationId === state.locationId,
  )
  if (!workshop) return fail('unavailableHere', 'Здесь у тебя нет мастерской.')
  const experience = experienceOf(state)
  const rank = rankOfShifts(experience)
  if (rank.id !== 'master') {
    return fail('requirements', `Учить может мастер, а ты ${rank.label}. Смен всего ${experience}.`)
  }
  const apprentices = workshop.apprentices ?? 0
  if (apprentices >= APPRENTICE_LIMIT) {
    return fail('noRoom', 'Больше трёх учеников у верстака не поставишь.')
  }
  if (state.character.money < APPRENTICE_FEE) {
    return fail('noMoney', `Ученика надо одеть и кормить: ${APPRENTICE_FEE}.`)
  }
  const draft = open(state)
  addMoney(draft, -APPRENTICE_FEE)
  advance(draft, hours(3))
  draft.enterprises = draft.enterprises.map((one) =>
    one.id === workshop.id ? { ...one, apprentices: apprentices + 1 } : one,
  )
  notice(draft, `Взят ученик: теперь их ${apprentices + 1}. Оборот прибавится, брака тоже.`)
  return close(draft)
}

/** Взносы цеха: не платишь — вычёркивают. Считается сутками, как и в ордене. */
function payCech(draft: Draft): void {
  const member = draft.cech
  if (!member) return
  const today = dayOf(draft.time)
  if (today < member.paidUntil) return
  if (draft.character.money >= CECH_DUES) {
    addMoney(draft, -CECH_DUES)
    draft.cech = { ...member, paidUntil: today + CECH_DUES_DAYS }
    return
  }
  notice(draft, 'Взнос в цех не уплачен: тебя вычеркнули из книги.')
  draft.cech = null
}

function study(state: GameState, courseId: string, content: Content): CommandResult {
  const course = content.courses[courseId]
  if (!course) return fail('unknownAction', 'Такого наставника здесь нет.')
  const blocked =
    checkWelcome(state) ??
    checkFeast(state, 'не учат') ??
    checkPlace(state, course.where, 'Такому здесь учить некому.') ??
    checkWindow(state.time, course.window, 'Занятия идут') ??
    checkRequirements(state.character, course.requires) ??
    checkMoney(state.character, course.cost) ??
    checkFatigue(state.character, course.fatigue)
  if (blocked) return blocked
  if (skillLevel(state.character, course.skill) >= course.teacherCap) {
    return fail(
      'maxed',
      `Этот наставник больше ничему не научит: его предел — ${SKILLS[course.skill].label} ${course.teacherCap}.`,
    )
  }

  const draft = open(state)
  const efficiency = fatigueFactor(state.character.fatigue)
  notice(draft, `Занятие: ${course.label.toLowerCase()}.`)
  advance(draft, course.durationMinutes)
  addMoney(draft, -course.cost)
  addFatigue(draft, course.fatigue)
  practice(draft, course.skill, course.xp * efficiency)
  return close(draft)
}

function takeExam(state: GameState, examId: string, content: Content): CommandResult {
  const exam = content.exams[examId]
  if (!exam) return fail('unknownAction', 'Такого испытания здесь не проводят.')
  const rank = MAGIC_RANKS[exam.rank]
  const character = state.character

  if (rankTier(character.magicRank) >= rank.tier) {
    return fail('rankNotEligible', `Ранг «${rank.label}» уже получен.`)
  }
  if (nextRank(character.magicRank) !== exam.rank) {
    return fail('rankNotEligible', 'Ступени лестницы не перепрыгивают — сначала предыдущий ранг.')
  }
  const magic = skillLevel(character, 'magic')
  if (magic < rank.requiredSkill) {
    return fail(
      'rankNotEligible',
      `Для испытания нужен навык «Магия» не ниже ${rank.requiredSkill} (сейчас ${magic}).`,
    )
  }
  // Испытание принимает школа, а не «столица» (этап 40): нужна та, чей глава
  // сам не ниже, и чтобы он был дома. И принимает его человек — со своей
  // памятью о тебе и своим нравом.
  const school = schoolAt(state.world, state.locationId)
  if (!school) return fail('unavailableHere', 'Здесь нет школы: некому принимать испытание.')
  if (rankTier(exam.rank) > rankTier(school.topRank)) {
    return fail(
      'unavailableHere',
      `Здесь выше «${MAGIC_RANKS[school.topRank].label}» не присваивают: некому.`,
    )
  }
  if (!canGrantHere(state, school, exam.rank)) {
    return fail('unavailableHere', `${school.master.name} в отъезде: старшие испытания ждут.`)
  }
  const stance = masterStance(state, school)
  if (stance === 'refuses') {
    return fail('shunned', `${school.master.name} тебя не примет: слишком много провалов.`)
  }
  // Самоучка платит вдвое: тот, кто учился сам, для школы чужак (DESIGN.md, п.4).
  const selfTaught = isSelfTaught(state)
  const fee = exam.cost * (selfTaught ? SELF_TAUGHT_FEE : 1)
  const blocked =
    checkPlace(state, exam.where, 'Здесь некому принимать испытание.') ??
    checkWindow(state.time, exam.window, 'Испытания проводят') ??
    checkRequirements(character, exam.requires) ??
    checkMoney(character, fee) ??
    checkFatigue(character, exam.fatigue)
  if (blocked) return blocked

  const draft = open(state)
  notice(draft, `${exam.label}: принимает ${school.master.name}, ${school.name}.`)
  advance(draft, exam.durationMinutes)
  addMoney(draft, -fee)
  addFatigue(draft, exam.fatigue)

  // Расположение главы двигает шанс: тёплому прощают, холодный спрашивает
  // строже. Самоучку спрашивают строже всегда.
  const attitude = masterAttitude(state, school.master)
  const bias = attitude / 400 - (selfTaught ? 0.1 : 0)
  const [passed, rng] = rollChance(
    draft.rng,
    Math.max(
      0.05,
      Math.min(0.98, examChance(magic, rank.requiredSkill, exam.comfortableMargin) + bias),
    ),
  )
  draft.rng = rng
  if (passed) {
    patch(draft, { magicRank: exam.rank })
    draft.events.push({ type: 'rankGranted', rank: exam.rank })
    // Школа помнит своих: с этого дня ты для неё не чужак.
    draft.reputation = withLordRep(draft.reputation, school.master.id, 10)
    draft.reputation = withPlaceRep(draft.reputation, state.locationId, 3)
  } else {
    draft.events.push({ type: 'examFailed', rank: exam.rank })
    // Провал тоже чему-то учит — но дешевле было бы прийти подготовленным. И
    // его помнят: строгий — дольше всех.
    practice(draft, 'magic', 20)
    const grudge =
      school.master.temper === 'strict' ? -12 : school.master.temper === 'kind' ? -4 : -8
    draft.reputation = withLordRep(draft.reputation, school.master.id, grudge)
  }
  return close(draft)
}

/**
 * Шанс сдать: впритык к порогу — чуть лучше монетки, с запасом — почти наверняка.
 * Полной гарантии нет никогда: ранг дают люди.
 */
export function examChance(
  magicSkill: number,
  required: number,
  comfortableMargin: number,
): number {
  const ratio = Math.min(1, Math.max(0, (magicSkill - required) / comfortableMargin))
  return 0.4 + 0.55 * ratio
}

function rest(state: GameState, restHours: number): CommandResult {
  if (!Number.isFinite(restHours) || restHours <= 0 || restHours > MAX_REST_HOURS) {
    return fail('invalid', `Ждать можно от одного до ${MAX_REST_HOURS} часов.`)
  }
  const draft = open(state)
  notice(draft, `Ожидание: ${restHours} ч.`)
  advance(draft, hours(restHours))
  addFatigue(draft, -REST_RECOVERY_PER_HOUR * restHours)
  // Сюда же позже подключится прерывание на событие: пришёл наниматель,
  // начался экзамен, что-то случилось в городе (п.11.1).
  return close(draft)
}

function sleep(state: GameState): CommandResult {
  const wakeUp = nextTimeOfDay(state.time, 6)
  const slept = wakeUp - state.time
  const draft = open(state)
  notice(draft, 'Сон до утра.')
  advance(draft, slept)
  addFatigue(draft, (-SLEEP_RECOVERY_PER_HOUR * slept) / MINUTES_PER_HOUR)
  return close(draft)
}

function spendSkillPoint(state: GameState, skillId: SkillId): CommandResult {
  if (!SKILLS[skillId]) return fail('unknownAction', 'Нет такого навыка.')
  if (state.character.unspentSkillPoints <= 0)
    return fail('noPoints', 'Нет свободных очков навыков.')
  const current = state.character.skills[skillId]
  if (current.level >= PROGRESSION.skillMax) return fail('maxed', 'Навык уже на пределе шкалы.')

  const draft = open(state)
  patch(draft, {
    unspentSkillPoints: state.character.unspentSkillPoints - 1,
    skills: { ...state.character.skills, [skillId]: { level: current.level + 1, xp: 0 } },
  })
  draft.events.push({ type: 'skillUp', skill: skillId, level: current.level + 1 })
  return close(draft)
}

function spendAttributePoint(state: GameState, attributeId: AttributeId): CommandResult {
  if (!ATTRIBUTE_LABELS[attributeId]) return fail('unknownAction', 'Нет такого атрибута.')
  if (state.character.unspentAttributePoints <= 0) {
    return fail('noPoints', 'Нет свободных очков атрибутов.')
  }
  const current = state.character.attributes[attributeId]
  if (current >= ATTRIBUTE_MAX) return fail('maxed', 'Атрибут уже на пределе.')

  const draft = open(state)
  patch(draft, {
    unspentAttributePoints: state.character.unspentAttributePoints - 1,
    attributes: { ...state.character.attributes, [attributeId]: current + 1 },
  })
  notice(draft, `${ATTRIBUTE_LABELS[attributeId]}: ${current + 1}.`)
  return close(draft)
}

// --- проверки --------------------------------------------------------------

/**
 * Дело можно начать только в своё окно. У большинства оно дневное, но есть
 * ночная работа — поэтому проверка не «сейчас ночь», а «сейчас не их часы».
 */
/**
 * Дело должно водиться в этом месте. Это и есть смысл дороги: за наставником,
 * за испытанием и за хорошей платой приходится идти туда, где они есть.
 */
function checkPlace(
  state: GameState,
  where: Availability | undefined,
  message: string,
): CommandResult | null {
  const here = state.world.locations[state.locationId]
  if (!here) return fail('invalid', 'Непонятно, где находится герой.')
  return isAvailableAt(where, here) ? null : fail('unavailableHere', message)
}

function checkWindow(
  time: GameTime,
  window: TimeWindow | undefined,
  what: string,
): CommandResult | null {
  const actual = window ?? DAY_WINDOW
  return isWithinWindow(time, actual) ? null : fail('closed', `${what} ${formatWindow(actual)}.`)
}

function checkMoney(character: Character, cost: number): CommandResult | null {
  return character.money < cost
    ? fail('noMoney', `Не хватает денег: нужно ${cost}, есть ${character.money}.`)
    : null
}

function checkFatigue(character: Character, cost: number): CommandResult | null {
  return character.fatigue + cost > FATIGUE_MAX
    ? fail('exhausted', 'Сил больше нет — сначала отдохнуть или выспаться.')
    : null
}

function checkRequirements(character: Character, requires?: Requirements): CommandResult | null {
  if (!requires) return null
  for (const [skill, needed] of Object.entries(requires.skills ?? {})) {
    const have = skillLevel(character, skill as SkillId)
    if (have < (needed ?? 0)) {
      return fail(
        'requirements',
        `Нужен навык «${SKILLS[skill as SkillId].label}» не ниже ${needed} (сейчас ${have}).`,
      )
    }
  }
  for (const tag of requires.tags ?? []) {
    if (!character.tags.includes(tag)) {
      return fail('requirements', 'Тебя сюда не возьмут: не та биография.')
    }
  }
  return null
}

function fail(code: FailureCode, message: string): CommandResult {
  return { ok: false, code, message }
}

// --- черновик изменений ----------------------------------------------------

/**
 * Изменения копятся в изменяемом черновике и один раз превращаются в новое
 * состояние. Снаружи движок остаётся чистой функцией: вход — состояние и
 * команда, выход — новое состояние и события.
 */
interface Draft {
  time: GameTime
  rng: Rng
  character: Character
  locationId: string
  journey: Journey | null
  settlements: Readonly<Record<string, Settlement>>
  party: Party
  ship: Ship | null
  cleansed: { readonly locationId: string; readonly untilDay: number } | null
  guild: Membership | null
  courtDay: number
  quarter: QuarterId | null
  knowledge: Knowledge | undefined
  dealings: Readonly<Record<string, Dealing>>
  craft: Readonly<Record<string, number>>
  cech: CechMembership | null
  piety: number
  pilgrimDay: number | undefined
  battle: Battle | null
  politics: Politics
  /** Мир пополняется: места основывают, и скелет перестал быть вечным. */
  world: World
  plagues: readonly Plague[]
  priceLog: PriceLog
  chains: readonly ChainProgress[]
  doneChains: readonly string[]
  battlesWon: number
  searchedSites: readonly string[]
  bands: readonly Band[]
  companions: readonly Companion[]
  enterprises: readonly Enterprise[]
  service: string | null
  siege: { locationId: string; days: number } | null
  renown: number
  reputation: Reputation
  realm: { name: string } | null
  quests: readonly Quest[]
  over: boolean
  readonly base: GameState
  readonly events: GameEvent[]
}

function open(state: GameState): Draft {
  return {
    time: state.time,
    rng: state.rng,
    character: state.character,
    locationId: state.locationId,
    journey: state.journey,
    settlements: state.settlements,
    party: state.party,
    ship: state.ship,
    cleansed: state.cleansed ?? null,
    guild: state.guild,
    courtDay: state.courtDay ?? 0,
    quarter: state.quarter ?? null,
    knowledge: state.knowledge,
    dealings: state.dealings ?? {},
    craft: state.craft ?? {},
    cech: state.cech ?? null,
    piety: state.piety ?? 0,
    pilgrimDay: state.pilgrimDay,
    battle: state.battle,
    politics: state.politics,
    world: state.world,
    plagues: state.plagues,
    priceLog: state.priceLog,
    chains: state.chains,
    doneChains: state.doneChains,
    battlesWon: state.battlesWon,
    searchedSites: state.searchedSites,
    bands: state.bands,
    companions: state.companions,
    enterprises: state.enterprises,
    service: state.service,
    siege: state.siege,
    renown: state.renown,
    reputation: state.reputation,
    realm: state.realm,
    quests: state.quests,
    over: state.over,
    base: state,
    events: [],
  }
}

function close(draft: Draft): CommandResult {
  // Мир живёт вместе с игровым временем: сколько суток прошло, столько поселения
  // и досчитывают. Никаких фоновых таймеров — только детерминированный догон.
  const daysPassed = dayOf(draft.time) - dayOf(draft.base.time)
  if (daysPassed > 0) {
    // Сутки мира знают, какое нынче время года: зимой земля не родит, осенью
    // жнут (этап 37).
    const life = tickDays(
      draft.base.world,
      draft.settlements,
      daysPassed,
      LIFE,
      dayOf(draft.base.time),
    )
    draft.settlements = life.settlements
    draft.events.push(...worldNews(draft.base, draft.locationId, life.events))

    const politics = tickPolitics(
      draft.base.world,
      draft.politics,
      draft.settlements,
      dayOf(draft.time),
      draft.rng,
      // Своим архимагом игрок бывает только сам (этап 43).
      rankTier(draft.character.magicRank) >= MAGIC_RANKS.archmage.tier ? 'free' : 'busy',
    )
    draft.rng = politics.rng
    draft.politics = politics.politics
    draft.settlements = politics.settlements
    draft.events.push(...warNews(draft.base, draft.locationId, politics.events))

    // Дружины ходят по тем же суткам. Дней может пройти много — считаем каждый:
    // войско, прошедшее полстраны за один такт, — это опять телепорт.
    for (let i = 0; i < daysPassed; i += 1) {
      const march = tickBands(
        draft.base.world,
        draft.politics,
        draft.settlements,
        draft.bands,
        draft.rng,
        dayOf(draft.time),
      )
      draft.bands = march.bands
      draft.settlements = march.settlements
      draft.politics = march.politics
      draft.rng = march.rng
      draft.events.push(...bandNews(draft.base, draft.locationId, march.events))
    }

    // Мор идёт своими сутками: он не ждёт, пока игрок что-то сделает.
    for (let i = 0; i < daysPassed; i += 1) {
      // Лекарь-спутник рядом — мор уносит на треть меньше там, где ты стоишь.
      const healer =
        bestSkill(draft.companions, 'healing').level >= 4 ||
        (draft.cleansed !== null &&
          draft.cleansed.untilDay >= dayOf(draft.time) &&
          draft.cleansed.locationId === draft.locationId)
          ? draft.locationId
          : null
      const sick = tickPlague(draft.base.world, draft.settlements, draft.plagues, draft.rng, healer)
      draft.plagues = sick.plagues
      draft.settlements = sick.settlements
      draft.rng = sick.rng
      draft.events.push(...plagueNews(draft.base, draft.locationId, sick.events))
    }

    // Расселение считается раз в год: основание деревни — не суточное дело.
    const yearBefore = Math.floor(dayOf(draft.base.time) / DAYS_PER_YEAR)
    const yearNow = Math.floor(dayOf(draft.time) / DAYS_PER_YEAR)
    for (let year = yearBefore; year < yearNow; year += 1) {
      const settled = tickSettling(draft.world, draft.settlements, dayOf(draft.time), draft.rng)
      draft.world = settled.world
      draft.settlements = settled.settlements
      draft.rng = settled.rng
      draft.events.push(...settleNews(draft.world, draft.locationId, settled.events))
    }

    // Каким вышел год на земле — решается не на Новый год, а на жатве: в первый
    // день осени всё, что выросло, становится числом (этап 37). Недород —
    // единственное, что доводит до голода мир, в котором еды с запасом.
    if (crossedDayOfYear(dayOf(draft.base.time), dayOf(draft.time), HARVEST_DAY)) {
      const harvest = rollHarvest(draft.world, draft.settlements, draft.rng)
      draft.settlements = harvest.settlements
      draft.rng = harvest.rng
      draft.events.push(...harvestNews(draft.world, draft.locationId, harvest.events))
    }

    // Договоры корон: отношение, союзы, дань — и общий страх перед тем, кто
    // забрал слишком много.
    const talks = tickDiplomacy(
      draft.base.world,
      draft.politics,
      dayOf(draft.time),
      draft.rng,
      draft.settlements,
    )
    draft.politics = talks.politics
    draft.rng = talks.rng

    // Дела кормят каждый день, и каждый день их можно потерять.
    for (let i = 0; i < daysPassed; i += 1) {
      const trade = tickEnterprises(
        draft.base.world,
        draft.settlements,
        draft.enterprises,
        (enterprise) => {
          const manager = draft.companions.find((one) => one.id === enterprise.managerId)
          return manager?.skills.trade ?? 0
        },
        draft.rng,
        dayOf(draft.time),
      )
      draft.enterprises = trade.enterprises
      draft.rng = trade.rng
      if (trade.income !== 0) addMoney(draft, trade.income)
      for (const event of trade.events) {
        if (event.type === 'caravanRobbed') {
          const where = draft.base.world.locations[event.locationId]?.name ?? 'дорогой'
          notice(draft, `Обоз разграблен под ${where}.`, 'trade')
        }
        if (event.type === 'shipRaided') {
          const where = draft.base.world.locations[event.locationId]?.name ?? 'в море'
          notice(draft, `Твоё судно обобрали на подходе к ${where}: убыток ${event.lost}.`, 'trade')
        }
        if (event.type === 'shipSunk') {
          const where = draft.base.world.locations[event.locationId]?.name ?? 'в море'
          notice(draft, `Твоё судно не дошло до ${where}. Ни дела, ни корабля.`, 'trade')
        }
        if (event.type === 'workshopSpoiled') {
          const where = draft.base.world.locations[event.locationId]?.name ?? 'в мастерской'
          notice(draft, `Ученик запорол работу в ${where}: убыток ${event.lost}.`, 'trade')
        }
      }
    }

    payUpkeep(draft, daysPassed)
    expireQuests(draft)
    growOlder(draft, daysPassed)
    healAndFree(draft, daysPassed)
  }

  advanceChains(draft)

  // Записная книжка купца: цены там, где стоишь, и там, где стоит караван.
  const today = dayOf(draft.time)
  draft.priceLog = recordPrices(
    draft.priceLog,
    draft.base.world,
    draft.settlements[draft.locationId],
    today,
  )
  for (const enterprise of draft.enterprises) {
    if (enterprise.kind !== 'caravan' || enterprise.travel) continue
    draft.priceLog = recordPrices(
      draft.priceLog,
      draft.base.world,
      draft.settlements[enterprise.locationId],
      today,
    )
  }

  const state: GameState = {
    ...draft.base,
    world: draft.world,
    plagues: draft.plagues,
    priceLog: draft.priceLog,
    chains: draft.chains,
    doneChains: draft.doneChains,
    battlesWon: draft.battlesWon,
    searchedSites: draft.searchedSites,
    time: draft.time,
    rng: draft.rng,
    character: draft.character,
    locationId: draft.locationId,
    journey: draft.journey,
    settlements: draft.settlements,
    party: draft.party,
    ship: draft.ship,
    cleansed: draft.cleansed,
    guild: draft.guild,
    courtDay: draft.courtDay,
    quarter: draft.quarter,
    ...(draft.knowledge ? { knowledge: draft.knowledge } : {}),
    dealings: draft.dealings,
    craft: draft.craft,
    cech: draft.cech,
    piety: draft.piety,
    ...(draft.pilgrimDay !== undefined ? { pilgrimDay: draft.pilgrimDay } : {}),
    battle: draft.battle,
    politics: draft.politics,
    bands: draft.bands,
    companions: draft.companions,
    enterprises: draft.enterprises,
    service: draft.service,
    siege: draft.siege,
    renown: draft.renown,
    reputation: draft.reputation,
    realm: draft.realm,
    quests: draft.quests,
    over: draft.over,
    log: appendLog(draft.base.log, draft.time, draft.events),
  }
  return { ok: true, state, events: draft.events }
}

/**
 * Новости мира попадают в журнал, только если случились по соседству.
 * Игроку незачем знать о голоде на другом конце света: он бы о нём и не услышал.
 */
function worldNews(
  state: GameState,
  locationId: string,
  events: readonly LifeEvent[],
): readonly GameEvent[] {
  if (events.length === 0) return []
  const here = regionOf(state.world, locationId)
  const news: GameEvent[] = []
  for (const event of events) {
    if (!here || regionOf(state.world, event.locationId)?.id !== here.id) continue
    const name = state.world.locations[event.locationId]?.name ?? 'где-то рядом'
    news.push({
      type: 'notice',
      text:
        event.type === 'famine'
          ? `Голод в ${name}: умерло ${event.deaths}.`
          : `${name} опустел — жители разошлись.`,
    })
  }
  return news
}

/** Война и разорение — новости того же порядка, что голод: слышно по соседству. */
/**
 * Что из походов лордов доходит до игрока.
 *
 * Мир большой, и вываливать в журнал каждый шаг каждой дружины — значит
 * похоронить в нём всё остальное. Слышно то, что случилось в своей области,
 * и то, что меняет карту: взятые места и конец мятежа.
 */
function bandNews(
  state: GameState,
  locationId: string,
  events: readonly BandEvent[],
): readonly GameEvent[] {
  const news: GameEvent[] = []
  const here = regionOf(state.world, locationId)?.id
  const near = (id: string) => regionOf(state.world, id)?.id === here
  const placeName = (id: string) => state.world.locations[id]?.name ?? 'соседнее селение'
  const lordName = (id: string) => {
    const lord = lordById(state.politics, id)
    return lord ? `${lord.title} ${lord.name}` : 'неизвестный владетель'
  }

  for (const event of events) {
    if (event.type === 'bandRaid') {
      if (!near(event.locationId)) continue
      news.push({
        type: 'notice',
        kind: 'war',
        text: `${placeName(event.locationId)} разорено: уведено и убито ${event.lost}.`,
      })
    } else if (event.type === 'bandSiege') {
      if (!near(event.locationId)) continue
      news.push({
        type: 'notice',
        kind: 'war',
        text: `${placeName(event.locationId)} обложено войском.`,
      })
    } else if (event.type === 'bandTook') {
      news.push({
        type: 'notice',
        kind: 'war',
        text: `${placeName(event.locationId)} взято: место перешло к ${lordName(
          state.bands.find((band) => band.id === event.bandId)?.lordId ?? '',
        )}.`,
      })
    } else if (event.type === 'bandClash') {
      if (!near(event.locationId)) continue
      news.push({
        type: 'notice',
        kind: 'war',
        text: `Под ${placeName(event.locationId)} сошлись дружины: ${lordName(
          event.winner,
        )} одолел, полегло ${event.fallen}.`,
      })
    } else if (event.type === 'lordSubmits') {
      news.push({
        type: 'notice',
        kind: 'war',
        text: `${lordName(event.lordId)} разбит и снова присягнул короне.`,
      })
    } else if (event.type === 'lordFell') {
      news.push({
        type: 'notice',
        kind: 'war',
        text: `${lordName(event.lordId)} пал, и род его пресёкся.`,
      })
    }
  }
  return news
}

function warNews(
  state: GameState,
  locationId: string,
  events: readonly WarEvent[],
): readonly GameEvent[] {
  const news: GameEvent[] = []
  const hereKingdom = kingdomOf(state.world, locationId)?.id
  const kingdomName = (id: string) =>
    state.world.kingdoms[id]?.name ?? lordById(state.politics, id)?.name ?? 'неизвестные'

  for (const event of events) {
    if (event.type === 'rebellion') {
      const lord = lordById(state.politics, event.lordId)
      news.push({
        type: 'notice',
        kind: 'war',
        text: lord
          ? `${lord.title} ${lord.name} поднял мятеж против короны.`
          : 'Один из вассалов поднял мятеж.',
      })
      continue
    }

    if (event.type === 'archmage') {
      // О своём архимаге слышно, о чужом — нет.
      if (event.kingdomId !== hereKingdom) continue
      const words = {
        free: 'архимаг короны снова при дворе',
        busy: 'архимаг короны занят своими делами',
        refused: 'архимаг короны отказался служить',
      }
      news.push({ type: 'notice', kind: 'war', text: `Говорят, ${words[event.state]}.` })
      continue
    }

    if (event.type === 'tribute') {
      const { from, to, perDay } = event.tribute
      news.push({
        type: 'notice',
        kind: 'war',
        text: `${kingdomName(from)} платит дань короне ${kingdomName(to)}: ${perDay} в день.`,
      })
      continue
    }

    const involved = event.war.a === hereKingdom || event.war.b === hereKingdom
    const names = `${kingdomName(event.war.a)} и ${kingdomName(event.war.b)}`
    news.push({
      type: 'notice',
      kind: 'war',
      text:
        event.type === 'warDeclared'
          ? involved
            ? `Война: ${names}. Причина — ${event.war.reason}.`
            : `Говорят, ${names} схватились: ${event.war.reason}.`
          : `Мир между ${names}.`,
    })
  }
  return news
}

/**
 * Содержание отряда: жалованье и еда каждые сутки.
 *
 * Это и есть главный ограничитель войска: нанять дешевле, чем водить. Голодный
 * и неоплаченный отряд теряет дух и расходится сам — без всяких запретов.
 */
function payUpkeep(draft: Draft, days: number): void {
  collectHoldings(draft, days)
  paySailors(draft, days)
  payDues(draft)
  payCech(draft)
  if (partySize(draft.party) === 0) return

  let unpaid = 0
  let unfed = 0
  let deserted = 0

  for (let day = 0; day < days; day += 1) {
    if (partySize(draft.party) === 0) break
    const wages = dailyWages(draft.party)
    const paid = draft.character.money >= wages
    if (paid) addMoney(draft, -wages)
    else unpaid += 1

    const needed = dailyFood(draft.party)
    const fed = eatFromStores(draft, needed)
    if (!fed) unfed += 1

    const morale = paid && fed ? draft.party.morale + 2 : draft.party.morale - 12
    draft.party = {
      ...draft.party,
      morale: Math.min(100, Math.max(0, morale)),
      hungryDays: paid && fed ? 0 : draft.party.hungryDays + 1,
    }

    if (draft.party.morale < DESERTION_MORALE) {
      const size = partySize(draft.party)
      const leaving = Math.max(1, Math.round(size * 0.08))
      deserted += desert(draft, leaving)
    }
  }

  if (unpaid > 0) notice(draft, `Жалованье не плачено ${unpaid} сут. — люди ропщут.`)
  if (unfed > 0) notice(draft, `Отряд голодал ${unfed} сут.`)
  // Спутники видят и то, как ты держишь людей: исправная плата за неделю —
  // повод для доброго слова, голод — для худого.
  if (unfed > 0) seeDeed(draft, 'starve')
  else if (unpaid === 0 && days >= 7) seeDeed(draft, 'payWell')
  if (deserted > 0) notice(draft, `Ушло по-тихому: ${deserted}.`)
}

/**
 * Своя земля за сутки: подати приходят, гарнизон ест и получает жалованье.
 *
 * Разорённая и голодная земля приносит меньше, чем стоит её держать, — и это
 * правильно: владение должно быть решением, а не бесплатной прибавкой.
 */
function collectHoldings(draft: Draft, days: number): void {
  const mine = holdingsOf(draft.settlements, PLAYER)
  if (mine.length === 0 && vassalsOf(draft.base).length === 0) return

  let income = 0
  let wages = 0
  const settlements = { ...draft.settlements }

  for (const settlement of mine) {
    income += dailyTax(settlement, foodSecurity(settlement)) * days
    wages += garrisonWages(settlement) * days

    // Гарнизон ест местный хлеб: он же его и защищает.
    const eaten = Math.min(
      settlement.stock.grain,
      garrisonSize(settlement) * TROOP_FOOD_PER_DAY * days,
    )
    if (eaten > 0) {
      settlements[settlement.locationId] = {
        ...settlement,
        stock: { ...settlement.stock, grain: settlement.stock.grain - eaten },
      }
    }
  }

  // Дорога — тоже хозяйство: застава в своей провинции берёт с проезжих.
  const tolls = dailyTolls(draft.base.world, settlements, PLAYER) * days

  // Вассал платит с пожалованной земли долю (этап 43): лен даётся не даром.
  let tribute = 0
  for (const vassal of vassalsOf(draft.base)) {
    for (const held of holdingsOf(draft.settlements, vassal.id)) {
      tribute += dailyTax(held, foodSecurity(held)) * VASSAL_SHARE * days
    }
  }
  income += tribute

  draft.settlements = settlements
  const net = Math.round(income + tolls - wages)
  if (net !== 0) addMoney(draft, net)
  if (net < 0) notice(draft, `Земля не окупает гарнизон: ушло ${Math.abs(net)}.`)
  else if (net > 0) {
    notice(draft, tolls > 0 ? `Подати и пошлины: ${net}.` : `Подати с владений: ${net}.`)
  }
}

/** Просроченное дело не прощают: сгорает само и портит имя. */
function expireQuests(draft: Draft): void {
  const today = dayOf(draft.time)
  const expired = draft.quests.filter((quest) => today > quest.deadlineDay)
  if (expired.length === 0) return
  for (const quest of expired) {
    draft.reputation = withPlaceRep(draft.reputation, quest.issuerLocationId, -10)
    notice(draft, 'Срок вышел: дело не сделано.')
    if (quest.merchantId) failedOrder(draft, quest.merchantId)
  }
  draft.quests = draft.quests.filter((quest) => today <= quest.deadlineDay)
}

/** Железо снашивается в бою: каждая схватка — минус состояние. */
function wearGear(draft: Draft): void {
  const equipment = { ...draft.character.equipment }
  let changed = false
  for (const slot of SLOT_IDS) {
    const worn = equipment[slot]
    if (!worn) continue
    equipment[slot] = { ...worn, condition: Math.max(0, worn.condition - 2) }
    changed = true
  }
  if (changed) patch(draft, { equipment })
}

/** Накормить отряд из поклажи. Возвращает false, если еды не хватило. */
function eatFromStores(draft: Draft, needed: number): boolean {
  let left = needed
  for (const good of EDIBLE) {
    if (left <= 0) break
    const have = draft.character.inventory[good] ?? 0
    const taken = Math.min(have, left)
    if (taken > 0) {
      addGoods(draft, good, -taken)
      left -= taken
    }
  }
  return left <= 0
}

/** Уходят первыми те, кому меньше платят: терять им нечего. */
function desert(draft: Draft, count: number): number {
  let left = count
  let gone = 0
  const order = Object.keys(draft.party.units).sort(
    (a, b) => TROOPS[a as TroopId].wage - TROOPS[b as TroopId].wage,
  )
  for (const id of order) {
    if (left <= 0) break
    const troop = id as TroopId
    const have = troopCount(draft.party, troop)
    const taken = Math.min(have, left)
    draft.party = withUnits(draft.party, troop, -taken)
    left -= taken
    gone += taken
  }
  return gone
}

function addGoods(draft: Draft, good: GoodId, delta: number): void {
  const current = draft.character.inventory[good] ?? 0
  const next = Math.max(0, current + delta)
  const inventory = { ...draft.character.inventory }
  if (next === 0) delete inventory[good]
  else inventory[good] = next
  patch(draft, { inventory })
}

function patch(draft: Draft, changes: Partial<Character>): void {
  draft.character = { ...draft.character, ...changes }
}

/**
 * Годы.
 *
 * Возраст пересчитывается на сутках, а не выводится при каждом обращении: в
 * состоянии он нужен постоянно, и лишний счёт на телефоне ни к чему. Когда
 * приходит срок, игра не кончается — её продолжает наследник, если он есть.
 */
/**
 * Раны заживают, плен кончается, пленные спутники возвращаются.
 *
 * Лекарь-спутник рядом лечит вдвое быстрее. Плен кончается сам: спросят, что
 * есть в кошеле, и отпустят. Пленный спутник возвращается сам, понемногу — за
 * него никто не платит.
 */
function healAndFree(draft: Draft, daysPassed: number): void {
  const wound = draft.character.wound
  if (wound) {
    const healer =
      bestSkill(draft.companions, 'healing').level >= 3 ||
      ownOrderHere(draft.base)?.perks.healing === true
    const healed = healWound(wound, daysPassed, healer)
    patch(draft, { wound: healed })
    if (!healed) notice(draft, 'Рана зажила. Можно вставать.', 'people')
    else if (bedridden(wound) && !bedridden(healed)) {
      notice(draft, 'Рана затягивается: с постели уже можно подняться.', 'people')
    }
  }

  const captivity = draft.character.captivity
  if (captivity) {
    const daysLeft = captivity.daysLeft - daysPassed
    if (daysLeft <= 0) {
      const taken = Math.min(draft.character.money, captivity.ransom)
      if (taken > 0) addMoney(draft, -taken)
      patch(draft, { captivity: null })
      notice(
        draft,
        taken > 0
          ? `Отпустили: с тебя взяли ${taken} и вытолкали за ворота.`
          : 'Отпустили: держать тебя дальше никому не нужно.',
        'war',
      )
    } else {
      patch(draft, { captivity: { ...captivity, daysLeft } })
    }
  }

  // Пленные спутники: три шанса из ста в сутки выбраться.
  for (let i = 0; i < daysPassed; i += 1) {
    draft.companions = draft.companions.map((companion) => {
      if (!companion.captive) return companion
      const [back, next] = rollChance(draft.rng, 0.03)
      draft.rng = next
      if (!back) return companion
      notice(draft, `${companion.name} вернулся из плена.`, 'people')
      return { ...companion, captive: false }
    })
  }
}

function growOlder(draft: Draft, daysPassed: number): void {
  if (daysPassed <= 0) return
  const day = dayOf(draft.time)
  const age = ageOf(draft.character.bornDay, day)
  const grewUp = age > draft.character.age
  if (grewUp) {
    patch(draft, { age, attributes: agedAttributes(draft.character.attributes, age) })
    if (age === PRIME_AGE + 1) notice(draft, 'Годы берут своё: тело уже не то, что было.', 'people')

    // Дети рождаются раз в год, не чаще: мир и так считает каждый день.
    const [family, afterBirth, born] = maybeBirth(draft.character.family, day, draft.rng)
    draft.rng = afterBirth
    if (born) {
      patch(draft, { family })
      const child = family.children[family.children.length - 1]
      notice(draft, `Родился ребёнок: ${child?.name ?? 'дитя'}.`, 'people')
    }

    const [dies, afterDeath] = rollChance(draft.rng, deathChance(age))
    draft.rng = afterDeath
    if (dies) succeed(draft, day)
  }
}

/**
 * Смерть и наследник.
 *
 * Наследнику достаётся имя, земля и вассалы — но не слава, не навыки отца и не
 * его поручения. Иначе смерть ничего бы не значила: продолжение за сына было бы
 * бесплатным, а пермадэт превратился бы в смену заставки.
 */
function succeed(draft: Draft, day: number): void {
  const heir = heirOf(draft.character.family, day)
  if (!heir) {
    draft.over = true
    notice(draft, `${draft.character.name} умирает, и род пресекается.`, 'people')
    return
  }
  const before = draft.character.name
  draft.character = heirCharacter(draft.character, heir, day)
  draft.renown = Math.round(draft.renown / 4)
  draft.quests = []
  draft.party = { ...draft.party, morale: Math.max(30, draft.party.morale - 20) }
  notice(
    draft,
    `${before} умирает. Имя и земли принимает ${heir.name} — славу придётся нажить заново.`,
  )
}

/** Мор слышно издалека: о нём говорят все, кого он миновал. */
function plagueNews(
  state: GameState,
  locationId: string,
  events: readonly PlagueEvent[],
): readonly GameEvent[] {
  const news: GameEvent[] = []
  const here = regionOf(state.world, locationId)?.id
  for (const event of events) {
    const place = 'locationId' in event ? event.locationId : event.to
    const name = state.world.locations[place]?.name ?? 'соседнее селение'
    const near = regionOf(state.world, place)?.id === here
    if (event.type === 'plagueBegan') {
      news.push({ type: 'notice', kind: 'plague', text: `Говорят, в месте ${name} открылся мор.` })
    } else if (event.type === 'plagueSpread' && near) {
      news.push({ type: 'notice', kind: 'plague', text: `Мор дошёл до ${name}.` })
    } else if (event.type === 'plagueEnded' && near) {
      news.push({ type: 'notice', kind: 'plague', text: `В месте ${name} мор отступил.` })
    }
  }
  return news
}

/** Новые места и выросшие: то, ради чего стоит вернуться туда, где был. */
function settleNews(
  world: World,
  locationId: string,
  events: readonly SettleEvent[],
): readonly GameEvent[] {
  const news: GameEvent[] = []
  const here = world.locations[locationId]?.provinceId
  for (const event of events) {
    const name = world.locations[event.locationId]?.name ?? 'новое место'
    const near = world.locations[event.locationId]?.provinceId === here
    if (event.type === 'founded' && near) {
      news.push({ type: 'notice', kind: 'world', text: `Поставлены новые выселки: ${name}.` })
    } else if (event.type === 'resettled' && near) {
      news.push({ type: 'notice', kind: 'world', text: `В ${name} вернулись люди.` })
    } else if (event.type === 'grew' && near) {
      news.push({
        type: 'notice',
        kind: 'world',
        text: `${name} разрослось: теперь это не деревня.`,
      })
    }
  }
  return news
}

/** Новость о годе: слышно только про свою провинцию и соседние по области. */
function harvestNews(
  world: World,
  locationId: string,
  events: readonly HarvestEvent[],
): readonly GameEvent[] {
  const here = world.locations[locationId]?.provinceId
  const region = here ? world.provinces[here]?.regionId : undefined
  const news: GameEvent[] = []
  for (const event of events) {
    const province = world.provinces[event.provinceId]
    if (!province) continue
    if (province.id !== here && province.regionId !== region) continue
    const text =
      event.harvest < 0.7
        ? `Недород: ${province.name} осталась без хлеба.`
        : `Год выдался тощий: в ${province.name} хлеба сняли меньше обычного.`
    news.push({ type: 'notice', kind: 'world', text })
  }
  return news
}

function notice(draft: Draft, text: string, kind: LogKind = 'notice'): void {
  draft.events.push({ type: 'notice', text, kind })
}

function advance(draft: Draft, minutes: number): void {
  if (minutes <= 0) return
  draft.time += minutes
  draft.events.push({ type: 'timeAdvanced', minutes })
}

function addMoney(draft: Draft, delta: number): void {
  if (delta === 0) return
  patch(draft, { money: draft.character.money + delta })
  draft.events.push({ type: 'money', delta })
}

function addFatigue(draft: Draft, delta: number): void {
  const next = Math.min(FATIGUE_MAX, Math.max(0, Math.round(draft.character.fatigue + delta)))
  if (next === draft.character.fatigue) return
  const applied = next - draft.character.fatigue
  patch(draft, { fatigue: next })
  draft.events.push({ type: 'fatigue', delta: applied })
}

function practice(draft: Draft, skill: SkillId, rawXp: number): void {
  if (rawXp <= 0) return
  const attribute = attributeForSkill(draft.character, skill)
  const gain = applySkillXp(draft.character.skills[skill], rawXp, attribute)
  if (gain.appliedXp <= 0) return
  patch(draft, { skills: { ...draft.character.skills, [skill]: gain.progress } })
  if (gain.levelsGained === 0) return

  draft.events.push({ type: 'skillUp', skill, level: gain.progress.level })
  grantCharacterXp(draft, characterXpForSkillLevels(gain.levelsGained, gain.progress.level))
}

/** Поздние уровни навыка весят больше ранних, иначе прогресс персонажа встаёт. */
function characterXpForSkillLevels(levelsGained: number, newLevel: number): number {
  return PROGRESSION.characterXpPerSkillLevel * levelsGained * (1 + newLevel / 20)
}

function grantCharacterXp(draft: Draft, xp: number): void {
  const result = applyCharacterXp(draft.character.level, draft.character.xp, xp)
  patch(draft, {
    level: result.level,
    xp: result.xp,
    unspentSkillPoints: draft.character.unspentSkillPoints + result.skillPointsGained,
    unspentAttributePoints: draft.character.unspentAttributePoints + result.attributePointsGained,
  })
  if (result.levelsGained > 0) {
    draft.events.push({
      type: 'levelUp',
      level: result.level,
      skillPoints: result.skillPointsGained,
      attributePoints: result.attributePointsGained,
    })
  }
}
