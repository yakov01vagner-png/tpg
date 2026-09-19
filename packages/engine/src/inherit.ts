import {
  INHERIT,
  INHERIT_WORDS,
  LAW_DEFS,
  type LawId,
  REGENT_DEFS,
  type RegentKind,
} from './content/inherit'
import { vassalsOf } from './court'
import { type Child, ageOf } from './dynasty'
import { PLAYER, holdingsOf } from './holding'
import { kinOf } from './home'
import type { GameState } from './state'

/**
 * Наследование своего (этап 93).
 *
 * Держава переживала государя без единой трещины: наследник получал имя, землю
 * и вассалов целиком. Оттого власть ничего не стоила — её нельзя было потерять
 * иначе как в бою, и пятый час игры делал игрока королём, которому нечего
 * терять.
 *
 * Здесь у наследства появляется закон — и цена этого закона. Раздел радует
 * знать и рвёт державу; первородство держит её целой и злит младших; единое
 * наследство не делится вовсе — и держится только сильной рукой. У малолетнего
 * есть регент со своим умыслом, а у родни — права, которые превращаются в
 * смуту, если наследник слаб.
 */

export function lawDef(law: LawId) {
  return LAW_DEFS[law]
}

/**
 * Закон о наследстве — не тот же закон, что в своей земле (этап 61): тот о
 * подати и суде, этот о том, что станет с державой без тебя.
 */
export function heirLawOf(state: Pick<GameState, 'heirLaw'>): LawId {
  return state.heirLaw ?? 'eldest'
}

// --- наследники и ветви (Сл2, Сл4) ------------------------------------------

export interface Claimant {
  readonly id: string
  readonly name: string
  /** Ребёнок, ветвь рода или побочный. */
  readonly kind: 'child' | 'branch'
  /** Сколько ему лет. */
  readonly age: number
  /** Сила права, 0..100. */
  readonly claim: number
  readonly says: string
}

/**
 * Кто имеет право на твоё (Сл2 и Сл4).
 *
 * Дети — по старшинству и по закону; ветви рода — по близости к престолу.
 * Право не значит власти: оно значит, что у человека есть, на что сослаться.
 */
export function claimantsOf(state: GameState, day: number): readonly Claimant[] {
  const law = heirLawOf(state)
  const def = LAW_DEFS[law]
  const children = [...state.character.family.children].sort((a, b) => a.bornDay - b.bornDay)
  const out: Claimant[] = []
  for (const [index, child] of children.entries()) {
    const age = ageOf(child.bornDay, day)
    const first = index === 0
    const claim =
      law === 'split'
        ? Math.round(90 / children.length)
        : first
          ? 95
          : Math.max(10, Math.round(45 - index * 10))
    out.push({
      id: `child:${child.name}`,
      name: child.name,
      kind: 'child',
      age,
      claim,
      says: first
        ? `${child.name} — старший: закон за него.`
        : `${child.name} — младший: ${def.label} даёт ему ${claim} из ста.`,
    })
  }
  // Ветви рода: дядья и кузены помнят, что кровь одна.
  for (const kin of kinOf(state.character.family, day)) {
    const claim = Math.round(INHERIT.branchClaim * (kin.asks ? 1 : 0.7))
    out.push({
      id: kin.id,
      name: kin.name,
      kind: 'branch',
      age: 40,
      claim,
      says: `${kin.name} — своя кровь: ${claim} из ста, и он это знает.`,
    })
  }
  return out.sort((a, b) => b.claim - a.claim)
}

/** Кто наследует по твоему закону. */
export function heirUnder(state: GameState, day: number): Claimant | null {
  const children = claimantsOf(state, day).filter((one) => one.kind === 'child')
  return children[0] ?? null
}

// --- раздел (Сл2) -----------------------------------------------------------

export interface Partition {
  readonly law: LawId
  /** Сколько мест остаётся наследнику. */
  readonly toHeir: number
  /** Сколько уходит другим — и кому. */
  readonly toOthers: readonly { readonly name: string; readonly places: number }[]
  /** Насколько это нравится своей знати. */
  readonly nobles: number
  readonly says: string
}

/**
 * Что станет с державой, когда тебя не станет (Сл1 и Сл2).
 *
 * Считается заранее и видно заранее: в этом весь смысл закона о наследстве —
 * выбрать цену до того, как за неё придётся платить.
 */
