import type { SkillId } from '../skills'
import type { Circle } from './fame'

/**
 * Ради чего (этап 70) — содержимое.
 *
 * Песочница без цели — это набор дел, из которых ни одно не главнее. Цель не
 * ограничивает: она называет, ради чего ты всё это делаешь, и по ней видно,
 * куда следующий шаг. Двадцать целей — двадцать разных жизней в одном мире.
 */

/** Чем измеряется веха: всё это уже лежит в состоянии и считается из него. */
export type GoalMeasure =
  | 'money'
  | 'holdings'
  | 'battles'
  | 'renown'
  | 'magicRank'
  | 'orderRank'
  | 'skill'
  | 'spouse'
  | 'heir'
  | 'realm'
  | 'books'
  | 'artifacts'
  | 'fame'
  | 'ventures'
  | 'craftRank'
  | 'student'
  | 'pilgrim'
  | 'brotherhood'
  | 'home'
  | 'ship'
  | 'vassals'
  | 'places'

export interface GoalStep {
  readonly measure: GoalMeasure
  /** Сколько нужно. Для «есть/нет» — единица. */
  readonly need: number
  readonly skill?: SkillId
  readonly circle?: Circle
  /** Как называется эта веха. */
  readonly label: string
}

export interface GoalDef {
  readonly id: string
  readonly label: string
  readonly about: string
  /** Три-четыре вехи: путь, а не одно условие. */
  readonly steps: readonly GoalStep[]
  /** Что сказать тому, кто эту цель выбрал. */
  readonly says: string
}

