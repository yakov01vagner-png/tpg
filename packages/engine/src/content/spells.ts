import { hours } from '../time'

/**
 * Заклинания — содержимое, а не код (этап 41, правило репозитория №6).
 *
 * Тридцать штук на десять ступеней навыка: логика их только читает. Заклинание
 * — это где его творят, что оно делает и чего стоит. Действие описано данными
 * (`effect`), и у каждого рода действия одна реализация в ядре: «урон» считает
 * бой, «исцеление» — раны, «тишь» — море. Новое заклинание — строчка здесь, а не
 * ветка в командах.
 *
 * Открываются они навыком, а не рангом (DESIGN.md, п.4): ранг — признание, сила
 * — умение. Самоучка творит то же, что и школьный, — просто его никто не зовёт
 * магистром.
 */
export type SpellFamily = 'fire' | 'curse' | 'ward' | 'heal' | 'sea' | 'sight' | 'craft'

export const SPELL_FAMILY_LABELS: Record<SpellFamily, string> = {
  fire: 'огонь',
  curse: 'порча',
  ward: 'оберег',
  heal: 'исцеление',
  sea: 'вода и ветер',
  sight: 'зрение',
  craft: 'ремесло',
}

/** Где заклинание творят. Бой — своим порядком, остальное — командой `cast`. */
export type SpellWhere = 'battle' | 'road' | 'sea' | 'camp' | 'site' | 'place' | 'anywhere'

export type SpellEffect =
  /** Урон чужому строю: доля потерь за круг, множится на силу круга. */
  | { readonly kind: 'damage'; readonly power: number }
  /** Страх: удар по духу чужих. */
  | { readonly kind: 'fear'; readonly power: number }
  /** Щит над своими: множитель обороны. */
  | { readonly kind: 'ward'; readonly power: number }
  /** Затянуть рану: на сколько суток короче. */
  | { readonly kind: 'heal'; readonly days: number }
  /** Тишь: снять с пути часы, которые прибавил шторм, и убрать шторм на этот переход. */
  | { readonly kind: 'calm'; readonly hours: number }
  /** Попутный ветер: путь короче на долю. */
  | { readonly kind: 'wind'; readonly share: number }
  /** Оберег на ночь: засада и мороз обходят стороной до утра. */
  | { readonly kind: 'guard'; readonly hours: number }
  /** Зрение: следующее «искать» удаётся наверняка. */
  | { readonly kind: 'insight' }
  /** Заделать течь: целость судна. */
  | { readonly kind: 'mend'; readonly condition: number }
  /** Благословить амбар: хлеба в месте прибавляется на долю суточной нужды. */
  | { readonly kind: 'bless'; readonly days: number }
  /** Отогнать мор: смерти в этом месте вполовину на срок. */
  | { readonly kind: 'cleanse'; readonly days: number }
  /** Свет: ночью идёшь как днём до утра. */
  | { readonly kind: 'light'; readonly hours: number }
  /**
   * Погода по зову (этап 60, А3): дождь правит год, оттепель распускает лёд,
   * буря запирает море. Держится считанные сутки — иначе погода перестаёт быть
   * погодой.
   */
  | { readonly kind: 'weather'; readonly weather: 'rain' | 'thaw' | 'gale'; readonly days: number }

export interface SpellDef {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly family: SpellFamily
  /** Ниже этого навыка «Магия» заклинание не даётся вовсе. */
  readonly requiredSkill: number
  readonly where: SpellWhere
  readonly effect: SpellEffect
  /** Чего стоит: усталость, время и истощение круга в бою. */
  readonly fatigue: number
  readonly minutes: number
  readonly strain: number
}

const battle = (
  id: string,
  label: string,
  description: string,
  family: 'fire' | 'curse' | 'ward',
  requiredSkill: number,
  power: number,
  strain: number,
): SpellDef => ({
  id,
  label,
  description,
  family,
  requiredSkill,
  where: 'battle',
  effect:
    family === 'fire'
      ? { kind: 'damage', power }
      : family === 'curse'
        ? { kind: 'fear', power }
        : { kind: 'ward', power },
  fatigue: 0,
  minutes: 0,
  strain,
})

