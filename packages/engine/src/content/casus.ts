/**
 * Война с причиной (этап 65) — содержимое.
 *
 * До 0.6 у войны была строка-причина, выбранная кубиком из шести: «спор о вере»
 * там, где ни у кого нет веры, и «оскорбление посла» там, где послов не бывает.
 * Здесь повод становится вещью: он выводится из мира, его видно, и он решает,
 * чем война кончится.
 */
export const CASUS_KINDS = ['march', 'raids', 'tribute', 'inherit', 'faith', 'ambition'] as const
export type CasusKind = (typeof CASUS_KINDS)[number]

export interface CasusDef {
  readonly kind: CasusKind
  readonly label: string
  /** Как об этом говорят, когда объявляют. */
  readonly says: string
  /**
   * Чего требуют по такому поводу, когда побеждают: этим повод и отличается от
   * строки в журнале.
   */
  readonly wants: readonly PeaceTermKind[]
  /** Насколько охотно по такому поводу мирятся. */
  readonly stubborn: number
}

/** Условия мира (Т3). */
export const PEACE_TERM_KINDS = ['land', 'tribute', 'marriage', 'handover', 'nothing'] as const
export type PeaceTermKind = (typeof PEACE_TERM_KINDS)[number]

export const PEACE_TERM_DEFS: Record<
  PeaceTermKind,
  { readonly label: string; readonly about: string }
> = {
  land: {
    label: 'земля',
    about: 'Спорная провинция переходит победителю. Это помнят дольше всего прочего.',
  },
  tribute: {
    label: 'дань',
    about: 'Проигравший платит, пока не выйдет срок. Дешевле земли и унизительнее её.',
  },
  marriage: {
    label: 'брак',
    about: 'Дом за дом: мир, у которого есть залог. Держится, пока живы оба.',
  },
  handover: {
    label: 'выдача',
    about: 'Выдать того, из-за кого всё началось. Дешевле всего и подлее всего.',
  },
  nothing: { label: 'ничего', about: 'Просто мир: обе стороны выдохлись и разошлись.' },
}

export const CASUS: readonly CasusDef[] = [
  {
    kind: 'march',
    label: 'спорная марка',
    says: 'Эта земля наша по праву: её держат чужие, и держат недавно.',
    wants: ['land', 'tribute'],
    stubborn: 1.2,
  },
  {
    kind: 'raids',
    label: 'набеги без ответа',
    says: 'Их люди ходят по нашей земле, и корона молчит. Значит, ответим сами.',
    wants: ['tribute', 'handover'],
    stubborn: 1,
  },
  {
    kind: 'tribute',
    label: 'неплатёж дани',
    says: 'Дань не пришла в срок. Тогда придём мы.',
    wants: ['tribute', 'land'],
    stubborn: 0.8,
  },
  {
    kind: 'inherit',
    label: 'наследство',
    says: 'Владетель умер без наследника, и земля его — наша по крови.',
    wants: ['land', 'marriage'],
    stubborn: 1.4,
  },
  {
    kind: 'faith',
    label: 'спор о вере',
    says: 'Они держат у себя тех, кого нам велено жечь. Дальше говорить не о чем.',
    wants: ['handover', 'tribute'],
    stubborn: 1.6,
  },
  {
    kind: 'ambition',
    label: 'честолюбие',
    says: 'Повода нет. Есть сила, и есть тот, кто слабее.',
    wants: ['land', 'tribute', 'nothing'],
    stubborn: 0.7,
  },
]

export const CASUS_BY_KIND: Readonly<Record<string, CasusDef>> = Object.fromEntries(
  CASUS.map((one) => [one.kind, one]),
)

/**
 * Послы (Т2).
 *
 * Мир, союз и дань — разговор, а не бросок. Посол приезжает в столицу, у него
 * есть имя, нрав и то, с чем его послали.
 */
export const ENVOY_TEMPERS = ['stiff', 'smooth', 'blunt', 'anxious'] as const
export type EnvoyTemper = (typeof ENVOY_TEMPERS)[number]

export const ENVOY_TEMPER_DEFS: Record<
  EnvoyTemper,
  { readonly label: string; readonly about: string; readonly yields: number }
> = {
  stiff: {
    label: 'надменный',
    about: 'Говорит так, будто делает одолжение. Уступает последним и по мелочи.',
    yields: 0.6,
  },
  smooth: {
    label: 'вкрадчивый',
    about: 'Соглашается со всем и не обещает ничего. Уступит там, где выгодно.',
    yields: 1,
  },
  blunt: {
    label: 'прямой',
    about: 'Скажет то, с чем послан, и умолкнет. С таким проще всех.',
    yields: 1.2,
  },
  anxious: {
    label: 'встревоженный',
    about: 'Ему дома страшнее, чем здесь. Уступит и лишнее, если поторопить.',
    yields: 1.5,
  },
}

export const ENVOY_NAMES: readonly string[] = [
  'Радим',
  'Осмунд',
  'Бертольд',
  'Аскольд',
  'Гуннар',
  'Мстислав',
  'Хасан',
  'Тибо',
  'Эрвин',
  'Лют',
]

/** Сколько суток посол сидит в столице, прежде чем уехать ни с чем. */
export const ENVOY_DAYS = 12
/** Сколько своей милости уходит на то, чтобы говорить за корону. */
export const ENVOY_FAVOUR = 8
