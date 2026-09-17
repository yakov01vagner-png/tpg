import type { AttributeId } from './attributes'
import { ATTRIBUTE_LABELS, ATTRIBUTE_MAX } from './attributes'
import type { Battle, GroupId, OrderId } from './battle'
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
import type { GoodId } from './content/goods'
import { GOODS } from './content/goods'
import type { TroopId } from './content/troops'
import { TROOPS } from './content/troops'
import type { Settlement } from './economy'
import { quoteBuy, quoteSell } from './economy'
import type { GameEvent } from './events'
import type { LifeEvent } from './life'
import { tickDays } from './life'
import { MAGIC_RANKS, nextRank, rankTier } from './magic'
import type { Party } from './party'
import {
  DESERTION_MORALE,
  EDIBLE,
  dailyFood,
  dailyWages,
  partyCapacity,
  partySize,
  partyStrength,
  troopCount,
  withUnits,
} from './party'
import { isAvailableAt } from './place'
import { PROGRESSION, applyCharacterXp, applySkillXp } from './progression'
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
  MINUTES_PER_HOUR,
  dayOf,
  formatDuration,
  formatWindow,
  hours,
  isWithinWindow,
  nextTimeOfDay,
} from './time'
import type { Politics } from './war'
import { banditBand, tickPolitics, warband, warsOf } from './war'
import { kingdomOf, regionOf, roadsFrom } from './world/queries'

/**
 * Команды — единственный способ изменить состояние (п.2 дизайн-документа).
 * UI не мутирует состояние сам: он отправляет команду и получает новое.
 */
export type Command =
  | { readonly type: 'travel'; readonly toLocationId: string }
  | { readonly type: 'hire'; readonly troop: TroopId; readonly count: number }
  | { readonly type: 'disband'; readonly troop: TroopId; readonly count: number }
  | { readonly type: 'battleOrders'; readonly orders: Readonly<Record<GroupId, OrderId>> }
  | { readonly type: 'battleFlee' }
  | { readonly type: 'battleEnd'; readonly prisoners: 'ransom' | 'recruit' | 'release' }
  | { readonly type: 'takeService'; readonly kingdomId: string }
  | { readonly type: 'leaveService' }
  | { readonly type: 'seekEnemy' }
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
  const result = resolveRound(
    battle,
    orders,
    { command: skillLevel(state.character, 'command') },
    draft.rng,
  )
  draft.rng = result.rng
  draft.battle = result.battle
  draft.party = {
    ...draft.party,
    units: unformUp(result.battle.groups),
    morale: result.battle.morale,
  }
  // Бой идёт по своим часам, но не бесплатно: раунд — это время и силы.
  advance(draft, 20)
  addFatigue(draft, 4)
  practice(draft, 'command', 12)
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
  const quote = quoteBuy(state.world, settlement, good, amount, tradeSkill)
  if (quote.amount < amount) {
    return fail('noGoods', `Столько тут не купить: ${GOODS[good].label.toLowerCase()} в обрез.`)
  }
  if (state.character.money < quote.total) {
    return fail('noMoney', `Не хватает денег: нужно ${quote.total}, есть ${state.character.money}.`)
  }
  const weight = GOODS[good].weight * amount
  // Поклажу несут все: чем больше отряд, тем больше влезает.
  if (carriedWeight(state.character) + weight > partyCapacity(state.character, state.party)) {
    return fail('overloaded', 'Столько не унести — ни на себе, ни на людях.')
  }

  const draft = open(state)
  notice(draft, `Куплено: ${GOODS[good].label.toLowerCase()}, ${amount} — за ${quote.total}.`)
  advance(draft, TRADE_MINUTES)
  addMoney(draft, -quote.total)
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
  service: string | null
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
    service: state.service,
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

    payUpkeep(draft, daysPassed)
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
    service: draft.service,
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
function warNews(
  state: GameState,
  locationId: string,
  events: readonly import('./war').WarEvent[],
): readonly GameEvent[] {
  const news: GameEvent[] = []
  const hereKingdom = kingdomOf(state.world, locationId)?.id
  for (const event of events) {
    if (event.type === 'raid') {
      if (regionOf(state.world, event.locationId)?.id !== regionOf(state.world, locationId)?.id)
        continue
      const name = state.world.locations[event.locationId]?.name ?? 'соседнее селение'
      news.push({ type: 'notice', text: `${name} разорено: уведено и убито ${event.lost}.` })
      continue
    }
    // О войнах и мире слышно везде, но только про свои и соседские королевства.
    const involved = event.war.a === hereKingdom || event.war.b === hereKingdom
    const names = `${state.world.kingdoms[event.war.a]?.name ?? '?'} и ${state.world.kingdoms[event.war.b]?.name ?? '?'}`
    if (event.type === 'warDeclared') {
      news.push({
        type: 'notice',
        text: involved
          ? `Война: ${names}. Причина — ${event.war.reason}.`
          : `Говорят, ${names} схватились: ${event.war.reason}.`,
      })
    } else {
      news.push({ type: 'notice', text: `Мир между ${names}.` })
    }
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