export function partitionOf(state: GameState, day: number): Partition {
  const law = heirLawOf(state)
  const def = LAW_DEFS[law]
  const places = holdingsOf(state.settlements, PLAYER).length
  const children = claimantsOf(state, day).filter((one) => one.kind === 'child')
  const heir = children[0]
  const others = children.slice(1)
  const toHeir = Math.max(0, Math.round(places * def.heirShare))
  const left = places - toHeir
  const share = others.length > 0 ? Math.floor(left / others.length) : 0
  const toOthers = others.map((one) => ({ name: one.name, places: share }))
  return {
    law,
    toHeir,
    toOthers,
    nobles: def.nobles,
    says:
      places === 0
        ? 'Земли нет: наследовать нечего.'
        : !heir
          ? INHERIT_WORDS.ended
          : left <= 0
            ? `${INHERIT_WORDS.whole} ${heir.name} получает все ${toHeir} мест (${def.label}).`
            : `${INHERIT_WORDS.split} ${heir.name} — ${toHeir} мест, остальным по ${share} (${def.label}).`,
  }
}

// --- регентство (Сл3) -------------------------------------------------------

export interface Regency {
  readonly kind: RegentKind
  readonly name: string
  /** Сколько лет до совершеннолетия. */
  readonly years: number
  readonly skim: number
  readonly says: string
}

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash ^ (hash >>> 13) ^ (hash >>> 21)) >>> 0
}

/**
 * Кто будет править за малолетнего (Сл3).
 *
 * Регент — свой же вассал, и нрав у него свой: верный отдаст власть, корыстный
 * возьмёт своё, честолюбивый решит, что справится лучше ребёнка. Выводится из
 * имени и дома, а не из броска: один и тот же наследник получает одного и того
 * же регента.
 */
export function regencyFor(state: GameState, heir: Claimant, day: number): Regency | null {
  if (heir.age >= INHERIT.minorAge) return null
  const vassals = vassalsOf(state)
  const best = [...vassals].sort((a, b) => b.loyalty - a.loyalty)[0]
  const seed = hashOf(`regent:${heir.name}:${best?.id ?? 'none'}`)
  const kind: RegentKind =
    best && best.loyalty >= 70
      ? 'faithful'
      : seed % 3 === 0
        ? 'ambitious'
        : seed % 3 === 1
          ? 'grasping'
          : 'faithful'
  const def = REGENT_DEFS[kind]
  return {
    kind,
    name: best ? `${best.title} ${best.name}` : 'совет державы',
    years: INHERIT.minorAge - heir.age,
    skim: def.skim,
    says: `${INHERIT_WORDS.regency} ${best ? `${best.title} ${best.name}` : 'совет державы'} — ${def.label}: ${def.about} Берёт себе ${Math.round(def.skim * 100)} из ста дохода.`,
  }
}

// --- смута (Сл5) ------------------------------------------------------------

export interface Strife {
  readonly risk: number
  readonly rival: Claimant | null
  /** Сколько вассалов уйдёт к сопернику. */
  readonly vassals: number
  readonly says: string
}

/**
 * Будет ли спор о наследстве войной (Сл5).
 *
 * Считается тремя вещами: сколько прав у соперника, насколько слаб наследник и
 * насколько закон злит обойдённых. Своя знать при этом делится: часть уходит к
 * тому, у кого право, — и это война внутри своего.
 */
export function strifeOf(state: GameState, day: number): Strife {
  const law = heirLawOf(state)
  const def = LAW_DEFS[law]
  const heir = heirUnder(state, day)
  const others = claimantsOf(state, day).filter((one) => one.id !== heir?.id)
  const rival = others[0] ?? null
  if (!heir || !rival) {
    return { risk: 0, rival: null, vassals: 0, says: 'Спорить не с кем.' }
  }
  const weak = heir.age < INHERIT.minorAge ? 25 : 0
  const vassals = vassalsOf(state)
  const restless =
    vassals.length > 0
      ? Math.round((vassals.filter((one) => one.loyalty < 50).length / vassals.length) * 30)
      : 0
  const risk = Math.max(0, Math.min(100, rival.claim + weak + def.envy + restless - 20))
  const taken = risk >= INHERIT.strifeLine ? Math.round(vassals.length * INHERIT.strifeShare) : 0
  return {
    risk,
    rival,
    vassals: taken,
    says:
      risk >= INHERIT.strifeLine
        ? `${INHERIT_WORDS.strife} ${rival.name} (право ${rival.claim}) уведёт ${taken} вассалов из ${vassals.length}. Счёт спора ${risk} при черте ${INHERIT.strifeLine}.`
        : `Спор не дойдёт до оружия: счёт ${risk} при черте ${INHERIT.strifeLine}. ${rival.says}`,
  }
}

/** Что будет, если ты умрёшь сегодня: одним взглядом (Сл1). */
export function successionView(state: GameState, day: number): string {
  const heir = heirUnder(state, day)
  const partition = partitionOf(state, day)
  const regency = heir ? regencyFor(state, heir, day) : null
  const strife = strifeOf(state, day)
  return [partition.says, regency?.says, strife.says].filter(Boolean).join(' ')
}

export { INHERIT, INHERIT_WORDS, LAW_DEFS, REGENT_DEFS, type LawId, type RegentKind, type Child }
