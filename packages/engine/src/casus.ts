import {
  CASUS,
  CASUS_BY_KIND,
  type CasusDef,
  type CasusKind,
  ENVOY_DAYS,
  ENVOY_NAMES,
  ENVOY_TEMPERS,
  ENVOY_TEMPER_DEFS,
  type EnvoyTemper,
  PEACE_TERM_DEFS,
  type PeaceTermKind,
} from './content/casus'
import type { Settlement } from './economy'
import type { Rng } from './rng'
import { nextInt } from './rng'
import type { Politics, War } from './war'
import type { World } from './world/types'

/**
 * Война с причиной (этап 65).
 *
 * Повод выводится из мира, а не из списка: спорная марка — та провинция, которую
 * и правда держат чужие; неплатёж дани — та дань, которая и правда не пришла;
 * честолюбие — то, что остаётся, когда поводов нет, а сила есть. Условия мира
 * следуют из повода: за землю требуют землю, за набеги — виновного.
 */

function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export interface Casus {
  readonly kind: CasusKind
  /** Из-за какой земли, если из-за земли. */
  readonly provinceId?: string
  /** Из-за кого, если из-за человека. */
  readonly lordId?: string
}

export function casusDef(kind: CasusKind): CasusDef {
  return CASUS_BY_KIND[kind] ?? (CASUS[CASUS.length - 1] as CasusDef)
}

/** Как о поводе говорят игроку. */
export function casusWords(world: World, casus: Casus): string {
  const def = casusDef(casus.kind)
  const where = casus.provinceId ? world.provinces[casus.provinceId]?.name : null
  if (casus.kind === 'march' && where) return `${def.label}: ${where}`
  if (casus.kind === 'inherit' && where) return `${def.label}: ${where}`
  return def.label
}

/** Сколько мест этой короне принадлежит в этой провинции. */
function heldIn(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  provinceId: string,
  side: string,
): number {
  let count = 0
  for (const id of world.provinces[provinceId]?.locationIds ?? []) {
    const settlement = settlements[id]
    if (!settlement || settlement.population <= 0) continue
    if (sideOf(settlement.owner) === side) count += 1
  }
  return count
}

/**
 * Есть ли у этих корон общая граница.
 *
 * Граница — это дорога, по которой из места одной короны попадают в место
 * другой. Пока проверка была «у обеих есть земля», набеги оказывались поводом
 * для всех пар разом: воевать «за набеги» с тем, до кого три недели пути,
 * бессмысленно.
 */
function touching(
  world: World,
  settlements: Readonly<Record<string, Settlement>>,
  a: string,
  b: string,
): boolean {
  // Граница — это близость, а не дорога: набегом идут напрямик, через бор и
  // брод, и дороги для этого не нужны. По дорогам короны этого мира друг с
  // другом почти не связаны — между ними лежит земля.
  const mine: { x: number; y: number }[] = []
  const theirs: { x: number; y: number }[] = []
  for (const settlement of Object.values(settlements)) {
    if (settlement.population <= 0) continue
    const side = sideOf(settlement.owner)
    if (side !== a && side !== b) continue
    const place = world.locations[settlement.locationId]
    if (!place) continue
    ;(side === a ? mine : theirs).push({ x: place.x, y: place.y })
  }
  for (const one of mine) {
    for (const other of theirs) {
      if (Math.hypot(one.x - other.x, one.y - other.y) < BORDER_REACH) return true
    }
  }
  return false
}

/**
 * Насколько близко надо стоять, чтобы это считалось общей границей.
 *
 * Замерено по этому миру: у ближних корон между крайними сёлами 274–635 единиц
 * полотна, у дальних — за тысячу. Семьсот отделяет соседей от тех, до кого три
 * недели пути.
 */
const BORDER_REACH = 700

function sideOf(owner: string | null): string | null {
  if (!owner) return null
  if (owner.startsWith('crown:')) return owner.slice('crown:'.length)
  const parts = owner.split(':')
  return parts[0] === 'lord' ? (parts[1] ?? null) : null
}

/**
 * За что `a` может пойти на `b`.
 *
 * Ищется настоящий повод, и только если ни одного нет — остаётся честолюбие.
 * Потому «спор о вере» больше не случается там, где спорить не о чем.
 */
export function casusFor(
  world: World,
  politics: Politics,
  settlements: Readonly<Record<string, Settlement>>,
  a: string,
  b: string,
  rng: Rng,
): [Casus, Rng] {
  // 1. Неплатёж дани: та дань, которая и правда назначена и не дошла.
  const owed = politics.tributes.find((one) => one.from === b && one.to === a)
  if (owed) return [{ kind: 'tribute' }, rng]

  // 2. Спорная марка: провинция, где сидят оба, — и чужих там больше.
  const contested: string[] = []
  for (const province of Object.values(world.provinces)) {
    const mine = heldIn(world, settlements, province.id, a)
    const theirs = heldIn(world, settlements, province.id, b)
    if (mine > 0 && theirs > 0) contested.push(province.id)
  }
  if (contested.length > 0) {
    const [pick, afterPick] = nextInt(rng, 0, contested.length - 1)
    const provinceId = contested[pick]
    if (provinceId) return [{ kind: 'march', provinceId }, afterPick]
  }

  // 3. Наследство: земля короны `b`, которую держит человек без сюзерена, —
  //    на такую всегда найдётся тот, кто помнит родство.
  const orphan = Object.values(settlements).find((one) => {
    if (one.population <= 0 || !one.owner) return false
    if (sideOf(one.owner) !== b) return false
    const lord = politics.lords.find((candidate) => candidate.id === one.owner)
    return lord !== undefined && lord.kingdomId === null
  })
  if (orphan) {
    const province = world.locations[orphan.locationId]?.provinceId
    return [{ kind: 'inherit', ...(province ? { provinceId: province } : {}) }, rng]
  }

  // 4. Набеги без ответа: так бывает там, где есть общая граница — дорога из
  //    твоего места в чужое. Без дороги набегать не на кого.
  const border = touching(world, settlements, a, b)
  const [roll, afterRoll] = nextInt(rng, 0, 99)
  if (border && roll < 45) return [{ kind: 'raids' }, afterRoll]
  // 5. Спор о вере — только между коронами разной веры: у каждой она своя по
  //    имени, и различаются они через одну.
  if (roll < 60 && (hashOf(a) & 1) !== (hashOf(b) & 1)) return [{ kind: 'faith' }, afterRoll]
  // 6. Поводов нет — остаётся честолюбие. Оно не выдумка: это тоже причина.
  return [{ kind: 'ambition' }, afterRoll]
}

