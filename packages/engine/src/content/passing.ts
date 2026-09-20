/**
 * Смерть (этап 190) — содержимое.
 *
 * Смерть в игре есть с 0.5: герой умирает, наследник принимает дела. Она
 * приходит как смена цифр — без причины, без последнего дня, без похорон и без
 * того, чтобы мир это заметил. Здесь лежит то, из чего смерть делается
 * событием.
 */

export const DEATHS = ['wound', 'sickness', 'age', 'blade', 'fall'] as const
export type DeathId = (typeof DEATHS)[number]

export const DEATH_DEFS: Record<
  DeathId,
  { readonly label: string; readonly says: string; readonly quick: boolean }
> = {
  wound: {
    label: 'от раны',
    says: 'Рана, которую считали пустяковой, открылась и не закрылась.',
    quick: false,
  },
  sickness: {
    label: 'от хвори',
    says: 'Горячка взяла своё за девять дней. Лекарь был, и он не помог.',
    quick: false,
  },
  age: {
    label: 'от старости',
    says: 'Просто не проснулся. В его годы это и есть срок.',
    quick: false,
  },
  blade: { label: 'от железа', says: 'В бою и от руки, которую он видел.', quick: true },
  fall: {
    label: 'от случая',
    says: 'Конь, лёд, лестница — то, чего никто не считает опасным.',
    quick: true,
  },
}

export const BURIAL_RITES = ['great', 'plain', 'quiet', 'none'] as const
export type RiteId = (typeof BURIAL_RITES)[number]

export const BURIAL_RITE_DEFS: Record<
  RiteId,
  { readonly label: string; readonly costs: number; readonly says: string }
> = {
  great: {
    label: 'великие похороны',
    costs: 4000,
    says: 'Съехались короны и владетели. О таком помнят поколениями.',
  },
  plain: {
    label: 'похороны по чину',
    costs: 900,
    says: 'Отпели, помянули, разъехались. Как у всех.',
  },
  quiet: { label: 'тихо', costs: 120, says: 'Свои да соседи. Дом помнит, прочие — нет.' },
  none: { label: 'без обряда', costs: 0, says: 'Некому и не на что. Это тоже запоминают.' },
}

export const PASSING = {
  /** Сколько суток длится последний день: столько остаётся на дела. */
  lastDays: 3,
  /** Насколько великие похороны прибавляют памяти о роде. */
  greatRemembers: 20,
  /** И отсутствие обряда отнимает. */
  noneShames: -15,
  /** С какого возраста смерть считается сроком, а не бедой. */
  timely: 60,
} as const

export const PASSING_WORDS = {
  came: 'Смерть пришла не ниоткуда: у неё есть причина, и её называют.',
  last: 'Последние дни: успеть можно немногое, и это немногое решает.',
  rites: 'Как похоронили — так и запомнили.',
  passes: 'Переход: держава меняет хозяина, и это видно всем.',
  others: 'Чужая смерть замечается тем же счётом, что своя.',
} as const
