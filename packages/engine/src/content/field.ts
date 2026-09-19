import type { Terrain } from '../world/types'

/**
 * Поле боя (этап 58, Б1).
 *
 * До сих пор бой шёл «на рельефе»: конница в горах стоила меньше, и этим
 * разница кончалась. Но рельеф решает не силу конного, а ширину строя: у брода
 * и на перевале большое войско дерётся горстью, потому что остальным негде
 * встать. Потому место боя — своя сущность: сколько людей доходит до сшибки,
 * видно ли стрелку цель, есть ли куда обходить и куда отступать.
 */
export type GroundId = 'open' | 'ford' | 'forest' | 'pass' | 'walls' | 'hill' | 'camp'

export interface Ground {
  readonly id: GroundId
  readonly label: string
  readonly about: string
  /**
   * Ширина строя в людях: столько с каждой стороны доходит до сшибки за раунд.
   * Остальные стоят за спинами. Отсюда вся соль узкого места: у брода сотня
   * бьётся двумя десятками, и перевес в числе ничего не значит.
   */
  readonly frontage: number
  /** Что делает с конницей: в поле она решает, в лесу мешается. */
  readonly cavalry: number
  /** Укрытие: насколько меньше достаёт стрела. */
  readonly cover: number
  /** Легко ли уйти: от этого зависит цена отхода. */
  readonly escape: number
  /** Есть ли куда обходить: у брода и на перевале фланга нет. */
  readonly flanks: boolean
}

export const GROUNDS: Record<GroundId, Ground> = {
  open: {
    id: 'open',
    label: 'Чистое поле',
    about: 'Место, где числа значат то, что значат: строй против строя, и конница решает.',
    frontage: 220,
    cavalry: 1.25,
    cover: 0,
    escape: 0.9,
    flanks: true,
  },
  ford: {
    id: 'ford',
    label: 'Брод',
    about: 'Перейти можно по трое в ряд. Кто держит дальний берег, держит и войско вдесятеро.',
    frontage: 26,
    cavalry: 0.7,
    cover: 0.1,
    escape: 0.4,
    flanks: false,
  },
  forest: {
    id: 'forest',
    label: 'Лес',
    about: 'Строя нет, стрелять некуда, зато уйти легко и обойти есть чем.',
    frontage: 70,
    cavalry: 0.6,
    cover: 0.45,
    escape: 0.95,
    flanks: true,
  },
  pass: {
    id: 'pass',
    label: 'Перевал',
    about: 'Камень слева, обрыв справа. Здесь не обходят и здесь не бегут.',
    frontage: 30,
    cavalry: 0.55,
    cover: 0.25,
    escape: 0.3,
    flanks: false,
  },
  walls: {
    id: 'walls',
    label: 'У стен',
    about: 'Лезут по лестницам, по одному на сажень. Стена считает за десятерых.',
    frontage: 45,
    cavalry: 0.4,
    cover: 0.5,
    escape: 0.65,
    flanks: false,
  },
  hill: {
    id: 'hill',
    label: 'Склон',
    about: 'Кто выше, тот бьёт сверху и видит дальше. Снизу лезть дорого.',
    frontage: 150,
    cavalry: 1,
    cover: 0.15,
    escape: 0.75,
    flanks: true,
  },
  camp: {
    id: 'camp',
    label: 'Лагерь',
    about: 'Застали спящими. Строя нет ни у кого, зато и бежать проще всех.',
    frontage: 200,
    cavalry: 0.9,
    cover: 0,
    escape: 0.55,
    flanks: true,
  },
}

/** Где случается бой в этой земле, если он случается в дороге. */
export const TERRAIN_GROUND: Record<Terrain, GroundId> = {
  plains: 'open',
  steppe: 'open',
  desert: 'open',
  forest: 'forest',
  marsh: 'ford',
  mountains: 'pass',
  hills: 'hill',
  coast: 'ford',
}

/**
 * Приказ по чину (этап 58, Б4).
 *
 * «Командование» было множителем силы — и всё. Теперь оно открывает приказы:
 * обойти с фланга умеет не всякий, кто держит меч, а обманный отход и вовсе
 * дело полководца.
 */
export const ORDER_NEEDS: Readonly<Record<string, number>> = {
  hold: 0,
  charge: 0,
  shoot: 0,
  fallBack: 0,
  flank: 12,
  feint: 40,
  rally: 25,
  fireball: 0,
  curse: 0,
  ward: 0,
}

/** Что делают с пленным (этап 58, Б6). */
export const CAPTIVE_FATES = ['ransom', 'oath', 'release', 'execute'] as const
export type CaptiveFate = (typeof CAPTIVE_FATES)[number]

export const CAPTIVE_FATE_LABELS: Record<CaptiveFate, { label: string; about: string }> = {
  ransom: {
    label: 'Взять выкуп',
    about: 'Родня платит серебром. Дело обычное, и зла за него держат немного.',
  },
  oath: {
    label: 'Взять присягу',
    about: 'Отпустить под слово. Слово держат не все, но тот, кто держит, помнит добро.',
  },
  release: {
    label: 'Отпустить даром',
    about: 'Ни серебра, ни присяги — только имя великодушного. Имя иногда дороже.',
  },
  execute: {
    label: 'Казнить',
    about: 'Коротко и надолго. Такое не забывает ни его родня, ни чужие лорды.',
  },
}

/** Ходы осады (этап 58, Б2). */
export const SIEGE_MOVES = ['wait', 'sap', 'parley', 'bribe', 'assault', 'lift'] as const
export type SiegeMove = (typeof SIEGE_MOVES)[number]

export const SIEGE_MOVE_LABELS: Record<SiegeMove, { label: string; about: string }> = {
  wait: {
    label: 'Стоять под стенами',
    about: 'Блокада: в город не везут ничего. У них кончается хлеб, у тебя — терпение.',
  },
  sap: {
    label: 'Вести подкоп',
    about: 'Копать под стену. Сутки труда — и однажды кладка сядет. Или сядет на копателей.',
  },
  parley: {
    label: 'Требовать сдачи',
    about: 'Выйти к воротам и предложить условия. Голодный гарнизон слушает охотнее.',
  },
  bribe: {
    label: 'Купить ворота',
    about: 'В городе всегда есть тот, кому надоело. Цена его — по тому, что он теряет.',
  },
  assault: {
    label: 'Приступ',
    about: 'По лестницам. Если стена проломлена, дело идёт вдвое легче.',
  },
  lift: { label: 'Снять осаду', about: 'Уйти. Стены останутся стоять, и это запомнят.' },
}

/** Сколько суток подкопа нужно, чтобы стена села. */
export const SAP_DAYS = 6
/** Какую долю помощи стен снимает пролом. */
export const BREACH_RELIEF = 0.7
/** Насколько «измена» дороже там, где хозяин крепче сидит. */
export const BRIBE_PER_HEAD = 9
