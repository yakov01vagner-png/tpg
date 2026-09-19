import type { CourtRole, IntrigueDef, IntrigueKind, LordTemper } from './content/castle'
import {
  COURT_NAMES,
  COURT_ROLES,
  FAVOUR_AUDIENCE,
  FAVOUR_LAND,
  FAVOUR_SERVICE,
  INTRIGUES,
  LORD_TEMPERS,
  LORD_TEMPER_IDS,
} from './content/castle'
import { fameOf } from './fame'
import { PLAYER } from './holding'
import { lordRep } from './reputation'
import type { GameState } from './state'
import type { Lord } from './war'
import { lordById } from './war'
import type { World } from './world/types'

/**
 * Замок и двор лорда (этап 52).
 *
 * До 0.6 замок был кнопкой «просить землю»: лорд — строка с верностью, двор —
 * ничто. Теперь у лорда есть нрав, а при нём люди: сенешаль, капитан, госпожа,
 * наследник, духовник. Как купцы (этап 49) и священники (этап 51), они
 * выводятся из лорда; в состоянии — только милость, а она и так была
 * (репутация у лорда).
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Нрав лорда: выводится из его имени и потому у него один на всю жизнь. */
export function lordTemper(lord: Lord): LordTemper {
  return LORD_TEMPER_IDS[hashOf(lord.id) % LORD_TEMPER_IDS.length] ?? 'shrewd'
}

export interface Courtier {
  readonly id: string
  readonly name: string
  readonly role: CourtRole
  readonly lordId: string
  /** Как он сам к тебе: свой счёт, не лордов. */
  readonly mood: number
}

/**
 * Кто при этом лорде.
 *
 * Сенешаль и капитан есть у всякого; госпожа, наследник и духовник — не у
 * всякого: у кого-то жена умерла, у кого-то сын мал, у кого-то духовника
 * отродясь не было.
 */
export function courtOf(state: Pick<GameState, 'reputation'>, lord: Lord): readonly Courtier[] {
  const base = hashOf(lord.id)
  const roles: CourtRole[] = ['seneschal', 'captain']
  if (base % 4 !== 0) roles.push('spouse')
  if ((base >>> 3) % 3 !== 0) roles.push('heir')
  if ((base >>> 6) % 3 === 0) roles.push('chaplain')
  const favour = lordRep(state.reputation, lord.id)
  return roles.map((role, index) => {
    const hash = hashOf(`${lord.id}|${role}`)
    // Двор смотрит на тебя глазами лорда, но каждый — чуть по-своему.
    const own = ((hash >>> 5) % 21) - 10
    return {
      id: `courtier:${lord.id}:${role}`,
      name: COURT_NAMES[(hash + index) % COURT_NAMES.length] ?? 'придворный',
      role,
      lordId: lord.id,
      mood: Math.max(-100, Math.min(100, Math.round(favour * 0.7 + own))),
    }
  })
}

export function courtierAbout(role: CourtRole): string {
  return COURT_ROLES[role].about
}

/** Милость лорда — она же его память о тебе. */
export function favourOf(state: Pick<GameState, 'reputation'>, lordId: string): number {
  return lordRep(state.reputation, lordId)
}

/**
 * Приём (этап 52, З1).
 *
 * В замок входят по чину: своего вассала и слугу короны примут сразу, чужого —
 * по славе, незнакомца — с подарком или никак. Гордый не пустит и с подарком,
 * алчный пустит за него кого угодно.
 */
export interface Reception {
  readonly admits: boolean
  /** Сколько ждать в сенях, часов. */
  readonly waitHours: number
  readonly says: string
  /** Сколько нужно дать, чтобы пустили, если так не пускают. */
  readonly gift: number
}

