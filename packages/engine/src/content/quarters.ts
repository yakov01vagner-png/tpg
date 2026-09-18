/**
 * Кварталы (этап 45).
 *
 * Большое место — не одна карточка: у города есть рынок, ремесленные ряды,
 * храм, школа, замок, пристань и ворота, и в каждом своё. Квартал — не место в
 * скелете мира, а часть места: он выводится из того, что в городе есть
 * (`quarter.ts`), и в состоянии лежит только то, где стоит герой.
 *
 * Что где делают, записано здесь данными: работа и поручения — на рынке,
 * наставник — в школе, лорд — в замке, наём — у ворот, судно — на пристани.
 */
export type QuarterId = 'gate' | 'market' | 'craft' | 'temple' | 'school' | 'castle' | 'harbour'

/** Чем занимаются в квартале. Команда ядра относится к одному из этих дел. */
export type Activity =
  | 'work'
  | 'learn'
  | 'trade'
  | 'craft'
  | 'hire'
  | 'lord'
  | 'sea'
  | 'order:church'
  | 'order:guild'
  | 'order:order'

export interface QuarterDef {
  readonly id: QuarterId
  readonly label: string
  /** Что здесь происходит — для карточки квартала. */
  readonly description: string
  readonly hosts: readonly Activity[]
}

export const QUARTERS: Readonly<Record<QuarterId, QuarterDef>> = {
  gate: {
    id: 'gate',
    label: 'У ворот',
    description:
      'Постоялый двор, конюшни и те, кто ищет, к кому пристать. Сюда приходят и отсюда уходят.',
    hosts: ['hire'],
  },
  market: {
    id: 'market',
    label: 'Рынок',
    description:
      'Лавки, весы и крикуны. Здесь платят за работу, торгуют и просят привезти чего не хватает.',
    hosts: ['work', 'trade', 'order:guild'],
  },
  craft: {
    id: 'craft',
    label: 'Ремесленные ряды',
    description: 'Кузни, дубильни и мастерские: здесь чинят, куют и берут в подмастерья.',
    hosts: ['craft'],
  },
  temple: {
    id: 'temple',
    label: 'Храм',
    description: 'Колокола, свечи и братия. Здесь принимают в церковные ордена и отпевают.',
    hosts: ['order:church'],
  },
  school: {
    id: 'school',
    label: 'Школа',
    description: 'Наставники, книги и испытания. Кто хочет выучиться, идёт сюда.',
    hosts: ['learn'],
  },
  castle: {
    id: 'castle',
    label: 'Замок',
    description: 'Двор лорда: здесь просят землю, присягают, сватаются и судят.',
    hosts: ['lord', 'order:order'],
  },
  harbour: {
    id: 'harbour',
    label: 'Пристань',
    description: 'Причалы, шкиперы и смола. Отсюда уходят морем и здесь покупают судно.',
    hosts: ['sea'],
  },
}

export const QUARTER_IDS: readonly QuarterId[] = [
  'gate',
  'market',
  'craft',
  'temple',
  'school',
  'castle',
  'harbour',
]

/**
 * С какого населения у места появляются кварталы.
 *
 * Деревня остаётся деревней: место мельче этого — одна карточка, и всё в нём
 * под рукой. Городок в две с половиной тысячи уже не обойдёшь за минуту.
 */
export const QUARTER_POPULATION = 2500
