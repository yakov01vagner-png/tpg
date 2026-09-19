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

/**
 * Чего спутник хочет (этап 54).
 *
 * У каждого своё дело, к которому он и идёт рядом с тобой: долг, месть, дом,
 * имя, знание, покой. Довёл — он твой навсегда; не довёл за годы — уйдёт
 * доделывать сам.
 */
export type WishId = 'debt' | 'revenge' | 'home' | 'name' | 'lore' | 'peace'

export interface WishDef {
  readonly id: WishId
  readonly label: string
  /** Что он скажет, когда спросишь, чего ему надо. */
  readonly says: string
  /** Чем меряется: сколько надо, чтобы дело было сделано. */
  readonly needs: string
  /** Сколько это стоит герою, если платить деньгами. */
  readonly cost: number
  /** Что он скажет, когда дело сделано. */
  readonly done: string
}

export const WISHES: Record<WishId, WishDef> = {
  debt: {
    id: 'debt',
    label: 'выкупить долг',
    says: 'На мне долг. Пока он висит, я не свой — ни себе, ни тебе.',
    needs: 'заплатить за него',
    cost: 600,
    done: 'Долга больше нет. Спина прямая — впервые за годы.',
  },
  revenge: {
    id: 'revenge',
    label: 'отомстить',
    says: 'Мне должны кровь. Не спрашивай кто — сам увижу и узнаю.',
    needs: 'выиграть с ним десять боёв',
    cost: 0,
    done: 'Теперь тихо. Оказалось, тишина — это не радость, но и ладно.',
  },
  home: {
    id: 'home',
    label: 'вернуть дом',
    says: 'У меня был дом. Хочу, чтоб снова был, — хоть и не тот.',
    needs: 'привести его в своё владение',
    cost: 0,
    done: 'Вот теперь есть куда возвращаться. Спасибо, что дал.',
  },
  name: {
    id: 'name',
    label: 'нажить имя',
    says: 'Меня никто не знает. Хочу, чтоб знали — и не понаслышке.',
    needs: 'нажить славу',
    cost: 0,
    done: 'Обо мне говорят. Пусть и вполголоса, а говорят.',
  },
  lore: {
    id: 'lore',
    label: 'доучиться',
    says: 'Меня недоучили. Хочу дойти до того, до чего не дошёл.',
    needs: 'довести его до школы и заплатить за учение',
    cost: 400,
    done: 'Теперь я знаю то, чего не знал. Этого у меня не отнимут.',
  },
  peace: {
    id: 'peace',
    label: 'дожить спокойно',
    says: 'Я навоевался. Хочу дожить, не хватаясь за нож по утрам.',
    needs: 'год без единого боя',
    cost: 0,
    done: 'Год без крови. Я уж и забыл, что так бывает.',
  },
}

export interface CompanionDef {
  readonly id: string
  readonly name: string
  /** Одна строка о том, кто это и почему он свободен. */
  readonly story: string
  /** Откуда он родом — словами, а не идентификатором короны (этап 54). */
  readonly home?: string
  /** Чего он хочет от жизни (этап 54). */
  readonly wish?: WishId
  readonly temper: TemperId
  readonly skills: Readonly<Partial<Record<SkillId, number>>>
  /** Сколько просит за то, чтобы пойти. */
  readonly fee: number
  /** Где его встречают. */
  readonly where?: Availability
  /** Человек одной короны: встречается только на её землях. */
  readonly kingdomId?: string
}

