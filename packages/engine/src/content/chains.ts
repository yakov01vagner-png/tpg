import type { SkillId } from '../skills'
import type { PlaceKind } from '../world/types'
import type { Availability } from './availability'
import type { GoodId } from './goods'

/**
 * Поручения руками (этап 15, H5).
 *
 * Поручения этапа 6 растут из мира: где голодно, там просят хлеба. Цепочка —
 * другое: у неё есть человек с лицом, начало, шаги и конец. Это потолок
 * ручного поручения, и он нарочно невысок: три шага, одна награда, одна
 * строка на шаг. Условия шагов проверяет мир (стоишь ли где надо, несёшь ли
 * что надо), а не счётчик нажатий.
 */
export type ChainStep =
  | {
      readonly type: 'visit'
      readonly archetype: PlaceKind
      readonly kingdomId?: string
      readonly text: string
    }
  | {
      readonly type: 'deliver'
      readonly good: GoodId
      readonly amount: number
      readonly archetype: PlaceKind
      readonly text: string
    }
  | { readonly type: 'win'; readonly battles: number; readonly text: string }
  | {
      readonly type: 'skill'
      readonly skill: SkillId
      readonly level: number
      readonly text: string
    }
  | { readonly type: 'recruit'; readonly companionId: string; readonly text: string }
  | { readonly type: 'hold'; readonly text: string }
  | { readonly type: 'money'; readonly amount: number; readonly text: string }

export interface ChainGiver {
  readonly name: string
  /** Зерно лица: по нему рисуется портрет. */
  readonly seed: string
  readonly kingdomId?: string
}

export interface ChainDef {
  readonly id: string
  readonly title: string
  readonly giver: ChainGiver
  /** Где предлагают. */
  readonly where: Availability
  readonly kingdomId?: string
  /** Что нужно иметь за плечами, чтобы к тебе с этим подошли. */
  readonly requiresTags?: readonly string[]
  readonly intro: string
  readonly steps: readonly ChainStep[]
  readonly outro: string
  readonly reward: {
    readonly money: number
    readonly renown?: number
    readonly placeRep?: number
    readonly tag?: string
  }
}

