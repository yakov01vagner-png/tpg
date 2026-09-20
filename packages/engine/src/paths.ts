import { skillLevel } from './character'
import { BOOKS } from './content/books'
import { COURSES } from './content/courses'
import {
  PATH_DEFS,
  PATH_WORDS,
  type PathId,
  SERVICE_TEACHES,
  TRIALS,
  type TrialDef,
} from './content/paths'
import { SKILLS, SKILL_IDS, type SkillId } from './skills'
import type { GameState } from './state'

/**
 * Пути раскачки (этап 124).
 *
 * До сих пор навык рос двумя способами, и разница между ними была только в
 * скорости. Здесь путей пять, и они различаются ценой: дело стоит времени,
 * учитель — серебра и дороги, книга — потолка, испытание — риска, служба —
 * свободы. Отсюда и правило: у каждого навыка не меньше двух путей, и оба
 * проходимы без другого.
 */

export function pathDef(id: PathId) {
  return PATH_DEFS[id]
}

export function trialById(id: string): TrialDef | null {
  return TRIALS.find((one) => one.id === id) ?? null
}

/** Испытания для этого навыка. */
export function trialsFor(skill: SkillId): readonly TrialDef[] {
  return TRIALS.filter((one) => one.skill === skill)
}

export interface PathOption {
  readonly path: PathId
  readonly open: boolean
  /** Выше какого уровня этот путь не поднимет. Ноль — без потолка. */
  readonly cap: number
  readonly says: string
}

/**
 * Какие пути открыты к этому навыку (Пу1 и Пу2).
 *
 * «Открыт» значит: есть чем воспользоваться в мире — наставник такого дела,
 * книга о нём, испытание по нему, служба, которая ему учит. Дело открыто
 * всегда: заниматься можно чем угодно, и это самый медленный путь.
 */
export function pathsFor(state: GameState, skill: SkillId): readonly PathOption[] {
  const level = skillLevel(state.character, skill)
  const teacher = COURSES.filter((one) => one.skill === skill)
  const bestTeacher = teacher.reduce((best, one) => Math.max(best, one.teacherCap), 0)
  const books = BOOKS.filter((one) => (one.teaches[skill] ?? 0) > 0)
  const trials = trialsFor(skill)
  const service = Object.entries(SERVICE_TEACHES).filter(([, skills]) => skills.includes(skill))
  return [
    {
      path: 'doing',
      open: true,
      cap: 0,
      says: `${PATH_DEFS.doing.about} Сейчас у тебя ${level}.`,
    },
    {
      path: 'teacher',
      open: teacher.length > 0,
      cap: bestTeacher,
      says:
        teacher.length > 0
          ? `Наставников такого дела: ${teacher.length}, выше ${bestTeacher} не научат. ${PATH_WORDS.teacherCap}`
          : 'Такому делу наставников нет.',
    },
    {
      path: 'book',
      open: books.length > 0,
      cap: PATH_DEFS.book.cap,
      says:
        books.length > 0
          ? `Книг об этом: ${books.length}. ${PATH_WORDS.bookCap}`
          : 'Книг об этом не пишут.',
    },
    {
      path: 'trial',
      open: trials.length > 0,
      cap: 0,
      says:
        trials.length > 0
          ? `Испытание: ${trials.map((one) => one.label).join(', ')}. ${PATH_WORDS.trialRisk}`
          : 'Испытания по этому делу не бывает.',
    },
    {
      path: 'service',
      open: service.length > 0,
      cap: 0,
      says:
        service.length > 0
          ? `Этому учит служба: ${service.map(([id]) => id).join(', ')}. ${PATH_WORDS.serviceFree}`
          : 'Службы такому делу нет.',
    },
  ]
}

/** Сколько путей открыто к каждому навыку — проверка «не меньше двух» (Пу2). */
export function pathCount(state: GameState): Readonly<Record<SkillId, number>> {
  const out = {} as Record<SkillId, number>
  for (const id of SKILL_IDS) {
    out[id] = pathsFor(state, id).filter((one) => one.open).length
  }
  return out
}

/** Навыки, к которым путей меньше двух: их быть не должно. */
export function narrowSkills(state: GameState): readonly SkillId[] {
  const counted = pathCount(state)
  return SKILL_IDS.filter((id) => counted[id] < 2)
}

/**
 * Выйдешь ли ты из испытания с прибытком (Пу1).
 *
 * Не бросок: считается запасом умения над порогом. Пришёл впритык — рискуешь
 * временем, деньгами и рёбрами, и это честно названо заранее.
 */
export function trialOdds(
  state: GameState,
  trial: TrialDef,
): { readonly can: boolean; readonly chance: number; readonly says: string } {
  const level = skillLevel(state.character, trial.skill)
  if (level < trial.needs) {
    return {
      can: false,
      chance: 0,
      says: `${trial.label}: нужно ${trial.needs} ${SKILLS[trial.skill].label.toLowerCase()}, у тебя ${level}.`,
    }
  }
  const margin = level - trial.needs
  const chance = Math.round(Math.min(0.95, 0.45 + margin * 0.02) * 100) / 100
  return {
    can: true,
    chance,
    says: `${trial.label}: ${trial.about} Выдержишь в ${Math.round(chance * 100)} случаях из ста; не выдержишь — ${trial.fails}.`,
  }
}

/** Чему учит эта служба (Пу6). */
export function serviceTeaches(kind: string): readonly SkillId[] {
  return SERVICE_TEACHES[kind] ?? []
}

export interface PathLedger {
  readonly byDoing: number
  readonly byTeacher: number
  readonly byBook: number
  readonly byTrial: number
  readonly byService: number
  readonly says: string
}

/** Чем ты рос на самом деле. */
export function pathLedger(state: Pick<GameState, 'pathLog'>): PathLedger {
  const log = state.pathLog ?? {
    byDoing: 0,
    byTeacher: 0,
    byBook: 0,
    byTrial: 0,
    byService: 0,
  }
  const all = log.byDoing + log.byTeacher + log.byBook + log.byTrial + log.byService
  return {
    ...log,
    says:
      all === 0
        ? 'Ты пока ничему не учился.'
        : `Опыта набрано ${all}: делом ${log.byDoing}, у наставников ${log.byTeacher}, по книгам ${log.byBook}, испытаниями ${log.byTrial}, службой ${log.byService}.`,
  }
}

export { PATH_DEFS, PATH_WORDS, TRIALS, SERVICE_TEACHES, type PathId, type TrialDef }