/**
 * Чего требуют по такому поводу (Т3).
 *
 * За землю требуют землю, за набеги — виновного, за честолюбие — что дадут.
 * Выбирают не наугад: сильный победитель берёт первое из того, что повод
 * позволяет, слабый — последнее.
 */
export function termsFor(casus: Casus, ratio: number): PeaceTermKind {
  const wants = casusDef(casus.kind).wants
  if (wants.length === 0) return 'nothing'
  // ratio — во сколько раз проигравший меньше победителя: чем меньше, тем
  // жёстче условия.
  const index = ratio < 0.5 ? 0 : ratio < 0.8 ? Math.min(1, wants.length - 1) : wants.length - 1
  return wants[index] ?? 'nothing'
}

export function termWords(kind: PeaceTermKind): string {
  return PEACE_TERM_DEFS[kind].label
}

export function termAbout(kind: PeaceTermKind): string {
  return PEACE_TERM_DEFS[kind].about
}

/** Насколько упрямо держатся за такой повод: от него зависит, скоро ли мир. */
export function stubbornOf(casus: Casus | undefined): number {
  return casus ? casusDef(casus.kind).stubborn : 1
}

// --- послы (Т2) -------------------------------------------------------------

export interface Envoy {
  readonly id: string
  readonly name: string
  readonly temper: EnvoyTemper
  /** От кого он приехал. */
  readonly fromKingdomId: string
  /** С чем послан. */
  readonly asks: 'peace' | 'alliance' | 'tribute' | 'passage'
}

export function envoyTemperDef(temper: EnvoyTemper) {
  return ENVOY_TEMPER_DEFS[temper]
}

/**
 * Кто сидит послом в этой столице сегодня.
 *
 * Посол выводится из столицы, дня и положения дел: пока идёт война, приезжают
 * говорить о мире; пока мира нет — о союзе или о проходе через землю. Живёт он
 * двенадцать суток, а потом уезжает ни с чем.
 */
export function envoyAt(
  world: World,
  politics: Politics,
  capitalOf: string,
  day: number,
): Envoy | null {
  const kingdom = Object.values(world.kingdoms).find((one) => one.capitalId === capitalOf)
  if (!kingdom) return null
  const era = Math.floor(day / ENVOY_DAYS)
  const hash = hashOf(`envoy|${kingdom.id}|${era}`)
  const others = Object.keys(world.kingdoms).filter((one) => one !== kingdom.id)
  if (others.length === 0) return null
  // Не каждый срок кто-то приезжает: посольство — событие.
  if (hash % 3 !== 0) return null
  const from = others[(hash >>> 4) % others.length]
  if (!from) return null
  const fighting = politics.wars.some(
    (war) => (war.a === kingdom.id && war.b === from) || (war.b === kingdom.id && war.a === from),
  )
  const owed = politics.tributes.some((one) => one.from === kingdom.id && one.to === from)
  return {
    id: `envoy:${kingdom.id}:${era}`,
    name: ENVOY_NAMES[(hash >>> 8) % ENVOY_NAMES.length] ?? 'посол',
    temper: ENVOY_TEMPERS[(hash >>> 12) % ENVOY_TEMPERS.length] ?? 'stiff',
    fromKingdomId: from,
    asks: fighting ? 'peace' : owed ? 'tribute' : (hash >>> 16) % 2 === 0 ? 'alliance' : 'passage',
  }
}

/** Насколько он уступит тому, кто умеет говорить. */
export function envoyYields(envoy: Envoy, persuasion: number): number {
  return envoyTemperDef(envoy.temper).yields * (1 + persuasion / 60)
}

// --- война в лицах (Т4) -----------------------------------------------------

/** Что за лордом числится на войне. */
export function warFame(lord: { sacked?: number; spared?: number }): string {
  const sacked = lord.sacked ?? 0
  const spared = lord.spared ?? 0
  if (sacked === 0 && spared === 0) return 'на войне за ним ничего не числится'
  if (sacked > spared * 2) return `разорил ${sacked} мест — это помнят`
  if (spared > sacked * 2) return `щадил взятое ${spared} раз — и это помнят тоже`
  return `взял ${sacked + spared} мест: где как`
}

/** Чем кончилась война — одной строкой для летописи (Т6). */
export function warOutcomeWords(war: War, term: PeaceTermKind): string {
  return `${war.a} и ${war.b}: ${termWords(term)}`
}
