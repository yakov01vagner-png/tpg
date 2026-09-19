/**
 * Наследование своего (этап 93) — содержимое.
 *
 * Наследник получал имя, землю и вассалов целиком: держава переживала государя
 * без единой трещины. Оттого власть ничего не стоила — её нельзя было потерять
 * иначе как в бою. Здесь у наследства появляется закон, цена и родня с правами.
 */

/** Закон наследования (Сл2). */
export const LAWS = ['split', 'eldest', 'unity'] as const
export type LawId = (typeof LAWS)[number]

export const LAW_DEFS: Record<
  LawId,
  {
    readonly label: string
    readonly about: string
    /** Какая доля земли достаётся наследнику. */
    readonly heirShare: number
    /** Насколько закон нравится знати: своим вассалам. */
    readonly nobles: number
    /** Насколько он злит обойдённую родню. */
    readonly envy: number
  }
> = {
  split: {
    label: 'раздел',
    about: 'Каждому сыну по уделу: род доволен, держава — нет.',
    heirShare: 0.5,
    nobles: 6,
    envy: 0,
  },
  eldest: {
    label: 'первородство',
    about: 'Всё старшему: держава цела, а младшие помнят, что им не досталось.',
    heirShare: 0.85,
    nobles: 0,
    envy: 12,
  },
  unity: {
    label: 'единое наследство',
    about: 'Неделимо и навсегда: закон, который держится только сильной рукой.',
    heirShare: 1,
    nobles: -8,
    envy: 18,
  },
}

/** Каков регент при малолетнем (Сл3). */
export const REGENTS = ['faithful', 'grasping', 'ambitious'] as const
export type RegentKind = (typeof REGENTS)[number]

export const REGENT_DEFS: Record<
  RegentKind,
  {
    readonly label: string
    readonly about: string
    /** Какую долю дохода он берёт себе. */
    readonly skim: number
    /** Насколько он роняет верность вассалов за год. */
    readonly loyalty: number
    /** Вероятность, что он попытается остаться у власти. */
    readonly seizes: number
  }
> = {
  faithful: {
    label: 'верный',
    about: 'Держит землю для ребёнка и отдаёт её, когда тот подрастёт.',
    skim: 0.05,
    loyalty: 0,
    seizes: 0,
  },
  grasping: {
    label: 'корыстный',
    about: 'Правит честно ровно настолько, насколько это ему выгодно.',
    skim: 0.25,
    loyalty: -4,
    seizes: 0.15,
  },
  ambitious: {
    label: 'честолюбивый',
    about: 'Считает, что удержит землю лучше ребёнка. Возможно, он прав.',
    skim: 0.15,
    loyalty: -8,
    seizes: 0.45,
  },
}

export const INHERIT = {
  /** До скольких лет наследник считается малолетним. */
  minorAge: 16,
  /** Сколько прав даёт ветви родства близость к престолу. */
  branchClaim: 30,
  /** Выше этого счёта спор о наследстве становится смутой. */
  strifeLine: 45,
  /** Какую долю вассалов уводит соперник в смуте. */
  strifeShare: 0.4,
  /** Насколько смута роняет верность всем остальным. */
  strifeLoyalty: -12,
  /** Насколько память мира о тебе слабеет со сменой колена. */
  fatherShare: 0.5,
} as const

export const INHERIT_WORDS = {
  whole: 'Держава перешла целиком: закон устоял.',
  split: 'Держава поделена: у рода теперь несколько государей.',
  regency: 'При малолетнем правит регент.',
  strife: 'Наследство оспорено: своя знать разошлась по сторонам.',
  ended: 'Род пресёкся, и держава разошлась по чужим рукам.',
} as const