export const SPELLS: readonly SpellDef[] = [
  // --- огонь: круг бьёт по строю ------------------------------------------------
  battle(
    'spark',
    'Искра',
    'Слепящий сноп искр в лицо первому ряду. Пугает лошадей, не людей.',
    'fire',
    5,
    0.5,
    10,
  ),
  battle(
    'fireball',
    'Огненный шар',
    'Тот самый шар: горит строй, горит трава, горит всё.',
    'fire',
    25,
    1,
    14,
  ),
  battle(
    'firestorm',
    'Огненная буря',
    'Не шар, а ливень. Круг после неё падает с ног.',
    'fire',
    50,
    1.7,
    20,
  ),
  battle(
    'sunlance',
    'Солнечное копьё',
    'Один удар, который видно из соседней провинции.',
    'fire',
    82,
    2.6,
    26,
  ),
  // --- порча: страх и слабость ---------------------------------------------------
  battle(
    'whisper',
    'Шёпот',
    'Каждому в чужом строю кажется, что зовут его. По имени.',
    'curse',
    8,
    0.5,
    6,
  ),
  battle(
    'curse',
    'Порча',
    'Над чужим строем поднимается вой, и первые ряды пятятся.',
    'curse',
    25,
    1,
    9,
  ),
  battle(
    'dread',
    'Ужас',
    'Никто не бежит: все просто не могут сделать шаг вперёд.',
    'curse',
    55,
    1.8,
    14,
  ),
  battle(
    'nightfall',
    'Ночь среди дня',
    'Тьма на поле, и в ней слышно, как чужие бросают копья.',
    'curse',
    88,
    2.7,
    20,
  ),
  // --- оберег: щит над своими -----------------------------------------------------
  battle('shield', 'Щит', 'Стрелы ложатся короче, чем должны бы.', 'ward', 6, 0.5, 4),
  battle(
    'ward',
    'Оберег строя',
    'Над своими держится незримое: удары приходят вполсилы.',
    'ward',
    25,
    1,
    6,
  ),
  battle(
    'bulwark',
    'Стена',
    'Строй, о который ломаются. Круг держит её, пока стоит сам.',
    'ward',
    52,
    1.7,
    10,
  ),
  battle(
    'aegis',
    'Эгида',
    'Ни одна стрела и ни один клинок: до тех пор, пока хватает сил.',
    'ward',
    85,
    2.5,
    15,
  ),
  // --- исцеление --------------------------------------------------------------------
  {
    id: 'staunch',
    label: 'Остановить кровь',
    description: 'Простейшее, что умеет маг. Рана заживёт на пару дней раньше.',
    family: 'heal',
    requiredSkill: 10,
    where: 'anywhere',
    effect: { kind: 'heal', days: 2 },
    fatigue: 15,
    minutes: 30,
    strain: 0,
  },
  {
    id: 'knit',
    label: 'Сращивание',
    description: 'Кость и мясо сходятся под рукой. Больно, но быстро.',
    family: 'heal',
    requiredSkill: 35,
    where: 'anywhere',
    effect: { kind: 'heal', days: 6 },
    fatigue: 30,
    minutes: 60,
    strain: 0,
  },
  {
    id: 'restore',
    label: 'Восстановление',
    description: 'Рана, от которой лежат месяц, затягивается за ночь.',
    family: 'heal',
    requiredSkill: 65,
    where: 'anywhere',
    effect: { kind: 'heal', days: 20 },
    fatigue: 50,
    minutes: hours(4),
    strain: 0,
  },
  {
    id: 'cleanse',
    label: 'Отвести мор',
    description: 'Заговор над колодцем и над воротами. Мор не уходит, но берёт вдвое меньше.',
    family: 'heal',
    requiredSkill: 45,
    where: 'place',
    effect: { kind: 'cleanse', days: 20 },
    fatigue: 45,
    minutes: hours(6),
    strain: 0,
  },
  // --- вода и ветер ----------------------------------------------------------------
  {
    id: 'stillwater',
    label: 'Тишь',
    description: 'Волна ложится. Шторм, который отнёс судно, отпускает его.',
    family: 'sea',
    requiredSkill: 20,
    where: 'sea',
    effect: { kind: 'calm', hours: 6 },
    fatigue: 25,
    minutes: 60,
    strain: 0,
  },
  {
    id: 'fairwind',
    label: 'Попутный ветер',
    description: 'Парус наполняется тем ветром, которого нет. До берега — на треть ближе.',
    family: 'sea',
    requiredSkill: 40,
    where: 'sea',
    effect: { kind: 'wind', share: 0.3 },
    fatigue: 35,
    minutes: 60,
    strain: 0,
  },
  {
    id: 'seal',
    label: 'Заделать течь',
    description: 'Доски сходятся, смола твердеет. Не верфь, но до гавани дотянет.',
    family: 'sea',
    requiredSkill: 30,
    where: 'sea',
    effect: { kind: 'mend', condition: 0.2 },
    fatigue: 30,
    minutes: 90,
    strain: 0,
  },
  {
    id: 'stormcall',
    label: 'Штиль на весь переход',
    description: 'Ни шторма, ни чужого паруса до самого берега: море спит.',
    family: 'sea',
    requiredSkill: 70,
    where: 'sea',
    effect: { kind: 'calm', hours: 24 },
    fatigue: 60,
    minutes: hours(2),
    strain: 0,
  },
  // --- оберег вне боя ------------------------------------------------------------------
  {
    id: 'hearth',
    label: 'Тёплый круг',
    description: 'Костёр греет, как печь, и мороз обходит стороной.',
    family: 'ward',
    requiredSkill: 12,
    where: 'camp',
    effect: { kind: 'guard', hours: 12 },
    fatigue: 15,
    minutes: 20,
    strain: 0,
  },
  {
    id: 'watchfire',
    label: 'Сторожевой огонь',
    description: 'Огонь, который видит. Ночью к лагерю не подойти незамеченным.',
    family: 'ward',
    requiredSkill: 30,
    where: 'camp',
    effect: { kind: 'guard', hours: 12 },
    fatigue: 25,
    minutes: 30,
    strain: 0,
  },
  {
    id: 'lantern',
    label: 'Фонарь без огня',
    description: 'Свет над дорогой до утра: ночью идёшь как днём.',
    family: 'sight',
    requiredSkill: 15,
    where: 'road',
    effect: { kind: 'light', hours: 8 },
    fatigue: 15,
    minutes: 15,
    strain: 0,
  },
  {
    id: 'hidepath',
    label: 'Отвод глаз',
    description: 'Дорога есть, а тебя на ней нет. Засада ждёт кого-то другого.',
    family: 'ward',
    requiredSkill: 42,
    where: 'road',
    effect: { kind: 'guard', hours: 10 },
    fatigue: 35,
    minutes: 30,
    strain: 0,
  },
  // --- зрение -------------------------------------------------------------------------
  {
    id: 'seek',
    label: 'Взгляд под землю',
    description: 'Что лежит в кургане, видно сквозь насыпь. Осталось выкопать.',
    family: 'sight',
    requiredSkill: 22,
    where: 'site',
    effect: { kind: 'insight' },
    fatigue: 25,
    minutes: 45,
    strain: 0,
  },
  {
    id: 'truesight',
    label: 'Истинное зрение',
    description: 'Видно то, что спрятано нарочно. Ничто в этом месте не укроется.',
    family: 'sight',
    requiredSkill: 58,
    where: 'site',
    effect: { kind: 'insight' },
    fatigue: 40,
    minutes: 60,
    strain: 0,
  },
  // --- ремесло: магия в хозяйстве -----------------------------------------------------
  {
    id: 'bless',
    label: 'Благословить амбар',
    description: 'Мыши уходят, зерно не сыреет. Хлеба в месте прибавляется на день.',
    family: 'craft',
    requiredSkill: 18,
    where: 'place',
    effect: { kind: 'bless', days: 1 },
    fatigue: 25,
    minutes: hours(2),
    strain: 0,
  },
  {
    id: 'harvestcharm',
    label: 'Заговор на урожай',
    description: 'Поле родит, как в добрый год. Одно поле — и то не навсегда.',
    family: 'craft',
    requiredSkill: 48,
    where: 'place',
    effect: { kind: 'bless', days: 4 },
    fatigue: 45,
    minutes: hours(6),
    strain: 0,
  },
  {
    id: 'plenty',
    label: 'Изобилие',
    description: 'Амбары полны, как после жатвы. Архимаги это умеют — и берут за это города.',
    family: 'craft',
    requiredSkill: 78,
    where: 'place',
    effect: { kind: 'bless', days: 12 },
    fatigue: 70,
    minutes: hours(10),
    strain: 0,
  },
  // --- погода: её зовут, и она приходит (этап 60, А3) -----------------------
  {
    id: 'rainsong',
    label: 'Зов дождя',
    description:
      'Тёплый дождь на сухие поля округи. Год выйдет лучше, чем шёл, — и об этом будут помнить.',
    family: 'sea',
    requiredSkill: 34,
    where: 'place',
    effect: { kind: 'weather', weather: 'rain', days: 6 },
    fatigue: 40,
    minutes: hours(4),
    strain: 0,
  },
  {
    id: 'thawword',
    label: 'Слово оттепели',
    description: 'Лёд трещит и расходится: и в гавани, и на дороге. Зима отступает на неделю.',
    family: 'sea',
    requiredSkill: 52,
    where: 'place',
    effect: { kind: 'weather', weather: 'thaw', days: 8 },
    fatigue: 55,
    minutes: hours(5),
    strain: 0,
  },
  {
    id: 'galecall',
    label: 'Зов бури',
    description:
      'Море встаёт стеной. Чужие суда не выйдут из этой гавани — и твои тоже, пока не ляжет.',
    family: 'sea',
    requiredSkill: 66,
    where: 'place',
    effect: { kind: 'weather', weather: 'gale', days: 5 },
    fatigue: 60,
    minutes: hours(6),
    strain: 0,
  },
  {
    id: 'mendship',
    label: 'Просмолить словом',
    description: 'Судно у причала выходит из воды новым. Верфь остаётся без работы.',
    family: 'craft',
    requiredSkill: 60,
    where: 'place',
    effect: { kind: 'mend', condition: 0.6 },
    fatigue: 50,
    minutes: hours(4),
    strain: 0,
  },
]

export const SPELLS_BY_ID: Readonly<Record<string, SpellDef>> = Object.fromEntries(
  SPELLS.map((spell) => [spell.id, spell]),
)
