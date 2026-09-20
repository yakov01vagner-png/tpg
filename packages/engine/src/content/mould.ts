import type { SkillId } from '../skills'

/**
 * Склад и выбор (этап 126) — содержимое.
 *
 * Классов в игре нет и не будет: склад — это не то, что выбрали на старте, а
 * то, что вышло из выборов. Здесь он получает имя, цену и голос: мир судит о
 * тебе по складу, а всё сразу не выходит ни у кого.
 */

export const MOULDS = ['warrior', 'scholar', 'merchant', 'ruler', 'shadow'] as const
export type MouldId = (typeof MOULDS)[number]

export const MOULD_DEFS: Record<
  MouldId,
  {
    readonly label: string
    readonly about: string
    /** По каким навыкам он узнаётся. */
    readonly skills: readonly SkillId[]
    /** Чего у него обыкновенно нет. */
    readonly lacks: readonly SkillId[]
    /** Чем он берёт там, где другие берут иначе. */
    readonly takes: string
    /** Как его видит мир. */
    readonly seen: string
  }
> = {
  warrior: {
    label: 'воин',
    about: 'Берёт копьём то, что другие берут словом или серебром.',
    skills: ['heavyWeapons', 'command', 'fortitude', 'riding'],
    lacks: ['scholarship', 'trade', 'sleight'],
    takes: 'город — приступом, спор — поединком, верность — страхом и славой',
    seen: 'Его зовут на войну и не зовут в советники.',
  },
  scholar: {
    label: 'книжник',
    about: 'Знает то, чего не знают другие, и видит то, чего не видят.',
    skills: ['scholarship', 'engineering', 'concentration', 'healing'],
    lacks: ['heavyWeapons', 'command', 'athletics'],
    takes: 'город — подкопом и машиной, спор — доводом, чужую ложь — сличением',
    seen: 'Ему верят в счёте и не верят в поле.',
  },
  merchant: {
    label: 'купец',
    about: 'У него есть то, чего нет у прочих: деньги в нужный день.',
    skills: ['trade', 'persuasion', 'scholarship', 'riding'],
    lacks: ['heavyWeapons', 'fortitude', 'magic'],
    takes: 'город — подкупом ворот, войну — наймом, союз — приданым',
    seen: 'С ним считаются, пока у него есть чем платить.',
  },
  ruler: {
    label: 'государь',
    about: 'Не лучший ни в чём, но его слушают — и этого довольно.',
    skills: ['persuasion', 'command', 'scholarship', 'trade'],
    lacks: ['sleight', 'magic', 'archery'],
    takes: 'город — договором и правом, войну — чужими руками, мир — своим именем',
    seen: 'Его зовут мирить и его боятся обидеть.',
  },
  shadow: {
    label: 'тайный человек',
    about: 'Его не видно, и это его главное оружие.',
    skills: ['sleight', 'concentration', 'persuasion', 'lightWeapons'],
    lacks: ['command', 'heavyWeapons', 'engineering'],
    takes: 'город — изменой изнутри, войну — чужими тайнами, врага — его же людьми',
    seen: 'Его не зовут никуда и опасаются все.',
  },
}

export const MOULD = {
  /** Насколько сильный склад должен опережать второй, чтобы считаться складом. */
  clear: 1.2,
  /** Сколько стоит переучивание за уровень. */
  retrainSilver: 90,
  /** И сколько суток. */
  retrainDays: 12,
  /** Какую долю уровня теряешь при переучивании. */
  retrainLoses: 0.5,
} as const

export const MOULD_WORDS = {
  notClass: 'Склад — не класс: это то, что вышло из твоих выборов.',
  pays: 'Всё сразу не выходит: за каждый склад платишь тем, чего в нём нет.',
  seen: 'Мир судит по складу: кого зовут, кому верят, чего ждут.',
  change: 'Переучиться можно, и это стоит лет и денег, а не кнопки.',
  any: 'Где нельзя силой, там можно словом или серебром: игра проходима любым складом.',
  none: 'Складу ещё не из чего сложиться: ты ничем не выделяешься.',
} as const