export function receptionFor(
  state: Pick<GameState, 'reputation' | 'renown' | 'service' | 'character' | 'fame'>,
  lord: Lord,
  gift = 0,
): Reception {
  const temper = LORD_TEMPERS[lordTemper(lord)]
  const favour = favourOf(state, lord.id)
  const own = lord.kingdomId === PLAYER
  const liege = state.service !== null && lord.kingdomId === state.service
  // Чин: свой вассал и слуга короны входят без разговоров.
  const standing =
    // Проезжий человек с именем — уже не никто: весёлый пустит и такого, а
    // гордому и славы мало.
    0.25 +
    (own ? 1 : 0) +
    (liege ? 0.5 : 0) +
    Math.min(0.5, state.renown * 0.05) +
    Math.max(-0.5, Math.min(0.5, favour / 100)) +
    // Слава у знати открывает и закрывает двери (этап 68, Ф4): «Выскочку»
    // пустят неохотно, «Высокородного» — как своего.
    Math.max(-0.5, Math.min(0.5, fameOf(state, 'noble') / 120)) +
    (gift * temper.gift) / 400
  const admits = own || standing >= temper.closed
  const wait = own || liege ? 0 : Math.round((1 + temper.closed * 5) * (admits ? 1 : 2))
  // Сколько дать, чтобы пустили: с запасом на округление — у ворот не считают
  // до монеты, но и недостачу видят.
  const needed = Math.max(
    0,
    Math.ceil(((temper.closed - standing) * 400) / Math.max(0.1, temper.gift)) + 1,
  )
  return {
    admits,
    waitHours: wait,
    says: admits ? (temper.greets[0] ?? '') : (temper.refuses[0] ?? ''),
    gift: needed,
  }
}

/** Что при дворе можно затеять: дела двора выводятся из милости и нрава. */
export function intriguesFor(
  state: Pick<GameState, 'reputation' | 'service'>,
  lord: Lord,
): readonly IntrigueDef[] {
  const favour = favourOf(state, lord.id)
  return INTRIGUES.filter((one) => {
    if (one.id === 'patronage') return favour >= FAVOUR_SERVICE && lord.kingdomId !== PLAYER
    if (one.id === 'denounce') return favour > FAVOUR_AUDIENCE
    return true
  })
}

/**
 * Донос: на кого можно донести этому лорду.
 *
 * На своего соседа по короне — можно; на того, кто сам тебя привечает, — тоже
 * можно, но он узнает. На чужого лорда лорду неинтересно.
 */
export function denounceTargets(
  state: Pick<GameState, 'politics' | 'reputation'>,
  lord: Lord,
): readonly Lord[] {
  return state.politics.lords.filter(
    (one) => one.id !== lord.id && one.kingdomId === lord.kingdomId && one.kingdomId !== null,
  )
}

/**
 * Суд лорда (этап 52, З6).
 *
 * На тебя жалуются и ты жалуешься. Решает лорд — по своему нраву и по тому,
 * в какой ты у него милости. Богобоязненный склонен к просителю, суровый — к
 * своим.
 */
export type Verdict = 'granted' | 'refused' | 'fined'

export function judgeOf(lord: Lord, favour: number, roll: number): Verdict {
  const temper = LORD_TEMPERS[lordTemper(lord)]
  const chance = 0.35 + temper.justice + favour / 200
  if (roll < chance) return 'granted'
  if (roll > 0.9 && favour < 0) return 'fined'
  return 'refused'
}

/** Кто здесь сидит: лорд-держатель этого места, если он тут. */
export function lordHere(state: GameState, locationId: string = state.locationId): Lord | null {
  const owner = state.settlements[locationId]?.owner
  if (!owner) return null
  return lordById(state.politics, owner)
}

/** Есть ли в этом месте замок: двор бывает там, где сидит держатель. */
export function hasCastle(world: World, locationId: string): boolean {
  const kind = world.locations[locationId]?.archetype
  return kind === 'capital' || kind === 'city' || kind === 'town' || kind === 'fortress'
}

export { FAVOUR_LAND, FAVOUR_SERVICE, FAVOUR_AUDIENCE }
export type { IntrigueKind }