export const COMPANIONS: Record<string, CompanionDef> = {
  hedwar: {
    id: 'hedwar',
    name: 'Хедвар Костоправ',
    story: 'Лекарь из полкового обоза. Полк распустили, а руки остались.',
    home: 'из полкового обоза, а родом с речного низовья',
    wish: 'peace',
    temper: 'honest',
    skills: { healing: 5, scholarship: 3, survival: 2 },
    fee: 140,
    where: { archetypes: ['town', 'city', 'capital', 'port'] },
  },
  marta: {
    id: 'marta',
    name: 'Марта Весовщица',
    story: 'Двадцать лет считала чужой товар и знает, где её обманывали.',
    home: 'из купеческого посада',
    wish: 'debt',
    temper: 'greedy',
    skills: { trade: 6, persuasion: 3, scholarship: 2 },
    fee: 180,
    where: { archetypes: ['city', 'capital', 'port'], minPopulation: 2000 },
  },
  bran: {
    id: 'bran',
    name: 'Бран Молчун',
    story: 'Ходил проводником по северным трактам. О прошлом не говорит.',
    home: 'с северных трактов',
    wish: 'revenge',
    temper: 'grim',
    skills: { survival: 6, archery: 4, athletics: 3 },
    fee: 120,
    where: { archetypes: ['village', 'town', 'mine', 'fortress'] },
  },
  sigvald: {
    id: 'sigvald',
    name: 'Сигвальд Младший',
    story: 'Третий сын малого дома: земли ему не досталось, меч достался.',
    home: 'из малого дома на порубежье',
    wish: 'name',
    temper: 'proud',
    skills: { heavyWeapons: 5, command: 4, riding: 3 },
    fee: 220,
    where: { archetypes: ['town', 'city', 'capital', 'fortress'] },
  },
  alina: {
    id: 'alina',
    name: 'Алина из Скита',
    story: 'Училась у книжников, но обет не дала. Читает на трёх языках.',
    home: 'из города, где её учили и не доучили',
    wish: 'lore',
    temper: 'devout',
    skills: { scholarship: 5, magic: 4, healing: 3 },
    fee: 200,
    where: { archetypes: ['monastery', 'city', 'capital'] },
  },
  kerim: {
    id: 'kerim',
    name: 'Керим Серьга',
    story: 'Водил обозы через степь. Дважды разорялся, трижды поднимался.',
    home: 'из южного оазиса',
    wish: 'home',
    temper: 'greedy',
    skills: { trade: 5, riding: 4, persuasion: 3 },
    fee: 170,
    where: { archetypes: ['port', 'city', 'town'] },
  },
  torvald: {
    id: 'torvald',
    name: 'Торвальд Щербатый',
    story: 'Десятник, разжалованный за драку с сотником. Людей держать умеет.',
    home: 'с холодного берега',
    wish: 'revenge',
    temper: 'loyal',
    skills: { command: 5, heavyWeapons: 4, fortitude: 3 },
    fee: 190,
    where: { archetypes: ['fortress', 'town', 'city', 'capital'] },
  },
  yfka: {
    id: 'yfka',
    name: 'Ыфка Тихая',
    story: 'Выросла в шайке, ушла сама. Замки знает лучше, чем кузнец.',
    home: 'из лесной деревни',
    wish: 'debt',
    temper: 'grim',
    skills: { sleight: 6, lightWeapons: 4, athletics: 3 },
    fee: 150,
    where: { archetypes: ['port', 'town', 'city'] },
  },
  ostap: {
    id: 'ostap',
    name: 'Остап Поперечный',
    story: 'Ставил мосты и подкопы, пока не поспорил с городским головой.',
    home: 'из приграничной слободы',
    wish: 'name',
    temper: 'honest',
    skills: { engineering: 6, hardLabour: 4, scholarship: 2 },
    fee: 175,
    where: { archetypes: ['city', 'capital', 'mine', 'fortress'] },
  },
  vela: {
    id: 'vela',
    name: 'Вела Босая',
    story: 'Говорит, что видит в людях правду. Пока ни разу не ошиблась.',
    home: 'из монастырской школы',
    wish: 'lore',
    temper: 'devout',
    skills: { persuasion: 6, healing: 3, concentration: 3 },
    fee: 210,
    where: { archetypes: ['monastery', 'town', 'city', 'capital'] },
  },
  // --- вторая десятка: по два-три на королевство --------------------------
  grimbold: {
    id: 'grimbold',
    name: 'Гримбольд Рудный',
    story: 'Мастер-рудокоп Дур-Хазада. Ушёл из клана после спора о наследстве — и о жиле.',
    home: 'из горных штолен',
    wish: 'peace',
    temper: 'proud',
    skills: { engineering: 5, hardLabour: 5, heavyWeapons: 3 },
    fee: 190,
    where: { archetypes: ['mine', 'fortress', 'capital'] },
    kingdomId: 'durHazad',
  },
  dagna: {
    id: 'dagna',
    name: 'Дагна Молотобойка',
    story: 'Кузнечиха с подгорья. Говорит, что железо честнее людей, но с людьми ладит.',
    home: 'с островного хутора',
    wish: 'home',
    temper: 'honest',
    skills: { engineering: 4, heavyWeapons: 4, trade: 3 },
    fee: 170,
    where: { archetypes: ['mine', 'town', 'city'] },
    kingdomId: 'durHazad',
  },
  ashan: {
    id: 'ashan',
    name: 'Ашан Полынь',
    story: 'Степной следопыт. Отряд его рода ушёл с кочевья, а он остался при дорогах.',
    home: 'из степного кочевья',
    wish: 'name',
    temper: 'grim',
    skills: { riding: 6, archery: 5, survival: 4 },
    fee: 160,
    where: { archetypes: ['village', 'town'] },
    kingdomId: 'tribes',
  },
  saule: {
    id: 'saule',
    name: 'Сауле Дочь Ветра',
    story: 'Из племён. Поёт так, что замолкают костры; торгуется так, что замолкают купцы.',
    home: 'из южного города книжников',
    wish: 'lore',
    temper: 'proud',
    skills: { persuasion: 5, riding: 4, trade: 3 },
    fee: 180,
    where: { archetypes: ['village', 'town', 'capital'] },
    kingdomId: 'tribes',
  },
  nadir: {
    id: 'nadir',
    name: 'Надир аль-Бохар',
    story: 'Имперский писарь, знавший слишком много о податях. Ушёл раньше, чем спросили.',
    home: 'из караванного стана',
    wish: 'debt',
    temper: 'greedy',
    skills: { scholarship: 6, trade: 4, persuasion: 3 },
    fee: 200,
    where: { archetypes: ['city', 'capital', 'port'] },
    kingdomId: 'boharut',
  },
  zaira: {
    id: 'zaira',
    name: 'Заира Тень',
    story: 'Из южных портов. Что она умеет — лучше не спрашивать при свидетелях.',
    home: 'из пустынного края',
    wish: 'revenge',
    temper: 'grim',
    skills: { sleight: 5, lightWeapons: 5, concentration: 3 },
    fee: 175,
    where: { archetypes: ['port', 'city'] },
    kingdomId: 'boharut',
  },
  brother_ilar: {
    id: 'brother_ilar',
    name: 'Брат Илар',
    story: 'Монах Робла, лишённый сана за проповедь не по уставу. Проповедует по-прежнему.',
    home: 'из обители, которой больше нет',
    wish: 'lore',
    temper: 'devout',
    skills: { healing: 5, persuasion: 4, scholarship: 3 },
    fee: 130,
    where: { archetypes: ['monastery', 'town', 'village'] },
    kingdomId: 'robl',
  },
  kassia: {
    id: 'kassia',
    name: 'Кассия Свечница',
    story: 'Служила при храме Робла, пока не выяснилось, что читает лучше настоятеля.',
    home: 'из разорённого посада',
    wish: 'home',
    temper: 'loyal',
    skills: { magic: 4, concentration: 5, scholarship: 3 },
    fee: 210,
    where: { archetypes: ['monastery', 'city', 'capital'] },
    kingdomId: 'robl',
  },
  radan: {
    id: 'radan',
    name: 'Радан Копейщик',
    story: 'Двадцать лет в ополчении Ре-Эстиза, три войны, ни одной награды.',
    home: 'из речной артели',
    wish: 'peace',
    temper: 'loyal',
    skills: { command: 4, heavyWeapons: 4, fortitude: 4 },
    fee: 150,
    where: { archetypes: ['village', 'town', 'fortress'] },
    kingdomId: 'reEstiz',
  },
  lisava: {
    id: 'lisava',
    name: 'Лисава Знахарка',
    story: 'Деревенская травница. Знает, от чего умирают, и почти всегда — как не умереть.',
    home: 'из вольного села на марке',
    wish: 'name',
    temper: 'honest',
    skills: { healing: 4, survival: 4, persuasion: 2 },
    fee: 110,
    where: { archetypes: ['village', 'monastery'] },
    kingdomId: 'reEstiz',
  },
}

export const COMPANION_IDS = Object.keys(COMPANIONS)
