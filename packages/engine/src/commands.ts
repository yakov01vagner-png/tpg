import type { AttributeId } from './attributes'
import { ATTRIBUTE_LABELS, ATTRIBUTE_MAX } from './attributes'
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
import type { Settlement } from './economy'
import { quoteBuy, quoteSell } from './economy'
import type { GameEvent } from './events'
import type { LifeEvent } from './life'
import { tickDays } from './life'
import { MAGIC_RANKS, nextRank, rankTier } from './magic'
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
import { regionOf, roadsFrom } from './world/queries'

/**
 * Команды — единственный способ изменить состояние (п.2 дизайн-документа).
 * UI не мутирует состояние сам: он отправляет команду и получает новое.
 */
export type Command =
  | { readonly type: 'travel'; readonly toLocationId: string }
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
  switch (command.type) {
    case 'travel':
      return travel(state, command.toLocationId)
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
  return close(draft)
}

/** Дорога выматывает примерно как работа: три с половиной единицы за час хода. */
export function travelFatigue(roadHours: number): number {
  return Math.round(roadHours * 3.5)
}

/** Сколько времени уходит на сделку — торг не бывает мгновенным. */
export const TRADE_MINUTES = 15

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
  if (carriedWeight(state.character) + weight > carryCapacity(state.character)) {
    return fail('overloaded', 'Столько на себе не унести.')
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
    base: state,
    events: [],
  }
}

function close(draft: Draft): CommandResult {
  // Мир живёт вместе с игровым временем: сколько суток прошло, столько поселения
  // и досчитывают. Никаких фоновых таймеров — только детерминированный догон.
  const daysPassed = dayOf(draft.time) - dayOf(draft.base.time)
  const life =
    daysPassed > 0
      ? tickDays(draft.base.world, draft.settlements, daysPassed)
      : { settlements: draft.settlements, events: [] as readonly LifeEvent[] }
  const events = [...draft.events, ...worldNews(draft.base, draft.locationId, life.events)]

  const state: GameState = {
    ...draft.base,
    time: draft.time,
    rng: draft.rng,
    character: draft.character,
    locationId: draft.locationId,
    settlements: life.settlements,
    log: appendLog(draft.base.log, draft.time, events),
  }
  return { ok: true, state, events }
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
