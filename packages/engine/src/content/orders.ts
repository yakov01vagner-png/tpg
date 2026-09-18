import type { PlaceKind } from '../world/types'
import type { DeedId } from './companions'

/**
 * Ордена и гильдии — данные, а не код (этап 42).
 *
 * Сила, не привязанная к короне: у неё своя земля (места, где она стоит), свои
 * люди, своя служба и своя вражда. В них вступают, служат, растут и вылетают.
 * Шесть штук — по одной на каждый уклад мира: церковь, дорога, торг, море,
 * рудник и война.
 */
export type OrderKind = 'church' | 'order' | 'guild'

export interface OrderRank {
  readonly label: string
  /** С какого положения (`standing`) ступень даётся. */
  readonly standing: number
}

export interface OrderPerks {
  /** Прибавка к торговле в местах ордена. */
  readonly trade?: number
  /** Во сколько раз дешевле найм в местах ордена. */
  readonly hire?: number
  /** Во сколько раз дешевле перевоз и починка судна в местах ордена. */
  readonly sea?: number
  /** Засада на земле ордена обходит своих: множитель к риску. */
  readonly roads?: number
  /** Рана в местах ордена заживает как при лекаре. */
  readonly healing?: boolean
  /** Награда за поручения, взятые в местах ордена, больше. */
  readonly reward?: number
}

export interface OrderDef {
  readonly id: string
  readonly name: string
  readonly kind: OrderKind
  readonly flavor: string
  /** Устав: что орден одобряет и что осуждает, сдвигом положения. */
  readonly charter: Readonly<Partial<Record<DeedId, number>>>
  /** Чья это земля: корона, в чьих местах орден стоит. Пусто — везде. */
  readonly kingdomId?: string
  /** В каких местах орден стоит. */
  readonly seats: readonly PlaceKind[]
  readonly ranks: readonly OrderRank[]
  /** Взнос в месяц: не внёс — положение падает. */
  readonly dues: number
  readonly perks: OrderPerks
  /** С кем в ссоре: короны и другие ордена. */
  readonly feud: { readonly kingdoms: readonly string[]; readonly orders: readonly string[] }
}

export const ORDERS: readonly OrderDef[] = [
  {
    id: 'lantern',
    name: 'Орден Светоча',
    kind: 'church',
    flavor:
      'Церковь Робла с мечом: братья ходят по дорогам, режут разбой и жгут то, что считают порчей.',
    charter: { sparePrisoners: 6, feedHungry: 5, sack: -18, raid: -12, winBattle: 2 },
    kingdomId: 'robl',
    seats: ['monastery', 'capital', 'fortress'],
    ranks: [
      { label: 'послушник', standing: 0 },
      { label: 'брат', standing: 30 },
      { label: 'рыцарь Светоча', standing: 70 },
      { label: 'командор', standing: 130 },
    ],
    dues: 12,
    perks: { healing: true, roads: 0.6, reward: 1.4 },
    feud: { kingdoms: ['tribes'], orders: ['blades'] },
  },
  {
    id: 'wayfarers',
    name: 'Братство Пути',
    kind: 'order',
    flavor: 'Держат постоялые дворы и заставы, знают каждый брод и не спрашивают, кто ты.',
    charter: { feedHungry: 6, abandonQuest: -10, raid: -8, payWell: 3 },
    seats: ['village', 'town', 'outpost', 'crossing', 'ford', 'bridge'],
    ranks: [
      { label: 'попутчик', standing: 0 },
      { label: 'проводник', standing: 25 },
      { label: 'смотритель дорог', standing: 60 },
      { label: 'старшина Пути', standing: 110 },
    ],
    dues: 6,
    perks: { roads: 0.4, reward: 1.2 },
    feud: { kingdoms: [], orders: ['blades'] },
  },
  {
    id: 'guests',
    name: 'Гильдия Гостей',
    kind: 'guild',
    flavor:
      'Купцы, которые торгуют через границы и ссорятся с любой короной, которая берёт с них лишнее.',
    charter: { payWell: 6, takeFief: 3, sack: -10, raid: -14, starve: -6 },
    seats: ['city', 'capital', 'port', 'town'],
    ranks: [
      { label: 'гость', standing: 0 },
      { label: 'член гильдии', standing: 30 },
      { label: 'старшина ряда', standing: 75 },
      { label: 'голова гильдии', standing: 140 },
    ],
    dues: 20,
    // Двадцать ступеней к торгу — это треть разницы между «купить» и
    // «продать»: меньше съедало округление дешёвых товаров.
    perks: { trade: 20, reward: 1.2 },
    feud: { kingdoms: ['boharut'], orders: ['lantern'] },
  },
  {
    id: 'shipwrights',
    name: 'Цех Корабельщиков',
    kind: 'guild',
    flavor:
      'Все, кто строит, водит и чинит. У них своё слово в каждой гавани и своя цена для своих.',
    charter: { payWell: 5, winBattle: 2, sack: -6, raid: -6 },
    seats: ['port'],
    ranks: [
      { label: 'подмастерье', standing: 0 },
      { label: 'корабельщик', standing: 30 },
      { label: 'кормчий', standing: 70 },
      { label: 'старшина цеха', standing: 120 },
    ],
    dues: 15,
    perks: { sea: 0.7, trade: 8 },
    feud: { kingdoms: [], orders: ['guests'] },
  },
  {
    id: 'vein',
    name: 'Братство Жилы',
    kind: 'order',
    flavor: 'Подгорное братство рудокопов: кланы Дор-Хазада с ним считаются, короны — терпят.',
    charter: { payWell: 4, feedHungry: 4, sack: -8, takeFief: -4 },
    kingdomId: 'durHazad',
    seats: ['mine', 'quarry', 'fortress', 'capital'],
    ranks: [
      { label: 'откатчик', standing: 0 },
      { label: 'забойщик', standing: 30 },
      { label: 'мастер жилы', standing: 70 },
      { label: 'старейшина Братства', standing: 120 },
    ],
    dues: 8,
    perks: { trade: 12, hire: 0.85 },
    feud: { kingdoms: ['boharut'], orders: [] },
  },
  {
    id: 'blades',
    name: 'Вольные Клинки',
    kind: 'order',
    flavor: 'Наёмная рота без родины. Воюют за плату, грабят за так, и на них нет управы.',
    charter: { winBattle: 5, sack: 4, raid: 2, sparePrisoners: -4, payWell: 6, starve: -8 },
    seats: ['fortress', 'town', 'city', 'outpost'],
    ranks: [
      { label: 'новобранец', standing: 0 },
      { label: 'клинок', standing: 30 },
      { label: 'десятник', standing: 70 },
      { label: 'капитан роты', standing: 130 },
    ],
    dues: 10,
    perks: { hire: 0.75, reward: 1.3 },
    feud: { kingdoms: ['robl'], orders: ['lantern', 'wayfarers'] },
  },
]

export const ORDERS_BY_ID: Readonly<Record<string, OrderDef>> = Object.fromEntries(
  ORDERS.map((order) => [order.id, order]),
)