export const CHAINS: readonly ChainDef[] = [
  {
    id: 'millerDebt',
    title: 'Долг мельника',
    giver: { name: 'мельник Ждан', seed: 'chain:zhdan', kingdomId: 'reEstiz' },
    where: { archetypes: ['village'] },
    intro:
      'Мельник должен городскому купцу двадцать мер зерна и боится ехать сам: на дороге шалят.',
    steps: [
      {
        type: 'deliver',
        good: 'grain',
        amount: 20,
        archetype: 'town',
        text: 'Довезти двадцать мер зерна до любого города.',
      },
      {
        type: 'visit',
        archetype: 'village',
        text: 'Вернуться в деревню и сказать, что долг закрыт.',
      },
    ],
    outro: 'Ждан выдыхает так, будто год не дышал. «Мельница твоя — мели даром, когда захочешь».',
    reward: { money: 60, placeRep: 8 },
  },
  {
    id: 'lostCaravan',
    title: 'Пропавший обоз',
    giver: { name: 'купчиха Оляна', seed: 'chain:olyana' },
    where: { archetypes: ['town', 'city'] },
    intro:
      'Обоз с сукном не дошёл до порта. Оляна хочет знать, кто его взял, — и хочет, чтобы взявший пожалел.',
    steps: [
      { type: 'win', battles: 1, text: 'Найти и разбить шайку на дорогах — любую: они все одна.' },
      { type: 'visit', archetype: 'port', text: 'Дойти до порта и спросить о сукне.' },
    ],
    outro:
      'Сукно нашлось в порту — продано за треть цены. Оляна платит: за то, что теперь знает, кому не верить.',
    reward: { money: 110, renown: 1 },
  },
  {
    id: 'letterToAbbot',
    title: 'Письмо настоятелю',
    giver: { name: 'писарь Онуфрий', seed: 'chain:onufry' },
    where: { archetypes: ['city', 'capital'] },
    requiresTags: ['literate'],
    intro:
      'Письмо, которое нельзя доверить гонцу, потому что гонец не умеет читать, а прочесть придётся — вслух, настоятелю.',
    steps: [
      { type: 'visit', archetype: 'monastery', text: 'Дойти до обители.' },
      {
        type: 'skill',
        skill: 'scholarship',
        level: 6,
        text: 'Прочесть письмо так, чтобы настоятель понял: нужна учёность не ниже шестой.',
      },
    ],
    outro:
      'Настоятель слушает, кивает и говорит: «Передай, что ответ — да». Онуфрий заплатит за одно это слово.',
    reward: { money: 70, placeRep: 6, tag: 'abbot_known' },
  },
  {
    id: 'dwarvenForge',
    title: 'Клеймо рода',
    giver: { name: 'мастер Торин Углежог', seed: 'chain:torin', kingdomId: 'durHazad' },
    where: { archetypes: ['mine', 'fortress'] },
    kingdomId: 'durHazad',
    intro:
      'Кузнице нужно железо, а рудник стоит: обвал. Торин просит привезти десять мер — и ждёт, что ты не спросишь, зачем ему чужак.',
    steps: [
      {
        type: 'deliver',
        good: 'iron',
        amount: 10,
        archetype: 'mine',
        text: 'Привезти десять мер железа в рудник.',
      },
      {
        type: 'money',
        amount: 300,
        text: 'Показать, что ты не голь: триста монет в кошеле — Торин с нищими не куёт.',
      },
    ],
    outro: 'Торин ставит на твоей вещи клеймо рода. Теперь тебя под горой знают.',
    reward: { money: 80, tag: 'dwarf_friend', placeRep: 12 },
  },
  {
    id: 'steppeHorses',
    title: 'Кони для рода',
    giver: { name: 'старейшина Тугай', seed: 'chain:tugai', kingdomId: 'tribes' },
    where: { archetypes: ['village', 'town'] },
    kingdomId: 'tribes',
    intro:
      'Роду нужна кожа на сбрую: пятнадцать мер. Тугай платит не сразу — сначала посмотрит, дойдёшь ли ты до ставки.',
    steps: [
      {
        type: 'deliver',
        good: 'leather',
        amount: 15,
        archetype: 'village',
        text: 'Привезти пятнадцать мер кожи в любую деревню племён.',
      },
      {
        type: 'visit',
        archetype: 'capital',
        kingdomId: 'tribes',
        text: 'Дойти до ставки племён и передать слово Тугая.',
      },
    ],
    outro: 'В ставке тебя ждали. Тугай — человек слова, и слово его стоит дорого.',
    reward: { money: 130, renown: 1, tag: 'steppe_friend' },
  },
  {
    id: 'imperialLedger',
    title: 'Имперская книга',
    giver: { name: 'чиновник Хасан', seed: 'chain:hasan', kingdomId: 'boharut' },
    where: { archetypes: ['city', 'capital'] },
    kingdomId: 'boharut',
    requiresTags: ['literate'],
    intro:
      'В податной книге ошибка на сто тысяч. Хасан хочет, чтобы её нашёл человек со стороны — и унёс в порт, к тому, кто её поправит.',
    steps: [
      {
        type: 'skill',
        skill: 'scholarship',
        level: 8,
        text: 'Разобрать книгу: нужна учёность не ниже восьмой.',
      },
      { type: 'visit', archetype: 'port', text: 'Довезти книгу до порта.' },
    ],
    outro:
      'Книгу приняли молча. Через неделю Хасана повысили, а тебе прислали кошель — без письма.',
    reward: { money: 160, placeRep: 5 },
  },
  {
    id: 'pilgrimRoad',
    title: 'Дорога паломника',
    giver: { name: 'мать Евлалия', seed: 'chain:evlalia', kingdomId: 'robl' },
    where: { archetypes: ['monastery'] },
    kingdomId: 'robl',
    intro:
      'Паломнику нужен спутник до столицы и трав для тех, кто останется. Евлалия не обещает денег — обещает, что запомнят.',
    steps: [
      { type: 'visit', archetype: 'capital', kingdomId: 'robl', text: 'Дойти до столицы Робла.' },
      {
        type: 'deliver',
        good: 'herbs',
        amount: 5,
        archetype: 'monastery',
        text: 'Вернуться в обитель с пятью мерами трав.',
      },
    ],
    outro:
      'Евлалия принимает травы и кладёт руку тебе на лоб. Денег и правда нет. Зато есть слово, и оно ходит по всему Роблу.',
    reward: { money: 20, renown: 2, placeRep: 15, tag: 'pilgrim' },
  },
  {
    id: 'hungryWinter',
    title: 'Голодная зима',
    giver: { name: 'староста Микула', seed: 'chain:mikula' },
    where: { archetypes: ['village'] },
    intro:
      'Амбар пуст, а до жатвы полгода. Староста просит сорок мер зерна и — если ты при оружии — унять тех, кто грабит подводы.',
    steps: [
      {
        type: 'deliver',
        good: 'grain',
        amount: 40,
        archetype: 'village',
        text: 'Привезти сорок мер зерна в деревню.',
      },
      { type: 'win', battles: 1, text: 'Разбить хоть одну шайку на дорогах.' },
    ],
    outro: 'Микула собирает, что есть, по дворам. Немного. Но собирают всем миром — и это видно.',
    reward: { money: 150, placeRep: 20 },
  },
  {
    id: 'oldSoldier',
    title: 'Старый солдат',
    giver: { name: 'сотник в отставке Гаврил', seed: 'chain:gavril' },
    where: { archetypes: ['fortress', 'town'] },
    intro:
      'Гаврил ищет, кому передать своего десятника — Торвальда Щербатого. «Возьми его. И покажи ему две победы, тогда он твой».',
    steps: [
      { type: 'recruit', companionId: 'torvald', text: 'Позвать Торвальда Щербатого в отряд.' },
      { type: 'win', battles: 2, text: 'Выиграть два боя с ним в строю.' },
    ],
    outro:
      'Гаврил смотрит на Торвальда, потом на тебя. «Ладно. Теперь он твой». И платит — за науку, как он говорит.',
    reward: { money: 100, renown: 1 },
  },
  {
    id: 'silverRoad',
    title: 'Серебряный путь',
    giver: { name: 'меняла Исаак', seed: 'chain:isaak' },
    where: { archetypes: ['port'] },
    intro:
      'Исаак хочет узнать, стоит ли серебряная дорога своих слухов. Пятьсот монет — чтобы было на что купить, пять мер серебра — чтобы было что показать.',
    steps: [
      { type: 'money', amount: 500, text: 'Накопить пятьсот монет.' },
      {
        type: 'deliver',
        good: 'silver',
        amount: 5,
        archetype: 'port',
        text: 'Привезти в порт пять мер серебра.',
      },
    ],
    outro:
      'Исаак взвешивает серебро на ладони. «Стоит», — говорит он. И покупает всё, что привёз, с наценкой.',
    reward: { money: 260, tag: 'silver_road' },
  },
  {
    id: 'healersOath',
    title: 'Клятва лекаря',
    giver: { name: 'лекарь Феодора', seed: 'chain:feodora' },
    where: { archetypes: ['city', 'capital'] },
    intro:
      'Феодора берёт учеников не за деньги — за руки. Покажи, что умеешь, и привези трав: в лечебнице их не хватает.',
    steps: [
      { type: 'skill', skill: 'healing', level: 5, text: 'Дойти до пятой ступени врачевания.' },
      {
        type: 'deliver',
        good: 'herbs',
        amount: 10,
        archetype: 'city',
        text: 'Привезти десять мер трав в любой город.',
      },
    ],
    outro: 'Феодора принимает травы и дописывает твоё имя в список тех, кого зовут, когда плохо.',
    reward: { money: 80, tag: 'healer_known', placeRep: 10 },
  },
  // --- поручения вне стен: их дают там, где кончается улица ------------------
  {
    id: 'passWatch',
    title: 'Перевал держат двое',
    giver: { name: 'проводник Кайдан', seed: 'chain:kaidan' },
    where: { archetypes: ['town', 'village', 'fortress'] },
    intro:
      'На перевале пропали двое обозников. Кайдан пойдёт туда только с тем, кто умеет ходить по горам.',
    steps: [
      {
        type: 'skill',
        skill: 'survival',
        level: 6,
        text: 'Набрать выживания не ниже шестой ступени.',
      },
      { type: 'visit', archetype: 'pass', text: 'Подняться на перевал и посмотреть самому.' },
    ],
    outro:
      'Обозников не нашли, нашли их поклажу. Кайдан делит её пополам и больше об этом не говорит.',
    reward: { money: 120, tag: 'mountain_walker' },
  },
  {
    id: 'barrowOath',
    title: 'Что лежит под курганом',
    giver: { name: 'старуха Ждана', seed: 'chain:zhdana' },
    where: { archetypes: ['village'] },
    intro:
      'Ждана говорит, что курган в поле надо не разрывать, а обойти с огнём и поклониться. За это она заплатит — и предупредит, что будет, если сделать иначе.',
    steps: [
      { type: 'visit', archetype: 'barrow', text: 'Дойти до кургана.' },
      {
        type: 'visit',
        archetype: 'shrine',
        text: 'Вернуться через святилище и оставить там монету.',
      },
    ],
    outro:
      'Ждана слушает, кивает и отдаёт обещанное. «Теперь он тебя знает», — говорит она, и это звучит не как похвала.',
    reward: { money: 90, renown: 1, tag: 'barrow_known' },
  },
  {
    id: 'fordToll',
    title: 'Брод на замке',
    giver: { name: 'купец Севастьян', seed: 'chain:sevastyan' },
    where: { archetypes: ['town', 'city', 'port'] },
    intro:
      'На броде кто-то берёт с проезжих больше, чем полагается, и делает это с ножом. Севастьяну нужно, чтобы это кончилось.',
    steps: [
      { type: 'visit', archetype: 'ford', text: 'Дойти до брода и посмотреть, кто там стоит.' },
      { type: 'win', battles: 1, text: 'Разобраться с теми, кто держит переправу.' },
    ],
    outro: 'Брод снова ничей. Севастьян платит и обещает, что об этом узнают в трёх городах.',
    reward: { money: 140, renown: 1 },
  },
  {
    id: 'quarryStone',
    title: 'Камень на стены',
    giver: { name: 'каменщик Мирон', seed: 'chain:miron' },
    where: { archetypes: ['city', 'capital', 'fortress'] },
    intro:
      'Стройка встала: каменоломня далеко, возчиков нет. Мирону нужен камень и человек, который не побоится туда съездить.',
    steps: [
      { type: 'visit', archetype: 'quarry', text: 'Добраться до каменоломни.' },
      {
        type: 'deliver',
        good: 'iron',
        amount: 8,
        archetype: 'city',
        text: 'Привезти восемь мер железа в город: без скоб кладка не встанет.',
      },
    ],
    outro: 'Мирон принимает железо и в первый раз за месяц садится обедать. Платит не глядя.',
    reward: { money: 110, placeRep: 8 },
  },
  {
    id: 'lordsFavour',
    title: 'Милость лорда',
    giver: { name: 'кастелян Ратмир', seed: 'chain:ratmir' },
    where: { archetypes: ['capital'] },
    intro: 'Кастелян говорит от имени двора: три победы и своя земля — и о тебе доложат наверх.',
    steps: [
      { type: 'win', battles: 3, text: 'Выиграть три боя.' },
      { type: 'hold', text: 'Держать хоть одно место своей рукой.' },
    ],
    outro: 'Доложили. Наверху кивнули. Ратмир передаёт кошель и слова: «Продолжайте».',
    reward: { money: 200, renown: 3 },
  },
]

export const CHAINS_BY_ID: Readonly<Record<string, ChainDef>> = Object.fromEntries(
  CHAINS.map((chain) => [chain.id, chain]),
)
