/**
 * Бой, который хочется смотреть (этап 171) — содержимое.
 *
 * Бой считался честно: строй, приказы, место, усталость, ветераны. Смотреть его
 * было нечем — раунды шли ровной чередой, и ни один не отличался от другого.
 * У боя нет хода: не видно, когда сошлись, когда сломалось и когда началась
 * погоня. Здесь лежит то, из чего складывается ход боя и погода над ним.
 */

export const PHASES = ['array', 'clash', 'break', 'chase'] as const
export type PhaseId = (typeof PHASES)[number]

export const PHASE_DEFS: Record<
  PhaseId,
  {
    readonly label: string
    readonly about: string
    /** Во сколько раз в эту пору весит рукопашная. */
    readonly melee: number
    /** И стрельба. */
    readonly shot: number
    /** Во сколько раз тяжелее потери дрогнувшей стороне. */
    readonly onBroken: number
  }
> = {
  array: {
    label: 'строй',
    about: 'Сходятся. Работают только стрелки, и всякий шаг слышно.',
    melee: 0.45,
    shot: 1.35,
    onBroken: 1,
  },
  clash: {
    label: 'сшибка',
    about: 'Строй в строй: здесь решают число, место и то, кто устал раньше.',
    melee: 1,
    shot: 1,
    onBroken: 1,
  },
  break: {
    label: 'перелом',
    about: 'Одна сторона поплыла. Следующий раунд решает, бой это ещё или уже бойня.',
    melee: 1.15,
    shot: 0.9,
    onBroken: 1.4,
  },
  chase: {
    label: 'погоня',
    about: 'Бегущих бьют в спину: здесь гибнет больше, чем в самой сшибке.',
    melee: 1,
    shot: 0.6,
    onBroken: 2,
  },
}

export const WEATHERS = ['clear', 'rain', 'mud', 'heat', 'snow', 'fog'] as const
export type WeatherId = (typeof WEATHERS)[number]

export const WEATHER_DEFS: Record<
  WeatherId,
  {
    readonly label: string
    readonly about: string
    /** Что делает с конницей. */
    readonly horse: number
    /** Что делает со стрельбой (через видимость). */
    readonly sight: number
    /** Насколько быстрее выматывает. */
    readonly toil: number
  }
> = {
  clear: { label: 'ясно', about: 'Видно далеко, земля держит.', horse: 1, sight: 1, toil: 1 },
  rain: {
    label: 'дождь',
    about: 'Тетива мокнет, щиты тяжелеют.',
    horse: 0.9,
    sight: 0.75,
    toil: 1.15,
  },
  mud: {
    label: 'распутица',
    about: 'Конный вязнет, пеший идёт по колено.',
    horse: 0.6,
    sight: 0.95,
    toil: 1.35,
  },
  heat: {
    label: 'зной',
    about: 'В броне не надышаться: кто в железе, тот сдаёт первым.',
    horse: 0.95,
    sight: 1,
    toil: 1.4,
  },
  snow: {
    label: 'метель',
    about: 'Стрелы сносит, строй теряется.',
    horse: 0.75,
    sight: 0.5,
    toil: 1.3,
  },
  fog: {
    label: 'туман',
    about: 'Видно на два десятка шагов: стрелок слеп, обход прост.',
    horse: 0.9,
    sight: 0.4,
    toil: 1.05,
  },
}

export const MELEE = {
  /** Ниже какого духа сторона считается дрогнувшей. */
  breaks: 38,
  /** Сколько раундов сходятся, прежде чем сшибка станет настоящей. */
  arrayRounds: 1,
  /**
   * Во сколько весит удар в пору сближения.
   *
   * Бросившийся вперёд сам закрывает расстояние: ему пора боя почти не мешает,
   * а вот тот, кто ждёт в строю, в эту пору и правда почти не бьёт.
   */
  chargeCloses: 0.85,
  /** Насколько погода зависит от времени года: доля зимних погод зимой. */
  winterShare: 0.7,
} as const

export const MELEE_WORDS = {
  turned: 'Здесь бой и переломился.',
  held: 'Строй выстоял: ни один раунд не дал перелома.',
  chase: 'Дальше была не битва, а погоня.',
  why: 'Почему вышло так',
} as const
