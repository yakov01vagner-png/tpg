import { skillLevel } from './character'
import { BIOGRAPHY } from './content/biography'
import {
  LESSONS,
  LESSON_DEFS,
  type LessonId,
  OPENING,
  OPENING_WORDS,
  SCREEN_GATES,
} from './content/opening'
import { PLAYER, holdingsOf } from './holding'
import { merchantsAt } from './merchant'
import { jobsAt } from './place'
import { SKILLS, type SkillId } from './skills'
import type { GameState } from './state'
import { dayOf } from './time'
import { warsOf } from './war'
import { startLocationFor } from './world/generate'
import { roadsFrom } from './world/queries'
import type { World } from './world/types'

/**
 * Первые десять минут (этап 201).
 *
 * К 1.0 игра умеет всё, и в этом беда: человек, открывший её впервые, видит
 * восемь экранов, сорок дел и ни одной причины сделать хоть что-нибудь. Учить
 * его было нечем — и нечему, пока не было сделано остальное.
 *
 * Здесь начало ведёт за руку делом: пять первых уроков, каждый из которых
 * объясняет одно правило тем, что случается. Ничего не хранится: пройден урок
 * или нет — видно по состоянию.
 */

export interface Step {
  readonly id: LessonId
  readonly done: boolean
  readonly can: boolean
  /** Куда идти или с кем говорить, если дело того требует. */
  readonly where: string | null
  readonly says: string
}

/** Первые дела, и каждое объясняет правило делом (Нч1, Нч4). */
export function firstSteps(state: GameState, world: World, day: number): readonly Step[] {
  const here = state.locationId
  const jobs = jobsAt(state, here).length
  const merchants = merchantsAt(world, state.settlements, here, state).length
  const seen = Object.keys(state.marks ?? {}).length
  const learned = (Object.keys(SKILLS) as SkillId[]).some(
    (id) => skillLevel(state.character, id) > 0,
  )
  // Дорога называется той, что есть: предложить «дойти до соседнего места», не
  // сказав какого, — это отправить новичка искать несуществующую дорогу.
  const road = roadsFrom(world, here)[0]?.to ?? null
  const rows: Record<LessonId, { done: boolean; can: boolean }> = {
    // Спрошено — значит, известна земля, куда ты не ходил: расспрос открывает
    // провинции, и сосчитать их дешевле, чем заводить отметку «спросил».
    ask: { done: (state.knowledge?.provinces.length ?? 0) > 1, can: true },
    earn: { done: learned, can: jobs > 0 },
    // Ушёл с места, где начал, — значит, дорогу уже прошёл. Начало выводится
    // из тех же меток героя, из каких его туда и поставили.
    walk: { done: here !== startLocationFor(world, state.character.tags), can: road !== null },
    deal: { done: Object.keys(state.dealings ?? {}).length > 0, can: merchants > 0 },
    // Последний урок — не дело, а срок: делать тут нечего, он «проходится»
    // сам, когда мягкая пора кончилась и цена ошибки стала настоящей.
    slip: { done: day > OPENING.softDays, can: false },
  }
  return LESSONS.map((id) => {
    const where = id === 'walk' ? road : null
    const named = where ? ` Отсюда есть дорога в ${world.locations[where]?.name ?? where}.` : ''
    return {
      id,
      done: rows[id].done,
      can: rows[id].can,
      where,
      says: `${LESSON_DEFS[id].label}: ${LESSON_DEFS[id].teaches} Цена ошибки — ${LESSON_DEFS[id].costs}.${named}${
        rows[id].can || id === 'slip' ? '' : ' Здесь этого нет — найдётся в месте побольше.'
      }`,
    }
  })
}

/** Что делать прямо сейчас: не больше трёх дел разом (Нч1). */
export function stepsNow(state: GameState, world: World, day: number): readonly Step[] {
  return firstSteps(state, world, day)
    .filter((one) => !one.done)
    .slice(0, OPENING.shows)
}