export const GOALS: readonly GoalDef[] = [
  {
    id: 'merchant',
    label: 'Купеческий дом',
    about: 'Своё дело, своё имя на рынке и деньги, которых хватит детям.',
    says: 'Деньги не цель, а язык. Ты хочешь говорить на нём свободно.',
    steps: [
      { measure: 'money', need: 3000, label: 'три тысячи в кошеле' },
      { measure: 'ventures', need: 2, label: 'два своих дела' },
      { measure: 'fame', need: 50, circle: 'traders', label: 'имя на рынках' },
      { measure: 'skill', need: 40, skill: 'trade', label: 'торг сороковой ступени' },
    ],
  },
  {
    id: 'warlord',
    label: 'Воевода',
    about: 'Войско, которое слушается, и поле, на котором тебя знают.',
    says: 'Есть вещи, которые решает только сила. Ты хочешь быть тем, кто их решает.',
    steps: [
      { measure: 'battles', need: 12, label: 'двенадцать побед' },
      { measure: 'skill', need: 40, skill: 'command', label: 'командование сороковой' },
      { measure: 'fame', need: 50, circle: 'warriors', label: 'слава у воинов' },
      { measure: 'renown', need: 15, label: 'пятнадцать дел за спиной' },
    ],
  },
  {
    id: 'archmage',
    label: 'Архимаг',
    about: 'Высшая ступень магии — та, после которой тебя зовёт корона.',
    says: 'Мир держится на том, чего почти никто не понимает. Ты хочешь понимать.',
    steps: [
      { measure: 'magicRank', need: 5, label: 'ступень архимага' },
      { measure: 'skill', need: 70, skill: 'magic', label: 'магия семидесятой' },
      { measure: 'books', need: 4, label: 'четыре прочитанные книги' },
      { measure: 'artifacts', need: 2, label: 'две вещи с чарами' },
    ],
  },
  {
    id: 'magister',
    label: 'Магистр ордена',
    about: 'Высшая ступень в братстве — и власть, которая с ней приходит.',
    says: 'Один человек мало что может. Братство может многое, если им двигать.',
    steps: [
      { measure: 'orderRank', need: 3, label: 'высшая ступень ордена' },
      { measure: 'renown', need: 10, label: 'десять дел за спиной' },
      { measure: 'fame', need: 40, circle: 'church', label: 'доброе имя у церкви' },
    ],
  },
  {
    id: 'prince',
    label: 'Своё княжество',
    about: 'Имя на карте, три места под рукой и вассалы, которые тебя держат.',
    says: 'Служить надоедает раньше, чем кажется. Ты хочешь, чтобы служили тебе.',
    steps: [
      { measure: 'realm', need: 1, label: 'своё имя на карте' },
      { measure: 'holdings', need: 3, label: 'три своих места' },
      { measure: 'vassals', need: 1, label: 'хоть один вассал' },
      { measure: 'fame', need: 40, circle: 'noble', label: 'признание знати' },
    ],
  },
  {
    id: 'wanderer',
    label: 'Странник',
    about: 'Увидеть мир: все земли, все берега, все перевалы.',
    says: 'Не надо ничего строить. Надо дойти и посмотреть.',
    steps: [
      { measure: 'places', need: 60, label: 'шесть десятков мест' },
      { measure: 'skill', need: 40, skill: 'survival', label: 'выживание сороковой' },
      { measure: 'pilgrim', need: 1, label: 'одно паломничество' },
    ],
  },
  {
    id: 'master',
    label: 'Мастер ремесла',
    about: 'Своё клеймо, свой цех и вещи, которые переживут тебя.',
    says: 'Мир полон людей, которые ничего не сделали руками. Ты не из них.',
    steps: [
      { measure: 'craftRank', need: 3, label: 'ступень мастера' },
      { measure: 'ventures', need: 1, label: 'своя мастерская' },
      { measure: 'skill', need: 40, skill: 'engineering', label: 'ремесло сороковой' },
    ],
  },
  {
    id: 'shipmaster',
    label: 'Хозяин моря',
    about: 'Своё судно, свои гавани и морской торг, который идёт без тебя.',
    says: 'Земля кончается там, где начинается настоящее. Ты хочешь туда.',
    steps: [
      { measure: 'ship', need: 1, label: 'своё судно' },
      { measure: 'ventures', need: 1, label: 'морской торг' },
      { measure: 'money', need: 2000, label: 'две тысячи в кошеле' },
    ],
  },
  {
    id: 'scholar',
    label: 'Книжник',
    about: 'Знать больше всех — и оставить это записанным.',
    says: 'Всё, что люди умеют, кто-то однажды записал. Ты хочешь быть этим кем-то.',
    steps: [
      { measure: 'books', need: 6, label: 'шесть книг' },
      { measure: 'skill', need: 50, skill: 'scholarship', label: 'книжность пятидесятой' },
      { measure: 'student', need: 1, label: 'свой ученик' },
    ],
  },
  {
    id: 'house',
    label: 'Свой род',
    about: 'Дом, жена, дети и имя, которое не кончится на тебе.',
    says: 'Человек — это те, кто останется после. Остальное дым.',
    steps: [
      { measure: 'home', need: 1, label: 'свой дом' },
      { measure: 'spouse', need: 1, label: 'жена или муж' },
      { measure: 'heir', need: 1, label: 'наследник' },
    ],
  },
  {
    id: 'saint',
    label: 'Праведник',
    about: 'Вера, милость и имя, которое поминают в храмах.',
    says: 'Ты видел довольно, чтобы понять: спасают не мечом.',
    steps: [
      { measure: 'fame', need: 60, circle: 'church', label: 'слава у церкви' },
      { measure: 'pilgrim', need: 1, label: 'паломничество' },
      { measure: 'fame', need: 40, circle: 'folk', label: 'доброе имя у люда' },
    ],
  },
  {
    id: 'brotherhood',
    label: 'Своё братство',
    about: 'Устав, написанный тобой, и люди, которые по нему живут.',
    says: 'Чужие уставы тебе не годятся. Значит, будет свой.',
    steps: [
      { measure: 'brotherhood', need: 1, label: 'основанное братство' },
      { measure: 'renown', need: 8, label: 'восемь дел за спиной' },
      { measure: 'money', need: 2500, label: 'две с половиной тысячи' },
    ],
  },
  {
    id: 'kingmaker',
    label: 'Делатель королей',
    about: 'Не корона, а тот, без кого корона не решает.',
    says: 'Сидеть на престоле скучно. Стоять рядом — вот где дело.',
    steps: [
      { measure: 'fame', need: 60, circle: 'noble', label: 'вес при дворах' },
      { measure: 'renown', need: 20, label: 'двадцать дел' },
      { measure: 'holdings', need: 2, label: 'два своих места' },
    ],
  },
  {
    id: 'ironhand',
    label: 'Железная рука',
    about: 'Страх вместо любви: земля, на которой тихо, потому что тебя боятся.',
    says: 'Пусть боятся. Это надёжнее.',
    steps: [
      { measure: 'holdings', need: 4, label: 'четыре своих места' },
      { measure: 'battles', need: 10, label: 'десять побед' },
      { measure: 'fame', need: -40, circle: 'folk', label: 'страх у люда' },
    ],
  },
  {
    id: 'healer',
    label: 'Лекарь',
    about: 'Знать травы, ставить на ноги и быть тем, за кем посылают.',
    says: 'Люди умирают от того, что лечится. Это можно исправить.',
    steps: [
      { measure: 'skill', need: 45, skill: 'healing', label: 'лекарское сорок пятой' },
      { measure: 'fame', need: 40, circle: 'folk', label: 'доброе имя у люда' },
      { measure: 'books', need: 2, label: 'две книги' },
    ],
  },
  {
    id: 'hunter',
    label: 'Ловчий',
    about: 'Глушь как дом: логова выведены, тропы известны, шкуры дороги.',
    says: 'Люди тебе не нужны. Лес честнее.',
    steps: [
      { measure: 'skill', need: 45, skill: 'survival', label: 'выживание сорок пятой' },
      { measure: 'skill', need: 35, skill: 'archery', label: 'стрельба тридцать пятой' },
      { measure: 'money', need: 800, label: 'восемь сотен с промысла' },
    ],
  },
  {
    id: 'mercenary',
    label: 'Вольный меч',
    about: 'Служить за плату, не присягая никому, и уйти богатым.',
    says: 'Присяга — это когда платят мало и долго. Ты предпочитаешь наоборот.',
    steps: [
      { measure: 'battles', need: 8, label: 'восемь побед' },
      { measure: 'money', need: 2000, label: 'две тысячи' },
      { measure: 'fame', need: 40, circle: 'warriors', label: 'слава у воинов' },
    ],
  },
  {
    id: 'lawgiver',
    label: 'Законодатель',
    about: 'Своя земля, на которой живут по твоим правилам — и живут хорошо.',
    says: 'Землю держат не мечом, а тем, что на ней можно жить.',
    steps: [
      { measure: 'holdings', need: 2, label: 'два своих места' },
      { measure: 'fame', need: 50, circle: 'folk', label: 'доброе имя у люда' },
      { measure: 'money', need: 1500, label: 'полторы тысячи в казне' },
    ],
  },
  {
    id: 'collector',
    label: 'Собиратель',
    about: 'Вещи, которых больше ни у кого нет: чары, книги, клейма.',
    says: 'Мир полон редкого. Ты хочешь, чтобы оно было у тебя.',
    steps: [
      { measure: 'artifacts', need: 3, label: 'три вещи с чарами' },
      { measure: 'books', need: 4, label: 'четыре книги' },
      { measure: 'money', need: 2500, label: 'две с половиной тысячи' },
    ],
  },
  {
    id: 'peacemaker',
    label: 'Миротворец',
    about: 'Сделать так, чтобы перестали воевать — хотя бы там, где ты стоишь.',
    says: 'Войну легко начать и невозможно остановить. Ты попробуешь.',
    steps: [
      { measure: 'fame', need: 50, circle: 'noble', label: 'вес при дворах' },
      { measure: 'fame', need: 40, circle: 'folk', label: 'доброе имя у люда' },
      { measure: 'renown', need: 12, label: 'двенадцать дел' },
    ],
  },
]

export const GOALS_BY_ID: Readonly<Record<string, GoalDef>> = Object.fromEntries(
  GOALS.map((one) => [one.id, one]),
)

/** Что даёт достигнутая веха: не сила, а признание. */
export const MILESTONE_RENOWN = 1
/** Сменить цель можно — но мир это замечает. */
export const GOAL_CHANGE_FAME = -6
