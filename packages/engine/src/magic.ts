/**
 * Лестница магических рангов (п.4 дизайн-документа).
 *
 * Ранг — не подпись к шкале навыка, а социальный факт: навык открывает право
 * претендовать, но сам ранг присваивается извне (экзамен, признание мастера,
 * подтверждённое дело). Поэтому в состоянии персонажа хранятся две разные вещи:
 * уровень навыка magic и признанный ранг.
 */
export const MAGIC_RANK_IDS = [
  'neophyte',
  'adept',
  'student',
  'journeyman',
  'master',
  'grandMaster',
  'magister',
  'grandMagister',
  'archmage',
  'archon',
] as const

export type MagicRankId = (typeof MAGIC_RANK_IDS)[number]

export interface MagicRankDef {
  readonly id: MagicRankId
  readonly label: string
  /** Уровень навыка «Магия», ниже которого ранг не присваивают. */
  readonly requiredSkill: number
  /** Порядковый номер в лестнице, 1 — самый младший. */
  readonly tier: number
}

const LADDER: ReadonlyArray<readonly [MagicRankId, string, number]> = [
  ['neophyte', 'Неофит', 5],
  ['adept', 'Адепт', 15],
  ['student', 'Ученик', 25],
  ['journeyman', 'Подмастерье', 35],
  ['master', 'Мастер', 50],
  ['grandMaster', 'Гранд-мастер', 62],
  ['magister', 'Магистр', 72],
  ['grandMagister', 'Гранд-магистр', 82],
  ['archmage', 'Архимаг', 92],
  ['archon', 'Архон магии', 100],
]

export const MAGIC_RANKS: Record<MagicRankId, MagicRankDef> = Object.fromEntries(
  LADDER.map(([id, label, requiredSkill], index) => [
    id,
    { id, label, requiredSkill, tier: index + 1 },
  ]),
) as Record<MagicRankId, MagicRankDef>

export function rankTier(rank: MagicRankId | null): number {
  return rank === null ? 0 : MAGIC_RANKS[rank].tier
}

/** Следующий ранг после текущего, или null если выше некуда. */
export function nextRank(rank: MagicRankId | null): MagicRankId | null {
  const index = rankTier(rank)
  return MAGIC_RANK_IDS[index] ?? null
}

/**
 * Ранг, на который навык уже даёт право претендовать.
 * Может быть заметно выше признанного — это и есть самоучка из п.4.
 */
export function eligibleRank(magicSkill: number): MagicRankId | null {
  let result: MagicRankId | null = null
  for (const id of MAGIC_RANK_IDS) {
    if (magicSkill >= MAGIC_RANKS[id].requiredSkill) result = id
    else break
  }
  return result
}

/** Насколько сила обгоняет титул — на столько ступеней лестницы. */
export function unrecognizedGap(magicSkill: number, recognized: MagicRankId | null): number {
  return rankTier(eligibleRank(magicSkill)) - rankTier(recognized)
}