/** Какие экраны открыты и чем открываются прочие (Нч2). */
export function screensOpen(
  state: GameState,
  world: World,
  day: number,
): {
  readonly open: readonly string[]
  readonly shut: readonly string[]
  readonly says: string
} {
  const mine = holdingsOf(state.settlements, PLAYER)
  const learned = (Object.keys(SKILLS) as SkillId[]).some(
    (id) => skillLevel(state.character, id) > 0,
  )
  const has: Record<keyof typeof SCREEN_GATES, boolean> = {
    way: true,
    news: true,
    growth: learned,
    realm: mine.length > 0,
    talks: (state.overtures ?? []).length > 0 || (state.treaties ?? []).length > 0,
    war: state.politics.wars.length > 0,
    court: state.politics.lords.some((one) => one.kingdomId === PLAYER),
    house: state.character.family.spouse !== null || state.character.family.children.length > 0,
  }
  const ids = Object.keys(SCREEN_GATES) as (keyof typeof SCREEN_GATES)[]
  const open = ids.filter((id) => has[id])
  const shut = ids.filter((id) => !has[id])
  return {
    open,
    shut,
    says: `${OPENING_WORDS.narrow} Открыто ${open.length} из ${ids.length}: ${open.join(', ')}. Ждут: ${shut
      .map((id) => `${id} — ${SCREEN_GATES[id]}`)
      .join('; ')}.`,
  }
}

/** Чего хотеть и с чего начать (Нч3). */
export function firstAim(
  state: GameState,
  world: World,
  day: number,
): { readonly aim: string; readonly next: string; readonly says: string } {
  const next = stepsNow(state, world, day)[0]
  const money = state.character.money
  const aim =
    money < 100
      ? 'встать на ноги: заработать на дорогу и снаряжение'
      : holdingsOf(state.settlements, PLAYER).length === 0
        ? 'найти своё место: ремесло, службу или землю'
        : 'удержать взятое и вырасти'
  return {
    aim,
    next: next ? LESSON_DEFS[next.id].label : 'дальше решаешь сам',
    says: `${OPENING_WORDS.aim} Сейчас ты хочешь ${aim}. Начать: ${
      next ? LESSON_DEFS[next.id].label : 'дальше решаешь сам'
    }.`,
  }
}

/**
 * Чего стоит ошибиться в первых делах (Нч4).
 *
 * Не обещание безопасности, а счёт: у каждого первого дела названа его цена, и
 * все они меряются часами и монетами. Пока у игрока нет ни земли, ни вассалов,
 * ни войны, ломать ему нечего — и это видно из состояния, а не из слов.
 */
export function forgiving(
  state: GameState,
  day: number,
): { readonly soft: boolean; readonly daysLeft: number; readonly says: string } {
  const bare =
    holdingsOf(state.settlements, PLAYER).length === 0 &&
    state.politics.wars.every((one) => one.a !== PLAYER && one.b !== PLAYER) &&
    (state.debts ?? []).length === 0
  const soft = day <= OPENING.softDays && bare
  const left = Math.max(0, OPENING.softDays - day)
  return {
    soft,
    daysLeft: left,
    says: soft
      ? `${OPENING_WORDS.safe} Терять пока нечего: ни земли, ни войны, ни долга. Мягких суток осталось ${left}; цена первых ошибок — ${LESSONS.map(
          (id) => LESSON_DEFS[id].costs,
        ).join('; ')}.`
      : 'Мягкая пора кончилась: у тебя есть что терять, и ошибка стоит того, чего стоит.',
  }
}

/**
 * Создание героя как рассказ о мире (Нч5).
 *
 * Берётся та же биография (этап 12), но читается иначе: не «что ты получишь»,
 * а «что в этом мире значит родиться так».
 */
export function originTells(
  stageId: string,
): readonly { readonly id: string; readonly label: string; readonly says: string }[] {
  const stage = BIOGRAPHY.stages.find((one) => one.id === stageId)
  if (!stage) return []
  return stage.options.map((one) => ({
    id: one.id,
    label: one.label,
    says: `${one.label}: ${one.text} ${OPENING_WORDS.origin}`,
  }))
}

/** Начало в числах (Нч6). */
export function openingRoll(
  state: GameState,
  world: World,
  day: number,
): {
  readonly left: number
  readonly open: number
  readonly minutes: number
  readonly says: string
} {
  const steps = firstSteps(state, world, day)
  const left = steps.filter((one) => !one.done).length
  const screens = screensOpen(state, world, day)
  return {
    left,
    open: screens.open.length,
    minutes: OPENING.minutes,
    says: `${OPENING_WORDS.hand} Уроков впереди ${left} из ${LESSONS.length}, экранов открыто ${screens.open.length}, войн вокруг тебя ${
      warsOf(state.politics, PLAYER).length
    }; на всё про всё — ${OPENING.minutes} минут. ${firstAim(state, world, day).says}`,
  }
}

export { dayOf }
