import type { SkillId } from '../skills'
import type { Availability } from './availability'

/**
 * Спутники.
 *
 * Именные люди, а не мешки с навыками: у каждого своя история и свой нрав, и
 * нрав решает, что он тебе простит. Поэтому спутник — данные (правило репозитория
 * №6), а логика их только читает.
 */
export type TemperId = 'honest' | 'greedy' | 'proud' | 'devout' | 'grim' | 'loyal'

export interface TemperDef {
  readonly id: TemperId
  readonly label: string
  /** Что он одобряет и что осуждает. Числа — сдвиг расположения. */
  readonly feels: Readonly<Partial<Record<DeedId, number>>>
}

/** Поступки, которые спутники замечают. */
export type DeedId =
  | 'sack'
  | 'raid'
  | 'feedHungry'
  | 'sparePrisoners'
  | 'abandonQuest'
  | 'winBattle'
  | 'takeFief'
  | 'payWell'
  | 'starve'

export const DEED_LABELS: Record<DeedId, string> = {
  sack: 'разорение взятого города',
  raid: 'набег на мирное место',
  feedHungry: 'хлеб голодающим',
  sparePrisoners: 'пощада пленным',
  abandonQuest: 'брошенное дело',
  winBattle: 'победа в бою',
  takeFief: 'взятое владение',
  payWell: 'исправное жалованье',
  starve: 'голод в отряде',
}

export const TEMPERS: Record<TemperId, TemperDef> = {
  honest: {
    id: 'honest',
    label: 'честный',
    feels: { sack: -14, raid: -10, feedHungry: 8, sparePrisoners: 6, abandonQuest: -8, starve: -5 },
  },
  greedy: {
    id: 'greedy',
    label: 'корыстный',
    feels: { sack: 6, raid: 4, feedHungry: -3, payWell: 8, takeFief: 5, starve: -8 },
  },
  proud: {
    id: 'proud',
    label: 'гордый',
    feels: { winBattle: 8, takeFief: 6, abandonQuest: -10, raid: -4, starve: -6 },
  },
  devout: {
    id: 'devout',
    label: 'набожный',
    feels: { sack: -16, feedHungry: 10, sparePrisoners: 8, raid: -8, abandonQuest: -4 },
  },
  grim: {
    id: 'grim',
    label: 'мрачный',
    feels: { winBattle: 5, sack: 2, sparePrisoners: -4, starve: -3, payWell: 4 },
  },
  loyal: {
    id: 'loyal',
    label: 'верный',
    feels: { winBattle: 4, payWell: 5, abandonQuest: -6, starve: -4, feedHungry: 4 },
  },
}

export interface CompanionDef {
  readonly id: string
  readonly name: string
  /** Одна строка о том, кто это и почему он свободен. */
  readonly story: string
  readonly temper: TemperId
  readonly skills: Readonly<Partial<Record<SkillId, number>>>
  /** Сколько просит за то, чтобы пойти. */
  readonly fee: number
  /** Где его встречают. */
  readonly where?: Availability
}

export const COMPANIONS: Record<string, CompanionDef> = {
  hedwar: {
    id: 'hedwar',
    name: 'Хедвар Костоправ',
    story: 'Лекарь из полкового обоза. Полк распустили, а руки остались.',
    temper: 'honest',
    skills: { healing: 5, scholarship: 3, survival: 2 },
    fee: 140,
    where: { archetypes: ['town', 'city', 'capital', 'port'] },
  },
  marta: {
    id: 'marta',
    name: 'Марта Весовщица',
    story: 'Двадцать лет считала чужой товар и знает, где её обманывали.',
    temper: 'greedy',
    skills: { trade: 6, persuasion: 3, scholarship: 2 },
    fee: 180,
    where: { archetypes: ['city', 'capital', 'port'], minPopulation: 2000 },
  },
  bran: {
    id: 'bran',
    name: 'Бран Молчун',
    story: 'Ходил проводником по северным трактам. О прошлом не говорит.',
    temper: 'grim',
    skills: { survival: 6, archery: 4, athletics: 3 },
    fee: 120,
    where: { archetypes: ['village', 'town', 'mine', 'fortress'] },
  },
  sigvald: {
    id: 'sigvald',
    name: 'Сигвальд Младший',
    story: 'Третий сын малого дома: земли ему не досталось, меч достался.',
    temper: 'proud',
    skills: { heavyWeapons: 5, command: 4, riding: 3 },
    fee: 220,
    where: { archetypes: ['town', 'city', 'capital', 'fortress'] },
  },
  alina: {
    id: 'alina',
    name: 'Алина из Скита',
    story: 'Училась у книжников, но обет не дала. Читает на трёх языках.',
    temper: 'devout',
    skills: { scholarship: 5, magic: 4, healing: 3 },
    fee: 200,
    where: { archetypes: ['monastery', 'city', 'capital'] },
  },
  kerim: {
    id: 'kerim',
    name: 'Керим Серьга',
    story: 'Водил обозы через степь. Дважды разорялся, трижды поднимался.',
    temper: 'greedy',
    skills: { trade: 5, riding: 4, persuasion: 3 },
    fee: 170,
    where: { archetypes: ['port', 'city', 'town'] },
  },
  torvald: {
    id: 'torvald',
    name: 'Торвальд Щербатый',
    story: 'Десятник, разжалованный за драку с сотником. Людей держать умеет.',
    temper: 'loyal',
    skills: { command: 5, heavyWeapons: 4, fortitude: 3 },
    fee: 190,
    where: { archetypes: ['fortress', 'town', 'city', 'capital'] },
  },
  yfka: {
    id: 'yfka',
    name: 'Ыфка Тихая',
    story: 'Выросла в шайке, ушла сама. Замки знает лучше, чем кузнец.',
    temper: 'grim',
    skills: { sleight: 6, lightWeapons: 4, athletics: 3 },
    fee: 150,
    where: { archetypes: ['port', 'town', 'city'] },
  },
  ostap: {
    id: 'ostap',
    name: 'Остап Поперечный',
    story: 'Ставил мосты и подкопы, пока не поспорил с городским головой.',
    temper: 'honest',
    skills: { engineering: 6, hardLabour: 4, scholarship: 2 },
    fee: 175,
    where: { archetypes: ['city', 'capital', 'mine', 'fortress'] },
  },
  vela: {
    id: 'vela',
    name: 'Вела Босая',
    story: 'Говорит, что видит в людях правду. Пока ни разу не ошиблась.',
    temper: 'devout',
    skills: { persuasion: 6, healing: 3, concentration: 3 },
    fee: 210,
    where: { archetypes: ['monastery', 'town', 'city', 'capital'] },
  },
}

export const COMPANION_IDS = Object.keys(COMPANIONS)
