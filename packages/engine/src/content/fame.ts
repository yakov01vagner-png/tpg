import type { DeedId } from './companions'

/**
 * Слава и молва (этап 68) — содержимое.
 *
 * Слава была одним числом (`renown`: столько-то побед) и памятью по местам. Но
 * слава не одна: крестьянин, купец, знатный, церковь и воин считают доброе и
 * дурное по-своему. И слава не число, а рассказ: он ходит по корчмам и портится
 * по дороге. Прозвище — то, что из этого получилось.
 */

/** Круги, у каждого из которых своя слава (Ф3). */
export const CIRCLES = ['folk', 'traders', 'noble', 'church', 'warriors'] as const
export type Circle = (typeof CIRCLES)[number]

export const CIRCLE_DEFS: Record<Circle, { readonly label: string; readonly about: string }> = {
  folk: {
    label: 'простой люд',
    about: 'Деревня, посад, чернь. Помнят, кто привёз хлеб и кто сжёг двор.',
  },
  traders: {
    label: 'купцы',
    about: 'Рынок и гильдии. Ценят исправность в делах и тишину на дорогах.',
  },
  noble: {
    label: 'знать',
    about: 'Владетели и двор. Смотрят, с кем ты и чего стоишь в поле.',
  },
  church: {
    label: 'церковь',
    about: 'Храмы и обители. Считают грехи, и считают внимательно.',
  },
  warriors: {
    label: 'воины',
    about: 'Дружины и наёмники. У них одна мерка: как ты держишься, когда бьют.',
  },
}

/**
 * Что каждый круг думает о поступке.
 *
 * Тот же язык поступков, что у спутников и орденов (`DeedId`): один список на
 * всех, кто о тебе судит. Разница — в том, как они его читают: разорение города
 * для воинов почти ничто, для простого люда — всё.
 */
export const CIRCLE_FEELS: Record<Circle, Readonly<Partial<Record<DeedId, number>>>> = {
  folk: {
    sack: -22,
    raid: -18,
    feedHungry: 18,
    sparePrisoners: 8,
    starve: -10,
    payWell: 4,
    takeFief: -4,
  },
  traders: {
    sack: -12,
    raid: -14,
    payWell: 14,
    abandonQuest: -14,
    feedHungry: 6,
    winBattle: 4,
  },
  noble: {
    winBattle: 12,
    takeFief: 10,
    sack: -4,
    sparePrisoners: 6,
    abandonQuest: -8,
    payWell: 4,
  },
  church: {
    sack: -20,
    raid: -14,
    sparePrisoners: 16,
    feedHungry: 14,
    winBattle: 2,
  },
  warriors: {
    winBattle: 16,
    sack: 2,
    raid: 2,
    payWell: 10,
    starve: -14,
    sparePrisoners: -2,
    abandonQuest: -6,
  },
}

/**
 * Прозвища (Ф1).
 *
 * Мир не спрашивает, каким ты хочешь называться: он смотрит, чего у тебя больше,
 * и зовёт по этому. Прозвище одно, и меняется оно вместе с делами.
 */
export interface BynameDef {
  readonly id: string
  readonly label: string
  readonly about: string
  /** По какому кругу и какой ступени оно даётся. */
  readonly circle: Circle
  /** Нужна слава не ниже (или, если отрицательно, не выше). */
  readonly needs: number
  /** Какое дело за этим стоит: по нему прозвище и выбирается. */
  readonly deed?: DeedId
}

