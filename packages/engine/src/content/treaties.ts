/**
 * Договоры (этап 80) — содержимое.
 *
 * Посольство (этап 79) кончалось согласием или отказом — и на этом всё: союз
 * появлялся в списке, дань в другом списке, а прохода не было нигде. Договор —
 * это бумага: у него есть вид, срок, цена, свидетель и то, о чём договорились
 * не вслух.
 */

export const TREATY_KINDS = [
  'peace',
  'alliance',
  'tribute',
  'passage',
  'trade',
  'neutrality',
  'handover',
] as const
export type TreatyKind = (typeof TREATY_KINDS)[number]

export interface TreatyDef {
  readonly id: TreatyKind
  readonly label: string
  readonly about: string
  /** На сколько суток заключают по обычаю. Ноль — бессрочно. */
  readonly days: number
  /** Чего стоит его порвать: отношение с другой стороной. */
  readonly breach: number
  /** И сколько теряешь в глазах всех прочих: слово держат или не держат. */
  readonly shame: number
  /** Бывают ли у такого тайные статьи. */
  readonly secret: boolean
}

export const TREATY_DEFS: Record<TreatyKind, TreatyDef> = {
  peace: {
    id: 'peace',
    label: 'мир',
    about: 'Война кончена. Пока бумага жива, воевать нельзя ни тебе, ни им.',
    days: 1095,
    breach: -45,
    shame: -12,
    secret: false,
  },
  alliance: {
    id: 'alliance',
    label: 'союз',
    about: 'Стоять вместе. Зовут редко, помнят долго, а отказ от зова хуже разрыва.',
    days: 0,
    breach: -35,
    shame: -14,
    secret: true,
  },
  tribute: {
    id: 'tribute',
    label: 'дань',
    about: 'Одна сторона платит другой изо дня в день, пока не выйдет срок.',
    days: 720,
    breach: -30,
    shame: -8,
    secret: false,
  },
  passage: {
    id: 'passage',
    label: 'проход',
    about: 'Право провести войско и обоз через чужую землю, не воюя за каждый брод.',
    days: 365,
    breach: -20,
    shame: -6,
    secret: true,
  },
  trade: {
    id: 'trade',
    label: 'торговое согласие',
    about: 'Пошлины пополам, обозы под общей защитой: обоим выгодно, пока обоим выгодно.',
    days: 730,
    breach: -18,
    shame: -10,
    secret: false,
  },
  neutrality: {
    id: 'neutrality',
    label: 'невмешательство',
    about: 'Не помогать врагам друг друга. Договор для тех, кто не готов к союзу.',
    days: 540,
    breach: -25,
    shame: -9,
    secret: true,
  },
  handover: {
    id: 'handover',
    label: 'выдача',
    about: 'Выдать того, кого требуют: мятежника, самозванца, убийцу. Кончается исполнением.',
    days: 90,
    breach: -22,
    shame: -11,
    secret: true,
  },
}

/** Тайные статьи (Г5): о чём договариваются не вслух. */
export const SECRETS = ['partition', 'standAside', 'subsidy', 'marriageLater'] as const
export type SecretId = (typeof SECRETS)[number]

export const SECRET_DEFS: Record<
  SecretId,
  { readonly label: string; readonly about: string; readonly angers: number }
> = {
  partition: {
    label: 'раздел третьей земли',
    about: 'Когда падёт третий, его землю делят поровну. Ему об этом знать не надо.',
    angers: -45,
  },
  standAside: {
    label: 'не вмешиваться',
    about: 'Если один пойдёт войной, другой не двинется — что бы он ни обещал прочим.',
    angers: -30,
  },
  subsidy: {
    label: 'тайные деньги',
    about: 'Одна сторона платит другой, и об этом не пишут в грамоте.',
    angers: -20,
  },
  marriageLater: {
    label: 'обещанный брак',
    about: 'Дети ещё малы, но их судьба уже решена. Тому, кого не спросили, будет обидно.',
    angers: -25,
  },
}

/** Насколько вероятно за сутки, что тайное станет явным. */
export const SECRET_LEAK = 0.0015

/** Что берёт себе гарант за свидетельство (Г4). */
export const GUARANTOR_FEE = 0.12

/** И насколько крепче договор, у которого есть свидетель. */
export const GUARANTOR_HOLD = 1.5
