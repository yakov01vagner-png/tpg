import type { SkillId } from '../skills'

/**
 * Двор и совет (этап 75) — содержимое.
 *
 * Держава 0.7 началась с вассалов: землю держат другие. Двор — вторая половина
 * того же: делами державы тоже занимаются другие, и каждый из них что-то умеет,
 * чего-то стоит и чего-то хочет.
 *
 * Должность здесь — не титул, а работа: у неё есть умение, по которому человека
 * выбирают, жалованье, которое он получает каждый день, и то, что он и правда
 * делает с числами державы.
 */

export const OFFICES = ['seneschal', 'marshal', 'treasurer', 'chancellor'] as const
export type OfficeId = (typeof OFFICES)[number]

export interface OfficeDef {
  readonly id: OfficeId
  readonly label: string
  readonly about: string
  /** Чем меряют годность: умение, без которого на должности делать нечего. */
  readonly skill: SkillId
  /** Жалованье в сутки. */
  readonly wage: number
  /** Что он делает с державой — словами, для сводки двора. */
  readonly does: string
  /** О чём он говорит на совете. */
  readonly speaks: string
}

export const OFFICE_DEFS: Record<OfficeId, OfficeDef> = {
  seneschal: {
    id: 'seneschal',
    label: 'сенешаль',
    about: 'Держит хозяйство: подати, амбары, управляющих по местам.',
    skill: 'scholarship',
    wage: 6,
    does: 'смотрит за управляющими: ворует при нём меньше, недоимок меньше',
    speaks: 'о хлебе, податях и о том, чего не хватит к зиме',
  },
  marshal: {
    id: 'marshal',
    label: 'маршал',
    about: 'Держит войско: сбор, гарнизоны, порядок в походе.',
    skill: 'command',
    wage: 8,
    does: 'собирает людей: вассалы приводят больше, гарнизон обходится дешевле',
    speaks: 'о войске, о соседях и о том, кто из них сейчас слаб',
  },
  treasurer: {
    id: 'treasurer',
    label: 'казначей',
    about: 'Держит казну: счёт, долги, торговые дела державы.',
    skill: 'trade',
    wage: 6,
    does: 'ведёт счёт: приход больше, расход меньше',
    speaks: 'о деньгах: сколько есть, сколько уйдёт и на сколько хватит',
  },
  chancellor: {
    id: 'chancellor',
    label: 'канцлер',
    about: 'Держит слово державы: грамоты, суд, переговоры с соседями.',
    skill: 'persuasion',
    wage: 7,
    does: 'ведёт дела с людьми: вассалы спокойнее, суд идёт глаже',
    speaks: 'о людях: кто чем недоволен и чем это кончится',
  },
}

/** Насколько должность окупает себя в лучшем случае. */
export const OFFICE_POWER: Record<OfficeId, number> = {
  /** Во сколько раз меньше ворует управляющий при хорошем сенешале. */
  seneschal: 0.5,
  /** Насколько больше людей приводят вассалы при хорошем маршале. */
  marshal: 0.35,
  /** Насколько больше берёт казна при хорошем казначее. */
  treasurer: 0.2,
  /** Сколько верности в сутки добавляет хороший канцлер. */
  chancellor: 0.02,
}

/** Ниже этого умения человек на должности только ест жалованье. */
export const OFFICE_FIT = 2

/**
 * Поручения своим (Д5).
 *
 * Должность — это ещё и человек, которого можно послать. Пока он в отъезде, его
 * дела при дворе не делаются: в этом и выбор.
 */
export const OFFICE_ERRAND_IDS = ['arrears', 'levy', 'message', 'bandits'] as const
export type OfficeErrandId = (typeof OFFICE_ERRAND_IDS)[number]

export interface OfficeErrandDef {
  readonly id: OfficeErrandId
  readonly label: string
  readonly about: string
  /** Кому это поручают. */
  readonly office: OfficeId
  /** Сколько суток его не будет. */
  readonly days: number
  /** Что выходит, если он справился, — словами. */
  readonly gives: string
}

export const OFFICE_ERRANDS: readonly OfficeErrandDef[] = [
  {
    id: 'arrears',
    label: 'Выбить недоимки',
    about: 'Объехать свои места и взять то, что не довезли.',
    office: 'seneschal',
    days: 12,
    gives: 'серебро в казну, а места это запомнят',
  },
  {
    id: 'levy',
    label: 'Поднять людей',
    about: 'Пройти по вассалам и собрать тех, кого они должны по присяге.',
    office: 'marshal',
    days: 10,
    gives: 'люди в отряд без твоего зова',
  },
  {
    id: 'message',
    label: 'Отвезти слово соседу',
    about: 'Поехать к чужой короне с твоим словом: о мире, о торге, о свадьбе.',
    office: 'chancellor',
    days: 16,
    gives: 'отношение с той короной',
  },
  {
    id: 'bandits',
    label: 'Вывести шайку',
    about: 'Взять людей и разобраться с теми, кто сидит на твоих дорогах.',
    office: 'marshal',
    days: 8,
    gives: 'тише на дорогах своей земли',
  },
]

/** Во сколько обходится каждое поручение: снаряжение и дорога. */
export const ERRAND_COST = 40

/**
 * Партии при своём дворе (Д4).
 *
 * Те же четыре, что при коронах (этап 66): война и мир, старая кровь и новые
 * люди. При своём дворе они смотрят не на чужого государя, а на тебя — на то,
 * кого ты назначил и как судишь.
 */
export const COURT_MOOD = {
  /** За назначение своего человека — старая кровь рада, новые люди нет. */
  ownAppointed: 8,
  hiredAppointed: 8,
  /** За войну — ястребы рады, голуби нет. */
  war: 10,
  /** За тяжёлую подать — новые люди ропщут. */
  heavyTax: -6,
  /** За что партия давит на верность вассалов. */
  pressure: 0.01,
} as const