export const BYNAMES: readonly BynameDef[] = [
  {
    id: 'bloody',
    label: 'Кровавый',
    about: 'Так зовут того, за кем горели города. Зовут шёпотом и не при нём.',
    circle: 'folk',
    needs: -45,
    deed: 'sack',
  },
  {
    id: 'generous',
    label: 'Щедрый',
    about: 'Так зовут того, кто привозил хлеб, когда его не было ни у кого.',
    circle: 'folk',
    needs: 45,
    deed: 'feedHungry',
  },
  {
    id: 'honest',
    label: 'Верный слову',
    about: 'Купеческое прозвище: таких мало, и о таких говорят на всех рынках.',
    circle: 'traders',
    needs: 45,
    deed: 'payWell',
  },
  {
    id: 'grasping',
    label: 'Хваткий',
    about: 'Берёт своё и чужое, но берёт по уговору. На рынке это ценят больше честности.',
    circle: 'traders',
    needs: -40,
  },
  {
    id: 'ironhand',
    label: 'Железная Рука',
    about: 'Воинское прозвище: так зовут того, кто не отступал.',
    circle: 'warriors',
    needs: 50,
    deed: 'winBattle',
  },
  {
    id: 'craven',
    label: 'Трусливый',
    about: 'Худшее из прозвищ. Его не смывают деньгами — только полем.',
    circle: 'warriors',
    needs: -40,
  },
  {
    id: 'blessed',
    label: 'Благочестивый',
    about: 'Церковное прозвище: за пощаду, за хлеб и за то, что не сжёг, когда мог.',
    circle: 'church',
    needs: 45,
    deed: 'sparePrisoners',
  },
  {
    id: 'godless',
    label: 'Безбожный',
    about: 'Так зовут того, о ком в проповедях говорят как о примере.',
    circle: 'church',
    needs: -45,
  },
  {
    id: 'lordly',
    label: 'Высокородный',
    about: 'Прозвище от знати — не за кровь, а за то, что тебя признали своим.',
    circle: 'noble',
    needs: 50,
    deed: 'takeFief',
  },
  {
    id: 'upstart',
    label: 'Выскочка',
    about: 'Так зовут того, кто поднялся не по крови. Зовут вежливо и до конца жизни.',
    circle: 'noble',
    needs: -35,
  },
  {
    id: 'bookish',
    label: 'Книжник',
    about: 'Прозвище для того, кто больше читал, чем рубил. Насмешка, которая иногда спасала.',
    circle: 'church',
    needs: 20,
  },
  // Ещё девять прозвищ (этап 73, Б6): между «не знают» и крайностью должна
  // быть середина — иначе человек ходит без прозвища всю жизнь и получает его
  // разом, у самой крайней черты.
  {
    id: 'wanderer',
    label: 'Странник',
    about: 'Так зовут того, кого видели во всех концах и нигде подолгу.',
    circle: 'folk',
    needs: 20,
  },
  {
    id: 'thief',
    label: 'Тать',
    about: 'Так зовут того, после кого в селе считают скот.',
    circle: 'folk',
    needs: -25,
    deed: 'raid',
  },
  {
    id: 'openhand',
    label: 'Широкая Ладонь',
    about: 'Купеческое: платит не торгуясь и берёт не глядя. Таких любят и таких обманывают.',
    circle: 'traders',
    needs: 25,
  },
  {
    id: 'debtor',
    label: 'Должник',
    about: 'На рынке помнят не обиду, а невыплату. Это она и есть.',
    circle: 'traders',
    needs: -20,
  },
  {
    id: 'brave',
    label: 'Смелый',
    about: 'Первое воинское прозвище: за того, кто идёт вперёд, пока не проверено, чем он кончит.',
    circle: 'warriors',
    needs: 25,
    deed: 'winBattle',
  },
  {
    id: 'butcher',
    label: 'Мясник',
    about: 'Так зовут того, кто побеждает дороже, чем стоит победа.',
    circle: 'warriors',
    needs: -25,
    deed: 'sack',
  },
  {
    id: 'lawful',
    label: 'Правосудный',
    about: 'Знатное: о том, кто судит по закону, а не по кошелю просителя.',
    circle: 'noble',
    needs: 25,
  },
  {
    id: 'landless',
    label: 'Безземельный',
    about: 'Худшее, что знать говорит о своём: живёт при чужом столе.',
    circle: 'noble',
    needs: -20,
  },
  {
    id: 'almsgiver',
    label: 'Милостивец',
    about: 'Церковное: о том, кто подаёт не по праздникам, а когда просят.',
    circle: 'church',
    needs: 25,
    deed: 'feedHungry',
  },
]

/**
 * Молва (Ф2).
 *
 * О тебе рассказывают, и рассказ портится по дороге: чем дальше от места, где
 * это было, тем сильнее он не похож на правду.
 */
export const TALE_STEPS = ['true', 'grown', 'twisted', 'unrecognizable'] as const
export type TaleStep = (typeof TALE_STEPS)[number]

export const TALE_STEP_DEFS: Record<TaleStep, { readonly label: string; readonly how: string }> = {
  true: { label: 'как было', how: 'Рассказывают близко к тому, как оно было.' },
  grown: {
    label: 'с прибавкой',
    how: 'Числа выросли, а подробности появились те, которых не было.',
  },
  twisted: { label: 'наизнанку', how: 'Кто кого спас — уже неясно, и кто кого сжёг — тоже.' },
  unrecognizable: {
    label: 'не узнать',
    how: 'От правды осталось имя, и то не всегда твоё.',
  },
}

/** Через сколько переходов рассказ портится на одну ступень. */
export const TALE_HOP = 2

/**
 * Позор (Ф6).
 *
 * Не минус к славе, а история, которую надо перекрыть: пока она висит, круг
 * помнит её вместо всего прочего. Перекрывается делом того же круга.
 */
export const SHAMES = ['fled', 'broke', 'burned', 'starved'] as const
export type ShameId = (typeof SHAMES)[number]

export const SHAME_DEFS: Record<
  ShameId,
  {
    readonly label: string
    readonly says: string
    readonly circle: Circle
    /** Каким делом это перекрывают. */
    readonly covers: DeedId
  }
> = {
  fled: {
    label: 'бежал с поля',
    says: 'Говорят, ты ушёл раньше своих. Такое помнят дольше побед.',
    circle: 'warriors',
    covers: 'winBattle',
  },
  broke: {
    label: 'бросил дело',
    says: 'Взял и не сделал. На рынке об этом знают все.',
    circle: 'traders',
    covers: 'payWell',
  },
  burned: {
    label: 'сжёг город',
    says: 'Там, где ты прошёл, потом никто не жил. Это не забывают.',
    circle: 'folk',
    covers: 'feedHungry',
  },
  starved: {
    label: 'заморил своих',
    says: 'Твои люди голодали, пока ты был при деньгах. Такого не прощают.',
    circle: 'warriors',
    covers: 'payWell',
  },
}

/** Сколько дел того же круга нужно, чтобы позор перестали вспоминать. */
export const SHAME_COVER = 3

/**
 * Певец (Ф5).
 *
 * Славу можно купить — не саму, а рассказ о ней. Певец разносит то, за что
 * заплатили, и делает это честнее, чем кажется: он не врёт, он выбирает.
 */
export const SINGER_PRICE = 180
export const SINGER_FAME = 18
export const SINGER_HOURS = 3
export const SINGER_NAMES: readonly string[] = [
  'Гудим',
  'Баян',
  'Сладкогласый Лель',
  'Хромой Вавила',
  'Заречный Нестор',
  'Оська Дудка',
]
