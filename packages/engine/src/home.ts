import type { ChildBent, HomeDef, SpouseTemper } from './content/home'
import {
  CHILD_BENTS,
  CHILD_BENT_IDS,
  HOMES,
  HOMES_BY_ID,
  KIN_NAMES,
  RETIRE_AGE,
  SPOUSE_TEMPERS,
  SPOUSE_TEMPER_IDS,
  UPBRINGING_MAX,
} from './content/home'
import type { Child, Family } from './dynasty'
import { ageOf } from './dynasty'
import type { GameState } from './state'
import type { World } from './world/types'

/**
 * Дом и семья (этап 56).
 *
 * Брак был записью, дети — счётчиком, наследство — переключением героя, а дома
 * не было вовсе. Теперь у супруга есть нрав и своё мнение о твоих делах, у
 * детей — склонности и воспитание, у рода — родня, а у героя — дом, куда
 * возвращаются.
 *
 * В состоянии — дом (где он и какой) и то, что в него вложено; нравы супруга и
 * детей выводятся из их имён, как всё прочее в 0.6.
 */
export interface Home {
  readonly kind: string
  readonly locationId: string
  readonly sinceDay: number
  /** Что оставлено дома: поклажа, которую не носят с собой. */
  readonly stash: Readonly<Record<string, number>>
}

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Какие дома продают здесь: изба всюду, усадьба — только в большом месте. */
export function homesAt(
  world: World,
  settlements: Readonly<Record<string, { population: number }>>,
  locationId: string,
): readonly HomeDef[] {
  const place = world.locations[locationId]
  if (!place) return []
  const population = settlements[locationId]?.population ?? place.population
  if (population <= 0) return []
  return HOMES.filter((home) => population >= home.minPopulation)
}

export function homeDef(kind: string): HomeDef | null {
  return HOMES_BY_ID[kind] ?? null
}

/** Дома ли герой: свой дом — это место, а не запись. */
export function atHome(state: Pick<GameState, 'home' | 'locationId'>): boolean {
  return state.home?.locationId === state.locationId
}

/** Насколько лучше отдыхается дома. */
export function homeComfort(state: Pick<GameState, 'home' | 'locationId'>): number {
  if (!atHome(state)) return 0
  return homeDef(state.home?.kind ?? '')?.comfort ?? 0
}

/** Нрав супруга: выводится из имени и потому неизменен. */
export function spouseTemper(family: Family): SpouseTemper | null {
  if (!family.spouse) return null
  return SPOUSE_TEMPER_IDS[hashOf(family.spouse.name) % SPOUSE_TEMPER_IDS.length] ?? 'steady'
}

/**
 * Что супруг думает о твоих делах (этап 56, Д1).
 *
 * У каждого своё мерило: одному важна слава, другому деньги, третьему дом,
 * четвёртому вера, пятому покой. По нему он и встречает.
 */
export function spouseMood(state: GameState): number {
  const temper = spouseTemper(state.character.family)
  if (!temper) return 0
  const def = SPOUSE_TEMPERS[temper]
  switch (def.values) {
    case 'renown':
      return Math.min(100, state.renown * 6)
    case 'money':
      return Math.min(100, Math.round(state.character.money / 40))
    case 'home':
      return state.home ? 70 : 20
    case 'faith':
      return Math.max(0, Math.min(100, 50 + (state.piety ?? 0)))
    case 'peace':
      return Math.max(0, 80 - state.battlesWon * 4)
  }
}

export function spouseSays(state: GameState): string {
  const temper = spouseTemper(state.character.family)
  if (!temper) return ''
  const def = SPOUSE_TEMPERS[temper]
  const mood = spouseMood(state)
  if (mood < 35) return def.complains[0] ?? ''
  if (mood > 70) return def.praises[0] ?? ''
  return def.greets[0] ?? ''
}

/** К чему тянется ребёнок: выводится из имени и дня рождения. */
export function childBent(child: Child): ChildBent {
  return CHILD_BENT_IDS[hashOf(`${child.name}|${child.bornDay}`) % CHILD_BENT_IDS.length] ?? 'land'
}

export function bentWords(child: Child): string {
  const bent = CHILD_BENTS[childBent(child)]
  return `${bent.label}: ${bent.about}`
}

/** Сколько вложено в ребёнка: это и наследует наследник. */
export function upbringingOf(state: Pick<GameState, 'upbringing'>, child: Child): number {
  return state.upbringing?.[child.name] ?? 0
}

export function canTeachChild(
  state: Pick<GameState, 'upbringing'>,
  child: Child,
  day: number,
): { readonly can: boolean; readonly why: string } {
  const age = ageOf(child.bornDay, day)
  if (age < 6) return { can: false, why: `${child.name} ещё мал: рано учить.` }
  if (age > 18) return { can: false, why: `${child.name} вырос: теперь он учится сам.` }
  if (upbringingOf(state, child) >= UPBRINGING_MAX) {
    return { can: false, why: `${child.name} взял от тебя всё, что мог.` }
  }
  return { can: true, why: '' }
}

/**
 * Родня (этап 56, Д5).
 *
 * У рода есть ветви: братья, дядья, племянники. Они выводятся из имени дома и
 * потому у каждого рода свои; они просят в долг и помогают, когда трудно.
 */
export interface Kin {
  readonly id: string
  readonly name: string
  /** Чем он сейчас занят: по этому видно, просит он или предлагает. */
  readonly asks: boolean
}

export function kinOf(family: Family, day: number): readonly Kin[] {
  if (!family.house) return []
  const base = hashOf(family.house)
  const count = 2 + (base % 3)
  const out: Kin[] = []
  for (let index = 0; index < count; index += 1) {
    const hash = hashOf(`${family.house}|${index}`)
    out.push({
      id: `kin:${family.house}:${index}`,
      name: KIN_NAMES[hash % KIN_NAMES.length] ?? 'родня',
      // Чего он хочет нынче, меняется медленно: раз в сезон.
      asks: (hash + Math.floor(day / 90)) % 2 === 0,
    })
  }
  return out
}

/** Пора ли на покой: после пятидесяти пяти это не поражение, а выбор. */
export function canRetire(state: GameState, day: number): boolean {
  return (
    ageOf(state.character.bornDay, day) >= RETIRE_AGE &&
    state.character.family.children.some((child) => ageOf(child.bornDay, day) >= 16)
  )
}

export { UPBRINGING_MAX, RETIRE_AGE }
