import type { AttributeId } from './attributes'
import { ATTRIBUTE_LABELS, ATTRIBUTE_MAX } from './attributes'
import type { Band, BandEvent } from './band'
import { tickBands } from './band'
import type { Battle, BattleSide, GroupId, OrderId } from './battle'
import { fleeBattle, resolveRound, startBattle, unformUp } from './battle'
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
import type { Availability, Content, Requirements } from './content'
import { CONTENT } from './content'
import type { BuildingId } from './content/buildings'
import { BUILDINGS } from './content/buildings'
import type { SlotId } from './content/equipment'
import { ITEMS_BY_ID, SLOT_IDS } from './content/equipment'
import type { GoodId } from './content/goods'
import { GOODS } from './content/goods'
import type { TroopId } from './content/troops'
import { TROOPS, TROOP_FOOD_PER_DAY } from './content/troops'
import type { Settlement } from './economy'
import { quoteBuy, quoteSell } from './economy'
import { gearBonus, horseCarry, repairCost, withItem } from './equipment'
import type { GameEvent } from './events'
import {
  PLAYER,
  dailyTax,
  freeSlots,
  garrisonLimit,
  garrisonSize,
  garrisonWages,
  hasBuilding,
  holdingsOf,
  isOwnedByPlayer,
} from './holding'
import type { LifeEvent } from './life'
import { foodSecurity, tickDays } from './life'
import { MAGIC_RANKS, nextRank, rankTier } from './magic'
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
import { PROGRESSION, applyCharacterXp, applySkillXp } from './progression'
import { describeQuest, isComplete, offersAt } from './quest'
import type { Quest } from './quest'
import { isShunned, lordRep, placeRep, priceFactor, withLordRep, withPlaceRep } from './reputation'
import type { Reputation } from './reputation'
import type { Rng } from './rng'
import { rollChance } from './rng'
import type { SkillId } from './skills'
import { SKILLS } from './skills'
import type { GameState } from './state'
import { appendLog } from './state'
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
import type { Politics } from './war'
import type { WarEvent } from './war'
import { atWar, banditBand, lordById, tickPolitics, warband, warsOf } from './war'
import { kingdomOf, regionOf, roadsFrom } from './world/queries'

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
  | { readonly type: 'takeService'; readonly kingdomId: string }
  | { readonly type: 'leaveService' }
  | { readonly type: 'seekEnemy' }
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
  | 'invalid'

export type CommandResult =
  | { readonly ok: true; readonly state: GameState; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly code: FailureCode; readonly message: string }

/** Сколько усталости снимает час отдыха и час сна. */
export const REST_RECOVERY_PER_HOUR = 6
export const SLEEP_RECOVERY_PER_HOUR = 12
/** Максимум, который можно «переждать» одной командой. */
export const MAX_REST_HOURS = 12

