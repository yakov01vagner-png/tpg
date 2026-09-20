import type { SkillId } from '../skills'

/**
 * Пути раскачки (этап 124) — содержимое.
 *
 * До сих пор навык рос двумя способами: делать и учиться у наставника. Разница
 * между ними была только в скорости, и оттого выбор сводился к «есть ли
 * серебро». Здесь путей становится пять, и они различаются не скоростью, а
 * ценой: временем, деньгами, потолком, риском и тем, чем приходится заняться.
 */

export const PATHS = ['doing', 'teacher', 'book', 'trial', 'service'] as const
export type PathId = (typeof PATHS)[number]

export const PATH_DEFS: Record<
  PathId,
  {
    readonly label: string
    readonly about: string
    /** Чем платишь. */
    readonly costs: string
    /** Выше какого уровня этот путь не поднимает. Ноль — без потолка. */
    readonly cap: number
    /** Сколько сырого опыта даёт за раз. */
    readonly xp: number
    /** Сколько раз в год этим вообще можно воспользоваться. */
    readonly perYear: number
  }
> = {
  doing: {
    label: 'дело',
    about: 'Навык растёт от того, чем ты занят. Медленно, надёжно и без потолка.',
    costs: 'временем, которого не вернёшь',
    cap: 0,
    xp: 8,
    perYear: 300,
  },
  teacher: {
    label: 'учитель',
    about: 'Быстро и дорого. Выше своего наставник не научит, и его надо найти.',
    costs: 'серебром и дорогой до школы',
    cap: 0,
    xp: 40,
    perYear: 120,
  },
  book: {
    label: 'книга',
    about: 'Учит без учителя, но дальше середины по книге не уйдёшь.',
    costs: 'серебром и неделями чтения',
    cap: 50,
    xp: 60,
    perYear: 6,
  },
  trial: {
    label: 'испытание',
    about: 'Разом и много — если выдержишь. Не выдержал: время, деньги и раны.',
    costs: 'риском',
    cap: 0,
    xp: 140,
    perYear: 12,
  },
  service: {
    label: 'служба',
    about: 'Рост за чужой счёт: служба учит тому, чем служишь, и платит сама.',
    costs: 'свободой: служащий не сам себе голова',
    cap: 0,
    xp: 22,
    perYear: 36,
  },
}

/** Испытания для тех навыков, где ранга не бывает (Пу1). */
export interface TrialDef {
  readonly id: string
  readonly label: string
  readonly about: string
  readonly skill: SkillId
  /** Какой уровень нужен, чтобы вообще выйти. */
  readonly needs: number
  readonly cost: number
  readonly days: number
  /** Сколько даёт, если выдержал. */
  readonly xp: number
  /** Чем кончается провал. */
  readonly fails: string
}

export const TRIALS: readonly TrialDef[] = [
  {
    id: 'tourney',
    label: 'турнир',
    about: 'Съехались все, кто держит копьё. Выигравшего знают по имени.',
    skill: 'heavyWeapons',
    needs: 20,
    cost: 300,
    days: 3,
    xp: 160,
    fails: 'рёбра и насмешки',
  },
  {
    id: 'hunt',
    label: 'большая охота',
    about: 'Зверь, которого не берут вдвоём. Неделя в лесу без дорог.',
    skill: 'survival',
    needs: 15,
    cost: 120,
    days: 7,
    xp: 150,
    fails: 'раны и пустые руки',
  },
  {
    id: 'dispute',
    label: 'учёный диспут',
    about: 'Перед магистрами и при свидетелях. Проигравшего помнят дольше.',
    skill: 'scholarship',
    needs: 20,
    cost: 200,
    days: 2,
    xp: 150,
    fails: 'позор перед теми, чьё мнение важно',
  },
  {
    id: 'muster',
    label: 'смотр войска',
    about: 'Собрать, построить и провести. Смотрят все, и все считают.',
    skill: 'command',
    needs: 18,
    cost: 400,
    days: 4,
    xp: 150,
    fails: 'разброд на глазах у собственных людей',
  },
  {
    id: 'bridge',
    label: 'мост в срок',
    about: 'Поставить переправу к назначенному дню. Река не ждёт.',
    skill: 'engineering',
    needs: 18,
    cost: 500,
    days: 10,
    xp: 150,
    fails: 'рухнувший пролёт и чужие убытки',
  },
  {
    id: 'fair',
    label: 'большая ярмарка',
    about: 'Весь товар за три дня и по своей цене. Или не по своей.',
    skill: 'trade',
    needs: 20,
    cost: 600,
    days: 3,
    xp: 150,
    fails: 'залежавшийся товар и пустой кошель',
  },
  {
    id: 'ride',
    label: 'дальний гон',
    about: 'Триста вёрст в трое суток, со сменой коней и без сна.',
    skill: 'riding',
    needs: 15,
    cost: 150,
    days: 3,
    xp: 140,
    fails: 'загнанный конь и разбитые ноги',
  },
  {
    id: 'vigil',
    label: 'бдение',
    about: 'Трое суток без сна и без слова. Проверяют не тело.',
    skill: 'fortitude',
    needs: 10,
    cost: 0,
    days: 3,
    xp: 140,
    fails: 'сорвался — и это видели',
  },
]

/** Чему учит служба (Пу6). */
export const SERVICE_TEACHES: Record<string, readonly SkillId[]> = {
  vassal: ['command', 'persuasion', 'riding'],
  mercenary: ['heavyWeapons', 'command', 'fortitude'],
  envoy: ['persuasion', 'scholarship', 'riding'],
  spy: ['sleight', 'persuasion', 'concentration'],
  steward: ['trade', 'scholarship', 'engineering'],
}

export const PATH_WORDS = {
  five: 'Путей пять, и они различаются ценой, а не скоростью.',
  two: 'У каждого навыка есть хотя бы два пути, и оба проходимы без другого.',
  bookCap: 'По книге дальше середины не уйдёшь: дальше нужен человек или дело.',
  teacherCap: 'Выше своего наставник не научит.',
  trialRisk: 'Испытание даёт разом и много — если выдержишь.',
  serviceFree: 'Служба учит тому, чем служишь, и платит сама.',
} as const
