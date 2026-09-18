import type { AttributeId } from './attributes'
import { ATTRIBUTE_LABELS, ATTRIBUTE_MAX } from './attributes'
import type { Band, BandEvent } from './band'
import { bandSize, clash, nextHop, roadHours, tickBands } from './band'
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
import type { ChainDef } from './content/chains'
import type { CompanionDef, DeedId } from './content/companions'
import { COMPANIONS, TEMPERS } from './content/companions'
import type { SlotId } from './content/equipment'
import { ITEMS_BY_ID, SLOT_IDS } from './content/equipment'
import type { GoodId } from './content/goods'
import { GOODS } from './content/goods'
import { TEMPER_LINES } from './content/lines'
import { SITES } from './content/sites'
import type { TroopId } from './content/troops'
import { TROOPS, TROOP_FOOD_PER_DAY } from './content/troops'
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
import { quoteBuy, quoteSell } from './economy'
import type { Enterprise } from './enterprise'
import { CARAVAN_COST, WORKSHOP_COST, tickEnterprises } from './enterprise'
import { gearBonus, horseCarry, repairCost, withItem } from './equipment'
import type { GameEvent, LogKind } from './events'
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
import type { HarvestEvent, LifeEvent } from './life'
import { foodSecurity, rollHarvest, tickDays } from './life'
import { MAGIC_RANKS, nextRank, rankTier } from './magic'
import type { PriceLog } from './market'
import { recordPrices } from './market'
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
import { describeQuest, isComplete, offersAt } from './quest'
import type { Quest } from './quest'
import { isShunned, lordRep, placeRep, priceFactor, withLordRep, withPlaceRep } from './reputation'
import type { Reputation } from './reputation'
import type { Rng } from './rng'
import { nextInt, rollChance } from './rng'
import type { SettleEvent } from './settle'
import { tickSettling } from './settle'
import type { SkillId } from './skills'
import { SKILLS } from './skills'
import type { GameState } from './state'
import { appendLog } from './state'
import { DAYS_PER_YEAR, timeOfDay } from './time'
import type { GameTime } from './time'
import type { TimeWindow } from './time'
import {
  DAY_WINDOW,
  MINUTES_PER_DAY,
  MINUTES_PER_HOUR,
  dayOf,
  formatDuration,
  formatWindow,
  hours,
  isWithinWindow,
  nextTimeOfDay,
} from './time'
import type { Lord } from './war'
import { allied, pairOf } from './war'
import type { Politics } from './war'
import type { WarEvent } from './war'
import { atWar, banditBand, lordById, tickPolitics, warband, warsOf } from './war'
import { kingdomOf, regionOf, roadsFrom } from './world/queries'
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
  | { readonly type: 'hire'; readonly troop: TroopId; readonly count: number }
  | { readonly type: 'disband'; readonly troop: TroopId; readonly count: number }
  | { readonly type: 'battleOrders'; readonly orders: Readonly<Record<GroupId, OrderId>> }
  | { readonly type: 'battleFlee' }
  | { readonly type: 'battleEnd'; readonly prisoners: 'ransom' | 'recruit' | 'release' }
  /** Поединок: герой лично против лучшего из чужих. Один на бой. */
  | { readonly type: 'duel' }
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
  | { readonly type: 'takeQuest'; readonly questId: string }
  | { readonly type: 'finishQuest'; readonly questId: string }
  | { readonly type: 'abandonQuest'; readonly questId: string }
  | { readonly type: 'proclaimRealm'; readonly name: string }
  | { readonly type: 'inviteLord'; readonly lordId: string }
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
    command.type === 'duel'
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

  switch (command.type) {
    case 'tick':
      return tick(state, command.minutes)
    case 'travel':
      return travel(state, command.toLocationId)
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

/** Как зовут того, кто стоит напротив: лорд, корона или просто разбойники. */
export function foeName(state: GameState, foeId: string | null): string {
  if (!foeId || foeId === 'bandits') return 'разбойники'
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
function travel(state: GameState, toLocationId: string): CommandResult {
  const destination = state.world.locations[toLocationId]
  if (!destination) return fail('unknownAction', 'Такого места нет.')

  const road = roadsFrom(state.world, state.locationId).find(
    (candidate) => candidate.to === toLocationId,
  )
  if (!road) return fail('unknownAction', `Отсюда нет прямой дороги в ${destination.name}.`)

  // К мёртвому месту дорога заросла: идти вдвое дольше (band.ts, OVERGROWN).
  const roadHoursNow = roadHours(state.world, state.settlements, state.locationId, road.to)
  const walking = legHoursFor(roadHoursNow, paceOf(state.party, state.character.wound !== null))
  const blocked = checkFatigue(state.character, travelFatigue(walking))
  if (blocked) return blocked

  const from = state.world.locations[state.locationId]
  const draft = open(state)
  notice(
    draft,
    `Дорога${from ? ` из ${from.name}` : ''} в ${destination.name}: ${formatDuration(hours(walking))} пути${
      roadHoursNow > road.hours ? ' — заросла, идти дольше' : ''
    }.`,
  )
  draft.journey = { fromId: state.locationId, toId: toLocationId, hours: walking, done: 0 }
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
  const dark = timeOfDay(draft.base.time) === 'night'
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
    return
  }

  // Пришли.
  draft.journey = null
  draft.locationId = journey.toId
  const place = draft.world.locations[journey.toId]
  notice(draft, `Пришли: ${place?.name ?? 'место'}.`)
  roadTalk(draft)
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
  return Math.min(0.45, 0.02 + banditry * 0.5 + wild * 0.3)
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
  if (
    !isSettlement(here.archetype) ||
    !def.where.includes(here.archetype) ||
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
  const cost = def.hireCost * count
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
  notice(draft, `Выковано: ${item.label.toLowerCase()}.`)
  advance(draft, hours(10))
  addFatigue(draft, 25)
  addGoods(draft, 'iron', -item.craft.iron)
  addGoods(draft, 'tools', -item.craft.tools)
  patch(draft, {
    equipment: withItem(draft.character.equipment, item.slot, { id: item.id, condition: 100 }),
  })
  practice(draft, 'engineering', 45)
  return close(draft)
}

function repairItem(state: GameState, slot: SlotId): CommandResult {
  const worn = state.character.equipment[slot]
  const item = worn ? ITEMS_BY_ID[worn.id] : null
  if (!worn || !item) return fail('invalid', 'Тут нечего чинить.')
  if (worn.condition >= 100) return fail('invalid', 'Вещь и так цела.')
  const cost = repairCost(item, worn.condition)
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

function takeQuest(state: GameState, questId: string): CommandResult {
  if (state.quests.some((quest) => quest.id === questId)) {
    return fail('invalid', 'Это уже на тебе.')
  }
  const offer = offersAt(state).find((quest) => quest.id === questId)
  if (!offer) return fail('unknownAction', 'Такого здесь не просят.')

  const draft = open(state)
  notice(draft, `Взято: ${describeQuest(state, offer).toLowerCase()}.`)
  draft.quests = [...draft.quests, offer]
  advance(draft, 30)
  return close(draft)
}

function finishQuest(state: GameState, questId: string): CommandResult {
  const quest = state.quests.find((candidate) => candidate.id === questId)
  if (!quest) return fail('unknownAction', 'Ты такого не брал.')
  if (state.locationId !== quest.issuerLocationId) {
    return fail('unavailableHere', 'За наградой идут к тому, кто просил.')
  }
  if (!isComplete(state, quest)) return fail('requirements', 'Дело ещё не сделано.')

  const draft = open(state)
  notice(draft, `Награда за дело: ${quest.reward}.`)
  addMoney(draft, quest.reward)
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
  return isShunned(placeRep(state.reputation, state.locationId))
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
  if (band.locationId !== state.locationId || band.travel) {
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

  const draft = open(state)
  notice(
    draft,
    state.journey
      ? 'Ночёвка у дороги: костёр и очередь караулить.'
      : 'Костёр, котелок и очередь караулить.',
  )
  advance(draft, hours(CAMP_HOURS))
  // Под небом отдыхают хуже, чем под крышей: три четверти от сна в доме.
  addFatigue(draft, -Math.round(SLEEP_RECOVERY_PER_HOUR * CAMP_HOURS * 0.75))
  practice(draft, 'survival', 18)
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
  const [found, afterRoll] = rollChance(draft.rng, odds)
  draft.rng = afterRoll
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

function buy(state: GameState, good: GoodId, amount: number): CommandResult {
  const problem = checkTradeRequest(good, amount)
  if (problem) return problem
  const settlement = state.settlements[state.locationId]
  if (!settlement) return fail('invalid', 'Непонятно, где находится герой.')

  const tradeSkill = skillLevel(state.character, 'trade')
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

  const tradeSkill = skillLevel(state.character, 'trade')
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
    checkPlace(state, job.where, 'Здесь такой работы нет.') ??
    checkWindow(state.time, job.window, 'На эту работу нанимают') ??
    checkRequirements(state.character, job.requires) ??
    checkFatigue(state.character, job.fatigue)
  if (blocked) return blocked

  const draft = open(state)
  const efficiency = fatigueFactor(state.character.fatigue)
  notice(draft, `Смена окончена: ${job.label.toLowerCase()}.`)
  advance(draft, job.durationMinutes)
  addMoney(draft, job.pay)
  addFatigue(draft, job.fatigue)
  for (const [skill, rawXp] of Object.entries(job.practice)) {
    practice(draft, skill as SkillId, (rawXp ?? 0) * efficiency)
  }
  return close(draft)
}

function study(state: GameState, courseId: string, content: Content): CommandResult {
  const course = content.courses[courseId]
  if (!course) return fail('unknownAction', 'Такого наставника здесь нет.')
  const blocked =
    checkWelcome(state) ??
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
  const blocked =
    checkPlace(state, exam.where, 'Здесь некому принимать испытание.') ??
    checkWindow(state.time, exam.window, 'Испытания проводят') ??
    checkRequirements(character, exam.requires) ??
    checkMoney(character, exam.cost) ??
    checkFatigue(character, exam.fatigue)
  if (blocked) return blocked

  const draft = open(state)
  notice(draft, `${exam.label}.`)
  advance(draft, exam.durationMinutes)
  addMoney(draft, -exam.cost)
  addFatigue(draft, exam.fatigue)

  const [passed, rng] = rollChance(
    draft.rng,
    examChance(magic, rank.requiredSkill, exam.comfortableMargin),
  )
  draft.rng = rng
  if (passed) {
    patch(draft, { magicRank: exam.rank })
    draft.events.push({ type: 'rankGranted', rank: exam.rank })
  } else {
    draft.events.push({ type: 'examFailed', rank: exam.rank })
    // Провал тоже чему-то учит — но дешевле было бы прийти подготовленным.
    practice(draft, 'magic', 20)
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
    const life = tickDays(draft.base.world, draft.settlements, daysPassed)
    draft.settlements = life.settlements
    draft.events.push(...worldNews(draft.base, draft.locationId, life.events))

    const politics = tickPolitics(
      draft.base.world,
      draft.politics,
      draft.settlements,
      dayOf(draft.time),
      draft.rng,
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
      const healer = bestSkill(draft.companions, 'healing').level >= 4 ? draft.locationId : null
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

      // И каким вышел год на земле: недород — единственное, что доводит до
      // голода мир, в котором еды с запасом.
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
      )
      draft.enterprises = trade.enterprises
      draft.rng = trade.rng
      if (trade.income !== 0) addMoney(draft, trade.income)
      for (const event of trade.events) {
        if (event.type === 'caravanRobbed') {
          const where = draft.base.world.locations[event.locationId]?.name ?? 'дорогой'
          notice(draft, `Обоз разграблен под ${where}.`, 'trade')
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
  if (mine.length === 0) return

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
    const healer = bestSkill(draft.companions, 'healing').level >= 3
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