export function applyCommand(
  state: GameState,
  command: Command,
  content: Content = CONTENT,
): CommandResult {
  // Пока идёт бой, мир стоит: ничем, кроме боя, заняться нельзя.
  const fighting = state.battle !== null
  const isBattleCommand =
    command.type === 'battleOrders' || command.type === 'battleFlee' || command.type === 'battleEnd'
  if (state.over) return fail('invalid', 'Эта история закончена.')
  if (fighting && !isBattleCommand) return fail('inBattle', 'Сейчас не до того — идёт бой.')
  if (!fighting && isBattleCommand) return fail('invalid', 'Боя нет.')

  switch (command.type) {
    case 'tick':
      return tick(state, command.minutes)
    case 'travel':
      return travel(state, command.toLocationId)
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
    case 'takeService':
      return takeService(state, command.kingdomId)
    case 'leaveService':
      return leaveService(state)
    case 'seekEnemy':
      return seekEnemy(state)
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

// --- команды ---------------------------------------------------------------

/**
 * Переход в соседнюю по дороге локацию.
 *
 * Дорога — это просто длинное действие: модель времени из п.11.1 принимает её
 * без переделки. Ходить можно только к соседу, дальний путь складывается из
 * нескольких переходов — потом в них будет чему случаться.
 */
function travel(state: GameState, toLocationId: string): CommandResult {
  const destination = state.world.locations[toLocationId]
  if (!destination) return fail('unknownAction', 'Такого места нет.')

  const road = roadsFrom(state.world, state.locationId).find(
    (candidate) => candidate.to === toLocationId,
  )
  if (!road) return fail('unknownAction', `Отсюда нет прямой дороги в ${destination.name}.`)

  const cost = travelFatigue(road.hours)
  const blocked = checkFatigue(state.character, cost)
  if (blocked) return blocked

  const from = state.world.locations[state.locationId]
  const draft = open(state)
  notice(
    draft,
    `Дорога${from ? ` из ${from.name}` : ''} в ${destination.name}: ${formatDuration(hours(road.hours))} пути.`,
  )
  advance(draft, hours(road.hours))
  addFatigue(draft, cost)
  practice(draft, 'athletics', road.hours * 2.5)
  practice(draft, 'survival', road.hours * 1.5)
  draft.locationId = toLocationId
  ambush(draft, toLocationId)
  return close(draft)
}

/**
 * Встреча на дороге.
 *
 * Шайки водятся там, где голодно и разорено, поэтому опасность дороги — прямое
 * следствие экономики, а не случайное событие по таймеру. Одиночку не убивают,
 * а обирают: драться с ним незачем.
 */
function ambush(draft: Draft, locationId: string): void {
  const settlement = draft.settlements[locationId]
  if (!settlement) return
  const [meets, afterMeet] = rollChance(draft.rng, Math.min(0.45, 0.02 + settlement.banditry * 0.5))
  draft.rng = afterMeet
  if (!meets) return

  const terrain = draft.base.world.locations[locationId]?.terrain ?? 'plains'
  if (partySize(draft.party) >= 3) {
    const [band, afterBand] = banditBand(settlement.banditry, settlement.population, draft.rng)
    draft.rng = afterBand
    draft.battle = startBattle(draft.party, band, terrain)
    notice(draft, 'На дороге ждали: разбойники.')
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
  addFatigue(draft, (-REST_RECOVERY_PER_HOUR / 2) * (minutes / MINUTES_PER_HOUR))
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
  if (!def.where.includes(here.archetype) || settlement.population < def.minPopulation) {
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
  const result = resolveRound(
    battle,
    orders,
    {
      command: skillLevel(state.character, 'command'),
      magic: skillLevel(state.character, 'magic'),
      // Снаряжение отряда множит силу строя, железо героя прибавляет своё.
      gear: gearFactor(state.party),
      heroAttack: hero.attack,
      heroDefense: hero.defense,
    },
    draft.rng,
  )
  draft.rng = result.rng
  draft.battle = result.battle
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
        notice(draft, `${name} взят. Людей поубавилось, и они это запомнят.`)
        draft.reputation = withPlaceRep(draft.reputation, battle.stake.locationId, -45)
        if (taken.owner && !taken.owner.startsWith('crown:') && taken.owner !== PLAYER) {
          draft.reputation = withLordRep(draft.reputation, taken.owner, -25)
        }
      }
      draft.siege = null
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
      }
    }
    draft.party = { ...draft.party, morale: Math.min(100, draft.party.morale + 10) }
  } else if (battle.outcome === 'lost') {
    const lost = Math.round(draft.character.money * 0.5)
    addMoney(draft, -lost)
    addFatigue(draft, 40)
    notice(draft, `Разбитых обобрали: потеряно ${lost}.`)
    const [dies, afterDeath] = rollChance(draft.rng, 0.015)
    draft.rng = afterDeath
    if (dies) {
      draft.over = true
      notice(draft, 'Этот бой стал последним.')
    }
  }
  return close(draft)
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
  if (def.where && !def.where.includes(here.archetype)) {
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
  draft.battle = startBattle(draft.party, defenders, here.terrain, {
    stake: { type: 'siege', locationId: siege.locationId },
    wallBonus: hasBuilding(settlement, 'walls') ? 2.1 : 1.35,
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
  if (!item.where.includes(here.archetype)) {
    return fail('unavailableHere', 'Здесь такого не делают и не возят.')
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
  draft.battle = startBattle(draft.party, enemy, here?.terrain ?? 'plains')
  notice(draft, 'Впереди чужие знамёна.')
  advance(draft, hours(4))
  addFatigue(draft, 10)
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
  settlements: Readonly<Record<string, Settlement>>
  party: Party
  battle: Battle | null
  politics: Politics
  bands: readonly Band[]
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
    settlements: state.settlements,
    party: state.party,
    battle: state.battle,
    politics: state.politics,
    bands: state.bands,
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

    payUpkeep(draft, daysPassed)
    expireQuests(draft)
  }

  const state: GameState = {
    ...draft.base,
    time: draft.time,
    rng: draft.rng,
    character: draft.character,
    locationId: draft.locationId,
    settlements: draft.settlements,
    party: draft.party,
    battle: draft.battle,
    politics: draft.politics,
    bands: draft.bands,
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
        text: `${placeName(event.locationId)} разорено: уведено и убито ${event.lost}.`,
      })
    } else if (event.type === 'bandSiege') {
      if (!near(event.locationId)) continue
      news.push({ type: 'notice', text: `${placeName(event.locationId)} обложено войском.` })
    } else if (event.type === 'bandTook') {
      news.push({
        type: 'notice',
        text: `${placeName(event.locationId)} взято: место перешло к ${lordName(
          state.bands.find((band) => band.id === event.bandId)?.lordId ?? '',
        )}.`,
      })
    } else if (event.type === 'bandClash') {
      if (!near(event.locationId)) continue
      news.push({
        type: 'notice',
        text: `Под ${placeName(event.locationId)} сошлись дружины: ${lordName(
          event.winner,
        )} одолел, полегло ${event.fallen}.`,
      })
    } else if (event.type === 'lordSubmits') {
      news.push({
        type: 'notice',
        text: `${lordName(event.lordId)} разбит и снова присягнул короне.`,
      })
    } else if (event.type === 'lordFell') {
      news.push({ type: 'notice', text: `${lordName(event.lordId)} пал, и род его пресёкся.` })
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
      news.push({ type: 'notice', text: `Говорят, ${words[event.state]}.` })
      continue
    }

    const involved = event.war.a === hereKingdom || event.war.b === hereKingdom
    const names = `${kingdomName(event.war.a)} и ${kingdomName(event.war.b)}`
    news.push({
      type: 'notice',
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

  draft.settlements = settlements
  const net = Math.round(income - wages)
  if (net !== 0) addMoney(draft, net)
  if (net < 0) notice(draft, `Земля не окупает гарнизон: ушло ${Math.abs(net)}.`)
  else if (net > 0) notice(draft, `Подати с владений: ${net}.`)
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

function notice(draft: Draft, text: string): void {
  draft.events.push({ type: 'notice', text })
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
